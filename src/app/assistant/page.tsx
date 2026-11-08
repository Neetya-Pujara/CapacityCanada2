import { notFound, redirect } from "next/navigation";
import { AccountLayout } from "@/components/account-layout";
import { AssistantChat, type AssistantChatMessage } from "@/components/assistant-chat";
import { DemoNotice } from "@/components/registration-form";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { getCurrentUser } from "@/lib/auth";
import { getUserConversation } from "@/lib/conversations";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { getNonprofitProfile } from "@/lib/profile";
import { z } from "zod";

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ conversationId?: string }>;
}) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
    return (
      <AccountLayout eyebrow="AI assistant" title="A thoughtful place to think it through." description="Connect the database and Gemini service to start a conversation shaped around your organization.">
        <div className="form-heading">
          <span className="form-kicker">Setup required</span>
          <h1>Your assistant is not ready yet.</h1>
          <p>Conversation history requires a database-backed nonprofit account.</p>
        </div>
        <DemoNotice>Set DATABASE_URL in .env.local, apply migrations, and sign in with a nonprofit staff account.</DemoNotice>
      </AccountLayout>
    );
  }

  if (!user) redirect("/login");
  if (user.role !== "NONPROFIT_STAFF") redirect("/admin");

  const params = await searchParams;
  let conversation;
  if (params.conversationId) {
    const parsedId = z.string().uuid().safeParse(params.conversationId);
    if (!parsedId.success) notFound();
    conversation = await getUserConversation(user.id, parsedId.data);
    if (!conversation) notFound();
  }

  const profile = await getNonprofitProfile(user.id);
  if (!profile) {
    return (
      <WorkspaceLayout role="NONPROFIT_STAFF" username={user.username} displayName={user.fullName}>
        <div className="workspace-page-heading">
          <span className="page-eyebrow"><span className="page-eyebrow-dot" /> AI ASSISTANT</span>
          <h1>Your organization profile is needed first.</h1>
          <p>Once your organization context is available, the assistant can offer more relevant guidance.</p>
        </div>
        <DemoNotice>Contact your platform administrator to restore your organization profile.</DemoNotice>
      </WorkspaceLayout>
    );
  }

  const initialMessages: AssistantChatMessage[] = (conversation?.messages ?? []).map((message) => ({
    ...message,
    createdAt: message.createdAt.toISOString(),
  }));
  return (
    <WorkspaceLayout
      role="NONPROFIT_STAFF"
      username={user.username}
      displayName={user.fullName}
      organizationName={profile.organizationName}
    >
      <AssistantChat
        initialConversationId={conversation?.id}
        initialTitle={conversation?.title}
        initialMessages={initialMessages}
        displayName={user.fullName}
        organizationName={profile.organizationName}
        key={conversation?.id ?? "new"}
      />
    </WorkspaceLayout>
  );
}
