interface AdfTextMark {
	type: 'strong' | 'em' | 'code' | 'link';
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

function parseInline(text: string): AdfInlineContent[] {
	const nodes: AdfInlineContent[] = [];
	const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\[\[[^\]]+\]\])/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			nodes.push({ type: 'text', text: text.slice(lastIndex, match.index) });
		}
		if (match[2] !== undefined) {
			// ***bold+italic***
			nodes.push({ type: 'text', text: match[2], marks: [{ type: 'strong' }, { type: 'em' }] });
		} else if (match[3] !== undefined) {
			// **bold**
			nodes.push({ type: 'text', text: match[2], marks: [{ type: 'strong' }] });
		} else if (match[4] !== undefined) {
			// *italic*
			nodes.push({ type: 'text', text: match[3], marks: [{ type: 'em' }] });
		} else if (match[5] !== undefined) {
			// `code`
			nodes.push({ type: 'text', text: match[4], marks: [{ type: 'code' }] });
		} else if (match[6] !== undefined) {
			// [text](url) — convert to ADF link mark
			nodes.push({ type: 'text', text: match[5], marks: [{ type: 'link', attrs: { href: match[6] } }] });
		} else {
			// [[wikilink]] — preserve as plain text so round-trip survives
			nodes.push({ type: 'text', text: match[0] });
		}
		lastIndex = match.index + match[0].length;
	}

	if (lastIndex < text.length) {
		nodes.push({ type: 'text', text: text.slice(lastIndex) });
	}

	return nodes.length > 0 ? nodes : [{ type: 'text', text }];
}

export function markdownToAdf(markdown: string): AdfDoc | null {
	if (!markdown || !markdown.trim()) return null;

	const lines = markdown.split('\n');
	const content: AdfBlockNode[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];

		// Fenced code block
		if (line.startsWith('```')) {
			const lang = line.slice(3).trim();
			const codeLines: string[] = [];
			i++;
			while (i < lines.length && !lines[i].startsWith('```')) {
				codeLines.push(lines[i]);
				i++;
			}
			content.push({
				type: 'codeBlock',
				attrs: { language: lang },
				content: [{ type: 'text', text: codeLines.join('\n') }],
			});
			i++;
			continue;
		}

		// Heading
		const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
		if (headingMatch) {
			content.push({
				type: 'heading',
				attrs: { level: headingMatch[1].length },
				content: parseInline(headingMatch[2]),
			});
			i++;
			continue;
		}

		// Horizontal rule
		if (line.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
			content.push({ type: 'rule' });
			i++;
			continue;
		}

		// Task list (checkboxes) — must be checked before bullet list
		if (line.match(/^[-*+]\s+\[[ xX]\]\s*/)) {
			const items: any[] = [];
			let taskCounter = 0;
			while (i < lines.length && lines[i].match(/^[-*+]\s+\[[ xX]\]\s*/)) {
				const checkMatch = lines[i].match(/^[-*+]\s+\[([ xX])\]\s*(.*)/);
				if (checkMatch) {
					const state = checkMatch[1].toLowerCase() === 'x' ? 'DONE' : 'TODO';
					// taskItem only allows inline nodes — flatten sub-items as hardBreak + inline
					const inlineContent: AdfInlineContent[] = parseInline(checkMatch[2]);
					i++;
					while (i < lines.length && lines[i].match(/^\s+[-*+]\s+/)) {
						inlineContent.push({ type: 'hardBreak' });
						inlineContent.push(...parseInline('- ' + lines[i].replace(/^\s+[-*+]\s+/, '')));
						i++;
					}
					items.push({
						type: 'taskItem',
						attrs: { localId: `task-${Date.now()}-${taskCounter++}`, state },
						content: inlineContent,
					});
				} else {
					i++;
				}
			}
			content.push({ type: 'taskList', attrs: { localId: `tasklist-${Date.now()}` }, content: items });
			continue;
		}

		// Bullet list
		if (line.match(/^[-*+]\s+/)) {
			const items: AdfListItemNode[] = [];
			while (i < lines.length && lines[i].match(/^[-*+]\s+/)) {
				const itemContent: any[] = [
					{ type: 'paragraph', content: parseInline(lines[i].replace(/^[-*+]\s+/, '')) },
				];
				i++;
				const subItems: AdfListItemNode[] = [];
				while (i < lines.length && lines[i].match(/^\s+[-*+]\s+/)) {
					subItems.push({
						type: 'listItem',
						content: [{ type: 'paragraph', content: parseInline(lines[i].replace(/^\s+[-*+]\s+/, '')) }],
					});
					i++;
				}
				if (subItems.length > 0) {
					itemContent.push({ type: 'bulletList', content: subItems });
				}
				items.push({ type: 'listItem', content: itemContent as [AdfParagraphNode] });
			}
			content.push({ type: 'bulletList', content: items });
			continue;
		}

		// Ordered list
		if (line.match(/^\d+\.\s+/)) {
			const items: AdfListItemNode[] = [];
			while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
				const itemContent: any[] = [
					{ type: 'paragraph', content: parseInline(lines[i].replace(/^\d+\.\s+/, '')) },
				];
				i++;
				const subItems: AdfListItemNode[] = [];
				while (i < lines.length && lines[i].match(/^\s+[-*+]\s+/)) {
					subItems.push({
						type: 'listItem',
						content: [{ type: 'paragraph', content: parseInline(lines[i].replace(/^\s+[-*+]\s+/, '')) }],
					});
					i++;
				}
				if (subItems.length > 0) {
					itemContent.push({ type: 'bulletList', content: subItems });
				}
				items.push({ type: 'listItem', content: itemContent as [AdfParagraphNode] });
			}
			content.push({ type: 'orderedList', content: items });
			continue;
		}

		// Empty line
		if (line.trim() === '') {
			i++;
			continue;
		}

		// Paragraph — collect until empty line or block-level element
		const paraLines: string[] = [];
		while (
			i < lines.length &&
			lines[i].trim() !== '' &&
			!lines[i].match(/^#{1,6}\s/) &&
			!lines[i].match(/^[-*+]\s+\[[ xX]\]\s*/) &&
			!lines[i].match(/^[-*+]\s/) &&
			!lines[i].match(/^\d+\.\s/) &&
			!lines[i].startsWith('```') &&
			!lines[i].match(/^(-{3,}|\*{3,}|_{3,})$/)
		) {
			paraLines.push(lines[i]);
			i++;
		}

		if (paraLines.length > 0) {
			content.push({
				type: 'paragraph',
				content: parseInline(paraLines.join('\n')),
			});
		}
	}

	return content.length > 0 ? { version: 1, type: 'doc', content } : null;
}

function adfInlineToMarkdown(nodes: any[]): string {
	if (!nodes) return '';
	return nodes
		.map((node) => {
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
			if (marks.includes('strike')) result = `~~${result}~~`;
			if (marks.includes('strong')) result = `**${result}**`;
			if (marks.includes('em')) result = `*${result}*`;
			if (linkMark) result = `[${result}](${linkMark.attrs?.href || ''})`;
			return result;
		})
		.join('');
}

function adfBlockToMarkdown(node: any): string {
	if (!node) return '';

	switch (node.type) {
		case 'heading': {
			const level = node.attrs?.level || 1;
			const text = adfInlineToMarkdown(node.content || []);
			return `${'#'.repeat(level)} ${text}`;
		}
		case 'paragraph': {
			const text = adfInlineToMarkdown(node.content || []);
			return text;
		}
		case 'codeBlock': {
			const lang = node.attrs?.language || '';
			const code = (node.content || []).map((n: any) => n.text || '').join('');
			return `\`\`\`${lang}\n${code}\n\`\`\``;
		}
		case 'bulletList': {
			return (node.content || [])
				.map((item: any) => {
					const blocks: any[] = item.content || [];
					const first = blocks[0];
					const rest = blocks.slice(1);
					const mainText = first ? adfBlockToMarkdown(first) : '';
					const nested = rest
						.map((b: any) => adfBlockToMarkdown(b))
						.filter((s: string) => s.trim() !== '')
						.map((s: string) =>
							s
								.split('\n')
								.map((l: string) => '  ' + l)
								.join('\n'),
						)
						.join('\n');
					return `- ${mainText}${nested ? '\n' + nested : ''}`;
				})
				.join('\n');
		}
		case 'orderedList': {
			return (node.content || [])
				.map((item: any, idx: number) => {
					const blocks: any[] = item.content || [];
					const first = blocks[0];
					const rest = blocks.slice(1);
					const mainText = first ? adfBlockToMarkdown(first) : '';
					const nested = rest
						.map((b: any) => adfBlockToMarkdown(b))
						.filter((s: string) => s.trim() !== '')
						.map((s: string) =>
							s
								.split('\n')
								.map((l: string) => '  ' + l)
								.join('\n'),
						)
						.join('\n');
					return `${idx + 1}. ${mainText}${nested ? '\n' + nested : ''}`;
				})
				.join('\n');
		}
		case 'taskList': {
			return (node.content || [])
				.map((item: any) => {
					const checked = item.attrs?.state === 'DONE';
					const blocks: any[] = item.content || [];
					const first = blocks[0];
					const rest = blocks.slice(1);
					const rawText =
						first?.type === 'paragraph'
							? adfInlineToMarkdown(first.content || [])
							: adfInlineToMarkdown(blocks);
					// Indent continuation lines (e.g. hardBreak + sub-item text)
					const textLines = rawText.split('\n');
					const fullText =
						textLines[0] +
						(textLines.slice(1).length
							? '\n' +
								textLines
									.slice(1)
									.map((l: string) => '  ' + l)
									.join('\n')
							: '');
					const nested = rest
						.map((b: any) => adfBlockToMarkdown(b))
						.filter((s: string) => s.trim() !== '')
						.map((s: string) =>
							s
								.split('\n')
								.map((l: string) => '  ' + l)
								.join('\n'),
						)
						.join('\n');
					return `- [${checked ? 'x' : ' '}] ${fullText}${nested ? '\n' + nested : ''}`;
				})
				.join('\n');
		}
		case 'rule':
			return '---';
		case 'blockquote': {
			const inner = (node.content || []).map((n: any) => adfBlockToMarkdown(n)).join('\n');
			return inner
				.split('\n')
				.map((line: string) => `> ${line}`)
				.join('\n');
		}
		case 'table': {
			const rows: any[] = node.content || [];
			const mdRows = rows.map((row: any) => {
				const cells = (row.content || []).map((cell: any) =>
					(cell.content || [])
						.map((n: any) => adfBlockToMarkdown(n))
						.join(' ')
						.replace(/\|/g, '\\|'),
				);
				return `| ${cells.join(' | ')} |`;
			});
			if (mdRows.length === 0) return '';
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

export function adfToMarkdown(adf: any): string | null {
	if (adf === undefined) return null;
	if (!adf || typeof adf !== 'object') return '';
	const blocks: string[] = (adf.content || []).map((node: any) => adfBlockToMarkdown(node));
	return blocks.filter((b) => b !== '').join('\n\n');
}
