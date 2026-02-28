import { log } from './logger';

export class TemplateEngine {
  /**
   * Replace template variables in a string
   * Supports:
   * - {{variableName}} - simple variable replacement
   * - {{input}} - reference to input from previous step
   * - {{input.property}} - access nested properties (for structured output)
   * - {{city}} - custom variables passed via CLI
   */
  static render(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      const value = this.resolveValue(trimmedKey, variables);
      
      if (value === undefined || value === null) {
        log.warn(`Warning: Template variable '${trimmedKey}' is undefined`);
        return match; // Keep original placeholder if not found
      }

      return String(value);
    });
  }

  /**
   * Resolve a potentially nested key from variables object
   * e.g., "input.temperature" -> variables.input.temperature
   */
  private static resolveValue(key: string, variables: Record<string, any>): any {
    const keys = key.split('.');
    let value: any = variables;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Extract all variable names from a template string
   */
  static extractVariables(template: string): string[] {
    const matches = template.matchAll(/\{\{([^}]+)\}\}/g);
    const variables = new Set<string>();

    for (const match of matches) {
      const key = match[1].trim();
      // Get the root variable name (before any dots)
      const rootKey = key.split('.')[0];
      variables.add(rootKey);
    }

    return Array.from(variables);
  }
}
