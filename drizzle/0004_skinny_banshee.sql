DO $$ BEGIN
  CREATE TYPE public.event_status AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE public.organizational_need_status AS ENUM ('ACTIVE', 'RESOLVED', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  title varchar(240) NOT NULL,
  summary varchar(500) DEFAULT '' NOT NULL,
  description text NOT NULL,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  location varchar(500) NOT NULL,
  registration_url varchar(2048),
  registration_deadline date,
  image_url varchar(2048),
  status public.event_status DEFAULT 'DRAFT' NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.event_categories (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  category public.support_area NOT NULL,
  CONSTRAINT event_categories_event_id_category_pk PRIMARY KEY (event_id, category)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.organizational_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  category public.support_area NOT NULL,
  canonical_key varchar(120) NOT NULL,
  challenge varchar(240) NOT NULL,
  description text NOT NULL,
  relevant_context text NOT NULL,
  status public.organizational_need_status DEFAULT 'ACTIVE' NOT NULL,
  first_identified_at timestamp with time zone DEFAULT now() NOT NULL,
  last_observed_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE public.organizational_needs ADD COLUMN IF NOT EXISTS conversation_id uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE public.organizational_needs
    ADD CONSTRAINT organizational_needs_conversation_id_conversations_id_fk
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  recipient_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  title varchar(200) NOT NULL,
  message varchar(500) NOT NULL,
  reason varchar(500) NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS event_categories_category_idx ON public.event_categories USING btree (category);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS events_status_starts_at_idx ON public.events USING btree (status, starts_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS events_starts_at_idx ON public.events USING btree (starts_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS events_updated_at_idx ON public.events USING btree (updated_at);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS organizational_needs_identity_unique_idx ON public.organizational_needs USING btree (organization_id, category, canonical_key);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS organizational_needs_org_idx ON public.organizational_needs USING btree (organization_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS organizational_needs_category_status_idx ON public.organizational_needs USING btree (category, status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS organizational_needs_last_observed_idx ON public.organizational_needs USING btree (last_observed_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS organizational_needs_conversation_idx ON public.organizational_needs USING btree (conversation_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS notifications_event_recipient_unique_idx ON public.notifications USING btree (event_id, recipient_user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx ON public.notifications USING btree (recipient_user_id, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS notifications_recipient_read_idx ON public.notifications USING btree (recipient_user_id, read_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS notifications_organization_idx ON public.notifications USING btree (organization_id);