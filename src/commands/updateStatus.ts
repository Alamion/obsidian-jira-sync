import { Notice } from "obsidian";
import JiraPlugin from "../main";
import {authenticate, fetchIssueTransitions} from "../api";
import {updateIssueFromFile, updateStatusFromFile} from "../file_operations/createUpdateIssue";
import {IssueSearchModal} from "../modals";
import {fetchAndOpenIssue} from "./getIssue";
import {IssueStatusModal} from "../modals/IssueStatusModal";
import {getCurrentFileMainInfo} from "../file_operations/common_prepareData";
import {JiraTransitionType} from "../interfaces";

/**
 * Register the update issue command
 */
export function registerUpdateIssueStatusCommand(plugin: JiraPlugin): void {
	plugin.addCommand({
		id: "update-issue-status-jira",
		name: "Update issue status in Jira",
		callback: async () => {
			await updateIssueStatus(plugin);
		},
	});
}

/**
 * Update an existing issue in Jira from the current note
 */
export async function updateIssueStatus(plugin: JiraPlugin): Promise<void> {
	try {
		if (!(await authenticate(plugin))) {
			return;
		}

		const file = plugin.app.workspace.getActiveFile();
		if (!file) {
			new Notice("No active file");
			return;
		}
		const issueKey = await getCurrentFileMainInfo(plugin);
		const issueTransitions = await fetchIssueTransitions(plugin, issueKey);
		// Update the issue with all data from the file
		new IssueStatusModal(plugin.app, issueTransitions, async (transition: JiraTransitionType) => {
			try {
				await updateStatusFromFile(plugin, file, transition);
				new Notice(`Issue ${issueKey} updated successfully`);
			} catch (error) {
				new Notice("Error updating issue: " + (error.message || "Unknown error"), 3000);
				console.error(error);
			}
		}).open();

	} catch (error) {
		new Notice("Error updating issue: " + (error.message || "Unknown error"));
		console.error(error);
	}
}
