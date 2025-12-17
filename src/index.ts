// Main export
export { BareGitClient } from './BareGitClient.js';
export { BareGitClient as default } from './BareGitClient.js';

// Error handling
export { BareGitClientError, ErrorCodes } from './errors/BareGitClientError.js';
export type { ErrorCode } from './errors/BareGitClientError.js';

// Types and interfaces
export type {
  IBareGitClient,
  Author,
  Reference,
  FileEntry,
  Encoding,
  CreateBareInput,
  CreateBareResult,
  AddFileInput,
  AddFileResult,
  RemoveFileInput,
  RemoveFileResult,
  ReadFileInput,
  ReadFileResult,
  GetFileDetailsInput,
  GetFileDetailsResult,
  ListFilesInput,
  ListFilesResult,
  CreateBranchInput,
  CreateBranchResult,
  RemoveBranchInput,
  RemoveBranchResult,
  ListBranchesResult,
  MergeBranchesInput,
  MergeBranchesResult,
  RunGCInput,
  RunGCResult,
} from './types/index.js';

// Zod schemas for runtime validation
export {
  AuthorSchema,
  ReferenceSchema,
  FileEntrySchema,
  EncodingSchema,
  CreateBareInputSchema,
  CreateBareResultSchema,
  AddFileInputSchema,
  AddFileResultSchema,
  RemoveFileInputSchema,
  RemoveFileResultSchema,
  ReadFileInputSchema,
  ReadFileResultSchema,
  GetFileDetailsInputSchema,
  GetFileDetailsResultSchema,
  ListFilesInputSchema,
  ListFilesResultSchema,
  CreateBranchInputSchema,
  CreateBranchResultSchema,
  RemoveBranchInputSchema,
  RemoveBranchResultSchema,
  ListBranchesResultSchema,
  MergeBranchesInputSchema,
  MergeBranchesResultSchema,
  RunGCInputSchema,
  RunGCResultSchema,
} from './schemas/index.js';
