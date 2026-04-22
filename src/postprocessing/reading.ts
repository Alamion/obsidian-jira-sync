import JiraPlugin from "../main";

// For Reading mode - targets <code> elements in <p> tags
export function hideJiraPointersReading(plugin: JiraPlugin) {
	return function(element: HTMLElement, _: any) {
		const codeElements = element.querySelectorAll(':not(pre) > code');

		codeElements.forEach(codeEl => {
			const text = codeEl.textContent || '';

			if (text.startsWith('jira-sync-')) {
				if (plugin.settings.global.highlightSyncSections) {
					codeEl.addClass('jira-sync-marker');
				} else {
					codeEl.addClass('jira-sync-hidden');
				}
			}
		});
	};
}
