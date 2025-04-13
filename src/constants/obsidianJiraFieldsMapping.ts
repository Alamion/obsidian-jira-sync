import {JiraIssue} from "../interfaces";

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
		fromJira: (issue) => issue.fields.description,
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
};
