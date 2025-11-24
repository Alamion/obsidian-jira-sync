import JiraPlugin from "../main";
import {baseRequest} from "./base";

export async function fetchSelf(plugin: JiraPlugin): Promise<Record<string, any>[]> {
	return await baseRequest(plugin, 'get', '/myself');

}
