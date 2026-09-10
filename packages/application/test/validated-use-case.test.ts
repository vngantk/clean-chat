import { Type } from "@sinclair/typebox";
import { describe, expect, it } from "vitest";
import { INVALID_INPUT_ERROR } from "../src/input-validator.js";
import { createTypeBoxInputValidator } from "../src/typebox-input-validator.js";
import { createValidatedUseCase } from "../src/validated-use-case.js";

const schema = Type.Object(
  { n: Type.Number() },
  { additionalProperties: false },
);

describe("createValidatedUseCase", () => {
  it("passes values that match the schema", async () => {
    const useCase = createValidatedUseCase({
      validator: createTypeBoxInputValidator(),
      schema,
      useCase: { execute: async (input: { n: number }) => input.n },
    });
    await expect(useCase.execute({ n: 1 })).resolves.toBe(1);
  });

  it("rejects values that do not match", async () => {
    const useCase = createValidatedUseCase({
      validator: createTypeBoxInputValidator(),
      schema,
      useCase: { execute: async (input: { n: number }) => input.n },
    });
    await expect(
      useCase.execute({ n: 1, extra: true } as { n: number }),
    ).rejects.toThrow(INVALID_INPUT_ERROR);
  });

  it("skips the validator when no schema is given", async () => {
    const useCase = createValidatedUseCase({
      validator: createTypeBoxInputValidator(),
      useCase: { execute: async () => "ok" },
    });
    await expect(useCase.execute()).resolves.toBe("ok");
  });
});
