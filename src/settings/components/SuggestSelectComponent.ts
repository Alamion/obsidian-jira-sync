import {useTranslations} from "../../localization/translator";

export interface SuggestSelectOption {
	value: string;
	label: string;
	isDefault?: boolean;
}

export interface SuggestSelectConfig {
	placeholder?: string;
	emptyOptionText?: string;
	searchEnabled?: boolean;
}

const t = useTranslations("settings.suggest_select").t;
export class SuggestSelectComponent {
	private selectEl: HTMLSelectElement | null = null;
	private searchInputEl: HTMLInputElement | null = null;
	private allOptions: SuggestSelectOption[] = [];
	private filteredOptions: SuggestSelectOption[] = [];
	private config: SuggestSelectConfig;
	private onChangeCallback?: (value: string) => void

	constructor(config: SuggestSelectConfig = {}) {
		this.config = {
			placeholder: t("placeholder"),
			emptyOptionText: t("empty_option_text"),
			searchEnabled: true,
			...config
		};
	}

	render(containerEl: HTMLElement): HTMLElement {
		const selectorContainer = containerEl.createDiv({
			cls: "suggest-select-container suggest"
		});

		if (this.config.searchEnabled) {
			this.searchInputEl = selectorContainer.createEl("input", {
				type: "text",
				placeholder: this.config.placeholder,
				cls: "suggest-select-item suggest-search-input"
			});

			this.searchInputEl.addEventListener('input', (e) => {
				const searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
				this.filterOptions(searchTerm);
			});
		}

		this.selectEl = selectorContainer.createEl("select", {
			cls: "suggest-select-item suggest-select-dropdown dropdown"
		});

		this.selectEl.addEventListener('change', (e) => {
			const selectedValue = (e.target as HTMLSelectElement).value;
			this.onChangeCallback?.(selectedValue);
		});

		return selectorContainer;
	}

	setOptions(options: SuggestSelectOption[]): void {
		this.allOptions = [...options];
		this.filteredOptions = [...options];
		this.populateSelect();
	}

	setValue(value: string): void {
		if (!this.selectEl) return;

		const options = this.selectEl.options;
		for (let i = 0; i < options.length; i++) {
			if (options[i].value === value) {
				this.selectEl.selectedIndex = i;
				break;
			}
		}
	}

	getValue(): string {
		return this.selectEl?.value || "";
	}

	onChange(callback: (value: string) => void): void {
		this.onChangeCallback = callback;
	}

	private populateSelect(): void {
		if (!this.selectEl) return;

		this.selectEl.innerHTML = "";

		// Add empty option
		this.selectEl.createEl("option", {
			value: "",
			text: this.config.emptyOptionText
		});

		// Add filtered options
		this.filteredOptions.forEach(option => {
			this.selectEl!.createEl("option", {
				value: option.value,
				text: option.label
			});
		});
	}

	private filterOptions(searchTerm: string): void {
		if (!searchTerm) {
			this.filteredOptions = [...this.allOptions];
		} else {
			this.filteredOptions = this.allOptions.filter(option =>
				option.label.toLowerCase().includes(searchTerm) ||
				option.value.toLowerCase().includes(searchTerm)
			);
		}

		this.populateSelect();

		// Maintain selection if the current value is still available
		const currentValue = this.getValue();
		if (currentValue) {
			this.setValue(currentValue);
		}
	}
}
