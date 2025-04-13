import JiraPlugin from "../main";
import {TFile} from "obsidian";
import {createJiraIssue, updateJiraIssue, updateJiraStatus} from "../api";
import {prepareJiraFieldsFromFile} from "./common_prepareData";
import {updateJiraToLocal} from "../tools/mapObsidianJiraFields";
import {JiraIssue, JiraTransitionType} from "../interfaces";

export async function updateIssueFromFile(plugin: JiraPlugin, file: TFile): Promise<string> {
	const { fields, issueKey } = await prepareJiraFieldsFromFile(plugin, file);

	if (!issueKey) {
		throw new Error("No issue key found in frontmatter");
	}

	await updateJiraIssue(plugin, issueKey, fields);
	return issueKey;
}

export async function createIssueFromFile(
	plugin: JiraPlugin,
	file: TFile,
	projectKey?: string,
	issueType?: string
): Promise<string> {
	const { fields } = await prepareJiraFieldsFromFile(plugin, file);

	// Override project and issue type if provided
	if (projectKey) {
		fields.project = { key: projectKey };
	}

	if (issueType) {
		fields.issuetype = { name: issueType };
	}

	// Ensure required fields
	if (!fields.summary) {
		throw new Error("Summary is required in frontmatter");
	}

	if (!fields.project) {
		throw new Error("Project is required in frontmatter or as parameter");
	}

	if (!fields.issuetype) {
		throw new Error("Issue type is required in frontmatter or as parameter");
	}

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
	const { issueKey } = await prepareJiraFieldsFromFile(plugin, file);

	if (!issueKey) {
		throw new Error("No issue key found in frontmatter");
	}

	await updateJiraStatus(plugin, issueKey, transition.id);
	await updateJiraToLocal(plugin, file, {fields: {status: {name: transition.status}}} as JiraIssue);
	return issueKey;
}
