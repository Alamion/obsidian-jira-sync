import { JiraIssue } from "../interfaces";
import {jiraToMarkdown} from "./markdown_html";
import {Notice, TFile} from "obsidian";
import JiraPlugin from "../main";
import {extractAllJiraSyncValuesFromContent, updateJiraSyncContent} from "./sectionTools";

export interface FieldMapping {
	toJira: (value: any) => any;
	fromJira: (issue: JiraIssue, data_source: Record<string, any> | null) => any;
}

export const fieldMappings: Record<string, FieldMapping> = {
	"summary": {
		toJira: (value) => value,
		fromJira: (issue) => issue.fields.summary,
	},
	"description": {
		toJira: () => null, // markdownToJira is applied separately
		fromJira: (issue) => issue.fields.description,
	},
	"key": {
		toJira: () => null, // Not sent to Jira
		fromJira: (issue) => issue.key,
	},
	"self": {
		toJira: () => null,
		fromJira: (issue) => issue.self,
	},
	"project": {
		toJira: (value) => ({ key: value }),
		fromJira: (issue) =>
			issue.fields.project ?issue.fields.project.key :"",
	},
	"issuetype": {
		toJira: (value) => ({ name: value }),
		fromJira: (issue) =>
			issue.fields.issuetype ?issue.fields.issuetype.name :"",
	},
	"priority": {
		toJira: (value) => ({ name: value }),
		fromJira: (issue) =>issue.fields.priority ?issue.fields.priority.name :"",
	},
	"status": {
		toJira: () => null,
		fromJira: (issue) =>issue.fields.status ?issue.fields.status.name :"",
	},
	"assignee": {
		toJira: (value) => ({ name: value }),
		fromJira: (issue) =>issue.fields.assignee ?issue.fields.assignee.name :"",
	},
	"reporter": {
		toJira: (value) => ({ name: value }),
		fromJira: (issue) =>issue.fields.reporter ?issue.fields.reporter.name :"",
	},
	"creator": {
		toJira: () => null,
		fromJira: (issue) =>issue.fields.creator ?issue.fields.creator.name :"",
	},
	"lastViewed": {
		toJira: () => null,
		fromJira: (issue) => issue.fields.lastViewed,
	},
	"updated": {
		toJira: () => null,
		fromJira: (issue) => issue.fields.updated,
	},
	"created": {
		toJira: () => null,
		fromJira: (issue) => issue.fields.created,
	},
	"link": {
		toJira: () => null,
		fromJira: (issue) => issue.self.replace(/(\w+:\/\/\S+?)\/.*/, `$1/browse/${issue.key}`),
	},
	"openLink": {
		toJira: () => null,
		fromJira: (issue) => issue.self.replace(/(\w+:\/\/\S+?)\/.*/, `[Open in Jira]($1/browse/${issue.key})`),
	},
	"progress": {
		toJira: () => null,
		fromJira: (issue) => issue.fields.aggregateprogress.percent+'%',
	},
};

/**
 * Determines if a field should be mapped to Jira
 * @param fieldName The name of the field
 * @param customFieldMappings The custom field mappings
 */
export function isMappableField(fieldName: string, customFieldMappings: Record<string, FieldMapping>): boolean {
	// Handle custom fields
	// if (fieldName.startsWith('customfield_')) {
	// 	return true;
	// }
	// Check if field is in our mappings
	return fieldName in customFieldMappings;
}

/**
 * Convert frontmatter and section fields to Jira fields structure
 * @param data_source The frontmatter + sections object
 * @param customFieldMappings The custom field mappings
 * @returns Object with Jira API compatible structure
 */
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
		applyJiraDataToLocal(frontmatter, issue, {...fieldMappings, ...plugin.settings.fieldMappings});
	});

	// Then, process the file content to update sync sections
	await plugin.app.vault.process(file, (fileContent) => {
		// Extract existing sync sections
		const syncSections = extractAllJiraSyncValuesFromContent(fileContent);

		// Update sync sections with Jira data
		applyJiraDataToLocal(syncSections, issue, {...fieldMappings, ...plugin.settings.fieldMappings});

		// Update content sections from Jira fields
		let updatedContent = fileContent;
		for (const [fieldName, fieldValue] of Object.entries(syncSections)) {
			const markdownValue = jiraToMarkdown(fieldValue);
			updatedContent = updateJiraSyncContent(updatedContent, fieldName, markdownValue);
		}

		return updatedContent;
	});
}

/**
 * Apply Jira data to local records using field mappings
 * @param localData - The local data to update (frontmatter or sections)
 * @param issue - The Jira issue with source data
 * @param fieldMappings - Custom field mappings for transformations
 */
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
	const requiredFields = ['key', 'summary'];
	for (const field of requiredFields) {
		if (!(field in localData)) {
			updateFieldFromJira(field, localData, issue, fieldMappings);
		}
	}
}

/**
 * Update a single field from Jira data
 * @param key - The field key to update
 * @param targetObject - The object to update (frontmatter or sections)
 * @param issue - The Jira issue with source data
 * @param fieldMappings - Custom field mappings for transformations
 */
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
