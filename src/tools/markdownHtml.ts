import {Notice} from "obsidian";


/**
 * Convert Jira markup to Markdown
 * @param str The Jira markup string
 * @returns The Markdown string
 */
export function jiraToMarkdown(str: any): string {
	try {
		if (str === null || str === undefined) return '';

		// Initial normalization to string
		let content: string = "";
		if (typeof str === "string") content = str;
		else if (typeof str === "number") content = str.toString();
		else if (typeof str === "object") content = JSON.stringify(str);
		else content = String(str);

		// URL Protection: Store original URLs
		const urlMap: Map<string, string> = new Map();
		// Regex to find URLs
		const urlRegex = /(https?:\/\/[^\s\(\)\[\]\{\}]+)/g;
		let urlCount = 0;

		content = content.replace(urlRegex, (match) => {
			// Using a strictly alphanumeric key so it isn't caught by _, *, +, etc.
			const key = `PROTECTEDURLNODE${urlCount}`;
			urlMap.set(key, match);
			urlCount++;
			return key;
		});

		// Perform Conversions
		content = content
			// Un-Ordered Lists
			.replace(/^[ \t]*(\*+)\s+/gm, (match: string, stars: string) => {
				return `${'*'.repeat(stars.length)} `;
			})
			// Ordered lists
			.replace(/^[ \t]*(#+)\s+/gm, (match: string, nums: string) => {
				return `${'1.'.repeat(nums.length)} `;
			})
			// Headers 1-6
			.replace(/^h([1-6])\.(.*)$/gm, (match: string, level: string, text: string) => {
				return '#'.repeat(parseInt(level, 10)) + ' ' + text.trim();
			})
			// Bold
			.replace(/\*([^*\n]+)\*/g, '**$1**')
			// Italic
			.replace(/_([^_\n]+)_/g, '*$1*')
			// Monospaced
			.replace(/\{\{([^}]+)\}\}/g, '`$1`')
			// Inserts
			.replace(/\+([^+]*)\+/g, '<ins>$1</ins>')
			// Superscript
			.replace(/\^([^^]*)\^/g, '<sup>$1</sup>')
			// Subscript
			.replace(/~([^~]*)~/g, '<sub>$1</sub>')
			// Strikethrough
			.replace(/(\s+)-(\S+.*?\S)-(\s+)/g, '$1~~$2~~$3')
			// Code Blocks
			.replace(
				/\{code(:([a-z]+))?([:|]?(title|borderStyle|borderColor|borderWidth|bgColor|titleBGColor)=.+?)*\}([^]*?)\n?\{code\}/gm,
				'```$2$5\n```'
			)
			.replace(/{noformat}/g, '```')
			// Images
			.replace(/!(.+)!/g, '![]($1)')
			// Named Links [Label|URL]
			.replace(/\[(.+?)\|(.+?)\]/g, '[$1]($2)')
			// Blockquote
			.replace(/^bq\.\s+/gm, '> ')
			// Color removal
			.replace(/\{color:[^}]+\}([^]*?)\{color\}/gm, '$1')
			// Panel to table
			.replace(/\{panel:title=([^}]*)\}\n?([^]*?)\n?\{panel\}/gm, '\n| $1 |\n| --- |\n| $2 |')
			// Tables
			.replace(/^[ \t]*((?:\|\|.*?)+\|\|)[ \t]*$/gm, (match: string, headers: string) => {
				const singleBarred = headers.replace(/\|\|/g, '|');
				return `${singleBarred}\n${singleBarred.replace(/\|[^|]+/g, '| --- ')}`;
			})
			.replace(/^[ \t]*\|/gm, '|');

		// Restoration: Replace keys back with original URLs
		urlMap.forEach((originalUrl, key) => {
			content = content.split(key).join(originalUrl);
		});

		return content;

	} catch (e) {
		console.error("Error converting Jira markup to Markdown", e);
		// Fallback to basic string conversion if everything explodes
		return typeof str === "string" ? str : (str ? str.toString() : '');
	}
}

/**
 * Convert Markdown to Jira markup
 * @param str The Markdown string
 * @returns The Jira markup string
 */
export function markdownToJira(str: string): string {
	if (!str) return '';
	const map: Record<string, string> = {
		del: "-",
		ins: "+",
		sup: "^",
		sub: "~",
	};

	return (
		str
			// Tables
			.replace(
				/^(\|[^\n]+\|\r?\n)((?:\|\s*:?[-]+:?\s*)+\|)(\n(?:\|[^\n]+\|\r?\n?)*)?$/gm,
				(
					match: string,
					headerLine: string,
					separatorLine: string,
					rowstr: string
				) => {
					const headers = headerLine.match(/[^|]+(?=\|)/g) || [];
					const separators =
						separatorLine.match(/[^|]+(?=\|)/g) || [];
					if (headers.length !== separators.length) return match;

					const rows = rowstr.split("\n");
					if (rows.length === 2 && headers.length === 1)
						// Panel
						return `{panel:title=${headers[0].trim()}}\n${rowstr
							.replace(/^\|(.*)[ \t]*\|/, "$1")
							.trim()}\n{panel}\n`;

					return `||${headers.join("||")}||${rowstr}`;
				}
			)
			// Bold, Italic, and Combined (bold+italic)
			.replace(
				/([*_]+)(\S.*?)\1/g,
				(match: string, wrapper: string, content: string) => {
					switch (wrapper.length) {
						case 1:
							return `_${content}_`;
						case 2:
							return `*${content}*`;
						case 3:
							return `_*${content}*_`;
						default:
							return wrapper + content + wrapper;
					}
				}
			)
			// All Headers (# format)
			.replace(
				/^([#]+)(.*?)$/gm,
				(match: string, level: string, content: string) => {
					return `h${level.length}.${content}`;
				}
			)
			// Headers (H1 and H2 underlines)
			.replace(
				/^(.*?)\n([=-]+)$/gm,
				(match: string, content: string, level: string) => {
					return `h${level[0] === "=" ? 1 : 2}. ${content}`;
				}
			)
			// Ordered lists
			.replace(
				/^([ \t]*)\d+\.\s+/gm,
				(match: string, spaces: string) => {
					return `${Array(Math.floor(spaces.length / 3) + 1)
						.fill("#")
						.join("")} `;
				}
			)
			// Un-Ordered Lists
			.replace(
				/^([ \t]*)\*\s+/gm,
				(match: string, spaces: string) => {
					return `${Array(Math.floor(spaces.length / 2 + 1))
						.fill("*")
						.join("")} `;
				}
			)
			// Headers (h1 or h2) (lines "underlined" by ---- or =====)
			// Citations, Inserts, Subscripts, Superscripts, and Strikethroughs
			.replace(
				new RegExp(`<(${Object.keys(map).join("|")})>(.*?)</\\1>`, "g"),
				(match: string, from: string, content: string) => {
					const to = map[from];
					return to + content + to;
				}
			)
			// Other kind of strikethrough
			.replace(/(\s+)~~(.*?)~~(\s+)/g, "$1-$2-$3")
			// Named/Un-Named Code Block
			.replace(
				/```(.+\n)?((?:.|\n)*?)```/g,
				(match: string, synt: string, content: string) => {
					let code = "{code}";
					if (synt) {
						code = `{code:${synt.replace(/\n/g, "")}}\n`;
					}
					return `${code}${content}{code}`;
				}
			)
			// Inline-Preformatted Text
			.replace(/`([^`]+)`/g, "{{$1}}")
			// Images
			.replace(/!\[[^\]]*\]\(([^)]+)\)/g, "!$1!")
			// Named Link
			.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "[$1|$2]")
			// Un-Named Link
			.replace(/<([^>]+)>/g, "[$1]")
			// Single Paragraph Blockquote
			.replace(/^>/gm, "bq.")
	);
}
