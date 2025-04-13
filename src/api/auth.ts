import { Notice, requestUrl } from "obsidian";
import JiraPlugin from "../main";

export function getSessionCookieKey(plugin: JiraPlugin): string {
	return "jira-issue-managing-session-cookie-" + (plugin.app as any).appId;
}

// Session cookie only
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

export function validateSettings(plugin: JiraPlugin): boolean {
	if (!plugin.settings.jiraUrl) {
		new Notice("Please configure Jira URL in plugin settings");
		return false;
	}
	if ((!plugin.settings.username || !plugin.settings.password) && !plugin.settings.apiToken) {
		new Notice("Please configure Jira username and password or PAT API token in plugin settings");
		return false;
	}
	return true;
}


export async function getAuthHeaders(plugin: JiraPlugin): Promise<Record<string, string>> {
	const pat = plugin.settings.apiToken;
	if (pat) {
		return {
			Authorization: `Bearer ${pat}`,
			"Content-type": "application/json",
			Origin: plugin.settings.jiraUrl,
		};
	}
	let cookie = localStorage.getItem(getSessionCookieKey(plugin));
	if (!cookie) {
		await authenticate(plugin);
		cookie = localStorage.getItem(getSessionCookieKey(plugin));
	}
	return {
		Cookie: `${plugin.settings.sessionCookieName}=${cookie}`,
		"Content-type": "application/json",
		Origin: plugin.settings.jiraUrl,
	};
}
