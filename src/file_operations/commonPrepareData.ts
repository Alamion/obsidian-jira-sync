import JiraPlugin from "../main";
import {TFile} from "obsidian";
import {extractAllJiraSyncValuesFromContent} from "../tools/sectionTools";

export async function prepareJiraFieldsFromFile(
	plugin: JiraPlugin,
	file: TFile
): Promise<Record<string, any>> {
	const fileContent = await plugin.app.vault.read(file);

	const syncSections = extractAllJiraSyncValuesFromContent(fileContent);

	let fields: Record<string, any> = {};

	await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
		fields = {...syncSections, ...frontmatter};
	});

	return fields;
}

export async function readJiraFieldsFromFile(
	plugin: JiraPlugin,
	file: TFile
): Promise<Record<string, any>> {
	const fileContent = await plugin.app.vault.cachedRead(file);

	const syncSections = extractAllJiraSyncValuesFromContent(fileContent);

	const cachedMetadata = plugin.app.metadataCache.getFileCache(file);
	const frontmatter = cachedMetadata?.frontmatter || {};

	return {...syncSections, ...frontmatter};
}
