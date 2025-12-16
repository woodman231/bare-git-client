import fs from 'fs';
import git from 'isomorphic-git';
import { BareGitClientError } from '../errors/BareGitClientError.js';

/**
 * Compare-and-swap pattern for atomic Git reference updates
 * Ensures the reference hasn't changed between read and write
 */
export async function compareAndSwap(
  gitdir: string,
  ref: string,
  expectedSha: string | null,
  newSha: string
): Promise<void> {
  try {
    // Verify the ref is still pointing to the expected SHA
    let currentSha: string | null = null;
    try {
      currentSha = await git.resolveRef({ fs, gitdir, ref });
    } catch {
      // Ref doesn't exist yet, which is fine if we expected null
      currentSha = null;
    }

    if (currentSha !== expectedSha) {
      throw BareGitClientError.concurrencyError(ref);
    }

    // Update the reference
    await git.writeRef({ fs, gitdir, ref, value: newSha, force: true });
  } catch (error) {
    if (error instanceof BareGitClientError) {
      throw error;
    }
    throw BareGitClientError.operationFailed(
      'compareAndSwap',
      error instanceof Error ? error.message : String(error)
    );
  }
}
