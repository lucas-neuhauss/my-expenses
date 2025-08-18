import { Data } from "effect";

export class EntityNotFoundError extends Data.TaggedError("EntityNotFoundError")<{
	entity: string;
	id: number;
	where?: string[];
}> {}

export class ForbiddenError extends Data.TaggedError("ForbiddenError")<{}> {}
