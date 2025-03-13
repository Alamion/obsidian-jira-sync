import { requestUrl } from "obsidian";
import JiraPlugin from "../main";
import { getAuthHeaders } from "./auth";

/**
 * Fetch available projects from Jira
 */
export async function fetchProjects(plugin: JiraPlugin): Promise<void> {
	try {
		const response = await requestUrl({
			url: `${plugin.settings.jiraUrl}/rest/api/2/project`,
			method: "get",
			headers: getAuthHeaders(plugin),
		});

		plugin.projects = response.json.map((project: any) => ({
			id: project.key,
			name: project.name,
		}));
	} catch (error) {
		throw new Error("Error fetching projects: " + (error.message || "Unknown error"));
	}
}

/**
 * Fetch issue types for a project from Jira
 * @param projectKey The project key
 */
export async function fetchIssueTypes(plugin: JiraPlugin, projectKey: string): Promise<void> {
	try {
		const response = await requestUrl({
			url: `${plugin.settings.jiraUrl}/rest/api/2/issue/createmeta/${projectKey}/issuetypes`,
			method: "get",
			headers: getAuthHeaders(plugin),
		});

		plugin.issueTypes = response.json.values.map((type: any) => ({
			name: type.name,
		}));
	} catch (error) {
		throw new Error("Error fetching issue types: " + (error.message || "Unknown error"));
	}
}
