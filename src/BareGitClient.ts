import type { IBareGitClient } from './types/interfaces.js';
import type {
  CreateBareInput,
  CreateBareResult,
  AddFileInput,
  AddFileResult,
  AddPlaceholderInput,
  RemoveFileInput,
  RemoveFileResult,
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
} from './schemas/index.js';
import { BareGitClientError } from './errors/BareGitClientError.js';
import { createBare as createBareOp } from './operations/create-bare.js';
import { addFile as addFileOp } from './operations/add-file.js';
import { addPlaceholder as addPlaceholderOp } from './operations/add-placeholder.js';
import { removeFile as removeFileOp } from './operations/remove-file.js';
import { removeDirectory as removeDirectoryOp } from './operations/remove-directory.js';
import { readFile as readFileOp } from './operations/read-file.js';
import { getFileDetails as getFileDetailsOp } from './operations/get-file-details.js';
import { listFiles as listFilesOp } from './operations/list-files.js';
import { createBranch as createBranchOp } from './operations/create-branch.js';
import { removeBranch as removeBranchOp } from './operations/remove-branch.js';
import { listBranches as listBranchesOp } from './operations/list-branches.js';
import { mergeBranches as mergeBranchesOp } from './operations/merge-branches.js';
import { runGC as runGCOp } from './operations/run-gc.js';

/**
 * Main client for managing bare Git repositories
 * 
 * @example
 * ```typescript
 * const client = new BareGitClient(
 *   '/path/to/repo.git',
 *   'John Doe',
 *   'john@example.com'
 * );
 * 
 * await client.createBare();
 * await client.addFile({
 *   ref: 'main',
 *   filePath: 'src/index.ts',
 *   content: 'console.log("Hello");'
 * });
 * ```
 */
export class BareGitClient implements IBareGitClient {
  public readonly repoPath: string;
  public readonly userName: string;
  public readonly userEmail: string;

  /**
   * Create a new BareGitClient instance
   * 
   * @param repoPath - Absolute or relative path to the bare Git repository
   * @param userName - Git author name (no default provided)
   * @param userEmail - Git author email (no default provided)
   * @throws {BareGitClientError} If any parameter is empty or invalid
   */
  constructor(repoPath: string, userName: string, userEmail: string) {
    // Validate required parameters
    if (!repoPath || repoPath.trim() === '') {
      throw BareGitClientError.invalidInput('repoPath', 'Repository path is required');
    }
    if (!userName || userName.trim() === '') {
      throw BareGitClientError.invalidInput('userName', 'User name is required');
    }
    if (!userEmail || userEmail.trim() === '') {
      throw BareGitClientError.invalidInput('userEmail', 'User email is required');
    }

    this.repoPath = repoPath;
    this.userName = userName;
    this.userEmail = userEmail;
  }

  /**
   * Create a bare Git repository with an initial commit
   * 
   * @param input - Configuration for repository initialization
   * @returns Information about the created repository
   * 
   * @example
   * ```typescript
   * const result = await client.createBare({
   *   defaultBranch: 'main',
   *   initialFile: {
   *     path: 'README.md',
   *     content: '# My Project'
   *   }
   * });
   * console.log(result.commitSha);
   * ```
   */
  async createBare(input?: CreateBareInput): Promise<CreateBareResult> {
    return createBareOp(this, input);
  }

  /**
   * Add or update a file in a branch
   * 
   * @param input - File path, content, and target branch
   * @returns Commit and tree information
   * 
   * @example
   * ```typescript
   * await client.addFile({
   *   ref: 'main',
   *   filePath: 'src/utils/helper.ts',
   *   content: 'export const helper = () => {};',
   *   commitMessage: 'Add helper utility'
   * });
   * ```
   */
  async addFile(input: AddFileInput): Promise<AddFileResult> {
    return addFileOp(this, input);
  }

  /**
   * Add a placeholder file to create a directory structure
   * 
   * **Important:** Git cannot store empty directories. This method creates a placeholder
   * file (by default `.gitkeep`) to force the directory structure to exist in the repository.
   * The placeholder file contains a comment explaining that it's safe to delete once other
   * files exist in the directory.
   * 
   * @param input - Directory path, optional placeholder filename, and target branch
   * @returns Commit and tree information
   * 
   * @example
   * ```typescript
   * await client.addPlaceholder({
   *   ref: 'main',
   *   directoryPath: 'src/components',
   *   placeholderFileName: '.gitkeep', // optional, defaults to '.gitkeep'
   *   commitMessage: 'Create components directory'
   * });
   * ```
   */
  async addPlaceholder(input: AddPlaceholderInput): Promise<AddFileResult> {
    return addPlaceholderOp(this, input);
  }

  /**
   * Create a directory structure in the repository
   * 
   * **Note:** This is an alias for `addPlaceholder()`. Git cannot natively store empty
   * directories, so this method creates a placeholder file (`.gitkeep` by default) to
   * preserve the directory structure. The placeholder file includes a comment explaining
   * it can be safely deleted once other files are added to the directory.
   * 
   * @param input - Directory path, optional placeholder filename, and target branch
   * @returns Commit and tree information
   * 
   * @example
   * ```typescript
   * await client.createDirectory({
   *   ref: 'main',
   *   directoryPath: 'assets/images'
   * });
   * ```
   */
  async createDirectory(input: AddPlaceholderInput): Promise<AddFileResult> {
    return this.addPlaceholder(input);
  }

  /**
   * Remove a file from a branch
   * 
   * @param input - File path and target branch
   * @returns Commit information
   * 
   * @example
   * ```typescript
   * await client.removeFile({
   *   ref: 'main',
   *   filePath: 'old-file.txt',
   *   commitMessage: 'Remove deprecated file'
   * });
   * ```
   */
  async removeFile(input: RemoveFileInput): Promise<RemoveFileResult> {
    return removeFileOp(this, input);
  }

  /**
   * Remove a directory and all its contents from a branch
   * 
   * This method removes an entire directory recursively, including all files and
   * subdirectories within it. Empty parent directories are automatically cleaned up
   * after removal (similar to `removeFile`).
   * 
   * **Note:** This method implements concurrency control. If the branch is modified
   * by another operation between read and write, it will throw a `ConcurrentModificationError`.
   * 
   * @param input - Directory path and target branch
   * @returns Commit information and count of files removed
   * @throws {BareGitClientError} With code INVALID_PATH if path is root directory, contains invalid segments (`.` or `..`), or points to a file instead of a directory
   * @throws {BareGitClientError} With code NOT_FOUND if directory does not exist
   * @throws {BareGitClientError} With code CONCURRENT_MODIFICATION if branch was modified by another operation
   * 
   * @example
   * ```typescript
   * const result = await client.removeDirectory({
   *   ref: 'main',
   *   directoryPath: 'src/old-feature',
   *   commitMessage: 'Remove deprecated feature'
   * });
   * console.log(`Removed ${result.filesRemoved} files`);
   * // Output: Removed 12 files
   * ```
   */
  async removeDirectory(input: RemoveDirectoryInput): Promise<RemoveDirectoryResult> {
    return removeDirectoryOp(this, input);
  }

  /**
   * Read a file from a commit or branch
   * 
   * @param input - File path, reference, and encoding options
   * @returns File content and metadata
   * 
   * @example
   * ```typescript
   * const result = await client.readFile({
   *   ref: 'main',
   *   filePath: 'package.json',
   *   encoding: 'utf8'
   * });
   * console.log(result.content);
   * ```
   */
  async readFile(input: ReadFileInput): Promise<ReadFileResult> {
    return readFileOp(this, input);
  }

  /**
   * Get metadata details about a file or directory without reading its content
   * 
   * This is a lightweight operation that returns the mode, OID (SHA), and type
   * (blob or tree) of a path. Use this to check if a path exists and determine
   * whether it's a file or directory before calling `readFile` or `listFiles`.
   * 
   * @param input - File path and reference
   * @returns File metadata (mode, oid, type)
   * 
   * @example
   * ```typescript
   * const details = await client.getFileDetails({
   *   ref: 'main',
   *   filePath: 'src/index.ts'
   * });
   * 
   * if (details.type === 'blob') {
   *   // It's a file, safe to read
   *   const content = await client.readFile({
   *     ref: 'main',
   *     filePath: 'src/index.ts'
   *   });
   * } else {
   *   // It's a directory, list its contents
   *   const files = await client.listFiles({
   *     ref: 'main',
   *     folderPath: 'src/index.ts'
   *   });
   * }
   * ```
   */
  async getFileDetails(input: GetFileDetailsInput): Promise<GetFileDetailsResult> {
    return getFileDetailsOp(this, input);
  }

  /**
   * List files and folders at a specific path
   * 
   * @param input - Reference and folder path
   * @returns List of file entries
   * 
   * @example
   * ```typescript
   * const result = await client.listFiles({
   *   ref: 'main',
   *   folderPath: 'src'
   * });
   * result.entries.forEach(entry => {
   *   console.log(`${entry.type}: ${entry.path}`);
   * });
   * ```
   */
  async listFiles(input?: ListFilesInput): Promise<ListFilesResult> {
    return listFilesOp(this, input);
  }

  /**
   * Create a new branch from an existing commit
   * 
   * @param input - New branch name and optional source branch
   * @returns Branch information
   * 
   * @example
   * ```typescript
   * await client.createBranch({
   *   branchName: 'feature-x',
   *   sourceBranch: 'main'
   * });
   * ```
   */
  async createBranch(input: CreateBranchInput): Promise<CreateBranchResult> {
    return createBranchOp(this, input);
  }

  /**
   * Remove a branch
   * 
   * @param input - Branch name to remove
   * @returns Information about the removed branch
   * 
   * @example
   * ```typescript
   * await client.removeBranch({
   *   branchName: 'old-feature'
   * });
   * ```
   */
  async removeBranch(input: RemoveBranchInput): Promise<RemoveBranchResult> {
    return removeBranchOp(this, input);
  }

  /**
   * List all branches in the repository
   * 
   * @returns List of branches with their commit SHAs
   * 
   * @example
   * ```typescript
   * const result = await client.listBranches();
   * result.branches.forEach(branch => {
   *   console.log(`${branch.name}: ${branch.commit}`);
   * });
   * ```
   */
  async listBranches(): Promise<ListBranchesResult> {
    return listBranchesOp(this);
  }

  /**
   * Merge two branches with optional conflict resolution
   * 
   * @param input - Source and destination branches, with optional conflict resolutions
   * @returns Merge commit information
   * 
   * @example
   * ```typescript
   * const result = await client.mergeBranches({
   *   sourceBranch: 'feature-x',
   *   destinationBranch: 'main',
   *   resolutions: {
   *     'conflicted-file.txt': 'resolved content'
   *   }
   * });
   * ```
   */
  async mergeBranches(input: MergeBranchesInput): Promise<MergeBranchesResult> {
    return mergeBranchesOp(this, input);
  }

  /**
   * Run Git garbage collection to optimize repository
   * 
   * **Note:** This operation requires Git CLI to be installed on the system.
   * It will throw an error if Git is not found in PATH.
   * 
   * While this operation is optional, it's recommended to run it periodically
   * to prevent repository bloat from accumulating unreachable objects.
   * 
   * @param input - GC options (aggressive mode)
   * @returns Output from Git GC command
   * @throws {BareGitClientError} With code GIT_CLI_NOT_FOUND if Git is not installed
   * 
   * @example
   * ```typescript
   * try {
   *   const result = await client.runGC({ aggressive: false });
   *   console.log(result.output);
   * } catch (error) {
   *   if (error.code === 'GIT_CLI_NOT_FOUND') {
   *     console.log('Git CLI not available, skipping GC');
   *   }
   * }
   * ```
   */
  async runGC(input?: RunGCInput): Promise<RunGCResult> {
    return runGCOp(this, input);
  }
}
