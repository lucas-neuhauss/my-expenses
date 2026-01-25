<script lang="ts">
	import { getOptions, type PieChartDataItem } from "$lib/utils/charts";
	import { PieChart } from "echarts/charts";
	import { TitleComponent, TooltipComponent } from "echarts/components";
	import * as echarts from "echarts/core";
	import { CanvasRenderer } from "echarts/renderers";
	import { mode } from "mode-watcher";
	import * as z from "zod";

	let {
		charts,
		onCategoryClick,
	}: {
		charts: {
			expensePieChartData: PieChartDataItem[];
			incomePieChartData: PieChartDataItem[];
		};
		onCategoryClick: (categoryId: number) => void;
	} = $props();

	// Register the required components
	echarts.use([CanvasRenderer, PieChart, TooltipComponent, TitleComponent]);

	let expenseChartContainer: HTMLDivElement;
	let incomeChartContainer: HTMLDivElement;
	let expensePieChart: echarts.ECharts | undefined;
	let incomePieChart: echarts.ECharts | undefined;

	const onClickCategory = (params: { data: unknown }) => {
		const categoryId = z
			.object({ id: z.number().int() })
			.transform((v) => v.id)
			.parse(params.data);
		onCategoryClick(categoryId);
	};

	const initCharts = () => {
		const theme = mode.current;

		// Only initialize if containers exist and have dimensions
		if (
			expenseChartContainer &&
			incomeChartContainer &&
			expenseChartContainer.clientWidth > 0 &&
			incomeChartContainer.clientWidth > 0
		) {
			// Initialize expense chart
			if (!expensePieChart) {
				expensePieChart = echarts.init(expenseChartContainer, theme);
				expensePieChart.on("click", onClickCategory);
			}

			// Initialize income chart
			if (!incomePieChart) {
				incomePieChart = echarts.init(incomeChartContainer, theme);
				incomePieChart.on("click", onClickCategory);
			}

			// Update chart data
			expensePieChart.setOption(
				getOptions(charts.expensePieChartData, { name: "Expense" }),
			);
			incomePieChart.setOption(getOptions(charts.incomePieChartData, { name: "Income" }));
		}
	};

	// Initialize charts after DOM is ready and on theme/data changes
	$effect(() => {
		// Track dependencies
		const theme = mode.current;
		const data = charts;

		// Use setTimeout to ensure DOM is fully laid out
		const timeoutId = setTimeout(() => {
			initCharts();
		}, 0);

		return () => {
			clearTimeout(timeoutId);
			expensePieChart?.dispose();
			incomePieChart?.dispose();
			expensePieChart = undefined;
			incomePieChart = undefined;
		};
	});
</script>

<div
	id="dashboard-charts"
	class:hidden={charts.incomePieChartData.length === 0 &&
		charts.expensePieChartData.length === 0}
	class="mt-3 -mb-4 flex w-full flex-wrap items-center justify-center"
>
	<div bind:this={expenseChartContainer} class="h-[300px] w-[400px]"></div>

	<div bind:this={incomeChartContainer} class="h-[300px] w-[400px]"></div>
</div>
