import {Notice, TFile} from "obsidian";
import JiraPlugin from "../main";
import {fetchIssueTransitions} from "../api";
import {updateStatusFromFile} from "../file_operations/createUpdateIssue";
import {IssueStatusModal} from "../modals/IssueStatusModal";
import {JiraTransitionType} from "../interfaces";
import {checkCommandCallback} from "../tools/check_command_callback";

export function registerUpdateIssueStatusCommand(plugin: JiraPlugin): void {
	plugin.addCommand({
		id: "update-issue-status-jira",
		name: "Update issue status in Jira",
		checkCallback: (checking: boolean) => {
			return checkCommandCallback(plugin, checking, updateIssueStatus, ["key"],["key"]);
		},
	});
}

export async function updateIssueStatus(plugin: JiraPlugin, file: TFile, issueKey?: string): Promise<void> {
	try {
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
