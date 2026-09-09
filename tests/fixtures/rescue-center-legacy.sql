CREATE TYPE "public"."_locales" AS ENUM('ru', 'en');
CREATE TYPE "public"."enum_rescue_centers_social_links_platform" AS ENUM('instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'vk', 'telegram', 'x', 'other');
CREATE TYPE "public"."enum_rescue_centers_operating_languages" AS ENUM('ru', 'en', 'de', 'other');
CREATE TYPE "public"."enum_rescue_centers_status" AS ENUM('active', 'unconfirmed', 'link_broken', 'needs_check');
CREATE TYPE "public"."enum_sources_type" AS ENUM('official', 'news', 'social', 'manual');
CREATE TABLE "rescue_centers_social_links" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"platform" "enum_rescue_centers_social_links_platform" NOT NULL,
	"url" varchar NOT NULL
);

CREATE TABLE "rescue_centers_operating_languages" (
	"order" integer NOT NULL,
	"parent_id" integer NOT NULL,
	"value" "enum_rescue_centers_operating_languages",
	"id" serial PRIMARY KEY NOT NULL
);

CREATE TABLE "rescue_centers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"country" varchar NOT NULL,
	"region" varchar,
	"website" varchar,
	"email" varchar,
	"phone" varchar,
	"address" varchar,
	"location" geometry(Point),
	"status" "enum_rescue_centers_status" DEFAULT 'needs_check' NOT NULL,
	"verification_score" numeric,
	"last_checked_at" timestamp(3) with time zone,
	"verified_by_agent_at" timestamp(3) with time zone,
	"verified_by_human_at" timestamp(3) with time zone,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "rescue_centers_locales" (
	"description" jsonb,
	"id" serial PRIMARY KEY NOT NULL,
	"_locale" "_locales" NOT NULL,
	"_parent_id" integer NOT NULL
);

CREATE TABLE "rescue_centers_rels" (
	"id" serial PRIMARY KEY NOT NULL,
	"order" integer,
	"parent_id" integer NOT NULL,
	"path" varchar NOT NULL,
	"sources_id" integer
);

CREATE TABLE "sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" varchar NOT NULL,
	"type" "enum_sources_type" NOT NULL,
	"trust_level" numeric DEFAULT 0.5,
	"last_fetched_at" timestamp(3) with time zone,
	"notes" varchar,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "rescue_centers_social_links" ADD CONSTRAINT "rescue_centers_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."rescue_centers"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rescue_centers_operating_languages" ADD CONSTRAINT "rescue_centers_operating_languages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."rescue_centers"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rescue_centers_locales" ADD CONSTRAINT "rescue_centers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."rescue_centers"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rescue_centers_rels" ADD CONSTRAINT "rescue_centers_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."rescue_centers"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rescue_centers_rels" ADD CONSTRAINT "rescue_centers_rels_sources_fk" FOREIGN KEY ("sources_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "rescue_centers_social_links_order_idx" ON "rescue_centers_social_links" USING btree ("_order");
CREATE INDEX "rescue_centers_social_links_parent_id_idx" ON "rescue_centers_social_links" USING btree ("_parent_id");
CREATE INDEX "rescue_centers_operating_languages_order_idx" ON "rescue_centers_operating_languages" USING btree ("order");
CREATE INDEX "rescue_centers_operating_languages_parent_idx" ON "rescue_centers_operating_languages" USING btree ("parent_id");
CREATE UNIQUE INDEX "rescue_centers_slug_idx" ON "rescue_centers" USING btree ("slug");
CREATE INDEX "rescue_centers_updated_at_idx" ON "rescue_centers" USING btree ("updated_at");
CREATE INDEX "rescue_centers_created_at_idx" ON "rescue_centers" USING btree ("created_at");
CREATE UNIQUE INDEX "rescue_centers_locales_locale_parent_id_unique" ON "rescue_centers_locales" USING btree ("_locale","_parent_id");
CREATE INDEX "rescue_centers_rels_order_idx" ON "rescue_centers_rels" USING btree ("order");
CREATE INDEX "rescue_centers_rels_parent_idx" ON "rescue_centers_rels" USING btree ("parent_id");
CREATE INDEX "rescue_centers_rels_path_idx" ON "rescue_centers_rels" USING btree ("path");
CREATE INDEX "rescue_centers_rels_sources_id_idx" ON "rescue_centers_rels" USING btree ("sources_id");
CREATE INDEX "sources_updated_at_idx" ON "sources" USING btree ("updated_at");
CREATE INDEX "sources_created_at_idx" ON "sources" USING btree ("created_at");