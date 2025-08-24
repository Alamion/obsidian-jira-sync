import { validateField } from "../tools/fieldValidation";
import {useTranslations} from "../../localization/translator";

const t = useTranslations("settings.fm").t;
/**
 * Interface for field mapping item props
 */
export interface FieldMappingItemProps {
	container: HTMLElement;
	fieldName?: string;
	toJira?: string;
	fromJira?: string;
	enableValidation: boolean;
	onRemove: () => void;
}

/**
 * Class representing a single field mapping row
 */
export class FieldMappingItem {
	private props: FieldMappingItemProps;
	private fieldContainer: HTMLDivElement;
	private fieldNameInput: HTMLInputElement;
	private toJiraInput: HTMLTextAreaElement;
	private fromJiraInput: HTMLTextAreaElement;

	constructor(props: FieldMappingItemProps) {
		this.props = props;
		this.render();
	}

	/**
	 * Get the current field values
	 */
	getValues() {
		return {
			fieldName: this.fieldNameInput.value.trim(),
			toJira: this.toJiraInput.value.trim(),
			fromJira: this.fromJiraInput.value.trim()
		};
	}

	/**
	 * Render the field mapping item
	 */
	private render() {
		const { container, fieldName = "", toJira = "", fromJira = "", enableValidation } = this.props;

		// Create the field container
		this.fieldContainer = container.createDiv({ cls: "field-mapping-item" });

		// Create field name input
		const fieldNameContainer = this.fieldContainer.createDiv({ cls: "field-name-container" });
		fieldNameContainer.createEl("span", { text: t("field_name"), cls: "field-mapping-label" });
		this.fieldNameInput = fieldNameContainer.createEl("input", {
			type: "text",
			value: fieldName,
			cls: "field-name-input",
			placeholder: t("field_name_placeholder") || "e.g., summary, assignee, priority"
		});

		// Create functions container (grid layout)
		const functionsContainer = this.fieldContainer.createDiv({ cls: "functions-container" });

		// Create toJira function input
		const toJiraContainer = functionsContainer.createDiv({ cls: "to-jira-container" });
		toJiraContainer.createEl("span", { text: t("to_jira"), cls: "field-mapping-label" });
		this.toJiraInput = toJiraContainer.createEl("textarea", {
			cls: "to-jira-input"
		});
		this.toJiraInput.placeholder = "(value) => {\n  // Transform Obsidian value to Jira\n  return value;\n}";
		this.toJiraInput.value = toJira;

		// Create fromJira function input
		const fromJiraContainer = functionsContainer.createDiv({ cls: "from-jira-container" });
		fromJiraContainer.createEl("span", { text: t("from_jira"), cls: "field-mapping-label" });
		this.fromJiraInput = fromJiraContainer.createEl("textarea", {
			cls: "from-jira-input"
		});
		this.fromJiraInput.value = fromJira;
		this.fromJiraInput.placeholder = "(issue, data_source) => {\n  // Extract value from Jira issue\n  return issue.fields.fieldName;\n}";

		// Add remove button
		const removeBtn = this.fieldContainer.createEl("button", {
			text: "✕",
			cls: "remove-field-btn",
			attr: { 'aria-label': t("remove_field") || 'Remove field mapping' }
		});

		// Handle field removal
		removeBtn.addEventListener("click", () => {
			this.fieldContainer.remove();
			this.props.onRemove();
		});

		// Auto-resize textareas
		this.setupAutoResize(this.toJiraInput);
		this.setupAutoResize(this.fromJiraInput);

		// Setup validation
		this.setupValidation(enableValidation);
	}

	private setupAutoResize(textarea: HTMLTextAreaElement) {
		const resize = () => {
			textarea.style.height = 'auto';
			textarea.style.height = Math.max(40, textarea.scrollHeight) + 'px';
		};

		textarea.addEventListener('input', resize);
		textarea.addEventListener('focus', resize);

		// Initial resize
		setTimeout(resize, 0);
	}

	/**
	 * Set up validation for inputs
	 */
	async setupValidation(enableValidation: boolean) {
		await validateField(this.fieldNameInput, enableValidation, 'string');
		await validateField(this.toJiraInput, enableValidation, 'function', ['value']);
		await validateField(this.fromJiraInput, enableValidation, 'function', ['issue', 'data_source']);
	}

	/**
	 * Update validation state
	 */
	async updateValidation(enableValidation: boolean) {
		await this.setupValidation(enableValidation);
	}
}
