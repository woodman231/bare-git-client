import fs from 'fs';
import git from 'isomorphic-git';
import path from 'path';
import { type IBareGitClient } from '../types/interfaces.js';
import {
  CreateBareInputSchema,
  type CreateBareInput,
  type CreateBareResult,
} from '../schemas/index.js';
import { buildAuthor } from '../utils/author-builder.js';
import { BareGitClientError } from '../errors/BareGitClientError.js';

/**
 * Create a bare Git repository with an initial commit
 */
export async function createBare(
  client: IBareGitClient,
  input?: Partial<CreateBareInput>
): Promise<CreateBareResult> {
  // Validate input
  const validated = CreateBareInputSchema.parse(input ?? {});
  const gitdir = path.resolve(client.repoPath);

  try {
    // Initialize bare repository
    await git.init({
      fs,
      gitdir,
      bare: true,
      defaultBranch: validated.defaultBranch,
    });

    // Create initial file content
    const fileContent = validated.initialFile?.content ?? 'Hello World\n';
    const fileName = validated.initialFile?.path ?? 'README.md';

    // Create blob
    const blobSha = await git.writeBlob({
      fs,
      gitdir,
      blob: new Uint8Array(Buffer.from(fileContent)),
    });

    // Create tree with single file
    const treeSha = await git.writeTree({
      fs,
      gitdir,
      tree: [{ mode: '100644', path: fileName, oid: blobSha, type: 'blob' }],
    });

    // Create author object
    const author = buildAuthor({
      name: client.userName,
      email: client.userEmail,
    });

    // Create initial commit
    const commitSha = await git.writeCommit({
      fs,
      gitdir,
      commit: {
        message: 'Initial commit',
        tree: treeSha,
        parent: [],
        author,
        committer: author,
      },
    });

    // Point the default branch to the commit
    await git.writeRef({
      fs,
      gitdir,
      ref: `refs/heads/${validated.defaultBranch}`,
      value: commitSha,
    });

    return {
      blobSha,
      treeSha,
      commitSha,
      branch: validated.defaultBranch,
    };
  } catch (error) {
    throw BareGitClientError.operationFailed(
      'createBare',
      error instanceof Error ? error.message : String(error)
    );
  }
}
