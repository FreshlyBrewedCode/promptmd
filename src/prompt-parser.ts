import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';

export interface PromptFile {
  content: string;
  outputSchema?: Record<string, any>;
  metadata?: Record<string, any>;
}

export class PromptFileParser {
  /**
   * Parse a prompt file (markdown with optional frontmatter)
   * @param filePath Path to the prompt file (with or without .md extension)
   * @returns Parsed prompt file
   */
  static parse(filePath: string): PromptFile {
    const resolvedPath = this.resolvePromptPath(filePath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Prompt file not found: ${resolvedPath}`);
    }

    const fileContent = fs.readFileSync(resolvedPath, 'utf-8');
    const parsed = matter(fileContent);

    return {
      content: parsed.content.trim(),
      outputSchema: parsed.data.output,
      metadata: parsed.data
    };
  }

  /**
   * Resolve a prompt path, adding .md extension if needed
   */
  private static resolvePromptPath(promptPath: string): string {
    // If it's already a .md file, return as is
    if (promptPath.endsWith('.md')) {
      return path.resolve(promptPath);
    }

    // Try adding .md extension
    const withExtension = `${promptPath}.md`;
    if (fs.existsSync(withExtension)) {
      return path.resolve(withExtension);
    }

    // Return original path (will fail later with proper error)
    return path.resolve(promptPath);
  }

  /**
   * Load all prompt files from a directory
   * @param dirPath Path to directory
   * @returns Array of prompt files with their names
   */
  static loadDirectory(dirPath: string): Array<{ name: string; prompt: PromptFile }> {
    const resolvedPath = path.resolve(dirPath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Directory not found: ${resolvedPath}`);
    }

    if (!fs.statSync(resolvedPath).isDirectory()) {
      throw new Error(`Not a directory: ${resolvedPath}`);
    }

    const files = fs.readdirSync(resolvedPath)
      .filter(file => file.endsWith('.md'))
      .sort();

    return files.map(file => {
      const name = path.basename(file, '.md');
      const filePath = path.join(resolvedPath, file);
      const prompt = this.parse(filePath);
      return { name, prompt };
    });
  }
}
