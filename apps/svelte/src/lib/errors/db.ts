import { Data } from "effect";

export class EntityNotFoundError extends Data.TaggedError("EntityNotFoundError")<{
	entity: string;
	id: number;
	where?: string[];
}> {}
