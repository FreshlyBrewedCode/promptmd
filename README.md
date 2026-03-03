# Prompt MD

Promptmd is a CLI tool for running, chaining, and looping prompts defined in markdown files with real-time streaming support.

## Features

- 🔗 **Chain prompts** together with simple syntax
- 📝 **Markdown-based** prompt definitions with frontmatter
- 🔄 **Loop execution** with exit conditions
- 🎯 **Variable substitution** with `{{variable}}` syntax
- 📊 **Structured output** via YAML frontmatter
- ⚡ **Real-time streaming** output
- 🔌 **Multiple backends**: OpenCode, subprocess, or custom implementations

## Quick Start

```bash
npm install
npm run build
```

## Usage

### Simple prompt

```sh
echo "Check the weather in Berlin" > weather.md
promd weather
```

### Chaining prompts

```sh
echo "Check the weather in Berlin" > weather.md
echo "Suggest activities in Berlin based on the provided weather forecast: {{input}}" > plan-activities.md
promd weather plan-activities
```

### Use arguments

```sh
echo "Check the weather in {{city}}" > weather.md
echo "Suggest activities in {{city}} based on the provided weather forecast: {{input}}" > plan-activities.md
promd weather plan-activities --city Hamburg
```

### Structured output via frontmatter

*weather.md*
```markdown
---
output:
  temperature: "the forecasted temperature"
  rain: "will it rain?"
---
Check the weather in Berlin
```

```sh
echo "Suggest activities in Berlin. Temperature: {{input.temperature}} Rain: {{input.rain}}" > plan-activities.md
promd weather plan-activities
```

### Chain all prompts in a directory

```sh
promd .
```

### Run in a loop

```sh
promd loop --count 10 --exitOn "Complete" ./my-workflow
```

## Backends

### OpenCode Backend (Recommended)

Use OpenCode for AI-powered prompt execution with streaming:

```yaml
# .promd
backend: opencode
opencode:
  model: anthropic/claude-sonnet-4
  thinking: true
```

See [OPENCODE_BACKEND.md](OPENCODE_BACKEND.md) for details.

### Subprocess Backend

Integrate with external tools/scripts:

```yaml
# .promd
backend: subprocess
subprocess:
  command: python
  args: ['run_llm.py']
```

See [STREAMING.md](STREAMING.md) for details.

### Mock Backend (Default)

For testing and development:

```yaml
# .promd
backend: mock
```

## Documentation

- [DEVELOPMENT.md](DEVELOPMENT.md) - Setup and development guide
- [OPENCODE_BACKEND.md](OPENCODE_BACKEND.md) - OpenCode integration
- [STREAMING.md](STREAMING.md) - Streaming and custom backends
- [examples/](examples/) - Example prompts and configurations

## Configuration

Create `~/.promd` or `./.promd`:

```yaml
backend: opencode
opencode:
  model: anthropic/claude-sonnet-4
  format: default
```

Config files are loaded hierarchically:
1. `~/.promd` (global)
2. `../../.promd`, `../.promd` (parent directories)
3. `./.promd` (current directory, highest priority)

## Examples

See the [examples/](examples/) directory for:
- Basic prompt files
- Chained workflows
- Structured output examples
- Backend integration examples
- Configuration examples


