import type {
  CreateBareInput,
  CreateBareResult,
  AddFileInput,
  AddFileResult,
  AddManyFilesInput,
  AddManyFilesResult,
  AddPlaceholderInput,
  RemoveFileInput,
  RemoveFileResult,
  RemoveManyFilesInput,
  RemoveManyFilesResult,
  RemoveDirectoryInput,
  RemoveDirectoryResult,
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
} from '../schemas/index.js';

/**
 * Interface for the BareGitClient
 * Contains the repository path and user information required for Git operations
 */
export interface IBareGitClient {
  readonly repoPath: string;
  readonly userName: string;
  readonly userEmail: string;

  createBare(input?: CreateBareInput): Promise<CreateBareResult>;
  addFile(input: AddFileInput): Promise<AddFileResult>;
  addManyFiles(input: AddManyFilesInput): Promise<AddManyFilesResult>;
  addPlaceholder(input: AddPlaceholderInput): Promise<AddFileResult>;
  createDirectory(input: AddPlaceholderInput): Promise<AddFileResult>;
  removeFile(input: RemoveFileInput): Promise<RemoveFileResult>;
  removeManyFiles(input: RemoveManyFilesInput): Promise<RemoveManyFilesResult>;
  removeDirectory(input: RemoveDirectoryInput): Promise<RemoveDirectoryResult>;
  readFile(input: ReadFileInput): Promise<ReadFileResult>;
  getFileDetails(input: GetFileDetailsInput): Promise<GetFileDetailsResult>;
  listFiles(input?: ListFilesInput): Promise<ListFilesResult>;
  createBranch(input: CreateBranchInput): Promise<CreateBranchResult>;
  removeBranch(input: RemoveBranchInput): Promise<RemoveBranchResult>;
  listBranches(): Promise<ListBranchesResult>;
  mergeBranches(input: MergeBranchesInput): Promise<MergeBranchesResult>;
  runGC(input?: RunGCInput): Promise<RunGCResult>;
}
