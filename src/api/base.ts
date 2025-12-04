import JiraPlugin from "../main";
import {requestUrl} from "obsidian";
import {authenticate, getAuthHeaders} from "./auth";
import {debugLog} from "../tools/debugLogging";

export async function baseRequest(
	plugin: JiraPlugin,
	method: string,
	additional_url_path: string,
	body?: string,
	params?: Record<string, any>,
	retries: number = 1
): Promise<any> {

	const queryString = params && Object.keys(params).length > 0
		? "?" + new URLSearchParams(params).toString()
		: "";

	const url = `${plugin.settings.connection.jiraUrl}/rest/api/${plugin.settings.connection.apiVersion}${additional_url_path}${queryString}`;
	const requestParams = {
		url,
		method: method,
		headers: await getAuthHeaders(plugin),
		contentType: "application/json",
		accept: "application/json",
		throw: false,
		body
	}
	debugLog("Request:\n", requestParams)
	const response = await requestUrl(requestParams);
	debugLog("Response:\n", response);
	if (response.status < 200 || response.status >= 300) {
		if (response.status === 401 && retries > 0) {
			await authenticate(plugin);
			return await baseRequest(plugin, method, additional_url_path, body, params, retries-1);
		}
		// console.error(error);
		throw new Error(`
${response.text || "Unknown error"}
${body && '\nbody:' + body || ""}`);
	}
	debugLog("Additional request info:\n", {"url": url,
		"method": method, "body": body, params: params});
	return response.status === 204 ? null : response.json;

}

export function sanitizeObject(obj: any): any {
	if (Array.isArray(obj)) {
		obj = obj.map((item: any) => sanitizeObject(item));
	}
	else if (typeof obj === "object") {
		obj = Object.entries(obj).filter(([, v]) => v !== null && v !== undefined).reduce((acc, [k, v]) => {
			acc[k] = sanitizeObject(v)
			return acc
		}, {} as Record<string, any>);
	}

	return obj;
}

