import {FieldMapping} from "../default/obsidianJiraFieldsMapping";

export interface JiraSettings {
	collapsedSections: Record<string, boolean>;

	authMethod: "bearer" | "basic" | "session";
	apiToken: string;
	username: string;
	email: string;
	password: string;
	jiraUrl: string;
	apiVersion: string;

	issuesFolder: string;
	sessionCookieName: string;
	templatePath: string;
	fieldMappings: Record<string, FieldMapping>;
	fieldMappingsStrings: Record<string, { toJira: string; fromJira: string }>;
	enableFieldValidation: boolean;

	sendComments: "no" | "last_block" | "block_path";
	statisticsTimeType: string;
	maxItemsToShow: number;
	customDateRange: { start: string; end: string };

	// Cache for issue key to file path mapping
	issueKeyToFilePathCache: Record<string, string>;
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
	apiVersion: "2",

	issuesFolder: "jira-issues",
	sessionCookieName: "JSESSIONID",
	templatePath: "",
	fieldMappings: {},
	fieldMappingsStrings: {},
	enableFieldValidation: true,

	sendComments: "no",
	statisticsTimeType: "weeks",
	maxItemsToShow: 10,
	customDateRange: { start: "", end: "" },

	// Initialize empty cache
	issueKeyToFilePathCache: {}
};

