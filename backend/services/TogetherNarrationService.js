import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Service wrapper for Together AI Narration Generator (Python)
 * Replaces OllamaService with high-quality Together AI LLM
 */
class TogetherNarrationService {
  constructor() {
    this.pythonScript = path.join(__dirname, '..', '..', 'narration_generator.py');
    this.serviceName = 'Together AI Narration';
    console.log(`✅ ${this.serviceName} Service initialized`);
  }

  /**
   * Call Python narration generator
   */
  async callPythonGenerator(method, data) {
    return new Promise((resolve, reject) => {
      // Use base64 encoding to safely pass data with special characters
      const dataJson = JSON.stringify(data);
      const dataBase64 = Buffer.from(dataJson).toString('base64');

      const pythonProcess = spawn('python', [
        '-c',
        `
import sys
import json
import base64
sys.path.insert(0, '${path.dirname(this.pythonScript).replace(/\\/g, '\\\\')}')
from narration_generator import TogetherNarrationGenerator

generator = TogetherNarrationGenerator()
data = json.loads(base64.b64decode('${dataBase64}').decode('utf-8'))

if '${method}' == 'generate_summary':
    result = generator.generate_summary(
        data['content'],
        data.get('summary_type', 'detailed'),
        data.get('temperature', 0.3),
        data.get('max_tokens', 2000)
    )
elif '${method}' == 'generate_narration':
    result = generator.generate_narration(
        data['content'],
        data.get('narration_type', 'summary'),
        data.get('temperature', 0.4),
        data.get('max_tokens', 3000)
    )
elif '${method}' == 'answer_question':
    result = generator.answer_question(
        data['content'],
        data['question'],
        data.get('temperature', 0.5),
        data.get('max_tokens', 1000)
    )
elif '${method}' == 'answer_question_with_citations':
    result = generator.answer_question_with_citations(
        data['content'],
        data['question'],
        data.get('conversation_history', []),
        data.get('temperature', 0.5),
        data.get('max_tokens', 1000)
    )
elif '${method}' == 'transform_script':
    result = generator.transform_script(
        data['original_script'],
        data.get('transformation_type', 'shorter'),
        data.get('temperature', 0.4),
        data.get('max_tokens', 3000)
    )
else:
    result = {'success': False, 'error': 'Unknown method'}

print(json.dumps(result))
`
      ]);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        // Log Python output for debugging (non-JSON lines)
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
          if (!line.startsWith('{')) {
            console.log(`🐍 Python: ${line}`);
          }
        });
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`❌ Python process exited with code ${code}`);
          console.error(`Stderr: ${stderr}`);
          reject(new Error(`Python process failed: ${stderr}`));
          return;
        }

        try {
          // Extract JSON from stdout (last line that looks like JSON)
          const lines = stdout.split('\n').filter(line => line.trim());
          const jsonLine = lines.reverse().find(line => line.startsWith('{'));

          if (!jsonLine) {
            throw new Error('No JSON output from Python script');
          }

          const result = JSON.parse(jsonLine);
          resolve(result);
        } catch (error) {
          console.error('❌ Failed to parse Python output:', error);
          console.error('Stdout:', stdout);
          reject(error);
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('❌ Failed to spawn Python process:', error);
        reject(error);
      });
    });
  }

  /**
   * Generate document summary using Together AI
   */
  async generateDocumentSummary(content, options = {}) {
    const {
      summaryType = 'detailed', // 'quick' or 'detailed'
      temperature = 0.3,
      maxTokens = 2000
    } = options;

    console.log(`🎯 Generating ${summaryType} summary using Together AI...`);

    try {
      const result = await this.callPythonGenerator('generate_summary', {
        content,
        summary_type: summaryType,
        temperature,
        max_tokens: maxTokens
      });

      if (!result.success) {
        throw new Error(result.error || 'Summary generation failed');
      }

      console.log(`✅ Summary generated: ${result.character_count} chars, $${result.cost.total_cost.toFixed(4)}`);

      return {
        success: true,
        response: result.summary,
        model: result.model,
        tokensGenerated: result.tokens.output,
        metadata: {
          summary_type: result.summary_type,
          tokens: result.tokens,
          cost: result.cost,
          generation_time: result.generation_time,
          character_count: result.character_count,
          word_count: result.word_count
        }
      };

    } catch (error) {
      console.error('❌ Document summary generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate narration script using Together AI
   */
  async generateNarrationScript(text, type = 'summary', contentAnalysis = {}) {
    console.log(`🎙️ Generating ${type} narration using Together AI...`);

    try {
      const result = await this.callPythonGenerator('generate_narration', {
        content: text,
        narration_type: type,
        temperature: 0.4,
        max_tokens: 3000
      });

      if (!result.success) {
        throw new Error(result.error || 'Narration generation failed');
      }

      console.log(`✅ Narration generated: $${result.cost.total_cost.toFixed(4)}`);

      return {
        success: true,
        response: result.script,
        model: result.model,
        tokensGenerated: result.tokens.output,
        metadata: {
          narration_type: result.narration_type,
          tokens: result.tokens,
          cost: result.cost,
          generation_time: result.generation_time
        }
      };

    } catch (error) {
      console.error('❌ Narration script generation failed:', error);
      throw error;
    }
  }

  /**
   * Answer question about content using Together AI
   */
  async answerQuestion(content, question, context = {}) {
    console.log(`❓ Answering question using Together AI: ${question.slice(0, 50)}...`);

    try {
      const result = await this.callPythonGenerator('answer_question', {
        content,
        question,
        temperature: 0.5,
        max_tokens: 1000
      });

      if (!result.success) {
        throw new Error(result.error || 'Question answering failed');
      }

      console.log(`✅ Question answered successfully`);

      return {
        success: true,
        response: result.answer,
        model: result.model
      };

    } catch (error) {
      console.error('❌ Question answering failed:', error);
      throw error;
    }
  }

  /**
   * Answer question with citations and conversation context
   */
  async answerQuestionWithCitations(content, question, conversationHistory = [], context = {}) {
    console.log(`❓ Answering with citations: ${question.slice(0, 50)}...`);

    try {
      const result = await this.callPythonGenerator('answer_question_with_citations', {
        content,
        question,
        conversation_history: conversationHistory,
        temperature: 0.5,
        max_tokens: 1000
      });

      if (!result.success) {
        throw new Error(result.error || 'Question answering with citations failed');
      }

      console.log(`✅ Answer generated with ${result.citations?.length || 0} citations`);

      return {
        success: true,
        answer: result.answer,
        citations: result.citations || [],
        model: result.model,
        tokens: result.tokens,
        cost: result.cost
      };

    } catch (error) {
      console.error('❌ Question answering with citations failed:', error);
      throw error;
    }
  }

  /**
   * Health check for Together AI service
   */
  async healthCheck() {
    try {
      // Test with a simple summary generation
      const testContent = "This is a test document for health check purposes.";

      const result = await this.callPythonGenerator('generate_summary', {
        content: testContent,
        summary_type: 'quick',
        temperature: 0.1,
        max_tokens: 100
      });

      if (result.success) {
        return {
          status: 'healthy',
          service: this.serviceName,
          model: result.model,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          status: 'unhealthy',
          service: this.serviceName,
          error: result.error,
          timestamp: new Date().toISOString()
        };
      }

    } catch (error) {
      return {
        status: 'unhealthy',
        service: this.serviceName,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Transform narration script using AI
   */
  async transformScript(originalScript, transformationType = 'shorter', options = {}) {
    const {
      temperature = 0.4,
      maxTokens = 3000
    } = options;

    console.log(`🔄 Transforming script: ${transformationType}...`);

    try {
      const result = await this.callPythonGenerator('transform_script', {
        original_script: originalScript,
        transformation_type: transformationType,
        temperature,
        max_tokens: maxTokens
      });

      if (!result.success) {
        throw new Error(result.error || 'Script transformation failed');
      }

      console.log(`✅ Script transformed: ${result.word_count} words (${transformationType}), $${result.cost.total_cost.toFixed(4)}`);

      return {
        success: true,
        script: result.script,
        transformationType: result.transformation_type,
        model: result.model,
        tokensGenerated: result.tokens.output,
        wordCount: result.word_count,
        originalWordCount: result.original_word_count,
        metadata: {
          tokens: result.tokens,
          cost: result.cost,
          generation_time: result.generation_time
        }
      };

    } catch (error) {
      console.error('❌ Script transformation failed:', error);
      throw error;
    }
  }

  /**
   * Test connection (compatibility with OllamaService interface)
   */
  async testConnection() {
    const health = await this.healthCheck();
    return {
      connected: health.status === 'healthy',
      service: this.serviceName,
      error: health.error
    };
  }

  /**
   * Clean narration script (for compatibility)
   */
  cleanNarrationScript(script) {
    // Python generator already cleans the script
    return script;
  }

  /**
   * Clear cache (no-op for compatibility)
   */
  clearCache() {
    console.log('ℹ️  Together AI service does not use local cache');
  }

  /**
   * Get cache stats (no-op for compatibility)
   */
  getCacheStats() {
    return {
      size: 0,
      keys: []
    };
  }
}

export default TogetherNarrationService;
