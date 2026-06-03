export function hideJiraPointersReading() {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	return function (element: HTMLElement, _: any) {
		const codeElements = Array.from(element.querySelectorAll(':not(pre) > code')).filter((el) =>
			el.textContent?.startsWith('jira-sync-'),
		) as HTMLElement[];

		for (const codeEl of codeElements) {
			codeEl.addClass('jira-sync-hidden');
		}
	};
}
