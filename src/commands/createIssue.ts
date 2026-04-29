import { Notice, TFile } from 'obsidian';
import JiraPlugin from '../main';
import { IssueTypeModal, ProjectModal } from '../modals';
import { fetchIssueTypes, fetchProjects } from '../api';
import { createIssueFromFile } from '../file_operations/createUpdateIssue';
import { checkCommandCallback } from '../tools/checkCommandCallback';
import { useTranslations } from '../localization/translator';
import { readJiraFieldsFromFile } from '../file_operations/commonPrepareData';
import { JiraIssueType, JiraProject } from '../interfaces';
import { IssueAddSummaryModal } from '../modals/IssueAddSummaryModal';

const t = useTranslations('commands.create_issue').t;

export function registerCreateIssueCommand(plugin: JiraPlugin): void {
	plugin.addCommand({
		id: 'create-issue-jira',
		name: t('name'),
		checkCallback: (checking: boolean) => {
			return checkCommandCallback(plugin, checking, createIssue, []);
		},
	});
}

export async function createIssue(plugin: JiraPlugin, file: TFile): Promise<void> {
	try {
		const fields = await readJiraFieldsFromFile(plugin, file);
		await checkProjects(plugin, fields);
		await checkIssueTypes(plugin, fields);
		await checkSummary(plugin, fields);
		const issueKey = await createIssueFromFile(plugin, file, fields);
		new Notice(t('success', { issueKey }));
	} catch (error: unknown) {
		new Notice(t('error') + ': ' + ((error as Error).message || 'Unknown error'), 3000);
		console.error(error);
	}
}

export async function checkProjects(plugin: JiraPlugin, fields: any): Promise<void> {
	const projects = await fetchProjects(plugin);
	if (!fields.project || !projects.map((project: any) => project.key).includes(fields.project)) {
		await new Promise<void>((resolve) => {
			new ProjectModal(
				plugin.app,
				projects.map((project: any) => ({
					id: project.key,
					name: project.name,
				})) as JiraProject[],
				async (projectKey: string) => {
					fields.project = projectKey;
					resolve();
				},
			).open();
		});
	}
}

async function checkIssueTypes(plugin: JiraPlugin, fields: any): Promise<void> {
	const issueTypesResponse = await fetchIssueTypes(plugin, fields.project);
	const issueTypes =
		plugin.getCurrentConnection()?.apiVersion === '3' ? issueTypesResponse.issueTypes : issueTypesResponse.values;
	if (!fields.issuetype || !issueTypes.map((issueType: any) => issueType.name).includes(fields.issuetype)) {
		await new Promise<void>((resolve) => {
			new IssueTypeModal(
				plugin.app,
				issueTypes.map((type: any) => ({
					name: type.name,
				})) as JiraIssueType[],
				async (issueType: string) => {
					fields.issuetype = issueType;
					resolve();
				},
			).open();
		});
	}
}

async function checkSummary(plugin: JiraPlugin, fields: any): Promise<void> {
	if (!fields.summary) {
		await new Promise<void>((resolve) => {
			new IssueAddSummaryModal(plugin.app, async (summary: string) => {
				fields.summary = summary;
				resolve();
			}).open();
		});
	}
}
