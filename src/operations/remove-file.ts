import fs from 'fs';
import git from 'isomorphic-git';
import path from 'path';
import { type IBareGitClient } from '../types/interfaces.js';
import {
  RemoveFileInputSchema,
  type RemoveFileInput,
  type RemoveFileResult,
} from '../schemas/index.js';
import { buildAuthor } from '../utils/author-builder.js';
import { normalizeRef } from '../utils/ref-resolver.js';
import { removeFileFromTree } from '../utils/tree-walker.js';
import { compareAndSwap } from '../utils/concurrency.js';
import { BareGitClientError } from '../errors/BareGitClientError.js';

/**
 * Remove a file from a branch
 */
export async function removeFile(
  client: IBareGitClient,
  input: RemoveFileInput
): Promise<RemoveFileResult> {
  // Validate input
  const validated = RemoveFileInputSchema.parse(input);
  const gitdir = path.resolve(client.repoPath);
  const ref = normalizeRef(validated.ref);

  try {
    // Resolve parent commit
    const parentSha = await git.resolveRef({ fs, gitdir, ref });

    // Get root tree SHA
    const commit = await git.readCommit({ fs, gitdir, oid: parentSha });
    const rootTreeSha = commit.commit.tree;

    // Clean and split file path
    const cleanPath = validated.filePath.replace(/^\/+|\/+$/g, '');
    const pathParts = cleanPath.split('/').filter(Boolean);

    if (pathParts.length === 0) {
      throw BareGitClientError.invalidPath(validated.filePath, 'Path cannot be empty');
    }

    // Remove file from tree (may return null if tree becomes empty)
    const newTreeSha = await removeFileFromTree(gitdir, rootTreeSha, pathParts);

    // Build author
    const author = buildAuthor(
      validated.author ?? {
        name: client.userName,
        email: client.userEmail,
      }
    );

    // Create commit
    const commitMessage = validated.commitMessage ?? `Remove ${validated.filePath}`;
    
    // If tree is null, we need a special empty tree
    const finalTreeSha = newTreeSha ?? await git.writeTree({ fs, gitdir, tree: [] });
    
    const commitSha = await git.writeCommit({
      fs,
      gitdir,
      commit: {
        message: commitMessage,
        tree: finalTreeSha,
        parent: [parentSha],
        author,
        committer: author,
      },
    });

    // Update reference with concurrency check
    await compareAndSwap(gitdir, ref, parentSha, commitSha);

    return {
      commitSha,
      treeSha: newTreeSha,
    };
  } catch (error) {
    if (error instanceof BareGitClientError) {
      throw error;
    }
    throw BareGitClientError.operationFailed(
      'removeFile',
      error instanceof Error ? error.message : String(error)
    );
  }
}
