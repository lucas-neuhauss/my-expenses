<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { expect, fn, userEvent, waitFor, within } from "storybook/test";
	import CategoriesStoryWrapper from "./categories-story-wrapper.svelte";
	import { emptyCategories, mockAllCategories } from "../mocks/category-data";

	const { Story } = defineMeta({
		title: "Pages/Categories",
		component: CategoriesStoryWrapper,
		tags: ["autodocs"],
		parameters: {
			layout: "fullscreen",
		},
		argTypes: {
			onCreateCategory: { action: "createCategory" },
			onEditCategory: { action: "editCategory" },
			onDeleteCategory: { action: "deleteCategory" },
		},
	});
</script>

<!-- Default view with expense categories -->
<Story
	name="Default"
	args={{
		categories: mockAllCategories,
		isLoading: false,
		onCreateCategory: fn(),
		onEditCategory: fn(),
		onDeleteCategory: fn(),
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// Verify expense categories are visible
		await waitFor(() => {
			expect(canvas.getByText("Food")).toBeInTheDocument();
		});

		expect(canvas.getByText("Transportation")).toBeInTheDocument();
		expect(canvas.getByText("Entertainment")).toBeInTheDocument();

		// Verify subcategories are visible
		expect(canvas.getByText("Groceries")).toBeInTheDocument();
		expect(canvas.getByText("Restaurant")).toBeInTheDocument();

		// Verify Create Category button exists
		expect(canvas.getByText("Create Category")).toBeInTheDocument();

		// Verify expense tab is active
		const expenseTab = canvas.getByRole("tab", { name: "Expense" });
		expect(expenseTab).toHaveAttribute("data-state", "active");
	}}
/>

<!-- Income tab view -->
<Story
	name="IncomeTab"
	args={{
		categories: mockAllCategories,
		isLoading: false,
		onCreateCategory: fn(),
		onEditCategory: fn(),
		onDeleteCategory: fn(),
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// Switch to income tab
		const incomeTab = canvas.getByRole("tab", { name: "Income" });
		await userEvent.click(incomeTab);

		// Wait for tab to become active
		await waitFor(() => {
			expect(incomeTab).toHaveAttribute("data-state", "active");
		});

		// Verify income categories are visible
		await waitFor(() => {
			expect(canvas.getByText("Salary")).toBeInTheDocument();
		});
		expect(canvas.getByText("Freelance")).toBeInTheDocument();
		expect(canvas.getByText("Investments")).toBeInTheDocument();

		// Verify subcategory
		expect(canvas.getByText("Dividends")).toBeInTheDocument();

		// Verify expense categories are NOT visible
		expect(canvas.queryByText("Food")).not.toBeInTheDocument();
	}}
/>

<!-- Empty state -->
<Story
	name="Empty"
	args={{
		categories: emptyCategories,
		isLoading: false,
		onCreateCategory: fn(),
		onEditCategory: fn(),
		onDeleteCategory: fn(),
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// Verify empty state message
		await waitFor(() => {
			expect(canvas.getByTestId("empty-state")).toBeInTheDocument();
		});
		expect(canvas.getByText("No categories yet.")).toBeInTheDocument();

		// Verify Create Category button is still available
		expect(canvas.getByText("Create Category")).toBeInTheDocument();
	}}
/>

<!-- Loading state -->
<Story
	name="Loading"
	args={{
		categories: [],
		isLoading: true,
		onCreateCategory: fn(),
		onEditCategory: fn(),
		onDeleteCategory: fn(),
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// Loading skeleton should be visible
		// The skeleton doesn't have specific test IDs, but we can verify no category cards
		await waitFor(() => {
			expect(canvas.queryAllByTestId("category-card")).toHaveLength(0);
		});
	}}
/>

<!-- Create category flow -->
<Story
	name="CreateCategory"
	args={{
		categories: mockAllCategories,
		isLoading: false,
		onCreateCategory: fn(),
		onEditCategory: fn(),
		onDeleteCategory: fn(),
	}}
	play={async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		const body = within(canvasElement.ownerDocument.body);

		// Click Create Category button
		const createButton = canvas.getByText("Create Category");
		await userEvent.click(createButton);

		// Wait for dialog to open (dialog renders in a portal)
		await waitFor(() => {
			expect(body.getByRole("dialog")).toBeInTheDocument();
		});

		// Find the name input and fill it (inside portal)
		const nameInput = body.getByTestId("category-name-input");
		await userEvent.clear(nameInput);
		await userEvent.type(nameInput, "Test Category");

		// Click save button
		const saveButton = body.getByTestId("save-button");
		await userEvent.click(saveButton);

		// Verify callback was called
		await waitFor(() => {
			expect(args.onCreateCategory).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "Test Category",
					type: "expense",
				}),
			);
		});
	}}
/>

<!-- Edit category flow -->
<Story
	name="EditCategory"
	args={{
		categories: mockAllCategories,
		isLoading: false,
		onCreateCategory: fn(),
		onEditCategory: fn(),
		onDeleteCategory: fn(),
	}}
	play={async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		const body = within(canvasElement.ownerDocument.body);

		// Wait for categories to be visible
		await waitFor(() => {
			expect(canvas.getByText("Food")).toBeInTheDocument();
		});

		// Click edit button on first category
		const editButtons = canvas.getAllByTestId("edit-button");
		await userEvent.click(editButtons[0]);

		// Wait for dialog to open (dialog renders in a portal)
		await waitFor(() => {
			expect(body.getByRole("dialog")).toBeInTheDocument();
		});

		// Verify the name input has the category name pre-filled (inside portal)
		const nameInput = body.getByTestId("category-name-input");
		expect(nameInput).toHaveValue("Food");

		// Modify the name
		await userEvent.clear(nameInput);
		await userEvent.type(nameInput, "Updated Food");

		// Click save
		const saveButton = body.getByTestId("save-button");
		await userEvent.click(saveButton);

		// Verify callback was called with updated data
		await waitFor(() => {
			expect(args.onEditCategory).toHaveBeenCalledWith(
				1001, // Food category ID
				expect.objectContaining({
					name: "Updated Food",
				}),
			);
		});
	}}
/>

<!-- Delete category flow -->
<Story
	name="DeleteCategory"
	args={{
		categories: mockAllCategories,
		isLoading: false,
		onCreateCategory: fn(),
		onEditCategory: fn(),
		onDeleteCategory: fn(),
	}}
	play={async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		const body = within(canvasElement.ownerDocument.body);

		// Wait for categories to be visible
		await waitFor(() => {
			expect(canvas.getByText("Food")).toBeInTheDocument();
		});

		// Click delete button on first category
		const deleteButtons = canvas.getAllByTestId("delete-button");
		await userEvent.click(deleteButtons[0]);

		// Wait for confirmation dialog (AlertDialog renders in a portal)
		await waitFor(() => {
			expect(body.getByRole("alertdialog")).toBeInTheDocument();
		});

		// Verify the description mentions the category name
		expect(
			body.getByText(/Are you sure you want to delete the "Food" category\?/),
		).toBeInTheDocument();

		// Click Continue to confirm
		const continueButton = body.getByRole("button", { name: "Continue" });
		await userEvent.click(continueButton);

		// Verify callback was called
		await waitFor(() => {
			expect(args.onDeleteCategory).toHaveBeenCalledWith(1001);
		});
	}}
/>
