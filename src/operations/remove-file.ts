import { type IBareGitClient } from '../types/interfaces.js';
import {
  RemoveFileInputSchema,
  type RemoveFileInput,
  type RemoveFileResult,
} from '../schemas/index.js';
import { removeManyFiles } from './remove-many-files.js';

/**
 * Remove a file from a branch
 * 
 * This is a convenience wrapper around removeManyFiles that handles a single file.
 */
export async function removeFile(
  client: IBareGitClient,
  input: RemoveFileInput
): Promise<RemoveFileResult> {
  // Validate input
  const validated = RemoveFileInputSchema.parse(input);

  // Delegate to removeManyFiles with single file
  const result = await removeManyFiles(client, {
    ref: validated.ref,
    filePaths: [validated.filePath],
    commitMessage: validated.commitMessage,
    author: validated.author,
  });

  // Return without filesRemoved count to maintain RemoveFileResult contract
  return {
    commitSha: result.commitSha,
    treeSha: result.treeSha,
  };
}
