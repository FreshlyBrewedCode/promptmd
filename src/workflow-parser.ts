export interface WorkflowStep {
  paths: string[];
}

export interface Workflow {
  steps: WorkflowStep[];
}

export class WorkflowParser {
  /**
   * Parse an array of path arguments into a structured workflow.
   * Each argument is treated as a step in the workflow.
   *
   * Supports:
   * - Single path: ["weather"] or ["prompts/weather.md"]
   * - Multiple paths (chained): ["weather", "plan-activities"]
   * - Directory: ["."] or ["./my-workflow"] or ["prompts/init"]
   * - Combined paths (comma-separated): ["file1,file2"] runs both as one step
   *
   * Parser does not validate paths, just extracts them as strings.
   */
  static parse(paths: string[]): Workflow {
    const steps = paths
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .map(arg => ({
        paths: arg.split(',').map(p => p.trim()).filter(p => p.length > 0),
      }));

    return { steps };
  }

  /**
   * Validate a workflow
   */
  static validate(workflow: Workflow): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!workflow.steps || workflow.steps.length === 0) {
      errors.push('Workflow must have at least one step');
    }

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      if (!step.paths || step.paths.length === 0) {
        errors.push(`Step ${i + 1} has no paths`);
      } else {
        for (const p of step.paths) {
          if (!p || p.trim().length === 0) {
            errors.push(`Step ${i + 1} has an empty path`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
