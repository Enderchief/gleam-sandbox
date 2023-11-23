import { z } from 'zod';

export const compileRequest = z.object({
  type: z.literal('compile'),
  files: z.record(z.string(), z.string()),
  dependencies: z.record(z.string(), z.string()).optional(),
  target: z
    .union([z.literal('javascript'), z.literal('erlang')])
    .default('javascript'),
});

export const bundleRequest = z.object({
  type: z.literal('bundle'),
  files: z.record(z.string(), z.string()),
});

export const request = z.discriminatedUnion('type', [
  compileRequest,
  bundleRequest,
]);

export const compilerResponse = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('compile'),
    result: z.union([
      z.object({ ok: z.record(z.string(), z.string()) }),
      z.object({ error: z.string() }),
    ]),
  }),
  z.object({
    type: z.literal('bundle'),
    result: z.string(),
  }),
]);
