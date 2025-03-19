import {JiraSettings} from "../interfaces";
// import {fieldMappings} from "../tools/mappingObsidianJiraFields";

/**
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: JiraSettings = {
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

