import { Notice } from "obsidian";
import JiraPlugin from "../main";
import { authenticate } from "../api";
import {updateIssueFromFile} from "../file_operations/createUpdateIssue";

/**
 * Register the update issue command
 */
export function registerUpdateIssueCommand(plugin: JiraPlugin): void {
	plugin.addCommand({
		id: "update-issue-jira",
		name: "Update issue in Jira",
		callback: async () => {
			await updateIssue(plugin);
		},
	});
}

/**
 * Update an existing issue in Jira from the current note
 */
export async function updateIssue(plugin: JiraPlugin): Promise<void> {
	try {
		if (!(await authenticate(plugin))) {
			return;
		}

		const file = plugin.app.workspace.getActiveFile();
		if (!file) {
			new Notice("No active file");
			return;
		}

		try {
			// Update the issue with all data from the file
			const issueKey = await updateIssueFromFile(plugin, file);
			new Notice(`Issue ${issueKey} updated successfully`);
		} catch (error) {
			new Notice("Error updating issue: " + (error.message || "Unknown error"), 3000);
		}
	} catch (error) {
		new Notice("Error updating issue: " + (error.message || "Unknown error"));
	}
}
