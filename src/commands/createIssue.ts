import { Notice, TFile } from "obsidian";
import JiraPlugin from "../main";
import { IssueTypeModal, ProjectModal } from "../modals";
import {fetchIssueTypes, fetchProjects} from "../api";
import {createIssueFromFile} from "../file_operations/createUpdateIssue";
import {checkCommandCallback} from "../tools/checkCommandCallback";
import {useTranslations} from "../localization/translator";
import {readJiraFieldsFromFile} from "../file_operations/commonPrepareData";
import {JiraIssueType, JiraProject} from "../interfaces";
import {IssueAddSummaryModal} from "../modals/IssueAddSummaryModal";

const t = useTranslations("commands.create_issue").t;

/**
 * Register the create issue command
 */
export function registerCreateIssueCommand(plugin: JiraPlugin): void {
	plugin.addCommand({
		id: "create-issue-jira",
		name: t("name"),
		checkCallback: (checking: boolean) => {
			return checkCommandCallback(plugin, checking, checkProjects, []);
		},
	});
}

/**
 * Create a new issue in Jira from the current note
 */
export async function checkProjects(plugin: JiraPlugin, file: TFile): Promise<void> {
	try {
		const fields = await readJiraFieldsFromFile(plugin, file);

		const projects = await fetchProjects(plugin);

		if (!fields.project || !projects.map((project: any) => project.key).includes(fields.project)) {
			new ProjectModal(plugin.app,
				projects.map((project: any) => ({
					id: project.key,
					name: project.name,
				})) as JiraProject[],
				async (projectKey: string) => {
				fields.project = projectKey;
				await checkIssueTypes(plugin, file, fields)
			}).open();
		} else {
			await checkIssueTypes(plugin, file, fields);
		}

	} catch (error) {
		new Notice(t('error') + ": " + (error.message || "Unknown error"), 3000);
		console.error(error);
	}
}

async function checkIssueTypes(plugin: JiraPlugin, file: TFile, fields: any): Promise<void> {
	const issueTypes = await fetchIssueTypes(plugin, fields.project);

	if (!fields.issuetype || !issueTypes.values.map((issueType: any) => issueType.name).includes(fields.issuetype)) {
		new IssueTypeModal(plugin.app,
			issueTypes.values.map((type: any) => ({
				name: type.name,
			})) as JiraIssueType[],
			async (issueType: string) => {
				fields.issuetype = issueType;
				await checkSummary(plugin, file, fields);
			}).open();
	} else {
		await checkSummary(plugin, file, fields);
	}

}

async function checkSummary(plugin: JiraPlugin, file: TFile, fields: any): Promise<void> {
	if (!fields.summary) {
		new IssueAddSummaryModal(plugin.app,
			async (summary: string) => {
				fields.summary = summary;
				const issueKey = await createIssueFromFile(plugin, file, fields);
				new Notice(t('success', {issueKey}));
		}).open();
	} else {
		await createIssueFromFile(plugin, file, fields);
	}
}
