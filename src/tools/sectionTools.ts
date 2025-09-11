import { debugLog } from "./debugLogging";

const regexCache = new Map<string, RegExp>();

function getRegex(type: "section" | "line" | "inline", name: string): RegExp {
	const key = `${type}:${name}`;
	if (regexCache.has(key)) return regexCache.get(key)!;

	let regex: RegExp;
	switch (type) {
		case "section":
			regex = new RegExp(
				`\`jira-sync-section-${name}\`([\\s\\S]*?)\\n?([\\s\\S]*?)(?=\\n#+ |\\n[^\\n]*\`jira-sync-|$)`,
				"g"
			);
			break;
		case "line":
			regex = new RegExp(
				`\`jira-sync-line-${name}\` *(.*?)(?=\\n|$)`,
				"g"
			);
			break;
		case "inline":
			regex = new RegExp(
				`\`jira-sync-inline-start-${name}\`([\\s\\S]*?)\`jira-sync-inline-end\``,
				"g"
			);
			break;
	}

	regexCache.set(key, regex);
	return regex;
}

function updateJiraSyncBlock(
	fileContent: string,
	type: "section" | "line" | "inline",
	name: string,
	content: string,
	force: boolean
): string {
	const regex = getRegex(type, name);

	let newBlock: string;
	switch (type) {
		case "section":
			newBlock = `\`jira-sync-section-${name}\`\n${content}`;
			break;
		case "line":
			newBlock = `\`jira-sync-line-${name}\`${content.split("\n")[0]}`;
			break;
		case "inline":
			newBlock = `\`jira-sync-inline-start-${name}\`${content}\`jira-sync-inline-end\``;
			break;
	}

	const updated = fileContent.replace(regex, () => newBlock);
	if (updated !== fileContent) return updated;

	if (force) {
		return fileContent + `\n${newBlock}`;
	}

	return fileContent;
}

export function updateJiraSyncContent(
	fileContent: string,
	sectionName: string,
	markdownContent: string,
	force: boolean = false
): string {
	fileContent = updateJiraSyncBlock(fileContent, "section", sectionName, markdownContent, force);
	fileContent = updateJiraSyncBlock(fileContent, "line", sectionName, markdownContent, force);
	fileContent = updateJiraSyncBlock(fileContent, "inline", sectionName, markdownContent, force);
	return fileContent;
}

function extractValues(
	fileContent: string,
	type: "section" | "line" | "inline"
): Record<string, string> {
	const regex = getRegex(type, "([\\w-]+)");
	const values: Record<string, string> = {};

	let match;
	while ((match = regex.exec(fileContent)) !== null) {
		switch (type) {
			case "section":
				values[match[1]] = (match[3] || "").trim();
				break;
			case "line":
				values[match[1]] = (match[2] || "").trim();
				break;
			case "inline":
				values[match[1]] = (match[2] || "").trim();
				break;
		}
	}

	return values;
}

export function extractAllJiraSyncValuesFromContent(
	fileContent: string
): Record<string, string> {
	const sections = extractValues(fileContent, "section");
	const lines = extractValues(fileContent, "line");
	const inlines = extractValues(fileContent, "inline");

	const result = { ...sections, ...lines, ...inlines };
	debugLog(`extracted content from file: ${JSON.stringify(result)}`);
	return result;
}
