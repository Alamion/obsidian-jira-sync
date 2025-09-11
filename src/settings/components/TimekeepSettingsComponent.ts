import {Setting, Notice, setIcon} from 'obsidian';
import { SettingsComponent, SettingsComponentProps } from '../../interfaces/settingsTypes';
import { processWorkLogBatch } from "../../commands";
import { SuggestSelectComponent, SuggestSelectConfig } from './SuggestSelectComponent';
import {useTranslations} from "../../localization/translator";
import {debugLog} from "../../tools/debugLogging";

type TimeRangeType = 'days' | 'weeks' | 'months' | 'custom';

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
	timestamp: number; // For easier sorting and filtering
}

interface GroupedEntries {
	[periodKey: string]: ProcessedEntry[];
}

const t = useTranslations("settings.statistics").t;

export class TimekeepSettingsComponent implements SettingsComponent {
	private props: SettingsComponentProps;

	// Data
	private groupedByPeriod: GroupedEntries = {};
	private selectedPeriodData: ProcessedEntry[] = [];
	private containerEl: HTMLElement | null = null;
	private periodSelector: SuggestSelectComponent | null = null;

	// Elements
	private maxItemsSetting: Setting | null = null;
	private customDatesContainer: HTMLElement | null = null;
	private sendButton: HTMLButtonElement | null = null;

	constructor(props: SettingsComponentProps) {
		this.props = props;
	}

	render(containerEl: HTMLElement): void {
		this.containerEl = containerEl;
		containerEl.empty();

		this.renderSettings(containerEl);
		this.renderPeriodSelector(containerEl);
		this.toggleCustomDateInputs();

		// Initialize data
		this.refreshData(true);
	}

	private renderSettings(containerEl: HTMLElement): void {
		const settingsContainer = containerEl.createDiv('timekeep-settings');

		// Time range selector
		new Setting(settingsContainer)
			.setName(t("settings.time_range.name"))
			.setDesc(t("settings.time_range.description"))
			.addDropdown(dropdown => {
				dropdown.addOption('days', t("settings.time_range.options.days"));
				dropdown.addOption('weeks', t("settings.time_range.options.weeks"));
				dropdown.addOption('months', t("settings.time_range.options.months"));
				dropdown.addOption('custom', t("settings.time_range.options.custom"));
				dropdown.setValue(this.props.plugin.settings.statisticsTimeType);
				dropdown.onChange(async (value: TimeRangeType) => {
					this.props.plugin.settings.statisticsTimeType = value;
					this.toggleCustomDateInputs();
					await this.refreshData();
				});
			});

		// Max items slider (hidden for custom range)
		const maxItemsSetting = new Setting(settingsContainer)
			.setName(t("settings.max_items.name"))
			.setDesc(t("settings.max_items.description"))
			.addSlider(slider => {
				slider.setLimits(1, 20, 1)
					.setValue(this.props.plugin.settings.maxItemsToShow)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.props.plugin.settings.maxItemsToShow = value;
						await this.refreshData();
					});
			});

		// Custom date inputs (initially hidden)
		const customDatesContainer = settingsContainer.createDiv('custom-dates-container');

		new Setting(customDatesContainer)
			.setName(t("settings.date_from.name"))
			.setDesc(t("settings.date_from.description"))
			.addText(text => {
				text.setPlaceholder(t("settings.date_from.placeholder"));
				text.setValue(this.props.plugin.settings.customDateRange.start);
				text.onChange(async (value) => {
					this.props.plugin.settings.customDateRange.start = value;
					if (this.props.plugin.settings.statisticsTimeType === 'custom' && this.props.plugin.settings.customDateRange.end) {
						await this.refreshData();
					}
				});
			});

		new Setting(customDatesContainer)
			.setName(t("settings.date_to.name"))
			.setDesc(t("settings.date_to.description"))
			.addText(text => {
				text.setPlaceholder(t("settings.date_to.placeholder"));
				text.setValue(this.props.plugin.settings.customDateRange.end);
				text.onChange(async (value) => {
					this.props.plugin.settings.customDateRange.end = value;
					if (this.props.plugin.settings.statisticsTimeType === 'custom' && this.props.plugin.settings.customDateRange.start) {
						await this.refreshData();
					}
				});
			});

		// Store references for toggling
		this.maxItemsSetting = maxItemsSetting;
		this.customDatesContainer = customDatesContainer;
	}

	private toggleCustomDateInputs(): void {
		if (!this.maxItemsSetting || !this.customDatesContainer) return;

		const isCustom = this.props.plugin.settings.statisticsTimeType === 'custom';

		if (isCustom) {
			this.maxItemsSetting.settingEl.hide()
			this.customDatesContainer.show();
		} else {
			this.maxItemsSetting.settingEl.show();
			this.customDatesContainer.hide();
		}
	}

	private async refreshData(disableNotification = false): Promise<void> {
		if (!this.containerEl) return;

		// Показываем индикатор загрузки
		this.containerEl.addClass('timekeep-loading');

		try {
			await this.processFiles();
			this.updateDisplay();
			if (!disableNotification) new Notice(t("messages.refresh_success"));
		} catch (error) {
			console.error('Error refreshing timekeep data:', error);
			new Notice(t("messages.refresh_error", { error: error.message }));
		} finally {
			// Убираем индикатор загрузки
			this.containerEl.removeClass('timekeep-loading');
		}
	}

	private updateDisplay(): void {
		if (!this.containerEl) return;

		// Remove existing display elements
		this.containerEl.querySelector('.all-periods-display')?.remove();
		this.containerEl.querySelector('.timekeep-no-data')?.remove();

		if (Object.keys(this.groupedByPeriod).length === 0) {
			this.containerEl.createEl('div', {
				text: t("display.no_entries"),
				cls: 'timekeep-no-data'
			});
			return;
		}

		this.renderAllPeriodsDisplay(this.containerEl as HTMLElement);
	}

	private renderPeriodSelector(container: HTMLElement): void {
		const setting = new Setting(container).setClass('period-selector')
			.setName(t("display.select_period") + ': ');

		const config: SuggestSelectConfig = {
			placeholder: t("display.select_period_placeholder"),
			searchEnabled: false
		};

		this.periodSelector = new SuggestSelectComponent(config);
		this.periodSelector.render(setting.controlEl);

		this.sendButton = setting.controlEl.createEl('button', {
			text: t("actions.send_to_jira"),
			cls: 'timekeep-btn'
		});
		this.sendButton.addEventListener('click', () => this.sendWorkLogToJira());

		this.periodSelector.onChange((selectedPeriod) => {
			if (selectedPeriod) {
				this.selectedPeriodData = this.groupedByPeriod[selectedPeriod] || [];
				this.sendButton? this.sendButton.disabled = false : null;
			}
			else {
				this.selectedPeriodData = [];
				this.sendButton? this.sendButton.disabled = true : null;
			}
		});
	}

	private renderAllPeriodsDisplay(container: HTMLElement): void {
		const display = container.createDiv('all-periods-display jira-copyable timekeep-fade-in');
		display.createEl('h3', {
			text: t("display.all_periods"),
			cls: 'timekeep-section-title'
		});

		const sortedPeriods = Object.keys(this.groupedByPeriod).sort().reverse();

		sortedPeriods.forEach((period, index) => {
			const periodDiv = display.createDiv('period-section');
			periodDiv.style.animationDelay = `${index * 50}ms`;

			// Calculate total duration for this period
			const totalMs = this.groupedByPeriod[period].reduce((sum, e) => {
				return e.duration === 'ongoing' ? sum : sum + this.parseDurationToMs(e.duration);
			}, 0);

			// Create period header with title and total
			const headerContainer = periodDiv.createDiv('timekeep-period-header');
			headerContainer.createEl('h4', {
				text: this.formatPeriodLabel(period),
				cls: 'timekeep-period-title'
			});
			headerContainer.createEl('span', {
				text: this.parseMsToDuration(totalMs),
				cls: 'timekeep-period-total'
			});

			this.createEntriesTable(periodDiv, this.groupedByPeriod[period]);
		});
	}

	private groupAndSummarizeEntries(entries: ProcessedEntry[]):
		Record<string, Record<string, { entries: ProcessedEntry[], totalMs: number }>>
	{
		const grouped: ReturnType<typeof this.groupAndSummarizeEntries> = {};

		entries.forEach(entry => {
			const file = entry.file;
			const issueKey = entry.issueKey || "no-issue";

			if (!grouped[file]) grouped[file] = {};
			if (!grouped[file][issueKey]) {
				grouped[file][issueKey] = { entries: [], totalMs: 0 };
			}

			const group = grouped[file][issueKey];

			if (entry.duration !== 'ongoing') {
				const ms = this.parseDurationToMs(entry.duration);
				group.totalMs += ms;
			}

			group.entries.push(entry);
		});

		return grouped;
	}

	private createEntriesTable(container: HTMLElement, entries: ProcessedEntry[]): void {
		if (!entries.length) return;

		const grouped = this.groupAndSummarizeEntries(entries);
		const tableContainer = container.createDiv('timekeep-table-container');
		const groupCards: HTMLDivElement[] = [];

		Object.entries(grouped).forEach(([file, issueMap]) => {
			Object.entries(issueMap).forEach(([issueKey, group]) => {
				// Create group card
				const groupCard = tableContainer.createDiv('timekeep-group-card collapsed');
				groupCards.push(groupCard);
				
				// Create group header
				const groupHeader = groupCard.createDiv('timekeep-group-header');
				groupHeader.addEventListener('click', () => {
					groupCard.classList.toggle('collapsed');
				});

				// Group title
				const groupTitle = groupHeader.createEl('div', { cls: 'timekeep-group-title' });
				groupTitle.createEl('span', { text: file });

				// Group meta (issue key and duration)
				const groupMeta = groupHeader.createEl('div', { cls: 'timekeep-group-meta' });

				if (issueKey && issueKey !== 'no-issue') {
					const issueKeySpan = groupMeta.createEl('a', {
						text: issueKey, 
						cls: 'timekeep-group-issue-key',
						attr: {
							href: `${this.props.plugin.settings.jiraUrl}/browse/${issueKey}`,
							target: "_blank",
							rel: "noopener noreferrer"
						}
					});
					issueKeySpan.addEventListener('click', (e) => {
						e.stopPropagation();
					});
					debugLog(`${this.props.plugin.settings.jiraUrl}/browse/${issueKey}`)
				}
				groupMeta.createEl('span', { 
					text: this.parseMsToDuration(group.totalMs), 
					cls: 'timekeep-group-duration' 
				});

				// Collapse icon
				const chevron = groupMeta.createEl('span', {
					cls: 'jira-collapse-icon',
				});
				setIcon(chevron, "chevron-down");

				// Create entries container
				const entriesContainer = groupCard.createDiv('timekeep-entries-container');

				// Add column labels if there are entries
				if (group.entries.length > 0) {
					const labelsDiv = entriesContainer.createDiv('timekeep-entry-labels');
					labelsDiv.createEl('div', { 
						text: t("display.table.task"), 
						cls: 'timekeep-entry-label-task'
					});
					labelsDiv.createEl('div', { 
						text: t("display.table.start_time"), 
						cls: 'timekeep-entry-label-start'
					});
					labelsDiv.createEl('div', { 
						text: t("display.table.duration"), 
						cls: 'timekeep-entry-label-duration'
					});
				}

				// Individual entries
				group.entries.forEach((entry) => {
					const entryDiv = entriesContainer.createDiv('timekeep-entry');
					
					// Block path
					entryDiv.createEl('div', { 
						text: entry.blockPath, 
						cls: 'timekeep-entry-block-path',
						title: entry.blockPath
					});

					// Start time
					entryDiv.createEl('div', { 
						text: entry.startTime, 
						cls: 'timekeep-entry-start-time',
						title: entry.startTime
					});

					// Duration
					entryDiv.createEl('div', { 
						text: entry.duration, 
						cls: 'timekeep-entry-duration',
						title: entry.duration
					});
				});
			});
		});
		if (groupCards.length > 0) {
			const lastCard = groupCards[groupCards.length - 1];
			lastCard.classList.add('timekeep-last-group-card');
		}
	}

	private async sendWorkLogToJira(): Promise<void> {
		if (this.selectedPeriodData.length === 0) {
			new Notice(t("messages.select_period_first"));
			return;
		}

		try {
			await processWorkLogBatch(this.props.plugin, this.selectedPeriodData);
			new Notice(t("messages.send_success"));
		} catch (error) {
			console.error('Error sending work log to Jira:', error);
			new Notice(t("messages.send_error", { error: error.message }));
		}
	}

	private formatPeriodLabel(periodKey: string): string {
		return t("display.period_of", { date: this.formatPeriodDate(periodKey) });
	}

	private formatPeriodDate(periodKey: string): string {
		const type = this.props.plugin.settings.statisticsTimeType;

		if (type === 'custom') {
			const from = this.props.plugin.settings.customDateRange.start;
			const to = this.props.plugin.settings.customDateRange.end;
			return `${from} – ${to}`;
		}

		const date = new Date(periodKey);

		switch (type) {
			case 'days':
				return date.toISOString().split('T')[0];
			case 'weeks': {
				const weekEnd = new Date(date);
				weekEnd.setDate(weekEnd.getDate() + 6);
				return `${date.toISOString().split('T')[0]} – ${weekEnd.toISOString().split('T')[0]}`;
			}
			case 'months':
				return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
			default:
				return date.toISOString().split('T')[0];
		}
	}

	private getPeriodKey(date: Date): string {
		switch (this.props.plugin.settings.statisticsTimeType) {
			case 'days':
				return date.toISOString().split('T')[0];
			case 'weeks':
				const weekStart = this.getWeekStartDate(date);
				return `week-${weekStart.toISOString().split('T')[0]}`;
			case 'months':
				return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
			case 'custom':
				return 'custom-range';
			default:
				return date.toISOString().split('T')[0];
		}
	}

	private isDateInRange(date: Date): boolean {
		if (this.props.plugin.settings.statisticsTimeType !== 'custom') return true;

		if (!this.props.plugin.settings.customDateRange.start || !this.props.plugin.settings.customDateRange.end) return false;

		const from = new Date(this.props.plugin.settings.customDateRange.start);
		const to = new Date(this.props.plugin.settings.customDateRange.end);
		const toPlusOneDay = new Date(to);
		toPlusOneDay.setDate(to.getDate() + 1);
		return date >= from && date <= toPlusOneDay;
	}

	private validateCustomRange(): boolean {
		if (this.props.plugin.settings.statisticsTimeType !== 'custom') return true;

		if (!this.props.plugin.settings.customDateRange.start || !this.props.plugin.settings.customDateRange.end) {
			new Notice(t("messages.custom_range_required"));
			return false;
		}

		const from = new Date(this.props.plugin.settings.customDateRange.start);
		const to = new Date(this.props.plugin.settings.customDateRange.end);

		if (from > to) {
			new Notice(t("messages.invalid_date_range"));
			return false;
		}

		return true;
	}

	// Utility methods
	private getWeekStartDate(date: Date): Date {
		const result = new Date(date);
		const day = result.getDay();
		const diff = result.getDate() - day + (day === 0 ? -6 : 1);
		result.setDate(diff);
		return new Date(result.setHours(0, 0, 0, 0));
	}

	private parseMsToDuration(ms: number): string {
		const units: { label: string; ms: number }[] = [
			{ label: "w", ms: 1000 * 60 * 60 * 24 * 7 },
			{ label: "d", ms: 1000 * 60 * 60 * 24 },
			{ label: "h", ms: 1000 * 60 * 60 },
			{ label: "m", ms: 1000 * 60 },
			{ label: "s", ms: 1000 }
		];

		let remainingMs = ms;
		const result: string[] = [];

		for (const unit of units) {
			const value = Math.floor(remainingMs / unit.ms);
			if (value > 0) {
				result.push(`${value}${unit.label}`);
				remainingMs %= unit.ms;
			}
		}

		return result.length > 0 ? result.join(" ") : "0s";
	}

	private parseDurationToMs(duration: string): number {
		if (duration === 'ongoing') return 0;

		const units: { label: string; ms: number }[] = [
			{ label: "w", ms: 1000 * 60 * 60 * 24 * 7 },
			{ label: "d", ms: 1000 * 60 * 60 * 24 },
			{ label: "h", ms: 1000 * 60 * 60 },
			{ label: "m", ms: 1000 * 60 },
			{ label: "s", ms: 1000 }
		];

		let ms = 0;
		let temp = duration;

		for (const unit of units) {
			const match = temp.match(new RegExp(`(\\d+)${unit.label}`));
			if (match) {
				ms += parseInt(match[1]) * unit.ms;
				temp = temp.replace(match[0], '');
			}
		}

		return ms;
	}

	private trimOldEntries(groupedEntries: GroupedEntries): void {
		if (this.props.plugin.settings.statisticsTimeType === 'custom') return;

		const periods = Object.keys(groupedEntries).sort();
		while (periods.length > this.props.plugin.settings.maxItemsToShow) {
			const oldestPeriod = periods.shift();
			if (oldestPeriod) {
				delete groupedEntries[oldestPeriod];
			}
		}
	}

	private processEntries(
		entries: Entry[] | undefined,
		fileName: string,
		issueKey: string | undefined,
		parentPath: string,
		groupedEntries: GroupedEntries
	): void {
		if (!entries || !Array.isArray(entries)) return;

		for (const entry of entries) {
			const currentPath = parentPath ? `${parentPath} > ${entry.name}` : entry.name;

			if (entry.startTime) {
				const startTime = new Date(entry.startTime);

				// Check if date is in range for custom range
				if (!this.isDateInRange(startTime)) continue;

				const periodKey = this.getPeriodKey(startTime);
				if (!groupedEntries[periodKey]) groupedEntries[periodKey] = [];

				let duration: string;
				let endTime: Date;

				if (entry.endTime) {
					endTime = new Date(entry.endTime);
					duration = this.parseMsToDuration(endTime.getTime() - startTime.getTime());
				} else {
					endTime = new Date();
					duration = "ongoing";
				}

				groupedEntries[periodKey].push({
					file: fileName.replace(".md", ""),
					issueKey: issueKey,
					blockPath: currentPath,
					startTime: this.toLocalIso(startTime),
					endTime: entry.endTime ? this.toLocalIso(endTime) : "ongoing",
					duration: duration,
					timestamp: startTime.getTime()
				});
			}

			// Process sub-entries recursively
			if (entry.subEntries && Array.isArray(entry.subEntries)) {
				this.processEntries(entry.subEntries, fileName, issueKey, currentPath, groupedEntries);
			}
		}
	}

	private async processFiles(): Promise<void> {
		if (!this.validateCustomRange()) return;

		const timekeepBlocks: TimekeepBlock[] = [];
		const files = this.props.app.vault.getMarkdownFiles().filter(
			file => file.path.startsWith(`${this.props.plugin.settings.issuesFolder}/`)
		);

		await Promise.all(files.map(async file => {
			const content = await this.props.app.vault.read(file);
			if (!content.includes("```timekeep")) return;

			const metadata = this.props.app.metadataCache.getFileCache(file);
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
					console.error(`Error parsing timekeep block in ${file.name}:`, error);
				}
			});
		}));

		this.groupedByPeriod = {};

		timekeepBlocks.forEach(block => {
			this.processEntries(block.data.entries, block.file, block.issueKey, "", this.groupedByPeriod);
		});

		debugLog("grouped entries", this.groupedByPeriod);

		this.trimOldEntries(this.groupedByPeriod);

		const sortedPeriods = Object.keys(this.groupedByPeriod).sort().reverse(); // Most recent first
		const options = sortedPeriods.map(period => ({
			value: period,
			label: this.formatPeriodLabel(period)
		}));

		this.periodSelector?.setOptions(options);
		this.periodSelector?.setValue("");
		this.sendButton ? this.sendButton.disabled = true : null;
	}

	hide(): void {
		this.containerEl = null;
		this.periodSelector = null;
	}

	private toUtcIso(date: Date): string {
		return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
			.toISOString()
			.replace(".000", ""); // Optional: trim millis if needed
	}

	private toLocalIso(date: Date): string {
		return date.toISOString().slice(0, 19).replace("T", " ");
	}

}
