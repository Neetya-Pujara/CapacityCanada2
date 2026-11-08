"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, Search } from "lucide-react";
import { SUPPORT_AREAS } from "@/lib/validation";

export type StaffEvent = {
  id: string;
  title: string;
  summary: string;
  description: string;
  categories: (typeof SUPPORT_AREAS)[number][];
  startsAt: string;
  endsAt: string;
  location: string;
  registrationUrl: string | null;
  registrationDeadline: string | null;
  imageUrl: string | null;
  status: "PUBLISHED";
};

function categoryLabel(category: string) {
  return category === "HR" ? "Human Resources" : category;
}

function eventDate(start: string, end: string) {
  const date = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(start));
  const time = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
  return `${date} · ${time.format(new Date(start))}–${time.format(new Date(end))} UTC`;
}

export function StaffEventsBrowser({ initialEvents }: { initialEvents: StaffEvent[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const visibleEvents = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return initialEvents.filter((event) =>
      (!category || event.categories.includes(category as StaffEvent["categories"][number])) &&
      (!term || `${event.title} ${event.summary} ${event.description}`.toLocaleLowerCase().includes(term)),
    );
  }, [initialEvents, search, category]);

  return (
    <div className="staff-events-browser">
      <div className="event-toolbar">
        <div className="event-filters">
          <label className="resource-search">
            <span className="visually-hidden">Search event title or description</span>
            <Search size={16} aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search events" />
          </label>
          <label className="field">
            <span className="visually-hidden">Filter by category</span>
            <select className="input" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All categories</option>
              {SUPPORT_AREAS.map((area) => <option key={area} value={area}>{categoryLabel(area)}</option>)}
            </select>
          </label>
        </div>
        <span className="events-result-count">{visibleEvents.length} {visibleEvents.length === 1 ? "event" : "events"}</span>
      </div>

      {visibleEvents.length ? (
        <div className="staff-event-grid">
          {visibleEvents.map((event) => (
            <article className="staff-event-card" key={event.id}>
              <div className="event-category-list">{event.categories.map((item) => <span key={item}>{categoryLabel(item)}</span>)}</div>
              <h2><Link href={`/events/${encodeURIComponent(event.id)}`}>{event.title}</Link></h2>
              <p>{event.summary || event.description.slice(0, 240)}</p>
              <div className="staff-event-meta"><span><CalendarDays size={15} />{eventDate(event.startsAt, event.endsAt)}</span><span><MapPin size={15} />{event.location}</span></div>
              <Link className="event-card-link" href={`/events/${encodeURIComponent(event.id)}`}>View event details <ArrowUpRight size={15} /></Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="events-empty">
          <CalendarDays size={21} />
          <h2>{initialEvents.length ? "No events match your filters" : "New opportunities are on their way"}</h2>
          <p>{initialEvents.length ? "Try a different search or category." : "There are no published events right now. Check back soon for workshops and capacity-building opportunities."}</p>
        </div>
      )}
    </div>
  );
}
