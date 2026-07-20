import { setIcon } from "obsidian";

export type BlockViewPresetConfigValue = boolean | string | string[];

export type BlockViewPresetConfig = Readonly<
	Record<string, BlockViewPresetConfigValue>
>;

const PRESETS: readonly {
	label: string;
	hint: string;
	icon: string;
	config: BlockViewPresetConfig;
}[] = [
	{
		label: "Open tasks",
		hint: "List all open tasks in your vault and check them off right there",
		icon: "lucide-square-check-big",
		config: { filterTasks: true, filterTasksType: "incomplete" },
	},
	{
		label: "Code snippets",
		hint: "Pulls all code blocks in any language into this base",
		icon: "lucide-code-2",
		config: { filterCodeBlocks: true },
	},
	{
		label: "Quotes & callouts",
		hint: "View all your quotes and callouts in your vault",
		icon: "lucide-quote",
		config: { filterQuotes: true, filterQuotesType: "any" },
	},
];

const TIPS = [
	"Prefix a tag with a minus sign to exclude it.",
	'Use pattern "## Todo" to match all blocks with "Todo" as heading.',
	'Hide empty tasks by combining a Task filter with pattern "/[^-\\[\\]\\s]/"',
] as const;

export function renderBlockViewEmptyState({
	parent,
	onApplyPreset,
}: {
	parent: HTMLElement;
	onApplyPreset: (config: BlockViewPresetConfig) => void;
}) {
	const root = parent.createDiv({
		cls: "bv-empty",
	});

	renderToolbarCallout(root, "Block filters live up here");

	const content = root.createDiv("bv-content");

	const brand = content.createDiv("bv-brand");
	const brandIcon = brand.createSpan("bv-brand-icon");
	setIcon(brandIcon, "lucide-blocks");
	brand.createSpan({ cls: "bv-brand-name", text: "Block View" });

	content.createEl("h2", {
		cls: "bv-title",
		text: "Choose what to display",
	});
	content.createEl("p", {
		cls: "bv-lede",
		text: "Pulls matching content from every note in this base. Set filters in the view options, or start with a preset:",
	});

	const grid = content.createDiv("bv-tile-grid");
	for (const preset of PRESETS) {
		const tile = grid.createEl("button", { cls: "bv-tile" });
		const iconEl = tile.createDiv("bv-tile-icon");
		setIcon(iconEl, preset.icon);
		tile.createDiv({ cls: "bv-tile-label", text: preset.label });
		tile.createDiv({ cls: "bv-tile-hint", text: preset.hint });
		tile.addEventListener("click", () => onApplyPreset(preset.config));
	}

	const docsLink = content.createEl("a", {
		cls: "bv-docs-link",
		text: "Read the docs",
		href: "https://github.com/TimoBechtel/obsidian-block-view#readme",
	});
	docsLink.setAttribute("target", "_blank");
	docsLink.setAttribute("rel", "noopener");
	const arrowEl = docsLink.createSpan("bv-docs-link-arrow");
	setIcon(arrowEl, "lucide-arrow-up-right");

	const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
	const tipEl = content.createDiv("bv-tip");
	const tipIconEl = tipEl.createSpan("bv-tip-icon");
	setIcon(tipIconEl, "lucide-lightbulb");
	const tipTextEl = tipEl.createSpan("bv-tip-text");
	tipTextEl.createEl("strong", { cls: "bv-tip-label", text: "Tip:" });
	tipTextEl.createSpan({ cls: "bv-tip-body", text: tip });
}

function renderCurveArrow(
	parent: Element,
	{
		viewBox,
		curve,
		arrowhead,
	}: { viewBox: string; curve: string; arrowhead: string }
) {
	const svg = parent.createSvg("svg", {
		cls: "bv-arrow-svg",
		attr: { viewBox, "aria-hidden": "true" },
	});
	svg.createSvg("path", {
		attr: {
			d: `${curve} ${arrowhead}`,
			fill: "none",
			stroke: "currentColor",
			"stroke-width": "1.5",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
		},
	});
}

function renderToolbarCallout(parent: HTMLElement, label: string) {
	const callout = parent.createDiv("bv-callout");
	renderCurveArrow(callout, {
		viewBox: "0 0 90 44",
		curve: "M88,40 C70,40 30,34 12,4",
		arrowhead: "L21,8 M12,4 L13,14",
	});
	callout.createSpan({ cls: "bv-callout-label", text: label });
}
