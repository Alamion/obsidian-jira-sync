export type TimeTrackerFormat = 'timekeep' | 'simple-time-tracker';

export interface TimeTrackerEntry {
	name: string;
	startTime?: string | null;
	endTime?: string | null;
	subEntries?: TimeTrackerEntry[];
	collapsed?: boolean;
}

export interface TimeTrackerData {
	entries: TimeTrackerEntry[];
}

export interface TimeTrackerBlock {
	format: TimeTrackerFormat;
	file: string;
	path: string;
	issueKey?: string;
	data: TimeTrackerData;
}

export interface ProcessedEntry {
	file: string;
	issueKey?: string;
	blockPath: string;
	lastBlockName: string;
	startTime: string;
	endTime: string;
	duration: string;
	timestamp: number;
}

export interface GroupedEntries {
	[periodKey: string]: ProcessedEntry[];
}

export function parseTimeBlocks(
	content: string,
	file: { name: string; path: string },
	issueKey?: string,
): TimeTrackerBlock[] {
	const blocks: TimeTrackerBlock[] = [];

	const timekeepMatches = content.match(/```timekeep([\s\S]*?)```/g);
	if (timekeepMatches) {
		timekeepMatches.forEach((block) => {
			try {
				const jsonContent = block.slice(11, -3).trim();
				const data = JSON.parse(jsonContent) as TimeTrackerData;

				blocks.push({
					format: 'timekeep',
					file: file.name,
					path: file.path,
					issueKey,
					data,
				});
			} catch (error) {
				console.error(`Error parsing timekeep block in ${file.name}:`, error);
			}
		});
	}

	const simpleTrackerMatches = content.match(/```simple-time-tracker([\s\S]*?)```/g);
	if (simpleTrackerMatches) {
		simpleTrackerMatches.forEach((block) => {
			try {
				const jsonContent = block.slice(22, -3).trim();
				const data = JSON.parse(jsonContent) as TimeTrackerData;

				blocks.push({
					format: 'simple-time-tracker',
					file: file.name,
					path: file.path,
					issueKey,
					data,
				});
			} catch (error) {
				console.error(`Error parsing simple-time-tracker block in ${file.name}:`, error);
			}
		});
	}

	return blocks;
}

function parseMsToDuration(ms: number): string {
	if (ms < 0) return '0s';

	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = minutes / 60;

	if (hours >= 1) {
		const h = Math.floor(hours);
		const m = Math.floor((hours - h) * 60);
		return m > 0 ? `${h}h ${m}m` : `${h}h`;
	}

	if (minutes >= 1) {
		const m = Math.floor(minutes);
		const s = seconds % 60;
		return s > 0 ? `${m}m ${s}s` : `${m}m`;
	}

	return `${seconds}s`;
}

function toLocalIso(date: Date): string {
	const offset = date.getTimezoneOffset();
	const localDate = new Date(date.getTime() - offset * 60 * 1000);
	return localDate.toISOString().slice(0, 16).replace('T', ' ');
}

export function processTimeEntries(
	entries: TimeTrackerEntry[] | undefined,
	fileName: string,
	issueKey: string | undefined,
	parentPath: string,
	groupedEntries: GroupedEntries,
	isDateInRange: (date: Date) => boolean,
	getPeriodKey: (date: Date) => string,
): void {
	if (!entries || !Array.isArray(entries)) return;

	for (const entry of entries) {
		const currentPath = parentPath ? `${parentPath} > ${entry.name}` : entry.name;

		if (entry.startTime) {
			const startTime = new Date(entry.startTime);

			if (!isDateInRange(startTime)) continue;

			const periodKey = getPeriodKey(startTime);
			if (!groupedEntries[periodKey]) groupedEntries[periodKey] = [];

			let duration: string;
			let endTime: Date;

			if (entry.endTime) {
				endTime = new Date(entry.endTime);
				duration = parseMsToDuration(endTime.getTime() - startTime.getTime());
			} else {
				endTime = new Date();
				duration = 'ongoing';
			}

			groupedEntries[periodKey].push({
				file: fileName.replace('.md', ''),
				issueKey: issueKey,
				blockPath: currentPath,
				lastBlockName: entry.name,
				startTime: toLocalIso(startTime),
				endTime: entry.endTime ? toLocalIso(endTime) : 'ongoing',
				duration: duration,
				timestamp: startTime.getTime(),
			});
		}

		if (entry.subEntries && Array.isArray(entry.subEntries)) {
			processTimeEntries(
				entry.subEntries,
				fileName,
				issueKey,
				currentPath,
				groupedEntries,
				isDateInRange,
				getPeriodKey,
			);
		}
	}
}
