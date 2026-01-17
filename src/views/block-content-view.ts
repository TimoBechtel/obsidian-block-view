import {
	BasesView,
	Keymap,
	MarkdownRenderer,
	type HoverParent,
	type HoverPopover,
	type QueryController,
} from "obsidian";
import { extractBlocks } from "../parsing/block-parser";
import { TagMatcher } from "../parsing/matchers";

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

		const tagFilter = this.config.get("tagFilter") as string[];

		this.containerEl.empty();

		if (!tagFilter || tagFilter.length === 0) {
			return;
		}

		const showAllFiles = this.config.get("showAllFiles") as boolean;
		const showFileNames = this.config.get("showFileNames") as boolean;
		const matcher = new TagMatcher(tagFilter);

		for (const group of this.data.groupedData) {
			const groupEl = this.containerEl.createDiv("block-content-group");
			let hasContent = false;

			for (const entry of group.entries) {
				const file = entry.file;

				if (!showAllFiles && file.extension !== "md") {
					continue;
				}
				const content = await app.vault.cachedRead(file);
				const blocks = extractBlocks(content, matcher);

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

					// we make blocks clickable, but prevent clicks on links and other elements inside the block
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

					this.setupInternalLinkHandlers(blockEl, file.path);
					this.setupTagHandlers(blockEl);
				}
			}

			if (!hasContent) {
				groupEl.remove();
			}
		}
	}

	/**
	 * Custom view does not automatically add click handlers, so we need to add them manually.
	 */
	private setupInternalLinkHandlers(
		containerEl: HTMLElement,
		sourcePath: string
	) {
		containerEl.querySelectorAll("a.internal-link").forEach((linkEl) => {
			linkEl.addEventListener("click", (evt: MouseEvent) => {
				evt.preventDefault();
				evt.stopPropagation();
				const href =
					linkEl.getAttribute("data-href") ||
					linkEl.getAttribute("href");
				if (href) {
					const modEvent = Keymap.isModEvent(evt);
					void this.app.workspace.openLinkText(
						href,
						sourcePath,
						modEvent
					);
				}
			});

			linkEl.addEventListener("mouseover", (evt: MouseEvent) => {
				const href =
					linkEl.getAttribute("data-href") ||
					linkEl.getAttribute("href");
				if (href) {
					this.app.workspace.trigger("hover-link", {
						event: evt,
						source: "block-content-view",
						hoverParent: this,
						targetEl: linkEl,
						linktext: href,
						sourcePath: sourcePath,
					});
				}
			});
		});
	}

	/**
	 * Sets up handlers to open the search view when a tag is clicked.
	 */
	private setupTagHandlers(containerEl: HTMLElement) {
		containerEl.querySelectorAll("a.tag").forEach((tagEl) => {
			tagEl.addEventListener("click", (evt: MouseEvent) => {
				evt.preventDefault();
				evt.stopPropagation();
				const tag = tagEl.getAttribute("href");
				if (tag) {
					const searchLeaf =
						this.app.workspace.getLeavesOfType("search")[0];
					if (searchLeaf) {
						void this.app.workspace.revealLeaf(searchLeaf);
						const view = searchLeaf.view;

						// using non-public api here, so check availability first
						const isSearchView = (
							view: unknown
						): view is { setQuery: (query: string) => void } =>
							typeof view === "object" &&
							view !== null &&
							"setQuery" in view &&
							typeof view.setQuery === "function";

						if (isSearchView(view)) {
							view.setQuery(`tag:${tag}`);
						}
					}
				}
			});
		});
	}

	public onDataUpdated() {
		void this.render();
	}
}
