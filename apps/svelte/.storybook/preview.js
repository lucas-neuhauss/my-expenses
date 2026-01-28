import { initialize, mswLoader } from "msw-storybook-addon";
import "../src/app.css";

// Initialize MSW
initialize();

/** @type { import('@storybook/sveltekit').Preview } */
const preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
	},
	loaders: [mswLoader],
};

export default preview;
