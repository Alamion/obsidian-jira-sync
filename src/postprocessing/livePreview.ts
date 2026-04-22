import {Extension, RangeSetBuilder} from "@codemirror/state";
import {Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate} from "@codemirror/view";
import {MarkdownView} from "obsidian";
import JiraPlugin from "../main";


export function createJiraSyncExtension(plugin: JiraPlugin): Extension {
	return ViewPlugin.fromClass(class {
		decorations: DecorationSet = Decoration.none;

		constructor(view: EditorView) {
			this.decorations = this.buildDecorations(view);
		}

		update(update: ViewUpdate) {
			if (this.passDecoration()) {
				this.decorations = Decoration.none;
				return;
			}
			if (update.docChanged || update.viewportChanged || update.selectionSet) {
				this.decorations = this.buildDecorations(update.view);
			}
		}

		passDecoration() {
			const mdView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
			if (!mdView) return false;
			const current_state = mdView.getState()
			return current_state.mode === 'source' && current_state.source;
		}

		buildDecorations(view: EditorView) {
			const builder = new RangeSetBuilder<Decoration>();
			const isHighlight = plugin.settings.global.highlightSyncSections;

			for (let { from, to } of view.visibleRanges) {
				const text = view.state.doc.sliceString(from, to);
				const codeBlocks = this.findCodeBlocks(text, from);

				const allDecorations: Array<{from: number, to: number, dec: Decoration}> = [];

				// Collect marker decorations
				for (const match of text.matchAll(/`(jira-sync-[^`]+)`/g)) {
					const start = from + match.index!;
					const end   = start + match[0].length;

					if (this.isInsideCodeBlock(start, end, codeBlocks)) continue;

					const sel = view.state.selection;
					const isActive = sel.ranges.some(r => r.from <= end && r.to >= start);

					let className: string;
					if (isHighlight) {
						className = isActive ? "jira-sync-marker jira-sync-active" : "jira-sync-marker";
					} else {
						className = isActive ? "jira-sync-hidden jira-sync-active" : "jira-sync-hidden";
					}

					allDecorations.push({ from: start, to: end, dec: Decoration.mark({ class: className }) });
				}

				// Collect block content line decorations when highlight is on
				if (isHighlight) {
					const blockContentLines = this.findBlockContentLines(view, text, from, codeBlocks);
					for (const linePos of blockContentLines) {
						allDecorations.push({ from: linePos, to: linePos, dec: Decoration.line({ class: "jira-sync-block-content" }) });
					}
				}

				// RangeSetBuilder requires ranges in sorted order
				allDecorations.sort((a, b) => a.from - b.from);
				for (const { from: f, to: t, dec } of allDecorations) {
					builder.add(f, t, dec);
				}
			}

			return builder.finish();
		}

		findBlockContentLines(view: EditorView, text: string, offset: number, codeBlocks: Array<{from: number, to: number}>): number[] {
			const linePositions: number[] = [];
			const blockStartRegex = /`jira-sync-block-start-[^`]+`/g;
			const blockEndRegex = /`jira-sync-end`/g;

			const starts: number[] = [];
			const ends: number[] = [];

			for (const m of text.matchAll(blockStartRegex)) {
				const pos = offset + m.index! + m[0].length;
				if (!this.isInsideCodeBlock(offset + m.index!, pos, codeBlocks)) {
					starts.push(pos);
				}
			}
			for (const m of text.matchAll(blockEndRegex)) {
				const pos = offset + m.index!;
				if (!this.isInsideCodeBlock(pos, pos + m[0].length, codeBlocks)) {
					ends.push(pos);
				}
			}

			for (const startPos of starts) {
				const matchingEnd = ends.find(e => e > startPos);
				if (matchingEnd === undefined) continue;

				// Iterate over lines between the start marker line end and the end marker line start
				let lineStart = view.state.doc.lineAt(startPos).from;
				const endLine = view.state.doc.lineAt(matchingEnd).from;

				// Move to line after the block-start marker
				const startLine = view.state.doc.lineAt(startPos);
				if (startLine.number < view.state.doc.lines) {
					lineStart = view.state.doc.line(startLine.number + 1).from;
				}

				while (lineStart < endLine) {
					linePositions.push(lineStart);
					const line = view.state.doc.lineAt(lineStart);
					if (line.number >= view.state.doc.lines) break;
					lineStart = view.state.doc.line(line.number + 1).from;
				}
			}

			return linePositions;
		}

		findCodeBlocks(text: string, offset: number) {
			const blocks = [];
			const regex = /```[\s\S]*?```/g;
			let match;

			while ((match = regex.exec(text)) !== null) {
				blocks.push({
					from: offset + match.index,
					to: offset + match.index + match[0].length
				});
			}

			return blocks;
		}

		isInsideCodeBlock(start: number, end: number, codeBlocks: Array<{from: number, to: number}>) {
			return codeBlocks.some(block =>
				start >= block.from && end <= block.to
			);
		}

	}, {
		decorations: v => v.decorations
	});
}
