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

export abstract class Backend {
  /**
   * Execute a prompt and return the result
   * @param prompt The prompt text to execute
   * @param outputSchema Optional schema for structured output
   * @param streamCallback Optional callback for streaming output in real-time
   * @returns The result of the prompt execution
   */
  abstract execute(
    prompt: string, 
    outputSchema?: Record<string, any>,
    streamCallback?: StreamCallback
  ): Promise<PromptResult>;
}
