// Mock category data for Storybook stories

export type MockCategory = {
	id: number;
	name: string;
	type: "expense" | "income";
	parentId: number | null;
	icon: string;
	unique: "transference_in" | "transference_out" | null;
};

export const mockExpenseCategories: MockCategory[] = [
	{
		id: 1001,
		name: "Food",
		type: "expense",
		parentId: null,
		icon: "cutlery.png",
		unique: null,
	},
	{
		id: 1002,
		name: "Groceries",
		type: "expense",
		parentId: 1001,
		icon: "apple.png",
		unique: null,
	},
	{
		id: 1003,
		name: "Restaurant",
		type: "expense",
		parentId: 1001,
		icon: "chef-hat.png",
		unique: null,
	},
	{
		id: 1004,
		name: "Transportation",
		type: "expense",
		parentId: null,
		icon: "car.png",
		unique: null,
	},
	{
		id: 1005,
		name: "Gas",
		type: "expense",
		parentId: 1004,
		icon: "gas-station.png",
		unique: null,
	},
	{
		id: 1006,
		name: "Public Transit",
		type: "expense",
		parentId: 1004,
		icon: "train.png",
		unique: null,
	},
	{
		id: 1007,
		name: "Entertainment",
		type: "expense",
		parentId: null,
		icon: "confetti.png",
		unique: null,
	},
];

export const mockIncomeCategories: MockCategory[] = [
	{
		id: 2001,
		name: "Salary",
		type: "income",
		parentId: null,
		icon: "cash-bill-dollar.png",
		unique: null,
	},
	{
		id: 2002,
		name: "Freelance",
		type: "income",
		parentId: null,
		icon: "briefcase.png",
		unique: null,
	},
	{
		id: 2003,
		name: "Investments",
		type: "income",
		parentId: null,
		icon: "charts.png",
		unique: null,
	},
	{
		id: 2004,
		name: "Dividends",
		type: "income",
		parentId: 2003,
		icon: "coin.png",
		unique: null,
	},
];

export const mockAllCategories: MockCategory[] = [
	...mockExpenseCategories,
	...mockIncomeCategories,
];

export const emptyCategories: MockCategory[] = [];
