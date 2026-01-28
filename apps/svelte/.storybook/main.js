import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
/** @type { import('@storybook/sveltekit').StorybookConfig } */
const config = {
	stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|ts|svelte)"],
	addons: [
        getAbsolutePath("@storybook/addon-svelte-csf"),
        getAbsolutePath("@storybook/addon-links"),
        getAbsolutePath("@storybook/addon-docs")
    ],
	framework: {
		name: getAbsolutePath("@storybook/sveltekit"),
		options: {},
	},
	staticDirs: ["../static"],
};
export default config;

function getAbsolutePath(value) {
    return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
