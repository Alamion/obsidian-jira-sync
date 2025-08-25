import JiraPlugin from "../main";
import {requestUrl} from "obsidian";
import {authenticate, getAuthHeaders, getSessionCookieKey} from "./auth";
import {debugLog} from "../tools/debugLogging";

export async function baseRequest(
	plugin: JiraPlugin,
	method: string,
	additional_url_path: string,
	body?: string,
	retries: number = 1
): Promise<any> {
	const requestParams = {
		url: `${plugin.settings.jiraUrl}/rest/api/2${additional_url_path}`,
		method: method,
		headers: await getAuthHeaders(plugin),
		contentType: "application/json",
		throw: false,
		body
	}
	debugLog("Request:\n", requestParams)
	const response = await requestUrl(requestParams);
	debugLog("Response:\n", response);
	if (response.status < 200 || response.status >= 300) {
		if (response.status === 401 && retries > 0) {
			await authenticate(plugin);
			return await baseRequest(plugin, method, additional_url_path, body, retries-1);
		}
		// console.error(error);
		throw new Error(`
${response.text || "Unknown error"}
${body && '\nbody:' + body || ""}`);
	}
	debugLog("Additional request info:\n", {"url": `${plugin.settings.jiraUrl}/rest/api/2${additional_url_path}`,
		"method": method, "body": body});
	return response.status === 204 ? null : response.json;

}

