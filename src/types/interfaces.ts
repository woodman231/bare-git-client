import type {
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
  removeFile(input: RemoveFileInput): Promise<RemoveFileResult>;
  readFile(input: ReadFileInput): Promise<ReadFileResult>;
  listFiles(input?: ListFilesInput): Promise<ListFilesResult>;
  createBranch(input: CreateBranchInput): Promise<CreateBranchResult>;
  removeBranch(input: RemoveBranchInput): Promise<RemoveBranchResult>;
  listBranches(): Promise<ListBranchesResult>;
  mergeBranches(input: MergeBranchesInput): Promise<MergeBranchesResult>;
  runGC(input?: RunGCInput): Promise<RunGCResult>;
}
