export interface JiraProject {
	id: string;
	name: string;
}

export interface JiraIssueType {
	name: string;
}

export interface JiraTransitionType {
	id: string;
	action: string;
	status: string;
}

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
