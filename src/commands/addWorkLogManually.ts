
import {TFile} from "obsidian";
import JiraPlugin from "../main";
import {IssueWorkLogModal} from "../modals";
import {addWorkLog} from "../api";
import {checkCommandCallback} from "../tools/check_command_callback";
import {useTranslations} from "../localization/translator";

const t = useTranslations("commands.add_worklog.manual").t;

export function registerUpdateWorkLogManuallyCommand(plugin: JiraPlugin): void {
	plugin.addCommand({
		id: "update-work-log-jira-manually",
		name: t("name"),
		checkCallback: (checking: boolean) => {
			return checkCommandCallback(plugin, checking, processManualWorkLog, ["key"], ["key"]);
		},
	});
}

async function processManualWorkLog(plugin: JiraPlugin, _: TFile, issueKey: string): Promise<void> {

	new IssueWorkLogModal(plugin.app, async (timeSpent: string, startDate: string, comment: string) => {
		await addWorkLog(plugin, issueKey, timeSpent, startDate, comment);
	}).open();
}
