#!/usr/bin/env node

import { Command } from "commander";
import { ConfigLoader } from "./config";
import { WorkflowParser } from "./workflow-parser";
import { WorkflowExecutor } from "./executor";
import { createBackend } from "./backend-factory";
import { log, setVerbose } from "./logger";
import { extractCustomVariables } from "./utils";
import * as fs from "fs";

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
      "[steps...]",
      'Workflow steps to execute (e.g., promd weather plan-activities)',
    )
    .option("-v, --verbose", "Enable verbose output")
    .option("-b, --backend <name>", "Backend to use (overrides config)")
    .option("--count <number>", "Number of loop iterations")
    .option("--exitOn <condition>", "Exit condition for loop")
    .allowUnknownOption(true) // Allow dynamic options like --city Hamburg
    .action(async (steps: string[], options) => {
      try {
        // Set verbose flag
        setVerbose(options.verbose || false);

        // Load configuration
        const config = ConfigLoader.load();
        log.verbose("Configuration loaded");

        // Parse workflow
        if (!steps || steps.length === 0) {
          log.error("Error: At least one workflow step is required");
          log.info("Usage: promd <step> [step2 ...] [options]");
          log.info(
            "Example: promd weather plan-activities --city Hamburg",
          );
          process.exit(1);
        }

        // Check if workflow is a single directory reference
        const isSingleDirectory =
          steps.length === 1 &&
          (steps[0] === "." ||
            (fs.existsSync(steps[0]) && fs.statSync(steps[0]).isDirectory()));

        // Collect custom variables from unknown options
        const variables = extractCustomVariables(options);

        // Initialize backend using factory
        log.verbose(
          `Using backend: ${options.backend || config.backend || "mock"}`,
        );
        const backend = createBackend(config, options.backend);

        const executor = new WorkflowExecutor(backend);

        // Execute workflow
        log.header(`\nExecuting workflow: ${steps.join(" > ")}\n`);

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
        if (isSingleDirectory) {
          result = await executor.executeDirectory(
            steps[0],
            executionOptions,
          );
        } else {
          const parsedWorkflow = WorkflowParser.parse(steps);
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
    .argument("<steps...>", "Workflow steps to execute")
    .requiredOption("--count <number>", "Number of iterations")
    .option(
      "--exitOn <condition>",
      "Exit condition (string to search for in output)",
    )
    .option("-v, --verbose", "Enable verbose output")
    .option("-b, --backend <name>", "Backend to use (overrides config)")
    .allowUnknownOption(true)
    .action(async (steps: string[], options) => {
      try {
        // Set verbose flag
        setVerbose(options.verbose || false);

        // Load configuration
        const config = ConfigLoader.load();
        log.verbose("Configuration loaded");

        // Collect custom variables from unknown options
        const variables = extractCustomVariables(options);

        // Initialize backend using factory
        log.verbose(
          `Using backend: ${options.backend || config.backend || "mock"}`,
        );
        const backend = createBackend(config, options.backend);

        const executor = new WorkflowExecutor(backend);

        // Parse and validate workflow
        const parsedWorkflow = WorkflowParser.parse(steps);
        const validation = WorkflowParser.validate(parsedWorkflow);

        if (!validation.valid) {
          log.error("Invalid workflow:");
          validation.errors.forEach((err) => log.error(`  - ${err}`));
          process.exit(1);
        }

        // Execute workflow with loop
        log.header(`\nExecuting workflow in loop: ${steps.join(" > ")}\n`);

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
