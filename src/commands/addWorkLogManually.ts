
import {TFile} from "obsidian";
import JiraPlugin from "../main";
import {WorkLogModal} from "../modals/issueWorkLogModal";
import {addWorkLog} from "../api";
import {checkCommandCallback} from "../tools/check_command_callback";

export function registerUpdateWorkLogManuallyCommand(plugin: JiraPlugin): void {
	plugin.addCommand({
		id: "update-work-log-jira-manually",
		name: "Update work log in Jira manually",
		checkCallback: (checking: boolean) => {
			return checkCommandCallback(plugin, checking, processManualWorkLog, ["key"], ["key"]);
		},
	});
}

async function processManualWorkLog(plugin: JiraPlugin, _: TFile, issueKey: string): Promise<void> {

	new WorkLogModal(plugin.app, async (timeSpent: string, startDate: string, comment: string) => {
		await addWorkLog(plugin, issueKey, timeSpent, startDate, comment);
	}).open();
}
