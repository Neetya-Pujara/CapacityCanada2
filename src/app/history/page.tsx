import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Plus } from "lucide-react";
import { AccountLayout } from "@/components/account-layout";
import { ConversationHistoryList, type ConversationListItem } from "@/components/conversation-history-list";
import { DemoNotice } from "@/components/registration-form";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { getCurrentUser } from "@/lib/auth";
import { listUserConversations } from "@/lib/conversations";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { getNonprofitProfile } from "@/lib/profile";

export default async function ConversationHistoryPage() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
    return (
      <AccountLayout eyebrow="Conversation history" title="Come back to the conversations that matter." description="Your conversation history is saved to your nonprofit account.">
        <div className="form-heading">
          <span className="form-kicker">Database setup required</span>
          <h1>History is not available yet.</h1>
          <p>Connect the database and sign in to view saved conversations.</p>
        </div>
        <DemoNotice>Set DATABASE_URL in .env.local, apply migrations, then log in.</DemoNotice>
      </AccountLayout>
    );
  }

  if (!user) redirect("/login");
  if (user.role !== "NONPROFIT_STAFF") redirect("/admin");

  const [profile, conversations] = await Promise.all([
    getNonprofitProfile(user.id),
    listUserConversations(user.id, 100),
  ]);
  if (!profile) {
    return (
      <WorkspaceLayout role="NONPROFIT_STAFF" username={user.username} displayName={user.fullName}>
        <DemoNotice>Your organization profile could not be found.</DemoNotice>
      </WorkspaceLayout>
    );
  }

  const items: ConversationListItem[] = conversations.map((conversation) => ({
    ...conversation,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  }));

  return (
    <WorkspaceLayout
      role="NONPROFIT_STAFF"
      username={user.username}
      displayName={user.fullName}
      organizationName={profile.organizationName}
    >
      <div className="workspace-page-heading history-page-heading">
        <span className="page-eyebrow"><span className="page-eyebrow-dot" /> YOUR THINKING SPACE</span>
        <h1>Conversation history</h1>
        <p>Return to a previous challenge or start a fresh conversation when something new comes up.</p>
        <Link className="button button-primary" href="/assistant"><Plus size={16} /> New conversation <ArrowUpRight size={15} /></Link>
      </div>
      <ConversationHistoryList initialConversations={items} />
    </WorkspaceLayout>
  );
}
