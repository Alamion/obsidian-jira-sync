const forbiddenPatterns = ["document", "window", "eval", "Function", "fetch"]; // Prevent unsafe code execution
import { jiraToMarkdown, markdownToJira } from "../markdown_html";


function isValidFunctionBody(fnString: string): boolean {
	return !forbiddenPatterns.some(forbidden => fnString.includes(forbidden));
}

export function safeStringToFunction(fnString: string): Function | null {
	try {
		// Extract function body from an arrow function string
		const functionBodyMatch = fnString.match(/\((.*?)\)\s*=>\s*(.*)/);
		if (!functionBodyMatch) return null;

		const params = functionBodyMatch[1].trim();
		const body = functionBodyMatch[2].trim();

		// Ensure function body does not contain unsafe references
		if (!isValidFunctionBody(body)) {
			console.warn(`Unsafe function detected: ${fnString}`);
			return null;
		}

		// Create a new function dynamically
		return new Function(params, `return ${body};`);
	} catch (error) {
		console.error("Failed to parse function string:", error);
		return null;
	}
}

export function functionToArrowString(fn: Function): string {
	try {
		const fnStr = fn.toString().trim();

		// Match function body and parameters from normal or arrow function formats
		const arrowMatch = fnStr.match(/^\s*\(?([\w\s,]*)\)?\s*=>\s*(.+)$/s);
		if (arrowMatch) {
			return `(${arrowMatch[1].trim()}) => ${arrowMatch[2].trim()}`;
		}

		const normalFunctionMatch = fnStr.match(/^function\s*\(?([\w\s,]*)\)?\s*\{([\s\S]*)\}$/);
		if (normalFunctionMatch) {
			return `(${normalFunctionMatch[1].trim()}) => ${normalFunctionMatch[2].trim().replace(/^\s*return\s*/, '').replace(/\s*;\s*$/, '')}`;
		}

		return fnStr; // Fallback, if we can't match the expected pattern
	} catch (error) {
		console.error("Error converting function to string:", error);
		return "";
	}
}
