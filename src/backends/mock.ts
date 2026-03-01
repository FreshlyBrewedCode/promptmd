import { Backend, PromptResult, StreamCallback } from '../backend';
import { log } from '../logger';

/**
 * MockBackend - Mock backend for development and testing
 * 
 * This backend simulates AI responses without making actual API calls.
 * Useful for testing workflows and development.
 * 
 * Example usage:
 * ```typescript
 * const backend = new MockBackend();
 * ```
 */

export class MockBackend extends Backend {
  async execute(
    prompt: string,
    outputSchema?: Record<string, any>,
    streamCallback?: StreamCallback,
  ) {
    log.verbose("[Mock Backend] Executing prompt:");
    log.verbose(prompt);

    if (outputSchema) {
      log.verbose("[Mock Backend] Expected output schema:");
      log.verbose(JSON.stringify(outputSchema, null, 2));

      // Generate mock structured output
      const structured: Record<string, any> = {};
      for (const [key, value] of Object.entries(outputSchema)) {
        structured[key] = `mock_${key}_value`;
      }

      const content = JSON.stringify(structured, null, 2);

      // Simulate streaming if callback provided
      if (streamCallback?.onChunk) {
        // Stream character by character with small delay
        for (const char of content) {
          streamCallback.onChunk(char);
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        streamCallback.onChunk("\n");
        streamCallback.onComplete?.();
      }

      return {
        content,
        structured,
      };
    }

    const content = `Mock response for prompt: ${prompt.substring(0, 50)}...`;

    // Simulate streaming if callback provided
    if (streamCallback?.onChunk) {
      // Stream word by word with small delay
      const words = content.split(" ");
      for (let i = 0; i < words.length; i++) {
        streamCallback.onChunk(
          words[i] + (i < words.length - 1 ? " " : ""),
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      streamCallback.onChunk("\n");
      streamCallback.onComplete?.();
    }

    return {
      content,
    };
  }
}
