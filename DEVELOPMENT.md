# Developer Setup

## Installation

```bash
npm install
```

## Build

```bash
npm run build
```

## Usage

After building, you can run the CLI:

```bash
node dist/cli.js <workflow> [options]
```

Or link it globally:

```bash
npm link
promd <workflow> [options]
```

## Project Structure

```
src/
├── cli.ts              # Main CLI entry point with Commander.js
├── backend.ts          # Abstract Backend class for prompt execution
├── config.ts           # Config file loader (~/.promd, ./.promd)
├── workflow-parser.ts  # Parser for workflow strings
├── prompt-parser.ts    # Parser for markdown files with frontmatter
├── template-engine.ts  # Variable substitution engine
├── executor.ts         # Workflow execution logic
└── index.ts           # Exports
```

## Key Features

1. **Abstract Backend**: The `Backend` abstract class allows for different implementations (OpenAI, Anthropic, local models, etc.)

2. **Hierarchical Config**: Config files are loaded in priority order:
   - Global: `~/.promd`
   - Directory hierarchy: `../../.promd`, `../.promd`, `./.promd`

3. **Workflow Parser**: Separate parser for workflow strings that can be extended with new syntax in the future

4. **Template Engine**: Supports variable substitution with `{{variable}}` syntax

## Example Usage

### Simple prompt

```bash
echo "Check the weather in Berlin" > weather.md
promd weather
```

### Chaining prompts

```bash
echo "Check the weather in Berlin" > weather.md
echo "Suggest activities based on: {{input}}" > plan-activities.md
promd "weather > plan-activities"
```

### With variables

```bash
echo "Check the weather in {{city}}" > weather.md
promd weather --city Hamburg
```

### Structured output

Create `weather.md`:
```markdown
output:
  temperature: "forecasted temperature"
  rain: "will it rain?"
---
Check the weather in Berlin
```

Then:
```bash
echo "Temperature: {{input.temperature}}, Rain: {{input.rain}}" > summary.md
promd "weather > summary"
```

### Loop execution

```bash
promd loop --count 10 --exitOn "<promise>Complete</promise>" ./my-workflow
```

## Implementing a Real Backend

Backends now support streaming output in real-time. See [STREAMING.md](STREAMING.md) for detailed documentation.

### Example: OpenAI with Streaming

```typescript
import { Backend, PromptResult, StreamCallback } from './backend';
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

    const stream = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      stream: true
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      content += delta;
      
      // Stream to callback for real-time output
      if (streamCallback?.onChunk) {
        streamCallback.onChunk(delta);
      }
    }

    streamCallback?.onComplete?.();

    if (outputSchema) {
      try {
        const structured = JSON.parse(content);
        return { content, structured };
      } catch {
        return { content };
      }
    }

    return { content };
  }
}
```

### Example: SubprocessBackend

The included `SubprocessBackend` makes it easy to integrate with external tools:

```typescript
import { SubprocessBackend } from './subprocess-backend';

const backend = new SubprocessBackend({
  command: 'python',
  args: ['run_llm.py'],
  useStdin: false  // Pass prompt as argument
});
```

See `examples/test-subprocess-backend.js` for a working example.

## Configuration File Example

Create `~/.promd`:

```yaml
backend: openai
defaultModel: gpt-4
apiKey: your-api-key-here
```
