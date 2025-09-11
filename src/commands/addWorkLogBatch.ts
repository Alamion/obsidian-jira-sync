import {Notice, TFile} from "obsidian";
import JiraPlugin from "../main";
import {addWorkLog} from "../api";
import {debugLog} from "../tools/debugLogging";
import {checkCommandCallback} from "../tools/checkCommandCallback";
import {useTranslations} from "../localization/translator";

const t = useTranslations("commands.add_worklog.batch").t;

export function registerUpdateWorkLogBatchCommand(plugin: JiraPlugin): void {
	plugin.addCommand({
		id: "update-work-log-jira-batch",
		name: t("name"),
		checkCallback: (checking: boolean) => {
			return checkCommandCallback(plugin, checking, processFrontmatterWorkLogs, ["jira_worklog_batch"], ["jira_worklog_batch"]);
		},
	});
}

async function processFrontmatterWorkLogs(plugin: JiraPlugin, _: TFile, jira_worklog_batch: any): Promise<void> {
	try {
		let workLogData: any[] = [];
		let foundData = false;

		try {
			if (typeof jira_worklog_batch === 'string') {
				workLogData = JSON.parse(jira_worklog_batch);
				foundData = true;
			} else if (typeof jira_worklog_batch === 'object') {
				workLogData = jira_worklog_batch;
				foundData = true;
			} else {
				throw new TypeError(`jira_worklog_batch has an invalid type: ${typeof jira_worklog_batch}`);
			}
		} catch (error) {
			new Notice("Failed to parse jira_worklog_batch");
			console.error("Failed to parse jira_worklog_batch:", error);
		}

		if (!foundData || workLogData.length === 0) {
			new Notice("No work log data to process");
			console.warn("No work log data to process");
			return;
		}
		await processWorkLogBatch(plugin, workLogData);
	} catch (error) {
		console.error("Error processing frontmatter work logs:", error);
		new Notice("Failed to process work log data from frontmatter");
	}
}

export async function processWorkLogBatch(plugin: JiraPlugin, workLogs: any[]): Promise<void> {
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

	showResults(results);
}

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

function addFailure(results: { failures: { reason: string; issueKeys: string[] }[] }, reason: string, issueKey: string): void {
	const existingFailure = results.failures.find(f => f.reason === reason);
	if (existingFailure) {
		existingFailure.issueKeys.push(issueKey);
	} else {
		results.failures.push({ reason, issueKeys: [issueKey] });
	}
}

function convertToStandardDate(dateString: string): string | null {
	try {
		// Try to parse the date string directly
		const date = new Date(dateString);

		if (isNaN(date.getTime())) {
			throw new Error("Invalid date format");
		}

		// Format to ISO string and adjust to desired format
		const isoString = date.toISOString();
		return isoString.replace('Z', '+0000');

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

		if (value === 0) continue;
		if (unit !== 's') validParts.push(`${value}${unit}`);
	}

	return validParts.join(' ');
}
