import { JiraFieldMapping, JiraFieldMappingString } from "../../interfaces/settingsTypes";
import {
	jiraFunctionToString,
	transform_string_to_functions_mappings,
	// validateFunctionString
} from "../../tools/convertFunctionString";
import { debugLog } from "../../tools/debugLogging";

/**
 * Convert function mappings to their string representation
 */
export function convertFunctionMappingsToStrings(
	mappings: Record<string, JiraFieldMapping>
): Record<string, JiraFieldMappingString> {
	const result: Record<string, JiraFieldMappingString> = {};

	for (const [fieldName, mapping] of Object.entries(mappings)) {
		if (mapping && typeof mapping === 'object' && 'toJira' in mapping && 'fromJira' in mapping) {
			result[fieldName] = {
				toJira: jiraFunctionToString(mapping.toJira, false),
				fromJira: jiraFunctionToString(mapping.fromJira, true)
			};
		}
	}

	return result;
}

/**
 * Collect field mappings from the UI
 */
export async function collectFieldMappingsFromUI(
	element: HTMLElement,
	// enableValidation: boolean
): Promise<Record<string, JiraFieldMappingString>> {
	const mappings: Record<string, JiraFieldMappingString> = {};
	const fieldItems = element.querySelectorAll(".field-mapping-item");

	fieldItems.forEach(item => {
		const fieldNameInput = item.querySelector(".field-name-input");
		const toJiraInput = item.querySelector(".to-jira-input");
		const fromJiraInput = item.querySelector(".from-jira-input");

		if (!fieldNameInput || !toJiraInput || !fromJiraInput) {
			return;
		}

		const fieldName = (fieldNameInput as HTMLInputElement).value.trim();
		const toJira = (toJiraInput as HTMLTextAreaElement).value.trim();
		const fromJira = (fromJiraInput as HTMLTextAreaElement).value.trim();

		// Only save valid mappings with field name filled
		if (fieldName) {
			mappings[fieldName] = {
				toJira: toJira,
				fromJira: fromJira
			};
		}
	});

	debugLog(`Collected mappings: ${JSON.stringify(mappings)}`);
	return mappings;
}

/**
 * Process string mappings to function mappings
 */
export async function processMappings(
	stringMappings: Record<string, JiraFieldMappingString>,
	enableValidation: boolean
): Promise<{
	stringMappings: Record<string, JiraFieldMappingString>,
	functionMappings: Record<string, JiraFieldMapping>
}> {
	// Convert string mappings to function mappings
	const functionMappings = await transform_string_to_functions_mappings(
		stringMappings,
		enableValidation
	);

	return {
		stringMappings,
		functionMappings
	};
}
