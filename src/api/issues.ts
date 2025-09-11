import JiraPlugin from "../main";
import {JiraIssue, JiraTransitionType} from "../interfaces";
import {baseRequest, sanitizeObject} from "./base";
import {Notice} from "obsidian";

/**
 * Fetch an issue from Jira by its key
 * @param plugin The plugin instance
 * @param issueKey The issue key to fetch
 * @returns The issue data
 */
export async function fetchIssue(plugin: JiraPlugin, issueKey: string): Promise<JiraIssue> {
	const additional_url_path = `/issue/${issueKey}`
	return await baseRequest(plugin, 'get', additional_url_path) as Promise<JiraIssue>;
}

/**
 * Fetch issues by JQL with optional field selection.
 * Returns only issues array for convenience.
 */
export async function fetchIssuesByJQL(
	plugin: JiraPlugin,
	jql: string,
	limit?: number,
	fields?: string[]
): Promise<JiraIssue[]> {
	const test = await fetchIssuesByJQLRaw(plugin, jql, 1, fields);
	const totalAvailable = test.total;
	const actualLimit = Math.min(limit || totalAvailable, totalAvailable);

	let startAt = 0;
	let issues: JiraIssue[] = [];

	while (startAt < actualLimit) {
		const remaining = actualLimit - startAt;
		const maxResults = Math.min(remaining, 1000);

		const result = await fetchIssuesByJQLRaw(plugin, jql, maxResults, fields, startAt);
		issues = [...issues, ...result.issues];
		startAt += result.issues.length;
	}

	return issues as JiraIssue[];
}

/**
 * Fetch issues by JQL and return the raw search response (includes total, startAt, etc.).
 * Useful for previewing results and counts.
 */
export async function fetchIssuesByJQLRaw(
	plugin: JiraPlugin,
	jql: string,
	maxResults?: number,
	fields?: string[],
	startAt?: number
): Promise<any> {
	const additional_url_path = `/search`;
	const body = JSON.stringify(sanitizeObject({
		jql,
		maxResults,
		startAt,
		fields: fields && fields.length > 0 ? fields : undefined,
	}));
	return await baseRequest(plugin, 'post', additional_url_path, body);
}

/**
 * Fetch an issue from Jira by its key
 * @param plugin The plugin instance
 * @param issueKey The issue key to fetch
 * @returns The issue data
 */
export async function fetchIssueTransitions(plugin: JiraPlugin, issueKey: string): Promise<JiraTransitionType[]> {
	const additional_url_path = `/issue/${issueKey}/transitions`
	const result = await baseRequest(plugin, 'get', additional_url_path);
	return result.transitions.map(({ id, name, to }: { id: string; name: string; to: { name: string }}) => ({
		id,
		action: name,
		status: to.name
	})) as JiraTransitionType[];
}

/**
 * Update an issue in Jira
 * @param plugin The plugin instance
 * @param issueKey The issue key to update
 * @param fields The fields to update
 */
export async function updateJiraIssue(
	plugin: JiraPlugin,
	issueKey: string,
	fields: Record<string, any>
): Promise<JiraIssue> {
	const body = JSON.stringify({ fields })
	const additional_url_path = `/issue/${issueKey}`
	return await baseRequest(plugin, 'put', additional_url_path, body) as Promise<JiraIssue>;
}

/**
 * Create a new issue in Jira
 * @param plugin The plugin instance
 * @param fields The fields for the new issue
 * @returns The created issue key
 */
export async function createJiraIssue(
	plugin: JiraPlugin,
	fields: Record<string, any>
): Promise<JiraIssue> {
	// Ensure required fields are present
	if (!fields.project || !fields.issuetype || !fields.summary) {
		throw new Error("Missing required fields: project, issuetype, and summary are required");
	}
	const body = JSON.stringify({ fields })
	const additional_url_path = `/issue/`
	return await baseRequest(plugin, 'post', additional_url_path, body) as Promise<JiraIssue>;
}

/**
 * Update an issue status in Jira
 * @param plugin The plugin instance
 * @param issueKey The issue key to update
 * @param status The status to update the issue to
 */
export async function updateJiraStatus(
	plugin: JiraPlugin,
	issueKey: string,
	status: string
): Promise<JiraIssue> {
	const body = JSON.stringify({ transition: { id: status } })
	const additional_url_path = `/issue/${issueKey}/transitions`
	return await baseRequest(plugin, 'post', additional_url_path, body) as Promise<JiraIssue>;
}

/**
 * Add a work log entry to a Jira issue
 */
export async function addWorkLog(
	plugin: JiraPlugin,
	issueKey: string,
	timeSpent: string,
	startedAt: string,
	comment: string = "",
	showNotice: boolean = true
): Promise<any> {
	const payload = {
		timeSpent,
		started: startedAt,
		comment
	};

	const additional_url_path = `/issue/${issueKey}/worklog`;
	const response = await baseRequest(plugin, 'post', additional_url_path, JSON.stringify(payload));

	if (showNotice) {
		new Notice(`Work log added successfully to ${issueKey}`);
	}

	return response;
}
