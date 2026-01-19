import {
	BasesView,
	Keymap,
	MarkdownRenderer,
	type HoverParent,
	type HoverPopover,
	type QueryController,
	type TFile,
} from "obsidian";
import { parseBlocks } from "../parsing/block-parser";
import { AndMatcher, CodeBlockMatcher, OrMatcher, QuoteMatcher, RegexMatcher, TagMatcher, TaskMatcher, type LineMatcher } from "../parsing/matchers";
import { isTaskLine, toggleTaskLine } from "../parsing/markdown-utils";

export const BlockViewType = "block-view" as const;

export class BlockView extends BasesView implements HoverParent {
	readonly type = BlockViewType;
	private containerEl: HTMLElement;

	hoverPopover: HoverPopover | null;

	constructor(controller: QueryController, parentEl: HTMLElement) {
		super(controller);
		this.containerEl = parentEl.createDiv("block-view-container");
	}

	private async render() {
		const { app } = this;

		const filterTasks = this.config.get("filterTasks") as boolean;
		const filterTasksType = this.config.get("filterTasksType") as "any" | "incomplete" | "complete";
		const filterQuotes = this.config.get("filterQuotes") as boolean;
		const filterCodeBlocks = this.config.get("filterCodeBlocks") as boolean;
		const filterCodeBlocksLanguage = this.config.get("filterCodeBlocksLanguage") as string;
		const tagFilter = this.config.get("tagFilter") as string[];
		const regexPattern = this.config.get("regexPattern") as string;
		const matchLogic = this.config.get("matchLogic") as "any" | "all";

		this.containerEl.empty();

		const hasTagFilter = tagFilter && tagFilter.length > 0;
		const hasRegexPattern = regexPattern && regexPattern.trim() !== "";
		const hasBlockTypeFilters = filterTasks || filterQuotes || filterCodeBlocks;

		if (!hasTagFilter && !hasRegexPattern && !hasBlockTypeFilters) {
			const placeholderEl = this.containerEl.createDiv("block-view-placeholder");
			placeholderEl.createEl("p", {
				text: "No filters enabled",
				cls: "block-view-placeholder-title",
			});
			placeholderEl.createEl("p", {
				text: "Enable at least one filter in the view options",
				cls: "block-view-placeholder-subtitle",
			});
			return;
		}

		const showAllFiles = this.config.get("showAllFiles") as boolean;
		const showFileNames = this.config.get("showFileNames") as boolean;
		const showFilesWithoutMatches = this.config.get("showFilesWithoutMatches") as boolean;
		const filterTableRows = this.config.get("filterTableRows") as boolean;

		const matchers: LineMatcher[] = [
			...(filterTasks ? [new TaskMatcher(filterTasksType)] : []),
			...(filterQuotes ? [new QuoteMatcher()] : []),
			...(filterCodeBlocks ? [new CodeBlockMatcher(filterCodeBlocksLanguage)] : []),
			...(hasTagFilter ? [new TagMatcher(tagFilter)] : []),
			...(hasRegexPattern ? [new RegexMatcher(regexPattern)] : []),
		];

		const matcher = (matchers.length === 1 && matchers[0])
			? matchers[0]
			: matchLogic === "all"
				? new AndMatcher(matchers)
				: new OrMatcher(matchers);

		for (const group of this.data.groupedData) {
			const groupEl = this.containerEl.createDiv("block-view-group");
			let hasContent = false;

			for (const entry of group.entries) {
				const file = entry.file;

				if (!showAllFiles && file.extension !== "md") {
					continue;
				}
				const blocks = await parseBlocks(app, file, matcher, {
					filterTableRows,
				});

				if (blocks.length === 0 && !showFilesWithoutMatches) {
					continue;
				}

				if (!hasContent) {
					hasContent = true;
					if (group.key !== undefined && group.key !== null) {
						const groupHeaderEl = groupEl.createDiv(
							"block-view-group-header"
						);
						group.key.renderTo(groupHeaderEl, {
							hoverPopover: this.hoverPopover,
						});
					}
				}

				const fileEl = groupEl.createDiv("block-view-file");

				if (showFileNames) {
					fileEl.createEl("a", {
						text: file.name,
						cls: "block-view-file-link internal-link",
						href: file.path,
					});
				}

				this.setupInternalLinkHandlers(fileEl, file.path);

				if (blocks.length === 0) {
					continue;
				}
				const blocksEl = fileEl.createDiv("block-view-blocks");

				for (const block of blocks) {
					// markdown-preview-view markdown-rendered - are the internal obsidian classes so that it looks like normal markdown
					const blockEl = blocksEl.createDiv(
						"block-view-block markdown-preview-view markdown-rendered"
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
					this.setupCheckboxHandlers(blockEl, file, block);
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

				if (evt.button !== 0 && evt.button !== 1) return;

				evt.preventDefault();
				// evt.stopPropagation();
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
						source: 'bases', // uses 'bases' to respect page preview settings for bases
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

						this.app.workspace.setActiveLeaf(searchLeaf, { focus: true });
					}
				}
			});
		});
	}

	/**
	 * Sets up handlers to toggle the task when a checkbox is clicked.
	 */
	private setupCheckboxHandlers(
		blockEl: HTMLElement,
		file: TFile,
		block: { startLine: number; endLine: number }
	) {
		blockEl.querySelectorAll('input[type="checkbox"].task-list-item-checkbox')
			.forEach((checkbox: HTMLInputElement, index) => {
				checkbox.addEventListener("click", (evt) => {
					evt.preventDefault();
					evt.stopPropagation();
					// disable while processing
					checkbox.disabled = true;
					void this.toggleTask(file, block, index);
				});
			});
	}

	/**
	 * Toggles a task at given index in the file. 
	 */
	private async toggleTask(
		file: TFile,
		block: { startLine: number; endLine: number },
		checkboxIndex: number
	): Promise<void> {
		await this.app.vault.process(file, (content) => {
			const lines = content.split("\n");
			let taskCount = 0;

			for (let i = block.startLine; i <= block.endLine; i++) {
				const line = lines[i];
				if (line && isTaskLine(line)) {
					if (taskCount === checkboxIndex) {
						lines[i] = toggleTaskLine(line);
						return lines.join("\n");
					}
					taskCount++;
				}
			}

			console.error("Could not find target task line");
			return content;
		});
	}

	public onDataUpdated() {
		void this.render();
	}
}
