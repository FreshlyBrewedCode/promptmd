export interface WorkflowStep {
  prompt: string;
}

export interface Workflow {
  steps: WorkflowStep[];
}

export class WorkflowParser {
  /**
   * Parse a workflow string into a structured workflow
   * Supports:
   * - Single prompt: "weather"
   * - Chained prompts: "weather > plan-activities"
   * - Directory: "." or "./my-workflow"
   * 
   * Future syntax extensions can be added here
   */
  static parse(workflowString: string): Workflow {
    // Trim whitespace
    const trimmed = workflowString.trim();

    // Check if it's a directory reference
    if (trimmed === '.' || trimmed.startsWith('./') || trimmed.startsWith('../')) {
      return {
        steps: [{ prompt: trimmed }]
      };
    }

    // Split by '>' for chained prompts
    if (trimmed.includes('>')) {
      const steps = trimmed
        .split('>')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(prompt => ({ prompt }));

      return { steps };
    }

    // Single prompt
    return {
      steps: [{ prompt: trimmed }]
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
      if (!step.prompt || step.prompt.trim().length === 0) {
        errors.push(`Step ${i + 1} has an empty prompt`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
