import { JiraIssue } from "../interfaces";
import {jiraToMarkdown} from "./markdown_html";
import {Notice, TFile} from "obsidian";
import JiraPlugin from "../main";
import {extractAllJiraSyncValuesFromContent, updateJiraSyncContent} from "./sectionTools";
import {FieldMapping, obsidianJiraFieldMappings} from "../default/obsidianJiraFieldsMapping";


export function localToJiraFields(
	data_source: Record<string, any>, customFieldMappings: Record<string, FieldMapping>
): Record<string, any> {
	const jiraFields: Record<string, any> = {};

	// Process frontmatter fields
	for (const [key, value] of Object.entries(data_source)) {
		// Skip internal fields
		if (key.startsWith('_') || value === null || value === undefined) {
			continue;
		}

		// Handle known fields with mappings
		if (key in customFieldMappings) {
			const mapping = customFieldMappings[key];

			try {
				// Skip fields that shouldn't be sent to Jira
				if (mapping.toJira(value) === null) continue;

				jiraFields[key] = mapping.toJira(value);
			} catch (e) {
				console.error(`Error mapping for ${key}: ${e}`);
				new Notice(`Error mapping for ${key}: ${e}`);

			}
		}
		// Handle custom fields
		else {
			// jiraFields[key] = value;
		}
	}

	return jiraFields;
}

export async function updateJiraToLocal(
	plugin: JiraPlugin,
	file: TFile,
	issue: JiraIssue
): Promise<void> {
	// First, update the frontmatter using processFrontMatter
	await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
		// Update frontmatter with Jira data
		applyJiraDataToLocal(frontmatter, issue, {...obsidianJiraFieldMappings, ...plugin.settings.fieldMappings});
	});

	// Then, process the file content to update sync sections
	await plugin.app.vault.process(file, (fileContent) => {
		// Extract existing sync sections
		const syncSections = extractAllJiraSyncValuesFromContent(fileContent);

		// Update sync sections with Jira data
		applyJiraDataToLocal(syncSections, issue, {...obsidianJiraFieldMappings, ...plugin.settings.fieldMappings});

		// Update content sections from Jira fields
		let updatedContent = fileContent;
		for (const [fieldName, fieldValue] of Object.entries(syncSections)) {
			const markdownValue = jiraToMarkdown(fieldValue);
			updatedContent = updateJiraSyncContent(updatedContent, fieldName, markdownValue);
		}

		return updatedContent;
	});
}

export function applyJiraDataToLocal(
	localData: Record<string, any>,
	issue: JiraIssue,
	fieldMappings: Record<string, FieldMapping>
): void {
	// Process existing fields in local data
	for (const key of Object.keys(localData)) {
		updateFieldFromJira(key, localData, issue, fieldMappings);
	}

	// Ensure required fields are always processed
	// const requiredFields = ['key', 'summary'];
	// for (const field of requiredFields) {
	// 	if (!(field in localData)) {
	// 		updateFieldFromJira(field, localData, issue, fieldMappings);
	// 	}
	// }
}

function updateFieldFromJira(
	key: string,
	targetObject: Record<string, any>,
	issue: JiraIssue,
	fieldMappings: Record<string, FieldMapping>
): void {
	try {
		let value = issue.fields[key];

		// Apply custom mapping if available
		if (key in fieldMappings) {
			value = fieldMappings[key].fromJira(issue, targetObject);
		}

		// Only update if value exists
		if (value !== null && value !== undefined) {
			targetObject[key] = value;
		}
	} catch (e) {
		// Log available mappings for debugging
		logMappingDebugInfo(key, e, fieldMappings);
	}
}

/**
 * Log debug information for mapping errors
 */
function logMappingDebugInfo(
	key: string,
	error: Error,
	fieldMappings: Record<string, FieldMapping>
): void {
	console.error(`Error mapping for ${key}: ${error}`);
	new Notice(`Error mapping for ${key}: ${error}`);

	// Create debug info about available mappings
	const mappingInfo: Record<string, { hasToJira: string, hasFromJira: string }> = {};

	for (const mappingKey of Object.keys(fieldMappings)) {
		mappingInfo[mappingKey] = {
			hasToJira: typeof fieldMappings[mappingKey].toJira,
			hasFromJira: typeof fieldMappings[mappingKey].fromJira
		};
	}

	console.debug(`Available mappings: ${JSON.stringify(mappingInfo)}`);
}
