import {FieldMapping} from "../constants/obsidianJiraFieldsMapping";

export interface JiraSettings {
	apiToken: string;
	username: string;
	password: string;
	jiraUrl: string;
	issuesFolder: string;
	sessionCookieName: string;
	templatePath: string;
	fieldMappings: Record<string, FieldMapping>;
	fieldMappingsStrings: Record<string, { toJira: string; fromJira: string }>;
	enableFieldValidation: boolean;
}

export const DEFAULT_SETTINGS: JiraSettings = {
	apiToken: "",
	username: "",
	password: "",
	jiraUrl: "",
	issuesFolder: "jira-issues",
	sessionCookieName: "JSESSIONID",
	templatePath: "",
	fieldMappings: {},
	fieldMappingsStrings: {},
	enableFieldValidation: true
};

