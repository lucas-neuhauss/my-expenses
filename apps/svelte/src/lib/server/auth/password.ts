import { hash, verify } from "argon2";

export const hashPassword = async (password: string): Promise<string> => {
	return hash(password);
};

export const verifyPassword = async (
	hashedPassword: string,
	password: string,
): Promise<boolean> => {
	try {
		return verify(hashedPassword, password);
	} catch {
		return false;
	}
};
