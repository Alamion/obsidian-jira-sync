import {Notice, TFile} from "obsidian";
import JiraPlugin from "../main";
import {authenticate, fetchIssueTransitions} from "../api";
import {updateStatusFromFile} from "../file_operations/createUpdateIssue";
import {IssueStatusModal} from "../modals/IssueStatusModal";
import {JiraTransitionType} from "../interfaces";
import {checkCommandCallback} from "../tools/check_command_callback";

/**
 * Register the update issue command
 */
export function registerUpdateIssueStatusCommand(plugin: JiraPlugin): void {
	plugin.addCommand({
		id: "update-issue-status-jira",
		name: "Update issue status in Jira",
		checkCallback: (checking: boolean) => {
			return checkCommandCallback(plugin, checking, updateIssueStatus, ["key"],["key"]);
		},
	});
}

/**
 * Update an existing issue in Jira from the current note
 */
export async function updateIssueStatus(plugin: JiraPlugin, file: TFile, issueKey?: string): Promise<void> {
	try {
		if (!(await authenticate(plugin))) {
			return;
		}
		const issueTransitions = await fetchIssueTransitions(plugin, issueKey as string);
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
