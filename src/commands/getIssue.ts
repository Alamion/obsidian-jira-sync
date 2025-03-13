import {Notice} from "obsidian";
import JiraPlugin from "../main";
import {IssueSearchModal} from "../modals";
import {authenticate, fetchIssue} from "../api";
import {getCurrentFileMainInfo} from "../file_operations/common_prepareData";
import {createOrUpdateIssueNote} from "../file_operations/getIssue";

/**
 * Register the get issue command
 */
export function registerGetIssueCommandWithKey(plugin: JiraPlugin): void {
	plugin.addCommand({
		id: "get-issue-jira-key",
		name: "Get issue from Jira with custom key",
		callback: async () => {
			openIssueModal(plugin);
		},
	});
}

/**
 * Register the get issue command
 */
export function registerGetIssueCommand(plugin: JiraPlugin): void {
	plugin.addCommand({
		id: "get-issue-jira",
		name: "Get issue from Jira",
		callback: async () => {
			const { issueKey, filePath } = await getCurrentFileMainInfo(plugin);
			if (filePath && issueKey) {
				await fetchAndOpenIssue(plugin, issueKey, filePath);
			} else {
				new Notice("No active file or issue key found");
			}
		},
	});
}


/**
 * Open the issue selection modal
 */
function openIssueModal(plugin: JiraPlugin): void {
	new IssueSearchModal(plugin.app, async (issueKey: string) => {
		await fetchAndOpenIssue(plugin, issueKey);
	}).open();
}

/**
 * Fetch an issue from Jira and open it in Obsidian
 * @param plugin The plugin instance
 * @param issueKey The issue key to fetch
 * @param filePath The file path to open
 */
export async function fetchAndOpenIssue(plugin: JiraPlugin, issueKey: string, filePath?: string): Promise<void> {
	try {
		if (!(await authenticate(plugin))) {
			return;
		}

		const issue = await fetchIssue(plugin, issueKey);
		await createOrUpdateIssueNote(plugin, issue, filePath);
	} catch (error) {
		new Notice("Error retrieving issue: " + (error.message || "Unknown error"));
		console.error(error);
	}
}
