import JiraPlugin from "../main";
import {requestUrl} from "obsidian";
import {getAuthHeaders} from "./auth";

export async function baseRequest(
	plugin: JiraPlugin,
	method: string,
	additional_url_path: string,
	body?: string
): Promise<any> {
	return await requestUrl({
		url: `${plugin.settings.jiraUrl}/rest/api/2${additional_url_path}`,
		method: method,
		headers: getAuthHeaders(plugin),
		contentType: "application/json",
		throw: false,
		body
	}).then(response => {
		if (response.status < 200 || response.status >= 300) {
			const error = new Error(`Error updating issue: 
${response.text || "Unknown error"}
${body && '\nbody:' + body || ""}`);
			console.error(error);
			throw error;
		}
		console.debug(response);
		console.debug({"url": `${plugin.settings.jiraUrl}/rest/api/2${additional_url_path}`,
			"method": method, "body": body});
		return response.status === 204 ? null : response.json;
	});
}
