import JiraPlugin from "../main";
import {baseRequest} from "./base";

export async function fetchProjects(plugin: JiraPlugin): Promise<Record<string, any>[]> {
	return await baseRequest(plugin, 'get', '/project');

}

export async function fetchIssueTypes(plugin: JiraPlugin, projectKey: string): Promise<Record<string, any>> {
	return await baseRequest(plugin, 'get', `/issue/createmeta/${projectKey}/issuetypes`);
}
