/**
 * security.ts
 * Utility functions for input sanitization and XSS protection.
 */

export function sanitizeSearchQuery(input: string): string {
  if (!input) return "";
  // Strictly allow only letters, numbers, spaces, and hyphens. Strip all HTML/code chars.
  return input.replace(/[^a-zA-Z0-9\s-]/g, "").trim();
}
