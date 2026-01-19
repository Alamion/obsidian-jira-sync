import { Notice } from "obsidian";
import { JiraIssue } from "../interfaces";
import { parse } from "acorn";
import {debugLog} from "./debugLogging";
import {FieldMapping} from "../default/obsidianJiraFieldsMapping";
import {defaultIssue} from "../default/defaultIssue";
import {jiraToMarkdown, markdownToJira} from "./markdownHtml";

// Constants for validation and error messages
const FORBIDDEN_PATTERNS = ["document", "window", "eval", "Function", "fetch", "setTimeout", "globalThis"];
const SYNTAX_KEYWORDS = ["return", "if", "else", "for", "while", "switch", "try", "catch"];
const SAFE_GLOBALS = {
	jiraToMarkdown,
	markdownToJira,
	JSON: {
		parse: JSON.parse,
		stringify: JSON.stringify
	},
	Math: Math,
	Date: Date,
	String: String,
	Number: Number,
	Boolean: Boolean,
	Array: Array,
	Object: Object
};

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
			let testFnString = fnString;

			if (isSimpleExpression(fnString) || (fnString.startsWith("{") && fnString.endsWith("}") && !fnString.includes("return"))) {
				const varDeclarations = approved_vars.map(varName => {
					if (varName === 'issue') return `${varName} = ${JSON.stringify(defaultIssue)}`;
					if (varName === 'value') return `${varName} = "test value"`;
					if (varName === 'data_source') return `${varName} = {}`;
					return `${varName} = {}`;
				}).join(', ');

				testFnString = `(${varDeclarations}) => ${fnString}`;
			}
			debugLog(`checking function: ${testFnString.substring(0, 100)}`);

			const context: Record<string, any> = {};
			Object.keys(SAFE_GLOBALS).forEach(key => {
				context[key] = (SAFE_GLOBALS as any)[key];
			});

			const safeBuiltIns = ['Infinity', 'NaN', 'undefined', 'isFinite', 'isNaN',
				'parseFloat', 'parseInt', 'decodeURI', 'decodeURIComponent',
				'encodeURI', 'encodeURIComponent'];
			safeBuiltIns.forEach(key => {
				context[key] = (iframeWindow as any)[key];
			});

			const testArgs = approved_vars.map(varName => {
				if (varName === 'issue') return defaultIssue;
				if (varName === 'value') return "test value";
				if (varName === 'data_source') return {};
				return {};
			});

			const contextKeys = Object.keys(context);
			const contextValues = contextKeys.map(key => context[key]);

			const func = new Function(
				...approved_vars,
				...contextKeys,
				`return (${fnString});`
			);

			func(...testArgs, ...contextValues);
			resolve({ isValid: true });
		} catch (error) {
			debugLog('Not valid')
			resolve({ isValid: false, errorMessage: `Runtime error: ${(error as Error).message}` });
		} finally {
			document.body.removeChild(iframe);
		}
	});
}

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
		if (extraValidate) {
			const validation = await validateFunctionString(exprString, type === 'fromJira' ? ['issue', 'data_source'] : ['value']);
			if (!validation.isValid) {
				console.warn(`Invalid function: ${validation.errorMessage}`);
				// new Notice(`Invalid function: ${validation.errorMessage}`);
				return null;
			}
		}


		const arrowFnMatch = exprString.match(/^\s*\((.*?)\)\s*=>\s*(.*)$/s);
		let body = arrowFnMatch ? arrowFnMatch[2].trim() : exprString.trim();

		if (isSimpleExpression(body)) {
			body = `return ${body};`;
		}

		if (body.startsWith("{") && body.endsWith("}") && !body.includes("return")) {
			body = `{ return ${body.slice(1, -1)} }`;
		}

		const context = {
			jiraToMarkdown,
			markdownToJira,
			JSON,
			Math,
			Date,
			String,
			Number,
			Boolean,
			Array,
			Object
		};

		if (type === 'toJira') {
			return function(value: any) {

				const fn = new Function('value', 'context', `
                    with (context) {
						try {
						    ${body}
						} catch (e) {
						    console.error("Error in toJira function:", e);
						    return null;
						}
					}
                `);

				return fn.call(context, value, context);
			};
		} else { // fromJira
			return function(issue: JiraIssue, data_source: Record<string, any> | null) {

				const fn = new Function('issue', 'data_source', 'context', `
                    with (context) {
						try {
							${body}
						} catch (e) {
							console.error("Error in fromJira function:", e);
							return null;
						}
                    }
                `);

				return fn.call(context, issue, data_source, context);
			};
		}
	} catch (error) {
		console.error("Failed to parse function:", error);
		new Notice(`Failed to create function: ${(error as Error).message}`);
		return null;
	}
}

export function jiraFunctionToString(fn: Function, isFromJira: boolean = false): string {
	const baseStr = functionToExpressionString(fn);

	if (!baseStr) return baseStr;

	if (isFromJira) {
		const fnStr = fn.toString().trim();

		const paramMatch = fnStr.match(/^\s*(?:\(?([^)]*)\)?\s*=>|\s*function\s*\(([^)]*)\))/);
		if (paramMatch) {
			const params = (paramMatch[1] || paramMatch[2] || '').split(',').map(p => p.trim());

			let resultStr = baseStr;

			if (params.length >= 1 && params[0]) {
				const regex1 = new RegExp(`\\b${params[0]}\\b`, 'g');
				resultStr = resultStr.replace(regex1, 'issue');
			}
			if (params.length >= 2 && params[1]) {
				const regex2 = new RegExp(`\\b${params[1]}\\b`, 'g');
				resultStr = resultStr.replace(regex2, 'data_source');
			}

			return resultStr;
		}
	} else {
		const fnStr = fn.toString().trim();

		const paramMatch = fnStr.match(/^\s*(?:\(?([^)]*)\)?\s*=>|\s*function\s*\(([^)]*)\))/);
		if (paramMatch) {
			const param = (paramMatch[1] || paramMatch[2] || '').trim();

			if (param) {
				const regex = new RegExp(`\\b${param}\\b`, 'g');
				return baseStr.replace(regex, 'value');
			}
		}
	}

	return baseStr;
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
