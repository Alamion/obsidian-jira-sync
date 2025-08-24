import { SettingsComponent, SettingsComponentProps } from "../../interfaces/settingsTypes";
import debounce from "lodash/debounce";
import { safeStringToFunction } from "../../tools/convertFunctionString";
import {useTranslations} from "../../localization/translator";
import {setIcon} from "obsidian";

const t = useTranslations("settings.tfm").t;

export class TestFieldMappingsComponent implements SettingsComponent {
    private props: SettingsComponentProps;
    private testMappingsContainer: HTMLElement | null = null;
    private currentIssueData: any = null;
    private getCurrentIssue: (() => any) | null = null;
	private _testMappingItemsContainer: HTMLElement | null = null;

    constructor(props: SettingsComponentProps & { getCurrentIssue?: () => any }) {
        this.props = props;
        if (props.getCurrentIssue) {
            this.getCurrentIssue = props.getCurrentIssue;
        }
    }

    render(containerEl: HTMLElement): void {
        // Add section header
        this.testMappingsContainer = containerEl.createDiv({
            cls: "jira-test-mappings-container"
        });

		this.testMappingsContainer.createEl("p", {
			text: t("desc"),
			cls: "test-mappings-desc"
		});

        // Container for all test mapping items
        this._testMappingItemsContainer =  this.testMappingsContainer.createDiv({ cls: "test-mapping-items-list" });

        // Add first test mapping item
        this.addTestMappingItem();

		const buttonView = this.testMappingsContainer.createDiv({ cls: "button-view" });

        // Add new mapping button (only once, at the bottom)
		const addBtn = buttonView.createEl("button", {
			text: t("add_mapping") || "Add Mapping",
			cls: "add-field-mapping-btn",
			attr: { 'data-tooltip': t("add_mapping_tooltip") || "Add new field mapping" }
		});
		setIcon(addBtn, "circle-plus");
        addBtn.addEventListener("click", () => {
            this.addTestMappingItem();
        });

		const resetBtn = buttonView.createEl("button", {
			text: t("reset") || "Reset All",
			cls: "reset-field-mappings-btn",
			attr: { 'data-tooltip': t("reset_tooltip") || "Clear all field mappings" }
		});
		setIcon(resetBtn, "refresh-cw");
		resetBtn.addEventListener("click", () => {
			this._testMappingItemsContainer?.empty();
		});
    }

    private addTestMappingItem(): void {
        // Use the dedicated items container
        const itemsContainer = this._testMappingItemsContainer as HTMLElement;
        if (!itemsContainer) return;

        const itemContainer = itemsContainer.createDiv({
            cls: "test-mapping-item"
        });

        // From Jira expression input
        const fromJiraContainer = itemContainer.createDiv({ cls: "from-jira-container" });
        fromJiraContainer.createEl("span", { text: t("from_jira")+":", cls: "field-mapping-label" });

        const fromJiraInput = fromJiraContainer.createEl("textarea", {
            cls: "from-jira-input"
        });
        fromJiraInput.rows = 1;
		fromJiraInput.placeholder = "(issue) => null";

        // Value display
        const valueContainer = itemContainer.createDiv({ cls: "value-container" });
        valueContainer.createEl("span", { text: t("value")+":", cls: "field-mapping-label" });
        const valueDisplay = valueContainer.createEl("div", {
            cls: "value-display",
            attr: {
                style: "user-select: text; -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text;"
            }
        });

        // Debounced evaluation function
        const debouncedEvaluate = debounce(async () => {
            const issueData = this.getCurrentIssue ? this.getCurrentIssue() : this.currentIssueData;
            if (!issueData) {
                valueDisplay.setText(t("no_data"));
                return;
            }

            try {
                const fromJiraFn = await safeStringToFunction(fromJiraInput.value, 'fromJira', false);
                if (fromJiraFn) {
                    const result = fromJiraFn(issueData, null);
                    valueDisplay.setText(JSON.stringify(result, null, 2));
                } else {
                    valueDisplay.setText(t("invalid_exp"));
                }
            } catch (error) {
                valueDisplay.setText(`Error: ${error.message}`);
            }
        }, 500);

        // Add event listeners
        fromJiraInput.addEventListener("input", debouncedEvaluate);

        // Add remove button
        const removeBtn = itemContainer.createEl("button", {
            text: "✕",
            cls: "remove-field-btn"
        });
        removeBtn.addEventListener("click", () => {
            itemContainer.remove();
        });
    }

    // Optionally, allow setting the current issue externally
    setCurrentIssue(issue: any) {
        this.currentIssueData = issue;
        // Trigger re-evaluation of all test mappings
        this.testMappingsContainer?.querySelectorAll(".from-jira-input").forEach((input: HTMLTextAreaElement) => {
            input.dispatchEvent(new Event("input"));
        });
    }

    hide(): void {
        // No persistent state to clear
    }
} 
