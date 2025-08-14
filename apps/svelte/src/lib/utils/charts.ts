import { formatCurrency } from "$lib/currency";
import { GlobalError } from "$lib/global-errors";
import type { EChartsOption } from "echarts";
import type { PieDataItemOption } from "echarts/types/src/chart/pie/PieSeries.js";

export type PieChartDataItem = Omit<PieDataItemOption, "value"> & { value: number };

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
		formatter: (params) => {
			if (Array.isArray(params) || typeof params.value !== "number") {
				throw new GlobalError("INVALID_CHART_TOOLTIP_PARAMS");
			}
			return `
            ${params.marker} ${params.name} - <strong>${params.percent}%</strong><br />
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
