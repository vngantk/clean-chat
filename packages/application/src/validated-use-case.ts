import type { TSchema } from "@sinclair/typebox";
import type { UseCase } from "@clean-chat/core/use-cases";
import type { InputValidator } from "./input-validator.js";

/**
 * Run {@link InputValidator.parse} on `Input` before `execute`.
 * Omit `schema` when Input is `void`. Preserves {@link UseCase.name}.
 */
export function createValidatedUseCase<Input, Output, Name extends string>(deps: {
  validator: InputValidator;
  schema?: TSchema;
  useCase: UseCase<Input, Output, Name>;
}): UseCase<Input, Output, Name> {
  const { validator, schema, useCase } = deps;
  if (schema === undefined) {
    return useCase;
  }
  return {
    name: useCase.name,
    async execute(input) {
      return useCase.execute(validator.parse(schema, input) as Input);
    },
  };
}
