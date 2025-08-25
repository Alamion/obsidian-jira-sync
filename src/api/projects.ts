import JiraPlugin from "../main";
import {baseRequest} from "./base";
import {JiraIssueType, JiraProject} from "../interfaces";

export async function fetchProjects(plugin: JiraPlugin): Promise<JiraProject[]> {
	const result = await baseRequest(plugin, 'get', '/project');
	return result.map((project: any) => ({
		id: project.key,
		name: project.name,
	})) as JiraProject[];
}

export async function fetchIssueTypes(plugin: JiraPlugin, projectKey: string): Promise<JiraIssueType[]> {
	const result = await baseRequest(plugin, 'get', `/issue/createmeta/${projectKey}/issuetypes`);
	return result.values.map((type: any) => ({
		name: type.name,
	})) as JiraIssueType[];
}
