export interface WorkflowStep {
  path: string;
}

export interface Workflow {
  steps: WorkflowStep[];
}

export class WorkflowParser {
  /**
   * Parse a workflow string into a structured workflow
   * Supports:
   * - Single path: "weather" or "prompts/weather.md"
   * - Chained paths: "weather > plan-activities"
   * - Directory: "." or "./my-workflow" or "prompts/init"
   * 
   * Parser does not validate paths, just extracts them as strings
   */
  static parse(workflowString: string): Workflow {
    // Trim whitespace
    const trimmed = workflowString.trim();

    // Check if it's a directory reference
    if (trimmed === '.' || trimmed.startsWith('./') || trimmed.startsWith('../')) {
      return {
        steps: [{ path: trimmed }]
      };
    }

    // Split by '>' for chained paths
    if (trimmed.includes('>')) {
      const steps = trimmed
        .split('>')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(path => ({ path }));

      return { steps };
    }

    // Single path
    return {
      steps: [{ path: trimmed }]
    };
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
      if (!step.path || step.path.trim().length === 0) {
        errors.push(`Step ${i + 1} has an empty path`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
