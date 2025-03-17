// commands/updateWorkLog.ts
import {Notice, TFile} from "obsidian";
import JiraPlugin from "../main";
import {getCurrentFileMainInfo} from "../file_operations/common_prepareData";
import {WorkLogModal} from "../modals/issueWorkLogModal";
import {addWorkLog, authenticate} from "../api";
import {debugLog} from "../tools/debugLogging";

/**
 * Register the update work log command
 */
export function registerUpdateWorkLogCommand(plugin: JiraPlugin): void {
	plugin.addCommand({
		id: "update-work-log-jira",
		name: "Update work log in Jira",
		callback: async () => {
			if (!(await authenticate(plugin))) {
				return;
			}

			const file = plugin.app.workspace.getActiveFile();
			if (!file) {
				new Notice("No active file found");
				return;
			}

			// Try batch processing first, then fall back to manual entry
			const batchProcessed = await processFrontmatterWorkLogs(plugin, file);
			if (!batchProcessed) {
				await processManualWorkLog(plugin);
			}
		},
	});
}

/**
 * Process work logs from frontmatter data
 */
async function processFrontmatterWorkLogs(plugin: JiraPlugin, file: TFile): Promise<boolean> {
	try {
		let workLogData: any[] = [];
		let foundData = false;

		await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
			if (frontmatter["jira_selected_week_data"]) {
				try {
					let jira_selected_week_data = frontmatter["jira_selected_week_data"];

					if (typeof jira_selected_week_data === 'string') {
						workLogData = JSON.parse(jira_selected_week_data);
					} else if (typeof jira_selected_week_data === 'object') {
						workLogData = jira_selected_week_data;
					} else {
						throw new TypeError(`jira_selected_week_data has an invalid type: ${typeof jira_selected_week_data}`);
					}
					foundData = true;
				} catch (error) {
					console.error("Failed to parse jira_selected_week_data:", error);
				}
			}
		});
		if (!foundData || workLogData.length === 0) {
			return false;
		}

		// Process found work logs
		await processWorkLogBatch(plugin, workLogData);
		return true;
	} catch (error) {
		console.error("Error processing frontmatter work logs:", error);
		new Notice("Failed to process work log data from frontmatter");
		return false;
	}
}

/**
 * Process a single manual work log entry
 */
async function processManualWorkLog(plugin: JiraPlugin): Promise<void> {
	const { issueKey } = await getCurrentFileMainInfo(plugin);

	if (!issueKey) {
		new Notice("No issue key found in the current file");
		return;
	}

	new WorkLogModal(plugin.app, async (timeSpent: string, startDate: string, comment: string) => {
		await addWorkLog(plugin, issueKey, timeSpent, startDate, comment);
	}).open();
}

/**
 * Process a batch of work logs
 */
async function processWorkLogBatch(plugin: JiraPlugin, workLogs: any[]): Promise<void> {
	const results = {
		success: 0,
		total: workLogs.length,
		failures: [] as { reason: string; issueKeys: string[] }[]
	};

	for (const workLog of workLogs) {
		try {
			const { issueKey, startTime, duration, comment } = workLog;

			if (!issueKey || !startTime || !duration) {
				addFailure(results, "Missing required fields", issueKey || "unknown");
				continue;
			}

			const startDate = convertToStandardDate(startTime);
			if (!startDate) {
				addFailure(results, "Invalid start time format", issueKey);
				continue;
			}
			const parsed_duration = parseDuration(duration);
			debugLog(`Duration: ${duration}, Parsed duration: ${parsed_duration}`);
			if (parsed_duration === '') {
				addFailure(results, "Duration must be at least 1 minute", issueKey);
				continue;
			}

			await addWorkLog(plugin, issueKey, parsed_duration, startDate, comment || "", false);
			results.success++;
		} catch (error) {
			addFailure(results, error.message || "Unknown error", workLog.issueKey || "unknown");
		}
	}

	// Show summary and errors
	showResults(results);
}

/**
 * Show batch processing results
 */
function showResults(results: { success: number, total: number, failures: { reason: string; issueKeys: string[] }[] }): void {
	new Notice(`Work logs updated: ${results.success}/${results.total} succeeded`);

	if (results.failures.length > 0) {
		console.error("Work log update failures:", results.failures);

		results.failures.forEach(failure => {
			if (failure.issueKeys.length > 0) {
				new Notice(`Failed: ${failure.reason} for issues: ${failure.issueKeys.join(", ")}`);
			}
		});
	}
}

/**
 * Add a failure entry to the results object
 */
function addFailure(results: { failures: { reason: string; issueKeys: string[] }[] }, reason: string, issueKey: string): void {
	const existingFailure = results.failures.find(f => f.reason === reason);
	if (existingFailure) {
		existingFailure.issueKeys.push(issueKey);
	} else {
		results.failures.push({ reason, issueKeys: [issueKey] });
	}
}

/**
 * Convert date from DD-MM-YYYY HH:MM format to YYYY-MM-DDTHH:MM:SS.000+0000
 */
function convertToStandardDate(dateString: string): string | null {
	try {
		const [datePart, timePart] = dateString.split(' ');
		const [day, month, year] = datePart.split('-');
		const [hours, minutes] = timePart.split(':');
		return `${year}-${month}-${day}T${hours}:${minutes}:00.000+0000`;
	} catch (error) {
		console.error("Error converting date:", error);
		return null;
	}
}


function parseDuration(input: string): string {
	const regex = /(\d+)([wdhms])/g;
	let match;
	let validParts: string[] = [];

	while ((match = regex.exec(input)) !== null) {
		const value = parseInt(match[1], 10);
		const unit = match[2];

		if (value === 0) continue; // Filter out "0w", "0d", "0h", "0m", "0s"
		if (unit !== 's') validParts.push(`${value}${unit}`); // Exclude seconds
	}

	return validParts.join(' ');
}
