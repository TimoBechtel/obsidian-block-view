import {
	BasesView,
	Keymap,
	MarkdownRenderer,
	parsePropertyId,
	TFile,
	type BasesEntry,
	type HoverParent,
	type HoverPopover,
	type QueryController
} from "obsidian";
import { parseBlocks, type ParsedBlock } from "../parsing/block-parser";
import { AndMatcher, CodeBlockMatcher, OrMatcher, QuoteMatcher, RegexMatcher, TagMatcher, TaskMatcher, type LineMatcher } from "../parsing/matchers";
import { debounceLeading } from "../utils/debounce";

export const BlockViewType = "block-view" as const;

type BlockRenderInfo = {
	file: TFile;
	block: ParsedBlock;
	fileTaskLines: Set<number>;
};

export class BlockView extends BasesView implements HoverParent {
	readonly type = BlockViewType;
	private containerEl: HTMLElement;
	private intersectionObserver: IntersectionObserver;

	private debouncedRender = debounceLeading(() => {
		void this.render();
	}, 200);

	private pendingRenders = new Map<HTMLElement, BlockRenderInfo>();

	/**
	 * Visible blocks are rendered eagerly, but invisible blocks are lazy loaded on scroll.
	 * This avoids flashing content. 
	 */
	private shouldLazyLoad = false;

	hoverPopover: HoverPopover | null;

	constructor(controller: QueryController, parentEl: HTMLElement) {
		super(controller);
		this.containerEl = parentEl.createDiv("block-view-container");

		/**
		 * Custom view does not automatically add click handlers, so we need to add them manually.
		 */
		this.registerDomEvent(this.containerEl, "click", (evt) => {
			this.handleContainerClick(evt);
		});

		this.registerDomEvent(this.containerEl, "mouseover", (evt) => {
			this.handleContainerMouseOver(evt);
		});

		this.intersectionObserver = new IntersectionObserver(
			(entries) => this.handleIntersection(entries),
			{
				root: parentEl,
				rootMargin: "200px",
				threshold: 0.01,
			}
		);

		this.register(() => {
			this.intersectionObserver.disconnect();
		});
	}

	private async render() {
		const context = this.getRenderContext();
		const currentHeight = this.containerEl.offsetHeight;
		if (currentHeight > 0) {
			// avoid scroll reset 
			this.containerEl.setCssStyles({ minHeight: `${currentHeight}px` });
		}

		this.containerEl.empty();
		this.pendingRenders.clear();
		this.shouldLazyLoad = false;

		this.intersectionObserver.disconnect();


		if (!context.hasActiveFilters) {
			this.renderEmptyPlaceholder();
			this.containerEl.setCssStyles({ minHeight: "" });
			return;
		}

		await this.renderGroups(context);
		this.containerEl.setCssStyles({ minHeight: "" });
	}

	private async renderGroups(context: ReturnType<typeof this.getRenderContext>) {
		const { app } = this;
		const {
			matcher,
			showAllFiles,
			showFilesWithoutMatches,
			filterTableRows,
			maxBlocksPerFile,
		} = context;
		for (const group of this.data.groupedData) {
			const groupEl = this.containerEl.createDiv("block-view-group");
			let hasContent = false;

			for (const entry of group.entries) {
				const file = entry.file;

				if (!showAllFiles && file.extension !== "md") {
					continue;
				}

				const metadata = app.metadataCache.getFileCache(file);
				if (!metadata) {
					continue;
				}

				/**
				 * Lines that contain tasks in the file.
				 */
				const fileTaskLines = new Set<number>();
				metadata.listItems?.forEach((item) => {
					if (item.task !== undefined) {
						fileTaskLines.add(item.position.start.line);
					}
				});

				const content = await app.vault.cachedRead(file);
				const blocks = parseBlocks(content, metadata, matcher, {
					filterTableRows,
					limit: maxBlocksPerFile > 0 ? maxBlocksPerFile : undefined,
				});

				if (blocks.length === 0 && !showFilesWithoutMatches) {
					continue;
				}

				hasContent = true;
				const fileEl = groupEl.createDiv("block-view-file");
				fileEl.dataset.filePath = file.path;
				await this.renderFile(fileEl, entry, file, blocks, context, fileTaskLines);
			}

			if (!hasContent) {
				groupEl.remove();
				continue;
			}

			if (group.key !== undefined && group.key !== null) {
				const groupHeaderEl = groupEl.createDiv("block-view-group-header");
				group.key.renderTo(groupHeaderEl, {
					hoverPopover: this.hoverPopover,
				});
				groupEl.insertBefore(groupHeaderEl, groupEl.firstChild);
			}
		}
	}

	/**
	 * Adds hidden anchors to task lines with the line number in the markdown source.
	 */
	private decorateTaskLines(content: string, startLine: number, fileTaskLines: Set<number>): string {
		// quick check first to skip unnecessary splitting
		if (!content.includes("[") || !content.includes("]")) return content;

		return content
			.split("\n")
			.map((line, rel) => {
				const lineNumber = startLine + rel;
				return fileTaskLines.has(lineNumber)
					? `${line}<span class="bv-task-anchor" data-bv-line="${lineNumber}"></span>`
					: line;
			})
			.join("\n");
	}

	private async toggleTaskAtLine(file: TFile, line: number): Promise<void> {
		const metadata = this.app.metadataCache.getFileCache(file);
		const listItem = metadata?.listItems?.find(item => item.position.start.line === line);

		if (!listItem || listItem.task === undefined) {
			console.error("Could not find target task line in metadata");
			return;
		}

		await this.app.vault.process(file, (content) => {
			const lines = content.split("\n");
			const current = lines[line];
			if (!current) {
				console.error("Could not find target line in content");
				return content;
			}

			lines[line] = current.replace(/\[([ xX])\]/, (match, status: string) => {
				return status.toLowerCase() === "x" ? "[ ]" : "[x]";
			});
			return lines.join("\n");
		});
	}

	public onDataUpdated() {
		this.debouncedRender();
	}

	private handleContainerClick(evt: MouseEvent) {
		if (evt.button !== 0 && evt.button !== 1) return;

		const target = evt.target;
		if (!(target instanceof HTMLElement)) return;

		const internalLink = target.closest("a.internal-link");
		if (internalLink instanceof HTMLAnchorElement) {
			this.handleInternalLinkClick(evt, internalLink);
			return;
		}

		const tagLink = target.closest("a.tag");
		if (tagLink instanceof HTMLAnchorElement) {
			this.handleTagClick(evt, tagLink);
			return;
		}

		const checkbox = target.closest('input[type="checkbox"].task-list-item-checkbox');
		if (checkbox instanceof HTMLInputElement) {
			this.handleCheckboxClick(evt, checkbox);
			return;
		}

		const blockEl = target.closest(".block-view-block");
		if (!(blockEl instanceof HTMLElement)) return;

		// we make blocks clickable, but prevent clicks on links and other elements inside the block
		if (this.isInteractiveTarget(target)) {
			return;
		}

		const filePath = blockEl.dataset.filePath;
		const line = Number(blockEl.dataset.startLine ?? "");
		if (!filePath || Number.isNaN(line)) return;

		evt.preventDefault();
		const modEvent = Keymap.isModEvent(evt);
		void this.app.workspace.openLinkText(
			filePath,
			"",
			modEvent,
			{ eState: { line } }
		);
	}

	private handleContainerMouseOver(evt: MouseEvent) {
		const target = evt.target;
		if (!(target instanceof HTMLElement)) return;

		const internalLink = target.closest("a.internal-link");
		if (!(internalLink instanceof HTMLAnchorElement)) return;

		const href = internalLink.getAttribute("data-href") || internalLink.getAttribute("href");
		if (!href) return;

		const fileEl = internalLink.closest(".block-view-file");
		const sourcePath = fileEl instanceof HTMLElement ? fileEl.dataset.filePath ?? "" : "";

		this.app.workspace.trigger("hover-link", {
			event: evt,
			source: "bases", // uses 'bases' to respect page preview settings for bases
			hoverParent: this,
			targetEl: internalLink,
			linktext: href,
			sourcePath: sourcePath,
		});
	}

	private handleInternalLinkClick(evt: MouseEvent, linkEl: HTMLAnchorElement) {
		evt.preventDefault();

		const href = linkEl.getAttribute("data-href") || linkEl.getAttribute("href");
		if (!href) return;

		const fileEl = linkEl.closest(".block-view-file");
		const sourcePath = fileEl instanceof HTMLElement ? fileEl.dataset.filePath ?? "" : "";
		const modEvent = Keymap.isModEvent(evt);
		void this.app.workspace.openLinkText(
			href,
			sourcePath,
			modEvent
		);
	}

	/**
	 * Opens the search view when a tag is clicked.
	 */
	private handleTagClick(evt: MouseEvent, tagEl: HTMLAnchorElement) {
		evt.preventDefault();
		evt.stopPropagation();

		const tag = tagEl.getAttribute("href");
		if (!tag) return;

		const searchLeaf = this.app.workspace.getLeavesOfType("search")[0];
		if (!searchLeaf) return;

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

	/**
	 * Toggles the task at the line number when a checkbox is clicked.
	 */
	private handleCheckboxClick(evt: MouseEvent, checkbox: HTMLInputElement) {
		evt.preventDefault();
		evt.stopPropagation();

		const fileEl = checkbox.closest(".block-view-file");
		const filePath = fileEl instanceof HTMLElement ? fileEl.dataset.filePath : undefined;
		if (!filePath) return;

		const abstractFile = this.app.vault.getAbstractFileByPath(filePath);
		if (!abstractFile || !(abstractFile instanceof TFile)) return;

		const li = checkbox.closest("li");
		const anchor = li?.querySelector<HTMLElement>(".bv-task-anchor");
		const line = anchor?.getAttribute("data-bv-line");
		if (!line) return;

		checkbox.disabled = true;
		void this.toggleTaskAtLine(abstractFile, Number(line));
	}

	private isInteractiveTarget(target: HTMLElement): boolean {
		const tagName = target.tagName?.toLowerCase() || "";
		if (
			tagName === "a" ||
			tagName === "input" ||
			tagName === "button" ||
			tagName === "textarea" ||
			tagName === "select"
		) {
			return true;
		}

		if (target.isContentEditable || target.hasAttribute("contenteditable")) {
			return true;
		}

		if (target.closest("a, button, input, textarea, select, svg")) {
			return true;
		}

		return false;
	}


	private handleIntersection(entries: IntersectionObserverEntry[]) {
		for (const entry of entries) {
			if (entry.isIntersecting) {
				const placeholder = entry.target as HTMLElement;
				if (this.pendingRenders.has(placeholder)) {
					void this.populatePlaceholder(placeholder);
				}
			}
		}
	}

	/**
	 * Renders the block markdown to the DOM
	 */
	private async populatePlaceholder(placeholder: HTMLElement) {
		const renderInfo = this.pendingRenders.get(placeholder);
		if (!renderInfo) return;

		this.pendingRenders.delete(placeholder);
		this.intersectionObserver.unobserve(placeholder);

		const { file, block, fileTaskLines } = renderInfo;

		placeholder.classList.remove("block-view-block-placeholder");
		placeholder.setCssStyles({ minHeight: "" });

		const decoratedContent = this.decorateTaskLines(
			block.content,
			block.startLine,
			fileTaskLines
		);

		await MarkdownRenderer.render(
			this.app,
			decoratedContent.trimStart(),
			placeholder,
			file.path,
			this
		);
	}

	private renderEmptyPlaceholder() {
		const placeholderEl = this.containerEl.createDiv("block-view-empty-placeholder");
		placeholderEl.createEl("p", {
			text: "No filters enabled",
			cls: "block-view-empty-placeholder-title",
		});
		placeholderEl.createEl("p", {
			text: "Enable at least one filter in the view options",
			cls: "block-view-empty-placeholder-subtitle",
		});
	}

	private getRenderContext() {
		const filterTasks = !!this.config.get("filterTasks");
		const filterTasksType = this.config.get("filterTasksType") as "any" | "incomplete" | "complete" ?? "any";
		const filterQuotes = !!this.config.get("filterQuotes");
		const filterCodeBlocks = !!this.config.get("filterCodeBlocks");
		const filterCodeBlocksLanguage = String(this.config.get("filterCodeBlocksLanguage") as string ?? "");
		const tagFilter = this.config.get("tagFilter") as string[] ?? [];
		const regexPattern = String(this.config.get("regexPattern") as string ?? "");
		const matchLogic = this.config.get("matchLogic") as "any" | "all" ?? "any";
		const showAllFiles = !!this.config.get("showAllFiles");
		const showFilesWithoutMatches = !!this.config.get("showFilesWithoutMatches");
		const filterTableRows = !!this.config.get("filterTableRows");
		const propertySeparator = String(this.config.get("separator") as string ?? "|");
		const maxBlocksPerFile = Number(this.config.get("maxBlocksPerFile") as string ?? "0") || 0;
		const selectedProperties = this.config.getOrder();

		const hasTagFilter = tagFilter && tagFilter.length > 0;
		const hasRegexPattern = regexPattern && regexPattern.trim() !== "";

		const matchers: LineMatcher[] = [
			...(filterTasks ? [new TaskMatcher(filterTasksType)] : []),
			...(filterQuotes ? [new QuoteMatcher()] : []),
			...(filterCodeBlocks ? [new CodeBlockMatcher(filterCodeBlocksLanguage)] : []),
			...(hasTagFilter ? [new TagMatcher(tagFilter)] : []),
			...(hasRegexPattern ? [new RegexMatcher(regexPattern)] : []),
		];

		const hasActiveFilters = matchers.length > 0;

		const matcher = (matchers.length === 1 && matchers[0])
			? matchers[0]
			: matchLogic === "all"
				? new AndMatcher(matchers)
				: new OrMatcher(matchers);

		return {
			matcher,
			showAllFiles,
			showFilesWithoutMatches,
			filterTableRows,
			propertySeparator,
			maxBlocksPerFile,
			selectedProperties,
			hasActiveFilters,
		};
	}

	private async renderFile(
		fileEl: HTMLElement,
		entry: BasesEntry,
		file: TFile,
		blocks: ReturnType<typeof parseBlocks>,
		{ selectedProperties, propertySeparator }: ReturnType<typeof this.getRenderContext>,
		fileTaskLines: Set<number>
	) {
		fileEl.empty();

		// render file name and properties
		if (selectedProperties.length > 0) {
			const headerEl = fileEl.createSpan("block-view-file-header");
			let firstProp = true;

			for (const propertyId of selectedProperties) {
				const { type, name } = parsePropertyId(propertyId);

				if (name === "name" && type === "file") {
					headerEl.createEl("a", {
						text: file.name,
						cls: "block-view-file-link internal-link",
						href: file.path,
					});
					continue;
				}

				const value = entry.getValue(propertyId);
				if (!value) continue;

				if (!firstProp) {
					headerEl.createSpan({ cls: "block-view-separator", text: propertySeparator });
				}
				firstProp = false;

				const valueEl = headerEl.createSpan("block-view-property-value");
				try {
					value.renderTo(valueEl, {
						hoverPopover: this.hoverPopover,
					});
				} catch {
					valueEl.textContent = value.toString();
				}
			}
		}

		// render file contents
		if (blocks.length === 0) return;

		const blocksEl = fileEl.createDiv("block-view-blocks");

		for (const block of blocks) {
			const blockEl = blocksEl.createDiv(
				// markdown-preview-view markdown-rendered - are the internal obsidian classes so that it looks like normal markdown
				"block-view-block markdown-preview-view markdown-rendered block-view-block-placeholder"
			);
			blockEl.dataset.filePath = file.path;
			blockEl.dataset.startLine = String(block.startLine);


			// we estimate the height based on line count
			const lineCount = block.endLine - block.startLine + 1;
			const estimatedHeight = Math.max(3, lineCount * 1.5);
			blockEl.style.minHeight = `${estimatedHeight}rem`;

			this.pendingRenders.set(blockEl, {
				file,
				block,
				fileTaskLines,
			});

			// we first fill up the visible (+ previously rendered) blocks eagerly to avoid flashing content
			if (!this.shouldLazyLoad) {
				const blockRect = blockEl.getBoundingClientRect();
				const viewportBottom = window.innerHeight;

				if (blockRect.top > viewportBottom) {
					this.shouldLazyLoad = true;
				}
			}

			if (this.shouldLazyLoad) {
				this.intersectionObserver.observe(blockEl);
			} else {
				void this.populatePlaceholder(blockEl);
			}
		}
	}
}
