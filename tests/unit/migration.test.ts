import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { migrate } from '../../app/db/migration'

/**
 * DB統合テストの詳細設計:
 * Zodを通らないインポートや実装ミスがあっても、最後の防衛線としてDB制約が働く必要がある。
 * ブラウザと同じPGliteエンジンをインメモリで起動し、PostgreSQL互換制約を直接確認する。
 */
describe('initial migration', () => {
  let db: PGlite
  beforeEach(async () => {
    db = new PGlite()
    await db.waitReady
    await migrate(db)
  })
  afterEach(async () => {
    await db.close()
  })

  it('再実行しても失敗せず、マイグレーション履歴は1件だけ残る', async () => {
    await migrate(db)
    const result = await db.query<{ count: number }>(
      'select count(*)::int as count from schema_migrations where version=1',
    )
    expect(result.rows[0]?.count).toBe(1)
  })

  it('定義外のタスク状態をCHECK制約で拒否する', async () => {
    await expect(
      db.query(`insert into tasks(id,title,status,created_at,updated_at) values($1,'x','invalid',now(),now())`, [
        crypto.randomUUID(),
      ]),
    ).rejects.toThrow()
  })

  it('同一タグ名の正規化値を一意制約で拒否する', async () => {
    await db.query(
      `insert into tags(id,name,normalized_name,color,created_at,updated_at) values($1,'仕事','仕事','emerald',now(),now())`,
      [crypto.randomUUID()],
    )
    await expect(
      db.query(
        `insert into tags(id,name,normalized_name,color,created_at,updated_at) values($1,'仕事','仕事','blue',now(),now())`,
        [crypto.randomUUID()],
      ),
    ).rejects.toThrow()
  })

  it('同じ系列・同じ予定回の重複生成を一意索引で拒否する', async () => {
    const series = crypto.randomUUID()
    const occurrence = '2026-08-01T00:00:00Z'
    await db.query(
      `insert into tasks(id,series_id,title,status,scheduled_occurrence_at,created_at,updated_at) values($1,$2,'a','todo',$3,now(),now())`,
      [crypto.randomUUID(), series, occurrence],
    )
    await expect(
      db.query(
        `insert into tasks(id,series_id,title,status,scheduled_occurrence_at,created_at,updated_at) values($1,$2,'b','todo',$3,now(),now())`,
        [crypto.randomUUID(), series, occurrence],
      ),
    ).rejects.toThrow()
  })

  it('添付の所有者がタスク・メモの両方またはどちらでもない状態を拒否する', async () => {
    await expect(
      db.query(
        `insert into attachments(id,owner_type,file_name,mime_type,byte_size,width,height,sort_order,data,created_at) values($1,'task','x.webp','image/webp',1,1,1,0,$2,now())`,
        [crypto.randomUUID(), new Uint8Array([1])],
      ),
    ).rejects.toThrow()
  })
})
