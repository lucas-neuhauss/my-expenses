import { z } from "zod";

export function validateEmail(email: unknown): email is string {
	return z.string().email().safeParse(email).success;
}

export function validatePassword(password: unknown): password is string {
	return z.string().min(6).max(255).safeParse(password).success;
}
