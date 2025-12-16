import { execSync } from 'child_process';
import { BareGitClientError } from '../errors/BareGitClientError.js';

/**
 * Check if Git CLI is available and return version information
 * Throws BareGitClientError if Git is not found
 */
export function checkGitCli(): string {
  try {
    const version = execSync('git --version', { 
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    return version;
  } catch (error) {
    throw BareGitClientError.gitCliNotFound(
      'Git command not found in PATH. Please ensure Git is installed and available in your system PATH.'
    );
  }
}
