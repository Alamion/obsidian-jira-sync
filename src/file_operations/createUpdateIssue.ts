import JiraPlugin from '../main';
import { TFile } from 'obsidian';
import { createJiraIssue, fetchIssue, updateJiraIssue, updateJiraStatus } from '../api';
import { prepareJiraFieldsFromFile } from './commonPrepareData';
import { localToJiraFields, updateJiraToLocal } from '../tools/mapObsidianJiraFields';
import { JiraIssue, JiraTransitionType } from '../interfaces';
import { obsidianJiraFieldMappings } from '../default/obsidianJiraFieldsMapping';
import { updateJiraSyncContent } from '../tools/sectionTools';

export async function updateIssueFromFile(plugin: JiraPlugin, file: TFile): Promise<string> {
	let fields = await prepareJiraFieldsFromFile(plugin, file);
	const issueKey = fields.key;
	const apiVersion = plugin.getCurrentConnection()?.apiVersion;

	if (!issueKey) {
		throw new Error('No issue key found in frontmatter');
	}

	fields = localToJiraFields(
		fields,
		{
			...obsidianJiraFieldMappings,
			...plugin.settings.fieldMapping.fieldMappings,
		},
		apiVersion,
	);
	await updateJiraIssue(plugin, issueKey, fields);
	return issueKey;
}

export async function createIssueFromFile(
	plugin: JiraPlugin,
	file: TFile,
	fields?: Record<string, any>,
): Promise<string> {
	const apiVersion = plugin.getCurrentConnection()?.apiVersion;
	if (!fields) {
		fields = await prepareJiraFieldsFromFile(plugin, file);
	}
	fields = localToJiraFields(
		fields,
		{
			...obsidianJiraFieldMappings,
			...plugin.settings.fieldMapping.fieldMappings,
		},
		apiVersion,
	);
	// Create the issue
	const issueData = await createJiraIssue(plugin, fields);
	const issueKey = issueData.key;

	// Update frontmatter with the new issue key
	await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter['key'] = issueKey;
	});

	// Pull the created issue back from Jira to populate all remaining synced fields
	const createdIssue = await fetchIssue(plugin, issueKey);
	await updateJiraToLocal(plugin, file, createdIssue);

	return issueKey;
}

export async function updateStatusFromFile(
	plugin: JiraPlugin,
	file: TFile,
	transition: JiraTransitionType,
): Promise<string> {
	const fields = await prepareJiraFieldsFromFile(plugin, file);

	if (!fields.key) {
		throw new Error('No issue key found in frontmatter');
	}

	await updateJiraStatus(plugin, fields.key, transition.id);

	// Only update the status field. Calling updateJiraToLocal with a partial issue
	// causes all fromJira mappings to run with undefined inputs, producing empty strings
	// that overwrite description and comments.
	const allMappings = {...obsidianJiraFieldMappings, ...plugin.settings.fieldMapping.fieldMappings};
	const statusMapping = allMappings['status'];
	const minimalIssue = {fields: {status: {name: transition.status}}} as JiraIssue;
	const localStatusValue = statusMapping
		? statusMapping.fromJira(minimalIssue, {})
		: transition.status;

	if (localStatusValue !== null && localStatusValue !== undefined) {
		await plugin.app.fileManager.processFrontmatter(file, (frontmatter) => {
			frontmatter['status'] = localStatusValue;
		});
		await plugin.app.vault.process(file, (fileContent) => {
			return updateJiraSyncContent(fileContent, {status: String(localStatusValue)});
		});
	}
	return fields.key;
}
