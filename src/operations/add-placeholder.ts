import { type IBareGitClient } from '../types/interfaces.js';
import {
  AddPlaceholderInputSchema,
  type AddPlaceholderInput,
  type AddFileResult,
} from '../schemas/index.js';
import { addFile } from './add-file.js';
import { BareGitClientError } from '../errors/BareGitClientError.js';

/**
 * Placeholder file content explaining its purpose
 */
const PLACEHOLDER_CONTENT = `# Placeholder file to preserve directory structure
# Safe to delete once other files exist in this directory
`;

/**
 * Add a placeholder file to create a directory structure
 * 
 * Git cannot store empty directories, so this creates a placeholder file
 * (typically .gitkeep) to force the directory structure to exist in the repository.
 */
export async function addPlaceholder(
  client: IBareGitClient,
  input: AddPlaceholderInput
): Promise<AddFileResult> {
  // Validate input
  const validated = AddPlaceholderInputSchema.parse(input);

  // Validate and normalize directory path
  let dirPath = validated.directoryPath.trim();

  // Check for empty path after trimming
  if (dirPath === '') {
    throw BareGitClientError.invalidPath(
      validated.directoryPath,
      'Directory path cannot be empty or whitespace only'
    );
  }

  // Check for root directory references
  if (dirPath === '.' || dirPath === '..') {
    throw BareGitClientError.invalidPath(
      validated.directoryPath,
      `Directory path cannot be '${dirPath}'`
    );
  }

  // Normalize consecutive slashes
  dirPath = dirPath.replace(/\/+/g, '/');

  // Strip leading and trailing slashes
  dirPath = dirPath.replace(/^\/+|\/+$/g, '');

  // Check again after normalization
  if (dirPath === '') {
    throw BareGitClientError.invalidPath(
      validated.directoryPath,
      'Directory path cannot be empty after normalization'
    );
  }

  // Split into segments and validate each
  const segments = dirPath.split('/');
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    if (segment === '') {
      throw BareGitClientError.invalidPath(
        validated.directoryPath,
        'Directory path contains empty segments'
      );
    }

    if (segment === '.') {
      throw BareGitClientError.invalidPath(
        validated.directoryPath,
        `Directory path contains '.' segment at position ${i + 1}`
      );
    }

    if (segment === '..') {
      throw BareGitClientError.invalidPath(
        validated.directoryPath,
        `Directory path contains '..' segment at position ${i + 1}`
      );
    }
  }

  // Construct full file path
  const filePath = `${dirPath}/${validated.placeholderFileName}`;

  // Default commit message
  const commitMessage = validated.commitMessage ?? `Add ${validated.placeholderFileName} to ${dirPath}`;

  // Call addFile with the placeholder
  return addFile(client, {
    ref: validated.ref,
    filePath,
    content: PLACEHOLDER_CONTENT,
    commitMessage,
    author: validated.author,
  });
}
