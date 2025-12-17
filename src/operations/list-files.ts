import fs from 'fs';
import git from 'isomorphic-git';
import path from 'path';
import { type IBareGitClient } from '../types/interfaces.js';
import {
  ListFilesInputSchema,
  type ListFilesInput,
  type ListFilesResult,
} from '../schemas/index.js';
import { resolvePath } from '../utils/tree-walker.js';
import { BareGitClientError } from '../errors/BareGitClientError.js';

/**
 * List files and folders at a specific path
 */
export async function listFiles(
  client: IBareGitClient,
  input?: Partial<ListFilesInput>
): Promise<ListFilesResult> {
  // Validate input with defaults
  const validated = ListFilesInputSchema.parse(input ?? {});
  const gitdir = path.resolve(client.repoPath);

  try {
    // Resolve commit
    const commitSha = await git.resolveRef({ fs, gitdir, ref: validated.ref });

    // Get root tree
    const commit = await git.readCommit({ fs, gitdir, oid: commitSha });
    const rootTreeSha = commit.commit.tree;

    // Navigate to target folder
    let targetTreeSha = rootTreeSha;
    
    if (validated.folderPath && validated.folderPath !== '') {
      const target = await resolvePath(gitdir, rootTreeSha, validated.folderPath);
      
      if (target.type !== 'tree') {
        throw BareGitClientError.invalidPath(
          validated.folderPath,
          'Path points to a file, not a folder'
        );
      }
      
      targetTreeSha = target.sha;
    }

    // Read tree entries
    const result = await git.readTree({ fs, gitdir, oid: targetTreeSha });

    return {
      entries: result.tree
        .filter(entry => entry.type !== 'commit')
        .map(entry => ({
          mode: entry.mode,
          type: entry.type as 'blob' | 'tree',
          oid: entry.oid,
          path: entry.path,
        }))
        .sort((a, b) => {
          // Group trees first, then blobs
          if (a.type !== b.type) {
            return a.type === 'tree' ? -1 : 1;
          }
          // Sort alphabetically within each group
          return a.path.localeCompare(b.path);
        }),
    };
  } catch (error) {
    if (error instanceof BareGitClientError) {
      throw error;
    }
    throw BareGitClientError.operationFailed(
      'listFiles',
      error instanceof Error ? error.message : String(error)
    );
  }
}
