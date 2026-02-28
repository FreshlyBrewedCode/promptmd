import { Backend } from './backend';
import { OpenCodeBackend } from './opencode-backend';
import { SubprocessBackend } from './subprocess-backend';
import { Config } from './config';

/**
 * Create a backend instance based on configuration
 */
export function createBackend(config: Config): Backend {
  const backendType = config.backend || 'mock';

  switch (backendType.toLowerCase()) {
    case 'opencode':
      return new OpenCodeBackend({
        model: config.opencode?.model,
        workDir: config.opencode?.workDir || process.cwd(),
        agent: config.opencode?.agent,
        format: config.opencode?.format || 'default',
        thinking: config.opencode?.thinking || false,
        variant: config.opencode?.variant,
        env: config.opencode?.env
      });

    case 'subprocess':
      return new SubprocessBackend({
        command: config.subprocess?.command || 'echo',
        args: config.subprocess?.args || [],
        cwd: config.subprocess?.cwd,
        env: config.subprocess?.env,
        useStdin: config.subprocess?.useStdin || false
      });

    case 'mock':
    default:
      // Return mock backend (defined in cli.ts)
      // This is a temporary solution until we can import it
      return null as any; // Will be replaced in cli.ts
  }
}
