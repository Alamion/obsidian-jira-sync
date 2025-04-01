import JiraPlugin from "../main";
import {Notice, TFile} from "obsidian";
import {extractAllJiraSyncValuesFromContent} from "../tools/sectionTools";
import {fieldMappings, localToJiraFields} from "../tools/mappingObsidianJiraFields";
import {debugLog} from "../tools/debugLogging";

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
		debugLog(`Received frontmatter info: ${JSON.stringify(frontmatter)}`)
		// Get issue key if exists
		issueKey = frontmatter["key"];

		// Convert frontmatter and sections to Jira fields
		fields = localToJiraFields(
			{...syncSections, ...frontmatter},
			{...fieldMappings, ...plugin.settings.fieldMappings});
	});

	return { fields, issueKey };
}

export function getCurrentFileMainInfo(plugin: JiraPlugin):{issueKey?: string, filePath?: string} {
	const file = plugin.app.workspace.getActiveFile();
	if (!file) {
		new Notice("No active file");
		return {};
	}
	const frontmatter = plugin.app.metadataCache.getFileCache(file)?.frontmatter;
	let issueKey = frontmatter? frontmatter["key"] as string | undefined : undefined;
	return {issueKey, filePath: file.path};
}
