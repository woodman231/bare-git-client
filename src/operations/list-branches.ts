import fs from 'fs';
import git from 'isomorphic-git';
import path from 'path';
import { type IBareGitClient } from '../types/interfaces.js';
import { type ListBranchesResult } from '../schemas/index.js';
import { BareGitClientError } from '../errors/BareGitClientError.js';

/**
 * List all branches in the repository
 */
export async function listBranches(
  client: IBareGitClient
): Promise<ListBranchesResult> {
  const gitdir = path.resolve(client.repoPath);

  try {
    // Get list of branch names
    const branchNames = await git.listBranches({
      fs,
      gitdir,
      remote: undefined, // Local branches only
    });

    // Resolve each branch to its commit SHA
    const branches = await Promise.all(
      branchNames.map(async (name) => {
        const sha = await git.resolveRef({
          fs,
          gitdir,
          ref: `refs/heads/${name}`,
        });
        return { name, commit: sha };
      })
    );

    return { branches };
  } catch (error) {
    throw BareGitClientError.operationFailed(
      'listBranches',
      error instanceof Error ? error.message : String(error)
    );
  }
}
