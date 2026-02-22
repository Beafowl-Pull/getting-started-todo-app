import { z } from "zod";

export const RegisterSchema = z.object({
  name: z
    .string({ required_error: 'Field "name" is required' })
    .transform((val) => val.trim())
    .pipe(z.string().min(1, 'Field "name" must be a non-empty string')),
  email: z
    .string({ required_error: 'Field "email" is required' })
    .email('Field "email" must be a valid email address')
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string({ required_error: 'Field "password" is required' })
    .min(8, 'Field "password" must be at least 8 characters'),
});

export const LoginSchema = z.object({
  email: z
    .string({ required_error: 'Field "email" is required' })
    .email('Field "email" must be a valid email address')
    .transform((val) => val.toLowerCase().trim()),
  password: z.string({ required_error: 'Field "password" is required' }),
});

export const UpdateMeSchema = z
  .object({
    name: z
      .string()
      .transform((val) => val.trim())
      .pipe(z.string().min(1, 'Field "name" must be a non-empty string'))
      .optional(),
    email: z
      .string()
      .email('Field "email" must be a valid email address')
      .transform((val) => val.toLowerCase().trim())
      .optional(),
    newPassword: z
      .string()
      .min(8, 'Field "newPassword" must be at least 8 characters')
      .optional(),
    currentPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.email !== undefined || data.newPassword !== undefined) {
        return data.currentPassword !== undefined && data.currentPassword.length > 0;
      }
      return true;
    },
    {
      message: '"currentPassword" is required when changing email or password',
      path: ["currentPassword"],
    },
  );

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UpdateMeInput = z.infer<typeof UpdateMeSchema>;
