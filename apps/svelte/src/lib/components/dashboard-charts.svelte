<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { getOptions, type PieChartDataItem } from "$lib/utils/charts";
	import { PieChart } from "echarts/charts";
	import { TitleComponent, TooltipComponent } from "echarts/components";
	import * as echarts from "echarts/core";
	import { CanvasRenderer } from "echarts/renderers";
	import { mode } from "mode-watcher";
	import { onDestroy } from "svelte";
	import { z } from "zod/v4";

	let {
		charts,
	}: {
		charts: {
			expensePieChartData: PieChartDataItem[];
			incomePieChartData: PieChartDataItem[];
		};
	} = $props();

	// Register the required components
	echarts.use([CanvasRenderer, PieChart, TooltipComponent, TitleComponent]);

	let previousMode = mode.current;
	let expensePieChart: echarts.ECharts;
	let incomePieChart: echarts.ECharts;

	const onClickCategory = (params: { data: unknown }) => {
		const categoryId = z
			.object({ id: z.number().int() })
			.transform((v) => String(v.id))
			.parse(params.data);
		const url = new URL(page.url.href);
		if (url.searchParams.get("category") === categoryId) {
			url.searchParams.delete("category");
		} else {
			url.searchParams.set("category", categoryId);
		}
		goto(url.href);
	};

	$effect(() => {
		if (previousMode !== mode.current) {
			// Set up expense pie chart
			expensePieChart?.dispose();
			expensePieChart = echarts.init(
				document.getElementById("dashboard-expense-chart"),
				mode.current,
			);
			expensePieChart.setOption(
				getOptions(charts.expensePieChartData, { name: "Expense" }),
			);
			expensePieChart.on("click", onClickCategory);

			// Set up income pie chart
			incomePieChart?.dispose();
			incomePieChart = echarts.init(
				document.getElementById("dashboard-income-chart"),
				mode.current,
			);
			incomePieChart.setOption(getOptions(charts.incomePieChartData, { name: "Income" }));
			incomePieChart.on("click", onClickCategory);
		}
		previousMode = mode.current;
	});

	$effect(() => {
		const theme = mode.current;
		if (!expensePieChart) {
			expensePieChart = echarts.init(
				document.getElementById("dashboard-expense-chart"),
				theme,
			);
		}
		if (!incomePieChart) {
			incomePieChart = echarts.init(
				document.getElementById("dashboard-income-chart"),
				theme,
			);
		}

		expensePieChart.setOption(
			getOptions(charts.expensePieChartData, { name: "Expense" }),
		);
		expensePieChart.on("click", onClickCategory);
		incomePieChart.setOption(getOptions(charts.incomePieChartData, { name: "Income" }));
		incomePieChart.on("click", onClickCategory);
	});

	onDestroy(() => {
		expensePieChart?.dispose();
		incomePieChart?.dispose();
	});
</script>

<div
	id="dashboard-charts"
	class:hidden={charts.incomePieChartData.length === 0 &&
		charts.expensePieChartData.length === 0}
	class="mt-3 -mb-4 flex w-full flex-wrap items-center justify-center"
>
	<div id="dashboard-expense-chart" class="h-[300px] w-[400px]"></div>

	<div id="dashboard-income-chart" class="h-[300px] w-[400px]"></div>
</div>
