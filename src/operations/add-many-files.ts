import fs from 'fs';
import git from 'isomorphic-git';
import path from 'path';
import { type IBareGitClient } from '../types/interfaces.js';
import {
  AddManyFilesInputSchema,
  type AddManyFilesInput,
  type AddManyFilesResult,
} from '../schemas/index.js';
import { buildAuthor } from '../utils/author-builder.js';
import { normalizeRef } from '../utils/ref-resolver.js';
import { upsertFileInTree } from '../utils/tree-walker.js';
import { compareAndSwap } from '../utils/concurrency.js';
import { BareGitClientError } from '../errors/BareGitClientError.js';

/**
 * Add or update many files in a single commit
 */
export async function addManyFiles(
  client: IBareGitClient,
  input: AddManyFilesInput
): Promise<AddManyFilesResult> {
  // Validate input
  const validated = AddManyFilesInputSchema.parse(input);
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

    // Process all files: convert content and create blobs in parallel
    const fileProcessingPromises = validated.files.map(async (file) => {
      // Convert content to Uint8Array
      let contentBuffer: Uint8Array;
      if (typeof file.content === 'string') {
        contentBuffer = new Uint8Array(Buffer.from(file.content));
      } else if (file.content instanceof Buffer) {
        contentBuffer = new Uint8Array(file.content);
      } else {
        contentBuffer = file.content;
      }

      // Create blob
      const blobSha = await git.writeBlob({
        fs,
        gitdir,
        blob: contentBuffer,
      });

      // Clean and split file path
      const cleanPath = file.filePath.replace(/^\/+|\/+$/g, '');
      const pathParts = cleanPath.split('/').filter(Boolean);

      if (pathParts.length === 0) {
        throw BareGitClientError.invalidPath(file.filePath, 'Path cannot be empty');
      }

      return {
        filePath: file.filePath,
        blobSha,
        pathParts,
      };
    });

    // Wait for all blobs to be created
    const processedFiles = await Promise.all(fileProcessingPromises);

    // Sequentially update tree for each file, chaining the tree SHA
    let currentTreeSha: string = rootTreeSha!;
    for (const file of processedFiles) {
      currentTreeSha = await upsertFileInTree(
        gitdir,
        currentTreeSha,
        file.pathParts,
        file.blobSha
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
      `Add ${validated.files.length} file${validated.files.length === 1 ? '' : 's'}`;

    // Create commit
    const commitSha = await git.writeCommit({
      fs,
      gitdir,
      commit: {
        message: commitMessage,
        tree: currentTreeSha,
        parent: parentSha ? [parentSha] : [],
        author,
        committer: author,
      },
    });

    // Update reference with concurrency check
    await compareAndSwap(gitdir, ref, parentSha, commitSha);

    return {
      commitSha,
      treeSha: currentTreeSha,
      blobShas: processedFiles.map(file => ({
        filePath: file.filePath,
        blobSha: file.blobSha,
      })),
    };
  } catch (error) {
    if (error instanceof BareGitClientError) {
      throw error;
    }
    throw BareGitClientError.operationFailed(
      'addManyFiles',
      error instanceof Error ? error.message : String(error)
    );
  }
}
