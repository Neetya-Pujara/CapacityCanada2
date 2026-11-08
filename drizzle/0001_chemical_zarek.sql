ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_support_areas_nonempty" CHECK (cardinality("organization_profiles"."support_areas") > 0);--> statement-breakpoint
ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_other_support_area_check" CHECK ((
        (array_position("organization_profiles"."support_areas", 'Other'::support_area) IS NOT NULL
          AND "organization_profiles"."other_support_area" IS NOT NULL
          AND btrim("organization_profiles"."other_support_area") <> '')
        OR
        (array_position("organization_profiles"."support_areas", 'Other'::support_area) IS NULL
          AND "organization_profiles"."other_support_area" IS NULL)
      ));