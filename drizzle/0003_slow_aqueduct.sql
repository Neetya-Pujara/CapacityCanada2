CREATE TABLE "resource_categories" (
	"resource_id" uuid NOT NULL,
	"category" "support_area" NOT NULL,
	CONSTRAINT "resource_categories_resource_id_category_pk" PRIMARY KEY("resource_id","category")
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(240) NOT NULL,
	"description" text NOT NULL,
	"url" varchar(2048) NOT NULL,
	"source_organization" varchar(200) NOT NULL,
	"last_verified_at" timestamp with time zone,
	"admin_notes" text,
	"seed_key" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "resource_recommendations" jsonb;--> statement-breakpoint
ALTER TABLE "resource_categories" ADD CONSTRAINT "resource_categories_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resource_categories_category_idx" ON "resource_categories" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "resources_seed_key_unique_idx" ON "resources" USING btree ("seed_key");--> statement-breakpoint
CREATE INDEX "resources_created_at_idx" ON "resources" USING btree ("created_at");