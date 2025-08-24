import {Notice, TFile} from "obsidian";
import JiraPlugin from "../main";
import {updateIssueFromFile} from "../file_operations/createUpdateIssue";
import {checkCommandCallback} from "../tools/check_command_callback";
import {useTranslations} from "../localization/translator";

const t = useTranslations("commands.update_issue").t;

export function registerUpdateIssueCommand(plugin: JiraPlugin): void {
	plugin.addCommand({
		id: "update-issue-jira",
		name: t("name"),
		checkCallback: (checking: boolean) => {
			return checkCommandCallback(plugin, checking, updateIssue, ["key"]);
		},
	});
}

export async function updateIssue(plugin: JiraPlugin, file: TFile): Promise<void> {
	try {
		try {
			// Update the issue with all data from the file
			const issueKey = await updateIssueFromFile(plugin, file);
			new Notice(t('success', {issueKey}));
		} catch (error) {
			new Notice(t('error') + ": " + (error.message || "Unknown error"), 3000);
		}
	} catch (error) {
		new Notice(t('error') + ": " + (error.message || "Unknown error"));
	}
}
