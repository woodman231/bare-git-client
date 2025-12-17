import fs from 'fs';
import git from 'isomorphic-git';
import { BareGitClientError } from '../errors/BareGitClientError.js';

interface TreeEntry {
  mode: string;
  path: string;
  oid: string;
  type: 'blob' | 'tree';
}

// Filter helper to exclude commit types from isomorphic-git tree entries
function filterTreeEntries(entries: any[]): TreeEntry[] {
  return entries.filter(e => e.type !== 'commit').map(e => ({
    mode: e.mode,
    path: e.path,
    oid: e.oid,
    type: e.type as 'blob' | 'tree',
  }));
}

/**
 * Recursively walk to a target path in a tree and return the blob/tree entry
 */
export async function resolvePath(
  gitdir: string,
  rootTreeSha: string,
  targetPath: string
): Promise<{ sha: string; mode: string; type: 'blob' | 'tree' }> {
  const parts = targetPath.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  
  if (parts.length === 0) {
    return { sha: rootTreeSha, mode: '040000', type: 'tree' };
  }

  let currentSha = rootTreeSha;
  let mode = '040000';
  let type: 'blob' | 'tree' = 'tree';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // Validate we're still in a tree
    if (type !== 'tree') {
      throw BareGitClientError.invalidPath(
        targetPath,
        `'${parts[i - 1]}' is a file, not a directory`
      );
    }

    // Read the current tree
    const result = await git.readTree({ fs, gitdir, oid: currentSha });
    const entries = filterTreeEntries(result.tree);
    const entry = entries.find(e => e.path === part);

    if (!entry) {
      throw BareGitClientError.notFound(
        'Path',
        `'${targetPath}' not found (missing '${part}')`
      );
    }

    currentSha = entry.oid;
    type = entry.type;
    mode = entry.mode;
  }

  return { sha: currentSha, mode, type };
}

/**
 * Recursively upsert a file into a tree structure
 * Walks down path parts and reconstructs trees with new child
 */
export async function upsertFileInTree(
  gitdir: string,
  parentTreeSha: string | null,
  pathParts: string[],
  fileBlobSha: string
): Promise<string> {
  const [currentPart, ...remainingParts] = pathParts;

  // Read existing entries
  let entries: TreeEntry[] = [];
  if (parentTreeSha) {
    const result = await git.readTree({ fs, gitdir, oid: parentTreeSha });
    entries = filterTreeEntries(result.tree);
  }

  // Remove existing entry for current part (we'll replace it)
  entries = entries.filter(e => e.path !== currentPart);

  if (remainingParts.length === 0) {
    // Base case: we're at the file level
    entries.push({
      mode: '100644',
      path: currentPart!,
      oid: fileBlobSha,
      type: 'blob',
    });
  } else {
    // Recursive case: we're at a folder level
    const existingEntry = parentTreeSha
      ? (await git.readTree({ fs, gitdir, oid: parentTreeSha })).tree.find(
          e => e.path === currentPart
        )
      : null;

    const existingSubTreeSha = existingEntry?.oid ?? null;

    // Recurse down
    const newSubTreeSha = await upsertFileInTree(
      gitdir,
      existingSubTreeSha,
      remainingParts,
      fileBlobSha
    );

    entries.push({
      mode: '040000',
      path: currentPart!,
      oid: newSubTreeSha,
      type: 'tree',
    });
  }

  // Write the modified tree
  return await git.writeTree({ fs, gitdir, tree: entries });
}

/**
 * Recursively remove a file from a tree structure
 * Returns null if tree becomes empty (signals parent to prune)
 */
export async function removeFileFromTree(
  gitdir: string,
  parentTreeSha: string | null,
  pathParts: string[]
): Promise<string | null> {
  if (!parentTreeSha) {
    throw BareGitClientError.notFound('File', 'Parent tree does not exist');
  }

  const [currentPart, ...remainingParts] = pathParts;

  // Read existing entries
  const result = await git.readTree({ fs, gitdir, oid: parentTreeSha });
  let entries: TreeEntry[] = filterTreeEntries(result.tree);

  if (remainingParts.length === 0) {
    // Base case: remove the file
    const fileExists = entries.some(e => e.path === currentPart);
    if (!fileExists) {
      throw BareGitClientError.notFound('File', currentPart);
    }

    entries = entries.filter(e => e.path !== currentPart);
  } else {
    // Recursive case: descend into subtree
    const existingEntry = entries.find(e => e.path === currentPart);
    if (!existingEntry || existingEntry.type !== 'tree') {
      throw BareGitClientError.notFound('Path', currentPart);
    }

    const newSubTreeSha = await removeFileFromTree(
      gitdir,
      existingEntry.oid,
      remainingParts
    );

    // Remove existing entry
    entries = entries.filter(e => e.path !== currentPart);

    // Add back the subtree if it's not empty
    if (newSubTreeSha !== null) {
      entries.push({
        mode: '040000',
        path: currentPart!,
        oid: newSubTreeSha,
        type: 'tree',
      });
    }
  }

  // If tree is now empty, return null to signal parent to prune
  if (entries.length === 0) {
    return null;
  }

  // Write the modified tree
  return await git.writeTree({ fs, gitdir, tree: entries });
}

/**
 * Read entries from a tree (returns empty Map if tree doesn't exist)
 */
export async function readTreeEntries(
  gitdir: string,
  treeSha: string | null
): Promise<Map<string, TreeEntry>> {
  if (!treeSha) return new Map();
  
  const result = await git.readTree({ fs, gitdir, oid: treeSha });
  const entries = filterTreeEntries(result.tree);
  return new Map(entries.map(e => [e.path, e]));
}

/**
 * Recursively count all blob files in a tree
 * Returns the total number of files (blobs) in the tree and all subtrees
 */
export async function countFilesInTree(
  gitdir: string,
  treeSha: string
): Promise<number> {
  const result = await git.readTree({ fs, gitdir, oid: treeSha });
  const entries = filterTreeEntries(result.tree);
  
  let count = 0;
  
  for (const entry of entries) {
    if (entry.type === 'blob') {
      count++;
    } else if (entry.type === 'tree') {
      // Recursively count files in subtree
      count += await countFilesInTree(gitdir, entry.oid);
    }
  }
  
  return count;
}

/**
 * Recursively remove a directory from a tree structure
 * Returns null if tree becomes empty (signals parent to prune)
 */
export async function removeDirectoryFromTree(
  gitdir: string,
  parentTreeSha: string | null,
  pathParts: string[]
): Promise<string | null> {
  if (!parentTreeSha) {
    throw BareGitClientError.notFound('Directory', 'Parent tree does not exist');
  }

  const [currentPart, ...remainingParts] = pathParts;

  // Read existing entries
  const result = await git.readTree({ fs, gitdir, oid: parentTreeSha });
  let entries: TreeEntry[] = filterTreeEntries(result.tree);

  if (remainingParts.length === 0) {
    // Base case: remove the directory
    const dirExists = entries.some(e => e.path === currentPart);
    if (!dirExists) {
      throw BareGitClientError.notFound('Directory', currentPart);
    }

    entries = entries.filter(e => e.path !== currentPart);
  } else {
    // Recursive case: descend into subtree
    const existingEntry = entries.find(e => e.path === currentPart);
    if (!existingEntry || existingEntry.type !== 'tree') {
      throw BareGitClientError.notFound('Path', currentPart);
    }

    const newSubTreeSha = await removeDirectoryFromTree(
      gitdir,
      existingEntry.oid,
      remainingParts
    );

    // Remove existing entry
    entries = entries.filter(e => e.path !== currentPart);

    // Add back the subtree if it's not empty
    if (newSubTreeSha !== null) {
      entries.push({
        mode: '040000',
        path: currentPart!,
        oid: newSubTreeSha,
        type: 'tree',
      });
    }
  }

  // If tree is now empty, return null to signal parent to prune
  if (entries.length === 0) {
    return null;
  }

  // Write the modified tree
  return await git.writeTree({ fs, gitdir, tree: entries });
}
