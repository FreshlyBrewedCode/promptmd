/**
 * Extract custom variables from CLI arguments, excluding well-known options
 */
export function extractCustomVariables(
  options: Record<string, any>,
): Record<string, any> {
  const variables: Record<string, any> = {};
  const knownOptions = new Set(Object.keys(options));

  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith("--") && i + 1 < process.argv.length) {
      const key = arg.substring(2);
      const value = process.argv[i + 1];

      // Skip known options
      if (!knownOptions.has(key) && !value.startsWith("--")) {
        variables[key] = value;
        i++; // Skip the value in next iteration
      }
    }
  }

  return variables;
}
