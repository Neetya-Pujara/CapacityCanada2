CREATE TYPE "public"."account_role" AS ENUM('NONPROFIT_STAFF', 'CAPACITY_CANADA_ADMIN');--> statement-breakpoint
CREATE TYPE "public"."support_area" AS ENUM('Marketing & Communications', 'Fundraising', 'HR', 'Volunteer Management', 'Governance & Leadership', 'Financial Management', 'Technology & Digital Transformation', 'Strategic Planning', 'Other');--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_profiles" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"primary_mission" text NOT NULL,
	"communities_served" text NOT NULL,
	"paid_staff_count" integer NOT NULL,
	"volunteer_count" integer NOT NULL,
	"operational_challenges" text NOT NULL,
	"support_areas" "support_area"[] DEFAULT ARRAY[]::support_area[] NOT NULL,
	"other_support_area" varchar(240),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_profiles_paid_staff_nonnegative" CHECK ("organization_profiles"."paid_staff_count" >= 0),
	CONSTRAINT "organization_profiles_volunteers_nonnegative" CHECK ("organization_profiles"."volunteer_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"website" varchar(2048),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(160) NOT NULL,
	"email" varchar(254) NOT NULL,
	"username" varchar(32) NOT NULL,
	"password_hash" varchar(100) NOT NULL,
	"role" "account_role" NOT NULL,
	"organization_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_role_organization_check" CHECK (("users"."role" = 'NONPROFIT_STAFF' AND "users"."organization_id" IS NOT NULL)
        OR ("users"."role" = 'CAPACITY_CANADA_ADMIN' AND "users"."organization_id" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_token_hash_unique_idx" ON "auth_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique_idx" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_unique_idx" ON "users" USING btree (lower("username"));--> statement-breakpoint
CREATE INDEX "users_organization_id_idx" ON "users" USING btree ("organization_id");