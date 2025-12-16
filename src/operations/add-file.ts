import fs from 'fs';
import git from 'isomorphic-git';
import path from 'path';
import { type IBareGitClient } from '../types/interfaces.js';
import {
  AddFileInputSchema,
  type AddFileInput,
  type AddFileResult,
} from '../schemas/index.js';
import { buildAuthor } from '../utils/author-builder.js';
import { normalizeRef } from '../utils/ref-resolver.js';
import { upsertFileInTree } from '../utils/tree-walker.js';
import { compareAndSwap } from '../utils/concurrency.js';
import { BareGitClientError } from '../errors/BareGitClientError.js';

/**
 * Add or update a file in a branch
 */
export async function addFile(
  client: IBareGitClient,
  input: AddFileInput
): Promise<AddFileResult> {
  // Validate input
  const validated = AddFileInputSchema.parse(input);
  const gitdir = path.resolve(client.repoPath);
  const ref = normalizeRef(validated.ref);

  try {
    // Resolve parent commit
    let parentSha: string | null = null;
    try {
      parentSha = await git.resolveRef({ fs, gitdir, ref });
    } catch {
      // Ref doesn't exist - will create root commit
      parentSha = null;
    }

    // Get root tree SHA
    let rootTreeSha: string | null = null;
    if (parentSha) {
      const commit = await git.readCommit({ fs, gitdir, oid: parentSha });
      rootTreeSha = commit.commit.tree;
    }

    // Convert content to Uint8Array
    let contentBuffer: Uint8Array;
    if (typeof validated.content === 'string') {
      contentBuffer = new Uint8Array(Buffer.from(validated.content));
    } else if (validated.content instanceof Buffer) {
      contentBuffer = new Uint8Array(validated.content);
    } else {
      contentBuffer = validated.content;
    }

    // Create blob
    const blobSha = await git.writeBlob({
      fs,
      gitdir,
      blob: contentBuffer,
    });

    // Clean and split file path
    const cleanPath = validated.filePath.replace(/^\/+|\/+$/g, '');
    const pathParts = cleanPath.split('/').filter(Boolean);

    if (pathParts.length === 0) {
      throw BareGitClientError.invalidPath(validated.filePath, 'Path cannot be empty');
    }

    // Upsert file into tree
    const newTreeSha = await upsertFileInTree(gitdir, rootTreeSha, pathParts, blobSha);

    // Build author
    const author = buildAuthor(
      validated.author ?? {
        name: client.userName,
        email: client.userEmail,
      }
    );

    // Create commit
    const commitMessage = validated.commitMessage ?? `Add ${validated.filePath}`;
    const commitSha = await git.writeCommit({
      fs,
      gitdir,
      commit: {
        message: commitMessage,
        tree: newTreeSha,
        parent: parentSha ? [parentSha] : [],
        author,
        committer: author,
      },
    });

    // Update reference with concurrency check
    await compareAndSwap(gitdir, ref, parentSha, commitSha);

    return {
      commitSha,
      treeSha: newTreeSha,
      blobSha,
    };
  } catch (error) {
    if (error instanceof BareGitClientError) {
      throw error;
    }
    throw BareGitClientError.operationFailed(
      'addFile',
      error instanceof Error ? error.message : String(error)
    );
  }
}
