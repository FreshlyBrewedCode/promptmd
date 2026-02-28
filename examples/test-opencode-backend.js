#!/usr/bin/env node
/**
 * Example: Using OpenCodeBackend to execute prompts
 * 
 * This demonstrates how to use the OpenCodeBackend to integrate
 * with OpenCode for prompt execution.
 */

const { OpenCodeBackend } = require('../dist/opencode-backend');
const { WorkflowExecutor } = require('../dist/executor');
const { WorkflowParser } = require('../dist/workflow-parser');

async function main() {
  // Create an OpenCode backend
  const backend = new OpenCodeBackend({
    // Uncomment to specify a model:
    // model: 'anthropic/claude-sonnet-4',
    
    // Working directory
    workDir: process.cwd(),
    
    // Format: 'default' for formatted output, 'json' for raw events
    format: 'default'
  });

  const executor = new WorkflowExecutor(backend);

  // Parse a simple workflow
  const workflow = WorkflowParser.parse('examples/weather');

  console.log('Testing OpenCodeBackend with streaming...\n');
  console.log('Output will stream in real-time from OpenCode:\n');
  console.log('─'.repeat(50));

  // Execute with streaming enabled
  const result = await executor.execute(workflow, {
    stream: true,
    onChunk: (chunk) => {
      // Stream to stdout in real-time
      process.stdout.write(chunk);
    }
  });

  console.log('\n' + '─'.repeat(50));
  
  if (result.success) {
    console.log('\n✓ Workflow completed successfully');
  } else {
    console.error('\n✗ Workflow failed');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
