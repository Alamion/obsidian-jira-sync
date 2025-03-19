import {Notice} from "obsidian";
import TurndownService from 'turndown';


export function htmlToMarkdown(str: any): string {
	if (str === null || str === undefined) return '';
	else if (typeof str === "number") {
		return str.toString()
	}
	else if (typeof str === "object") {
		return JSON.stringify(str)
	}
	const turndownService = new TurndownService();
	return turndownService.turndown(str);
}


/**
 * Convert Jira markup to Markdown
 * @param str The Jira markup string
 * @returns The Markdown string
 */
export function jiraToMarkdown(str: any): string {
	try {
		if (str === null || str === undefined) return '';
		else if (typeof str === "number") {
			str = str.toString()
		}
		else if (typeof str === "object") {
			str = JSON.stringify(str)
		}
		return (
			str
				// Un-Ordered Lists
				.replace(/^[ \t]*(\*+)\s+/gm, (match: string, stars: string) => {
					return `${Array(stars.length).fill('').join('')}* `;
				})
				// Ordered lists
				.replace(/^[ \t]*(#+)\s+/gm, (match: string, nums: string) => {
					return `${Array(nums.length).fill('').join('')}1. `;
				})
				// Headers 1-6
				.replace(/^h([0-6])\.(.*)$/gm, (match: string, level: string, content: string) => {
					return Array(parseInt(level, 10) + 1).join('#') + ' ' + content.trim();
				})
				// Bold (process before italic to avoid conflicts)
				.replace(/\*([^*\n]+)\*/g, '**$1**')
				// Italic
				.replace(/_([^_\n]+)_/g, '*$1*')
				// Monospaced text
				.replace(/\{\{([^}]+)\}\}/g, '`$1`')
				// Inserts
				.replace(/\+([^+]*)\+/g, '<ins>$1</ins>')
				// Superscript
				.replace(/\^([^^]*)\^/g, '<sup>$1</sup>')
				// Subscript
				.replace(/~([^~]*)~/g, '<sub>$1</sub>')
				// Strikethrough
				.replace(/(\s+)-(\S+.*?\S)-(\s+)/g, '$1~~$2~~$3')
				// Code Block
				.replace(
					/\{code(:([a-z]+))?([:|]?(title|borderStyle|borderColor|borderWidth|bgColor|titleBGColor)=.+?)*\}([^]*?)\n?\{code\}/gm,
					'```$2$5\n```'
				)
				// Pre-formatted text
				.replace(/{noformat}/g, '```')
				// Un-named Links
				.replace(/\[([^|]+?)\]/g, '<$1>')
				// Images
				.replace(/!(.+)!/g, '![]($1)')
				// Named Links
				.replace(/\[(.+?)\|(.+?)\]/g, '[$1]($2)')
				// Single Paragraph Blockquote
				.replace(/^bq\.\s+/gm, '> ')
				// Remove color: unsupported in md
				.replace(/\{color:[^}]+\}([^]*?)\{color\}/gm, '$1')
				// panel into table
				.replace(/\{panel:title=([^}]*)\}\n?([^]*?)\n?\{panel\}/gm, '\n| $1 |\n| --- |\n| $2 |')
				// table header
				.replace(/^[ \t]*((?:\|\|.*?)+\|\|)[ \t]*$/gm, (match: string, headers: string) => {
					const singleBarred = headers.replace(/\|\|/g, '|');
					return `${singleBarred}\n${singleBarred.replace(/\|[^|]+/g, '| --- ')}`;
				})
				// remove leading-space of table headers and rows
				.replace(/^[ \t]*\|/gm, '|')
		);
	} catch (e) {
		new Notice(`Error converting Jira markup to Markdown\n${e}`);
		console.error(e);
		return typeof str === "string" ? str : str.toString();
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
