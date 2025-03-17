import { JiraIssue } from "../interfaces";
import {jiraToMarkdown, markdownToJira} from "../markdown_html";
import {Notice, TFile} from "obsidian";
import JiraPlugin from "../main";
import {extractAllJiraSyncValuesFromContent, updateJiraSyncContent} from "./sectionTools";
import {debugLog} from "./debugLogging";

/**
 * Field mapping configurations
 * This central configuration defines how fields are transformed between
 * Jira and Obsidian frontmatter/sections
 */
export interface FieldMapping {
	// Function to transform a value from Obsidian to Jira format
	toJira: (value: any) => any;
	// Function to transform a value from Jira to Obsidian format
	fromJira: (issue: JiraIssue, data_source: Record<string, any>) => any;
}

/**
 * Central field mappings configuration
 * Add new fields here with their transformation logic
 */
export const fieldMappings: Record<string, FieldMapping> = {
	// Core fields
	"summary": {
		toJira: (value) => value,
		fromJira: (issue) => issue.fields.summary,
	},
	"description": {
		toJira: (value) => value, // markdownToJira is applied separately
		fromJira: (issue) => issue.fields.description,
	},
	"key": {
		toJira: () => null, // Not sent to Jira
		fromJira: (issue) => issue.key,
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
	"lastViewed": {
		toJira: () => null,
		fromJira: (issue) => issue.fields["lastViewed"],
	},
	// Add more fields as needed following the same pattern

	// Forbidden
	"tags": {
		toJira: () => null,
		fromJira: () => null,
	},
	"aliases": {
		toJira: () => null,
		fromJira: () => null,
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
			jiraFields[key] = value;
		}
	}

	return jiraFields;
}

export async function updateLocalFromJira(
	plugin: JiraPlugin,
	file: TFile,
	issue: JiraIssue
): Promise<void> {
	// Read the current file content
	let fileContent = await plugin.app.vault.read(file);

	// Extract existing sync sections
	const syncSections = extractAllJiraSyncValuesFromContent(fileContent);

	// Update frontmatter
	await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
		updateLocalRecordsFromJira(frontmatter, syncSections, issue,
			{...fieldMappings, ...plugin.settings.fieldMappings});
	});

	// Read the updated content (with new frontmatter)
	fileContent = await plugin.app.vault.read(file);

	// Update sections from Jira fields if they exist
	for (const [fieldName, fieldValue] of Object.entries(syncSections)) {
		// Only update fields that can be in sections and only existing sections
		debugLog(`Updating ${fieldName} = ${fieldValue} in content`)
		const markdownValue = jiraToMarkdown(fieldValue);
		debugLog(`Converted from jira variant ${fieldValue} to md variant ${markdownValue}`)
		fileContent = updateJiraSyncContent(fileContent, fieldName, markdownValue);
	}

	// Save the updated content
	await plugin.app.vault.modify(file, fileContent);
}

/**
 * Update frontmatter and sections with values from Jira issue
 * @param frontmatter The frontmatter object to update
 * @param sections The sections object to update
 * @param issue The Jira issue
 */
export function updateLocalRecordsFromJira(
	frontmatter: Record<string, any>,
	sections: Record<string, any>,
	issue: JiraIssue,
	customFieldMappings: Record<string, FieldMapping>
): void {
	// Process known fields with mappings
	for (const key of Object.keys(frontmatter) as Array<string>) {

		// Apply transformation if field exists in frontmatter or is required
		if (key in frontmatter || key === 'key' || key === 'summary') {
			let value = issue.fields[key];
			if (key in customFieldMappings) {
				try{
					value = customFieldMappings[key].fromJira(issue, {...frontmatter, ...sections});
				} catch (e) {
					console.error(`Error mapping for ${key}: ${e}`);
					new Notice(`Error mapping for ${key}: ${e}`);
					continue;
				}
			}
			if (value !== null && value !== undefined) {
				frontmatter[key] = value;
			}
		}
	}

	for (const key of Object.keys(sections) as Array<string>) {

		// Apply transformation if field exists in frontmatter or is required
		if (key in sections) {
			let value = issue.fields[key];
			if (key in customFieldMappings) {
				try {
					value = customFieldMappings[key].fromJira(issue, {...frontmatter, ...sections});
				} catch (e) {
					const result: Record<string, {
						hasToJira: string,
						hasFromJira: string
					}> = {};

					for (const key of Object.keys(customFieldMappings)) {
						result[key] = {
							hasToJira: typeof customFieldMappings[key].toJira,
							hasFromJira: typeof customFieldMappings[key].fromJira
						};
					}
					console.error(`Error mapping for ${key}: ${e}\n${JSON.stringify(result)}`);
					new Notice(`Error mapping for ${key}: ${e}`);
					continue;
				}
			}
			if (value !== null && value !== undefined) {
				sections[key] = value;
			}
		}
	}
}
