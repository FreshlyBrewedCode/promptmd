import * as Mustache from 'mustache';
import * as fs from 'fs';
import * as path from 'path';
import { log } from './logger';

/**
 * Resolve a partial name to a file path and load its contents.
 * e.g. "file" -> "./file.md"
 *      "dir/file" -> "./dir/file.md"
 */
function resolvePartial(name: string): string {
  const filePath = path.resolve(`${name}.md`);
  if (!fs.existsSync(filePath)) {
    log.warn(`Warning: Partial '${name}' not found at '${filePath}'`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf-8');
}

export class TemplateEngine {
  /**
   * Replace template variables in a string using Mustache.
   * Supports all Mustache features including sections ({{#foo}}...{{/foo}})
   * and partials ({{> file}}) which are loaded from disk as <name>.md
   */
  static render(template: string, variables: Record<string, any>): string {
    return Mustache.render(template, variables, resolvePartial);
  }

  /**
   * Extract all variable names from a template string.
   * Returns the root-level tokens that are variable references.
   */
  static extractVariables(template: string): string[] {
    const tokens = Mustache.parse(template);
    const variables = new Set<string>();

    for (const token of tokens) {
      const type = token[0];
      const key = token[1] as string;
      // 'name' tokens are simple variable references; skip '.' (implicit iterator)
      if (type === 'name' && key !== '.') {
        variables.add(key.split('.')[0]);
      }
    }

    return Array.from(variables);
  }
}
