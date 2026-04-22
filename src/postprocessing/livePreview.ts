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
			const current_state = mdView.getState();
			return current_state.mode === 'source' && current_state.source;
		}

		buildDecorations(view: EditorView) {
			const builder = new RangeSetBuilder<Decoration>();
			const isHighlight = plugin.settings.global.highlightSyncSections;
			const sel = view.state.selection;

			const allDecs: Array<{ from: number; to: number; dec: Decoration }> = [];

			for (const { from, to } of view.visibleRanges) {
				const text = view.state.doc.sliceString(from, to);
				const codeBlocks = this.findCodeBlocks(text, from);

				// Collect all jira-sync marker positions
				const markers: Array<{ start: number; end: number; name: string }> = [];
				for (const match of text.matchAll(/`(jira-sync-[^`]+)`/g)) {
					const start = from + match.index!;
					const end = start + match[0].length;
					if (this.isInsideCodeBlock(start, end, codeBlocks)) continue;
					markers.push({ start, end, name: match[1] });
				}

				// Always hide the markers themselves, show when cursor is inside
				for (const { start, end } of markers) {
					const isActive = sel.ranges.some(r => r.from <= end && r.to >= start);
					const cls = isActive ? "jira-sync-hidden jira-sync-active" : "jira-sync-hidden";
					allDecs.push({ from: start, to: end, dec: Decoration.mark({ class: cls }) });
				}

				if (!isHighlight) continue;

				// Inline content: `jira-sync-inline-start-*` ... `jira-sync-end`
				for (let i = 0; i < markers.length; i++) {
					const m = markers[i];
					if (!m.name.startsWith('jira-sync-inline-start-')) continue;
					const endMarker = markers.find((em, j) => j > i && em.name === 'jira-sync-end');
					if (!endMarker || endMarker.start <= m.end) continue;
					allDecs.push({ from: m.end, to: endMarker.start, dec: Decoration.mark({ class: "jira-sync-content" }) });
				}

				// Line content: `jira-sync-line-*` followed by text to end of line
				for (const m of markers) {
					if (!m.name.startsWith('jira-sync-line-')) continue;
					const line = view.state.doc.lineAt(m.end);
					const nextOnLine = markers.find(nm => nm.start > m.end && nm.start <= line.to);
					const contentEnd = nextOnLine ? nextOnLine.start : line.to;
					if (contentEnd > m.end) {
						allDecs.push({ from: m.end, to: contentEnd, dec: Decoration.mark({ class: "jira-sync-content" }) });
					}
				}

				// Block content: lines between `jira-sync-block-start-*` and `jira-sync-end`
				for (let i = 0; i < markers.length; i++) {
					const m = markers[i];
					if (!m.name.startsWith('jira-sync-block-start-')) continue;
					const endMarker = markers.find((em, j) => j > i && em.name === 'jira-sync-end');
					if (!endMarker) continue;
					const startLine = view.state.doc.lineAt(m.end);
					const endLine = view.state.doc.lineAt(endMarker.start);
					for (let lineNum = startLine.number + 1; lineNum < endLine.number; lineNum++) {
						if (lineNum > view.state.doc.lines) break;
						const line = view.state.doc.line(lineNum);
						allDecs.push({ from: line.from, to: line.from, dec: Decoration.line({ class: "jira-sync-block-content" }) });
					}
				}
			}

			// RangeSetBuilder requires ranges in ascending order of `from`, then `to`
			allDecs.sort((a, b) => a.from - b.from || a.to - b.to);
			for (const { from, to, dec } of allDecs) {
				builder.add(from, to, dec);
			}

			return builder.finish();
		}

		findCodeBlocks(text: string, offset: number) {
			const blocks: Array<{ from: number; to: number }> = [];
			const regex = /```[\s\S]*?```/g;
			let match;
			while ((match = regex.exec(text)) !== null) {
				blocks.push({ from: offset + match.index, to: offset + match.index + match[0].length });
			}
			return blocks;
		}

		isInsideCodeBlock(start: number, end: number, codeBlocks: Array<{ from: number; to: number }>) {
			return codeBlocks.some(block => start >= block.from && end <= block.to);
		}

	}, {
		decorations: v => v.decorations
	});
}
