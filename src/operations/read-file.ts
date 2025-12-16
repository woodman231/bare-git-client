import fs from 'fs';
import git from 'isomorphic-git';
import path from 'path';
import { type IBareGitClient } from '../types/interfaces.js';
import {
  ReadFileInputSchema,
  type ReadFileInput,
  type ReadFileResult,
} from '../schemas/index.js';
import { resolvePath } from '../utils/tree-walker.js';
import { isBinaryBuffer } from '../utils/binary-detection.js';
import { BareGitClientError } from '../errors/BareGitClientError.js';

/**
 * Read a file from a commit/branch
 */
export async function readFile(
  client: IBareGitClient,
  input: ReadFileInput
): Promise<ReadFileResult> {
  // Validate input with defaults
  const validated = ReadFileInputSchema.parse(input);
  const gitdir = path.resolve(client.repoPath);

  try {
    // Resolve commit
    const commitSha = await git.resolveRef({ fs, gitdir, ref: validated.ref });

    // Get root tree
    const commit = await git.readCommit({ fs, gitdir, oid: commitSha });
    const rootTreeSha = commit.commit.tree;

    // Find the file
    const target = await resolvePath(gitdir, rootTreeSha, validated.filePath);

    // Validate it's a file
    if (target.type !== 'blob') {
      throw BareGitClientError.invalidPath(
        validated.filePath,
        `Path points to a ${target.type}, not a file`
      );
    }

    // Validate file mode
    if (target.mode !== '100644' && target.mode !== '100755') {
      // Not a standard file mode, but continue anyway
    }

    // Read blob content
    const { blob } = await git.readBlob({
      fs,
      gitdir,
      oid: target.sha,
    });

    // Handle encoding
    let content: string | Buffer;
    
    if (validated.encoding === 'buffer') {
      content = Buffer.from(blob);
    } else if (validated.encoding === 'utf8') {
      content = Buffer.from(blob).toString('utf8');
    } else {
      // Auto-detect: check if binary
      if (isBinaryBuffer(blob)) {
        content = Buffer.from(blob);
      } else {
        content = Buffer.from(blob).toString('utf8');
      }
    }

    return {
      content,
      mode: target.mode,
      oid: target.sha,
    };
  } catch (error) {
    if (error instanceof BareGitClientError) {
      throw error;
    }
    throw BareGitClientError.operationFailed(
      'readFile',
      error instanceof Error ? error.message : String(error)
    );
  }
}
