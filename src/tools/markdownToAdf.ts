interface AdfTextMark {
	type: 'strong' | 'em' | 'code';
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

interface AdfRuleNode {
	type: 'rule';
}

type AdfBlockNode =
	| AdfParagraphNode
	| AdfHeadingNode
	| AdfCodeBlockNode
	| AdfBulletListNode
	| AdfOrderedListNode
	| AdfRuleNode;

interface AdfDoc {
	version: 1;
	type: 'doc';
	content: AdfBlockNode[];
}

function parseInline(text: string): AdfInlineContent[] {
	const nodes: AdfInlineContent[] = [];
	const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			nodes.push({ type: 'text', text: text.slice(lastIndex, match.index) });
		}
		if (match[2] !== undefined) {
			nodes.push({ type: 'text', text: match[2], marks: [{ type: 'strong' }] });
		} else if (match[3] !== undefined) {
			nodes.push({ type: 'text', text: match[3], marks: [{ type: 'em' }] });
		} else if (match[4] !== undefined) {
			nodes.push({ type: 'text', text: match[4], marks: [{ type: 'code' }] });
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

		// Bullet list
		if (line.match(/^[-*+]\s+/)) {
			const items: AdfListItemNode[] = [];
			while (i < lines.length && lines[i].match(/^[-*+]\s+/)) {
				items.push({
					type: 'listItem',
					content: [{ type: 'paragraph', content: parseInline(lines[i].replace(/^[-*+]\s+/, '')) }],
				});
				i++;
			}
			content.push({ type: 'bulletList', content: items });
			continue;
		}

		// Ordered list
		if (line.match(/^\d+\.\s+/)) {
			const items: AdfListItemNode[] = [];
			while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
				items.push({
					type: 'listItem',
					content: [{ type: 'paragraph', content: parseInline(lines[i].replace(/^\d+\.\s+/, '')) }],
				});
				i++;
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
