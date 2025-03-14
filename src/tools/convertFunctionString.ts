import {Notice} from "obsidian";

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
			new Notice(`Unsafe function detected: ${fnString}`);
			return null;
		}

		// Create a function that has access to our utility functions
		return function(...args: any[]) {
			// Create a context with our utility functions
			const context = {
				jiraToMarkdown,
				markdownToJira
			};

			// Create a new function with the utility functions in scope
			const fn = new Function(
				...params.split(',').map(p => p.trim()),
				`
                const jiraToMarkdown = this.jiraToMarkdown;
                const markdownToJira = this.markdownToJira;
                return ${body};
                `
			);

			// Execute the function with our context
			return fn.apply(context, args);
		};
	} catch (error) {
		console.error("Failed to parse function string:", error);
		return null;
	}
}

export function functionToArrowString(fn: Function): string {
	try {
		const fnStr = fn.toString().trim();

		// Handle arrow functions (both single-line and multi-line)
		const arrowMatch = fnStr.match(/^\s*\(?([^)]*)\)?\s*=>\s*(.+)$/s);
		if (arrowMatch) {
			const params = arrowMatch[1].trim();
			const body = arrowMatch[2].trim();
			return `(${params}) => ${body}`;
		} else {
			console.error("Failed to parse arrow function:", fnStr);
		}

		// Handle regular named and anonymous functions
		const functionMatch = fnStr.match(/^(?:function\s+[\w$]*\s*)?\(([^)]*)\)\s*\{([\s\S]*)\}$/);
		if (functionMatch) {
			const params = functionMatch[1].trim();
			let body = functionMatch[2].trim();

			// If body contains just a return statement, simplify it
			const returnMatch = body.match(/^\s*return\s+([\s\S]*?)\s*;\s*$/);
			if (returnMatch) {
				body = returnMatch[1];
			}

			return `(${params}) => ${body}`;
		} else {
			console.error("Failed to parse function:", fnStr);
		}

		// Return original string if no patterns match
		return fnStr;
	} catch (error) {
		console.error("Error converting function to string:", error);
		return "";
	}
}
