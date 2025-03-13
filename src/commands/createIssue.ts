import { MarkdownView, Notice, TFile } from "obsidian";
import JiraPlugin from "../main";
import { IssueTypeModal, ProjectModal } from "../modals";
import { authenticate, fetchIssueTypes, fetchProjects } from "../api";
import {createIssueFromFile} from "../file_operations/createUpdateIssue";

/**
 * Register the create issue command
 */
export function registerCreateIssueCommand(plugin: JiraPlugin): void {
	plugin.addCommand({
		id: "create-issue-jira",
		name: "Create issue in Jira",
		callback: async () => {
			await createIssue(plugin);
		},
	});
}

/**
 * Create a new issue in Jira from the current note
 */
export async function createIssue(plugin: JiraPlugin): Promise<void> {
	try {
		if (!(await authenticate(plugin))) {
			return;
		}

		const file = plugin.app.workspace.getActiveFile();
		if (!file) {
			new Notice("No active file");
			return;
		}

		// Check if summary exists in frontmatter
		let hasSummary = false;

		await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
			hasSummary = !!frontmatter["summary"];
		});

		if (!hasSummary) {
			new Notice("Please set a summary in the frontmatter or section for the task");
			return;
		}

		// Fetch projects to show in selection modal
		await fetchProjects(plugin);

		// Open project selection modal
		new ProjectModal(plugin.app, plugin.projects, async (projectKey: string) => {
			// Fetch issue types for the selected project
			await fetchIssueTypes(plugin, projectKey);

			// Open issue type selection modal
			new IssueTypeModal(plugin.app, plugin.issueTypes, async (issueType: string) => {
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
