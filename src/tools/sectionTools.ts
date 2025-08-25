import {debugLog} from "./debugLogging";

const getSectionRegex = (sectionName: string) => new RegExp(`\`jira-sync-section-${sectionName}\`([\\s\\S]*?)\\n?([\\s\\S]*?)(?=\\n#+ |\\n\`jira-sync-|$)`, 'g');
const getLineRegex = (sectionName: string) => new RegExp(`\`jira-sync-line-${sectionName}\` *(.*?)(?=\\n|$)`, 'g');
//   ([w-]+)

/**
 * Updates or adds a Jira sync section in the file content
 * @param fileContent - The current content of the file
 * @param sectionName - The name of the section (without jira-sync- prefix)
 * @param markdownContent - The content in markdown format
 * @param force - If true, the section will be created if it doesn't exist
 * @returns The updated file content
 */
export function updateJiraSyncContent(fileContent: string, sectionName: string, markdownContent: string, force: boolean = false): string {
	fileContent = updateJiraSyncSection(fileContent, sectionName, markdownContent, force);
	fileContent = updateJiraSyncLine(fileContent, sectionName, markdownContent, force);
	return fileContent;
}

/**
 * Updates or adds a Jira sync section in the file content
 * @param fileContent - The current content of the file
 * @param sectionName - The name of the section (without jira-sync-section- prefix)
 * @param markdownContent - The content in markdown format
 * @param force - If true, the section will be created if it doesn't exist
 * @returns The updated file content
 */
function updateJiraSyncSection(fileContent: string, sectionName: string, markdownContent: string, force: boolean = false): string {
	const sectionRegex = getSectionRegex(sectionName);

	// If section exists, update it, otherwise append it
	// debugLog(`Trying to find field ${sectionName} in section`)
	if (sectionRegex.test(fileContent)) {
		// Reset regex lastIndex
		sectionRegex.lastIndex = 0;
		return fileContent.replace(
			sectionRegex,
			(_, group1) => `\`jira-sync-section-${sectionName}\`${group1}\n${markdownContent}`
		);
	} else if (force) {
		// No section found, append it
		return fileContent + `\n\n\`jira-sync-section-${sectionName}\`\n${markdownContent}\n`;
	} else {
		return fileContent;
	}
}

/**
 * Updates or adds a Jira sync line in the file content
 * @param fileContent - The current content of the file
 * @param lineName - The name of the line (without jira-sync-line- prefix)
 * @param lineContent - The content for the line
 * @param force - If true, the line will be created if it doesn't exist
 * @returns The updated file content
 */
function updateJiraSyncLine(fileContent: string, lineName: string, lineContent: string, force: boolean = false): string {
	const lineRegex = getLineRegex(lineName);
	const newLine = `\`jira-sync-line-${lineName}\` ${lineContent.split('\n')[0]}`;

	// If line exists, update it, otherwise append it
	// debugLog(`Trying to find field ${lineName} in line`)
	if (lineRegex.test(fileContent)) {
		// Reset regex lastIndex
		// debugLog(`Found a field ${lineName} in line`)
		lineRegex.lastIndex = 0;
		return fileContent.replace(lineRegex, newLine);
	} else if (force) {
		// No line found, append it
		return fileContent + `\n${newLine}`;
	} else {
		return fileContent;
	}
}

/**
 * Extracts all Jira sync sections and lines from file content
 * @param fileContent - The content of the file
 * @returns Object mapping section/line names to their content
 */
export function extractAllJiraSyncValuesFromContent(fileContent: string): Record<string, string> {
	const sections = extractAllJiraSyncValuesFromSections(fileContent);
	const lines = extractAllJiraSyncValuesFromLines(fileContent);
	debugLog(`extracted content from file: ${JSON.stringify({ ...sections, ...lines })}`);
	return { ...sections, ...lines };
}

/**
 * Extracts all Jira sync sections from file content
 * @param fileContent - The content of the file
 * @returns Object mapping section names to their content
 */
function extractAllJiraSyncValuesFromSections(fileContent: string): Record<string, string> {
	const sectionRegex = getSectionRegex(`([\\w-]+)`);
	debugLog(sectionRegex);
	const sections: Record<string, string> = {};
	let match;
	while ((match = sectionRegex.exec(fileContent)) !== null) {
		// debugLog(`Found match ${JSON.stringify(match)} in section`)
		const sectionName = match[1];
		sections[sectionName] = match[3].trim();
	}

	return sections;
}

/**
 * Extracts all Jira sync lines from file content
 * @param fileContent - The content of the file
 * @returns Object mapping line names to their content
 */
function extractAllJiraSyncValuesFromLines(fileContent: string): Record<string, string> {
	const lineRegex = getLineRegex(`([\\w-]+)`);
	debugLog(lineRegex);
	const lines: Record<string, string> = {};
	let match;
	while ((match = lineRegex.exec(fileContent)) !== null) {
		// debugLog(`Found match ${JSON.stringify(match)} in line`)
		const lineName = match[1];
		lines[lineName] = match[2].trim();
	}

	return lines;
}
