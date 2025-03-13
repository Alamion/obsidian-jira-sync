import { Notice, requestUrl } from "obsidian";
import JiraPlugin from "../main";

/**
 * Get the session cookie key
 */
export function getSessionCookieKey(plugin: JiraPlugin): string {
	// @ts-ignore
	return "jira-issue-managing-session-cookie-" + plugin.app.appId;
}

/**
 * Authenticate with Jira and get session cookie
 * @returns true if authentication was successful
 */
export async function authenticate(plugin: JiraPlugin): Promise<boolean> {
	try {
		if (!validateSettings(plugin)) {
			return false;
		}

		const response = await requestUrl({
			url: `${plugin.settings.jiraUrl}/rest/auth/1/session`,
			method: "post",
			body: JSON.stringify({
				username: plugin.settings.username,
				password: plugin.settings.password,
			}),
			contentType: "application/json",
			headers: {
				"Content-type": "application/json",
				Origin: plugin.settings.jiraUrl,
			},
		});

		localStorage.setItem(
			getSessionCookieKey(plugin),
			response.json.session.value
		);
		return true;
	} catch (error) {
		new Notice("Authentication failed: " + (error.message || "Unknown error"));
		return false;
	}
}

/**
 * Validate that required settings are present
 */
export function validateSettings(plugin: JiraPlugin): boolean {
	if (!plugin.settings.username || !plugin.settings.password || !plugin.settings.jiraUrl) {
		new Notice("Please configure Jira username, password and URL in plugin settings");
		return false;
	}
	return true;
}

/**
 * Get the request headers with authentication
 */
export function getAuthHeaders(plugin: JiraPlugin): Record<string, string> {
	return {
		Cookie: `${plugin.settings.sessionCookieName}=${localStorage.getItem(getSessionCookieKey(plugin))}`,
		"Content-type": "application/json",
		Origin: plugin.settings.jiraUrl,
	};
}
