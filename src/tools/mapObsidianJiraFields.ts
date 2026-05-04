import { JiraIssue } from '../interfaces';
import { Notice, TFile } from 'obsidian';
import JiraPlugin from '../main';
import { extractAllJiraSyncValuesFromContent, updateJiraSyncContent } from './sectionTools';
import { FieldMapping, obsidianJiraFieldMappings } from '../default/obsidianJiraFieldsMapping';
import { debugLog } from './debugLogging';

export function localToJiraFields(
	data_source: Record<string, any>,
	customFieldMappings: Record<string, FieldMapping>,
	apiVersion?: '2' | '3',
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
				const result = mapping.toJira(value, apiVersion);

				// Skip fields that shouldn't be sent to Jira
				if (result === null) continue;

				jiraFields[key] = result;
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

export async function updateJiraToLocal(plugin: JiraPlugin, file: TFile, issue: JiraIssue): Promise<void> {
	const apiVersion = plugin.getCurrentConnection()?.apiVersion;
	// First, update the frontmatter using processFrontMatter
	await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
		// Update frontmatter with Jira data
		applyJiraDataToLocal(
			frontmatter,
			issue,
			{
				...obsidianJiraFieldMappings,
				...plugin.settings.fieldMapping.fieldMappings,
			},
			apiVersion,
		);
	});

	// Then, process the file content to update sync sections
	await plugin.app.vault.process(file, (fileContent) => {
		// Extract existing sync sections
		const syncSections = extractAllJiraSyncValuesFromContent(fileContent);

		// Update sync sections with Jira data
		applyJiraDataToLocal(
			syncSections,
			issue,
			{
				...obsidianJiraFieldMappings,
				...plugin.settings.fieldMapping.fieldMappings,
			},
			apiVersion,
		);

		// Update content sections from Jira fields
		let updatedContent = fileContent;
		let updatesDict: Record<string, string> = {};
		for (const [fieldName, fieldValue] of Object.entries(syncSections)) {
			updatesDict[fieldName] = fieldValue;
		}

		debugLog(`Updating sync sections: ${JSON.stringify(updatesDict)}`);
		updatedContent = updateJiraSyncContent(updatedContent, updatesDict);

		return updatedContent;
	});
}

export function applyJiraDataToLocal(
	localData: Record<string, any>,
	issue: JiraIssue,
	fieldMappings: Record<string, FieldMapping>,
	apiVersion?: '2' | '3',
): void {
	// Process existing fields in local data
	for (const key of Object.keys(localData)) {
		updateFieldFromJira(key, localData, issue, fieldMappings, apiVersion);
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
	fieldMappings: Record<string, FieldMapping>,
	apiVersion?: '2' | '3',
): void {
	try {
		let value = issue.fields[key];

		// Apply custom mapping if available
		if (key in fieldMappings) {
			value = fieldMappings[key].fromJira(issue, apiVersion, targetObject);
		}
		// debugLog(`Updating field: ${key}: ${issue.fields[key]}`);

		// Only update if value exists
		if (value !== null && value !== undefined) {
			targetObject[key] = value;
		}
	} catch (e) {
		// Log available mappings for debugging
		logMappingDebugInfo(key, e as Error, fieldMappings);
	}
}

/**
 * Log debug information for mapping errors
 */
function logMappingDebugInfo(key: string, error: Error, fieldMappings: Record<string, FieldMapping>): void {
	console.error(`Error mapping for ${key}: ${error}`);
	new Notice(`Error mapping for ${key}: ${error}`);

	// Create debug info about available mappings
	const mappingInfo: Record<string, { toJira: string; fromJira: string }> = {};

	for (const mappingKey of Object.keys(fieldMappings)) {
		mappingInfo[mappingKey] = {
			toJira: fieldMappings[mappingKey].toJira.toString().trim(),
			fromJira: fieldMappings[mappingKey].fromJira.toString().trim(),
		};
	}

	console.debug(`Available mappings:`, mappingInfo);
}
