import type { Author } from '../schemas/index.js';

/**
 * Build an author object with current timestamp by default
 */
export function buildAuthor(author: Author): { name: string; email: string; timestamp: number; timezoneOffset: number } {
  return {
    name: author.name,
    email: author.email,
    timestamp: author.timestamp ?? Math.floor(Date.now() / 1000),
    timezoneOffset: author.timezoneOffset ?? 0,
  };
}
