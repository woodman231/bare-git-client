import { type IBareGitClient } from '../types/interfaces.js';
import {
  AddFileInputSchema,
  type AddFileInput,
  type AddFileResult,
} from '../schemas/index.js';
import { addManyFiles } from './add-many-files.js';

/**
 * Add or update a file in a branch
 * 
 * This is a convenience wrapper around addManyFiles that handles a single file.
 */
export async function addFile(
  client: IBareGitClient,
  input: AddFileInput
): Promise<AddFileResult> {
  // Validate input
  const validated = AddFileInputSchema.parse(input);

  // Delegate to addManyFiles with single file
  const result = await addManyFiles(client, {
    ref: validated.ref,
    files: [{
      filePath: validated.filePath,
      content: validated.content,
    }],
    commitMessage: validated.commitMessage,
    author: validated.author,
  });

  // Extract the single blob SHA (safe due to schema validation requiring at least one file)
  return {
    commitSha: result.commitSha,
    treeSha: result.treeSha,
    blobSha: result.blobShas[0]!.blobSha,
  };
}
