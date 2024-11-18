export const load = async (event) => {
	if (!event.locals.user) {
		return { user: null };
	}

	return { user: event.locals.user };
};
