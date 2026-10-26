-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'viewer');

-- CreateEnum
CREATE TYPE "source_type" AS ENUM ('drive', 'local', 'upload');

-- CreateEnum
CREATE TYPE "source_status" AS ENUM ('active', 'paused', 'error');

-- CreateEnum
CREATE TYPE "file_status" AS ENUM ('queued', 'processing', 'done', 'failed', 'duplicate', 'removed', 'waiting');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'admin',
    "name" TEXT NOT NULL DEFAULT 'Admin',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "type" "source_type" NOT NULL,
    "name" TEXT NOT NULL,
    "drive_folder_id" TEXT,
    "local_path" TEXT,
    "status" "source_status" NOT NULL DEFAULT 'active',
    "last_synced_at" TIMESTAMP(3),
    "error_message" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "drive_file_id" TEXT,
    "drive_path" TEXT,
    "folder_path" TEXT,
    "absolute_path" TEXT,
    "drive_modified_time" TIMESTAMP(3),
    "drive_md5" TEXT,
    "drive_version" TEXT,
    "size_bytes" BIGINT,
    "sha256_hash" TEXT,
    "local_mtime_ms" BIGINT,
    "area" TEXT,
    "duplicate_of_file_id" TEXT,
    "status" "file_status" NOT NULL DEFAULT 'queued',
    "error_message" TEXT,
    "sheet_count" INTEGER NOT NULL DEFAULT 0,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "storage_path" TEXT,
    "imported_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sheets" (
    "id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "header_row_number" INTEGER NOT NULL,
    "row_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "columns" (
    "id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "normalized_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "column_aliases" (
    "id" TEXT NOT NULL,
    "column_id" TEXT NOT NULL,
    "raw_header" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,

    CONSTRAINT "column_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rows" (
    "id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "sheet_id" TEXT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "search_text" TEXT NOT NULL,
    "phone_keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "email_keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" TEXT NOT NULL,
    "source_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "files_checked" INTEGER NOT NULL DEFAULT 0,
    "files_new" INTEGER NOT NULL DEFAULT 0,
    "files_updated" INTEGER NOT NULL DEFAULT 0,
    "files_skipped" INTEGER NOT NULL DEFAULT 0,
    "files_failed" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "details" JSONB,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_credentials" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "refresh_token_encrypted" TEXT NOT NULL,
    "account_email" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "run_after" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "sources_type_idx" ON "sources"("type");

-- CreateIndex
CREATE INDEX "files_source_id_idx" ON "files"("source_id");

-- CreateIndex
CREATE INDEX "files_status_idx" ON "files"("status");

-- CreateIndex
CREATE INDEX "files_sha256_hash_idx" ON "files"("sha256_hash");

-- CreateIndex
CREATE INDEX "files_drive_file_id_idx" ON "files"("drive_file_id");

-- CreateIndex
CREATE INDEX "files_area_idx" ON "files"("area");

-- CreateIndex
CREATE INDEX "files_folder_path_idx" ON "files"("folder_path");

-- CreateIndex
CREATE INDEX "sheets_file_id_idx" ON "sheets"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "columns_normalized_key_key" ON "columns"("normalized_key");

-- CreateIndex
CREATE UNIQUE INDEX "column_aliases_normalized_key" ON "column_aliases"("normalized");

-- CreateIndex
CREATE INDEX "column_aliases_column_id_idx" ON "column_aliases"("column_id");

-- CreateIndex
CREATE INDEX "rows_file_id_idx" ON "rows"("file_id");

-- CreateIndex
CREATE INDEX "rows_sheet_id_idx" ON "rows"("sheet_id");

-- CreateIndex
CREATE INDEX "sync_runs_source_id_idx" ON "sync_runs"("source_id");

-- CreateIndex
CREATE INDEX "sync_runs_started_at_idx" ON "sync_runs"("started_at");

-- CreateIndex
CREATE INDEX "jobs_status_run_after_idx" ON "jobs"("status", "run_after");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_duplicate_of_file_id_fkey" FOREIGN KEY ("duplicate_of_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sheets" ADD CONSTRAINT "sheets_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "column_aliases" ADD CONSTRAINT "column_aliases_column_id_fkey" FOREIGN KEY ("column_id") REFERENCES "columns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rows" ADD CONSTRAINT "rows_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rows" ADD CONSTRAINT "rows_sheet_id_fkey" FOREIGN KEY ("sheet_id") REFERENCES "sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Search extensions. unaccent() is STABLE, so the index uses an immutable wrapper.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION immutable_unaccent(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT public.unaccent('public.unaccent', input);
$$;

CREATE INDEX "rows_search_text_trgm_idx" ON "rows" USING GIN ("search_text" gin_trgm_ops);
CREATE INDEX "rows_search_text_unaccent_trgm_idx" ON "rows" USING GIN (immutable_unaccent("search_text") gin_trgm_ops);
CREATE INDEX "rows_data_gin_idx" ON "rows" USING GIN ("data");
CREATE INDEX "rows_phone_keys_gin_idx" ON "rows" USING GIN ("phone_keys");
CREATE INDEX "rows_email_keys_gin_idx" ON "rows" USING GIN ("email_keys");

