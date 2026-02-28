#!/usr/bin/env node
/**
 * Example: Using SubprocessBackend to invoke a Python script
 * 
 * This demonstrates how to use the SubprocessBackend to integrate
 * with external LLM tools or scripts.
 */

const { SubprocessBackend } = require('../dist/subprocess-backend');
const { WorkflowExecutor } = require('../dist/executor');
const { WorkflowParser } = require('../dist/workflow-parser');

async function main() {
  // Create a subprocess backend that calls our Python script
  const backend = new SubprocessBackend({
    command: 'python3',
    args: ['examples/test-subprocess.py'],
    useStdin: false  // Pass prompt as command-line argument
  });

  const executor = new WorkflowExecutor(backend);

  // Parse a simple workflow
  const workflow = WorkflowParser.parse('examples/weather');

  console.log('Testing SubprocessBackend with streaming...\n');
  console.log('Output will stream in real-time:\n');
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
  console.error('Error:', error);
  process.exit(1);
});
