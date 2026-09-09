import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { expect, it } from 'vitest'

it('migrates legacy public centres without losing status, locales, arrays or evidence relationships', async () => {
  const payload = await getPayload({ config })
  const client = await payload.db.pool.connect()
  const schema = `m2_migration_${randomUUID().replaceAll('-', '')}`
  const legacy = await readFile('tests/fixtures/rescue-center-legacy.sql', 'utf8')
  const migration = await readFile('docs/migrations/M2-T13-rescue-center-drafts.sql', 'utf8')
  const isolated = (sql: string) => sql.replaceAll('"public".', `"${schema}".`)
  try {
    await client.query('BEGIN')
    await client.query(`CREATE SCHEMA "${schema}"`)
    await client.query(`SET LOCAL search_path TO "${schema}", public`)
    await client.query(isolated(legacy))
    await client.query(`
      INSERT INTO sources (id,url,type) VALUES (1,'https://centre.example','official');
      INSERT INTO rescue_centers (id,name,slug,country,status,address,verified_by_human_at)
      VALUES (1,'Legacy centre','legacy','Test','active','Old address','2026-09-01T00:00:00Z'),
        (2,'Unconfirmed','unconfirmed','Test','unconfirmed',null,null),
        (3,'Broken link','broken','Test','link_broken',null,null),
        (4,'Needs check','needs-check','Test','needs_check',null,null);
      INSERT INTO rescue_centers_locales (_locale,_parent_id,description)
      VALUES ('en',1,'{"text":"English description"}'), ('ru',1,'{"text":"Описание"}');
      INSERT INTO rescue_centers_social_links (_order,_parent_id,id,platform,url)
      VALUES (1,1,'social-row','facebook','https://example.com/centre');
      INSERT INTO rescue_centers_operating_languages ("order",parent_id,value) VALUES (1,1,'de');
      INSERT INTO rescue_centers_rels ("order",parent_id,path,sources_id) VALUES (1,1,'sources',1);
    `)
    await client.query(isolated(migration))
    const rows = await client.query(
      'SELECT status::text, _status::text FROM rescue_centers ORDER BY id',
    )
    expect(rows.rows).toEqual(
      ['active', 'unconfirmed', 'link_broken', 'needs_check'].map((status) => ({
        status,
        _status: 'published',
      })),
    )
    expect(
      (
        await client.query(
          "SELECT count(*)::int AS count FROM _rescue_centers_v WHERE latest AND version__status = 'published'",
        )
      ).rows[0].count,
    ).toBe(4)
    const version = (await client.query('SELECT * FROM _rescue_centers_v WHERE parent_id = 1'))
      .rows[0]
    expect(version.version_status).toBe('active')
    expect(version.version_address).toBe('Old address')
    expect(version.version_verified_by_human_at.toISOString()).toBe('2026-09-01T00:00:00.000Z')
    expect(
      (await client.query('SELECT count(*)::int AS count FROM _rescue_centers_v_locales')).rows[0]
        .count,
    ).toBe(2)
    expect(
      (
        await client.query(
          'SELECT _uuid, platform::text FROM _rescue_centers_v_version_social_links',
        )
      ).rows[0],
    ).toEqual({ _uuid: 'social-row', platform: 'facebook' })
    expect(
      (await client.query('SELECT value::text FROM _rescue_centers_v_version_operating_languages'))
        .rows[0].value,
    ).toBe('de')
    expect(
      (await client.query('SELECT sources_id FROM _rescue_centers_v_rels')).rows[0].sources_id,
    ).toBe(1)
  } finally {
    // The complete fixture and migration run inside one rolled-back, isolated schema transaction.
    await client.query('ROLLBACK')
    client.release()
    await payload.db.destroy?.()
  }
}, 120_000)
