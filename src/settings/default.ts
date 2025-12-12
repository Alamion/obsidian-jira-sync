import {FieldMapping} from "../default/obsidianJiraFieldsMapping";


export interface ConnectionSettingsInterface {
	jiraUrl: string;
	apiVersion: "2" | "3";
	authMethod: "bearer" | "basic" | "session";
	apiToken: string;
	username: string;
	email: string;
	password: string;
}

export interface GlobalSettingsInterface {
	issuesFolder: string;
	templatePath: string;
}

export interface FieldMappingSettingsInterface {
	fieldMappings: Record<string, FieldMapping>;
	fieldMappingsStrings: Record<string, { toJira: string; fromJira: string }>;
	enableFieldValidation: boolean;
}

export interface FetchIssueInterface {
	filenameTemplate: string;
	fields: string[];
	expand: string[];
}

export interface TimekeepSettingsInterface {
	sendComments: "no" | "last_block" | "block_path";
	statisticsTimeType: string;
	maxItemsToShow: number;
	customDateRange: { start: string; end: string };
}

export interface CollapsedSections {
	connection: boolean;
	general: boolean;
	fieldMappings: boolean;
	fetchIssue: boolean;
	testFieldMappings: boolean;
	statistics: boolean;
}

export interface JiraSettingsInterface {
	collapsedSections: CollapsedSections;

	connection: ConnectionSettingsInterface;
	global: GlobalSettingsInterface;
	fieldMapping: FieldMappingSettingsInterface;
	fetchIssue: FetchIssueInterface;
	timekeep: TimekeepSettingsInterface;

	sessionCookieName: string;
	issueKeyToFilePathCache: Record<string, string>;
}

export const DEFAULT_SETTINGS: JiraSettingsInterface = {
	collapsedSections: {
		connection: true,
		general: true,
		fieldMappings: false,
		fetchIssue: false,
		testFieldMappings: false,
		statistics: false,
	},

	connection: {
		authMethod: "bearer",
		apiToken: "",
		username: "",
		email: "",
		password: "",
		jiraUrl: "",
		apiVersion: "2",
	},

	global: {
		issuesFolder: "jira-issues",
		templatePath: "",
	},

	fieldMapping: {
		fieldMappings: {},
		fieldMappingsStrings: {},
		enableFieldValidation: true,
	},

	fetchIssue: {
		filenameTemplate: "{summary} ({key})",
		fields: ["*all"],
		expand: [],
	},

	timekeep: {
		sendComments: "no",
		statisticsTimeType: "weeks",
		maxItemsToShow: 10,
		customDateRange: { start: "", end: "" },
	},

	sessionCookieName: "JSESSIONID",
	issueKeyToFilePathCache: {}
};

