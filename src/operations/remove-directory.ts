import fs from 'fs';
import git from 'isomorphic-git';
import path from 'path';
import { type IBareGitClient } from '../types/interfaces.js';
import {
  RemoveDirectoryInputSchema,
  type RemoveDirectoryInput,
  type RemoveDirectoryResult,
} from '../schemas/index.js';
import { buildAuthor } from '../utils/author-builder.js';
import { normalizeRef } from '../utils/ref-resolver.js';
import { resolvePath, removeDirectoryFromTree, countFilesInTree } from '../utils/tree-walker.js';
import { compareAndSwap } from '../utils/concurrency.js';
import { BareGitClientError } from '../errors/BareGitClientError.js';

/**
 * Remove a directory and all its contents from a branch
 * 
 * @param client - The BareGitClient instance
 * @param input - Directory path and target branch
 * @returns Commit information and count of files removed
 * @throws {BareGitClientError} With code INVALID_PATH if path is root directory, contains invalid segments (`.` or `..`), or points to a file instead of a directory
 * @throws {BareGitClientError} With code NOT_FOUND if directory does not exist
 * @throws {BareGitClientError} With code CONCURRENCY_ERROR if branch was modified by another operation
 */
export async function removeDirectory(
  client: IBareGitClient,
  input: RemoveDirectoryInput
): Promise<RemoveDirectoryResult> {
  // Validate input
  const validated = RemoveDirectoryInputSchema.parse(input);
  const gitdir = path.resolve(client.repoPath);
  const ref = normalizeRef(validated.ref);

  try {
    // Validate and normalize directory path
    let dirPath = validated.directoryPath.trim();

    // Check for empty path after trimming
    if (dirPath === '') {
      throw BareGitClientError.invalidPath(
        validated.directoryPath,
        'Directory path cannot be empty or whitespace only'
      );
    }

    // Check for root directory references
    if (dirPath === '.' || dirPath === '..') {
      throw BareGitClientError.invalidPath(
        validated.directoryPath,
        `Directory path cannot be '${dirPath}'`
      );
    }

    // Normalize consecutive slashes
    dirPath = dirPath.replace(/\/+/g, '/');

    // Strip leading and trailing slashes
    dirPath = dirPath.replace(/^\/+|\/+$/g, '');

    // Check again after normalization - this is the root directory check
    if (dirPath === '') {
      throw BareGitClientError.invalidPath(
        validated.directoryPath,
        'Cannot remove root directory'
      );
    }

    // Split into segments and validate each
    const segments = dirPath.split('/');
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      if (segment === '') {
        throw BareGitClientError.invalidPath(
          validated.directoryPath,
          'Directory path contains empty segments'
        );
      }

      if (segment === '.') {
        throw BareGitClientError.invalidPath(
          validated.directoryPath,
          `Directory path contains '.' segment at position ${i + 1}`
        );
      }

      if (segment === '..') {
        throw BareGitClientError.invalidPath(
          validated.directoryPath,
          `Directory path contains '..' segment at position ${i + 1}`
        );
      }
    }

    // Resolve parent commit
    const parentSha = await git.resolveRef({ fs, gitdir, ref });

    // Get root tree SHA
    const commit = await git.readCommit({ fs, gitdir, oid: parentSha });
    const rootTreeSha = commit.commit.tree;

    // Verify the path exists and is a directory
    const target = await resolvePath(gitdir, rootTreeSha, dirPath);
    
    if (target.type !== 'tree') {
      throw BareGitClientError.invalidPath(
        dirPath,
        'Path points to a file, not a directory'
      );
    }

    // Count files before removal
    const filesRemoved = await countFilesInTree(gitdir, target.sha);

    // Split path for tree operations
    const pathParts = dirPath.split('/').filter(Boolean);

    // Remove directory from tree (may return null if tree becomes empty)
    const newTreeSha = await removeDirectoryFromTree(gitdir, rootTreeSha, pathParts);

    // Build author
    const author = buildAuthor(
      validated.author ?? {
        name: client.userName,
        email: client.userEmail,
      }
    );

    // Create commit
    const commitMessage = validated.commitMessage ?? `Remove directory ${dirPath}`;
    
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
      filesRemoved,
    };
  } catch (error) {
    if (error instanceof BareGitClientError) {
      throw error;
    }
    throw BareGitClientError.operationFailed(
      'removeDirectory',
      error instanceof Error ? error.message : String(error)
    );
  }
}
