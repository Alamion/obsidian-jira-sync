// For Reading mode - targets <code> elements in <p> tags
export function hideJiraPointersReading(element: HTMLElement, _: any) {
	// In Reading mode, inline code becomes <code> elements
	const codeElements = element.querySelectorAll(':not(pre) > code');

	codeElements.forEach(codeEl => {
		const text = codeEl.textContent || '';

		if (text.startsWith('jira-sync-')) {
			codeEl.addClass('jira-sync-hidden');
		}
	});
}
