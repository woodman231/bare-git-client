import { z } from 'zod';

/**
 * Schema for Git author information
 */
export const AuthorSchema = z.object({
  name: z.string().min(1, 'Author name is required'),
  email: z.string().email('Valid email is required'),
  timestamp: z.number().int().optional(),
  timezoneOffset: z.number().int().optional(),
});

export type Author = z.infer<typeof AuthorSchema>;

/**
 * Schema for Git reference (branch name, commit SHA, etc.)
 */
export const ReferenceSchema = z.string().min(1, 'Reference is required');

export type Reference = z.infer<typeof ReferenceSchema>;

/**
 * Schema for file entry in a tree
 */
export const FileEntrySchema = z.object({
  mode: z.string(),
  type: z.enum(['blob', 'tree']),
  oid: z.string(),
  path: z.string(),
});

export type FileEntry = z.infer<typeof FileEntrySchema>;

/**
 * Encoding options for reading files
 */
export const EncodingSchema = z.enum(['utf8', 'buffer', 'auto']).default('auto');

export type Encoding = z.infer<typeof EncodingSchema>;

/**
 * Schema for creating a bare repository
 */
export const CreateBareInputSchema = z.object({
  defaultBranch: z.string().default('main'),
  initialFile: z.object({
    path: z.string().min(1),
    content: z.string(),
  }).optional(),
}).default({ defaultBranch: 'main' });

export type CreateBareInput = z.infer<typeof CreateBareInputSchema>;

export const CreateBareResultSchema = z.object({
  blobSha: z.string().optional(),
  treeSha: z.string(),
  commitSha: z.string(),
  branch: z.string(),
});

export type CreateBareResult = z.infer<typeof CreateBareResultSchema>;

/**
 * Schema for adding a file
 */
export const AddFileInputSchema = z.object({
  ref: ReferenceSchema,
  filePath: z.string().min(1, 'File path is required'),
  content: z.union([z.string(), z.instanceof(Buffer), z.instanceof(Uint8Array)]),
  commitMessage: z.string().optional(),
  author: AuthorSchema.optional(),
});

export type AddFileInput = z.infer<typeof AddFileInputSchema>;

export const AddFileResultSchema = z.object({
  commitSha: z.string(),
  treeSha: z.string(),
  blobSha: z.string(),
});

export type AddFileResult = z.infer<typeof AddFileResultSchema>;

/**
 * Schema for removing a file
 */
export const RemoveFileInputSchema = z.object({
  ref: ReferenceSchema,
  filePath: z.string().min(1, 'File path is required'),
  commitMessage: z.string().optional(),
  author: AuthorSchema.optional(),
});

export type RemoveFileInput = z.infer<typeof RemoveFileInputSchema>;

export const RemoveFileResultSchema = z.object({
  commitSha: z.string(),
  treeSha: z.string().nullable(),
});

export type RemoveFileResult = z.infer<typeof RemoveFileResultSchema>;

/**
 * Schema for reading a file
 */
export const ReadFileInputSchema = z.object({
  ref: ReferenceSchema.default('HEAD'),
  filePath: z.string().min(1, 'File path is required'),
  encoding: EncodingSchema.default('auto'),
});

export type ReadFileInput = z.infer<typeof ReadFileInputSchema>;

export const ReadFileResultSchema = z.object({
  content: z.union([z.string(), z.instanceof(Buffer)]),
  mode: z.string(),
  oid: z.string(),
});

export type ReadFileResult = z.infer<typeof ReadFileResultSchema>;

/**
 * Schema for listing files
 */
export const ListFilesInputSchema = z.object({
  ref: ReferenceSchema.default('HEAD'),
  folderPath: z.string().default(''),
}).default({ ref: 'HEAD', folderPath: '' });

export type ListFilesInput = z.infer<typeof ListFilesInputSchema>;

export const ListFilesResultSchema = z.object({
  entries: z.array(FileEntrySchema),
});

export type ListFilesResult = z.infer<typeof ListFilesResultSchema>;

/**
 * Schema for creating a branch
 */
export const CreateBranchInputSchema = z.object({
  branchName: z.string().min(1, 'Branch name is required'),
  sourceBranch: ReferenceSchema.optional(),
  force: z.boolean().optional().default(false),
});

export type CreateBranchInput = z.infer<typeof CreateBranchInputSchema>;

export const CreateBranchResultSchema = z.object({
  branchName: z.string(),
  commitSha: z.string(),
});

export type CreateBranchResult = z.infer<typeof CreateBranchResultSchema>;

/**
 * Schema for removing a branch
 */
export const RemoveBranchInputSchema = z.object({
  branchName: z.string().min(1, 'Branch name is required'),
});

export type RemoveBranchInput = z.infer<typeof RemoveBranchInputSchema>;

export const RemoveBranchResultSchema = z.object({
  branchName: z.string(),
  commitSha: z.string(),
});

export type RemoveBranchResult = z.infer<typeof RemoveBranchResultSchema>;

/**
 * Schema for listing branches
 */
export const ListBranchesResultSchema = z.object({
  branches: z.array(z.object({
    name: z.string(),
    commit: z.string(),
  })),
});

export type ListBranchesResult = z.infer<typeof ListBranchesResultSchema>;

/**
 * Schema for merging branches
 */
export const MergeBranchesInputSchema = z.object({
  sourceBranch: ReferenceSchema,
  destinationBranch: ReferenceSchema,
  resolutions: z.record(z.string(), z.string()).optional(),
  commitMessage: z.string().optional(),
  author: AuthorSchema.optional(),
});

export type MergeBranchesInput = z.infer<typeof MergeBranchesInputSchema>;

export const MergeBranchesResultSchema = z.object({
  commitSha: z.string(),
  treeSha: z.string(),
  conflicts: z.array(z.string()).optional(),
});

export type MergeBranchesResult = z.infer<typeof MergeBranchesResultSchema>;

/**
 * Schema for running garbage collection
 */
export const RunGCInputSchema = z.object({
  aggressive: z.boolean().default(false),
}).default({ aggressive: false });

export type RunGCInput = z.infer<typeof RunGCInputSchema>;

export const RunGCResultSchema = z.object({
  output: z.string(),
});

export type RunGCResult = z.infer<typeof RunGCResultSchema>;
