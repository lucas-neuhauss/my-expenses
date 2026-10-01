import { formatCurrency } from "$lib/currency";
import { GlobalError } from "$lib/global-errors";
import type { EChartsOption } from "echarts";
import type { PieDataItemOption } from "echarts/types/src/chart/pie/PieSeries.js";

export type PieChartDataItem = Omit<PieDataItemOption, "value"> & { value: number };

const HTML_ENTITIES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

function escapeHtml(text: string): string {
	return text.replace(/[&<>"']/g, (character) => HTML_ENTITIES[character]);
}

export const getOptions = (
	data: PieChartDataItem[],
	{
		name,
	}: {
		name: string;
	},
): EChartsOption => ({
	title: {
		text: name,
		left: "center",
	},
	tooltip: {
		trigger: "item",
		className: "dashboard-chart-tooltip",
		formatter: (params) => {
			if (Array.isArray(params) || typeof params.value !== "number") {
				throw new GlobalError("INVALID_CHART_TOOLTIP_PARAMS");
			}
			return `
            ${params.marker} ${escapeHtml(params.name)} - <strong>${params.percent}%</strong><br />
            ${formatCurrency(params.value)}
          `;
		},
	},
	backgroundColor: "transparent",
	series: [
		{
			name,
			type: "pie",
			radius: "50%",
			data: data,
			emphasis: {
				itemStyle: {
					shadowBlur: 10,
					shadowOffsetX: 0,
					shadowColor: "rgba(0, 0, 0, 0.5)",
				},
			},
		},
	],
});
