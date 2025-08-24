import { Setting, Notice } from "obsidian";
import { SettingsComponent, SettingsComponentProps } from "../../interfaces/settingsTypes";
import { fetchIssue } from "../../api";
import debounce from "lodash/debounce";
import hljs from "highlight.js";
import {useTranslations} from "../../localization/translator";

const t = useTranslations("settings.issue_view").t;
/**
 * Component for viewing raw Jira issue data
 */
export class RawIssueViewerComponent implements SettingsComponent {
    private props: SettingsComponentProps;
    private issueDataContainer: HTMLElement | null = null;
    private debouncedFetch: ReturnType<typeof debounce>;
    private currentIssueData: any = null;
	public onIssueDataChange?: () => void;

    constructor(props: SettingsComponentProps) {
        this.props = props;
        this.debouncedFetch = debounce(this.fetchIssueData.bind(this), 500);
    }

    render(containerEl: HTMLElement): void {
        // Add input field for issue key
        new Setting(containerEl)
            .setName(t("key.name"))
            .setDesc(t("key.desc"))
            .addText((text) =>
                text
                    .setPlaceholder("PROJ-123")
                    .onChange((value) => {
                        if (value) {
                            this.debouncedFetch(value);
                        } else {
                            this.clearIssueData();
                        }
                    })
            );

        // Create container for issue data
        this.issueDataContainer = containerEl.createDiv({
            cls: "jira-raw-issue-container"
        });
    }

    public getCurrentIssue(): any {
        return this.currentIssueData;
    }

    private async fetchIssueData(value: string): Promise<void> {
        try {
            const issueData = await fetchIssue(this.props.plugin, value);
            this.currentIssueData = issueData;
            this.displayIssueData(issueData);
        } catch (error) {
            new Notice(`Failed to fetch issue: ${error.message}`);
            this.clearIssueData();
        }
		if (this.onIssueDataChange) {
			this.onIssueDataChange();
		}
    }

    private displayIssueData(issueData: any): void {
        if (!this.issueDataContainer) return;

        this.issueDataContainer.empty();

        const pre = this.issueDataContainer.createEl("pre", {
            cls: "jira-copyable",
        });

        const code = pre.createEl("code", {
            cls: "language-json"
        });

        const jsonString = JSON.stringify(issueData, null, 2);
        code.setText(jsonString);
        hljs.highlightElement(code);
    }

    private clearIssueData(): void {
        if (this.issueDataContainer) {
            this.issueDataContainer.empty();
        }
        this.currentIssueData = null;
    }

    hide(): void {
        this.clearIssueData();
        this.debouncedFetch.cancel();
    }
} 
