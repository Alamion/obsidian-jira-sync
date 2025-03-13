import {FieldMapping} from "../tools/mappingObsidianJiraFields";

/**
 * Plugin settings interface
 */
export interface JiraSettings {
	username: string;
	password: string;
	jiraUrl: string;
	issuesFolder: string;
	sessionCookieName: string;
	templatePath: string;
	fieldMappings: Record<string, FieldMapping>;
}


/**
 * Project interface for Jira projects
 */
export interface JiraProject {
	id: string;
	name: string;
}

/**
 * Issue type interface for Jira issue types
 */
export interface JiraIssueType {
	name: string;
}

/**
 * Issue type interface for Jira issue types
 */
export interface JiraTransitionType {
	id: string;
	action: string;
	status: string;
}

/**
 * Jira issue interface for handling issue data
 */
export interface JiraIssue {
	key: string;
	self: string;
	fields: {
		summary: string;
		description: string | null;
		priority: {
			name: string;
		};
		status: {
			name: string;
		};
		project: {
			key: string;
		};
		issuetype: {
			name: string;
		};
		assignee: {
			name: string;
		};
		reporter: {
			name: string;
		};
		[key: string]: any;
	};
	[key: string]: any;
}
