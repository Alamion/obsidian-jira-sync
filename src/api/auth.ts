import { Notice, requestUrl } from 'obsidian';
import JiraPlugin from '../main';

export function getSessionCookieKey(plugin: JiraPlugin): string {
	return 'jira-issue-managing-session-cookie-' + (plugin.app as any).appId;
}

// Session cookie only
export async function authenticate(plugin: JiraPlugin): Promise<boolean> {
	try {
		if (!validateSettings(plugin)) {
			return false;
		}

		const conn = plugin.getCurrentConnection();
		if (!conn) return false;

		const response = await requestUrl({
			url: `${conn.jiraUrl}/rest/auth/1/session`,
			method: 'post',
			body: JSON.stringify({
				username: conn.username,
				password: conn.password,
			}),
			contentType: 'application/json',
			headers: {
				'Content-type': 'application/json',
				Origin: conn.jiraUrl,
			},
		});

		localStorage.setItem(getSessionCookieKey(plugin), response.json.session.value);
		return true;
	} catch (error: unknown) {
		new Notice('Authentication failed: ' + ((error as Error).message || 'Unknown error'));
		return false;
	}
}

export function validateSettings(plugin: JiraPlugin): boolean {
	const conn = plugin.getCurrentConnection();
	if (!conn || !conn.jiraUrl) {
		new Notice('Please configure Jira URL in plugin settings');
		return false;
	}
	if ((!conn.username || !conn.password) && !conn.apiToken) {
		new Notice('Please configure Jira username and password or PAT API token in plugin settings');
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
	const conn = plugin.getCurrentConnection();
	if (!conn) throw new Error('No connection configured');

	// Common headers
	const commonHeaders = {
		'Content-type': 'application/json',
		Origin: conn.jiraUrl,
	};

	// Personal Access Token
	const pat = conn.apiToken?.trim() || '';

	// Option 1: Bearer token (PAT)
	if (conn.authMethod === 'bearer' || !conn.authMethod) {
		return {
			...commonHeaders,
			Authorization: `Bearer ${pat}`,
		};
	}

	// Option 2: Basic Auth with API token
	else if (conn.authMethod === 'basic') {
		return {
			...commonHeaders,
			Authorization: createBasicAuthHeader(conn.email || '', pat),
		};
	} else if (conn.authMethod === 'session') {
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
	throw new Error('No valid authentication method available');
}
