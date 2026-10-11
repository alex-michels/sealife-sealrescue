-- Observed partial state, loaded after rescue-center-legacy.sql in an isolated schema.
CREATE TYPE "public"."rescue_center_operating_status" AS ENUM('active', 'unconfirmed', 'link_broken', 'needs_check');
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
