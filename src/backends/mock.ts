import {
  Backend,
  BackendExecuteOptions,
  PromptResult,
  StreamCallback,
} from "../backend";
import { log } from "../logger";

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
  async execute({
    prompt,
    outputSchema,
    streamCallback,
    stepName,
  }: BackendExecuteOptions) {
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
        streamCallback.onChunk(content);
        streamCallback.onChunk("\n");
        streamCallback.onComplete?.();
      }

      return {
        content,
        structured,
      };
    }

    const content = prompt + "\n";

    // Simulate streaming if callback provided
    if (streamCallback?.onChunk) {
      streamCallback.onChunk(content);
      streamCallback.onComplete?.();
    }

    return {
      content,
    };
  }
}
