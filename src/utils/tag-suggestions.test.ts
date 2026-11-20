import { expect, test } from "bun:test";
import {
	indexVaultTags,
	tagSearchQuery,
	tagSuggestionRows,
} from "./tag-suggestions";

test("an empty query lists unique vault tags alphabetically in their original casing", () => {
	const tags = indexVaultTags(["#Zulu", "", "Café/Über", "#CAFÉ/über"]);
	expect(tagSuggestionRows("", tags)).toEqual(["#Café/Über", "#Zulu"]);
});

test("strips filter syntax for search and preserves exclusion on selection", () => {
	for (const draft of ["Caf", "#Caf", "-Caf", "  -#Caf"]) {
		expect(tagSearchQuery(draft)).toBe("Caf");
	}
	expect(tagSuggestionRows("-#caf", [{ name: "Café/Über" }])).toEqual([
		"-#Café/Über",
	]);
	expect(tagSuggestionRows("#urgent", [{ name: "urgent" }])).toEqual([
		"#urgent",
	]);
	expect(tagSuggestionRows("ugt", [])).toEqual([]);
});

test("offers the first ten ranked vault matches", () => {
	const tags = Array.from({ length: 14 }, (_, i) => ({ name: `tag${i}` }));
	const rows = tagSuggestionRows("ta", tags);
	expect(rows).toHaveLength(10);
	expect(rows[0]).toBe("#tag0");
	expect(rows[9]).toBe("#tag9");
});
