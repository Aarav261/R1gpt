CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"capacity_mw" text,
	"region" text,
	"aemo_stage" text,
	"stage_entered_at" timestamp with time zone,
	"submission_date" timestamp with time zone,
	"deadline" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_workspace_slug_unique" UNIQUE("workspace_id","slug")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Add project_id as NULLABLE first so existing rows survive the migration.
ALTER TABLE "audit_reports" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "project_id" uuid;--> statement-breakpoint

-- Backfill: give every existing workspace one "Default project". Its name
-- borrows the most recent audit's project_name when one exists, else a literal.
INSERT INTO "projects" ("workspace_id", "created_by", "name", "slug")
SELECT
	w."id",
	w."created_by",
	COALESCE(
		(SELECT ar."project_name" FROM "audit_reports" ar
		 WHERE ar."workspace_id" = w."id"
		 ORDER BY ar."created_at" DESC LIMIT 1),
		'Default project'
	),
	'default-project'
FROM "workspaces" w;--> statement-breakpoint

-- Point existing files / reports at their workspace's default project.
UPDATE "audit_reports" ar
SET "project_id" = p."id"
FROM "projects" p
WHERE p."workspace_id" = ar."workspace_id" AND p."slug" = 'default-project';--> statement-breakpoint
UPDATE "files" f
SET "project_id" = p."id"
FROM "projects" p
WHERE p."workspace_id" = f."workspace_id" AND p."slug" = 'default-project';--> statement-breakpoint

-- Now enforce NOT NULL and wire the foreign keys.
ALTER TABLE "audit_reports" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_reports" ADD CONSTRAINT "audit_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
