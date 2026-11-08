import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { AccountLayout } from "@/components/account-layout";
import { DemoNotice } from "@/components/registration-form";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { getPublishedEvent } from "@/lib/events";
import { getNonprofitProfile } from "@/lib/profile";
import { z } from "zod";

function formatEventDate(value: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en", { ...options, timeZone: "UTC" }).format(value);
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
    return (
      <AccountLayout eyebrow="Event details" title="Sign in to explore opportunities." description="Event details are available to nonprofit staff.">
        <DemoNotice>{error.message}</DemoNotice>
      </AccountLayout>
    );
  }
  if (!user) redirect("/login");
  if (user.role !== "NONPROFIT_STAFF" || !user.organizationId) redirect("/admin");

  const { eventId } = await params;
  const id = z.string().uuid().safeParse(eventId);
  if (!id.success) notFound();
  const [event, profile] = await Promise.all([
    getPublishedEvent(id.data),
    getNonprofitProfile(user.id),
  ]);
  if (!event) notFound();

  return (
    <WorkspaceLayout
      role="NONPROFIT_STAFF"
      username={user.username}
      displayName={user.fullName}
      organizationName={profile?.organizationName}
    >
      <div className="event-detail">
        <Link className="event-back-link" href="/events"><ArrowLeft size={15} /> All events</Link>
        <div className="event-category-list">{event.categories.map((category) => <span key={category}>{category === "HR" ? "Human Resources" : category}</span>)}</div>
        <h1>{event.title}</h1>
        {event.summary && <p className="event-detail-summary">{event.summary}</p>}
        <div className="event-detail-meta">
          <span><CalendarDays size={17} />{formatEventDate(event.startsAt, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}<small>{formatEventDate(event.startsAt, { hour: "numeric", minute: "2-digit" })}–{formatEventDate(event.endsAt, { hour: "numeric", minute: "2-digit" })} UTC</small></span>
          <span><MapPin size={17} />{event.location}</span>
        </div>
        {event.imageUrl && <Image className="event-detail-image" src={event.imageUrl} alt="" width={1000} height={600} unoptimized />}
        <article className="event-detail-description">{event.description.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</article>
        {event.registrationDeadline && <p className="event-deadline">Registration closes {formatEventDate(new Date(`${event.registrationDeadline}T00:00:00.000Z`), { month: "long", day: "numeric", year: "numeric" })}.</p>}
        {event.registrationUrl ? (
          <a className="button button-primary event-register-button" href={event.registrationUrl} target="_blank" rel="noopener noreferrer">Register for this event <ArrowUpRight size={15} /></a>
        ) : (
          <p className="event-registration-unavailable">Registration details are not available yet. Contact the event organizer for more information.</p>
        )}
      </div>
    </WorkspaceLayout>
  );
}
