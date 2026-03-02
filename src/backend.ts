import { Workflow, WorkflowStep } from "./workflow-parser";

export interface PromptResult {
  content: string;
  structured?: Record<string, any>;
}

export interface StreamCallback {
  /**
   * Called when a chunk of output is received
   * @param chunk The text chunk received
   */
  onChunk?: (chunk: string) => void;

  /**
   * Called when streaming is complete
   */
  onComplete?: () => void;

  /**
   * Called when an error occurs during streaming
   * @param error The error that occurred
   */
  onError?: (error: Error) => void;
}

export interface BackendExecuteOptions {
  prompt: string;
  outputSchema?: Record<string, any>;
  streamCallback?: StreamCallback;
  stepName?: string; // Optional name of the workflow step, for context
}

export abstract class Backend {
  /**
   * Execute a prompt and return the result
   * @param options The options for executing the prompt
   * @returns The result of the prompt execution
   */
  abstract execute(options: BackendExecuteOptions): Promise<PromptResult>;
}
