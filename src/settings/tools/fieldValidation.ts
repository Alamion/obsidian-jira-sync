import { Notice } from "obsidian";
import { ValidationResult } from "../../interfaces/settingsTypes";
import { validateFunctionString } from "../../tools/convertFunctionString";
import { debugLog } from "../../tools/debugLogging";

/**
 * Validate a field and update its visual state
 */
export async function validateField(
	input: HTMLInputElement | HTMLTextAreaElement,
	requireValidating: boolean = true,
	type: string = 'string',
	validateParams: Array<string> = []
): Promise<void> {
	const validatorFunction = async (event?: Event) => {
		const consoleOutput = !!event;
		const validation = await getValidationResult(input.value, type, validateParams);
		updateFieldAppearance(validation, input, consoleOutput);
	};

	// Store the validator function on the element to allow for removal
	setupValidatorProperty(input, validatorFunction);

	if (requireValidating) {
		input.addEventListener("change", (input as any)._validatorFunction);
		await validatorFunction(); // Run initial validation
	} else {
		input.removeEventListener("change", (input as any)._validatorFunction);
		updateFieldAppearance({ isValid: true }, input, false); // Clear any validation errors
	}
}

/**
 * Get validation result based on type and value
 */
async function getValidationResult(
	value: string,
	type: string = 'string',
	validateParams: Array<string> = []
): Promise<ValidationResult> {
	switch(type) {
		case 'string':
			return value.length === 0
				? { isValid: false, errorMessage: "Field name cannot be empty" }
				: { isValid: true };
		case 'function':
			return await validateFunctionString(value, validateParams);
		default:
			return { isValid: true };
	}
}

/**
 * Update the field appearance based on validation result
 */
export function updateFieldAppearance(
	validation: ValidationResult,
	element: HTMLInputElement | HTMLTextAreaElement,
	consoleOutput: boolean
): void {
	if (!validation.isValid) {
		element.classList.add("invalid");
		if (consoleOutput && validation.errorMessage) {
			debugLog(validation.errorMessage);
			new Notice(validation.errorMessage);
		}
	} else {
		element.classList.remove("invalid");
	}
}

/**
 * Setup validator property on input element
 */
function setupValidatorProperty(
	input: HTMLInputElement | HTMLTextAreaElement,
	validatorFunction: (event?: Event) => Promise<void>
): void {
	if (!input.hasOwnProperty('_validatorFunction')) {
		Object.defineProperty(input, '_validatorFunction', {
			value: validatorFunction,
			writable: true,
			configurable: true
		});
	} else {
		input.removeEventListener("change", (input as any)._validatorFunction);
		(input as any)._validatorFunction = validatorFunction;
	}
}
