import type { ZodType } from 'zod'
import type { Resolver, FieldErrors, FieldValues } from 'react-hook-form'

export function createZodResolver<T extends FieldValues>(schema: ZodType<T>): Resolver<T> {
  return async (values) => {
    const result = schema.safeParse(values)
    if (result.success) {
      return {
        values: result.data,
        errors: {},
      }
    }

    const errors: Record<string, { type: string; message: string }> = {}
    for (const issue of result.error.issues) {
      const path = issue.path.join('.')
      if (!errors[path]) {
        errors[path] = {
          type: issue.code,
          message: issue.message,
        }
      }
    }

    return {
      values: {} as Record<string, never>,
      errors: errors as unknown as FieldErrors<T>,
    }
  }
}

