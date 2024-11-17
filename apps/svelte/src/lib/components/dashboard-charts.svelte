<script lang="ts">
	import { getOptions, type PieChartDataItem } from "$lib/utils/charts";
	import { PieChart } from "echarts/charts";
	import { TitleComponent, TooltipComponent } from "echarts/components";
	import * as echarts from "echarts/core";
	import { CanvasRenderer } from "echarts/renderers";
	import { mode } from "mode-watcher";
	import { onDestroy } from "svelte";

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

	let expensePieChart: echarts.ECharts;
	let incomePieChart: echarts.ECharts;
	$effect(() => {
		if (charts) {
			if (!expensePieChart) {
				expensePieChart = echarts.init(
					document.getElementById("dashboard-expense-chart"),
					$mode,
				);
			}
			if (!incomePieChart) {
				incomePieChart = echarts.init(
					document.getElementById("dashboard-income-chart"),
					$mode,
				);
			}

			expensePieChart.setOption(
				getOptions(charts.expensePieChartData, { name: "Expense" }),
			);
			incomePieChart.setOption(getOptions(charts.incomePieChartData, { name: "Income" }));
		}
	});

	onDestroy(() => {
		expensePieChart?.dispose();
		incomePieChart?.dispose();
	});
</script>

<div id="dashboard-charts" class="-mb-4 mt-3 flex w-full items-center justify-center">
	<div id="dashboard-expense-chart" class="h-[300px] w-[400px]"></div>
	<div id="dashboard-income-chart" class="h-[300px] w-[400px]"></div>
</div>
