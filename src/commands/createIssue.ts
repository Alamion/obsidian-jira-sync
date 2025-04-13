import { Notice, TFile } from "obsidian";
import JiraPlugin from "../main";
import { IssueTypeModal, ProjectModal } from "../modals";
import {fetchIssueTypes, fetchProjects} from "../api";
import {createIssueFromFile} from "../file_operations/createUpdateIssue";
import {checkCommandCallback} from "../tools/check_command_callback";

/**
 * Register the create issue command
 */
export function registerCreateIssueCommand(plugin: JiraPlugin): void {
	plugin.addCommand({
		id: "create-issue-jira",
		name: "Create issue in Jira",
		checkCallback: (checking: boolean) => {
			return checkCommandCallback(plugin, checking, createIssue, ["summary"]);
		},
	});
}

/**
 * Create a new issue in Jira from the current note
 */
export async function createIssue(plugin: JiraPlugin, file: TFile): Promise<void> {
	try {

		// Fetch projects to show in selection modal
		await fetchProjects(plugin);

		// Open project selection modal
		new ProjectModal(plugin.app, plugin.temp_vars.projects, async (projectKey: string) => {
			// Fetch issue types for the selected project
			await fetchIssueTypes(plugin, projectKey);

			// Open issue type selection modal
			new IssueTypeModal(plugin.app, plugin.temp_vars.issueTypes, async (issueType: string) => {
				try {
					// Create the issue with selected project and issue type
					const issueKey = await createIssueFromFile(plugin, file, projectKey, issueType);
					new Notice(`Issue ${issueKey} created successfully`);
				} catch (error) {
					new Notice("Error creating issue: " + (error.message || "Unknown error"), 3000);
					console.error(error);
				}
			}).open();
		}).open();
	} catch (error) {
		new Notice("Error creating issue: " + (error.message || "Unknown error"));
		console.error(error);
	}
}
