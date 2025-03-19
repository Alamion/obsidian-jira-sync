import JiraPlugin from "../main";
import {TFile} from "obsidian";
import {createJiraIssue, updateJiraIssue, updateJiraStatus} from "../api";
import {prepareJiraFieldsFromFile} from "./common_prepareData";
import {updateJiraToLocal} from "../tools/mappingObsidianJiraFields";
import {JiraIssue, JiraTransitionType} from "../interfaces";

/**
 * Update an issue in Jira from the current file
 * @param plugin The plugin instance
 * @param file The file containing the issue data
 */
export async function updateIssueFromFile(plugin: JiraPlugin, file: TFile): Promise<string> {
	const { fields, issueKey } = await prepareJiraFieldsFromFile(plugin, file);

	if (!issueKey) {
		throw new Error("No issue key found in frontmatter");
	}

	await updateJiraIssue(plugin, issueKey, fields);
	return issueKey;
}


/**
 * Create a new issue in Jira from the current file
 * @param plugin The plugin instance
 * @param file The file containing the issue data
 * @param projectKey The project key (overrides frontmatter if provided)
 * @param issueType The issue type (overrides frontmatter if provided)
 * @returns The created issue key
 */
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


/**
 * Update an issue status in Jira from the current file
 * @param plugin The plugin instance
 * @param file The file containing the issue data
 * @param transition The transition to update the issue to
 */
export async function updateStatusFromFile(plugin: JiraPlugin, file: TFile, transition: JiraTransitionType): Promise<string> {
	const { fields, issueKey } = await prepareJiraFieldsFromFile(plugin, file);

	if (!issueKey) {
		throw new Error("No issue key found in frontmatter");
	}

	await updateJiraStatus(plugin, issueKey, transition.id);
	await updateJiraToLocal(plugin, file, {fields: {status: {name: transition.status}}} as JiraIssue);
	return issueKey;
}
