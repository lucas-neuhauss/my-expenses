<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";
	import { getOptions, type PieChartDataItem } from "$lib/utils/charts";
	import { PieChart } from "echarts/charts";
	import { TitleComponent, TooltipComponent } from "echarts/components";
	import * as echarts from "echarts/core";
	import { CanvasRenderer } from "echarts/renderers";
	import { mode } from "mode-watcher";
	import { onDestroy } from "svelte";
	import { get } from "svelte/store";
	import { z } from "zod";

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

	let previousMode = $mode;
	let expensePieChart: echarts.ECharts;
	let incomePieChart: echarts.ECharts;
	$effect(() => {
		if (previousMode !== $mode) {
			expensePieChart?.dispose();
			expensePieChart = echarts.init(
				document.getElementById("dashboard-expense-chart"),
				$mode,
			);
			expensePieChart.setOption(
				getOptions(charts.expensePieChartData, { name: "Expense" }),
			);
			expensePieChart.on("click", (params) => {
				console.log(params);
			});

			incomePieChart?.dispose();
			incomePieChart = echarts.init(
				document.getElementById("dashboard-income-chart"),
				$mode,
			);
			incomePieChart.setOption(getOptions(charts.incomePieChartData, { name: "Income" }));
		}
		previousMode = $mode;
	});

	$effect(() => {
		const theme = get(mode);
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
		expensePieChart.on("click", (params) => {
			const categoryId = z
				.object({ id: z.number().int() })
				.transform((v) => String(v.id))
				.parse(params.data);
			const url = new URL($page.url.href);
			url.searchParams.set("category", categoryId);
			goto(url.href);
		});
		incomePieChart.setOption(getOptions(charts.incomePieChartData, { name: "Income" }));
		incomePieChart.on("click", (params) => {
			const categoryId = z
				.object({ id: z.number().int() })
				.transform((v) => String(v.id))
				.parse(params.data);
			const url = new URL($page.url.href);
			url.searchParams.set("category", categoryId);
			goto(url.href);
		});
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
	class="-mb-4 mt-3 flex w-full items-center justify-center"
>
	<div id="dashboard-expense-chart" class="h-[300px] w-[400px]"></div>

	<div id="dashboard-income-chart" class="h-[300px] w-[400px]"></div>
</div>
