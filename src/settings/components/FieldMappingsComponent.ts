import { Setting, setIcon } from "obsidian";
import { SettingsComponent, SettingsComponentProps } from "../../interfaces/settingsTypes";
import { FieldMappingItem } from "./FieldMappingItem";
import { collectFieldMappingsFromUI, processMappings } from "../tools/mappingTransformers";
import {jiraFunctionToString, transform_string_to_functions_mappings} from "../../tools/convertFunctionString";
import { obsidianJiraFieldMappings } from "../../constants/obsidianJiraFieldsMapping";
import { debugLog } from "../../tools/debugLogging";

/**
 * Component for field mappings section
 */
export class FieldMappingsComponent implements SettingsComponent {
	private props: SettingsComponentProps;
	private fieldsList: HTMLDivElement;
	private mappingItems: FieldMappingItem[] = [];

	constructor(props: SettingsComponentProps) {
		this.props = props;
	}

	/**
	 * Render the field mappings component
	 */
	render(containerEl: HTMLElement): void {
		const { plugin } = this.props;

		// Create the mapping section
		const mappingSection = containerEl.createDiv({ cls: "jira-field-mappings" });

		// Add explanation
		mappingSection.createEl("p", {
			text: "Configure how fields are mapped between Obsidian and Jira. Each field requires both a toJira and fromJira transformation function."
		});

		// Add validation toggle
		new Setting(mappingSection)
			.setName('Enable field validation')
			.setDesc('Check fields before saving as functions')
			.addToggle(toggle => toggle
				.setValue(plugin.settings.enableFieldValidation)
				.onChange(async (value) => {
					plugin.settings.enableFieldValidation = value;
					await plugin.saveSettings();

					// Update validation for all mapping items
					this.mappingItems.forEach(item => {
						item.updateValidation(value);
					});
				}));

		// Create list container for field mappings
		this.fieldsList = mappingSection.createDiv({ cls: "field-mappings-list" });

		// Create button container
		const buttonView = mappingSection.createDiv({ cls: "button-view" });

		// Add button to add new field mapping
		const addFieldBtn = buttonView.createEl("button", {
			text: "",
			cls: "add-field-mapping-btn"
		});
		setIcon(addFieldBtn, "circle-plus");

		addFieldBtn.addEventListener("click", () => {
			this.addFieldMapping();
		});

		// Reset button
		const resetBtn = buttonView.createEl("button", {
			text: "",
			cls: "reset-field-mappings-btn"
		});
		setIcon(resetBtn, "refresh-cw");

		resetBtn.addEventListener("click", async () => {
			plugin.settings.fieldMappings = {};
			plugin.settings.fieldMappingsStrings = {};
			await this.loadExistingMappings();
			await plugin.saveSettings();
		});

		// Reload default mappings button
		const reloadBtn = buttonView.createEl("button", {
			text: "",
			cls: "reload-field-mappings-btn"
		});
		setIcon(reloadBtn, "list-restart");

		reloadBtn.addEventListener("click", async () => {
			plugin.settings.fieldMappings = obsidianJiraFieldMappings;

			// Also reset the string representations with default values
			const defaultMappingsStrings: Record<string, { toJira: string; fromJira: string }> = {};
			for (const [fieldName, mapping] of Object.entries(obsidianJiraFieldMappings)) {
				defaultMappingsStrings[fieldName] = {
					toJira: jiraFunctionToString(mapping.toJira, false),
					fromJira: jiraFunctionToString(mapping.fromJira, true)
				};
			}
			plugin.settings.fieldMappingsStrings = defaultMappingsStrings;

			await this.loadExistingMappings();
			await plugin.saveSettings();
		});

		// Load existing mappings
		this.loadExistingMappings();

		// Add examples section
		this.renderExamples(mappingSection);

		// Add security notice
		const securityNote = containerEl.createEl("div", { cls: "setting-item-description" });
		securityNote.createEl("strong", { text: "⚠️ Security note: " });
		securityNote.createSpan({
			text: "Field mapping uses JavaScript function strings. Validate any shared mappings to prevent security issues."
		});
	}

	/**
	 * Add a new field mapping item
	 */
	addFieldMapping(fieldName = "", toJira = "", fromJira = ""): FieldMappingItem {
		const item = new FieldMappingItem({
			container: this.fieldsList,
			fieldName,
			toJira,
			fromJira,
			enableValidation: this.props.plugin.settings.enableFieldValidation,
			onRemove: () => {
				// Remove from array when item is removed
				const index = this.mappingItems.indexOf(item);
				if (index !== -1) {
					this.mappingItems.splice(index, 1);
				}
			}
		});

		this.mappingItems.push(item);
		return item;
	}

	/**
	 * Load existing mappings
	 */
	async loadExistingMappings(): Promise<void> {
		const { plugin } = this.props;

		// Clear existing field list and items array
		this.fieldsList.empty();
		this.mappingItems = [];

		debugLog(`Loading mapping settings`);

		// If we have string representations stored, use those
		if (plugin.settings.fieldMappingsStrings &&
			Object.keys(plugin.settings.fieldMappingsStrings).length > 0) {
			debugLog('Current mapping (string) is: ', plugin.settings.fieldMappingsStrings);

			const savedMappings = plugin.settings.fieldMappingsStrings;
			for (const [fieldName, mapping] of Object.entries(savedMappings)) {
				if (mapping && typeof mapping === 'object' && 'toJira' in mapping && 'fromJira' in mapping) {
					this.addFieldMapping(
						fieldName,
						mapping.toJira,
						mapping.fromJira
					);
				}
			}
			plugin.settings.fieldMappings = await transform_string_to_functions_mappings(
				plugin.settings.fieldMappingsStrings,
				plugin.settings.enableFieldValidation
			);
		}
		// Otherwise, try to use the function mappings and convert them to strings
		else if (plugin.settings.fieldMappings &&
			Object.keys(plugin.settings.fieldMappings).length > 0) {
			debugLog('Current mapping is: ', plugin.settings.fieldMappings);

			const existingMappings = plugin.settings.fieldMappings;
			for (const [fieldName, mapping] of Object.entries(existingMappings)) {
				if (mapping && typeof mapping === 'object' && 'toJira' in mapping && 'fromJira' in mapping) {
					this.addFieldMapping(
						fieldName,
						jiraFunctionToString(mapping.toJira, false),
						jiraFunctionToString(mapping.fromJira, true)
					);
				}
			}

			// Create the string representations for future use
			await this.saveFieldMappings();
		}
	}

	/**
	 * Save current field mappings
	 */
	async saveFieldMappings(): Promise<void> {
		const { plugin } = this.props;

		debugLog(`From strings ${JSON.stringify(plugin.settings.fieldMappingsStrings)}\nand funcs ${JSON.stringify(plugin.settings.fieldMappings)}`);

		// Collect mappings from UI
		const stringMappings = await collectFieldMappingsFromUI(this.fieldsList);

		// Process mappings
		const { stringMappings: newStringMappings, functionMappings } = await processMappings(
			stringMappings,
			plugin.settings.enableFieldValidation
		);

		// Update settings
		plugin.settings.fieldMappingsStrings = newStringMappings;
		plugin.settings.fieldMappings = functionMappings;

		debugLog(`To strings ${JSON.stringify(plugin.settings.fieldMappingsStrings)}\nand funcs ${JSON.stringify(plugin.settings.fieldMappings)}`);
		await plugin.saveSettings();
	}

	/**
	 * Render example mappings
	 */
	private renderExamples(containerEl: HTMLElement): void {
		const examplesSection = containerEl.createDiv({ cls: "mapping-examples" });
		examplesSection.createEl("h4", { text: "Example field mappings" });

		const examplesList = examplesSection.createEl("ul");

		const examples = [
			{
				name: "summary",
				toJira: "value",
				fromJira: "issue.fields.summary"
			},
			{
				name: "reporter",
				toJira: "null",
				fromJira: "issue.fields.reporter.name"
			},
			{
				name: "project",
				toJira: "({ key: value })",
				fromJira: "issue.fields.project ? issue.fields.project.key : \"\""
			}
		];

		examples.forEach(example => {
			const item = examplesList.createEl("li");
			item.createEl("strong", { text: example.name });

			// Add button to use this example
			const useBtn = item.createEl("button", {
				text: "Use",
				cls: "use-example-btn"
			});

			item.createEl("br");
			item.createSpan({ text: `toJira: ${example.toJira}` });
			item.createEl("br");
			item.createSpan({ text: `fromJira: ${example.fromJira}` });

			useBtn.addEventListener("click", () => {
				this.addFieldMapping(example.name, example.toJira, example.fromJira);
			});
		});
	}

	/**
	 * Called when the component is hidden
	 */
	hide(): void {
		this.saveFieldMappings();
	}
}
