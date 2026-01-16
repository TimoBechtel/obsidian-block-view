import {
	BasesView,
	Keymap,
	MarkdownRenderer,
	type HoverParent,
	type HoverPopover,
	type QueryController,
} from "obsidian";
import { extractBlocks } from "../parsing/block-parser";

export class BlockContentView extends BasesView implements HoverParent {
	readonly type = "block-content-view";
	private containerEl: HTMLElement;

	hoverPopover: HoverPopover | null;

	constructor(controller: QueryController, parentEl: HTMLElement) {
		super(controller);
		this.containerEl = parentEl.createDiv("block-content-view-container");
	}

	private async render() {
		const { app } = this;

		const tagFilter = this.config.get("tagFilter") as string;
		if (!tagFilter) {
			return;
		}

		const showAllFiles = this.config.get("showAllFiles") as boolean;
		const showFileNames = this.config.get("showFileNames") as boolean;

		this.containerEl.empty();

		for (const group of this.data.groupedData) {
			const groupEl = this.containerEl.createDiv("block-content-group");
			let hasContent = false;

			for (const entry of group.entries) {
				const file = entry.file;

				if (!showAllFiles && file.extension !== "md") {
					continue;
				}
				const content = await app.vault.cachedRead(file);
				const blocks = extractBlocks(content, tagFilter);

				if (blocks.length === 0) {
					continue;
				}

				if (!hasContent) {
					hasContent = true;
					if (group.key !== undefined && group.key !== null) {
						const groupHeaderEl = groupEl.createDiv(
							"block-content-group-header"
						);
						group.key.renderTo(groupHeaderEl, {
							hoverPopover: this.hoverPopover,
						});
					}
				}

				const fileEl = groupEl.createDiv("block-content-file");

				if (showFileNames) {
					const fileLinkEl = fileEl.createEl("a", {
						text: file.name,
						cls: "block-content-file-link",
					});

					fileLinkEl.onClickEvent((evt) => {
						if (evt.button !== 0 && evt.button !== 1) return;
						evt.preventDefault();
						const modEvent = Keymap.isModEvent(evt);
						void app.workspace.openLinkText(
							file.path,
							"",
							modEvent
						);
					});

					fileLinkEl.addEventListener("mouseover", (evt) => {
						app.workspace.trigger("hover-link", {
							event: evt,
							source: "bases",
							hoverParent: this,
							targetEl: fileLinkEl,
							linktext: file.path,
						});
					});
				}

				const blocksEl = fileEl.createDiv("block-content-blocks");

				for (const block of blocks) {
					// markdown-preview-view markdown-rendered - are the internal obsidian classes so that it looks like normal markdown
					const blockEl = blocksEl.createDiv(
						"block-content-block markdown-preview-view markdown-rendered"
					);

					blockEl.addEventListener("click", (evt) => {
						if (evt.button !== 0 && evt.button !== 1) return;

						const target = evt.target as HTMLElement;
						const tagName = target.tagName?.toLowerCase() || "";

						if (
							tagName === "a" ||
							tagName === "input" ||
							tagName === "button" ||
							tagName === "textarea" ||
							tagName === "select" ||
							target.isContentEditable ||
							target.hasAttribute("contenteditable") ||
							target.closest("a") ||
							target.closest("button") ||
							target.closest("input") ||
							target.closest("svg")
						) {
							return;
						}
						evt.preventDefault();
						const modEvent = Keymap.isModEvent(evt);
						void app.workspace.openLinkText(
							file.path,
							"",
							modEvent,
							{ eState: { line: block.startLine } }
						);
					});

					await MarkdownRenderer.render(
						app,
						block.content,
						blockEl,
						file.path,
						this
					);
				}
			}

			if (!hasContent) {
				groupEl.remove();
			}
		}
	}

	public onDataUpdated() {
		void this.render();
	}
}
