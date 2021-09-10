// Utility functions for testing
// Do NOT import this module at runtime.

/**
 * Flush unresoleved all promises.
 * Reference: https://github.com/facebook/jest/issues/2157
 */
export async function flushPromises() {
  jest.useRealTimers();
  await Promise.resolve();
  jest.useFakeTimers("modern");
}
