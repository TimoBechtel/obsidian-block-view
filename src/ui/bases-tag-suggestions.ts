import {
	AbstractInputSuggest,
	Component,
	getAllTags,
	prepareFuzzySearch,
	sortSearchResults,
	type App,
	type Plugin,
	type SearchResultContainer,
} from "obsidian";
import {
	indexVaultTags,
	tagSearchQuery,
	tagSuggestionRows,
	type VaultTag,
} from "../utils/tag-suggestions";
import { blockLayoutName, tagsFieldName } from "../views/block-view";

// Bases doesn't expose a control-render hook or put the option key on the row.
// Check both the selected layout (not the editable view name) and the field.
function isTagsEditor(input: HTMLDivElement): boolean {
	if (!input.matches('.multi-select-input[contenteditable="true"]'))
		return false;
	const form = input.closest(".bases-toolbar-menu .view-config-menu");
	if (
		form?.querySelector(".combobox-button-label")?.textContent !==
		blockLayoutName
	)
		return false;
	const row = input.closest<HTMLElement>(".input-row");
	return (
		row?.querySelector(".input-row-label")?.textContent === tagsFieldName
	);
}

function* vaultTags(app: App): Iterable<string> {
	for (const file of app.vault.getMarkdownFiles()) {
		const cache = app.metadataCache.getFileCache(file);
		if (cache) yield* getAllTags(cache) ?? [];
	}
}

class VaultTagSuggest extends AbstractInputSuggest<string> {
	constructor(
		app: App,
		private readonly editor: HTMLDivElement,
		private readonly getTags: () => VaultTag[]
	) {
		super(app, editor);
	}

	protected getSuggestions(draft: string): string[] {
		const tags = this.getTags();
		const query = tagSearchQuery(draft);
		if (!query) return tagSuggestionRows(draft, tags);

		const search = prepareFuzzySearch(query);
		const results: (VaultTag & SearchResultContainer)[] = [];
		for (const { name } of tags) {
			const match = search(name);
			if (match) results.push({ name, match });
		}
		sortSearchResults(results);
		return tagSuggestionRows(draft, results);
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.setText(value);
	}

	close(): void {
		super.close();
		// Obsidian 1.14.4 registers this document listener in capture mode but
		// removes it in bubble mode, retaining the picker after the menu closes.
		const { autoReposition } = this as { autoReposition?: EventListener };
		if (typeof autoReposition === "function") {
			this.editor.doc.removeEventListener("scroll", autoReposition, true);
		}
	}

	selectSuggestion(value: string): void {
		this.close();
		this.setValue(value);
		// Commit through Bases' own pill editor, not the app's Enter shortcut.
		this.editor.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Enter", cancelable: true })
		);
		// Bases clears the draft and fires input, which can reopen suggestions.
		this.close();
	}
}

export function registerTagSuggestions(plugin: Plugin) {
	let tags: VaultTag[] | undefined;
	const invalidate = () => {
		tags = undefined;
	};
	const { metadataCache } = plugin.app;
	plugin.registerEvent(metadataCache.on("changed", invalidate));
	plugin.registerEvent(metadataCache.on("deleted", invalidate));
	const getTags = () => (tags ??= indexVaultTags(vaultTags(plugin.app)));
	const documents = new Map<Document, Component>();
	function listen(doc: Document) {
		if (documents.has(doc)) return;
		const listeners = plugin.addChild(new Component());
		documents.set(doc, listeners);
		const attached = new WeakSet<HTMLDivElement>();
		// Attach before the field receives focus so the native popup opens on first use.
		listeners.registerDomEvent(
			doc,
			"focus",
			(event) => {
				const input = event.targetNode;
				if (
					!input?.instanceOf(HTMLDivElement) ||
					attached.has(input) ||
					!isTagsEditor(input)
				)
					return;
				attached.add(input);
				const session = listeners.addChild(new Component());
				const picker = new VaultTagSuggest(plugin.app, input, getTags);
				session.register(() => picker.close());
				const observer = new MutationObserver(() => {
					if (!input.isConnected) listeners.removeChild(session);
				});
				observer.observe(doc.body, { childList: true, subtree: true });
				session.register(() => observer.disconnect());
			},
			true
		);
	}
	listen(document);
	plugin.app.workspace.iterateAllLeaves((leaf) =>
		listen(leaf.view.containerEl.doc)
	);
	plugin.registerEvent(
		plugin.app.workspace.on("window-open", (win) => listen(win.doc))
	);
	plugin.registerEvent(
		plugin.app.workspace.on("window-close", (win) => {
			const listeners = documents.get(win.doc);
			if (listeners) plugin.removeChild(listeners);
			documents.delete(win.doc);
		})
	);
}
