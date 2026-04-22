import JiraPlugin from "../main";

export function hideJiraPointersReading(plugin: JiraPlugin) {
	return function(element: HTMLElement, _: any) {
		const isHighlight = plugin.settings.global.highlightSyncSections;
		const codeElements = Array.from(element.querySelectorAll(':not(pre) > code'))
			.filter(el => el.textContent?.startsWith('jira-sync-')) as HTMLElement[];

		for (const codeEl of codeElements) {
			const text = codeEl.textContent || '';
			codeEl.addClass('jira-sync-hidden');

			if (!isHighlight) continue;

			if (text.startsWith('jira-sync-inline-start-')) {
				wrapContentBetween(codeEl, 'jira-sync-end');
			} else if (text.startsWith('jira-sync-line-')) {
				wrapContentAfter(codeEl);
			}
		}
	};
}

// Wrap sibling nodes between this element and the next jira-sync-end code element
function wrapContentBetween(startEl: HTMLElement, endMarker: string) {
	const parent = startEl.parentElement;
	if (!parent) return;

	const nodesToWrap: Node[] = [];
	let node: Node | null = startEl.nextSibling;

	while (node) {
		if (node.nodeType === Node.ELEMENT_NODE) {
			const el = node as HTMLElement;
			if (el.tagName === 'CODE' && (el.textContent || '').startsWith(endMarker)) break;
		}
		nodesToWrap.push(node);
		node = node.nextSibling;
	}

	if (nodesToWrap.length === 0) return;
	const wrapper = createSpanWrapper(parent, nodesToWrap[0]);
	for (const n of nodesToWrap) wrapper.appendChild(n);
}

// Wrap all sibling nodes after this element (until next jira-sync marker)
function wrapContentAfter(lineEl: HTMLElement) {
	const parent = lineEl.parentElement;
	if (!parent) return;

	const nodesToWrap: Node[] = [];
	let node: Node | null = lineEl.nextSibling;

	while (node) {
		if (node.nodeType === Node.ELEMENT_NODE) {
			const el = node as HTMLElement;
			if (el.tagName === 'CODE' && (el.textContent || '').startsWith('jira-sync-')) break;
		}
		nodesToWrap.push(node);
		node = node.nextSibling;
	}

	if (nodesToWrap.length === 0) return;
	const wrapper = createSpanWrapper(parent, nodesToWrap[0]);
	for (const n of nodesToWrap) wrapper.appendChild(n);
}

function createSpanWrapper(parent: HTMLElement, insertBefore: Node): HTMLElement {
	const wrapper = document.createElement('span');
	wrapper.addClass('jira-sync-content');
	parent.insertBefore(wrapper, insertBefore);
	return wrapper;
}
