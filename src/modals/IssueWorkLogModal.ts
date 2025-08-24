import {App, Modal, Notice, Setting} from "obsidian";
import {useTranslations} from "../localization/translator";

const t = useTranslations("modals.worklog").t;

/**
 * Modal for adding work log entries
 */
export class IssueWorkLogModal extends Modal {
	private onSubmit: (timeSpent: string, startDate: string, workDescription: string) => void;
	private timeSpent: string = "";
	private startDate: string = "";
	private workDescription: string = "";
	private displayDate: string = "";
	private timeSpentSetting: Setting;
	private dateSetting: Setting;

	constructor(app: App, onSubmit: (timeSpent: string, startDate: string, workDescription: string) => void) {
		super(app);
		this.onSubmit = onSubmit;

		// Set default to current date
		const now = new Date();
		this.initializeDates(now);
	}

	private initializeDates(date: Date) {
		// Set the ISO format for API
		this.startDate = date.toISOString().split('.')[0] + ".000+0000";

		// Set the display format (01/Jun/21 09:00 AM)
		const months = t('months') as any;
		const day = String(date.getDate()).padStart(2, '0');
		const month = months[date.getMonth()];
		const year = String(date.getFullYear()).slice(2);
		const hours = date.getHours();
		const minutes = String(date.getMinutes()).padStart(2, '0');
		const ampm = hours >= 12 ? 'PM' : 'AM';
		const displayHours = hours % 12 || 12;

		this.displayDate = `${day}/${month}/${year} ${String(displayHours).padStart(2, '0')}:${minutes} ${ampm}`;
	}

	private parseDisplayDate(displayDate: string): Date | null {
		try {
			// Parse format: 01/Jun/21 09:00 AM
			const [datePart, timePart, ampm] = displayDate.split(' ');
			const [day, month, year] = datePart.split('/');
			const [hours, minutes] = timePart.split(':');

			const months = Object.fromEntries(
				(t('months') as any).map((month: string, index: number) => [month, index])
			) as Record<string, number>;

			// {'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
			// 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11};

			let hour = parseInt(hours);
			if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
			if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;

			const fullYear = parseInt(year) + 2000;

			// Create date object
			const date = new Date(fullYear, months[month as keyof typeof months], parseInt(day), hour, parseInt(minutes));
			if (isNaN(date.getTime())) throw new Error("Invalid date");

			return date;
		} catch (error) {
			return null;
		}
	}

	onOpen() {
		new Setting(this.contentEl).setName(t('name')).setHeading();
		// Time Spent field
		this.timeSpentSetting = new Setting(this.contentEl)
			.setName(t('spent.name'))
			.setDesc(t('spent.desc'))
			.addText((text) =>
				text
					.setPlaceholder(t('spent.placeholder'))
					.setValue(this.timeSpent)
					.onChange((value) => {
						this.timeSpent = value;
					})
			);

		this.dateSetting = new Setting(this.contentEl)
			.setName(t('start.name'))
			.setDesc(t('start.desc'))
			.addText((text) =>
				text
					.setPlaceholder(t('start.placeholder'))
					.setValue(this.displayDate)
					.onChange((value) => {
						this.displayDate = value;
					})
			);

		// Start Date field with date picker icon
		// const dateContainer = this.contentEl.createDiv("date-container");
		// dateContainer.style.display = "flex";
		// dateContainer.style.alignItems = "center";
		// dateContainer.style.gap = "10px";

		// const dateSetting = new Setting(this.contentEl)
		// 	.setName("Date Started")
		// 	.setDesc("Format: DD/MMM/YY HH:MM AM/PM")
		// 	.addText((text) =>
		// 		text
		// 			.setPlaceholder("e.g., 01/Jun/21 09:00 AM")
		// 			.setValue(this.displayDate)
		// 			.onChange((value) => {
		// 				this.displayDate = value;
		//
		// 				// Parse display date and convert to ISO
		// 				const parsedDate = this.parseDisplayDate(value);
		// 				if (parsedDate) {
		// 					this.startDate = parsedDate.toISOString().split('.')[0] + ".000+0000";
		// 				}
		// 			})
		// 	);

		// Add date picker later
		// const datePickerButton = dateContainer.createEl("button", { cls: "date-picker-button" });
		// // datePickerButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`;
		// datePickerButton.style.background = "transparent";
		// datePickerButton.style.border = "none";
		// datePickerButton.style.cursor = "pointer";
		// datePickerButton.style.padding = "4px";
		// setIcon(datePickerButton, "calendar")
		//
		// datePickerButton.addEventListener("click", (e) => {
		// 	e.preventDefault();
		// 	// Use native date picker
		// 	const dateInput = document.createElement("input");
		// 	dateInput.type = "date";
		// 	dateInput.style.display = "none";
		// 	document.body.appendChild(dateInput);
		//
		// 	dateInput.addEventListener("change", () => {
		// 		if (dateInput.value) {
		// 			const selectedDate = new Date(dateInput.value);
		// 			// Keep the current time
		// 			const currentDate = this.parseDisplayDate(this.displayDate) || new Date();
		// 			selectedDate.setHours(currentDate.getHours(), currentDate.getMinutes());
		//
		// 			this.initializeDates(selectedDate);
		//
		// 			// Update the input field
		// 			const dateInputField = this.contentEl.querySelector(".date-container input");
		// 			if (dateInputField) {
		// 				(dateInputField as HTMLInputElement).value = this.displayDate;
		// 			}
		// 		}
		// 		document.body.removeChild(dateInput);
		// 	});
		//
		// 	dateInput.click();
		// });

		// this.contentEl.appendChild(dateContainer);

		// Work Description field
		new Setting(this.contentEl)
			.setName(t("comment.name"))
			.setDesc(t("comment.name"))
			.addTextArea((text) =>
				text
					.setPlaceholder(t("comment.placeholder"))
					.onChange((value) => {
						this.workDescription = value;
					})
			)
			.setClass("work-description-container");

		// Make the textarea larger
		const textareaComponent = this.contentEl.querySelector(".work-description-container textarea");
		if (textareaComponent) {
			(textareaComponent as HTMLTextAreaElement).rows = 5;
		}

		// Submit button
		new Setting(this.contentEl)
			.addButton((btn) =>
				btn
					.setButtonText(t("submit"))
					.setCta()
					.onClick(() => {
						if (!this.validateInputs()) {
							return;
						}
						this.close();
						this.onSubmit(this.timeSpent, this.startDate, this.workDescription);
					})
			);
	}

	/**
	 * Validate user inputs
	 */
	private validateInputs(): boolean {
		if (!this.timeSpent.trim()) {
			new Notice(t("warns.no_time"));
			this.timeSpentSetting.setClass('invalid');
			return false;
		}

		// Validate time spent format
		const timeSpentPattern = /^(\d+[wdhm]\s*)+$/;
		if (!timeSpentPattern.test(this.timeSpent)) {
			new Notice(t("warns.invalid_time"));
			this.timeSpentSetting.setClass('invalid');
			return false;
		}

		if (!this.displayDate.trim()) {
			new Notice(t("warns.no_start"));
			this.dateSetting.setClass('invalid');
			return false;
		}

		// Validate date format by trying to parse it
		if (!this.parseDisplayDate(this.displayDate)) {
			new Notice(t("warns.invalid_start"));
			this.dateSetting.setClass('invalid');
			return false;
		}

		return true;
	}
}
