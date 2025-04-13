import {Notice, TFile} from "obsidian";
import JiraPlugin from "../main";
import {IssueSearchModal} from "../modals";
import {fetchIssue, validateSettings} from "../api";
import {createOrUpdateIssueNote} from "../file_operations/getIssue";
import {checkCommandCallback} from "../tools/check_command_callback";

export function registerGetIssueCommandWithKey(plugin: JiraPlugin): void {
	plugin.addCommand({
		id: "get-issue-jira-key",
		name: "Get issue from Jira with custom key",
		checkCallback: (checking: boolean) => {
			const settings_are_valid = validateSettings(plugin);
			if (settings_are_valid) {
				if (!checking) openIssueModal(plugin);
				return true;
			}
			return false;
		},
	});
}

export function registerGetIssueCommand(plugin: JiraPlugin): void {
	plugin.addCommand({
		id: "get-issue-jira",
		name: "Get current issue from Jira",
		checkCallback: (checking: boolean) => {
			return checkCommandCallback(plugin, checking, fetchAndOpenIssue, ["key"], ["key"]);
		},
	});
}

function openIssueModal(plugin: JiraPlugin): void {
	new IssueSearchModal(plugin.app, async (issueKey: string) => {
		await fetchAndOpenIssue(plugin, null, issueKey);
	}).open();
}

export async function fetchAndOpenIssue(plugin: JiraPlugin, file: TFile | null, issueKey: string): Promise<void> {
	try {
		const issue = await fetchIssue(plugin, issueKey);
		await createOrUpdateIssueNote(plugin, issue, file?.path);
	} catch (error) {
		new Notice("Error retrieving issue: " + (error.message || "Unknown error"));
		console.error(error);
	}
}
