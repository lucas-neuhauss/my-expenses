import { loadBackup } from "$lib/server/data/backup";
import { USER_ADMIN_ID } from "$lib/user.js";
import { error, fail, redirect } from "@sveltejs/kit";

export const load = async (event) => {
  if (!event.locals.user) {
    return redirect(302, "/login");
  }

  const userId = event.locals.user.id;
  if (userId !== USER_ADMIN_ID) {
    return fail(404);
  }

  return {};
};

export const actions = {
  "load-backup": async (event) => {
    const user = event.locals.user;
    if (!user || user.id !== USER_ADMIN_ID) {
      return error(401);
    }

    return loadBackup(user.id);
  },
}
