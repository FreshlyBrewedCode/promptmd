import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';

export interface Config {
  backend?: string;
  defaultModel?: string;
  [key: string]: any;
}

export class ConfigLoader {
  private static readonly CONFIG_FILENAME = '.promd';

  /**
   * Load configuration with priority:
   * 1. Local directory (./.promd)
   * 2. Parent directories (../.promd, ../../.promd, etc.)
   * 3. Global config (~/.promd)
   */
  static load(startDir: string = process.cwd()): Config {
    const configs: Config[] = [];

    // Load global config first (lowest priority)
    const globalConfig = this.loadGlobalConfig();
    if (globalConfig) {
      configs.push(globalConfig);
    }

    // Load configs from parent directories (walking up from root to startDir)
    const dirConfigs = this.loadDirectoryConfigs(startDir);
    configs.push(...dirConfigs);

    // Merge configs (later configs override earlier ones)
    return this.mergeConfigs(configs);
  }

  private static loadGlobalConfig(): Config | null {
    const globalConfigPath = path.join(os.homedir(), this.CONFIG_FILENAME);
    return this.loadConfigFile(globalConfigPath);
  }

  private static loadDirectoryConfigs(startDir: string): Config[] {
    const configs: Config[] = [];
    let currentDir = path.resolve(startDir);
    const root = path.parse(currentDir).root;

    // Walk up the directory tree and collect all config files
    const configPaths: string[] = [];
    while (true) {
      const configPath = path.join(currentDir, this.CONFIG_FILENAME);
      if (fs.existsSync(configPath)) {
        configPaths.unshift(configPath); // Add to beginning to maintain order
      }

      if (currentDir === root) {
        break;
      }

      currentDir = path.dirname(currentDir);
    }

    // Load configs in order (root to startDir)
    for (const configPath of configPaths) {
      const config = this.loadConfigFile(configPath);
      if (config) {
        configs.push(config);
      }
    }

    return configs;
  }

  private static loadConfigFile(filePath: string): Config | null {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const config = yaml.load(content) as Config;
      return config || {};
    } catch (error) {
      console.warn(`Warning: Failed to load config from ${filePath}: ${error}`);
      return null;
    }
  }

  private static mergeConfigs(configs: Config[]): Config {
    return configs.reduce((merged, config) => {
      return { ...merged, ...config };
    }, {} as Config);
  }
}
