import { validateField } from "../tools/fieldValidation";

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
		fieldNameContainer.createEl("span", { text: "Field Name:", cls: "field-mapping-label" });
		this.fieldNameInput = fieldNameContainer.createEl("input", {
			type: "text",
			value: fieldName,
			cls: "field-name-input"
		});

		// Create toJira function input
		const toJiraContainer = this.fieldContainer.createDiv({ cls: "to-jira-container" });
		toJiraContainer.createEl("span", { text: "to Jira:", cls: "field-mapping-label" });
		this.toJiraInput = toJiraContainer.createEl("textarea", {
			cls: "to-jira-input"
		});
		this.toJiraInput.placeholder = "(value) => null";
		this.toJiraInput.value = toJira;
		this.toJiraInput.rows = 1;

		// Create fromJira function input
		const fromJiraContainer = this.fieldContainer.createDiv({ cls: "from-jira-container" });
		fromJiraContainer.createEl("span", { text: "from Jira:", cls: "field-mapping-label" });
		this.fromJiraInput = fromJiraContainer.createEl("textarea", {
			cls: "from-jira-input"
		});
		this.fromJiraInput.value = fromJira;
		this.fromJiraInput.placeholder = "(issue, data_source) => null";
		this.fromJiraInput.rows = 1;

		// Add remove button
		const removeBtn = this.fieldContainer.createEl("button", {
			text: "✕",
			cls: "remove-field-btn"
		});

		// Handle field removal
		removeBtn.addEventListener("click", () => {
			this.fieldContainer.remove();
			this.props.onRemove();
		});

		// Setup validation
		this.setupValidation(enableValidation);
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
