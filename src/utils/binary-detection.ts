/**
 * Detect if a buffer contains binary data
 * Checks for null bytes in the first 8000 bytes
 */
export function isBinaryBuffer(buffer: Uint8Array | Buffer): boolean {
  const chunk = buffer.slice(0, 8000);
  for (let i = 0; i < chunk.length; i++) {
    if (chunk[i] === 0) return true;
  }
  return false;
}
