import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class OllamaSetup {
  constructor() {
    this.ollamaUrl = 'http://localhost:11434';
    this.models = [
      'qwen2.5:7b',  // Primary model
      'llama3.2:3b'  // Backup lightweight model
    ];
  }

  async checkOllamaInstallation() {
    try {
      const { stdout } = await execAsync('ollama --version');
      console.log('✅ Ollama is installed:', stdout.trim());
      return true;
    } catch (error) {
      console.log('❌ Ollama not found. Please install Ollama first.');
      console.log('📥 Download from: https://ollama.com');
      return false;
    }
  }

  async checkOllamaService() {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`);
      if (response.ok) {
        console.log('✅ Ollama service is running');
        return true;
      }
    } catch (error) {
      console.log('❌ Ollama service not running. Starting service...');
      return await this.startOllamaService();
    }
  }

  async startOllamaService() {
    return new Promise((resolve) => {
      console.log('🚀 Starting Ollama service...');
      const ollamaProcess = spawn('ollama', ['serve'], {
        detached: true,
        stdio: 'ignore'
      });
      
      ollamaProcess.unref();
      
      // Give it time to start
      setTimeout(async () => {
        const isRunning = await this.checkServiceHealth();
        resolve(isRunning);
      }, 3000);
    });
  }

  async checkServiceHealth() {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async pullModel(modelName) {
    return new Promise((resolve, reject) => {
      console.log(`📥 Pulling model: ${modelName}...`);
      
      const pullProcess = spawn('ollama', ['pull', modelName]);
      
      pullProcess.stdout.on('data', (data) => {
        process.stdout.write(data);
      });
      
      pullProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
      });
      
      pullProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`\n✅ Model ${modelName} pulled successfully`);
          resolve(true);
        } else {
          console.log(`\n❌ Failed to pull model ${modelName}`);
          reject(new Error(`Pull failed with code ${code}`));
        }
      });
    });
  }

  async listInstalledModels() {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`);
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('❌ Failed to list models:', error);
      return [];
    }
  }

  async testModel(modelName) {
    try {
      console.log(`🧪 Testing model: ${modelName}...`);
      
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: 'Hello! Please respond with a brief greeting.',
          stream: false
        })
      });

      const result = await response.json();
      
      if (result.response) {
        console.log(`✅ Model ${modelName} is working correctly`);
        console.log(`📝 Test response: ${result.response.slice(0, 100)}...`);
        return true;
      } else {
        throw new Error('No response from model');
      }
    } catch (error) {
      console.error(`❌ Model ${modelName} test failed:`, error.message);
      return false;
    }
  }

  async setup() {
    console.log('🎯 Starting Ollama setup for IntelliCast AI...\n');

    // Check if Ollama is installed
    const isInstalled = await this.checkOllamaInstallation();
    if (!isInstalled) return false;

    // Check/start Ollama service
    const serviceRunning = await this.checkOllamaService();
    if (!serviceRunning) {
      console.log('❌ Failed to start Ollama service');
      return false;
    }

    // List currently installed models
    const installedModels = await this.listInstalledModels();
    console.log('📦 Currently installed models:', installedModels.map(m => m.name));

    // Pull required models
    for (const model of this.models) {
      const isInstalled = installedModels.some(m => m.name.includes(model));
      
      if (!isInstalled) {
        try {
          await this.pullModel(model);
        } catch (error) {
          console.error(`❌ Failed to pull ${model}:`, error.message);
        }
      } else {
        console.log(`✅ Model ${model} already installed`);
      }
    }

    // Test the primary model
    const primaryModel = this.models[0];
    const testPassed = await this.testModel(primaryModel);

    if (testPassed) {
      console.log('\n🎉 Ollama setup completed successfully!');
      console.log(`🤖 Primary model: ${primaryModel}`);
      console.log(`🌐 Ollama API: ${this.ollamaUrl}`);
      return true;
    } else {
      console.log('\n❌ Setup completed but model test failed');
      return false;
    }
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new OllamaSetup();
  setup.setup().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export default OllamaSetup;