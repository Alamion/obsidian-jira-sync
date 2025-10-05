import JiraPlugin from "../main";
import {JQLSearchModal} from "../modals";
import {fetchIssuesByJQL, validateSettings} from "../api";
import {createOrUpdateIssueNote} from "../file_operations/getIssue";
import {useTranslations} from "../localization/translator";
import {Notice} from "obsidian";

const t = useTranslations("commands.batch_fetch_issues").t;

/**
 * Register the batch fetch issues command
 */
export function registerBatchFetchIssuesCommand(plugin: JiraPlugin): void {
	plugin.addCommand({
		id: "batch-fetch-issues-jira",
		name: t("name"),
		checkCallback: (checking: boolean) => {
			const settings_are_valid = validateSettings(plugin);
			if (settings_are_valid) {
				if (!checking) openJQLModal(plugin);
				return true;
			}
			return false;
		},
	});
}

function openJQLModal(plugin: JiraPlugin): void {
	new JQLSearchModal(plugin.app, plugin, async (jql: string) => {
		await batchFetchAndCreateIssues(plugin, jql);
	}).open();
}

export async function batchFetchAndCreateIssues(plugin: JiraPlugin, jql: string): Promise<void> {
	try {
		new Notice(t("fetching_started"));

		const issues = await fetchIssuesByJQL(plugin, jql);
		
		if (issues.length === 0) {
			new Notice(t("no_issues_found"));
			return;
		}

		new Notice(t("fetching_completed", { count: issues.length.toString() }));

		// Process each issue
		let successCount = 0;
		let errorCount = 0;
		const errors: string[] = [];

		for (const issue of issues) {
			try {
				await createOrUpdateIssueNote(plugin, issue);
				successCount++;
			} catch (error) {
				errorCount++;
				errors.push(`${issue.key}: ${error.message || "Unknown error"}`);
				console.error(`Error processing issue ${issue.key}:`, error);
			}
		}

		// Show results
		if (errorCount === 0) {
			new Notice(t("all_success", { count: successCount.toString() }));
		} else {
			new Notice(t("partial_success", { 
				success: successCount.toString(), 
				errors: errorCount.toString() 
			}));
			console.error("Batch fetch errors:", errors);
		}

	} catch (error) {
		new Notice(t("fetch_error") + ": " + (error.message || "Unknown error"));
		console.error("Batch fetch error:", error);
	}
}
