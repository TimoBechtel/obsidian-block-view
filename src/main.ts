import { Plugin } from "obsidian";
import { BlockView, BlockViewType } from "./views/block-view";

export default class BlockViewPlugin extends Plugin {
	async onload() {
		this.registerBasesView(BlockViewType, {
			name: "Blocks",
			icon: "lucide-file-text",
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
						"any": "Any",
						"incomplete": "Incomplete",
						"complete": "Complete",
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
					type: "toggle",
					displayName: "Code blocks",
					key: "filterCodeBlocks",
					default: false,
				},
				{
					type: "text",
					displayName: "Language",
					key: "filterCodeBlocksLanguage",
					default: "",
					placeholder: "e.g. python, js, typescript",
					shouldHide: (config) => !config.get("filterCodeBlocks"),
				},
				{
					type: "multitext",
					displayName: "Include tags",
					key: "tagFilter",
					default: [],
				},
				{
					type: "dropdown",
					displayName: "Include if",
					key: "matchLogic",
					default: "any",
					options: {
						"any": "Any filter matches",
						"all": "All filters match",
					} as Record<string, string>,
				},
				{
					type: "group",
					displayName: "Advanced",
					items: [
						{
							type: "text",
							displayName: "Regex pattern",
							key: "regexPattern",
							default: "",
							placeholder: "e.g. `^- \\[.*\\]`",
						},
					],
				},
				{
					type: "group",
					displayName: "Display options",
					items: [
						{
							type: "toggle",
							displayName: "Show file names",
							key: "showFileNames",
							default: true,
						},
						{
							type: "toggle",
							displayName: "Show files without matches",
							key: "showFilesWithoutMatches",
							default: false,
							shouldHide: (config) => !config.get("showFileNames"),
						},
						{
							type: "toggle",
							displayName: "Include other file types than markdown",
							key: "showAllFiles",
							default: false,
						},
						{
							type: "toggle",
							displayName: "Only include matching table rows",
							key: "filterTableRows",
							default: false,
						},
					],
				},
			],
		});
	}
}
