import {fetchCountIssuesByJQL, fetchIssuesByJQLRaw} from "../../api";
import JiraPlugin from "../../main";
import {useTranslations} from "../../localization/translator";

const t = useTranslations("modals.jql_search").t;

/**
 * Reusable JQL Preview component
 */
export class JQLPreview {
	private plugin: JiraPlugin;
	private containerEl: HTMLElement;
	private limit: number;
	private loadingEl?: HTMLElement;
	private show_header = true;

	constructor(plugin: JiraPlugin, containerEl: HTMLElement, limit: number = 5, show_header = true) {
		this.plugin = plugin;
		this.containerEl = containerEl;
		this.limit = limit;
		this.setupContainer();
		this.show_header = show_header;
	}

	private setupContainer() {
		this.containerEl.addClass("jql-preview-container");
		this.renderSkeleton();
	}

	private renderSkeleton() {
		this.containerEl.empty();

		this.loadingEl = this.containerEl.createDiv({ cls: "jql-preview-loading" });
		this.loadingEl.createDiv({
			cls: "jql-preview-loading-icon",
			text: "🔍"
		});
		this.loadingEl.createDiv({
			cls: "jql-preview-loading-text",
			text: t("preview.loading")
		});
	}

	private renderEmpty() {
		this.containerEl.empty();

		const emptyEl = this.containerEl.createDiv({ cls: "jql-preview-empty" });
		emptyEl.createDiv({
			cls: "jql-preview-empty-icon",
			text: "📝"
		});
		emptyEl.createDiv({
			cls: "jql-preview-empty-text",
			text: t("preview.empty_input")
		});
	}

	private renderError(error: string) {
		this.containerEl.empty();

		const errorEl = this.containerEl.createDiv({ cls: "jql-preview-error" });
		errorEl.createDiv({
			cls: "jql-preview-error-icon",
			text: "⚠️"
		});
		errorEl.createDiv({
			cls: "jql-preview-error-text",
			text: t("preview.error", { error })
		});
	}

	private renderResults(total: number, issues: any[]) {
		this.containerEl.empty();

		// Header with total count
		if (this.show_header) {
			const headerEl = this.containerEl.createDiv({ cls: "jql-preview-header" });
			const totalEl = headerEl.createDiv({ cls: "jql-preview-total" });
			totalEl.createSpan({ cls: "jql-preview-total-text", text: t("preview.total", { total }) });

			if (total > this.limit) {
				totalEl.createSpan({
					cls: "jql-preview-showing",
					text: t("preview.showing", { limit: this.limit })
				});
			}
		}


		// Issues table
		if (issues.length > 0) {
			const tableWrapperEl = this.containerEl.createDiv({ cls: "jql-preview-table-wrapper" });
			const tableEl = tableWrapperEl.createEl("table", { cls: "jql-preview-table" });

			// Table header
			const theadEl = tableEl.createEl("thead");
			const headerRowEl = theadEl.createEl("tr");

			// Header columns
			headerRowEl.createEl("th", {
				cls: "jql-preview-th-key",
				text: "Key"
			});
			headerRowEl.createEl("th", {
				cls: "jql-preview-th-summary",
				text: "Summary"
			});
			headerRowEl.createEl("th", {
				cls: "jql-preview-th-icon",
				text: "T"
			});
			headerRowEl.createEl("th", {
				cls: "jql-preview-th-date",
				text: "Created"
			});
			headerRowEl.createEl("th", {
				cls: "jql-preview-th-date",
				text: "Updated"
			});
			headerRowEl.createEl("th", {
				cls: "jql-preview-th-icon",
				text: "R"
			});
			headerRowEl.createEl("th", {
				cls: "jql-preview-th-icon",
				text: "A"
			});
			headerRowEl.createEl("th", {
				cls: "jql-preview-th-icon",
				text: "P"
			});
			headerRowEl.createEl("th", {
				cls: "jql-preview-th-status",
				text: "Status"
			});

			// Table body
			const tbodyEl = tableEl.createEl("tbody");

			issues.forEach((issue, _) => {
				const rowEl = tbodyEl.createEl("tr", { cls: "jql-preview-row" });

				// Key column
				const keyCellEl = rowEl.createEl("td", { cls: "jql-preview-cell-key" });
				const keyLinkEl = keyCellEl.createEl("a", {
					cls: "jql-preview-key-link",
					text: issue.key || "N/A",
					attr: {
						href: `${this.plugin.settings.connection.jiraUrl}/browse/${issue.key}`,
						target: "_blank",
						rel: "noopener noreferrer"
					}
				});

				// Summary column (S)
				const summaryCellEl = rowEl.createEl("td", { cls: "jql-preview-cell-summary" });
				const summary = issue.fields?.summary || "No summary available";
				summaryCellEl.setAttr("title", summary); // Show full text on hover
				summaryCellEl.setText(summary.length > 80 ? summary.substring(0, 80) + "..." : summary);

				// Type column (T)
				const typeCellEl = rowEl.createEl("td", { cls: "jql-preview-cell-icon" });
				const issueType = issue.fields?.issuetype;
				if (issueType && issueType.iconUrl) {
					const typeIconEl = typeCellEl.createEl("img", {
						attr: { src: issueType.iconUrl, alt: issueType.name },
						cls: "jql-preview-type-icon"
					});
				} else {
					// Fallback icon for unknown type
					const fallbackIconEl = typeCellEl.createEl("div", {
						cls: "jql-preview-status-indicator status-undefined"
					});
				}

				// Created date column
				const createdCellEl = rowEl.createEl("td", { cls: "jql-preview-cell-date" });
				const createdDate = issue.fields?.created;
				if (createdDate) {
					const date = new Date(createdDate);
					createdCellEl.setText(date.toLocaleDateString("en-US", {
						month: "numeric",
						day: "numeric",
						year: "numeric"
					}));
				} else {
					createdCellEl.setText("N/A");
				}

				// Updated date column
				const updatedCellEl = rowEl.createEl("td", { cls: "jql-preview-cell-date" });
				const updatedDate = issue.fields?.updated;
				if (updatedDate) {
					const date = new Date(updatedDate);
					updatedCellEl.setText(date.toLocaleDateString("en-US", {
						month: "numeric",
						day: "numeric",
						year: "numeric"
					}));
				} else {
					updatedCellEl.setText("N/A");
				}

				// Reporter column (R)
				const reporterCellEl = rowEl.createEl("td", { cls: "jql-preview-cell-icon" });
				const reporter = issue.fields?.reporter;
				if (reporter) {
					const reporterLinkEl = reporterCellEl.createEl("a", {
						attr: {
							href: `${this.plugin.settings.connection.jiraUrl}/secure/ViewProfile.jspa?name=${reporter.name}`,
							target: "_blank",
							rel: "noopener noreferrer",
							title: reporter.displayName || reporter.name
						}
					});
					if (reporter.avatarUrls && reporter.avatarUrls["16x16"]) {
						const avatarEl = reporterLinkEl.createEl("img", {
							attr: { src: reporter.avatarUrls["16x16"], alt: reporter.displayName },
							cls: "jql-preview-user-avatar"
						});
					} else {
						const initialEl = reporterLinkEl.createEl("div", {
							cls: "jql-preview-user-initial",
							text: reporter.displayName ? reporter.displayName.charAt(0).toUpperCase() : "?"
						});
					}
				} else {
					const unknownEl = reporterCellEl.createEl("div", {
						cls: "jql-preview-status-indicator status-undefined"
					});
				}

				// Assignee column (A)
				const assigneeCellEl = rowEl.createEl("td", { cls: "jql-preview-cell-icon" });
				const assignee = issue.fields?.assignee;
				if (assignee) {
					const assigneeLinkEl = assigneeCellEl.createEl("a", {
						attr: {
							href: `${this.plugin.settings.connection.jiraUrl}/secure/ViewProfile.jspa?name=${assignee.name}`,
							target: "_blank",
							rel: "noopener noreferrer",
							title: assignee.displayName || assignee.name
						}
					});
					if (assignee.avatarUrls && assignee.avatarUrls["16x16"]) {
						const avatarEl = assigneeLinkEl.createEl("img", {
							attr: { src: assignee.avatarUrls["16x16"], alt: assignee.displayName },
							cls: "jql-preview-user-avatar"
						});
					} else {
						const initialEl = assigneeLinkEl.createEl("div", {
							cls: "jql-preview-user-initial",
							text: assignee.displayName ? assignee.displayName.charAt(0).toUpperCase() : "?"
						});
					}
				} else {
					const unknownEl = assigneeCellEl.createEl("div", {
						cls: "jql-preview-status-indicator status-undefined"
					});
				}

				// Priority column (P)
				const priorityCellEl = rowEl.createEl("td", { cls: "jql-preview-cell-icon" });
				const priority = issue.fields?.priority;
				if (priority && priority.iconUrl) {
					const priorityIconEl = priorityCellEl.createEl("img", {
						attr: { src: priority.iconUrl, alt: priority.name },
						cls: "jql-preview-priority-icon"
					});
				} else {
					const unknownEl = priorityCellEl.createEl("div", {
						cls: "jql-preview-status-indicator status-undefined"
					});
				}

				// Status column
				const statusCellEl = rowEl.createEl("td", { cls: "jql-preview-cell-status" });
				const status = issue.fields?.status;
				if (status) {
					const statusBadgeEl = statusCellEl.createEl("span", {
						cls: `jql-preview-status-badge status-${status.statusCategory?.key || 'default'}`,
						text: status.name
					});
				} else {
					const statusBadgeEl = statusCellEl.createEl("span", {
						cls: "jql-preview-status-badge status-default",
						text: "Unknown"
					});
				}
			});
		}
	}

	/**
	 * Load and display preview for given JQL
	 */
	async loadPreview(jql: string): Promise<void> {
		const trimmedJql = jql.trim();

		if (!trimmedJql) {
			this.renderEmpty();
			return;
		}

		this.renderSkeleton();

		try {
			// Enhanced fields for better preview (matching Jira table columns)
			const fields = ["summary", "issuetype", "key", "priority", "status", "created", "updated", "reporter", "assignee"];
			const res = await fetchIssuesByJQLRaw(this.plugin, trimmedJql, this.limit, fields);

			let total = 0;
			switch (this.plugin.settings.connection.apiVersion) {
				case "2":
					total = res.total;
					break;
				case "3":
					total = await fetchCountIssuesByJQL(this.plugin, trimmedJql);
					break;
			}

			const issues = Array.isArray(res.issues) ? res.issues.slice(0, this.limit) : [];

			this.renderResults(total, issues);
		} catch (error) {
			this.renderError(String(error));
		}
	}

	/**
	 * Clear the preview
	 */
	clear(): void {
		this.renderEmpty();
	}

	/**
	 * Show loading state
	 */
	showLoading(): void {
		this.renderSkeleton();
	}
}
