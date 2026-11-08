import { and, desc, eq, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  conversationMessages,
  conversations,
  organizationalNeeds,
} from "@/lib/db/schema";
import { getNonprofitProfile } from "@/lib/profile";
import {
  generateAssistantReply,
  GeminiServiceError,
  type AssistantHistoryMessage,
  type OrganizationContext,
} from "@/lib/gemini";
import { findResourceCandidates } from "@/lib/resources";
import type { ResourceRecommendationSnapshot } from "@/lib/db/schema";
import {
  extractIdentifiedChallenges,
  sameNeedDescription,
} from "@/lib/organizational-needs";

const PROCESSING_LEASE_MS = 60 * 1000;
const MAX_STORED_CONVERSATIONS = 100;
const MAX_HISTORY_MESSAGES = 20;

function titleFromMessage(message: string): string {
  const firstSentence = message.trim().replace(/\s+/g, " ").split(/[.!?\n]/, 1)[0] ?? "";
  const subject = firstSentence
    .replace(/^(hi|hello)[,:\s]+/i, "")
    .replace(
      /^(?:i(?:'m| am) having trouble (?:with )?|we(?:'re| are) struggling with |i need help with |we need help with |help (?:me )?(?:with|to) |advice (?:on|about) )/i,
      "",
    )
    .trim();
  const title = subject
    ? `Support with ${subject}`
    : firstSentence;
  return title.length <= 116 ? title : `${title.slice(0, 113).trimEnd()}...`;
}

export async function listUserConversations(userId: string, limit = 20) {
  return getDb()
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(Math.min(limit, MAX_STORED_CONVERSATIONS));
}

export async function getUserConversation(userId: string, conversationId: string) {
  const db = getDb();
  const [conversation] = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .limit(1);
  if (!conversation) return null;

  await db
    .update(conversationMessages)
    .set({ generationStatus: "FAILED", updatedAt: new Date() })
    .where(
      and(
        eq(conversationMessages.conversationId, conversation.id),
        eq(conversationMessages.sender, "USER"),
        eq(conversationMessages.generationStatus, "PROCESSING"),
        lt(conversationMessages.updatedAt, new Date(Date.now() - PROCESSING_LEASE_MS)),
      ),
    );

  const messages = await db
    .select({
      id: conversationMessages.id,
      sender: conversationMessages.sender,
      content: conversationMessages.content,
      resourceRecommendations: conversationMessages.resourceRecommendations,
      requestId: conversationMessages.requestId,
      generationStatus: conversationMessages.generationStatus,
      createdAt: conversationMessages.createdAt,
    })
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversation.id))
    .orderBy(conversationMessages.createdAt, conversationMessages.id);
  return { ...conversation, messages };
}

export async function deleteUserConversation(userId: string, conversationId: string): Promise<boolean> {
  const [deleted] = await getDb()
    .delete(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .returning({ id: conversations.id });
  return Boolean(deleted);
}

type SubmitMessageInput = {
  userId: string;
  conversationId?: string;
  requestId: string;
  content: string;
};

type CompletedMessageResult = {
  kind: "completed";
  conversationId: string;
  title: string;
  userMessage: {
    id: string;
    sender: "USER";
    content: string;
    requestId: string | null;
    generationStatus: "COMPLETED";
    createdAt: Date;
  };
  assistantMessage: {
    id: string;
    sender: "ASSISTANT";
    content: string;
    requestId: string | null;
    generationStatus: "COMPLETED";
    createdAt: Date;
    resourceRecommendations: ResourceRecommendationSnapshot[] | null;
  };
};

export type SubmitMessageResult =
  | CompletedMessageResult
  | {
      kind: "failed";
      conversationId?: string;
      userMessage?: {
        id: string;
        sender: "USER";
        content: string;
        requestId: string;
        generationStatus: "FAILED";
        createdAt: Date;
      };
      status: number;
      error: string;
    }
  | { kind: "in_progress"; conversationId: string; error: string }
  | { kind: "not_found" }
  | { kind: "conflict"; error: string };

export async function submitConversationMessage(
  input: SubmitMessageInput,
): Promise<SubmitMessageResult> {
  const profile = await getNonprofitProfile(input.userId);
  if (!profile || !profile.organizationId) {
    return {
      kind: "failed",
      status: 409,
      error: "Your organization profile is unavailable. Please contact your platform administrator.",
    };
  }
  const organizationId = profile.organizationId;

  const db = getDb();
  const prepared = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.requestId}))`);
    const [existingRequest] = await tx
      .select({
        message: conversationMessages,
        conversation: conversations,
      })
      .from(conversationMessages)
      .innerJoin(
        conversations,
        eq(conversationMessages.conversationId, conversations.id),
      )
      .where(eq(conversationMessages.requestId, input.requestId))
      .limit(1);

    if (existingRequest && existingRequest.conversation.userId !== input.userId) {
      return { kind: "not_found" as const };
    }
    if (
      existingRequest &&
      input.conversationId &&
      existingRequest.conversation.id !== input.conversationId
    ) {
      return { kind: "conflict" as const, error: "This message request was already used." };
    }

    const conversationId = existingRequest?.conversation.id ?? input.conversationId;
    let conversation: typeof conversations.$inferSelect | undefined;
    if (conversationId) {
      [conversation] = await tx
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, input.userId)))
        .for("update")
        .limit(1);
      if (!conversation) return { kind: "not_found" as const };
    } else {
      [conversation] = await tx
        .insert(conversations)
        .values({ userId: input.userId, title: titleFromMessage(input.content) })
        .returning();
    }

    if (!conversation) throw new Error("Conversation could not be created.");

    if (existingRequest) {
      const current = existingRequest.message;
      if (current.sender !== "USER" || current.conversationId !== conversation.id) {
        return { kind: "conflict" as const, error: "This message request was already used." };
      }
      if (current.generationStatus === "COMPLETED") {
        const [assistantMessage] = await tx
          .select()
          .from(conversationMessages)
          .where(eq(conversationMessages.replyToMessageId, current.id))
          .limit(1);
        if (assistantMessage) {
          return {
            kind: "completed" as const,
            conversationId: conversation.id,
            title: conversation.title,
            userMessage: {
              id: current.id,
              sender: "USER" as const,
              content: current.content,
              requestId: current.requestId,
              generationStatus: "COMPLETED" as const,
              createdAt: current.createdAt,
            },
            assistantMessage: {
              id: assistantMessage.id,
              sender: "ASSISTANT" as const,
              content: assistantMessage.content,
              requestId: assistantMessage.requestId,
              generationStatus: "COMPLETED" as const,
              createdAt: assistantMessage.createdAt,
              resourceRecommendations: assistantMessage.resourceRecommendations,
            },
          };
        }
      }
      if (
        current.generationStatus === "PROCESSING" &&
        Date.now() - current.updatedAt.getTime() < PROCESSING_LEASE_MS
      ) {
        return { kind: "in_progress" as const, conversationId: conversation.id, error: "This response is still being prepared." };
      }
      await tx
        .update(conversationMessages)
        .set({
          generationStatus: "PROCESSING",
          updatedAt: new Date(),
        })
        .where(eq(conversationMessages.id, current.id));
      return {
        kind: "ready" as const,
        conversation,
        userMessageId: current.id,
        userMessageContent: current.content,
          userMessageCreatedAt: current.createdAt,
          requestId: input.requestId,
        };
    }

    const [pending] = await tx
      .select()
      .from(conversationMessages)
      .where(
        and(
          eq(conversationMessages.conversationId, conversation.id),
          eq(conversationMessages.sender, "USER"),
          eq(conversationMessages.generationStatus, "PROCESSING"),
        ),
      )
      .orderBy(desc(conversationMessages.updatedAt))
      .for("update")
      .limit(1);
    if (pending) {
      if (Date.now() - pending.updatedAt.getTime() < PROCESSING_LEASE_MS) {
        return { kind: "in_progress" as const, conversationId: conversation.id, error: "Another response is still being prepared for this conversation." };
      }
      await tx
        .update(conversationMessages)
        .set({ generationStatus: "FAILED", updatedAt: new Date() })
        .where(eq(conversationMessages.id, pending.id));
    }

    const [userMessage] = await tx
      .insert(conversationMessages)
      .values({
        conversationId: conversation.id,
        sender: "USER",
        content: input.content,
        requestId: input.requestId,
        generationStatus: "PROCESSING",
      })
      .returning();
    await tx
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversation.id));
    return {
      kind: "ready" as const,
      conversation,
      userMessageId: userMessage.id,
      userMessageContent: userMessage.content,
      userMessageCreatedAt: userMessage.createdAt,
      requestId: input.requestId,
    };
  });

  if (prepared.kind !== "ready") return prepared;

  const previousMessages = await db
    .select({
      sender: conversationMessages.sender,
      content: conversationMessages.content,
      resourceRecommendations: conversationMessages.resourceRecommendations,
    })
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, prepared.conversation.id))
    .orderBy(desc(conversationMessages.createdAt), desc(conversationMessages.id))
    .limit(MAX_HISTORY_MESSAGES + 1);
  const history: AssistantHistoryMessage[] = previousMessages
    .reverse()
    .map((message) => ({
      sender: message.sender,
      content: message.resourceRecommendations?.length
        ? `${message.content}\n\nPreviously recommended resources (saved conversation snapshot): ${message.resourceRecommendations
          .map((resource) => `${resource.title} from ${resource.sourceOrganization}: ${resource.whyRelevant}`)
          .join("; ")}`
        : message.content,
    }));
  const context: OrganizationContext = {
    organizationName: profile.organizationName,
    primaryMission: profile.primaryMission,
    communitiesServed: profile.communitiesServed,
    paidStaffCount: profile.paidStaffCount,
    volunteerCount: profile.volunteerCount,
    operationalChallenges: profile.operationalChallenges,
    supportAreas: profile.supportAreas,
    otherSupportArea: profile.otherSupportArea,
  };

  let answer: Awaited<ReturnType<typeof generateAssistantReply>>;
  try {
    const recentConversation = history
      .filter((message) => message.sender === "USER")
      .slice(-5)
      .map((message) => message.content)
      .join("\n");
    const candidates = await findResourceCandidates({
      profileSupportAreas: profile.supportAreas,
      organizationContext: [
        profile.primaryMission,
        profile.communitiesServed,
        profile.operationalChallenges,
      ].join(" "),
      recentConversation,
    });
    answer = await generateAssistantReply(context, history, candidates);
  } catch (error) {
    const serviceError =
      error instanceof GeminiServiceError
        ? error
        : new GeminiServiceError("The assistant could not respond right now. Your message is saved; please try again.");
    await db
      .update(conversationMessages)
      .set({ generationStatus: "FAILED", updatedAt: new Date() })
      .where(eq(conversationMessages.id, prepared.userMessageId));
    return {
      kind: "failed",
      conversationId: prepared.conversation.id,
      userMessage: {
        id: prepared.userMessageId,
        sender: "USER",
        content: prepared.userMessageContent,
        requestId: prepared.requestId,
        generationStatus: "FAILED",
        createdAt: prepared.userMessageCreatedAt,
      },
      status: serviceError.status,
      error: serviceError.message,
    };
  }

  return db.transaction(async (tx) => {
    const [ownedConversation] = await tx
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, prepared.conversation.id),
          eq(conversations.userId, input.userId),
        ),
      )
      .for("update")
      .limit(1);
    if (!ownedConversation) return { kind: "not_found" as const };

    const [userMessage] = await tx
      .select()
      .from(conversationMessages)
      .where(
        and(
          eq(conversationMessages.id, prepared.userMessageId),
          eq(conversationMessages.conversationId, ownedConversation.id),
          eq(conversationMessages.generationStatus, "PROCESSING"),
        ),
      )
      .for("update")
      .limit(1);
    if (!userMessage) {
      return { kind: "conflict" as const, error: "This message is no longer available. Please refresh the conversation." };
    }

    const [assistantMessage] = await tx
      .insert(conversationMessages)
      .values({
        conversationId: ownedConversation.id,
        sender: "ASSISTANT",
        content: answer.content,
        resourceRecommendations: answer.resourceRecommendations,
        replyToMessageId: userMessage.id,
        generationStatus: "COMPLETED",
      })
      .returning();
    const extractedNeeds = extractIdentifiedChallenges(answer.content);
    for (const need of extractedNeeds) {
      const existingNeeds = await tx.select({
        id: organizationalNeeds.id,
        conversationId: organizationalNeeds.conversationId,
        canonicalKey: organizationalNeeds.canonicalKey,
        challenge: organizationalNeeds.challenge,
        description: organizationalNeeds.description,
      })
        .from(organizationalNeeds)
        .where(and(
          eq(organizationalNeeds.organizationId, organizationId),
          eq(organizationalNeeds.category, need.category),
        ))
        .for("update");
      const duplicate = existingNeeds.find((existing) => sameNeedDescription(existing, need));
      if (duplicate) {
        if (!duplicate.conversationId) {
          await tx.update(organizationalNeeds)
            .set({ conversationId: ownedConversation.id })
            .where(and(
              eq(organizationalNeeds.id, duplicate.id),
              sql`${organizationalNeeds.conversationId} IS NULL`,
            ));
        }
        continue;
      }
      await tx.insert(organizationalNeeds).values({
        organizationId,
        conversationId: ownedConversation.id,
        category: need.category,
        canonicalKey: need.canonicalKey,
        challenge: need.description.slice(0, 240),
        description: need.description,
        relevantContext: "",
        status: "ACTIVE",
      }).onConflictDoNothing({
        target: [
          organizationalNeeds.organizationId,
          organizationalNeeds.category,
          organizationalNeeds.canonicalKey,
        ],
      });
    }
    const now = new Date();
    await tx
      .update(conversationMessages)
      .set({ generationStatus: "COMPLETED", updatedAt: now })
      .where(eq(conversationMessages.id, userMessage.id));
    await tx
      .update(conversations)
      .set({ updatedAt: now })
      .where(eq(conversations.id, ownedConversation.id));

    return {
      kind: "completed" as const,
      conversationId: ownedConversation.id,
      title: ownedConversation.title,
      userMessage: {
        id: userMessage.id,
        sender: "USER" as const,
        content: userMessage.content,
        requestId: userMessage.requestId,
        generationStatus: "COMPLETED" as const,
        createdAt: userMessage.createdAt,
      },
      assistantMessage: {
        id: assistantMessage.id,
        sender: "ASSISTANT" as const,
        content: assistantMessage.content,
        requestId: assistantMessage.requestId,
        generationStatus: "COMPLETED" as const,
        createdAt: assistantMessage.createdAt,
        resourceRecommendations: assistantMessage.resourceRecommendations,
      },
    };
  });
}
