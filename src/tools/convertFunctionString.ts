import { Notice } from "obsidian";
import { FieldMapping } from "./mappingObsidianJiraFields";
import { JiraIssue } from "../interfaces";
import { parse } from "acorn";
import {debugLog} from "./debugLogging";

// Constants for validation and error messages
const FORBIDDEN_PATTERNS = ["document", "window", "eval", "Function", "fetch", "setTimeout"]; // Prevent unsafe code execution
const SYNTAX_KEYWORDS = ["return", "if", "else", "for", "while", "switch", "try", "catch"];

export function validateFunctionStringBrowser(fnString: string, approved_vars: string[] = []): Promise<{ isValid: boolean; errorMessage?: string }> {
	return new Promise((resolve) => {
		try {
			parse(fnString, { ecmaVersion: "latest" });
		} catch (error) {
			return resolve({ isValid: false, errorMessage: `Syntax error: ${(error as Error).message}` });
		}

		const iframe = document.createElement("iframe");
		iframe.style.display = "none";
		document.body.appendChild(iframe);
		const iframeWindow = iframe.contentWindow as Window;

		try {
			if (isSimpleExpression(fnString) || (fnString.startsWith("{") && fnString.endsWith("}") && !fnString.includes("return"))) {
				fnString = `(${approved_vars.map(varName => varName==='issue'?`${varName} = {fields: {}}`:`${varName} = {}`).join(', ')}) => ${fnString}`;
			}
			debugLog(`checking function: ${fnString}`);
			// @ts-ignore
			iframeWindow.eval(fnString);
			resolve({ isValid: true });
		} catch (error) {
			resolve({ isValid: false, errorMessage: `Runtime error: ${(error as Error).message}` });
		} finally {
			document.body.removeChild(iframe);
		}
	});
}

/**
 * Validates a function string for security and syntax issues
 * @param fnString - The function string to validate
 * @param approved_vars - An array of approved variable names
 * @returns An object with validation result and optional error message
 */
export async function validateFunctionString(fnString: string, approved_vars: string[] = []): Promise<{ isValid: boolean; errorMessage?: string }> {
	// Check for null, undefined or empty string
	if (!fnString || fnString.trim().length === 0) {
		return { isValid: true };
	}

	// Check for forbidden patterns (security)
	const foundForbidden = FORBIDDEN_PATTERNS.find(pattern => fnString.includes(pattern));
	if (foundForbidden) {
		return {
			isValid: false,
			errorMessage: `Unsafe reference detected: '${foundForbidden}' is not allowed`
		};
	}

	return validateFunctionStringBrowser(fnString, approved_vars);
}

/**
 * Determines if the function string is a simple expression or complex function body
 * @param fnString - The function string to analyze
 * @returns Whether the string is a simple expression (vs. a full function body)
 */
function isSimpleExpression(fnString: string): boolean {
	const trimmed = fnString.trim();

	// Check if it's a full arrow function
	if (trimmed.match(/^\s*\(.*?\)\s*=>\s*.*$/s)) {
		return false;
	}

	// Check if it has typical function body syntax elements
	const hasComplexSyntax = SYNTAX_KEYWORDS.some(keyword =>
		// Match full keywords, not substrings
		new RegExp(`\\b${keyword}\\b`).test(trimmed)
	);

	// Has curly braces which might indicate a code block
	const hasCodeBlock = trimmed.includes("{") && trimmed.includes("}") && trimmed.includes("return");

	return !hasComplexSyntax && !hasCodeBlock;
}

/**
 * Safely converts a string into a function that can be executed with proper context
 * @param exprString - The function or expression string to convert
 * @param type - The type of transformation function ('toJira' or 'fromJira')
 * @param extraValidate - Whether to validate the function string on syntax, type and other errors
 * @returns A wrapped function or null if conversion fails
 */
export async function safeStringToFunction(
	exprString: string,
	type: 'toJira' | 'fromJira' = 'toJira',
	extraValidate: boolean = true
): Promise<Function | null> {
	try {
		if (exprString.trim().length === 0) {
			return () => null;
		}
		// First validate the string
		if (extraValidate) {
			const validation = await validateFunctionString(exprString, type === 'fromJira' ? ['issue', 'data_source'] : ['value']);
			if (!validation.isValid) {
				console.warn(`Invalid function: ${validation.errorMessage}`);
				// new Notice(`Invalid function: ${validation.errorMessage}`);
				return null;
			}
		}


		// Extract just the function body if it's an arrow function
		const arrowFnMatch = exprString.match(/^\s*\((.*?)\)\s*=>\s*(.*)$/s);
		let body = arrowFnMatch ? arrowFnMatch[2].trim() : exprString.trim();

		// If it's a simple expression, wrap it in a return statement
		if (isSimpleExpression(body)) {
			body = `return ${body};`;
		}

		// If body is wrapped in curly braces but doesn't contain a return statement, add one
		if (body.startsWith("{") && body.endsWith("}") && !body.includes("return")) {
			// Remove the outer braces, add return and put the braces back
			body = `{ return ${body.slice(1, -1)} }`;
		}

		// Create appropriate function based on the type
		if (type === 'toJira') {
			return function(value: any) {
				const context = {
					// Add utility functions that should be available in the executed function
					// markdownToJira: utility.markdownToJira
				};

				const fn = new Function('value', `
                    try {
                        ${body}
                    } catch (e) {
                        console.error("Error in toJira function:", e);
                        return null;
                    }
                `);

				return fn.apply(context, [value]);
			};
		} else { // fromJira
			return function(issue: JiraIssue, data_source: Record<string, any> | null) {
				const context = {
					// Add utility functions for the fromJira context
					// jiraToMarkdown: utility.jiraToMarkdown
				};

				const fn = new Function('issue', 'data_source', `
                    try {
                        ${body}
                    } catch (e) {
                        console.error("Error in fromJira function:", e);
                        return null;
                    }
                `);

				return fn.apply(context, [issue, data_source]);
			};
		}
	} catch (error) {
		console.error("Failed to parse function:", error);
		new Notice(`Failed to create function: ${(error as Error).message}`);
		return null;
	}
}

export function functionToExpressionString(fn: Function): string {
	try {
		const fnStr = fn.toString().trim();

		// Handle arrow functions
		const arrowMatch = fnStr.match(/^\s*\(?([^)]*)\)?\s*=>\s*(.+)$/s);
		if (arrowMatch) {
			return arrowMatch[2].trim();
		}

		// Handle regular functions
		const functionMatch = fnStr.match(/^(?:function\s+[\w$]*\s*)?\(([^)]*)\)\s*\{([\s\S]*)\}$/);
		if (functionMatch) {
			let body = functionMatch[2].trim();

			// If body contains just a return statement, simplify it
			const returnMatch = body.match(/^\s*return\s+([\s\S]*?)\s*;\s*$/);
			if (returnMatch) {
				return returnMatch[1].trim();
			}
		}

		// If we can't parse it properly, return empty string
		console.error("Failed to extract expression from function:", fnStr);
		new Notice("Failed to extract expression from function");
		return "";
	} catch (error) {
		console.error("Error converting function to expression string:", error);
		return "";
	}
}

export async function transform_string_to_functions_mappings  (
	mappings: Record<string, { toJira: string; fromJira: string }>, extraValidate: boolean = true)  {
	// Also convert to functions for runtime use
	const transformedMappings: Record<string, FieldMapping> = {};
	for (const [fieldName, { toJira, fromJira }] of Object.entries(mappings)) {
		const toJiraFn = safeStringToFunction(toJira, 'toJira', extraValidate);
		const fromJiraFn = safeStringToFunction(fromJira, 'fromJira', extraValidate);

		if (toJiraFn && fromJiraFn) {
			transformedMappings[fieldName] = {
				toJira: await toJiraFn as (value: any) => any,
				fromJira: await fromJiraFn as (issue: JiraIssue, data_source: Record<string, any>) => any,
			};
		} else {
			console.warn(`Invalid function in field: ${fieldName}`);
		}
	}
	return transformedMappings
}
