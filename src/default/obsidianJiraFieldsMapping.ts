import {JiraIssue} from "../interfaces";
import {jiraToMarkdown} from "../tools/markdownHtml";
import {adfToMarkdown} from "../tools/markdownToAdf";

export interface FieldMapping {
	toJira: (value: any) => any;
	fromJira: (issue: JiraIssue, data_source: Record<string, any> | null) => any;
}

export const obsidianJiraFieldMappings: Record<string, FieldMapping> = {
	"summary": {
		toJira: (value) => value,
		fromJira: (issue) => issue.fields.summary,
	},
	"description": {
		toJira: () => null,
		fromJira: (issue) => jiraToMarkdown(issue.fields.description),
	},
	"key": {
		toJira: () => null,
		fromJira: (issue) => issue.key,
	},
	"self": {
		toJira: () => null,
		fromJira: (issue) => issue.self,
	},
	"project": {
		toJira: (value) => ({ key: value }),
		fromJira: (issue) =>
			issue.fields.project ?issue.fields.project.key :"",
	},
	"issuetype": {
		toJira: (value) => ({ name: value }),
		fromJira: (issue) =>
			issue.fields.issuetype ?issue.fields.issuetype.name :"",
	},
	"priority": {
		toJira: (value) => ({ name: value }),
		fromJira: (issue) =>issue.fields.priority ?issue.fields.priority.name :"",
	},
	"status": {
		toJira: () => null,
		fromJira: (issue) =>issue.fields.status ?issue.fields.status.name :"",
	},
	"assignee": {
		toJira: (value) => ({ name: value }),
		fromJira: (issue) =>issue.fields.assignee ?issue.fields.assignee.name :"",
	},
	"reporter": {
		toJira: (value) => ({ name: value }),
		fromJira: (issue) =>issue.fields.reporter ?issue.fields.reporter.name :"",
	},
	"creator": {
		toJira: () => null,
		fromJira: (issue) =>issue.fields.creator ?issue.fields.creator.name :"",
	},
	"lastViewed": {
		toJira: () => null,
		fromJira: (issue) => issue.fields.lastViewed,
	},
	"updated": {
		toJira: () => null,
		fromJira: (issue) => issue.fields.updated,
	},
	"created": {
		toJira: () => null,
		fromJira: (issue) => issue.fields.created,
	},
	"link": {
		toJira: () => null,
		fromJira: (issue) => issue.self.replace(/(\w+:\/\/\S+?)\/.*/, `$1/browse/${issue.key}`),
	},
	"openLink": {
		toJira: () => null,
		fromJira: (issue) => issue.self.replace(/(\w+:\/\/\S+?)\/.*/, `[Open in Jira]($1/browse/${issue.key})`),
	},
	"progress": {
		toJira: () => null,
		fromJira: (issue) => issue.fields.aggregateprogress.percent+'%',
	},
	"comment": {
		toJira: () => null,
		fromJira: (issue) => {
			const comments = issue.fields.comment?.comments;
			if (!comments?.length) return '';
			return comments.map((c: any) => {
				const author = c.author?.displayName ?? 'Unknown';
				const date = c.created ? c.created.replace('T', ' ').substring(0, 19) : '';
				const body = adfToMarkdown(c.body) ?? '';
				const calloutBody = body.split('\n').map((l: string) => l === '' ? '>' : `> ${l}`).join('\n');
				return `> [!note]+ ${author} — ${date}\n> \n${calloutBody}`;
			}).join('\n\n');
		},
	},
};
