import { Backend, PromptResult, StreamCallback } from './backend';
import { spawn } from 'child_process';
import { log } from './logger';

/**
 * OpenCodeBackend - Execute prompts using the OpenCode CLI
 * 
 * This backend integrates with OpenCode (https://opencode.ai) to execute
 * prompts using the `opencode run` command. Supports streaming output
 * in real-time.
 * 
 * Example usage:
 * ```typescript
 * const backend = new OpenCodeBackend({
 *   model: 'anthropic/claude-sonnet-4',
 *   workDir: process.cwd()
 * });
 * ```
 */

export interface OpenCodeConfig {
  /**
   * Model to use in the format provider/model
   * Examples: 'anthropic/claude-sonnet-4', 'openai/gpt-4', etc.
   */
  model?: string;

  /**
   * Working directory to run OpenCode in
   */
  workDir?: string;

  /**
   * Session ID to continue (optional)
   */
  sessionId?: string;

  /**
   * Whether to continue the last session
   */
  continueSession?: boolean;

  /**
   * Fork the session when continuing
   */
  fork?: boolean;

  /**
   * Agent to use (optional)
   */
  agent?: string;

  /**
   * Output format: 'default' or 'json'
   */
  format?: 'default' | 'json';

  /**
   * Show thinking blocks
   */
  thinking?: boolean;

  /**
   * Model variant (e.g., 'high', 'max', 'minimal')
   */
  variant?: string;

  /**
   * Additional environment variables
   */
  env?: Record<string, string>;
}

export class OpenCodeBackend extends Backend {
  private config: OpenCodeConfig;

  constructor(config: OpenCodeConfig = {}) {
    super();
    this.config = config;
  }

  async execute(
    prompt: string,
    outputSchema?: Record<string, any>,
    streamCallback?: StreamCallback
  ): Promise<PromptResult> {
    return new Promise((resolve, reject) => {
      let output = '';
      let errorOutput = '';
      let jsonEvents: any[] = [];

      // Build command arguments
      const args = ['run'];

      // Add model if specified
      if (this.config.model) {
        args.push('--model', this.config.model);
      }

      // Add session options
      if (this.config.continueSession) {
        args.push('--continue');
      }
      if (this.config.sessionId) {
        args.push('--session', this.config.sessionId);
      }
      if (this.config.fork) {
        args.push('--fork');
      }

      // Add agent if specified
      if (this.config.agent) {
        args.push('--agent', this.config.agent);
      }

      // Add variant if specified
      if (this.config.variant) {
        args.push('--variant', this.config.variant);
      }

      // Add thinking flag if enabled
      if (this.config.thinking) {
        args.push('--thinking');
      }

      // Set format to json if output schema is provided, or use config
      const format = outputSchema ? 'json' : (this.config.format || 'default');
      args.push('--format', format);

      // Add working directory if specified
      if (this.config.workDir) {
        args.push('--dir', this.config.workDir);
      }

      // Add the prompt as the message
      args.push(prompt);

      // Spawn OpenCode process
      const proc = spawn('opencode', args, {
        cwd: this.config.workDir || process.cwd(),
        env: { ...process.env, ...this.config.env },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Handle stdout
      if (proc.stdout) {
        proc.stdout.on('data', (data: Buffer) => {
          const chunk = data.toString();
          output += chunk;

          // If using JSON format, collect events
          if (format === 'json') {
            // Parse JSON events (one per line)
            const lines = chunk.split('\n').filter(line => line.trim());
            for (const line of lines) {
              try {
                const event = JSON.parse(line);
                jsonEvents.push(event);

                // Stream text content from assistant messages
                if (event.type === 'text' && event.role === 'assistant') {
                  if (streamCallback?.onChunk) {
                    streamCallback.onChunk(event.text);
                  }
                }
              } catch (error) {
                // Ignore parse errors for partial JSON
              }
            }
          } else {
            // For default format, stream as-is
            if (streamCallback?.onChunk) {
              streamCallback.onChunk(chunk);
            }
          }
        });
      }

      // Capture stderr
      if (proc.stderr) {
        proc.stderr.on('data', (data: Buffer) => {
          errorOutput += data.toString();
        });
      }

      // Handle process completion
      proc.on('close', (code) => {
        if (code !== 0) {
          const error = new Error(`OpenCode exited with code ${code}: ${errorOutput}`);
          
          if (streamCallback?.onError) {
            streamCallback.onError(error);
          }
          
          reject(error);
          return;
        }

        // Call completion callback
        if (streamCallback?.onComplete) {
          streamCallback.onComplete();
        }

        // Process output based on format
        let content = output;
        let structured: Record<string, any> | undefined;

        if (format === 'json') {
          // Extract text content from JSON events
          const textChunks: string[] = [];
          for (const event of jsonEvents) {
            if (event.type === 'text' && event.role === 'assistant') {
              textChunks.push(event.text);
            }
          }
          content = textChunks.join('');

          // If output schema is provided, try to parse structured output
          if (outputSchema) {
            try {
              // Look for JSON in the content
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                structured = JSON.parse(jsonMatch[0]);
              }
            } catch (error) {
              log.warn('Failed to parse structured output from OpenCode response');
            }
          }
        }

        resolve({
          content: content.trim(),
          structured
        });
      });

      // Handle process errors
      proc.on('error', (error) => {
        if (streamCallback?.onError) {
          streamCallback.onError(error);
        }
        reject(error);
      });
    });
  }
}
