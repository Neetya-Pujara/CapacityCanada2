"use client";

import { useMemo, useState, type FormEvent } from "react";
import { BookOpen, Check, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import type { ResourceCategory } from "@/lib/resources";
import { SUPPORT_AREAS } from "@/lib/validation";
import { formatDate } from "@/lib/date-format";

export type AdminResource = {
  id: string;
  title: string;
  description: string;
  url: string;
  sourceOrganization: string;
  categories: ResourceCategory[];
  lastVerifiedAt: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  seedKey: string | null;
};

type ResourceFormState = {
  title: string;
  description: string;
  url: string;
  sourceOrganization: string;
  categories: ResourceCategory[];
  lastVerifiedAt: string;
  adminNotes: string;
};

function emptyForm(today: string): ResourceFormState {
  return {
    title: "",
    description: "",
    url: "",
    sourceOrganization: "",
    categories: [],
    lastVerifiedAt: today,
    adminNotes: "",
  };
}

function formFromResource(resource: AdminResource): ResourceFormState {
  return {
    title: resource.title,
    description: resource.description,
    url: resource.url,
    sourceOrganization: resource.sourceOrganization,
    categories: resource.categories,
    lastVerifiedAt: resource.lastVerifiedAt?.slice(0, 10) ?? "",
    adminNotes: resource.adminNotes ?? "",
  };
}

function verificationLabel(value: string | null, asOfDate: string) {
  if (!value) return "Never verified";
  const verifiedAt = new Date(value);
  const yearAgo = new Date(asOfDate);
  yearAgo.setUTCFullYear(yearAgo.getUTCFullYear() - 1);
  return verifiedAt < yearAgo ? "Needs review" : "Current";
}

export function AdminResourceLibrary({
  initialResources,
  asOfDate,
}: {
  initialResources: AdminResource[];
  asOfDate: string;
}) {
  const [resources, setResources] = useState(initialResources);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<AdminResource | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ResourceFormState>(() => emptyForm(asOfDate.slice(0, 10)));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const visibleResources = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return resources.filter((resource) =>
      (!category || resource.categories.includes(category as ResourceCategory)) &&
      (!term || `${resource.title} ${resource.description}`.toLocaleLowerCase().includes(term)),
    );
  }, [resources, search, category]);

  function startCreate() {
    setEditing(null);
    setFormOpen(true);
    setForm(emptyForm(new Date().toISOString().slice(0, 10)));
    setError("");
    setNotice("");
  }

  function startEdit(resource: AdminResource) {
    setEditing(resource);
    setFormOpen(true);
    setForm(formFromResource(resource));
    setError("");
    setNotice("");
  }

  function closeForm() {
    setEditing(null);
    setFormOpen(false);
    setError("");
  }

  function toggleCategory(value: ResourceCategory) {
    setForm((current) => ({
      ...current,
      categories: current.categories.includes(value)
        ? current.categories.filter((item) => item !== value)
        : [...current.categories, value],
    }));
  }

  async function saveResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!form.categories.length) {
      setError("Choose at least one category.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        editing ? `/api/admin/resources/${encodeURIComponent(editing.id)}` : "/api/admin/resources",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            url: form.url,
            sourceOrganization: form.sourceOrganization,
            categories: form.categories,
            lastVerifiedAt: form.lastVerifiedAt || null,
            adminNotes: form.adminNotes.trim() || null,
          }),
        },
      );
      const result = await response.json() as { resource?: AdminResource; error?: string; details?: { fieldErrors?: Record<string, string[] | undefined> } };
      if (!response.ok || !result.resource) {
        const fieldError = Object.values(result.details?.fieldErrors ?? {}).flat()[0];
        setError(fieldError ?? result.error ?? "We could not save this resource.");
        return;
      }

      const saved = result.resource;
      setResources((current) => editing
        ? current.map((resource) => resource.id === saved.id ? saved : resource)
        : [saved, ...current]);
      setNotice(editing ? "Resource updated." : "Resource added.");
      closeForm();
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function removeResource(resource: AdminResource) {
    if (!window.confirm(`Delete “${resource.title}”? This cannot be undone.`)) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/resources/${encodeURIComponent(resource.id)}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "We could not delete this resource.");
        return;
      }
      setResources((current) => current.filter((item) => item.id !== resource.id));
      setNotice("Resource deleted.");
      if (editing?.id === resource.id) closeForm();
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    }
  }

  return (
    <div className="resource-library">
      <div className="resource-library-toolbar">
        <div className="resource-library-filters">
          <label className="resource-search">
            <span className="visually-hidden">Search title or description</span>
            <Search size={16} aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search resources" />
          </label>
          <label className="field resource-category-filter">
            <span className="visually-hidden">Filter by category</span>
            <select className="input" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All categories</option>
              {SUPPORT_AREAS.map((area) => <option key={area} value={area}>{area}</option>)}
            </select>
          </label>
        </div>
        <button type="button" className="button button-primary" onClick={startCreate}>
          <Plus size={16} /> Add resource
        </button>
      </div>

      {(notice || error) && (
        <p className={error ? "resource-notice is-error" : "resource-notice"} role={error ? "alert" : "status"}>
          {!error && <Check size={15} aria-hidden="true" />}{error || notice}
        </p>
      )}

      {formOpen ? (
        <form className="profile-section resource-editor" onSubmit={(event) => void saveResource(event)}>
          <div className="resource-editor-heading">
            <div><h2>{editing ? "Edit resource" : "Add a resource"}</h2><p>Keep source details and verification dates accurate.</p></div>
            <button type="button" className="button button-quiet" onClick={closeForm} aria-label="Close resource form"><X size={17} /></button>
          </div>
          <div className="profile-grid">
            <div className="field">
              <label htmlFor="resource-title">Title</label>
              <input className="input" id="resource-title" required maxLength={240} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="resource-source">Source organization</label>
              <input className="input" id="resource-source" required maxLength={200} value={form.sourceOrganization} onChange={(event) => setForm({ ...form, sourceOrganization: event.target.value })} />
            </div>
            <div className="field field-span">
              <label htmlFor="resource-url">Resource URL</label>
              <input className="input" id="resource-url" type="url" required maxLength={2048} value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} />
            </div>
            <div className="field field-span">
              <label htmlFor="resource-description">Description</label>
              <textarea className="input textarea" id="resource-description" required minLength={10} maxLength={5000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </div>
            <fieldset className="field field-span resource-category-options">
              <legend className="field-label">Relevant categories</legend>
              <div>
                {SUPPORT_AREAS.map((area) => (
                  <label key={area}>
                    <input type="checkbox" checked={form.categories.includes(area)} onChange={() => toggleCategory(area)} />
                    {area}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="field">
              <label htmlFor="resource-verified">Last verified</label>
              <input className="input" id="resource-verified" type="date" value={form.lastVerifiedAt} onChange={(event) => setForm({ ...form, lastVerifiedAt: event.target.value })} />
              <small className="field-hint">Leave blank if it has not been verified.</small>
            </div>
            <div className="field">
              <label htmlFor="resource-notes">Admin notes <span className="optional">Optional</span></label>
              <textarea className="input textarea resource-notes-input" id="resource-notes" maxLength={5000} value={form.adminNotes} onChange={(event) => setForm({ ...form, adminNotes: event.target.value })} />
            </div>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="profile-submit">
            <p><BookOpen size={14} /> Resources are only described as verified when a verification date is recorded.</p>
            <div className="resource-form-actions">
              <button type="button" className="button button-outline" onClick={closeForm}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add resource"}</button>
            </div>
          </div>
        </form>
      ) : null}

      {visibleResources.length ? (
        <div className="resource-list" aria-label="Resources">
          {visibleResources.map((resource) => {
            const status = verificationLabel(resource.lastVerifiedAt, asOfDate);
            return (
              <article className="profile-section resource-row" key={resource.id}>
                <div className="resource-row-main">
                  <div className="resource-row-heading">
                    <div><h2>{resource.title}</h2><span className={`resource-verification ${status === "Current" ? "is-current" : "is-review"}`}>{status}</span></div>
                    <div className="resource-actions">
                      <button type="button" className="button button-outline button-small" onClick={() => startEdit(resource)}><Pencil size={14} /> Edit</button>
                      <button type="button" className="button button-outline button-small resource-delete" onClick={() => void removeResource(resource)}><Trash2 size={14} /> Delete</button>
                    </div>
                  </div>
                  <p>{resource.description}</p>
                  <div className="resource-meta">
                    <span>{resource.sourceOrganization}</span>
                    <span>Added {formatDate(resource.createdAt)}</span>
                    <span>{resource.lastVerifiedAt ? `Verified ${formatDate(resource.lastVerifiedAt)}` : "No verification date"}</span>
                    <span>{resource.seedKey ? "Seeded resource" : "Added by admin"}</span>
                  </div>
                  <div className="resource-tags">{resource.categories.map((area) => <span key={area}>{area}</span>)}</div>
                  <a className="resource-url" href={resource.url} target="_blank" rel="noreferrer">{resource.url}</a>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="resource-empty">
          <BookOpen size={20} aria-hidden="true" />
          <h2>{resources.length ? "No resources match those filters." : "The resource library is empty."}</h2>
          <p>{resources.length ? "Try another search or category." : "Add a verified resource to make it available for recommendations."}</p>
        </div>
      )}
    </div>
  );
}
