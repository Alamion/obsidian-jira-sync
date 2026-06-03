import { Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { MarkdownView } from 'obsidian';
import JiraPlugin from '../main';

export function createJiraSyncExtension(plugin: JiraPlugin): Extension {
	return ViewPlugin.fromClass(
		class {
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
				const sel = view.state.selection;

				const allDecs: Array<{ from: number; to: number; dec: Decoration }> = [];

				for (let { from, to } of view.visibleRanges) {
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
						const isActive = sel.ranges.some((r) => r.from <= end && r.to >= start);
						const cls = isActive ? 'jira-sync-hidden jira-sync-active' : 'jira-sync-hidden';
						allDecs.push({ from: start, to: end, dec: Decoration.mark({ class: cls }) });
					}
				}

				// RangeSetBuilder requires ranges in ascending order of `from`, then `to`
				allDecs.sort((a, b) => a.from - b.from || a.to - b.to);
				for (const { from, to, dec } of allDecs) {
					builder.add(from, to, dec);
				}

				return builder.finish() as DecorationSet;
			}

			findCodeBlocks(text: string, offset: number) {
				const blocks = [];
				const regex = /```[\s\S]*?```/g;
				let match;

				while ((match = regex.exec(text)) !== null) {
					blocks.push({
						from: offset + match.index,
						to: offset + match.index + match[0].length,
					});
				}

				return blocks;
			}

			isInsideCodeBlock(start: number, end: number, codeBlocks: Array<{ from: number; to: number }>) {
				return codeBlocks.some((block) => start >= block.from && end <= block.to);
			}
		},
		{
			decorations: (v) => v.decorations,
		},
	);
}
