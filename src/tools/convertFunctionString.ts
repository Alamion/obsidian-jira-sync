import {Notice} from "obsidian";

const forbiddenPatterns = ["document", "window", "eval", "Function", "fetch"]; // Prevent unsafe code execution
import {FieldMapping} from "./mappingObsidianJiraFields";
import {JiraIssue} from "../interfaces";


function isValidFunctionBody(fnString: string): boolean {
	return !forbiddenPatterns.some(forbidden => fnString.includes(forbidden));
}

export function safeStringToFunction(exprString: string): Function | null {
	try {
		// Check if the input is a full arrow function or just an expression
		const arrowFnMatch = exprString.match(/^\s*\((.*?)\)\s*=>\s*(.*)$/s);

		// If it's an arrow function, extract just the body
		const body = arrowFnMatch ? arrowFnMatch[2].trim() : exprString.trim();

		// Ensure function body does not contain unsafe references
		if (!isValidFunctionBody(body)) {
			console.warn(`Unsafe expression detected: ${exprString}`);
			new Notice(`Unsafe expression detected: ${exprString}`);
			return null;
		}

		// Create a function that has access to our utility functions
		return function(issue: any) {
			// Create a context with our utility functions
			const context = {
				// jiraToMarkdown,
				// markdownToJira
			};

			// Create a new function with the utility functions in scope
			const fn = new Function(
				'issue',
				`
                // const jiraToMarkdown = this.jiraToMarkdown;
                // const markdownToJira = this.markdownToJira;
                return ${body};
                `
			);

			// Execute the function with our context
			return fn.apply(context, [issue]);
		};
	} catch (error) {
		console.error("Failed to parse expression:", error);
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
		return "";
	} catch (error) {
		console.error("Error converting function to expression string:", error);
		return "";
	}
}

export const transform_string_to_functions_mappings = (
	mappings: Record<string, { toJira: string; fromJira: string }>) => {
	// Also convert to functions for runtime use
	const transformedMappings: Record<string, FieldMapping> = {};
	for (const [fieldName, { toJira, fromJira }] of Object.entries(mappings)) {
		const toJiraFn = safeStringToFunction(toJira);
		const fromJiraFn = safeStringToFunction(fromJira);

		if (toJiraFn && fromJiraFn) {
			transformedMappings[fieldName] = {
				toJira: toJiraFn as (value: any) => any,
				fromJira: fromJiraFn as (issue: JiraIssue, data_source: Record<string, any>) => any,
			};
		} else {
			console.warn(`Invalid function in field: ${fieldName}`);
		}
	}
	return transformedMappings
}
