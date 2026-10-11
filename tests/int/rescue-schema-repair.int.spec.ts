import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { Client } from 'pg'
import { beforeAll, describe, expect, it } from 'vitest'

const rescueTables = [
  'rescue_centers',
  'rescue_centers_locales',
  'rescue_centers_social_links',
  'rescue_centers_operating_languages',
  'rescue_centers_rels',
  '_rescue_centers_v',
  '_rescue_centers_v_locales',
  '_rescue_centers_v_version_social_links',
  '_rescue_centers_v_version_operating_languages',
  '_rescue_centers_v_rels',
  'sources',
] as const
let legacyFixture: string
let partialFixture: string
let migration: string
let connectionString: string

beforeAll(async () => {
  // This DDL rehearsal never falls back to the development database.
  const testURI = process.env.DATABASE_URI_TEST
  if (!testURI) throw new Error('M2-T16 tests require an explicit DATABASE_URI_TEST copy')
  connectionString = testURI
  ;[legacyFixture, partialFixture, migration] = await Promise.all([
    readFile('tests/fixtures/rescue-center-legacy.sql', 'utf8'),
    readFile('tests/fixtures/rescue-center-partial-drafts.sql', 'utf8'),
    readFile('docs/migrations/M2-T16-rescue-center-schema-repair.sql', 'utf8'),
  ])
}, 120_000)

async function withPartialSchema(
  run: (client: Client, repair: () => Promise<void>, schema: string) => Promise<void>,
) {
  const client = new Client({ connectionString, connectionTimeoutMillis: 30_000 })
  const schema = 'm2_repair_' + randomUUID().replaceAll('-', '')
  const isolated = (sql: string) => sql.replaceAll('"public"', '"' + schema + '"')
  // Remove only the migration runner's transaction boundaries. The entire
  // fixture and the unmodified DO block run inside an outer rolled-back transaction.
  const repairSQL = isolated(migration)
    .replace(/^\s*BEGIN;\s*$/gm, '')
    .replace(/^\s*COMMIT;\s*$/gm, '')
  await client.connect()
  try {
    await client.query('BEGIN')
    await client.query('CREATE SCHEMA "' + schema + '"')
    await client.query('SET LOCAL search_path TO "' + schema + '", public')
    await client.query(isolated(legacyFixture))
    await client.query(isolated(partialFixture))
    await run(
      client,
      async () => {
        await client.query(repairSQL)
      },
      schema,
    )
  } finally {
    await client.query('ROLLBACK')
    await client.end()
  }
}

async function dataSnapshot(client: Client) {
  const result: Record<string, unknown> = {}
  for (const table of rescueTables) {
    result[table] = (await client.query('SELECT * FROM "' + table + '" ORDER BY id')).rows
  }
  return result
}

async function schemaSnapshot(client: Client, schema: string) {
  const columns = await client.query(
    'SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default ' +
      'FROM information_schema.columns WHERE table_schema = $1 ORDER BY table_name, ordinal_position',
    [schema],
  )
  const enums = await client.query(
    'SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace ' +
      'JOIN pg_enum e ON e.enumtypid = t.oid WHERE n.nspname = $1 ORDER BY t.typname, e.enumsortorder',
    [schema],
  )
  const constraints = await client.query(
    'SELECT c.relname, con.conname, pg_get_constraintdef(con.oid) AS definition ' +
      'FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid ' +
      'JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = $1 ORDER BY c.relname, con.conname',
    [schema],
  )
  const indexes = await client.query(
    'SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = $1 ORDER BY tablename, indexname',
    [schema],
  )
  return {
    columns: columns.rows,
    enums: enums.rows,
    constraints: constraints.rows,
    indexes: indexes.rows,
  }
}

async function expectRollback(
  client: Client,
  repair: () => Promise<void>,
  schema: string,
  message: RegExp,
) {
  const beforeSchema = await schemaSnapshot(client, schema)
  const beforeData = await dataSnapshot(client)
  await client.query('SAVEPOINT repair_attempt')
  await expect(repair()).rejects.toThrow(message)
  // DDL failure aborts the transaction. Restoring the savepoint demonstrates
  // that the full catalog and all stored rescue records are unchanged.
  await client.query('ROLLBACK TO SAVEPOINT repair_attempt')
  expect(await schemaSnapshot(client, schema)).toEqual(beforeSchema)
  expect(await dataSnapshot(client)).toEqual(beforeData)
}

describe('M2-T16 partial rescue-centers schema repair', () => {
  it('repairs an empty partial state and permits incomplete drafts with a draft default', async () => {
    await withPartialSchema(async (client, repair, schema) => {
      await repair()
      const columns = await client.query(
        'SELECT column_name, udt_name, is_nullable, column_default FROM information_schema.columns ' +
          "WHERE table_schema = $1 AND table_name = 'rescue_centers' " +
          "AND column_name IN ('name','slug','country','status','_status') ORDER BY column_name",
        [schema],
      )
      expect(columns.rows).toHaveLength(5)
      expect(columns.rows.every((column) => column.is_nullable === 'YES')).toBe(true)
      expect(columns.rows.find((column) => column.column_name === 'status')?.udt_name).toBe(
        'rescue_center_operating_status',
      )
      expect(columns.rows.find((column) => column.column_name === '_status')?.udt_name).toBe(
        'enum_rescue_centers_status',
      )
      const foreignKeys = await client.query(
        'SELECT count(*)::int AS count FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid ' +
          'JOIN pg_namespace n ON n.oid = c.relnamespace ' +
          "WHERE n.nspname = $1 AND con.contype = 'f' AND c.relname LIKE '_rescue_centers_v%'",
        [schema],
      )
      expect(foreignKeys.rows[0].count).toBe(6)
      const indexes = await client.query(
        'SELECT count(*)::int AS count FROM pg_indexes WHERE schemaname = $1 ' +
          "AND (tablename LIKE '_rescue_centers_v%' OR indexname = 'rescue_centers__status_idx') " +
          "AND indexname NOT LIKE '%_pkey'",
        [schema],
      )
      expect(indexes.rows[0].count).toBe(20)
      await client.query('INSERT INTO rescue_centers (id) VALUES (1)')
      expect(
        (await client.query('SELECT status::text, _status::text FROM rescue_centers')).rows,
      ).toEqual([{ status: 'needs_check', _status: 'draft' }])
      await client.query(
        "INSERT INTO rescue_centers_social_links (_order,_parent_id,id) VALUES (1,1,'incomplete-social')",
      )
      expect(
        (await client.query('SELECT platform, url FROM rescue_centers_social_links')).rows,
      ).toEqual([{ platform: null, url: null }])
      await expect(
        client.query('INSERT INTO _rescue_centers_v (parent_id) VALUES (999)'),
      ).rejects.toThrow(/foreign key constraint/)
    })
  }, 120_000)

  it('is a no-op after repair preserving publication, translations, arrays, evidence and version history', async () => {
    await withPartialSchema(async (client, repair, schema) => {
      await repair()
      await client.query(
        [
          "INSERT INTO sources (id,url,type) VALUES (1,'https://centre.example','official')",
          'INSERT INTO rescue_centers (id,name,slug,country,status,_status) VALUES ' +
            "(1,'Draft centre','draft-centre','Test','needs_check','draft'), (2,'Published centre','published-centre','Test','active','published')",
          "INSERT INTO rescue_centers_social_links (_order,_parent_id,id,platform,url) VALUES (1,2,'social-1','facebook','https://example.com/centre')",
          'INSERT INTO rescue_centers_operating_languages ("order",parent_id,value) VALUES (1,2,\'de\')',
          'INSERT INTO rescue_centers_rels ("order",parent_id,path,sources_id) VALUES (1,2,\'sources\',1)',
          'INSERT INTO _rescue_centers_v (id,parent_id,version_name,version_status,version__status,latest) VALUES ' +
            "(10,2,'Published centre','active','published',false), (11,2,'Draft revision','needs_check','draft',true)",
          'INSERT INTO _rescue_centers_v_version_social_links (_order,_parent_id,platform,url,_uuid) ' +
            "VALUES (1,10,'facebook','https://example.com/centre','social-1')",
          'INSERT INTO _rescue_centers_v_version_operating_languages ("order",parent_id,value) VALUES (1,10,\'de\')',
          'INSERT INTO _rescue_centers_v_rels ("order",parent_id,path,sources_id) VALUES (1,10,\'sources\',1)',
        ].join(';'),
      )
      await client.query(
        "INSERT INTO rescue_centers_locales (_locale,_parent_id,description) VALUES ('en',2,$1),('ru',2,$2)",
        [{ text: 'English' }, { text: 'Русский' }],
      )
      await client.query(
        "INSERT INTO _rescue_centers_v_locales (_locale,_parent_id,version_description) VALUES ('en',10,$1),('ru',11,$2)",
        [{ text: 'Published English' }, { text: 'Черновик' }],
      )
      const beforeSchema = await schemaSnapshot(client, schema)
      const beforeData = await dataSnapshot(client)
      await repair()
      expect(await schemaSnapshot(client, schema)).toEqual(beforeSchema)
      expect(await dataSnapshot(client)).toEqual(beforeData)
    })
  }, 120_000)

  it('refuses a partial schema containing a centre instead of inventing publication or history', async () => {
    await withPartialSchema(async (client, repair, schema) => {
      await client.query(
        "INSERT INTO rescue_centers (name,slug,country) VALUES ('Existing','existing','Test')",
      )
      await expectRollback(client, repair, schema, /M2-T16: partial schema contains data/)
    })
  }, 120_000)

  it('refuses orphaned version children even when main and version tables are empty', async () => {
    await withPartialSchema(async (client, repair, schema) => {
      await client.query(
        "INSERT INTO _rescue_centers_v_locales (_locale,_parent_id) VALUES ('en',999)",
      )
      await expectRollback(client, repair, schema, /M2-T16: partial schema contains data/)
    })
  }, 120_000)

  it('rejects unexpected operating enum labels without changing the schema', async () => {
    await withPartialSchema(async (client, repair, schema) => {
      await client.query("ALTER TYPE rescue_center_operating_status ADD VALUE 'unexpected'")
      await expectRollback(client, repair, schema, /M2-T16: unexpected enum/)
    })
  }, 120_000)

  it('does not cascade away an external dependency on the legacy status enum', async () => {
    await withPartialSchema(async (client, repair, schema) => {
      await client.query('CREATE TABLE unrelated_status (status enum_rescue_centers_status)')
      await expectRollback(client, repair, schema, /M2-T16:|cannot drop type/)
      expect(
        (await client.query("SELECT to_regclass('unrelated_status') AS table_name")).rows[0]
          .table_name,
      ).toBe('unrelated_status')
    })
  }, 120_000)

  it('rejects a same-name foreign key with a different delete action', async () => {
    await withPartialSchema(async (client, repair, schema) => {
      await client.query(
        'ALTER TABLE _rescue_centers_v ADD CONSTRAINT _rescue_centers_v_parent_id_rescue_centers_id_fk ' +
          'FOREIGN KEY (parent_id) REFERENCES rescue_centers(id) ON DELETE CASCADE',
      )
      await expectRollback(client, repair, schema, /M2-T16: unexpected foreign key/)
    })
  }, 120_000)

  it('rejects a same-name index covering the wrong column', async () => {
    await withPartialSchema(async (client, repair, schema) => {
      await client.query(
        'CREATE INDEX _rescue_centers_v_latest_idx ON _rescue_centers_v (parent_id)',
      )
      await expectRollback(client, repair, schema, /M2-T16: unexpected index/)
    })
  }, 120_000)
  it('rejects a same-name unique index with different NULL semantics', async () => {
    await withPartialSchema(async (client, repair, schema) => {
      await client.query('DROP INDEX rescue_centers_slug_idx')
      await client.query(
        'CREATE UNIQUE INDEX rescue_centers_slug_idx ON rescue_centers (slug) NULLS NOT DISTINCT',
      )
      await expectRollback(client, repair, schema, /M2-T16: unexpected index/)
    })
  }, 120_000)
})
