import {
  Backend,
  BackendExecuteOptions,
  PromptResult,
  StreamCallback,
} from "../backend";
import { spawn } from "child_process";
import { log } from "../logger";

/**
 * SubprocessBackend - Execute prompts by invoking a subprocess
 *
 * This backend spawns a subprocess and streams stdout in real-time.
 * Common pattern for integrating with various AI tools/scripts.
 *
 * Example usage:
 * ```typescript
 * const backend = new SubprocessBackend({
 *   command: 'python',
 *   args: ['run_llm.py'],
 *   // Optionally pass prompt via stdin or as argument
 * });
 * ```
 */

export interface SubprocessConfig {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  // If true, prompt is passed via stdin. Otherwise, as last argument.
  useStdin?: boolean;
}

export class SubprocessBackend extends Backend {
  constructor(private config: SubprocessConfig) {
    super();
  }

  async execute({
    prompt,
    outputSchema,
    streamCallback,
    stepName,
  }: BackendExecuteOptions): Promise<PromptResult> {
    return new Promise((resolve, reject) => {
      let output = "";
      let errorOutput = "";

      // Prepare arguments
      const args = [...(this.config.args || [])];

      // If not using stdin, add prompt as last argument
      if (!this.config.useStdin) {
        args.push(prompt);
      }

      // Spawn subprocess
      const proc = spawn(this.config.command, args, {
        cwd: this.config.cwd,
        env: { ...process.env, ...this.config.env },
        stdio: this.config.useStdin
          ? ["pipe", "pipe", "pipe"]
          : ["ignore", "pipe", "pipe"],
      });

      // If using stdin, write prompt and close
      if (this.config.useStdin && proc.stdin) {
        proc.stdin.write(prompt);
        proc.stdin.end();
      }

      // Stream stdout
      if (proc.stdout) {
        proc.stdout.on("data", (data: Buffer) => {
          const chunk = data.toString();
          output += chunk;

          // Call streaming callback if provided
          if (streamCallback?.onChunk) {
            streamCallback.onChunk(chunk);
          }
        });
      }

      // Capture stderr
      if (proc.stderr) {
        proc.stderr.on("data", (data: Buffer) => {
          errorOutput += data.toString();
        });
      }

      // Handle process completion
      proc.on("close", (code) => {
        if (code !== 0) {
          const error = new Error(
            `Subprocess exited with code ${code}: ${errorOutput}`,
          );

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

        // Parse structured output if schema is provided
        let structured: Record<string, any> | undefined;
        if (outputSchema) {
          try {
            structured = JSON.parse(output.trim());
          } catch (error) {
            log.warn("Failed to parse structured output as JSON");
          }
        }

        resolve({
          content: output,
          structured,
        });
      });

      // Handle process errors
      proc.on("error", (error) => {
        if (streamCallback?.onError) {
          streamCallback.onError(error);
        }
        reject(error);
      });
    });
  }
}
