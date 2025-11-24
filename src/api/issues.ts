import JiraPlugin from "../main";
import {JiraIssue, JiraTransitionType} from "../interfaces";
import {baseRequest, sanitizeObject} from "./base";
import {Notice} from "obsidian";
import {chunkArray, createLimiter} from "../tools/asyncLimiter";


/**
 * Fetch an issue from Jira by its key
 * @param plugin The plugin instance
 * @param issueKey The issue key to fetch
 * @returns The issue data
 */
export async function fetchIssue(plugin: JiraPlugin, issueKey: string): Promise<JiraIssue> {
	return await baseRequest(plugin, 'get', `/issue/${issueKey}`) as Promise<JiraIssue>;
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
	let totalAvailable = 0;
	switch (plugin.settings.apiVersion) {
		case "2":
			const result = await fetchIssuesByJQLRaw(plugin, jql, 1, fields);
			totalAvailable = result.total;
			break;
		case "3":
			totalAvailable = await fetchCountIssuesByJQL(plugin, jql);
			break;
	}
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

export async function fetchIssuesByJQLParallel(
	plugin: JiraPlugin,
	jql: string,
	limit?: number,
	fields?: string[]
): Promise<JiraIssue[]> {
	const test = await fetchIssuesByJQLRaw(plugin, jql, 1, fields);
	const totalAvailable = test.total;
	const actualLimit = Math.min(limit || totalAvailable, totalAvailable);

	const tasks: (() => Promise<JiraIssue[]>)[] = [];
	for (let startAt = 0; startAt < actualLimit; startAt += 1000) {
		tasks.push(async () => {
			const result = await fetchIssuesByJQLRaw(plugin, jql, 1000, fields, startAt);
			return result.issues;
		});
	}

	const limitConcurrency = createLimiter(5);
	const results = await Promise.all(tasks.map(t => limitConcurrency(t)));
	return results.flat();
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
	const body = JSON.stringify(sanitizeObject({
		jql,
		maxResults,
		startAt,
		fields: fields && fields.length > 0 ? fields : undefined,
	}));
	return await baseRequest(plugin, 'post', `/search${plugin.settings.apiVersion === "3" ? "/jql" : ""}`, body);
}

export async function fetchCountIssuesByJQL(plugin: JiraPlugin, jql: string): Promise<number> {
	const body = JSON.stringify(sanitizeObject({ jql }));
	return (await baseRequest(plugin, 'post', "/search/approximate-count", body)).count;
}


/**
 * Fetch an issue from Jira by its key
 * @param plugin The plugin instance
 * @param issueKey The issue key to fetch
 * @returns The issue data
 */
export async function fetchIssueTransitions(plugin: JiraPlugin, issueKey: string): Promise<JiraTransitionType[]> {
	const result = await baseRequest(plugin, 'get', `/issue/${issueKey}/transitions`);
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
	return await baseRequest(plugin, 'put', `/issue/${issueKey}`, body) as Promise<JiraIssue>;
}


export async function bulkUpdateJiraIssues(
	plugin: JiraPlugin,
	updates: { issueKey: string, fields: Record<string, any> }[]
): Promise<any[]> {
	const limit = createLimiter(5);
	const promises = updates.map(update =>
		limit(() => updateJiraIssue(plugin, update.issueKey, update.fields))
	);
	return await Promise.allSettled(promises);
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
	return await baseRequest(plugin, 'post', `/issue/`, body) as Promise<JiraIssue>;
}


export async function bulkCreateJiraIssues(
	plugin: JiraPlugin,
	issues: Record<string, any>[]
): Promise<any[]> {
	const chunks = chunkArray(issues, 50);
	let results: any[] = [];
	for (const chunk of chunks) {
		const body = JSON.stringify({ issueUpdates: chunk });
		const res = await baseRequest(plugin, 'post', '/issue/bulk', body);
		results.push(res);
	}
	return results;
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
	return await baseRequest(plugin, 'post', `/issue/${issueKey}/transitions`, body) as Promise<JiraIssue>;
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
	const response = await baseRequest(plugin, 'post', `/issue/${issueKey}/worklog`, JSON.stringify(payload));

	if (showNotice) {
		new Notice(`Work log added successfully to ${issueKey}`);
	}

	return response;
}


export async function bulkAddWorkLog(
	plugin: JiraPlugin,
	worklogs: { issueKey: string, timeSpent: string, startedAt: string, comment: string }[],
	showNotice: boolean = true
): Promise<any[]> {
	const limit = createLimiter(5);
	const promises = worklogs.map(worklog =>
		limit(() => addWorkLog(plugin, worklog.issueKey, worklog.timeSpent, worklog.startedAt, worklog.comment, showNotice))
	);
	return await Promise.allSettled(promises);
}
