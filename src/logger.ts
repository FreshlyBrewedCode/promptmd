import chalk from 'chalk';

// Global verbose flag
let isVerbose = false;

// Set verbose mode
export function setVerbose(verbose: boolean) {
  isVerbose = verbose;
}

// Get verbose mode
export function getVerbose(): boolean {
  return isVerbose;
}

// Logging utilities
export const log = {
  verbose: (message: string) => {
    if (isVerbose) {
      console.log(chalk.cyan(message));
    }
  },
  info: (message: string) => {
    console.log(message);
  },
  success: (message: string) => {
    console.log(chalk.green(message));
  },
  error: (message: string) => {
    console.error(chalk.red(message));
  },
  warn: (message: string) => {
    console.warn(chalk.yellow(message));
  },
  header: (message: string) => {
    console.log(chalk.bold.white(message));
  },
  step: (message: string, filePath?: string) => {
    if (filePath) {
      console.log(chalk.yellow.italic(message) + chalk.yellow.italic(' ') + chalk.bold.yellow(filePath));
    } else {
      console.log(chalk.yellow.italic(message));
    }
  }
};
