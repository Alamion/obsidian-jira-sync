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
			url: `${plugin.settings.connection.jiraUrl}/rest/auth/1/session`,
			method: "post",
			body: JSON.stringify({
				username: plugin.settings.connection.username,
				password: plugin.settings.connection.password,
			}),
			contentType: "application/json",
			headers: {
				"Content-type": "application/json",
				Origin: plugin.settings.connection.jiraUrl,
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
	if (!plugin.settings.connection.jiraUrl) {
		new Notice("Please configure Jira URL in plugin settings");
		return false;
	}
	if ((!plugin.settings.connection.username || !plugin.settings.connection.password) && !plugin.settings.connection.apiToken) {
		new Notice("Please configure Jira username and password or PAT API token in plugin settings");
		return false;
	}
	return true;
}

// Helper function to create Basic Auth header
function createBasicAuthHeader(email: string, token: string): string {
	const credentials = `${email}:${token}`;
	// Convert to base64
	const base64Credentials = btoa(credentials);
	return `Basic ${base64Credentials}`;
}

export async function getAuthHeaders(plugin: JiraPlugin): Promise<Record<string, string>> {
	// Common headers
	const commonHeaders = {
		"Content-type": "application/json",
		Origin: plugin.settings.connection.jiraUrl,
	};

	// Personal Access Token
	const pat = plugin.settings.connection.apiToken?.trim() || "";

	// Option 1: Bearer token (PAT)
	if (plugin.settings.connection.authMethod === "bearer" || !plugin.settings.connection.authMethod) {
		return {
			...commonHeaders,
			Authorization: `Bearer ${pat}`,
		};
	}

	// Option 2: Basic Auth with API token
	else if (plugin.settings.connection.authMethod === "basic") {
		return {
			...commonHeaders,
			Authorization: createBasicAuthHeader(plugin.settings.connection.email || "", pat),
		};
	}

	else if (plugin.settings.connection.authMethod === "session") {
		// Option 3: Session cookie
		let cookie = localStorage.getItem(getSessionCookieKey(plugin));
		if (!cookie) {
			await authenticate(plugin);
			cookie = localStorage.getItem(getSessionCookieKey(plugin));
		}

		if (cookie) {
			return {
				...commonHeaders,
				Cookie: `${plugin.settings.sessionCookieName}=${cookie}`,
			};
		}
	}

	// No valid auth method found
	throw new Error("No valid authentication method available");
}
