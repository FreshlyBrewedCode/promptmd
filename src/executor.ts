import { Backend, PromptResult, StreamCallback } from './backend';
import { Workflow } from './workflow-parser';
import { PromptFileParser } from './prompt-parser';
import { TemplateEngine } from './template-engine';
import { log } from './logger';
import * as fs from 'fs';
import * as path from 'path';

export interface ExecutionOptions {
  variables?: Record<string, any>;
  loop?: {
    count: number;
    exitOn?: string;
  };
  stream?: boolean;
  onChunk?: (chunk: string) => void;
}

export interface ExecutionResult {
  success: boolean;
  results: PromptResult[];
  iterations?: number;
}

export class WorkflowExecutor {
  constructor(private backend: Backend) {}

  /**
   * Validate and resolve a path from a workflow step
   * - If path has no extension, checks if it's a directory first, then tries .md extension
   * - Handles relative paths
   * - Returns object with resolved path and whether it's a directory
   */
  private validateAndResolvePath(stepPath: string): { resolvedPath: string; isDirectory: boolean } {
    const resolvedPath = path.resolve(stepPath);
    
    // Check if path exists as-is
    if (fs.existsSync(resolvedPath)) {
      const stats = fs.statSync(resolvedPath);
      if (stats.isDirectory()) {
        return { resolvedPath, isDirectory: true };
      }
      // File exists with exact path
      return { resolvedPath, isDirectory: false };
    }

    // If no extension, try adding .md
    if (!path.extname(stepPath)) {
      const withMdExtension = `${resolvedPath}.md`;
      if (fs.existsSync(withMdExtension)) {
        return { resolvedPath: withMdExtension, isDirectory: false };
      }
    }

    // Path doesn't exist, return as-is and let it fail with proper error later
    return { resolvedPath, isDirectory: false };
  }

  /**
   * Execute a workflow
   */
  async execute(workflow: Workflow, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    if (options.loop) {
      return this.executeLoop(workflow, options);
    }

    return this.executeOnce(workflow, options);
  }

  /**
   * Execute workflow once
   */
  private async executeOnce(workflow: Workflow, options: ExecutionOptions): Promise<ExecutionResult> {
    const results: PromptResult[] = [];
    const variables = { ...options.variables };

    for (const step of workflow.steps) {
      try {
        // Validate and resolve the path
        const { resolvedPath, isDirectory } = this.validateAndResolvePath(step.path);

        // If it's a directory, execute all prompts in the directory
        if (isDirectory) {
          const dirResult = await this.executeDirectory(resolvedPath, { ...options, variables });
          if (!dirResult.success) {
            return dirResult;
          }
          results.push(...dirResult.results);
          
          // Update variables with the last result
          if (dirResult.results.length > 0) {
            const lastResult = dirResult.results[dirResult.results.length - 1];
            if (lastResult.structured) {
              variables.input = lastResult.structured;
            } else {
              variables.input = lastResult.content;
            }
          }
          continue;
        }

        // Load prompt file
        const promptFile = PromptFileParser.parse(resolvedPath);

        // Render template with current variables
        const renderedPrompt = TemplateEngine.render(promptFile.content, variables);

        // Setup streaming callback if enabled
        const streamCallback: StreamCallback | undefined = options.stream ? {
          onChunk: options.onChunk,
          onComplete: () => {
            // Optional: could add completion logging
          },
          onError: (error) => {
            log.error('Streaming error: ' + error);
          }
        } : undefined;

        // Execute prompt
        const result = await this.backend.execute(renderedPrompt, promptFile.outputSchema, streamCallback);

        // Store result
        results.push(result);

        // Update variables for next step
        if (result.structured) {
          variables.input = result.structured;
        } else {
          variables.input = result.content;
        }
      } catch (error) {
        log.error(`Error executing step '${step.path}': ` + error);
        return {
          success: false,
          results
        };
      }
    }

    return {
      success: true,
      results
    };
  }

  /**
   * Execute workflow in a loop
   */
  private async executeLoop(workflow: Workflow, options: ExecutionOptions): Promise<ExecutionResult> {
    const allResults: PromptResult[] = [];
    const loopConfig = options.loop!;
    let iterations = 0;

    for (let i = 0; i < loopConfig.count; i++) {
      iterations++;
      log.verbose(`\nIteration ${iterations}/${loopConfig.count}`);

      const result = await this.executeOnce(workflow, options);

      if (!result.success) {
        return {
          success: false,
          results: allResults,
          iterations
        };
      }

      allResults.push(...result.results);

      // Check exit condition if specified
      if (loopConfig.exitOn && result.results.length > 0) {
        const lastResult = result.results[result.results.length - 1];
        if (this.checkExitCondition(lastResult, loopConfig.exitOn)) {
          log.verbose(`Exit condition met: ${loopConfig.exitOn}`);
          break;
        }
      }

      // Update variables with last result for next iteration
      if (result.results.length > 0) {
        const lastResult = result.results[result.results.length - 1];
        if (lastResult.structured) {
          options.variables = { ...options.variables, input: lastResult.structured };
        } else {
          options.variables = { ...options.variables, input: lastResult.content };
        }
      }
    }

    return {
      success: true,
      results: allResults,
      iterations
    };
  }

  /**
   * Check if exit condition is met
   */
  private checkExitCondition(result: PromptResult, exitCondition: string): boolean {
    // Simple check: does the content contain the exit condition string
    return result.content.includes(exitCondition);
  }

  /**
   * Execute a directory of prompts (all .md files in order)
   */
  async executeDirectory(dirPath: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    try {
      const prompts = PromptFileParser.loadDirectory(dirPath);

      if (prompts.length === 0) {
        log.warn(`No prompt files found in directory: ${dirPath}`);
        return {
          success: false,
          results: []
        };
      }

      log.verbose(`Found ${prompts.length} prompt(s) in directory`);

      const results: PromptResult[] = [];
      const variables = { ...options.variables };

      for (const { name, prompt } of prompts) {
        log.info(`\nExecuting: ${name}`);

        const renderedPrompt = TemplateEngine.render(prompt.content, variables);
        
        // Setup streaming callback if enabled
        const streamCallback: StreamCallback | undefined = options.stream ? {
          onChunk: options.onChunk,
          onComplete: () => {
            // Optional: could add completion logging
          },
          onError: (error) => {
            log.error('Streaming error: ' + error);
          }
        } : undefined;

        const result = await this.backend.execute(renderedPrompt, prompt.outputSchema, streamCallback);

        results.push(result);

        // Update variables for next prompt
        if (result.structured) {
          variables.input = result.structured;
        } else {
          variables.input = result.content;
        }
      }

      return {
        success: true,
        results
      };
    } catch (error) {
      log.error(`Error executing directory '${dirPath}': ` + error);
      return {
        success: false,
        results: []
      };
    }
  }
}
