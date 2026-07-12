import { PGlite } from '@electric-sql/pglite'
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite'
import * as schema from './schema'
import { migrate } from './migration'

let promise: Promise<{ client: PGlite; db: PgliteDatabase<typeof schema> }> | undefined

export function getDatabase() {
  if (!promise) {
    promise = (async () => {
      const client = new PGlite('idb://pwa-memo')
      await client.waitReady
      await migrate(client)
      await client.query(`DELETE FROM tasks WHERE deleted_at < now() - interval '30 days'`)
      await client.query(`DELETE FROM memos WHERE deleted_at < now() - interval '30 days'`)
      return { client, db: drizzle({ client, schema }) }
    })()
  }
  return promise
}
