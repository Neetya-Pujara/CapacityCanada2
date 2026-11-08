"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CalendarDays, Check, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { SUPPORT_AREAS } from "@/lib/validation";

export type AdminEvent = {
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
  status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
};

type EventForm = Omit<AdminEvent, "id" | "createdAt" | "updatedAt" | "startsAt" | "endsAt" | "registrationDeadline"> & {
  startsAt: string;
  endsAt: string;
  registrationDeadline: string;
};

const STATUS_LABELS: Record<AdminEvent["status"], string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  CANCELLED: "Cancelled",
  ARCHIVED: "Archived",
};

function categoryLabel(category: string) {
  return category === "HR" ? "Human Resources" : category;
}

function localDateTime(value?: string) {
  return value ? new Date(value).toISOString().slice(0, 16) : "";
}

function emptyForm(): EventForm {
  const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
  return {
    title: "",
    summary: "",
    description: "",
    categories: [],
    startsAt: localDateTime(startsAt.toISOString()),
    endsAt: localDateTime(endsAt.toISOString()),
    location: "",
    registrationUrl: null,
    registrationDeadline: "",
    imageUrl: null,
    status: "DRAFT",
  };
}

function toForm(event: AdminEvent): EventForm {
  return {
    title: event.title,
    summary: event.summary,
    description: event.description,
    categories: event.categories,
    startsAt: localDateTime(event.startsAt),
    endsAt: localDateTime(event.endsAt),
    location: event.location,
    registrationUrl: event.registrationUrl,
    registrationDeadline: event.registrationDeadline?.slice(0, 10) ?? "",
    imageUrl: event.imageUrl,
    status: event.status,
  };
}

function eventDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value)) + " UTC";
}

function toIso(value: string) {
  return value ? new Date(`${value}:00Z`).toISOString() : null;
}

export function AdminEventsManager({ initialEvents }: { initialEvents: AdminEvent[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<AdminEvent | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const visibleEvents = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return events.filter((event) =>
      (!category || event.categories.includes(category as EventForm["categories"][number])) &&
      (!status || event.status === status) &&
      (!term || `${event.title} ${event.summary} ${event.description}`.toLocaleLowerCase().includes(term)),
    );
  }, [events, search, category, status]);

  function startCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
    setError("");
    setNotice("");
  }

  function startEdit(event: AdminEvent) {
    setEditing(event);
    setForm(toForm(event));
    setFormOpen(true);
    setError("");
    setNotice("");
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setError("");
  }

  function toggleCategory(value: EventForm["categories"][number]) {
    setForm((current) => ({
      ...current,
      categories: current.categories.includes(value)
        ? current.categories.filter((item) => item !== value)
        : [...current.categories, value],
    }));
  }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!form.categories.length) {
      setError("Choose at least one event category.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        editing ? `/api/admin/events/${encodeURIComponent(editing.id)}` : "/api/admin/events",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            startsAt: toIso(form.startsAt),
            endsAt: toIso(form.endsAt),
            registrationDeadline: form.registrationDeadline || null,
            registrationUrl: form.registrationUrl?.trim() || null,
            imageUrl: form.imageUrl?.trim() || null,
          }),
        },
      );
      const result = await response.json() as { event?: AdminEvent; error?: string; details?: { fieldErrors?: Record<string, string[] | undefined> } };
      if (!response.ok || !result.event) {
        const fieldError = Object.values(result.details?.fieldErrors ?? {}).flat()[0];
        setError(fieldError ?? result.error ?? "We could not save this event.");
        return;
      }
      const saved = result.event;
      setEvents((current) => editing
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...current]);
      setNotice(editing ? "Event updated." : "Event created.");
      closeForm();
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function removeEvent(event: AdminEvent) {
    if (!window.confirm(`Delete “${event.title}”? Associated notifications will remain but the event will be unavailable.`)) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/events/${encodeURIComponent(event.id)}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "We could not delete this event.");
        return;
      }
      setEvents((current) => current.filter((item) => item.id !== event.id));
      setNotice("Event deleted.");
      if (editing?.id === event.id) closeForm();
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    }
  }

  return (
    <div className="event-management">
      <div className="event-toolbar">
        <div className="event-filters">
          <label className="resource-search">
            <span className="visually-hidden">Search events</span>
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
          <label className="field">
            <span className="visually-hidden">Filter by status</span>
            <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <button type="button" className="button button-primary" onClick={startCreate}><Plus size={16} /> Add event</button>
      </div>

      {(notice || error) && (
        <p className={error ? "resource-notice is-error" : "resource-notice"} role={error ? "alert" : "status"}>
          {!error && <Check size={15} aria-hidden="true" />}{error || notice}
        </p>
      )}

      {formOpen && (
        <form className="profile-section event-editor" onSubmit={(event) => void saveEvent(event)}>
          <div className="resource-editor-heading">
            <div><h2>{editing ? "Edit event" : "Create an event"}</h2><p>Event times are entered and displayed in UTC.</p></div>
            <button type="button" className="button button-quiet" onClick={closeForm} aria-label="Close event form"><X size={17} /></button>
          </div>
          <div className="profile-grid">
            <label className="field profile-field-wide"><span>Event title <i>*</i></span><input className="input" required maxLength={240} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
            <label className="field profile-field-wide"><span>Short summary</span><input className="input" maxLength={500} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></label>
            <label className="field profile-field-wide"><span>Full description <i>*</i></span><textarea className="input textarea" required minLength={10} maxLength={12000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <fieldset className="event-category-field profile-field-wide">
              <legend>Categories <i>*</i></legend>
              <div>{SUPPORT_AREAS.map((area) => (
                <label key={area}><input type="checkbox" checked={form.categories.includes(area)} onChange={() => toggleCategory(area)} />{categoryLabel(area)}</label>
              ))}</div>
            </fieldset>
            <label className="field"><span>Start date and time (UTC) <i>*</i></span><input className="input" type="datetime-local" required value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></label>
            <label className="field"><span>End date and time (UTC) <i>*</i></span><input className="input" type="datetime-local" required value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></label>
            <label className="field profile-field-wide"><span>Location or online meeting information <i>*</i></span><input className="input" required maxLength={500} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
            <label className="field"><span>Registration URL</span><input className="input" type="url" maxLength={2048} value={form.registrationUrl ?? ""} onChange={(event) => setForm({ ...form, registrationUrl: event.target.value || null })} /></label>
            <label className="field"><span>Registration deadline</span><input className="input" type="date" value={form.registrationDeadline} onChange={(event) => setForm({ ...form, registrationDeadline: event.target.value })} /></label>
            <label className="field profile-field-wide"><span>Optional image URL</span><input className="input" type="url" maxLength={2048} value={form.imageUrl ?? ""} onChange={(event) => setForm({ ...form, imageUrl: event.target.value || null })} /></label>
            <label className="field profile-field-wide"><span>Event status</span><select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AdminEvent["status"] })}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          <div className="profile-submit">
            <p><CalendarDays size={14} /> Publishing notifies staff whose needs match this event.</p>
            <div><button type="button" className="button button-outline" onClick={closeForm}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? "Saving…" : form.status === "PUBLISHED" ? "Save and publish" : "Save event"}</button></div>
          </div>
        </form>
      )}

      <div className="admin-event-list">
        {visibleEvents.length ? visibleEvents.map((event) => (
          <article className="admin-event-row" key={event.id}>
            <div className="admin-event-main">
              <div className="admin-event-title"><h2>{event.title}</h2><span className={`event-status is-${event.status.toLowerCase()}`}>{STATUS_LABELS[event.status]}</span></div>
              <p>{event.summary || event.description}</p>
              <div className="admin-event-meta"><span>{eventDate(event.startsAt)}</span><span>{event.location}</span></div>
              <div className="event-category-list">{event.categories.map((item) => <span key={item}>{categoryLabel(item)}</span>)}</div>
            </div>
            <div className="admin-event-actions">
              <button type="button" className="button button-outline button-small" onClick={() => startEdit(event)}><Pencil size={14} /> Edit</button>
              <button type="button" className="button button-quiet" onClick={() => void removeEvent(event)} aria-label={`Delete ${event.title}`}><Trash2 size={15} /></button>
            </div>
          </article>
        )) : (
          <div className="events-empty"><CalendarDays size={20} /><h2>{events.length ? "No events match these filters" : "No events yet"}</h2><p>{events.length ? "Try another search or status filter." : "Create a draft or publish an opportunity for nonprofit teams."}</p></div>
        )}
      </div>
    </div>
  );
}
