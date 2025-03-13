
/**
 * Sanitize a file name to ensure it's valid
 * @param fileName The original file name
 * @returns Sanitized file name
 */
export function sanitizeFileName(fileName: string): string {
	return fileName.replace(/[\\/:*?"<>|]/g, "-");
}
