interface Entry {
	name: string;
	startTime?: string;
	endTime?: string;
	subEntries?: Entry[];
}

interface TimekeepData {
	entries: Entry[];
}

interface TimekeepBlock {
	file: string;
	path: string;
	issueKey?: string;
	data: TimekeepData;
}

interface ProcessedEntry {
	file: string;
	issueKey?: string;
	blockPath: string;
	startTime: string;
	endTime: string;
	duration: string;
}

interface GroupedEntries {
	[weekKey: string]: ProcessedEntry[];
}

interface ObsidianFile {
	path: string;
	name: string;
	key?: string | null;
}

interface ObsidianMetadata {
	frontmatter?: {
		key?: string;
	};
}

interface ObsidianApp {
	vault: {
		getMarkdownFiles: () => ObsidianFile[];
		read: (file: ObsidianFile) => Promise<string>;
	};
	metadataCache: {
		getFileCache: (file: ObsidianFile) => ObsidianMetadata | null;
	};
}

declare const app: ObsidianApp;
declare const dv: {
	header: (level: number, text: string) => void;
	table: (headers: string[], data: any[][]) => void;
	paragraph: (text: string) => void;
};

export class TimekeepProcessor {
	private tasksDirectory: string;
	private showMaxWeeks: number;
	private files: ObsidianFile[];

	constructor(tasksDirectory = "Kanban", showMaxWeeks = 3) {
		this.tasksDirectory = tasksDirectory;
		this.showMaxWeeks = showMaxWeeks;
		this.files = app.vault.getMarkdownFiles().filter(
			file => file.path.startsWith(`${this.tasksDirectory}/`) && file.key !== null
		);
	}

	private formatDate(date: Date, format: string): string {
		const pad = (num: number): string => num.toString().padStart(2, '0');

		const year = date.getFullYear();
		const month = pad(date.getMonth() + 1);
		const day = pad(date.getDate());
		const hours = pad(date.getHours());
		const minutes = pad(date.getMinutes());

		return format
			.replace('YYYY', year.toString())
			.replace('MM', month)
			.replace('DD', day)
			.replace('HH', hours)
			.replace('mm', minutes);
	}

	private getWeekStartDate(date: Date): Date {
		const result = new Date(date);
		const day = result.getDay();
		const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
		result.setDate(diff);
		return new Date(result.setHours(0, 0, 0, 0)); // Start of the day
	}

	private formatDuration(ms: number): string {
		const units = [
			{ label: "w", ms: 1000 * 60 * 60 * 24 * 7 },
			{ label: "d", ms: 1000 * 60 * 60 * 24 },
			{ label: "h", ms: 1000 * 60 * 60 },
			{ label: "m", ms: 1000 * 60 },
			{ label: "s", ms: 1000 }
		];

		let remainingMs = ms;
		let result: string[] = [];

		for (const unit of units) {
			const value = Math.floor(remainingMs / unit.ms);
			if (value > 0) {
				result.push(`${value}${unit.label}`);
				remainingMs %= unit.ms;
			}
		}

		return result.length > 0 ? result.join(" ") : "0s";
	}

	private trimOldEntries(groupedByWeek: GroupedEntries, maxWeeks: number): void {
		const dates = Object.keys(groupedByWeek).sort();

		while (dates.length > maxWeeks) {
			const oldestDate = dates.shift();
			if (oldestDate) {
				delete groupedByWeek[oldestDate];
			}
		}
	}

	private processEntries(
		entries: Entry[] | undefined,
		fileName: string,
		issueKey: string | undefined,
		parentPath: string,
		groupedByWeek: GroupedEntries
	): void {
		if (!entries || !Array.isArray(entries)) return;

		for (const entry of entries) {
			// Create the current block path
			const currentPath = parentPath ? `${parentPath} > ${entry.name}` : entry.name;

			// Process this entry if it has a start time
			if (entry.startTime) {
				const startTime = new Date(entry.startTime);
				const weekStart = this.getWeekStartDate(startTime);
				const weekKey = weekStart.toISOString().split('T')[0];

				// Initialize the week array if it doesn't exist
				if (!groupedByWeek[weekKey]) groupedByWeek[weekKey] = [];

				// Calculate duration
				let duration: string;
				let endTime: Date;

				if (entry.endTime) {
					endTime = new Date(entry.endTime);
					duration = this.formatDuration(endTime.getTime() - startTime.getTime());
				} else {
					endTime = new Date();
					duration = "ongoing";
				}

				// Add to grouped data
				groupedByWeek[weekKey].push({
					file: fileName.replace(".md", ""),
					issueKey: issueKey,
					blockPath: currentPath,
					startTime: this.formatDate(startTime, 'DD-MM-YYYY HH:mm'),
					endTime: entry.endTime ? this.formatDate(endTime, 'DD-MM-YYYY HH:mm') : "ongoing",
					duration: duration
				});
			}

			// Process subentries recursively
			if (entry.subEntries && Array.isArray(entry.subEntries)) {
				this.processEntries(entry.subEntries, fileName, issueKey, currentPath, groupedByWeek);
			}
		}
	}

	public async processFiles(): Promise<void> {
		const timekeepBlocks: TimekeepBlock[] = [];

		// Process all files in one go
		await Promise.all(this.files.map(async file => {
			const content = await app.vault.read(file);

			if (!content.includes("```timekeep")) return;
			const metadata = app.metadataCache.getFileCache(file);
			const issueKey = metadata?.frontmatter?.key;

			const timekeepMatches = content.match(/```timekeep([\s\S]*?)```/g);
			timekeepMatches?.forEach(block => {
				try {
					const jsonContent = block.slice(11, -3).trim();
					const data = JSON.parse(jsonContent);

					timekeepBlocks.push({
						file: file.name,
						path: file.path,
						issueKey,
						data
					});
				} catch (error) {
					console.error(`Error in ${file.name}:`, error);
				}
			});
		}));

		// Group entries by week
		const groupedByWeek: GroupedEntries = {};

		// Process all timekeep blocks once
		timekeepBlocks.forEach(block => {
			this.processEntries(block.data.entries, block.file, block.issueKey, "", groupedByWeek);
		});

		// Trim old entries to show only the most recent weeks
		this.trimOldEntries(groupedByWeek, this.showMaxWeeks);

		// Display results
		if (Object.keys(groupedByWeek).length > 0) {
			// Sort weeks chronologically
			const sortedWeeks = Object.keys(groupedByWeek).sort();

			for (const week of sortedWeeks) {
				const entries = groupedByWeek[week];
				dv.header(3, `Week of ${week}`);
				dv.table(
					["Task", "Block Path", "Start Time", "Duration"],
					entries.map(entry => [
						entry.file,
						entry.blockPath,
						entry.startTime,
						entry.duration
					])
				);
			}

			// Create options for metabind select
			const options = sortedWeeks
				.map(week => `option('${JSON.stringify(groupedByWeek[week])}', ${'Week of '+week})`)
				.join(",\n");

			// Display meta-bind controls
			// dv.paragraph(`Select a week to sent work log to Jira. Always reselect before pressing the button`);
			dv.paragraph(`\`\`\`meta-bind
INPUT[inlineSelect(option('[]', 'select week'), ${options}): jira_worklog_batch]
\`\`\``);

			dv.paragraph(`\`\`\`meta-bind-button
label: Send worklog to Jira
hidden: false
id: ""
style: primary
actions:
  - type: command
    command: jira-sync:update-work-log-jira-batch
\`\`\``);
		} else {
			dv.paragraph("No entries found.");
		}
	}
}

// This will be the minified entry point
export function runTimekeep(tasksDir = "Jira Issues", maxWeeks = 3): void {
	const processor = new TimekeepProcessor(tasksDir, maxWeeks);
	processor.processFiles();
}
