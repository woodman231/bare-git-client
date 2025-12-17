import fs from 'fs';
import git from 'isomorphic-git';
import path from 'path';
import { type IBareGitClient } from '../types/interfaces.js';
import {
  GetFileDetailsInputSchema,
  type GetFileDetailsInput,
  type GetFileDetailsResult,
} from '../schemas/index.js';
import { resolvePath } from '../utils/tree-walker.js';
import { BareGitClientError } from '../errors/BareGitClientError.js';

/**
 * Get metadata details about a file or directory without reading its content
 */
export async function getFileDetails(
  client: IBareGitClient,
  input: GetFileDetailsInput
): Promise<GetFileDetailsResult> {
  // Validate input with defaults
  const validated = GetFileDetailsInputSchema.parse(input);
  const gitdir = path.resolve(client.repoPath);

  try {
    // Resolve commit
    const commitSha = await git.resolveRef({ fs, gitdir, ref: validated.ref });

    // Get root tree
    const commit = await git.readCommit({ fs, gitdir, oid: commitSha });
    const rootTreeSha = commit.commit.tree;

    // Find the file or directory
    const target = await resolvePath(gitdir, rootTreeSha, validated.filePath);

    return {
      mode: target.mode,
      oid: target.sha,
      type: target.type,
    };
  } catch (error) {
    if (error instanceof BareGitClientError) {
      throw error;
    }
    throw BareGitClientError.operationFailed(
      'getFileDetails',
      error instanceof Error ? error.message : String(error)
    );
  }
}
