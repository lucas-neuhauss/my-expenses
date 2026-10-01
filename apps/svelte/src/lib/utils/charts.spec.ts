import { describe, expect, it } from "vitest";
import { getOptions } from "./charts";

function tooltip(name: string) {
	const options = getOptions([{ id: 1, name, value: 1250 }], { name: "Expense" });
	const tooltip = options.tooltip;
	if (!tooltip || Array.isArray(tooltip) || typeof tooltip.formatter !== "function") {
		throw new Error("Expected a tooltip formatter");
	}
	return tooltip.formatter(
		{
			componentType: "series",
			componentSubType: "pie",
			componentIndex: 0,
			seriesType: "pie",
			seriesIndex: 0,
			name,
			dataIndex: 0,
			data: { name, value: 1250 },
			value: 1250,
			percent: 50,
			marker: '<span class="trusted-chart-marker"></span>',
			$vars: [],
		},
		"ticket",
		() => {},
	);
}

describe("chart tooltip", () => {
	it("escapes user-controlled category names instead of producing executable markup", () => {
		const html = tooltip('<img src=x onerror="alert(1)">');
		expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
		expect(html).not.toContain("<img");
	});
	it("escapes ampersands, angle brackets and both quote types", () => {
		expect(tooltip("Food & <Drink> \"quoted\" 'single'")).toContain(
			"Food &amp; &lt;Drink&gt; &quot;quoted&quot; &#39;single&#39;",
		);
	});
	it("preserves trusted chart markup and currency formatting", () => {
		const html = tooltip("Food");
		expect(html).toContain('<span class="trusted-chart-marker"></span>');
		expect(html).toContain("Food - <strong>50%</strong><br />");
		expect(html).toContain("R$\u00a012,50");
	});
});
