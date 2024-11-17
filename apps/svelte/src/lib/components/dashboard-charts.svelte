<script lang="ts">
	import { onDestroy } from "svelte";
	import * as echarts from "echarts/core";
	import { PieChart } from "echarts/charts";
	import { TooltipComponent, TitleComponent } from "echarts/components";
	import { CanvasRenderer } from "echarts/renderers";
	import { getOptions, type PieChartDataItem } from "$lib/utils/charts";

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
			expensePieChart?.dispose();
			incomePieChart?.dispose();

			expensePieChart = echarts.init(
				document.getElementById("dashboard-expense-chart"),
				"dark",
			);
			incomePieChart = echarts.init(
				document.getElementById("dashboard-income-chart"),
				"dark",
			);
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
