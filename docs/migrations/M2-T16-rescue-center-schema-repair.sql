-- M2-T16: repair ONLY the empty partial rescue-centres schema observed on 2026-10-11.
-- This is not the pre-drafts M2-T13 upgrade, a baseline migration, or a publication operation.
-- Stop application writes, take a reviewed backup, and test on a restored copy first.
-- Execute with: psql "$DATABASE_URI" --set ON_ERROR_STOP=1 --file <this-file>
-- The file owns its transaction; do not wrap it in psql --single-transaction.
-- A complete repaired schema is verified without changing data, even when it is no longer empty.
-- Unknown schemas, nonempty partial schemas, wrong named objects, and external enum dependencies fail.
-- There is no destructive down migration: after COMMIT, restore the reviewed backup to roll back.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
SET LOCAL search_path TO "public", pg_catalog;

DO $repair$
DECLARE
  target_schema text := current_schema();
  target_namespace oid;
  repaired boolean;
  did_repair boolean := false;
  phase integer;
  specification jsonb;
  column_specification jsonb;
  table_name text;
  column_name text;
  type_name text;
  expected_type text;
  expected_default text;
  expected_not_null boolean;
  table_oid oid;
  sequence_oid oid;
  enum_oid oid;
  enum_values text[];
  expected_values text[];
  expected_columns smallint[];
  expected_reference_columns smallint[];
  expected_collations oid[];
  reference_oid oid;
  object_oid oid;
  row_present boolean;
  actual_count integer;
  expected_count integer;
  attribute_record record;
  object_record record;
  quoted_columns text;
  -- Column tuples: name, SQL type (or enum:name), NOT NULL, default kind,
  -- nullable relaxation allowed in the partial schema, repaired-only column.
  table_specifications constant jsonb := $json$
  [
    {"table":"rescue_centers","columns":[
      ["id","integer",true,"serial",false],
      ["name","character varying",false,null,true],
      ["slug","character varying",false,null,true],
      ["country","character varying",false,null,true],
      ["region","character varying",false,null,false],
      ["website","character varying",false,null,false],
      ["email","character varying",false,null,false],
      ["phone","character varying",false,null,false],
      ["address","character varying",false,null,false],
      ["location","geometry(Point)",false,null,false],
      ["status","enum:main-status",false,"needs_check",true],
      ["verification_score","numeric",false,null,false],
      ["last_checked_at","timestamp(3) with time zone",false,null,false],
      ["verified_by_agent_at","timestamp(3) with time zone",false,null,false],
      ["verified_by_human_at","timestamp(3) with time zone",false,null,false],
      ["updated_at","timestamp(3) with time zone",true,"now",false],
      ["created_at","timestamp(3) with time zone",true,"now",false],
      ["_status","enum:enum_rescue_centers_status",false,"draft",false,true]
    ]},
    {"table":"rescue_centers_social_links","columns":[
      ["_order","integer",true,null,false],
      ["_parent_id","integer",true,null,false],
      ["id","character varying",true,null,false],
      ["platform","enum:enum_rescue_centers_social_links_platform",false,null,true],
      ["url","character varying",false,null,true]
    ]},
    {"table":"rescue_centers_operating_languages","columns":[
      ["order","integer",true,null,false],
      ["parent_id","integer",true,null,false],
      ["value","enum:enum_rescue_centers_operating_languages",false,null,false],
      ["id","integer",true,"serial",false]
    ]},
    {"table":"rescue_centers_locales","columns":[
      ["description","jsonb",false,null,false],
      ["id","integer",true,"serial",false],
      ["_locale","enum:_locales",true,null,false],
      ["_parent_id","integer",true,null,false]
    ]},
    {"table":"rescue_centers_rels","columns":[
      ["id","integer",true,"serial",false],
      ["order","integer",false,null,false],
      ["parent_id","integer",true,null,false],
      ["path","character varying",true,null,false],
      ["sources_id","integer",false,null,false]
    ]},
    {"table":"_rescue_centers_v","columns":[
      ["id","integer",true,"serial",false],
      ["parent_id","integer",false,null,false],
      ["version_name","character varying",false,null,false],
      ["version_slug","character varying",false,null,false],
      ["version_country","character varying",false,null,false],
      ["version_region","character varying",false,null,false],
      ["version_website","character varying",false,null,false],
      ["version_email","character varying",false,null,false],
      ["version_phone","character varying",false,null,false],
      ["version_address","character varying",false,null,false],
      ["version_location","geometry(Point)",false,null,false],
      ["version_status","enum:rescue_center_operating_status",false,"needs_check",false],
      ["version_verification_score","numeric",false,null,false],
      ["version_last_checked_at","timestamp(3) with time zone",false,null,false],
      ["version_verified_by_agent_at","timestamp(3) with time zone",false,null,false],
      ["version_verified_by_human_at","timestamp(3) with time zone",false,null,false],
      ["version_updated_at","timestamp(3) with time zone",false,null,false],
      ["version_created_at","timestamp(3) with time zone",false,null,false],
      ["version__status","enum:enum__rescue_centers_v_version_status",false,"draft",false],
      ["created_at","timestamp(3) with time zone",true,"now",false],
      ["updated_at","timestamp(3) with time zone",true,"now",false],
      ["snapshot","boolean",false,null,false],
      ["published_locale","enum:enum__rescue_centers_v_published_locale",false,null,false],
      ["latest","boolean",false,null,false]
    ]},
    {"table":"_rescue_centers_v_version_social_links","columns":[
      ["_order","integer",true,null,false],
      ["_parent_id","integer",true,null,false],
      ["id","integer",true,"serial",false],
      ["platform","enum:enum__rescue_centers_v_version_social_links_platform",false,null,false],
      ["url","character varying",false,null,false],
      ["_uuid","character varying",false,null,false]
    ]},
    {"table":"_rescue_centers_v_version_operating_languages","columns":[
      ["order","integer",true,null,false],
      ["parent_id","integer",true,null,false],
      ["value","enum:enum__rescue_centers_v_version_operating_languages",false,null,false],
      ["id","integer",true,"serial",false]
    ]},
    {"table":"_rescue_centers_v_locales","columns":[
      ["version_description","jsonb",false,null,false],
      ["id","integer",true,"serial",false],
      ["_locale","enum:_locales",true,null,false],
      ["_parent_id","integer",true,null,false]
    ]},
    {"table":"_rescue_centers_v_rels","columns":[
      ["id","integer",true,"serial",false],
      ["order","integer",false,null,false],
      ["parent_id","integer",true,null,false],
      ["path","character varying",true,null,false],
      ["sources_id","integer",false,null,false]
    ]}
  ]
  $json$::jsonb;
  enum_specifications constant jsonb := $json$
  [
    ["rescue_center_operating_status",["active","unconfirmed","link_broken","needs_check"]],
    ["enum_rescue_centers_social_links_platform",["instagram","facebook","tiktok","linkedin","youtube","vk","telegram","x","other"]],
    ["enum_rescue_centers_operating_languages",["ru","en","de","other"]],
    ["enum__rescue_centers_v_version_social_links_platform",["instagram","facebook","tiktok","linkedin","youtube","vk","telegram","x","other"]],
    ["enum__rescue_centers_v_version_operating_languages",["ru","en","de","other"]],
    ["enum__rescue_centers_v_version_status",["draft","published"]],
    ["enum__rescue_centers_v_published_locale",["ru","en"]],
    ["_locales",["ru","en"]]
  ]
  $json$::jsonb;
  -- Foreign-key tuples: table, name, column, referenced table, column, delete action.
  foreign_key_specifications constant jsonb := $json$
  [
    ["rescue_centers_social_links","rescue_centers_social_links_parent_id_fk","_parent_id","rescue_centers","id","cascade"],
    ["rescue_centers_operating_languages","rescue_centers_operating_languages_parent_fk","parent_id","rescue_centers","id","cascade"],
    ["rescue_centers_locales","rescue_centers_locales_parent_id_fk","_parent_id","rescue_centers","id","cascade"],
    ["rescue_centers_rels","rescue_centers_rels_parent_fk","parent_id","rescue_centers","id","cascade"],
    ["rescue_centers_rels","rescue_centers_rels_sources_fk","sources_id","sources","id","cascade"],
    ["_rescue_centers_v","_rescue_centers_v_parent_id_rescue_centers_id_fk","parent_id","rescue_centers","id","set null"],
    ["_rescue_centers_v_version_social_links","_rescue_centers_v_version_social_links_parent_id_fk","_parent_id","_rescue_centers_v","id","cascade"],
    ["_rescue_centers_v_version_operating_languages","_rescue_centers_v_version_operating_languages_parent_fk","parent_id","_rescue_centers_v","id","cascade"],
    ["_rescue_centers_v_locales","_rescue_centers_v_locales_parent_id_fk","_parent_id","_rescue_centers_v","id","cascade"],
    ["_rescue_centers_v_rels","_rescue_centers_v_rels_parent_fk","parent_id","_rescue_centers_v","id","cascade"],
    ["_rescue_centers_v_rels","_rescue_centers_v_rels_sources_fk","sources_id","sources","id","cascade"]
  ]
  $json$::jsonb;
  -- Index tuples: table, name, ordered key columns, unique.
  index_specifications constant jsonb := $json$
  [
    ["rescue_centers","rescue_centers_slug_idx",["slug"],true],
    ["rescue_centers","rescue_centers_updated_at_idx",["updated_at"],false],
    ["rescue_centers","rescue_centers_created_at_idx",["created_at"],false],
    ["rescue_centers","rescue_centers__status_idx",["_status"],false],
    ["rescue_centers_social_links","rescue_centers_social_links_order_idx",["_order"],false],
    ["rescue_centers_social_links","rescue_centers_social_links_parent_id_idx",["_parent_id"],false],
    ["rescue_centers_operating_languages","rescue_centers_operating_languages_order_idx",["order"],false],
    ["rescue_centers_operating_languages","rescue_centers_operating_languages_parent_idx",["parent_id"],false],
    ["rescue_centers_locales","rescue_centers_locales_locale_parent_id_unique",["_locale","_parent_id"],true],
    ["rescue_centers_rels","rescue_centers_rels_order_idx",["order"],false],
    ["rescue_centers_rels","rescue_centers_rels_parent_idx",["parent_id"],false],
    ["rescue_centers_rels","rescue_centers_rels_path_idx",["path"],false],
    ["rescue_centers_rels","rescue_centers_rels_sources_id_idx",["sources_id"],false],
    ["_rescue_centers_v","_rescue_centers_v_parent_idx",["parent_id"],false],
    ["_rescue_centers_v","_rescue_centers_v_version_version_slug_idx",["version_slug"],false],
    ["_rescue_centers_v","_rescue_centers_v_version_version_updated_at_idx",["version_updated_at"],false],
    ["_rescue_centers_v","_rescue_centers_v_version_version_created_at_idx",["version_created_at"],false],
    ["_rescue_centers_v","_rescue_centers_v_version_version__status_idx",["version__status"],false],
    ["_rescue_centers_v","_rescue_centers_v_created_at_idx",["created_at"],false],
    ["_rescue_centers_v","_rescue_centers_v_updated_at_idx",["updated_at"],false],
    ["_rescue_centers_v","_rescue_centers_v_snapshot_idx",["snapshot"],false],
    ["_rescue_centers_v","_rescue_centers_v_published_locale_idx",["published_locale"],false],
    ["_rescue_centers_v","_rescue_centers_v_latest_idx",["latest"],false],
    ["_rescue_centers_v_version_social_links","_rescue_centers_v_version_social_links_order_idx",["_order"],false],
    ["_rescue_centers_v_version_social_links","_rescue_centers_v_version_social_links_parent_id_idx",["_parent_id"],false],
    ["_rescue_centers_v_version_operating_languages","_rescue_centers_v_version_operating_languages_order_idx",["order"],false],
    ["_rescue_centers_v_version_operating_languages","_rescue_centers_v_version_operating_languages_parent_idx",["parent_id"],false],
    ["_rescue_centers_v_locales","_rescue_centers_v_locales_locale_parent_id_unique",["_locale","_parent_id"],true],
    ["_rescue_centers_v_rels","_rescue_centers_v_rels_order_idx",["order"],false],
    ["_rescue_centers_v_rels","_rescue_centers_v_rels_parent_idx",["parent_id"],false],
    ["_rescue_centers_v_rels","_rescue_centers_v_rels_path_idx",["path"],false],
    ["_rescue_centers_v_rels","_rescue_centers_v_rels_sources_id_idx",["sources_id"],false]
  ]
  $json$::jsonb;
BEGIN
  SELECT oid INTO target_namespace FROM pg_namespace WHERE nspname = target_schema;
  IF target_namespace IS NULL THEN
    RAISE EXCEPTION 'M2-T16: target schema is missing';
  END IF;

  -- Deterministic locks close the race between the empty-table check and DDL.
  FOR specification IN SELECT value FROM jsonb_array_elements(table_specifications)
  LOOP
    table_name := specification->>'table';
    SELECT c.oid INTO table_oid FROM pg_class c
    WHERE c.relnamespace = target_namespace AND c.relname = table_name
      AND c.relkind = 'r' AND c.relpersistence = 'p' AND NOT c.relispartition;
    IF table_oid IS NULL OR EXISTS (SELECT 1 FROM pg_inherits WHERE inhrelid = table_oid OR inhparent = table_oid) THEN
      RAISE EXCEPTION 'M2-T16: unexpected or missing table %', table_name;
    END IF;
    EXECUTE format('LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE', target_schema, table_name);
  END LOOP;

  SELECT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = format('%I.rescue_centers', target_schema)::regclass
      AND attname = '_status' AND attnum > 0 AND NOT attisdropped
  ) INTO repaired;

  IF NOT repaired THEN
    FOR specification IN SELECT value FROM jsonb_array_elements(table_specifications)
    LOOP
      table_name := specification->>'table';
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I.%I)', target_schema, table_name) INTO row_present;
      IF row_present THEN
        RAISE EXCEPTION 'M2-T16: partial schema contains data in %; restore/review before repair', table_name;
      END IF;
    END LOOP;
  END IF;

  -- Validate twice: first before DDL, then against the complete repaired shape before COMMIT.
  FOR phase IN 1..2 LOOP
    FOR specification IN
      SELECT value FROM jsonb_array_elements(enum_specifications)
      UNION ALL
      SELECT jsonb_build_array('enum_rescue_centers_status', CASE WHEN repaired
        THEN jsonb_build_array('draft', 'published')
        ELSE jsonb_build_array('active', 'unconfirmed', 'link_broken', 'needs_check') END)
    LOOP
      type_name := specification->>0;
      SELECT t.oid INTO enum_oid FROM pg_type t
      WHERE t.typnamespace = target_namespace AND t.typname = type_name AND t.typtype = 'e';
      SELECT array_agg(enumlabel::text ORDER BY enumsortorder) INTO enum_values
      FROM pg_enum WHERE enumtypid = enum_oid;
      SELECT array_agg(value ORDER BY ordinality) INTO expected_values
      FROM jsonb_array_elements_text(specification->1) WITH ORDINALITY;
      IF enum_oid IS NULL OR enum_values IS DISTINCT FROM expected_values THEN
        RAISE EXCEPTION 'M2-T16: unexpected enum %', type_name;
      END IF;
    END LOOP;

    FOR specification IN SELECT value FROM jsonb_array_elements(table_specifications)
    LOOP
      table_name := specification->>'table';
      table_oid := format('%I.%I', target_schema, table_name)::regclass;
      expected_count := jsonb_array_length(specification->'columns')
        - CASE WHEN table_name = 'rescue_centers' AND NOT repaired THEN 1 ELSE 0 END;
      SELECT count(*) INTO actual_count FROM pg_attribute
      WHERE attrelid = table_oid AND attnum > 0 AND NOT attisdropped;
      IF actual_count <> expected_count THEN
        RAISE EXCEPTION 'M2-T16: unexpected column set in %', table_name;
      END IF;

      FOR column_specification IN SELECT value FROM jsonb_array_elements(specification->'columns')
      LOOP
        IF NOT repaired AND COALESCE((column_specification->>5)::boolean, false) THEN
          CONTINUE;
        END IF;
        column_name := column_specification->>0;
        expected_type := column_specification->>1;
        expected_not_null := (column_specification->>2)::boolean;
        SELECT a.*, t.typname, t.typtype, t.typnamespace,
          format_type(a.atttypid, a.atttypmod) AS formatted_type,
          pg_get_expr(d.adbin, d.adrelid) AS default_expression
        INTO attribute_record FROM pg_attribute a
        JOIN pg_type t ON t.oid = a.atttypid
        LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        WHERE a.attrelid = table_oid AND a.attname = column_name AND a.attnum > 0 AND NOT a.attisdropped;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'M2-T16: unexpected column %.% (missing)', table_name, column_name;
        END IF;
        IF attribute_record.attgenerated <> '' OR attribute_record.attidentity <> '' OR attribute_record.attndims <> 0 THEN
          RAISE EXCEPTION 'M2-T16: unexpected column %.% (generated, identity, or array)', table_name, column_name;
        END IF;

        IF expected_type LIKE 'enum:%' THEN
          type_name := substring(expected_type FROM 6);
          IF type_name = 'main-status' THEN
            type_name := CASE WHEN repaired THEN 'rescue_center_operating_status' ELSE 'enum_rescue_centers_status' END;
          END IF;
          IF attribute_record.typtype <> 'e' OR attribute_record.typnamespace <> target_namespace OR attribute_record.typname <> type_name THEN
            RAISE EXCEPTION 'M2-T16: unexpected column %.% (enum type)', table_name, column_name;
          END IF;
        ELSIF expected_type = 'geometry(Point)' THEN
          -- PostGIS can remain in public when target tables are restored into a test namespace.
          IF attribute_record.typname <> 'geometry' OR attribute_record.typtype <> 'b'
            OR attribute_record.formatted_type !~ '(^|\.)geometry\(Point\)$' THEN
            RAISE EXCEPTION 'M2-T16: unexpected column %.% (Point geometry)', table_name, column_name;
          END IF;
        ELSIF attribute_record.typnamespace <> 'pg_catalog'::regnamespace OR attribute_record.formatted_type <> expected_type THEN
          RAISE EXCEPTION 'M2-T16: unexpected column %.% (type)', table_name, column_name;
        END IF;

        IF (repaired OR NOT COALESCE((column_specification->>4)::boolean, false))
          AND attribute_record.attnotnull <> expected_not_null THEN
          RAISE EXCEPTION 'M2-T16: unexpected column %.% (nullability)', table_name, column_name;
        END IF;

        expected_default := column_specification->>3;
        IF expected_default = 'serial' THEN
          sequence_oid := pg_get_serial_sequence(format('%I.%I', target_schema, table_name), column_name)::regclass;
          IF sequence_oid IS NULL OR attribute_record.default_expression IS NULL
            OR attribute_record.default_expression !~ '^nextval\(''[^'']+''::regclass\)$'
            OR NOT EXISTS (
              SELECT 1 FROM pg_attrdef d JOIN pg_depend p
                ON p.classid = 'pg_attrdef'::regclass AND p.objid = d.oid AND p.refclassid = 'pg_class'::regclass
              WHERE d.adrelid = table_oid AND d.adnum = attribute_record.attnum AND p.refobjid = sequence_oid
            ) THEN
            RAISE EXCEPTION 'M2-T16: unexpected column %.% (serial default)', table_name, column_name;
          END IF;
        ELSE
          expected_default := CASE expected_default
            WHEN 'now' THEN 'now()'
            WHEN 'needs_check' THEN format('%L::%I', 'needs_check', type_name)
            WHEN 'draft' THEN format('%L::%I', 'draft', type_name)
            ELSE NULL END;
          IF replace(attribute_record.default_expression, quote_ident(target_schema) || '.', '') IS DISTINCT FROM expected_default THEN
            RAISE EXCEPTION 'M2-T16: unexpected column %.% (default)', table_name, column_name;
          END IF;
        END IF;
      END LOOP;

      SELECT array_agg(attnum::smallint) INTO expected_columns FROM pg_attribute
      WHERE attrelid = table_oid AND attname = 'id' AND NOT attisdropped;
      SELECT count(*) INTO actual_count FROM pg_constraint
      WHERE conrelid = table_oid AND contype = 'p' AND conkey = expected_columns
        AND NOT condeferrable AND NOT condeferred AND convalidated;
      -- PostgreSQL 18 also records NOT NULL constraints as contype=n; column guards validate them.
      IF actual_count <> 1 OR EXISTS (
        SELECT 1 FROM pg_constraint c WHERE c.conrelid = table_oid AND c.contype NOT IN ('p', 'n')
          AND NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(foreign_key_specifications) f
            WHERE f->>0 = table_name AND f->>1 = c.conname AND c.contype = 'f'
          )
      ) THEN
        RAISE EXCEPTION 'M2-T16: unexpected constraints in %', table_name;
      END IF;
    END LOOP;

    FOR specification IN SELECT value FROM jsonb_array_elements(foreign_key_specifications)
    LOOP
      table_name := specification->>0;
      table_oid := format('%I.%I', target_schema, table_name)::regclass;
      reference_oid := to_regclass(format('%I.%I', target_schema, specification->>3));
      IF reference_oid IS NULL THEN
        RAISE EXCEPTION 'M2-T16: unexpected foreign key % (missing reference table)', specification->>1;
      END IF;
      SELECT array_agg(attnum::smallint) INTO expected_columns FROM pg_attribute
      WHERE attrelid = table_oid AND attname = specification->>2 AND NOT attisdropped;
      SELECT array_agg(attnum::smallint) INTO expected_reference_columns FROM pg_attribute
      WHERE attrelid = reference_oid AND attname = specification->>4 AND atttypid = 'integer'::regtype AND NOT attisdropped;
      IF expected_reference_columns IS NULL THEN
        RAISE EXCEPTION 'M2-T16: unexpected foreign key % (reference column)', specification->>1;
      END IF;
      SELECT * INTO object_record FROM pg_constraint
      WHERE conrelid = table_oid AND conname = specification->>1;
      IF NOT FOUND THEN
        IF repaired THEN
          RAISE EXCEPTION 'M2-T16: unexpected foreign key % (missing)', specification->>1;
        END IF;
      ELSIF object_record.contype <> 'f' OR object_record.conkey IS DISTINCT FROM expected_columns
        OR object_record.confrelid <> reference_oid OR object_record.confkey IS DISTINCT FROM expected_reference_columns
        OR object_record.confdeltype <> (CASE WHEN specification->>5 = 'cascade' THEN 'c' ELSE 'n' END)::"char"
        OR object_record.confupdtype <> 'a' OR object_record.confmatchtype <> 's'
        OR object_record.condeferrable OR object_record.condeferred OR NOT object_record.convalidated THEN
        RAISE EXCEPTION 'M2-T16: unexpected foreign key % (shape)', specification->>1;
      END IF;
    END LOOP;

    FOR specification IN SELECT value FROM jsonb_array_elements(index_specifications)
    LOOP
      table_name := specification->>0;
      table_oid := format('%I.%I', target_schema, table_name)::regclass;
      SELECT c.oid INTO object_oid FROM pg_class c
      WHERE c.relnamespace = target_namespace AND c.relname = specification->>1;
      IF object_oid IS NULL THEN
        IF repaired THEN
          RAISE EXCEPTION 'M2-T16: unexpected index % (missing)', specification->>1;
        END IF;
        CONTINUE;
      END IF;
      SELECT array_agg(a.attnum::smallint ORDER BY key.ordinality), array_agg(a.attcollation ORDER BY key.ordinality)
      INTO expected_columns, expected_collations
      FROM jsonb_array_elements_text(specification->2) WITH ORDINALITY AS key(value, ordinality)
      LEFT JOIN pg_attribute a ON a.attrelid = table_oid AND a.attname = key.value AND NOT a.attisdropped;
      SELECT i.*, am.amname INTO object_record FROM pg_index i
      JOIN pg_class c ON c.oid = i.indexrelid JOIN pg_am am ON am.oid = c.relam
      WHERE i.indexrelid = object_oid;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'M2-T16: unexpected index % (name belongs to another object)', specification->>1;
      END IF;
      IF object_record.indrelid <> table_oid OR object_record.amname <> 'btree'
        OR object_record.indisunique <> (specification->>3)::boolean OR object_record.indisprimary
        OR object_record.indnullsnotdistinct
        OR NOT object_record.indisvalid OR NOT object_record.indisready OR NOT object_record.indislive
        OR object_record.indexprs IS NOT NULL OR object_record.indpred IS NOT NULL
        OR object_record.indnkeyatts <> jsonb_array_length(specification->2)
        OR object_record.indnatts <> object_record.indnkeyatts
        OR ARRAY(SELECT unnest(object_record.indkey)) IS DISTINCT FROM expected_columns
        OR ARRAY(SELECT unnest(object_record.indcollation)) IS DISTINCT FROM expected_collations
        OR EXISTS (SELECT 1 FROM unnest(object_record.indoption) AS option WHERE option <> 0)
        OR EXISTS (SELECT 1 FROM unnest(object_record.indclass) AS opclass JOIN pg_opclass o ON o.oid = opclass WHERE NOT o.opcdefault) THEN
        RAISE EXCEPTION 'M2-T16: unexpected index % (shape)', specification->>1;
      END IF;
    END LOOP;

    IF repaired THEN
      IF did_repair THEN
        RAISE NOTICE 'M2-T16: empty partial schema repaired and verified; no content was changed or published';
      ELSE
        RAISE NOTICE 'M2-T16: repaired schema verified; no changes';
      END IF;
      RETURN;
    END IF;

    -- All preconditions, empty tables, named constraints and indexes have been verified.
    EXECUTE format('ALTER TABLE %I.rescue_centers ALTER COLUMN status DROP DEFAULT', target_schema);
    EXECUTE format('ALTER TABLE %I.rescue_centers ALTER COLUMN status TYPE %I.rescue_center_operating_status USING status::text::%I.rescue_center_operating_status', target_schema, target_schema, target_schema);
    EXECUTE format('ALTER TABLE %I.rescue_centers ALTER COLUMN status SET DEFAULT %L::%I.rescue_center_operating_status', target_schema, 'needs_check', target_schema);
    -- RESTRICT intentionally aborts if another column/function still depends on the old enum.
    EXECUTE format('DROP TYPE %I.enum_rescue_centers_status RESTRICT', target_schema);
    EXECUTE format('CREATE TYPE %I.enum_rescue_centers_status AS ENUM (%L, %L)', target_schema, 'draft', 'published');
    EXECUTE format('ALTER TABLE %I.rescue_centers ADD COLUMN _status %I.enum_rescue_centers_status DEFAULT %L', target_schema, target_schema, 'draft');
    EXECUTE format('ALTER TABLE %I.rescue_centers ALTER COLUMN name DROP NOT NULL, ALTER COLUMN slug DROP NOT NULL, ALTER COLUMN country DROP NOT NULL, ALTER COLUMN status DROP NOT NULL', target_schema);
    EXECUTE format('ALTER TABLE %I.rescue_centers_social_links ALTER COLUMN platform DROP NOT NULL, ALTER COLUMN url DROP NOT NULL', target_schema);

    FOR specification IN SELECT value FROM jsonb_array_elements(foreign_key_specifications)
    LOOP
      table_oid := format('%I.%I', target_schema, specification->>0)::regclass;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = table_oid AND conname = specification->>1) THEN
        EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I.%I (%I) ON DELETE %s ON UPDATE NO ACTION',
          target_schema, specification->>0, specification->>1, specification->>2,
          target_schema, specification->>3, specification->>4, specification->>5);
      END IF;
    END LOOP;
    FOR specification IN SELECT value FROM jsonb_array_elements(index_specifications)
    LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relnamespace = target_namespace AND relname = specification->>1) THEN
        SELECT string_agg(quote_ident(value), ', ' ORDER BY ordinality) INTO quoted_columns
        FROM jsonb_array_elements_text(specification->2) WITH ORDINALITY;
        EXECUTE format('CREATE %sINDEX %I ON %I.%I USING btree (%s)',
          CASE WHEN (specification->>3)::boolean THEN 'UNIQUE ' ELSE '' END,
          specification->>1, target_schema, specification->>0, quoted_columns);
      END IF;
    END LOOP;
    repaired := true;
    did_repair := true;
  END LOOP;
END;
$repair$;

COMMIT;
