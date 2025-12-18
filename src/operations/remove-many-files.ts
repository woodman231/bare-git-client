import fs from 'fs';
import git from 'isomorphic-git';
import path from 'path';
import { type IBareGitClient } from '../types/interfaces.js';
import {
  RemoveManyFilesInputSchema,
  type RemoveManyFilesInput,
  type RemoveManyFilesResult,
} from '../schemas/index.js';
import { buildAuthor } from '../utils/author-builder.js';
import { normalizeRef } from '../utils/ref-resolver.js';
import { removeFileFromTree } from '../utils/tree-walker.js';
import { compareAndSwap } from '../utils/concurrency.js';
import { BareGitClientError } from '../errors/BareGitClientError.js';

/**
 * Remove many files in a single commit
 */
export async function removeManyFiles(
  client: IBareGitClient,
  input: RemoveManyFilesInput
): Promise<RemoveManyFilesResult> {
  // Validate input
  const validated = RemoveManyFilesInputSchema.parse(input);
  const gitdir = path.resolve(client.repoPath);
  const ref = normalizeRef(validated.ref);

  try {
    // Check for duplicate file paths
    const uniquePaths = new Set(validated.filePaths);
    if (uniquePaths.size !== validated.filePaths.length) {
      throw BareGitClientError.invalidInput(
        'filePaths',
        'Duplicate file paths are not allowed'
      );
    }

    // Resolve parent commit
    const parentSha = await git.resolveRef({ fs, gitdir, ref });

    // Get root tree SHA
    const commit = await git.readCommit({ fs, gitdir, oid: parentSha });
    const rootTreeSha = commit.commit.tree;

    // Prepare all file paths
    const preparedPaths = validated.filePaths.map((filePath) => {
      // Clean and split file path
      const cleanPath = filePath.replace(/^\/+|\/+$/g, '');
      const pathParts = cleanPath.split('/').filter(Boolean);

      if (pathParts.length === 0) {
        throw BareGitClientError.invalidPath(filePath, 'Path cannot be empty');
      }

      return {
        filePath,
        pathParts,
      };
    });

    // Sequentially remove files from tree, chaining the tree SHA
    let currentTreeSha: string | null = rootTreeSha;
    for (const file of preparedPaths) {
      // If tree becomes null mid-operation, all subsequent files are implicitly removed
      if (currentTreeSha === null) {
        throw BareGitClientError.operationFailed(
          'removeManyFiles',
          `Tree became empty after removing previous files, cannot remove ${file.filePath}`
        );
      }

      currentTreeSha = await removeFileFromTree(
        gitdir,
        currentTreeSha,
        file.pathParts
      );
    }

    // Build author
    const author = buildAuthor(
      validated.author ?? {
        name: client.userName,
        email: client.userEmail,
      }
    );

    // Create commit message
    const commitMessage = validated.commitMessage ?? 
      `Remove ${validated.filePaths.length} file${validated.filePaths.length === 1 ? '' : 's'}`;

    // If tree is null, we need a special empty tree
    const finalTreeSha = currentTreeSha ?? await git.writeTree({ fs, gitdir, tree: [] });

    // Create commit
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
      treeSha: currentTreeSha,
      filesRemoved: validated.filePaths.length,
    };
  } catch (error) {
    if (error instanceof BareGitClientError) {
      throw error;
    }
    throw BareGitClientError.operationFailed(
      'removeManyFiles',
      error instanceof Error ? error.message : String(error)
    );
  }
}
