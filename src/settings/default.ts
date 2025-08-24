import {FieldMapping} from "../default/obsidianJiraFieldsMapping";

export interface JiraSettings {
	collapsedSections: Record<string, boolean>;

	authMethod: "bearer" | "basic" | "session";
	apiToken: string;
	username: string;
	email: string;
	password: string;
	jiraUrl: string;

	issuesFolder: string;
	sessionCookieName: string;
	templatePath: string;
	fieldMappings: Record<string, FieldMapping>;
	fieldMappingsStrings: Record<string, { toJira: string; fromJira: string }>;
	enableFieldValidation: boolean;

	statisticsTimeType: string;
	maxItemsToShow: number;
	customDateRange: { start: string; end: string };
}

export const DEFAULT_SETTINGS: JiraSettings = {
	collapsedSections: {
		connection: true,
		general: true,
		fieldMappings: false,
		rawIssueViewer: false,
		testFieldMappings: false,
		statistics: false,
	},
	authMethod: "bearer",
	apiToken: "",
	username: "",
	email: "",
	password: "",
	jiraUrl: "",

	issuesFolder: "jira-issues",
	sessionCookieName: "JSESSIONID",
	templatePath: "",
	fieldMappings: {},
	fieldMappingsStrings: {},
	enableFieldValidation: true,

	statisticsTimeType: "weeks",
	maxItemsToShow: 10,
	customDateRange: { start: "", end: "" }
};

