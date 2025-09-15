/**
 * News Audio Module Lifecycle Hooks
 * Handles module initialization, enablement, and cleanup
 */

import NewsAudioModels from './models/NewsAudioModels.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Module-level instances
let newsModels = null;

/**
 * Initialize the News Audio module
 * Sets up database connections, creates necessary directories
 */
async function onInit(config) {
  try {
    console.log(`🔧 Initializing ${config.displayName} module...`);

    // Initialize database models
    newsModels = new NewsAudioModels();
    await newsModels.initialize();

    // Create necessary directories
    const audioDir = path.join(__dirname, '../../../backend/audio/news');
    await fs.ensureDir(audioDir);

    const cacheDir = path.join(__dirname, '../../../backend/cache/news');
    await fs.ensureDir(cacheDir);

    console.log(`✅ ${config.displayName} module initialized successfully`);
  } catch (error) {
    console.error(`❌ Failed to initialize ${config.displayName} module:`, error.message);
    throw error;
  }
}

/**
 * Enable the News Audio module
 * Starts background services, registers event listeners
 */
async function onEnable(config) {
  try {
    console.log(`🟢 Enabling ${config.displayName} module...`);

    // Start news fetching service if configured
    if (process.env.NEWS_AUDIO_AUTO_FETCH === 'true') {
      await startNewsFetchingService();
    }

    // Register cleanup handlers
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    console.log(`✅ ${config.displayName} module enabled`);
  } catch (error) {
    console.error(`❌ Failed to enable ${config.displayName} module:`, error.message);
  }
}

/**
 * Disable the News Audio module
 * Stops background services, cleanup resources
 */
async function onDisable(config) {
  try {
    console.log(`🔴 Disabling ${config.displayName} module...`);

    // Stop background services
    await stopNewsFetchingService();

    console.log(`✅ ${config.displayName} module disabled`);
  } catch (error) {
    console.error(`❌ Error disabling ${config.displayName} module:`, error.message);
  }
}

/**
 * Cleanup the News Audio module
 * Close database connections, cleanup temp files
 */
async function onUnload(config) {
  try {
    console.log(`🧹 Cleaning up ${config.displayName} module...`);

    // Close database connections
    if (newsModels) {
      newsModels.close();
      newsModels = null;
    }

    // Cleanup temporary files
    await cleanupTempFiles();

    console.log(`✅ ${config.displayName} module cleanup complete`);
  } catch (error) {
    console.error(`❌ Error cleaning up ${config.displayName} module:`, error.message);
  }
}

/**
 * Start the news fetching background service
 */
async function startNewsFetchingService() {
  // Implementation would go here
  // This would include RSS feed polling, API fetching, etc.
  console.log('📰 News fetching service started');
}

/**
 * Stop the news fetching background service
 */
async function stopNewsFetchingService() {
  // Implementation would go here
  console.log('🛑 News fetching service stopped');
}

/**
 * Cleanup temporary files
 */
async function cleanupTempFiles() {
  try {
    const tempDir = path.join(__dirname, '../../../backend/temp/news');
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  } catch (error) {
    console.error('Error cleaning up temp files:', error.message);
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown() {
  console.log('🔄 News Audio module: Graceful shutdown initiated...');
  await onUnload({ displayName: 'News Audio' });
  process.exit(0);
}

/**
 * Get module models instance (for use by other parts of the module)
 */
export function getNewsModels() {
  return newsModels;
}

/**
 * Export lifecycle hooks
 */
export default {
  onInit,
  onEnable,
  onDisable,
  onUnload
};