interface AdfTextMark {
	type: 'strong' | 'em' | 'code' | 'link' | 'underline' | 'strike';
	attrs?: { href: string };
}

interface AdfTextNode {
	type: 'text';
	text: string;
	marks?: AdfTextMark[];
}

interface AdfInlineNode {
	type: 'hardBreak';
}

type AdfInlineContent = AdfTextNode | AdfInlineNode;

interface AdfParagraphNode {
	type: 'paragraph';
	content: AdfInlineContent[];
}

interface AdfHeadingNode {
	type: 'heading';
	attrs: { level: number };
	content: AdfInlineContent[];
}

interface AdfCodeBlockNode {
	type: 'codeBlock';
	attrs: { language: string };
	content: [{ type: 'text'; text: string }];
}

interface AdfListItemNode {
	type: 'listItem';
	content: [AdfParagraphNode];
}

interface AdfBulletListNode {
	type: 'bulletList';
	content: AdfListItemNode[];
}

interface AdfOrderedListNode {
	type: 'orderedList';
	content: AdfListItemNode[];
}

interface AdfTaskItemNode {
	type: 'taskItem';
	attrs: { localId: string; state: 'TODO' | 'DONE' };
	content: AdfInlineContent[];
}

interface AdfTaskListNode {
	type: 'taskList';
	content: AdfTaskItemNode[];
	attrs?: { localId: string };
}

interface AdfRuleNode {
	type: 'rule';
}

type AdfBlockNode =
	| AdfParagraphNode
	| AdfHeadingNode
	| AdfCodeBlockNode
	| AdfBulletListNode
	| AdfOrderedListNode
	| AdfTaskListNode
	| AdfRuleNode;

interface AdfDoc {
	version: 1;
	type: 'doc';
	content: AdfBlockNode[];
}

// --- Inline formatting rules -------------------------------------------------

interface FormatRule {
	open: string;
	close: string;
	marks: AdfTextMark[];
}

const formatRules: FormatRule[] = [
	{ open: '<b>', close: '</b>', marks: [{ type: 'strong' }] },
	{ open: '<strong>', close: '</strong>', marks: [{ type: 'strong' }] },
	{ open: '<i>', close: '</i>', marks: [{ type: 'em' }] },
	{ open: '<em>', close: '</em>', marks: [{ type: 'em' }] },
	{ open: '<u>', close: '</u>', marks: [{ type: 'underline' }] },
	{ open: '<ins>', close: '</ins>', marks: [{ type: 'underline' }] },
	{ open: '<s>', close: '</s>', marks: [{ type: 'strike' }] },
	{ open: '<strike>', close: '</strike>', marks: [{ type: 'strike' }] },
	{ open: '<del>', close: '</del>', marks: [{ type: 'strike' }] },
	{ open: '***', close: '***', marks: [{ type: 'strong' }, { type: 'em' }] },
	{ open: '**', close: '**', marks: [{ type: 'strong' }] },
	{ open: '*', close: '*', marks: [{ type: 'em' }] },
	{ open: '`', close: '`', marks: [{ type: 'code' }] },
];

const linkRe = /^\[([^\]]+)\]\(([^)]+)\)/;
const wikiRe = /^\[\[[^\]]+\]\]/;

// --- Inline parser -----------------------------------------------------------

function mergeTextNodes(nodes: AdfInlineContent[]): AdfInlineContent[] {
	const out: AdfInlineContent[] = [];
	for (const n of nodes) {
		if (n.type !== 'text' || !out.length || out[out.length - 1].type !== 'text') {
			out.push(n);
			continue;
		}
		const last = out[out.length - 1] as AdfTextNode;
		if (JSON.stringify(last.marks) !== JSON.stringify(n.marks)) {
			out.push(n);
			continue;
		}
		last.text += n.text;
	}
	return out;
}

function parseInlineContent(text: string): AdfInlineContent[] {
	const nodes: AdfInlineContent[] = [];
	let pos = 0;
	let textStart = 0;

	const flush = () => {
		if (textStart < pos) nodes.push({ type: 'text', text: text.slice(textStart, pos) });
	};

	while (pos < text.length) {
		const remaining = text.slice(pos);

		const linkMatch = remaining.match(linkRe);
		if (linkMatch) {
			flush();
			const linkMark: AdfTextMark = { type: 'link', attrs: { href: linkMatch[2] } };
			for (const n of parseInlineContent(linkMatch[1])) {
				if (n.type === 'text') {
					nodes.push({ type: 'text', text: n.text, marks: n.marks ? [...n.marks, linkMark] : [linkMark] });
				}
			}
			pos += linkMatch[0].length;
			textStart = pos;
			continue;
		}

		const wikiMatch = remaining.match(wikiRe);
		if (wikiMatch) {
			flush();
			nodes.push({ type: 'text', text: wikiMatch[0] });
			pos += wikiMatch[0].length;
			textStart = pos;
			continue;
		}

		let matched = false;

		for (const rule of formatRules) {
			if (!remaining.startsWith(rule.open)) continue;

			const afterOpen = remaining.slice(rule.open.length);
			const closeIdx = afterOpen.indexOf(rule.close);
			if (closeIdx === -1) continue;
			if (rule.marks[0].type !== 'code' && closeIdx === 0) continue;

			const content = afterOpen.slice(0, closeIdx);
			flush();

			if (rule.marks[0].type === 'code') {
				nodes.push({ type: 'text', text: content, marks: [...rule.marks] });
			} else {
				const inner = parseInlineContent(content);
				for (const n of inner) {
					if (n.type === 'text') {
						nodes.push({ type: 'text', text: n.text, marks: [...rule.marks, ...(n.marks || [])] });
					}
				}
			}

			pos += rule.open.length + content.length + rule.close.length;
			textStart = pos;
			matched = true;
			break;
		}

		if (!matched) pos++;
	}

	flush();
	return mergeTextNodes(nodes);
}

function parseInline(text: string): AdfInlineContent[] {
	return parseInlineContent(text);
}

// --- Block-level parsing helpers ---------------------------------------------

function parseFencedCode(lines: string[], i: number): { node: AdfCodeBlockNode; next: number } | null {
	if (!lines[i].startsWith('```')) return null;
	const lang = lines[i].slice(3).trim();
	const codeLines: string[] = [];
	i++;
	while (i < lines.length && !lines[i].startsWith('```')) {
		codeLines.push(lines[i]);
		i++;
	}
	return {
		node: { type: 'codeBlock', attrs: { language: lang }, content: [{ type: 'text', text: codeLines.join('\n') }] },
		next: i + 1,
	};
}

function parseHeading(line: string): AdfHeadingNode | null {
	const m = line.match(/^(#{1,6})\s+(.*)/);
	if (!m) return null;
	return { type: 'heading', attrs: { level: m[1].length }, content: parseInline(m[2]) };
}

function parseHr(line: string): AdfRuleNode | null {
	return line.match(/^(-{3,}|\*{3,}|_{3,})$/) ? { type: 'rule' } : null;
}

function parseTaskList(lines: string[], i: number): { node: AdfTaskListNode; next: number } | null {
	if (!lines[i].match(/^[-*+]\s+\[[ xX]\]\s*/)) return null;
	const items: AdfTaskItemNode[] = [];
	let counter = 0;
	while (i < lines.length && lines[i].match(/^[-*+]\s+\[[ xX]\]\s*/)) {
		const m = lines[i].match(/^[-*+]\s+\[([ xX])\]\s*(.*)/);
		if (m) {
			const state = m[1].toLowerCase() === 'x' ? ('DONE' as const) : ('TODO' as const);
			const inline: AdfInlineContent[] = parseInline(m[2]);
			i++;
			while (i < lines.length && lines[i].match(/^\s+[-*+]\s+/)) {
				inline.push({ type: 'hardBreak' });
				inline.push(...parseInline('- ' + lines[i].replace(/^\s+[-*+]\s+/, '')));
				i++;
			}
			items.push({
				type: 'taskItem',
				attrs: { localId: `task-${Date.now()}-${counter++}`, state },
				content: inline,
			});
		} else {
			i++;
		}
	}
	return { node: { type: 'taskList', attrs: { localId: `tasklist-${Date.now()}` }, content: items }, next: i };
}

function parseListItems(
	lines: string[],
	i: number,
	itemRe: RegExp,
	stripRe: RegExp,
): { items: AdfListItemNode[]; next: number } {
	const items: AdfListItemNode[] = [];
	while (i < lines.length && lines[i].match(itemRe)) {
		const content: any[] = [{ type: 'paragraph', content: parseInline(lines[i].replace(stripRe, '')) }];
		i++;
		const subs: AdfListItemNode[] = [];
		while (i < lines.length && lines[i].match(/^\s+[-*+]\s+/)) {
			subs.push({
				type: 'listItem',
				content: [{ type: 'paragraph', content: parseInline(lines[i].replace(/^\s+[-*+]\s+/, '')) }],
			});
			i++;
		}
		if (subs.length) content.push({ type: 'bulletList', content: subs });
		items.push({ type: 'listItem', content: content as [AdfParagraphNode] });
	}
	return { items, next: i };
}

function isBlockStart(line: string): boolean {
	return (
		line.startsWith('```') ||
		!!line.match(/^#{1,6}\s/) ||
		!!line.match(/^[-*+]\s+\[[ xX]\]\s*/) ||
		!!line.match(/^[-*+]\s/) ||
		!!line.match(/^\d+\.\s/) ||
		!!line.match(/^(-{3,}|\*{3,}|_{3,})$/)
	);
}

// --- Markdown → ADF ----------------------------------------------------------

export function markdownToAdf(markdown: string): AdfDoc | null {
	if (!markdown || !markdown.trim()) return null;

	const lines = markdown.split('\n');
	const content: AdfBlockNode[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];

		const code = parseFencedCode(lines, i);
		if (code) {
			content.push(code.node);
			i = code.next;
			continue;
		}

		const heading = parseHeading(line);
		if (heading) {
			content.push(heading);
			i++;
			continue;
		}

		const hr = parseHr(line);
		if (hr) {
			content.push(hr);
			i++;
			continue;
		}

		const task = parseTaskList(lines, i);
		if (task) {
			content.push(task.node);
			i = task.next;
			continue;
		}

		if (line.match(/^[-*+]\s+/)) {
			const r = parseListItems(lines, i, /^[-*+]\s+/, /^[-*+]\s+/);
			content.push({ type: 'bulletList', content: r.items });
			i = r.next;
			continue;
		}

		if (line.match(/^\d+\.\s+/)) {
			const r = parseListItems(lines, i, /^\d+\.\s+/, /^\d+\.\s+/);
			content.push({ type: 'orderedList', content: r.items });
			i = r.next;
			continue;
		}

		if (line.trim() === '') {
			i++;
			continue;
		}

		const paraLines: string[] = [];
		while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) {
			paraLines.push(lines[i]);
			i++;
		}
		if (paraLines.length) {
			content.push({ type: 'paragraph', content: parseInline(paraLines.join('\n')) });
		}
	}

	return content.length ? { version: 1, type: 'doc', content } : null;
}

// --- ADF → Markdown helpers --------------------------------------------------

function adfInlineToMarkdown(nodes: any[]): string {
	if (!nodes) return '';
	return nodes
		.map((node: any) => {
			if (node.type === 'hardBreak') return '\n';
			if (node.type === 'mention') return node.attrs?.text || node.attrs?.displayName || '';
			if (node.type === 'emoji') return node.attrs?.text || node.attrs?.shortName || '';
			if (node.type === 'inlineCard') {
				const url = node.attrs?.url || '';
				return url ? `[${url}](${url})` : '';
			}
			if (node.type !== 'text') return '';
			const text = node.text || '';
			const marks: string[] = (node.marks || []).map((m: any) => m.type);
			const linkMark = (node.marks || []).find((m: any) => m.type === 'link');
			let result = text;
			if (marks.includes('code')) return `\`${result}\``;
			if (marks.includes('strike')) result = `<s>${result}</s>`;
			if (marks.includes('underline')) result = `<u>${result}</u>`;
			if (marks.includes('strong')) result = `<b>${result}</b>`;
			if (marks.includes('em')) result = `<i>${result}</i>`;
			if (linkMark) result = `[${result}](${linkMark.attrs?.href || ''})`;
			return result;
		})
		.join('');
}

function renderList(items: any[], ordered: boolean): string {
	return items
		.map((item: any, idx: number) => {
			const blocks: any[] = item.content || [];
			const first = blocks[0];
			const rest = blocks.slice(1);
			const main = first ? adfBlockToMarkdown(first) : '';
			const nested = rest
				.map((b: any) => adfBlockToMarkdown(b))
				.filter((s: string) => s.trim())
				.map((s: string) =>
					s
						.split('\n')
						.map((l: string) => '  ' + l)
						.join('\n'),
				)
				.join('\n');
			const prefix = ordered ? `${idx + 1}.` : '-';
			return `${prefix} ${main}${nested ? '\n' + nested : ''}`;
		})
		.join('\n');
}

function adfBlockToMarkdown(node: any): string {
	if (!node) return '';

	switch (node.type) {
		case 'heading':
			return `${'#'.repeat(node.attrs?.level || 1)} ${adfInlineToMarkdown(node.content || [])}`;
		case 'paragraph':
			return adfInlineToMarkdown(node.content || []);
		case 'codeBlock': {
			const lang = node.attrs?.language || '';
			const code = (node.content || []).map((n: any) => n.text || '').join('');
			return `\`\`\`${lang}\n${code}\n\`\`\``;
		}
		case 'bulletList':
			return renderList(node.content || [], false);
		case 'orderedList':
			return renderList(node.content || [], true);
		case 'taskList':
			return (node.content || [])
				.map((item: any) => {
					const checked = item.attrs?.state === 'DONE';
					const blocks: any[] = item.content || [];
					const first = blocks[0];
					const rest = blocks.slice(1);
					const raw =
						first?.type === 'paragraph'
							? adfInlineToMarkdown(first.content || [])
							: adfInlineToMarkdown(blocks);
					const lines = raw.split('\n');
					const full =
						lines[0] +
						(lines.slice(1).length
							? '\n' +
								lines
									.slice(1)
									.map((l: string) => '  ' + l)
									.join('\n')
							: '');
					const nested = rest
						.map((b: any) => adfBlockToMarkdown(b))
						.filter((s: string) => s.trim())
						.map((s: string) =>
							s
								.split('\n')
								.map((l: string) => '  ' + l)
								.join('\n'),
						)
						.join('\n');
					return `- [${checked ? 'x' : ' '}] ${full}${nested ? '\n' + nested : ''}`;
				})
				.join('\n');
		case 'rule':
			return '---';
		case 'blockquote': {
			const inner = (node.content || []).map((n: any) => adfBlockToMarkdown(n)).join('\n');
			return inner
				.split('\n')
				.map((l: string) => `> ${l}`)
				.join('\n');
		}
		case 'table': {
			const rows: any[] = node.content || [];
			if (!rows.length) return '';
			const mdRows = rows.map(
				(row: any) =>
					`| ${(row.content || [])
						.map((cell: any) =>
							(cell.content || [])
								.map((n: any) => adfBlockToMarkdown(n))
								.join(' ')
								.replace(/\|/g, '\\|'),
						)
						.join(' | ')} |`,
			);
			const sep = `| ${rows[0].content.map(() => '---').join(' | ')} |`;
			return [mdRows[0], sep, ...mdRows.slice(1)].join('\n');
		}
		case 'panel':
		case 'expand':
		case 'layoutSection':
		case 'layoutColumn':
			return (node.content || []).map((n: any) => adfBlockToMarkdown(n)).join('\n\n');
		default:
			return (node.content || []).map((n: any) => adfBlockToMarkdown(n)).join('\n');
	}
}

// --- ADF → Markdown ----------------------------------------------------------

export function adfToMarkdown(adf: any): string | null {
	if (adf === undefined) return null;
	if (!adf || typeof adf !== 'object') return '';
	const blocks = (adf.content || []).map((node: any) => adfBlockToMarkdown(node));
	return blocks.filter((b: string) => b !== '').join('\n\n');
}
