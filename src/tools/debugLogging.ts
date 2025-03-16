// Create a debug utility module (debug.ts)
export const DEBUG_MODE = process.env.NODE_ENV !== 'production';

export function debugLog(...args: any[]): void {
	if (DEBUG_MODE) {
		console.log('[DEBUG]', ...args);
	}
}

export function debugWarn(...args: any[]): void {
	if (DEBUG_MODE) {
		console.warn('[DEBUG WARNING]', ...args);
	}
}

export function debugError(...args: any[]): void {
	if (DEBUG_MODE) {
		console.error('[DEBUG ERROR]', ...args);
	}
}
