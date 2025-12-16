import fs from 'fs';
import git from 'isomorphic-git';
import path from 'path';
import { type IBareGitClient } from '../types/interfaces.js';
import {
  CreateBranchInputSchema,
  type CreateBranchInput,
  type CreateBranchResult,
} from '../schemas/index.js';
import { normalizeRef } from '../utils/ref-resolver.js';
import { BareGitClientError } from '../errors/BareGitClientError.js';

/**
 * Create a new branch from an existing commit
 */
export async function createBranch(
  client: IBareGitClient,
  input: CreateBranchInput
): Promise<CreateBranchResult> {
  // Validate input
  const validated = CreateBranchInputSchema.parse(input);
  const gitdir = path.resolve(client.repoPath);

  try {
    // Determine source ref
    const sourceRef = validated.sourceBranch 
      ? normalizeRef(validated.sourceBranch)
      : 'HEAD';

    // Resolve source commit SHA
    let sourceSha: string;
    try {
      sourceSha = await git.resolveRef({ fs, gitdir, ref: sourceRef });
    } catch {
      throw BareGitClientError.notFound(
        'Source branch',
        `'${validated.sourceBranch ?? 'HEAD'}' does not exist`
      );
    }

    // Normalize new branch name
    const newRef = normalizeRef(validated.branchName);

    // Write the new branch reference
    try {
      await git.writeRef({
        fs,
        gitdir,
        ref: newRef,
        value: sourceSha,
        force: validated.force,
      });

      return {
        branchName: validated.branchName,
        commitSha: sourceSha,
      };
    } catch (error: unknown) {
      // Check if branch already exists
      if (error && typeof error === 'object' && 'code' in error && error.code === 'AlreadyExistsError') {
        throw BareGitClientError.alreadyExists('Branch', validated.branchName);
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof BareGitClientError) {
      throw error;
    }
    throw BareGitClientError.operationFailed(
      'createBranch',
      error instanceof Error ? error.message : String(error)
    );
  }
}
