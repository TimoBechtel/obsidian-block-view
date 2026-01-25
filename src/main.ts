import { Plugin } from "obsidian";
import { BlockView, BlockViewType } from "./views/block-view";

export default class BlockViewPlugin extends Plugin {
	async onload() {
		this.registerBasesView(BlockViewType, {
			name: "Blocks",
			icon: "lucide-blocks",
			factory: (controller, containerEl) => {
				return new BlockView(controller, containerEl);
			},
			options: () => [
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
					options: {
						any: "Any",
						incomplete: "Incomplete",
						complete: "Complete",
					} as Record<string, string>,
					shouldHide: (config) => !config.get("filterTasks"),
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
					options: {
						any: "Any",
						quotes: "Blockquotes",
						callouts: "Callouts",
					} as Record<string, string>,
					shouldHide: (config) => !config.get("filterQuotes"),
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
					placeholder: "e.g. ts, js, -base",
					shouldHide: (config) => !config.get("filterCodeBlocks"),
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
					placeholder: "e.g. #work, -#archived",
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
					shouldHide: (config) => !config.get("textPattern"),
				},
				{
					type: "dropdown",
					displayName: "Include if",
					key: "matchLogic",
					default: "any",
					options: {
						any: "Any filter matches",
						all: "All filters match",
					} as Record<string, string>,
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
							displayName:
								"Include other file types than markdown",
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
							default: "0",
							placeholder: "0 = unlimited",
						},
					],
				},
			],
		});
	}
}
