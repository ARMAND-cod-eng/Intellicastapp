/**
 * Module Manager - Core system for loading and managing feature modules
 * Provides dynamic module loading, feature flags, and lifecycle management
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ModuleManager {
  constructor() {
    this.modules = new Map();
    this.enabledModules = new Set();
    this.moduleRoutes = new Map();
    this.moduleHooks = new Map();
  }

  /**
   * Initialize the module manager and scan for available modules
   */
  async initialize() {
    console.log('🔧 Initializing Module Manager...');

    const modulesDir = path.join(__dirname, '../../../modules');

    if (!await fs.pathExists(modulesDir)) {
      console.log('📁 Creating modules directory...');
      await fs.ensureDir(modulesDir);
      return;
    }

    await this.scanModules(modulesDir);
    await this.loadEnabledModules();

    console.log(`✅ Module Manager initialized with ${this.modules.size} modules found, ${this.enabledModules.size} enabled`);
  }

  /**
   * Scan modules directory for available modules
   */
  async scanModules(modulesDir) {
    const entries = await fs.readdir(modulesDir);

    for (const entry of entries) {
      const modulePath = path.join(modulesDir, entry);
      const configPath = path.join(modulePath, 'module.config.js');

      if (await fs.pathExists(configPath)) {
        try {
          const { default: moduleConfig } = await import(`file://${configPath}`);
          this.modules.set(entry, {
            name: entry,
            path: modulePath,
            config: moduleConfig
          });

          console.log(`📦 Found module: ${entry} (${moduleConfig.displayName})`);
        } catch (error) {
          console.error(`❌ Error loading module config for ${entry}:`, error.message);
        }
      }
    }
  }

  /**
   * Load all enabled modules
   */
  async loadEnabledModules() {
    for (const [name, module] of this.modules) {
      if (this.isModuleEnabled(module.config)) {
        await this.enableModule(name);
      }
    }
  }

  /**
   * Check if a module should be enabled based on feature flags
   */
  isModuleEnabled(config) {
    // Check environment variable override
    const envVar = `${config.name.toUpperCase().replace('-', '_')}_ENABLED`;
    if (process.env[envVar] !== undefined) {
      return process.env[envVar] === 'true';
    }

    // Check module config
    return config.enabled === true;
  }

  /**
   * Enable a specific module
   */
  async enableModule(moduleName) {
    const module = this.modules.get(moduleName);
    if (!module) {
      throw new Error(`Module ${moduleName} not found`);
    }

    if (this.enabledModules.has(moduleName)) {
      console.log(`⚠️  Module ${moduleName} is already enabled`);
      return;
    }

    try {
      // Run module initialization hook
      if (module.config.hooks?.onInit) {
        await this.runModuleHook(moduleName, 'onInit');
      }

      // Load module routes if they exist
      await this.loadModuleRoutes(moduleName, module);

      // Run enable hook
      if (module.config.hooks?.onEnable) {
        await this.runModuleHook(moduleName, 'onEnable');
      }

      this.enabledModules.add(moduleName);
      console.log(`✅ Module ${moduleName} (${module.config.displayName}) enabled`);
    } catch (error) {
      console.error(`❌ Failed to enable module ${moduleName}:`, error.message);
    }
  }

  /**
   * Disable a specific module
   */
  async disableModule(moduleName) {
    const module = this.modules.get(moduleName);
    if (!module || !this.enabledModules.has(moduleName)) {
      return;
    }

    try {
      // Run disable hook
      if (module.config.hooks?.onDisable) {
        await this.runModuleHook(moduleName, 'onDisable');
      }

      // Unload module routes
      this.moduleRoutes.delete(moduleName);

      this.enabledModules.delete(moduleName);
      console.log(`🔴 Module ${moduleName} disabled`);
    } catch (error) {
      console.error(`❌ Failed to disable module ${moduleName}:`, error.message);
    }
  }

  /**
   * Load routes for a specific module
   */
  async loadModuleRoutes(moduleName, module) {
    const routesPath = path.join(module.path, 'backend', 'routes');

    if (await fs.pathExists(routesPath)) {
      const routeFiles = await fs.readdir(routesPath);
      const routes = [];

      for (const file of routeFiles) {
        if (file.endsWith('.js')) {
          const routePath = path.join(routesPath, file);
          try {
            const { default: router } = await import(`file://${routePath}`);
            routes.push({
              file: file.replace('.js', ''),
              router,
              prefix: module.config.api?.prefix || `/api/${moduleName}`
            });
          } catch (error) {
            console.error(`❌ Error loading route ${file} for module ${moduleName}:`, error.message);
          }
        }
      }

      this.moduleRoutes.set(moduleName, routes);
    }
  }

  /**
   * Run a module lifecycle hook
   */
  async runModuleHook(moduleName, hookName) {
    const module = this.modules.get(moduleName);
    const hookFile = path.join(module.path, 'backend', 'hooks.js');

    if (await fs.pathExists(hookFile)) {
      try {
        const { default: hooks } = await import(`file://${hookFile}`);
        if (hooks[hookName] && typeof hooks[hookName] === 'function') {
          await hooks[hookName](module.config);
        }
      } catch (error) {
        console.error(`❌ Error running hook ${hookName} for module ${moduleName}:`, error.message);
      }
    }
  }

  /**
   * Get all enabled modules
   */
  getEnabledModules() {
    return Array.from(this.enabledModules).map(name => {
      const module = this.modules.get(name);
      return {
        name,
        config: module.config,
        routes: this.moduleRoutes.get(name) || []
      };
    });
  }

  /**
   * Get routes for all enabled modules
   */
  getAllModuleRoutes() {
    const allRoutes = [];
    for (const [moduleName, routes] of this.moduleRoutes) {
      if (this.enabledModules.has(moduleName)) {
        allRoutes.push(...routes);
      }
    }
    return allRoutes;
  }

  /**
   * Check if a specific module is enabled
   */
  isEnabled(moduleName) {
    return this.enabledModules.has(moduleName);
  }

  /**
   * Get module information
   */
  getModuleInfo(moduleName) {
    const module = this.modules.get(moduleName);
    if (!module) return null;

    return {
      ...module,
      enabled: this.enabledModules.has(moduleName),
      routes: this.moduleRoutes.get(moduleName) || []
    };
  }
}

export default ModuleManager;