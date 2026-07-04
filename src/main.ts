import { Plugin, type BasesAllOptions } from "obsidian";
import { BlockView, BlockViewType } from "./views/block-view";

const taskFilterTypeOptions: Record<string, string> = {
	any: "Any",
	incomplete: "Incomplete",
	complete: "Complete",
};

const quoteFilterTypeOptions: Record<string, string> = {
	any: "Any",
	quotes: "Blockquotes",
	callouts: "Callouts",
};

const matchLogicOptions: Record<string, string> = {
	any: "Any filter matches",
	all: "All filters match",
};

export default class BlockViewPlugin extends Plugin {
	onload() {
		this.registerBasesView(BlockViewType, {
			name: "Blocks",
			icon: "lucide-blocks",
			factory: (controller, containerEl) => {
				return new BlockView(controller, containerEl);
			},
			options: (config): BasesAllOptions[] => [
				{
					type: "toggle",
					displayName: "Tasks",
					key: "filterTasks",
					default: false,
				},
				{
					type: "dropdown",
					displayName: "Show",
					key: "filterTasksType",
					default: "any",
					options: taskFilterTypeOptions,
					shouldHide: () => !config.get("filterTasks"),
				},
				{
					type: "toggle",
					displayName: "Quotes",
					key: "filterQuotes",
					default: false,
				},
				{
					type: "dropdown",
					displayName: "Quote type",
					key: "filterQuotesType",
					default: "quotes",
					options: quoteFilterTypeOptions,
					shouldHide: () => !config.get("filterQuotes"),
				},
				{
					type: "toggle",
					displayName: "Code blocks",
					key: "filterCodeBlocks",
					default: false,
				},
				{
					type: "multitext",
					displayName: "Languages",
					key: "filterCodeBlocksLanguages",
					default: ["-base"],
					shouldHide: () => !config.get("filterCodeBlocks"),
				},
				{
					type: "toggle",
					displayName: "Tables",
					key: "filterTables",
					default: false,
				},
				{
					type: "multitext",
					displayName: "Tags",
					key: "tagFilter",
					default: [],
				},
				{
					type: "text",
					displayName: "Text pattern",
					key: "textPattern",
					default: "",
					placeholder: 'meeting or "/^## todo/i"',
				},
				{
					type: "toggle",
					displayName: "Invert text filter",
					key: "invertTextPattern",
					default: false,
					shouldHide: () => !config.get("textPattern"),
				},
				{
					type: "dropdown",
					displayName: "Include if",
					key: "matchLogic",
					default: "any",
					options: matchLogicOptions,
				},
				{
					type: "group",
					displayName: "Display options",
					items: [
						{
							type: "toggle",
							displayName: "Show files without matches",
							key: "showFilesWithoutMatches",
							default: false,
						},
						{
							type: "toggle",
							displayName: "Include non-Markdown files",
							key: "showAllFiles",
							default: false,
						},
						{
							type: "toggle",
							displayName: "Only include matching table rows",
							key: "filterTableRows",
							default: false,
						},
						{
							type: "text",
							displayName: "Max blocks per file",
							key: "maxBlocksPerFile",
							default: "",
							placeholder: "0 = unlimited",
						},
					],
				},
			],
		});
	}
}
