import fs from 'fs';
import git from 'isomorphic-git';
import path from 'path';
import { type IBareGitClient } from '../types/interfaces.js';
import {
  MergeBranchesInputSchema,
  type MergeBranchesInput,
  type MergeBranchesResult,
} from '../schemas/index.js';
import { buildAuthor } from '../utils/author-builder.js';
import { normalizeRef } from '../utils/ref-resolver.js';
import { readTreeEntries } from '../utils/tree-walker.js';
import { BareGitClientError } from '../errors/BareGitClientError.js';

interface TreeEntry {
  mode: string;
  path: string;
  oid: string;
  type: 'blob' | 'tree';
}

/**
 * Perform 3-way merge of trees with conflict resolution
 */
async function mergeTrees(
  gitdir: string,
  baseTreeSha: string | null,
  ourTreeSha: string | null,
  theirTreeSha: string | null,
  resolutions: Record<string, string>
): Promise<{ treeSha: string | null; conflicts: string[] }> {
  const baseEntries = await readTreeEntries(gitdir, baseTreeSha);
  const ourEntries = await readTreeEntries(gitdir, ourTreeSha);
  const theirEntries = await readTreeEntries(gitdir, theirTreeSha);

  const allPaths = new Set([
    ...baseEntries.keys(),
    ...ourEntries.keys(),
    ...theirEntries.keys(),
  ]);

  const newEntries: TreeEntry[] = [];
  const conflicts: string[] = [];

  for (const p of allPaths) {
    const base = baseEntries.get(p);
    const ours = ourEntries.get(p);
    const theirs = theirEntries.get(p);

    const baseSha = base?.oid ?? null;
    const ourSha = ours?.oid ?? null;
    const theirSha = theirs?.oid ?? null;

    // Handle directories recursively
    const isDir = (ours && ours.type === 'tree') || (theirs && theirs.type === 'tree');
    if (isDir) {
      const result = await mergeTrees(gitdir, baseSha, ourSha, theirSha, resolutions);
      if (result.treeSha) {
        newEntries.push({
          mode: '040000',
          path: p,
          oid: result.treeSha,
          type: 'tree',
        });
      }
      conflicts.push(...result.conflicts);
      continue;
    }

    // Merge file blobs
    if (ourSha === theirSha) {
      // Both sides are the same
      if (ours) newEntries.push(ours);
    } else if (ourSha === baseSha && theirSha !== baseSha) {
      // Only theirs changed
      if (theirs) newEntries.push(theirs);
    } else if (ourSha !== baseSha && theirSha === baseSha) {
      // Only ours changed
      if (ours) newEntries.push(ours);
    } else {
      // Conflict: both sides changed differently
      if (resolutions[p]) {
        // Apply resolution
        const resolvedSha = await git.writeBlob({
          fs,
          gitdir,
          blob: new Uint8Array(Buffer.from(resolutions[p])),
        });

        newEntries.push({
          mode: '100644',
          path: p,
          oid: resolvedSha,
          type: 'blob',
        });
      } else {
        // Track conflict
        conflicts.push(p);
      }
    }
  }

  if (conflicts.length > 0 && Object.keys(resolutions).length === 0) {
    // Don't write tree if there are unresolved conflicts
    return { treeSha: null, conflicts };
  }

  if (newEntries.length === 0) {
    return { treeSha: null, conflicts };
  }

  const treeSha = await git.writeTree({ fs, gitdir, tree: newEntries });
  return { treeSha, conflicts };
}

/**
 * Merge two branches with optional conflict resolution
 */
export async function mergeBranches(
  client: IBareGitClient,
  input: MergeBranchesInput
): Promise<MergeBranchesResult> {
  // Validate input
  const validated = MergeBranchesInputSchema.parse(input);
  const gitdir = path.resolve(client.repoPath);

  try {
    // Normalize refs
    const sourceRef = normalizeRef(validated.sourceBranch);
    const destRef = normalizeRef(validated.destinationBranch);

    // Resolve branch SHAs
    const sourceSha = await git.resolveRef({ fs, gitdir, ref: sourceRef });
    const destSha = await git.resolveRef({ fs, gitdir, ref: destRef });

    // Find merge base
    const mergeBases = await git.findMergeBase({
      fs,
      gitdir,
      oids: [destSha, sourceSha],
    });

    if (mergeBases.length === 0) {
      throw BareGitClientError.operationFailed(
        'mergeBranches',
        'No common ancestor found between branches'
      );
    }

    const baseSha = mergeBases[0];

    // Read commit trees
    const baseCommit = await git.readCommit({ fs, gitdir, oid: baseSha });
    const sourceCommit = await git.readCommit({ fs, gitdir, oid: sourceSha });
    const destCommit = await git.readCommit({ fs, gitdir, oid: destSha });

    // Perform 3-way merge
    const result = await mergeTrees(
      gitdir,
      baseCommit.commit.tree,
      destCommit.commit.tree,
      sourceCommit.commit.tree,
      validated.resolutions ?? {}
    );

    // Check for unresolved conflicts
    if (result.conflicts.length > 0 && !validated.resolutions) {
      throw BareGitClientError.mergeConflict(result.conflicts);
    }

    if (!result.treeSha) {
      throw BareGitClientError.operationFailed(
        'mergeBranches',
        'Merge resulted in empty tree'
      );
    }

    // Build author
    const author = buildAuthor(
      validated.author ?? {
        name: client.userName,
        email: client.userEmail,
      }
    );

    // Create merge commit
    const commitMessage =
      validated.commitMessage ??
      `Merge branch '${validated.sourceBranch}' into '${validated.destinationBranch}'`;

    const mergeCommitSha = await git.writeCommit({
      fs,
      gitdir,
      commit: {
        message: commitMessage,
        tree: result.treeSha,
        parent: [destSha, sourceSha],
        author,
        committer: author,
      },
    });

    // Update destination branch reference
    await git.writeRef({
      fs,
      gitdir,
      ref: destRef,
      value: mergeCommitSha,
      force: true,
    });

    return {
      commitSha: mergeCommitSha,
      treeSha: result.treeSha,
      conflicts: result.conflicts.length > 0 ? result.conflicts : undefined,
    };
  } catch (error) {
    if (error instanceof BareGitClientError) {
      throw error;
    }
    throw BareGitClientError.operationFailed(
      'mergeBranches',
      error instanceof Error ? error.message : String(error)
    );
  }
}
