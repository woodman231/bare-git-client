import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { type IBareGitClient } from '../types/interfaces.js';
import {
  RunGCInputSchema,
  type RunGCInput,
  type RunGCResult,
} from '../schemas/index.js';
import { checkGitCli } from '../utils/git-cli-detector.js';
import { BareGitClientError } from '../errors/BareGitClientError.js';

const execAsync = promisify(exec);

/**
 * Run Git garbage collection
 * Requires Git CLI to be installed
 */
export async function runGC(
  client: IBareGitClient,
  input?: Partial<RunGCInput>
): Promise<RunGCResult> {
  // Validate input
  const validated = RunGCInputSchema.parse(input ?? {});
  const gitdir = path.resolve(client.repoPath);

  try {
    // Check if Git CLI is available (throws if not found)
    checkGitCli();

    // Build Git command
    const gcMode = validated.aggressive ? '--aggressive' : '--auto';
    const command = `git --git-dir="${gitdir}" gc ${gcMode}`;

    // Execute Git command
    const { stdout, stderr } = await execAsync(command);

    // Git often prints progress to stderr, combine both
    const output = [stdout, stderr].filter(Boolean).join('\n').trim();

    return {
      output: output || 'Garbage collection complete.',
    };
  } catch (error) {
    if (error instanceof BareGitClientError) {
      throw error;
    }
    throw BareGitClientError.operationFailed(
      'runGC',
      error instanceof Error ? error.message : String(error)
    );
  }
}
