import { z } from "zod";

export const SUPPORT_AREAS = [
  "Marketing & Communications",
  "Fundraising",
  "HR",
  "Volunteer Management",
  "Governance & Leadership",
  "Financial Management",
  "Technology & Digital Transformation",
  "Strategic Planning",
  "Other",
] as const;

const supportAreasSchema = z.array(z.enum(SUPPORT_AREAS)).min(1).max(SUPPORT_AREAS.length);

const orientationSchema = z.object({
  primaryMission: z.string().trim().min(10).max(5000),
  communitiesServed: z.string().trim().min(5).max(5000),
  paidStaffCount: z.number().int().min(0).max(1_000_000),
  volunteerCount: z.number().int().min(0).max(10_000_000),
  operationalChallenges: z.string().trim().min(10).max(5000),
  supportAreas: supportAreasSchema,
  otherSupportArea: z.string().trim().max(240).optional().default(""),
});

const organizationSchema = z.object({
  organizationName: z.string().trim().min(2).max(200),
  website: z.union([z.literal(""), z.string().trim().url().max(2048)]).optional().default(""),
});

export const nonprofitRegistrationSchema = z
  .object({
    fullName: z.string().trim().min(2).max(160),
    email: z.string().trim().toLowerCase().email().max(254),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(32)
      .regex(/^[a-z0-9._-]+$/),
    password: z.string().min(8).max(72),
    confirmPassword: z.string().min(8).max(72),
    ...organizationSchema.shape,
    ...orientationSchema.shape,
  })
  .superRefine((data, context) => {
    if (data.password !== data.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
    if (Buffer.byteLength(data.password, "utf8") > 72) {
      context.addIssue({
        code: "custom",
        path: ["password"],
        message: "Password must be no more than 72 UTF-8 bytes.",
      });
    }
    if (data.supportAreas.includes("Other") && !data.otherSupportArea.trim()) {
      context.addIssue({
        code: "custom",
        path: ["otherSupportArea"],
        message: "Specify the other area of support.",
      });
    }
  });

export const loginSchema = z.object({
  accountType: z.enum(["NONPROFIT_STAFF", "CAPACITY_CANADA_ADMIN"]),
  identity: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(72),
  remember: z.boolean().default(false),
});

export const profileUpdateSchema = z
  .object({
    fullName: z.string().trim().min(2).max(160),
    email: z.string().trim().toLowerCase().email().max(254),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(32)
      .regex(/^[a-z0-9._-]+$/),
    ...organizationSchema.shape,
    ...orientationSchema.shape,
  })
  .superRefine((data, context) => {
    if (data.supportAreas.includes("Other") && !data.otherSupportArea.trim()) {
      context.addIssue({
        code: "custom",
        path: ["otherSupportArea"],
        message: "Specify the other area of support.",
      });
    }
  });

export const conversationMessageSchema = z.object({
  content: z.string().trim().min(1, "Write a message before sending.").max(4000),
  requestId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
});

export const resourceInputSchema = z.object({
  title: z.string().trim().min(2).max(240),
  description: z.string().trim().min(10).max(5000),
  url: z.string().trim().max(2048).refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === "https:" || protocol === "http:";
    } catch {
      return false;
    }
  }, "Use a valid HTTP or HTTPS resource URL."),
  sourceOrganization: z.string().trim().min(2).max(200),
  categories: z.array(z.enum(SUPPORT_AREAS)).min(1).max(SUPPORT_AREAS.length)
    .refine((areas) => new Set(areas).size === areas.length, "Remove duplicate categories."),
  lastVerifiedAt: z.string().date().nullable(),
  adminNotes: z.string().trim().max(5000).nullable(),
});

export type NonprofitRegistration = z.infer<typeof nonprofitRegistrationSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
