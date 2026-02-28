#!/usr/bin/env node

import { Command } from "commander";
import { ConfigLoader } from "./config";
import { WorkflowParser } from "./workflow-parser";
import { WorkflowExecutor } from "./executor";
import { Backend, StreamCallback } from "./backend";
import { OpenCodeBackend } from "./opencode-backend";
import { SubprocessBackend } from "./subprocess-backend";
import { log, setVerbose } from "./logger";
import * as fs from "fs";

// Mock backend for development
class MockBackend extends Backend {
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

async function main() {
  const program = new Command();

  program
    .name("promd")
    .description(
      "CLI tool for running, chaining, and looping prompts defined in markdown files",
    )
    .version("0.1.0");

  // Main command for executing workflows
  program
    .argument(
      "[workflow]",
      'Workflow to execute (e.g., "weather" or "weather > plan-activities")',
    )
    .option("-v, --verbose", "Enable verbose output")
    .option("--count <number>", "Number of loop iterations")
    .option("--exitOn <condition>", "Exit condition for loop")
    .allowUnknownOption(true) // Allow dynamic options like --city Hamburg
    .action(async (workflow, options) => {
      try {
        // Set verbose flag
        setVerbose(options.verbose || false);

        // Load configuration
        const config = ConfigLoader.load();
        log.verbose("Configuration loaded");

        // Parse workflow
        if (!workflow) {
          log.error("Error: Workflow argument is required");
          log.info("Usage: promd <workflow> [options]");
          log.info(
            'Example: promd "weather > plan-activities" --city Hamburg',
          );
          process.exit(1);
        }

        // Check if workflow is a directory
        const isDirectory =
          workflow === "." ||
          (fs.existsSync(workflow) && fs.statSync(workflow).isDirectory());

        // Collect custom variables from unknown options
        // Parse process.argv manually for unknown options
        const variables: Record<string, any> = {};

        for (let i = 0; i < process.argv.length; i++) {
          const arg = process.argv[i];
          if (arg.startsWith("--") && i + 1 < process.argv.length) {
            const key = arg.substring(2);
            const value = process.argv[i + 1];

            // Skip known options
            if (
              key !== "count" &&
              key !== "exitOn" &&
              key !== "verbose" &&
              !value.startsWith("--")
            ) {
              variables[key] = value;
              i++; // Skip the value in next iteration
            }
          }
        }

        // Initialize backend based on config
        let backend: Backend;
        const backendType = config.backend || "mock";

        if (backendType === "opencode") {
          log.verbose("Using OpenCode backend");
          backend = new OpenCodeBackend({
            model: config.opencode?.model,
            workDir: config.opencode?.workDir || process.cwd(),
            agent: config.opencode?.agent,
            format: config.opencode?.format || "default",
            thinking: config.opencode?.thinking || false,
            variant: config.opencode?.variant,
            env: config.opencode?.env,
          });
        } else if (backendType === "subprocess") {
          log.verbose("Using Subprocess backend");
          backend = new SubprocessBackend({
            command: config.subprocess?.command || "echo",
            args: config.subprocess?.args || [],
            cwd: config.subprocess?.cwd,
            env: config.subprocess?.env,
            useStdin: config.subprocess?.useStdin || false,
          });
        } else {
          log.verbose("Using Mock backend");
          backend = new MockBackend();
        }

        const executor = new WorkflowExecutor(backend);

        // Execute workflow
        log.header(`\nExecuting workflow: ${workflow}\n`);

        // Setup execution options with streaming
        const executionOptions: any = {
          variables,
          stream: true,
          onChunk: (chunk: string) => {
            // Write streaming output directly to stdout in real-time
            process.stdout.write(chunk);
          },
        };

        let result;
        if (isDirectory) {
          result = await executor.executeDirectory(
            workflow,
            executionOptions,
          );
        } else {
          const parsedWorkflow = WorkflowParser.parse(workflow);
          const validation = WorkflowParser.validate(parsedWorkflow);

          if (!validation.valid) {
            log.error("Invalid workflow:");
            validation.errors.forEach((err) => log.error(`  - ${err}`));
            process.exit(1);
          }

          // Check if loop options are provided
          if (options.count) {
            executionOptions.loop = {
              count: parseInt(options.count, 10),
              exitOn: options.exitOn,
            };
          }

          result = await executor.execute(
            parsedWorkflow,
            executionOptions,
          );
        }

        // Display results
        if (result.success) {
          log.success("\n\n✓ Workflow completed successfully\n");

          if (result.iterations) {
            log.info(`Completed ${result.iterations} iteration(s)\n`);
          }

          // Note: Final output is already streamed to stdout in real-time
        } else {
          log.error("\n\n✗ Workflow failed\n");
          process.exit(1);
        }
      } catch (error) {
        log.error(
          "Error: " +
            (error instanceof Error ? error.message : String(error)),
        );
        process.exit(1);
      }
    });

  // Loop subcommand
  program
    .command("loop")
    .description("Execute workflow in a loop")
    .argument("<workflow>", "Workflow to execute")
    .requiredOption("--count <number>", "Number of iterations")
    .option(
      "--exitOn <condition>",
      "Exit condition (string to search for in output)",
    )
    .option("-v, --verbose", "Enable verbose output")
    .allowUnknownOption(true)
    .action(async (workflow, options) => {
      try {
        // Set verbose flag
        setVerbose(options.verbose || false);

        // Load configuration
        const config = ConfigLoader.load();
        log.verbose("Configuration loaded");

        // Collect custom variables from process.argv
        const variables: Record<string, any> = {};

        for (let i = 0; i < process.argv.length; i++) {
          const arg = process.argv[i];
          if (arg.startsWith("--") && i + 1 < process.argv.length) {
            const key = arg.substring(2);
            const value = process.argv[i + 1];

            // Skip known options
            if (
              key !== "count" &&
              key !== "exitOn" &&
              key !== "verbose" &&
              !value.startsWith("--")
            ) {
              variables[key] = value;
              i++; // Skip the value in next iteration
            }
          }
        }

        // Initialize backend based on config
        let backend: Backend;
        const backendType = config.backend || "mock";

        if (backendType === "opencode") {
          log.verbose("Using OpenCode backend");
          backend = new OpenCodeBackend({
            model: config.opencode?.model,
            workDir: config.opencode?.workDir || process.cwd(),
            agent: config.opencode?.agent,
            format: config.opencode?.format || "default",
            thinking: config.opencode?.thinking || false,
            variant: config.opencode?.variant,
            env: config.opencode?.env,
          });
        } else if (backendType === "subprocess") {
          log.verbose("Using Subprocess backend");
          backend = new SubprocessBackend({
            command: config.subprocess?.command || "echo",
            args: config.subprocess?.args || [],
            cwd: config.subprocess?.cwd,
            env: config.subprocess?.env,
            useStdin: config.subprocess?.useStdin || false,
          });
        } else {
          log.verbose("Using Mock backend");
          backend = new MockBackend();
        }

        const executor = new WorkflowExecutor(backend);

        // Parse and validate workflow
        const parsedWorkflow = WorkflowParser.parse(workflow);
        const validation = WorkflowParser.validate(parsedWorkflow);

        if (!validation.valid) {
          log.error("Invalid workflow:");
          validation.errors.forEach((err) => log.error(`  - ${err}`));
          process.exit(1);
        }

        // Execute workflow with loop
        log.header(`\nExecuting workflow in loop: ${workflow}\n`);

        const result = await executor.execute(parsedWorkflow, {
          variables,
          stream: true,
          onChunk: (chunk: string) => {
            // Write streaming output directly to stdout in real-time
            process.stdout.write(chunk);
          },
          loop: {
            count: parseInt(options.count, 10),
            exitOn: options.exitOn,
          },
        });

        // Display results
        if (result.success) {
          log.success("\n\n✓ Workflow completed successfully\n");
          log.info(`Completed ${result.iterations} iteration(s)\n`);
        } else {
          log.error("\n✗ Workflow failed\n");
          process.exit(1);
        }
      } catch (error) {
        log.error(
          "Error: " +
            (error instanceof Error ? error.message : String(error)),
        );
        process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  log.error("Fatal error: " + error);
  process.exit(1);
});
