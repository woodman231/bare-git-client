import fs from 'fs';
import git from 'isomorphic-git';
import path from 'path';
import { type IBareGitClient } from '../types/interfaces.js';
import {
  RemoveBranchInputSchema,
  type RemoveBranchInput,
  type RemoveBranchResult,
} from '../schemas/index.js';
import { normalizeRef } from '../utils/ref-resolver.js';
import { BareGitClientError } from '../errors/BareGitClientError.js';

/**
 * Remove a branch
 */
export async function removeBranch(
  client: IBareGitClient,
  input: RemoveBranchInput
): Promise<RemoveBranchResult> {
  // Validate input
  const validated = RemoveBranchInputSchema.parse(input);
  const gitdir = path.resolve(client.repoPath);

  try {
    // Normalize branch name
    const ref = normalizeRef(validated.branchName);

    // Verify branch exists and get its SHA
    let commitSha: string;
    try {
      commitSha = await git.resolveRef({ fs, gitdir, ref });
    } catch {
      throw BareGitClientError.notFound('Branch', validated.branchName);
    }

    // Delete the reference
    await git.deleteRef({ fs, gitdir, ref });

    return {
      branchName: validated.branchName,
      commitSha,
    };
  } catch (error) {
    if (error instanceof BareGitClientError) {
      throw error;
    }
    throw BareGitClientError.operationFailed(
      'removeBranch',
      error instanceof Error ? error.message : String(error)
    );
  }
}
