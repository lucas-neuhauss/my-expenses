<script lang="ts">
	import { CATEGORY_ICON_LIST } from "$lib/categories";
</script>

{#each CATEGORY_ICON_LIST as icon}
	<img src={`/images/category/${icon}`} alt="category icon" width="26" height="26" />
{/each}}
