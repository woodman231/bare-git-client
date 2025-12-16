/**
 * Error codes for BareGitClient operations
 */
export const ErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  CONCURRENCY_ERROR: 'CONCURRENCY_ERROR',
  MERGE_CONFLICT: 'MERGE_CONFLICT',
  GIT_CLI_NOT_FOUND: 'GIT_CLI_NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  INVALID_PATH: 'INVALID_PATH',
  BINARY_FILE: 'BINARY_FILE',
  INVALID_REFERENCE: 'INVALID_REFERENCE',
  INVALID_INPUT: 'INVALID_INPUT',
  OPERATION_FAILED: 'OPERATION_FAILED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Custom error class for BareGitClient operations
 */
export class BareGitClientError extends Error {
  public readonly code: ErrorCode;
  public readonly context: Record<string, unknown> | undefined;

  constructor(message: string, code: ErrorCode, context?: Record<string, unknown>) {
    super(message);
    this.name = 'BareGitClientError';
    this.code = code;
    this.context = context;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BareGitClientError);
    }
  }

  /**
   * Factory method for NOT_FOUND errors
   */
  static notFound(resource: string, details?: string): BareGitClientError {
    const message = details 
      ? `${resource} not found: ${details}`
      : `${resource} not found`;
    return new BareGitClientError(message, ErrorCodes.NOT_FOUND, { resource });
  }

  /**
   * Factory method for CONCURRENCY_ERROR
   */
  static concurrencyError(ref: string): BareGitClientError {
    return new BareGitClientError(
      `Concurrency conflict detected: ${ref} was modified by another operation. Please retry.`,
      ErrorCodes.CONCURRENCY_ERROR,
      { ref }
    );
  }

  /**
   * Factory method for MERGE_CONFLICT
   */
  static mergeConflict(conflicts: string[]): BareGitClientError {
    return new BareGitClientError(
      `Merge conflicts detected in ${conflicts.length} file(s): ${conflicts.join(', ')}`,
      ErrorCodes.MERGE_CONFLICT,
      { conflicts }
    );
  }

  /**
   * Factory method for GIT_CLI_NOT_FOUND
   */
  static gitCliNotFound(details?: string): BareGitClientError {
    const message = details
      ? `Git CLI not found: ${details}. Please install Git from https://git-scm.com/downloads`
      : 'Git CLI not found. Please install Git from https://git-scm.com/downloads';
    return new BareGitClientError(message, ErrorCodes.GIT_CLI_NOT_FOUND);
  }

  /**
   * Factory method for ALREADY_EXISTS
   */
  static alreadyExists(resource: string, name: string): BareGitClientError {
    return new BareGitClientError(
      `${resource} '${name}' already exists`,
      ErrorCodes.ALREADY_EXISTS,
      { resource, name }
    );
  }

  /**
   * Factory method for INVALID_PATH
   */
  static invalidPath(path: string, reason?: string): BareGitClientError {
    const message = reason
      ? `Invalid path '${path}': ${reason}`
      : `Invalid path '${path}'`;
    return new BareGitClientError(message, ErrorCodes.INVALID_PATH, { path });
  }

  /**
   * Factory method for BINARY_FILE
   */
  static binaryFile(path: string): BareGitClientError {
    return new BareGitClientError(
      `File '${path}' appears to be binary`,
      ErrorCodes.BINARY_FILE,
      { path }
    );
  }

  /**
   * Factory method for INVALID_REFERENCE
   */
  static invalidReference(ref: string, reason?: string): BareGitClientError {
    const message = reason
      ? `Invalid reference '${ref}': ${reason}`
      : `Invalid reference '${ref}'`;
    return new BareGitClientError(message, ErrorCodes.INVALID_REFERENCE, { ref });
  }

  /**
   * Factory method for INVALID_INPUT
   */
  static invalidInput(field: string, reason: string): BareGitClientError {
    return new BareGitClientError(
      `Invalid input for '${field}': ${reason}`,
      ErrorCodes.INVALID_INPUT,
      { field, reason }
    );
  }

  /**
   * Factory method for OPERATION_FAILED
   */
  static operationFailed(operation: string, reason: string): BareGitClientError {
    return new BareGitClientError(
      `Operation '${operation}' failed: ${reason}`,
      ErrorCodes.OPERATION_FAILED,
      { operation, reason }
    );
  }
}
