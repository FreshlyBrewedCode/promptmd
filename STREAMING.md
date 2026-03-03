# Streaming Support

Promptmd supports real-time streaming of output from backends. This is especially useful when working with LLMs or long-running processes.

## Features

- **Real-time output**: Output is streamed to stdout as it's generated
- **Subprocess integration**: Easy integration with external tools via subprocess
- **Callback-based**: Flexible streaming callbacks for custom handling

## Backend Interface

All backends now support an optional `streamCallback` parameter:

```typescript
interface StreamCallback {
  onChunk?: (chunk: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

abstract class Backend {
  abstract execute(
    prompt: string, 
    outputSchema?: Record<string, any>,
    streamCallback?: StreamCallback
  ): Promise<PromptResult>;
}
```

## Using Streaming in CLI

Streaming is enabled by default in the CLI. Output is written to stdout in real-time:

```bash
# Simple streaming
promd examples/weather

# Chained prompts with streaming
promd weather plan-activities

# Loop with streaming
promd examples/weather --count 3
```

## SubprocessBackend

The `SubprocessBackend` is perfect for integrating with external LLM tools or scripts:

```typescript
import { SubprocessBackend } from 'promptmd';

const backend = new SubprocessBackend({
  command: 'python',
  args: ['run_llm.py'],
  useStdin: false,  // Pass prompt as argument instead of stdin
  cwd: process.cwd(),
  env: { API_KEY: 'your-key' }
});
```

### Configuration Options

- **command**: The command to execute (e.g., 'python', 'node', './my-script')
- **args**: Array of arguments to pass to the command
- **cwd**: Working directory for the subprocess
- **env**: Environment variables to pass
- **useStdin**: If true, prompt is passed via stdin. Otherwise, as last argument.

### Example: Python Script Integration

Create a Python script that streams output:

```python
#!/usr/bin/env python3
import sys
import time

prompt = sys.argv[1]

# Generate response
response = f"Response to: {prompt}"

# Stream word by word
for word in response.split():
    print(word, end=' ', flush=True)
    time.sleep(0.1)
print()
```

Use it with SubprocessBackend:

```typescript
const backend = new SubprocessBackend({
  command: 'python3',
  args: ['my_llm.py'],
  useStdin: false
});
```

See `examples/test-subprocess-backend.js` for a complete example.

## Implementing Custom Streaming Backends

### Example: OpenAI with Streaming

```typescript
import { Backend, PromptResult, StreamCallback } from 'promptmd';
import OpenAI from 'openai';

export class OpenAIBackend extends Backend {
  private client: OpenAI;

  constructor(apiKey: string) {
    super();
    this.client = new OpenAI({ apiKey });
  }

  async execute(
    prompt: string,
    outputSchema?: Record<string, any>,
    streamCallback?: StreamCallback
  ): Promise<PromptResult> {
    let content = '';

    try {
      const stream = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        stream: true
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        content += delta;
        
        // Stream to callback
        if (streamCallback?.onChunk) {
          streamCallback.onChunk(delta);
        }
      }

      streamCallback?.onComplete?.();

      return { content };
    } catch (error) {
      streamCallback?.onError?.(error as Error);
      throw error;
    }
  }
}
```

### Example: Anthropic Claude with Streaming

```typescript
import { Backend, PromptResult, StreamCallback } from 'promptmd';
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicBackend extends Backend {
  private client: Anthropic;

  constructor(apiKey: string) {
    super();
    this.client = new Anthropic({ apiKey });
  }

  async execute(
    prompt: string,
    outputSchema?: Record<string, any>,
    streamCallback?: StreamCallback
  ): Promise<PromptResult> {
    let content = '';

    try {
      const stream = await this.client.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
        stream: true
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && 
            event.delta.type === 'text_delta') {
          const delta = event.delta.text;
          content += delta;
          
          if (streamCallback?.onChunk) {
            streamCallback.onChunk(delta);
          }
        }
      }

      streamCallback?.onComplete?.();

      return { content };
    } catch (error) {
      streamCallback?.onError?.(error as Error);
      throw error;
    }
  }
}
```

## How It Works

1. **Backend**: Generates output and calls `onChunk` for each piece
2. **Executor**: Passes the streaming callback to the backend
3. **CLI**: Writes chunks directly to `process.stdout` in real-time

This architecture ensures minimal latency between generation and display, providing a smooth streaming experience.
