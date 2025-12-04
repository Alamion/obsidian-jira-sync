import {Notice, Setting} from "obsidian";
import {SettingsComponent, SettingsComponentProps} from "../../interfaces/settingsTypes";
import {fetchIssue} from "../../api";
import debounce from "lodash/debounce";
import hljs from "highlight.js";
import {useTranslations} from "../../localization/translator";
import {setupArrayTextSetting} from "../tools/setupArrayTextString";


const t = useTranslations("settings.fetch_issue").t;
export class FetchIssueComponent implements SettingsComponent {
    private props: SettingsComponentProps;
    private issueDataContainer: HTMLElement | null = null;
    private debouncedFetch: ReturnType<typeof debounce>;
    private currentIssueData: any = null;
	private currentIssueKey: string = "";
	public onIssueDataChange?: () => void;

    constructor(props: SettingsComponentProps) {
        this.props = props;
        this.debouncedFetch = debounce(this.fetchIssueData.bind(this), 500);
    }


    render(containerEl: HTMLElement): void {
		const link = this.props.plugin.settings.connection.apiVersion === "3" ? "https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-jql-post" : "https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-search/#api-rest-api-2-search-jql-post"

		const securityNote = containerEl.createEl("p");
		securityNote.createEl("strong", {
			text: t("note.desc0")
		});
		securityNote.createSpan({
			text: t("note.desc1")
		});
		securityNote.createEl("br");
		securityNote.createEl("br");
		securityNote.createSpan({
			text: t("note.desc2")
		})
		securityNote.createEl("a", {
			text: t("note.link_label"),
			href: link,
			cls: "external-link"
		})
		securityNote.createSpan({
			text: t("note.desc3")
		});

		new Setting(containerEl)
			.setName(t("fields.name"))
			.setDesc(t("fields.desc"))
			.addText((text) => {
				text.setPlaceholder(t("fields.def"))
				setupArrayTextSetting(
					text,
					this.props.plugin.settings.fetchIssue.fields,
					async (array) => {
						this.props.plugin.settings.fetchIssue.fields = array;
						this.rerenderIssueData();
						await this.props.plugin.saveSettings();
					}
				);
			});

		new Setting(containerEl)
			.setName(t("expand.name"))
			.setDesc(t("expand.desc"))
			.addText((text) => {
				text.setPlaceholder(t("expand.def"))
				setupArrayTextSetting(
					text,
					this.props.plugin.settings.fetchIssue.expand,
					async (array) => {
						this.props.plugin.settings.fetchIssue.expand = array;
						this.rerenderIssueData();
						await this.props.plugin.saveSettings();
					}
				);
			});

        // Add input field for issue key
        new Setting(containerEl)
            .setName(t("key.name"))
            .setDesc(t("key.desc"))
            .addText((text) =>
                text
                    .setPlaceholder("PROJ-123")
                    .onChange((value) => {
                        this.currentIssueKey = value;
						this.rerenderIssueData();
                    })
            );

        // Create container for issue data
        this.issueDataContainer = containerEl.createDiv({
            cls: "jira-raw-issue-container"
        });
    }

	private rerenderIssueData() {
		if (this.currentIssueKey) {
			this.debouncedFetch(this.currentIssueKey);
		} else {
			this.clearIssueData();
		}
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
