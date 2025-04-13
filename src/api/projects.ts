import JiraPlugin from "../main";
import {baseRequest} from "./base";

export async function fetchProjects(plugin: JiraPlugin): Promise<void> {
	const result = await baseRequest(plugin, 'get', '/project');
	plugin.temp_vars.projects = result.map((project: any) => ({
		id: project.key,
		name: project.name,
	}));
}

export async function fetchIssueTypes(plugin: JiraPlugin, projectKey: string): Promise<void> {
	const result = await baseRequest(plugin, 'get', `/issue/createmeta/${projectKey}/issuetypes`);
	plugin.temp_vars.issueTypes = result.map((type: any) => ({
		name: type.name,
	}));
}
