import { Backend } from '../backend';
import { Config } from '../config';
import { OpenCodeBackend } from './opencode';
import { SubprocessBackend } from './subprocess';
import { MockBackend } from './mock';

/**
 * Type for a backend factory function
 */
export type BackendFactory = (config: Config) => Backend;

/**
 * Registry of available backends
 * 
 * Each backend is registered with a factory function that creates
 * an instance based on the provided configuration.
 */
export const BACKENDS: Record<string, BackendFactory> = {
  opencode: (config: Config) => {
    return new OpenCodeBackend({
      model: config.opencode?.model,
      workDir: config.opencode?.workDir || process.cwd(),
      agent: config.opencode?.agent,
      format: config.opencode?.format || 'default',
      thinking: config.opencode?.thinking || false,
      variant: config.opencode?.variant,
      env: config.opencode?.env
    });
  },

  subprocess: (config: Config) => {
    return new SubprocessBackend({
      command: config.subprocess?.command || 'echo',
      args: config.subprocess?.args || [],
      cwd: config.subprocess?.cwd,
      env: config.subprocess?.env,
      useStdin: config.subprocess?.useStdin || false
    });
  },

  mock: (config: Config) => {
    return new MockBackend();
  }
};

/**
 * Get a list of all registered backend names
 */
export function getBackendNames(): string[] {
  return Object.keys(BACKENDS);
}

/**
 * Check if a backend is registered
 */
export function isBackendRegistered(name: string): boolean {
  return name.toLowerCase() in BACKENDS;
}

// Re-export backend classes for convenience
export { OpenCodeBackend } from './opencode';
export { SubprocessBackend } from './subprocess';
export { MockBackend } from './mock';
