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

			for (let { from, to } of view.visibleRanges) {
				const text = view.state.doc.sliceString(from, to);
				const codeBlocks = this.findCodeBlocks(text, from);

				for (const match of text.matchAll(/`(jira-sync-[^`]+)`/g)) {
					const start = from + match.index!;
					const end   = start + match[0].length;
					const contentStart = start; // без первой `
					const contentEnd   = end;   // без последней `

					// Find code blocks to ignore
					if (this.isInsideCodeBlock(contentStart, contentEnd, codeBlocks)) {
						continue;
					}

					let className = "jira-sync-hidden";

					// Check if cursor is inside
					const sel = view.state.selection;
					if (sel.ranges.some(r => r.from <= contentEnd && r.to >= contentStart)) {
						className += " jira-sync-active";
					}

					builder.add(start, end,
						Decoration.mark({ class: className })
					);
				}
			}

			return builder.finish();
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
