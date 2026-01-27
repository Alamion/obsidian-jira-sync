import { debugLog } from "./debugLogging";

const UNIFIED_REGEX = /`jira-sync-(section|line|inline-start|block-start)-([\w-]+)`([\s\S]*?)(?:`jira-sync-?[^-]*-end`|(?=`jira-sync-|\z))/g; // TODO: delete deprecated endings in a year

interface ParsedBlock {
	type: "section" | "line" | "inline" | "block";
	name: string;
	content: string;
	startIndex: number;
	endIndex: number;
	fullMatch: string;
}

export function parseFileContent(fileContent: string): ParsedBlock[] {
	const blocks: ParsedBlock[] = [];
	let match;

	// Reset regex state
	UNIFIED_REGEX.lastIndex = 0;

	while ((match = UNIFIED_REGEX.exec(fileContent)) !== null) {
		const [fullMatch, typeRaw, name, rawContent] = match;
		let type: ParsedBlock["type"];
		let extractedContent: string;
		let actualEndIndex: number;

		// Determine actual type and extract content
		if (typeRaw === "section") {
			type = "section";
			// Cut at first heading or another jira-sync-*
			const headingMatch = rawContent.match(/\n#+? /);
			const contentBeforeHeading = headingMatch
				? rawContent.substring(0, (headingMatch.index||0)+1)
				: rawContent;
			actualEndIndex = match.index + fullMatch.length - (rawContent.length - contentBeforeHeading.length);
			extractedContent = contentBeforeHeading.trim();
		} else if (typeRaw === "line") {
			type = "line";
			// Content is on the same line only
			const firstLine = rawContent.split("\n")[0];
			actualEndIndex = match.index + fullMatch.length - (rawContent.length - firstLine.length);
			extractedContent = firstLine.trim();
		} else if (typeRaw === "inline-start") {
			type = "inline";
			// Content between inline-start and inline-end (markers included in fullMatch)
			actualEndIndex = match.index + fullMatch.length;
			extractedContent = rawContent.trim();
		} else if (typeRaw === "block-start") {
			type = "block";
			// Content between block-start and block-end
			const lines = rawContent.split("\n");
			const contentLines = lines.slice(lines[0] === "" ? 1 : 0, -1);
			const joinedContent = contentLines.join("\n");
			actualEndIndex = match.index + fullMatch.length;
			extractedContent = joinedContent.trim();
		} else {
			continue;
		}

		blocks.push({
			type,
			name,
			content: extractedContent,
			startIndex: match.index,
			endIndex: actualEndIndex,
			// indexesContent: fileContent.substring(match.index, actualEndIndex),
			fullMatch
		});
	}

	return blocks;
}

export function extractAllJiraSyncValuesFromContent(
	fileContent: string
): Record<string, string> {
	const blocks = parseFileContent(fileContent);
	const result: Record<string, string> = {};

	for (const block of blocks) {
		result[block.name] = block.content;
	}

	debugLog(`extracted content from file: ${JSON.stringify(result)}`);
	return result;
}

export function updateJiraSyncContent(
	fileContent: string,
	updates: Record<string, string>
): string {
	const blocks = parseFileContent(fileContent);

	// Sort blocks in reverse order to replace from end to start
	// This prevents index shifting issues
	blocks.sort((a, b) => b.startIndex - a.startIndex);

	let result = fileContent;

	for (const block of blocks) {
		if (!(block.name in updates)) {
			continue;
		}

		const newContent = updates[block.name];
		let newBlock: string;

		switch (block.type) {
			case "section":
				newBlock = `\`jira-sync-section-${block.name}\`\n${newContent}\n`;
				break;
			case "line":
				newBlock = `\`jira-sync-line-${block.name}\`${newContent.split("\n")[0]}`;
				break;
			case "inline":
				newBlock = `\`jira-sync-inline-start-${block.name}\`${newContent}\`jira-sync-end\``;
				break;
			case "block":
				newBlock = `\`jira-sync-block-start-${block.name}\`\n${newContent}\n\`jira-sync-end\``;
				break;
		}

		// Replace from end to start to avoid index shifting
		result = result.substring(0, block.startIndex) + newBlock + result.substring(block.endIndex);
	}

	return result;
}
