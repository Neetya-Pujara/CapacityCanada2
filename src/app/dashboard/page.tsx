import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ArrowUpRight, CalendarDays, MessageCircle, UserRound } from "lucide-react";
import { ConversationPrompt } from "@/components/conversation-prompt";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { getCurrentUser } from "@/lib/auth";
import { listUserConversations } from "@/lib/conversations";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { getNonprofitProfile } from "@/lib/profile";
import { AccountLayout } from "@/components/account-layout";
import { DemoNotice } from "@/components/registration-form";
import { formatDate } from "@/lib/date-format";
import { getRecommendedEventsForOrganization } from "@/lib/events";

export default async function DashboardPage() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
    return (
      <AccountLayout eyebrow="Your workspace" title="A clear first step for your organization." description="Your dashboard appears here after your account and database connection are ready.">
        <div className="form-heading">
          <span className="form-kicker">Database setup required</span>
          <h1>Your dashboard is almost ready.</h1>
          <p>Connect Tiger Data and sign in to see your organization’s workspace.</p>
        </div>
        <DemoNotice>Set DATABASE_URL in .env.local, apply the database migrations, then log in.</DemoNotice>
      </AccountLayout>
    );
  }

  if (!user) redirect("/login");
  if (user.role !== "NONPROFIT_STAFF") redirect("/admin");

  const [profile, conversations] = await Promise.all([
    getNonprofitProfile(user.id),
    listUserConversations(user.id, 4),
  ]);
  if (!profile) {
    return (
      <WorkspaceLayout role="NONPROFIT_STAFF" username={user.username} displayName={user.fullName}>
        <div className="workspace-page-heading">
          <span className="page-eyebrow"><span className="page-eyebrow-dot" /> DASHBOARD</span>
          <h1>Your organization profile is missing.</h1>
          <p>The assistant uses your organization details to keep suggestions relevant.</p>
        </div>
        <DemoNotice>Contact your platform administrator. No organization data has been fabricated.</DemoNotice>
      </WorkspaceLayout>
    );
  }
  const recommendations = profile.organizationId
    ? await getRecommendedEventsForOrganization(profile.organizationId, profile)
    : [];

  return (
    <WorkspaceLayout
      role="NONPROFIT_STAFF"
      username={user.username}
      displayName={user.fullName}
      organizationName={profile.organizationName}
    >
      <div className="dashboard-welcome">
        <div>
          <span className="page-eyebrow"><span className="page-eyebrow-dot" /> YOUR WORKSPACE</span>
          <h1>Welcome back, <em>{user.fullName.split(" ")[0]}.</em></h1>
          <p>{profile.organizationName} · Your mission is the starting point.</p>
        </div>
        <Link className="dashboard-profile-link" href="/profile"><UserRound size={16} /> Organization profile <ArrowUpRight size={14} /></Link>
      </div>

      <ConversationPrompt />

      <section className="dashboard-recommendations">
        <div className="dashboard-section-heading">
          <div><span className="dashboard-kicker">OPPORTUNITIES THAT FIT</span><h2>Recommended for Your Organization</h2></div>
          <Link href="/events">Explore all events <ArrowUpRight size={15} /></Link>
        </div>
        {recommendations.length ? (
          <div className="dashboard-event-list">
            {recommendations.map(({ event, reason, categories }) => (
              <article className="dashboard-event-card" key={event.id}>
                <div className="dashboard-event-topline">
                  <span><CalendarDays size={15} />{formatDate(event.startsAt, { month: "short", day: "numeric", year: "numeric" })} · {formatDate(event.startsAt, { hour: "numeric", minute: "2-digit" })} UTC</span>
                  <div className="event-category-list">{categories.map((category) => <span key={category}>{category}</span>)}</div>
                </div>
                <h3><Link href={`/events/${encodeURIComponent(event.id)}`}>{event.title}</Link></h3>
                <p>{event.summary || event.description.slice(0, 200)}</p>
                <div className="dashboard-event-footer"><span>{reason}</span><Link href={`/events/${encodeURIComponent(event.id)}`}>View details <ArrowRight size={14} /></Link></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="dashboard-recommendations-empty">
            <p>No published events currently match the needs in your organization profile.</p>
            <Link href="/events">Browse all published events <ArrowRight size={14} /></Link>
          </div>
        )}
      </section>

      <section className="dashboard-guidance">
        <span className="dashboard-guidance-mark"><MessageCircle size={18} /></span>
        <div>
          <h2>How the assistant can help</h2>
          <p>Think through a challenge, explore realistic approaches, and decide on one next step. Suggestions draw on the mission, team size, communities, and support needs you’ve shared.</p>
          <p className="dashboard-guidance-note">The assistant is a thinking partner, not a substitute for professional advice. Verified resource matching will arrive in a later phase.</p>
        </div>
        <Link href="/assistant">Meet your assistant <ArrowRight size={15} /></Link>
      </section>

      <section className="dashboard-recent">
        <div className="dashboard-section-heading">
          <div><span className="dashboard-kicker">PICK UP WHERE YOU LEFT OFF</span><h2>Recent conversations</h2></div>
          <Link href="/history">View history <ArrowUpRight size={15} /></Link>
        </div>
        {conversations.length > 0 ? (
          <ul className="dashboard-conversation-list">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <Link href={`/assistant?conversationId=${encodeURIComponent(conversation.id)}`}>
                  <span><MessageCircle size={17} /></span>
                  <strong>{conversation.title}</strong>
                  <small>{formatDate(conversation.updatedAt, { month: "short", day: "numeric" })}</small>
                  <ArrowUpRight className="dashboard-recent-arrow" size={16} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="dashboard-no-conversations">Your conversations will appear here after you start one.</p>
        )}
      </section>
    </WorkspaceLayout>
  );
}
