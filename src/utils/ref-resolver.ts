/**
 * Normalize a Git reference to the full refs/heads/ format
 * Handles both "main" and "refs/heads/main" formats
 */
export function normalizeRef(ref: string): string {
  if (ref === 'HEAD') return ref;
  if (ref.startsWith('refs/')) return ref;
  return `refs/heads/${ref}`;
}

/**
 * Extract the branch name from a full reference
 * "refs/heads/main" -> "main"
 */
export function getBranchName(ref: string): string {
  if (ref.startsWith('refs/heads/')) {
    return ref.slice('refs/heads/'.length);
  }
  return ref;
}
