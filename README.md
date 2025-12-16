# @woodman231/bare-git-client

A TypeScript library for managing bare Git repositories with a clean, type-safe API. Built on top of [isomorphic-git](https://isomorphic-git.org/), this library provides a high-level interface for common Git operations on bare repositories.

## Features

- 🎯 **Type-safe**: Full TypeScript support with comprehensive type definitions
- 📦 **Schema validation**: Runtime validation with Zod schemas
- 🔧 **Bare repository support**: Designed specifically for bare Git repositories
- 🌳 **Deep file operations**: Add, remove, and read files at any nested path
- 🔀 **Advanced merging**: 3-way merge with conflict resolution
- 🚀 **Modern API**: Clean, async/await-based interface
- 📚 **Well-documented**: Comprehensive JSDoc comments and examples

## Installation

```bash
npm install @woodman231/bare-git-client
```

## Quick Start

```typescript
import { BareGitClient } from '@woodman231/bare-git-client';

// Initialize the client
// NOTE: userName and userEmail are REQUIRED - no defaults provided
const client = new BareGitClient(
  './my-repo.git',           // Repository path
  'John Doe',                 // Your name
  'john@example.com'          // Your email
);

// Create a bare repository
await client.createBare({
  defaultBranch: 'main',
  initialFile: {
    path: 'README.md',
    content: '# My Project\n\nWelcome!'
  }
});

// Add a file
await client.addFile({
  ref: 'main',
  filePath: 'src/index.ts',
  content: 'console.log("Hello, World!");',
  commitMessage: 'Add main entry point'
});

// Read a file
const file = await client.readFile({
  ref: 'main',
  filePath: 'src/index.ts'
});
console.log(file.content);

// List files in a directory
const files = await client.listFiles({
  ref: 'main',
  folderPath: 'src'
});
files.entries.forEach(entry => {
  console.log(`${entry.type}: ${entry.path}`);
});
```

## API Reference

### Constructor

```typescript
new BareGitClient(repoPath: string, userName: string, userEmail: string)
```

**Important:** All three parameters are required. The library does NOT provide default values for `userName` and `userEmail`. It is the developer's responsibility to provide appropriate values for their use case.

**Parameters:**
- `repoPath` - Absolute or relative path to the bare Git repository
- `userName` - Git author name (used in commits)
- `userEmail` - Git author email (used in commits)

**Throws:** `BareGitClientError` if any parameter is empty

### Methods

#### `createBare(input?)`

Create a bare Git repository with an initial commit.

```typescript
const result = await client.createBare({
  defaultBranch: 'main',        // Optional, defaults to 'main'
  initialFile: {                // Optional
    path: 'README.md',
    content: '# Hello World'
  }
});
// Returns: { blobSha, treeSha, commitSha, branch }
```

#### `addFile(input)`

Add or update a file at any nested path in a branch.

```typescript
await client.addFile({
  ref: 'main',                  // Branch name or ref
  filePath: 'src/utils/helper.ts',
  content: 'export const helper = () => {};',
  commitMessage: 'Add helper',  // Optional, auto-generated if omitted
  author: {                     // Optional, uses constructor values if omitted
    name: 'Custom Author',
    email: 'custom@example.com'
  }
});
// Returns: { commitSha, treeSha, blobSha }
```

**Note:** This method implements concurrency control. If the branch is modified by another operation between read and write, it will throw a `CONCURRENCY_ERROR`. Retry logic is the responsibility of the developer.

#### `removeFile(input)`

Remove a file and automatically clean up empty parent directories.

```typescript
await client.removeFile({
  ref: 'main',
  filePath: 'old-file.txt',
  commitMessage: 'Remove old file',  // Optional
  author: { ... }                    // Optional
});
// Returns: { commitSha, treeSha }
```

#### `readFile(input)`

Read a file from a specific commit or branch.

```typescript
const result = await client.readFile({
  ref: 'main',                  // Optional, defaults to 'HEAD'
  filePath: 'package.json',
  encoding: 'utf8'              // Optional: 'utf8' | 'buffer' | 'auto' (default)
});
// Returns: { content, mode, oid }
```

**Binary Detection:** When `encoding` is set to `'auto'` (default), the library automatically detects binary files and returns a Buffer for binary content or a string for text content.

#### `listFiles(input?)`

List files and folders at a specific path.

```typescript
const result = await client.listFiles({
  ref: 'main',              // Optional, defaults to 'HEAD'
  folderPath: 'src'         // Optional, defaults to '' (root)
});
// Returns: { entries: [{ mode, type, oid, path }, ...] }
```

#### `createBranch(input)`

Create a new branch from an existing commit.

```typescript
await client.createBranch({
  branchName: 'feature-x',
  sourceBranch: 'main',     // Optional, defaults to HEAD
  force: false              // Optional, defaults to false
});
// Returns: { branchName, commitSha }
```

#### `removeBranch(input)`

Delete a branch reference.

```typescript
await client.removeBranch({
  branchName: 'old-feature'
});
// Returns: { branchName, commitSha }
```

#### `listBranches()`

List all branches in the repository.

```typescript
const result = await client.listBranches();
// Returns: { branches: [{ name, commit }, ...] }
```

#### `mergeBranches(input)`

Perform a 3-way merge between two branches.

```typescript
const result = await client.mergeBranches({
  sourceBranch: 'feature-x',
  destinationBranch: 'main',
  resolutions: {            // Optional: provide resolutions for conflicts
    'conflicted-file.txt': 'resolved content here'
  },
  commitMessage: 'Merge feature-x',  // Optional
  author: { ... }                     // Optional
});
// Returns: { commitSha, treeSha, conflicts?: string[] }
```

**Conflict Handling:** If conflicts are detected and no resolutions are provided, the method throws a `MERGE_CONFLICT` error with the list of conflicting files.

#### `runGC(input?)`

Run Git garbage collection to optimize the repository.

```typescript
try {
  const result = await client.runGC({
    aggressive: false       // Optional, defaults to false (auto mode)
  });
  console.log(result.output);
} catch (error) {
  if (error.code === 'GIT_CLI_NOT_FOUND') {
    console.log('Git CLI not available, skipping GC');
  }
}
```

**⚠️ Important: Git CLI Requirement**

This operation requires the Git CLI to be installed on the system and available in PATH. It will throw a `BareGitClientError` with code `GIT_CLI_NOT_FOUND` if Git is not found.

**Why this operation is optional but recommended:**

While this library uses `isomorphic-git` for most operations, garbage collection is not implemented in isomorphic-git. Without periodic garbage collection, your bare repository can accumulate unreachable objects (blobs, trees, commits) that take up disk space. Over time, this can lead to repository bloat.

**When to run GC:**
- After many file operations
- After branch deletions
- After force pushes or rewrites
- Periodically as part of repository maintenance

**Modes:**
- `aggressive: false` (default) - Runs `git gc --auto`, which only runs if needed
- `aggressive: true` - Runs `git gc --aggressive`, which is more thorough but slower

## Error Handling

All methods throw `BareGitClientError` on failure. The error includes a `code` property for programmatic error handling:

```typescript
import { BareGitClientError, ErrorCodes } from '@woodman231/bare-git-client';

try {
  await client.readFile({
    ref: 'main',
    filePath: 'missing-file.txt'
  });
} catch (error) {
  if (error instanceof BareGitClientError) {
    switch (error.code) {
      case ErrorCodes.NOT_FOUND:
        console.log('File not found');
        break;
      case ErrorCodes.CONCURRENCY_ERROR:
        console.log('Branch was modified, retry the operation');
        break;
      case ErrorCodes.MERGE_CONFLICT:
        console.log('Conflicts detected:', error.context?.conflicts);
        break;
      case ErrorCodes.GIT_CLI_NOT_FOUND:
        console.log('Git CLI not installed');
        break;
      default:
        console.error('Error:', error.message);
    }
  }
}
```

### Error Codes

- `NOT_FOUND` - Resource (file, branch, ref) not found
- `CONCURRENCY_ERROR` - Branch was modified during operation (retry recommended)
- `MERGE_CONFLICT` - Merge conflicts require resolution
- `GIT_CLI_NOT_FOUND` - Git CLI not installed (for `runGC` operation)
- `ALREADY_EXISTS` - Resource already exists (e.g., branch name)
- `INVALID_PATH` - Invalid file or folder path
- `BINARY_FILE` - File is detected as binary
- `INVALID_REFERENCE` - Invalid Git reference
- `INVALID_INPUT` - Invalid input parameter
- `OPERATION_FAILED` - General operation failure

## Schema Validation

All input and output types are validated at runtime using Zod schemas. You can import and use these schemas directly:

```typescript
import { AddFileInputSchema } from '@woodman231/bare-git-client';

const input = AddFileInputSchema.parse({
  ref: 'main',
  filePath: 'test.txt',
  content: 'hello'
});
```

## TypeScript Support

The library is written in TypeScript and provides full type definitions. All types are exported:

```typescript
import type {
  CreateBareInput,
  AddFileInput,
  ReadFileResult,
  FileEntry,
  // ... and more
} from '@woodman231/bare-git-client';
```

## Module Support

This library supports both ESM and CommonJS:

```typescript
// ESM
import { BareGitClient } from '@woodman231/bare-git-client';

// CommonJS
const { BareGitClient } = require('@woodman231/bare-git-client');
```

## License

ISC

## Contributing

Contributions are welcome! Please open an issue or pull request on GitHub.

## Author

woodman231
