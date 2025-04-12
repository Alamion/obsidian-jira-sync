
import {Notice, TFile} from "obsidian";
import JiraPlugin from "../main";
import {WorkLogModal} from "../modals/issueWorkLogModal";
import {addWorkLog, authenticate} from "../api";
import {checkCommandCallback} from "../tools/check_command_callback";

export function registerUpdateWorkLogManuallyCommand(plugin: JiraPlugin): void {
	plugin.addCommand({
		id: "update-work-log-jira-manually",
		name: "Update work log in Jira manually",
		checkCallback: (checking: boolean) => {
			return checkCommandCallback(plugin, checking, processWorkLog, [], ["jira_selected_week_data","key"]);
		},
	});
}

async function processWorkLog(plugin: JiraPlugin, _: TFile, __?: any, issueKey?: string): Promise<void> {
	await processManualWorkLog(plugin, issueKey);
}


async function processManualWorkLog(plugin: JiraPlugin, issueKey?: string): Promise<void> {
	if (!(await authenticate(plugin))) {
		return;
	}

	if (!issueKey) {
		new Notice("No issue key found in the current file");
		return;
	}

	new WorkLogModal(plugin.app, async (timeSpent: string, startDate: string, comment: string) => {
		await addWorkLog(plugin, issueKey, timeSpent, startDate, comment);
	}).open();
}
