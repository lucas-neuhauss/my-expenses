import { dev } from "$app/environment";
import { AUTH_SECRET } from "$env/static/private";
import { jwtVerify, SignJWT } from "jose";

const secret = new TextEncoder().encode(AUTH_SECRET);
export const COOKIE_NAME = "session-token";

export interface SessionUser {
	id: string;
	email: string;
}

export interface Session {
	user: SessionUser;
	expires: string;
}

export async function createSessionToken(userId: string, email: string): Promise<string> {
	return new SignJWT({ id: userId, email })
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime("7d")
		.sign(secret);
}

export async function verifySessionToken(token: string): Promise<Session | null> {
	try {
		const { payload } = await jwtVerify(token, secret);
		if (!payload.id || !payload.email) {
			return null;
		}
		return {
			user: {
				id: payload.id as string,
				email: payload.email as string,
			},
			expires:
				payload.exp?.toString() ??
				new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
		};
	} catch {
		return null;
	}
}

export function getCookieOptions(): {
	path: "/";
	httpOnly: true;
	sameSite: "lax" | "strict";
	secure: boolean;
	maxAge: number;
} {
	return {
		path: "/",
		httpOnly: true,
		sameSite: dev ? ("lax" as const) : ("strict" as const),
		secure: !dev,
		maxAge: 60 * 60 * 24 * 7, // 7 days
	};
}

export async function getSessionFromCookies(cookies: {
	get: (name: string) => string | undefined;
}): Promise<Session | null> {
	const token = cookies.get(COOKIE_NAME);
	if (!token) return null;
	return verifySessionToken(token);
}
