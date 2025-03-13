import JiraPlugin from "../main";
import {Notice, TFile} from "obsidian";
import {extractAllJiraSyncValuesFromContent} from "../tools/sectionTools";
import {fieldMappings, localToJiraFields} from "../tools/mappingObsidianJiraFields";

/**
 * Prepares Jira fields from the content and frontmatter of a file
 * @param plugin The plugin instance
 * @param file The file to extract data from
 * @returns Object with fields for Jira API
 */
export async function prepareJiraFieldsFromFile(
	plugin: JiraPlugin,
	file: TFile
): Promise<{fields: Record<string, any>, issueKey?: string}> {
	// Read file content
	const fileContent = await plugin.app.vault.read(file);

	// Extract all sync sections
	const syncSections = extractAllJiraSyncValuesFromContent(fileContent);

	// Initialize fields object
	let fields: Record<string, any> = {};
	let issueKey: string | undefined;

	// Get frontmatter and prepare fields
	await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
		// Get issue key if exists
		issueKey = frontmatter["key"];

		// Convert frontmatter and sections to Jira fields
		fields = localToJiraFields(
			{...frontmatter, ...syncSections},
			{...fieldMappings, ...plugin.settings.fieldMappings});
	});

	return { fields, issueKey };
}

export async function getCurrentFileMainInfo(plugin: JiraPlugin): Promise<{issueKey?: string, filePath?: string}> {
	const file = plugin.app.workspace.getActiveFile();
	if (!file) {
		new Notice("No active file");
		return {};
	}
	const {issueKey} = await prepareJiraFieldsFromFile(plugin, file);
	return {issueKey, filePath: file.path};
}
