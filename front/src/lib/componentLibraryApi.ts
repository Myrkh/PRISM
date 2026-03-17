import type { ComponentTemplate } from '@/core/types'
import type { BuiltinComponentSeed } from '@/features/library'
import { createBuiltinComponentTemplate } from '@/features/library'

interface LambdaDbLibraryResponse {
  version: string
  count: number
  templates: BuiltinComponentSeed[]
}

let lambdaDbTemplatesPromise: Promise<ComponentTemplate[]> | null = null

export async function fetchLambdaDbComponentTemplates(): Promise<ComponentTemplate[]> {
  if (!lambdaDbTemplatesPromise) {
    lambdaDbTemplatesPromise = fetch('/api/engine/library/components')
      .then(async response => {
        if (!response.ok) {
          throw new Error(`Lambda DB library failed: ${response.status} ${response.statusText}`)
        }
        const payload = await response.json() as LambdaDbLibraryResponse
        return (payload.templates ?? []).map(seed => createBuiltinComponentTemplate(seed))
      })
      .catch(error => {
        lambdaDbTemplatesPromise = null
        throw error
      })
  }

  return lambdaDbTemplatesPromise
}
