import { z } from "zod";

export const AddItemSchema = z.object({
  name: z
    .string({ required_error: 'Field "name" is required' })
    .transform((val) => val.trim())
    .pipe(z.string().min(1, 'Field "name" must be a non-empty string')),
});

export const UpdateItemSchema = z
  .object({
    name: z
      .string()
      .transform((val) => val.trim())
      .pipe(z.string().min(1, 'Field "name" must be a non-empty string'))
      .optional(),
    completed: z
      .boolean({ invalid_type_error: 'Field "completed" must be a boolean' })
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.completed !== undefined, {
    message: 'At least one field ("name" or "completed") must be provided',
  });

export type AddItemInput = z.infer<typeof AddItemSchema>;
export type UpdateItemInput = z.infer<typeof UpdateItemSchema>;
