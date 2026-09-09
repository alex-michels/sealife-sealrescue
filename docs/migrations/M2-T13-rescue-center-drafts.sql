-- M2-T13: run ONCE on the pre-M2-T13 schema, in maintenance mode with a backup.
-- Execute with psql --single-transaction --set ON_ERROR_STOP=1 --file <this-file>.
-- New databases use Payload schema creation; do not run this migration on an already-pushed schema.
-- Preserve the old operational-status enum's OID and data before introducing draft lifecycle status.
ALTER TYPE "public"."enum_rescue_centers_status" RENAME TO "rescue_center_operating_status";
CREATE TYPE "public"."enum__rescue_centers_v_version_social_links_platform" AS ENUM('instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'vk', 'telegram', 'x', 'other');
CREATE TYPE "public"."enum__rescue_centers_v_version_operating_languages" AS ENUM('ru', 'en', 'de', 'other');
CREATE TYPE "public"."enum__rescue_centers_v_version_status" AS ENUM('draft', 'published');
CREATE TYPE "public"."enum__rescue_centers_v_published_locale" AS ENUM('ru', 'en');
CREATE TABLE "_rescue_centers_v_version_social_links" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"platform" "enum__rescue_centers_v_version_social_links_platform",
	"url" varchar,
	"_uuid" varchar
);

CREATE TABLE "_rescue_centers_v_version_operating_languages" (
	"order" integer NOT NULL,
	"parent_id" integer NOT NULL,
	"value" "enum__rescue_centers_v_version_operating_languages",
	"id" serial PRIMARY KEY NOT NULL
);

CREATE TABLE "_rescue_centers_v" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_id" integer,
	"version_name" varchar,
	"version_slug" varchar,
	"version_country" varchar,
	"version_region" varchar,
	"version_website" varchar,
	"version_email" varchar,
	"version_phone" varchar,
	"version_address" varchar,
	"version_location" geometry(Point),
	"version_status" "rescue_center_operating_status" DEFAULT 'needs_check',
	"version_verification_score" numeric,
	"version_last_checked_at" timestamp(3) with time zone,
	"version_verified_by_agent_at" timestamp(3) with time zone,
	"version_verified_by_human_at" timestamp(3) with time zone,
	"version_updated_at" timestamp(3) with time zone,
	"version_created_at" timestamp(3) with time zone,
	"version__status" "enum__rescue_centers_v_version_status" DEFAULT 'draft',
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"snapshot" boolean,
	"published_locale" "enum__rescue_centers_v_published_locale",
	"latest" boolean
);

CREATE TABLE "_rescue_centers_v_locales" (
	"version_description" jsonb,
	"id" serial PRIMARY KEY NOT NULL,
	"_locale" "_locales" NOT NULL,
	"_parent_id" integer NOT NULL
);

CREATE TABLE "_rescue_centers_v_rels" (
	"id" serial PRIMARY KEY NOT NULL,
	"order" integer,
	"parent_id" integer NOT NULL,
	"path" varchar NOT NULL,
	"sources_id" integer
);

CREATE TYPE "public"."enum_rescue_centers_status" AS ENUM('draft', 'published');
ALTER TABLE "rescue_centers_social_links" ALTER COLUMN "platform" DROP NOT NULL;
ALTER TABLE "rescue_centers_social_links" ALTER COLUMN "url" DROP NOT NULL;
ALTER TABLE "rescue_centers" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE "rescue_centers" ALTER COLUMN "slug" DROP NOT NULL;
ALTER TABLE "rescue_centers" ALTER COLUMN "country" DROP NOT NULL;
ALTER TABLE "rescue_centers" ALTER COLUMN "status" DROP NOT NULL;
ALTER TABLE "rescue_centers" ADD COLUMN "_status" "enum_rescue_centers_status" DEFAULT 'draft';
ALTER TABLE "_rescue_centers_v_version_social_links" ADD CONSTRAINT "_rescue_centers_v_version_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_rescue_centers_v"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "_rescue_centers_v_version_operating_languages" ADD CONSTRAINT "_rescue_centers_v_version_operating_languages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_rescue_centers_v"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "_rescue_centers_v" ADD CONSTRAINT "_rescue_centers_v_parent_id_rescue_centers_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."rescue_centers"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "_rescue_centers_v_locales" ADD CONSTRAINT "_rescue_centers_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_rescue_centers_v"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "_rescue_centers_v_rels" ADD CONSTRAINT "_rescue_centers_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_rescue_centers_v"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "_rescue_centers_v_rels" ADD CONSTRAINT "_rescue_centers_v_rels_sources_fk" FOREIGN KEY ("sources_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "_rescue_centers_v_version_social_links_order_idx" ON "_rescue_centers_v_version_social_links" USING btree ("_order");
CREATE INDEX "_rescue_centers_v_version_social_links_parent_id_idx" ON "_rescue_centers_v_version_social_links" USING btree ("_parent_id");
CREATE INDEX "_rescue_centers_v_version_operating_languages_order_idx" ON "_rescue_centers_v_version_operating_languages" USING btree ("order");
CREATE INDEX "_rescue_centers_v_version_operating_languages_parent_idx" ON "_rescue_centers_v_version_operating_languages" USING btree ("parent_id");
CREATE INDEX "_rescue_centers_v_parent_idx" ON "_rescue_centers_v" USING btree ("parent_id");
CREATE INDEX "_rescue_centers_v_version_version_slug_idx" ON "_rescue_centers_v" USING btree ("version_slug");
CREATE INDEX "_rescue_centers_v_version_version_updated_at_idx" ON "_rescue_centers_v" USING btree ("version_updated_at");
CREATE INDEX "_rescue_centers_v_version_version_created_at_idx" ON "_rescue_centers_v" USING btree ("version_created_at");
CREATE INDEX "_rescue_centers_v_version_version__status_idx" ON "_rescue_centers_v" USING btree ("version__status");
CREATE INDEX "_rescue_centers_v_created_at_idx" ON "_rescue_centers_v" USING btree ("created_at");
CREATE INDEX "_rescue_centers_v_updated_at_idx" ON "_rescue_centers_v" USING btree ("updated_at");
CREATE INDEX "_rescue_centers_v_snapshot_idx" ON "_rescue_centers_v" USING btree ("snapshot");
CREATE INDEX "_rescue_centers_v_published_locale_idx" ON "_rescue_centers_v" USING btree ("published_locale");
CREATE INDEX "_rescue_centers_v_latest_idx" ON "_rescue_centers_v" USING btree ("latest");
CREATE UNIQUE INDEX "_rescue_centers_v_locales_locale_parent_id_unique" ON "_rescue_centers_v_locales" USING btree ("_locale","_parent_id");
CREATE INDEX "_rescue_centers_v_rels_order_idx" ON "_rescue_centers_v_rels" USING btree ("order");
CREATE INDEX "_rescue_centers_v_rels_parent_idx" ON "_rescue_centers_v_rels" USING btree ("parent_id");
CREATE INDEX "_rescue_centers_v_rels_path_idx" ON "_rescue_centers_v_rels" USING btree ("path");
CREATE INDEX "_rescue_centers_v_rels_sources_id_idx" ON "_rescue_centers_v_rels" USING btree ("sources_id");
CREATE INDEX "rescue_centers__status_idx" ON "rescue_centers" USING btree ("_status");

-- Every existing row was public before drafts existed. Preserve that visibility.
UPDATE rescue_centers SET _status = 'published';
INSERT INTO _rescue_centers_v (
  parent_id, version_name, version_slug, version_country, version_region, version_website,
  version_email, version_phone, version_address, version_location, version_status,
  version_verification_score, version_last_checked_at, version_verified_by_agent_at,
  version_verified_by_human_at, version_updated_at, version_created_at, version__status,
  created_at, updated_at, latest
)
SELECT id, name, slug, country, region, website, email, phone, address, location, status,
  verification_score, last_checked_at, verified_by_agent_at, verified_by_human_at,
  updated_at, created_at, 'published', created_at, updated_at, true
FROM rescue_centers;
INSERT INTO _rescue_centers_v_locales (version_description, _locale, _parent_id)
SELECT l.description, l._locale, v.id FROM rescue_centers_locales l
JOIN _rescue_centers_v v ON v.parent_id = l._parent_id;
INSERT INTO _rescue_centers_v_version_social_links (_order, _parent_id, platform, url, _uuid)
SELECT s._order, v.id, s.platform::text::enum__rescue_centers_v_version_social_links_platform, s.url, s.id
FROM rescue_centers_social_links s JOIN _rescue_centers_v v ON v.parent_id = s._parent_id;
INSERT INTO _rescue_centers_v_version_operating_languages ("order", parent_id, value)
SELECT l."order", v.id, l.value::text::enum__rescue_centers_v_version_operating_languages
FROM rescue_centers_operating_languages l JOIN _rescue_centers_v v ON v.parent_id = l.parent_id;
INSERT INTO _rescue_centers_v_rels ("order", parent_id, path, sources_id)
SELECT r."order", v.id, r.path, r.sources_id
FROM rescue_centers_rels r JOIN _rescue_centers_v v ON v.parent_id = r.parent_id;
