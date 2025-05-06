import { SettingsComponent, SettingsComponentProps } from "../../interfaces/settingsTypes";
import debounce from "lodash/debounce";
import { safeStringToFunction } from "../../tools/convertFunctionString";

export class TestFieldMappingsComponent implements SettingsComponent {
    private props: SettingsComponentProps;
    private testMappingsContainer: HTMLElement | null = null;
    private currentIssueData: any = null;
    private getCurrentIssue: (() => any) | null = null;

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

        this.testMappingsContainer.createEl("h3", {
            text: "Test field mappings",
            cls: "test-mappings-header"
        });

        this.testMappingsContainer.createEl("p", {
            text: "Test your field mappings against the current issue data from Raw issue viewer. Enter a fromJira expression to see the result.",
            cls: "test-mappings-desc"
        });

        // Container for all test mapping items
        const itemsContainer = this.testMappingsContainer.createDiv({ cls: "test-mapping-items-list" });
        (this as any)._testMappingItemsContainer = itemsContainer; // store for later use

        // Add first test mapping item
        this.addTestMappingItem();

        // Add new mapping button (only once, at the bottom)
        const addBtn = this.testMappingsContainer.createEl("button", {
            text: "+ Add test mapping",
            cls: "add-test-mapping-btn"
        });
        addBtn.addEventListener("click", () => {
            this.addTestMappingItem();
        });
    }

    private addTestMappingItem(): void {
        // Use the dedicated items container
        const itemsContainer = (this as any)._testMappingItemsContainer as HTMLElement;
        if (!itemsContainer) return;

        const itemContainer = itemsContainer.createDiv({
            cls: "test-mapping-item"
        });

        // From Jira expression input
        const fromJiraContainer = itemContainer.createDiv({ cls: "from-jira-container" });
        fromJiraContainer.createEl("span", { text: "from Jira:", cls: "field-mapping-label" });

        const fromJiraInput = fromJiraContainer.createEl("textarea", {
            cls: "from-jira-input"
        });
        fromJiraInput.rows = 1;
		fromJiraInput.placeholder = "(issue) => null";

        // Value display
        const valueContainer = itemContainer.createDiv({ cls: "value-container" });
        valueContainer.createEl("span", { text: "Value:", cls: "field-mapping-label" });
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
                valueDisplay.setText("No issue data available");
                return;
            }

            try {
                const fromJiraFn = await safeStringToFunction(fromJiraInput.value, 'fromJira', false);
                if (fromJiraFn) {
                    const result = fromJiraFn(issueData, null);
                    valueDisplay.setText(JSON.stringify(result, null, 2));
                } else {
                    valueDisplay.setText("Invalid expression");
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
