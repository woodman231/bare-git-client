// Re-export all schema types
export type {
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
} from '../schemas/index.js';

// Re-export interfaces
export type { IBareGitClient } from './interfaces.js';
