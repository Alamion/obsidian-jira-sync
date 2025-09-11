import JiraPlugin from "../main";
import {TFile} from "obsidian";
import {createJiraIssue, updateJiraIssue, updateJiraStatus} from "../api";
import {prepareJiraFieldsFromFile} from "./commonPrepareData";
import {localToJiraFields, updateJiraToLocal} from "../tools/mapObsidianJiraFields";
import {JiraIssue, JiraTransitionType} from "../interfaces";
import {obsidianJiraFieldMappings} from "../default/obsidianJiraFieldsMapping";

export async function updateIssueFromFile(plugin: JiraPlugin, file: TFile): Promise<string> {
	let fields = await prepareJiraFieldsFromFile(plugin, file);
	const issueKey = fields.key;

	if (!issueKey) {
		throw new Error("No issue key found in frontmatter");
	}

	fields = localToJiraFields(fields, {...obsidianJiraFieldMappings, ...plugin.settings.fieldMappings});
	await updateJiraIssue(plugin, issueKey, fields);
	return issueKey;
}

export async function createIssueFromFile(
	plugin: JiraPlugin,
	file: TFile,
	fields?: Record<string, any>,
): Promise<string> {
	if (!fields) {
		fields = await prepareJiraFieldsFromFile(plugin, file);
	}
	fields = localToJiraFields(fields, {...obsidianJiraFieldMappings, ...plugin.settings.fieldMappings});
	// Create the issue
	const issueData = await createJiraIssue(plugin, fields);
	const issueKey = issueData.key;

	// Update frontmatter with the new issue key
	await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter["key"] = issueKey;
	});

	return issueKey;
}

export async function updateStatusFromFile(plugin: JiraPlugin, file: TFile, transition: JiraTransitionType): Promise<string> {
	const fields = await prepareJiraFieldsFromFile(plugin, file);

	if (!fields.key) {
		throw new Error("No issue key found in frontmatter");
	}

	await updateJiraStatus(plugin, fields.key, transition.id);
	await updateJiraToLocal(plugin, file, {fields: {status: {name: transition.status}}} as JiraIssue);
	return fields.key;
}
