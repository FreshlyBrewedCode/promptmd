import { Backend } from './backend';
import { Config } from './config';
import { BACKENDS, isBackendRegistered } from './backends';

/**
 * Create a backend instance based on configuration
 * 
 * @param config Configuration object
 * @param backendOverride Optional backend name to override config.backend
 * @returns Backend instance
 * @throws Error if backend is not registered
 */
export function createBackend(config: Config, backendOverride?: string): Backend {
  const backendType = (backendOverride || config.backend || 'mock').toLowerCase();

  if (!isBackendRegistered(backendType)) {
    throw new Error(`Unknown backend: ${backendType}. Available backends: ${Object.keys(BACKENDS).join(', ')}`);
  }

  const factory = BACKENDS[backendType];
  return factory(config);
}
