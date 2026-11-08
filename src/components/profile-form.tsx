"use client";

import { useState } from "react";
import { ArrowRight, Check, Info, Pencil, X } from "lucide-react";
import { SUPPORT_AREAS } from "@/lib/validation";

export type ProfileData = {
  fullName: string;
  email: string;
  username: string;
  organizationName: string;
  website: string | null;
  primaryMission: string;
  communitiesServed: string;
  paidStaffCount: number;
  volunteerCount: number;
  operationalChallenges: string;
  supportAreas: (typeof SUPPORT_AREAS)[number][];
  otherSupportArea: string | null;
};

export function ProfileForm({ profile }: { profile: ProfileData }) {
  const [profileData, setProfileData] = useState(profile);
  const [editing, setEditing] = useState(false);
  const [areas, setAreas] = useState<ProfileData["supportAreas"]>(profile.supportAreas);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);

  function toggleArea(area: ProfileData["supportAreas"][number]) {
    setAreas((current) =>
      current.includes(area) ? current.filter((value) => value !== area) : [...current, area],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved("");
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: data.get("fullName"),
          email: data.get("email"),
          username: data.get("username"),
          organizationName: data.get("organizationName"),
          website: data.get("website") || "",
          primaryMission: data.get("primaryMission"),
          communitiesServed: data.get("communitiesServed"),
          paidStaffCount: Number(data.get("paidStaffCount")),
          volunteerCount: Number(data.get("volunteerCount")),
          operationalChallenges: data.get("operationalChallenges"),
          supportAreas: areas,
          otherSupportArea: data.get("otherSupportArea") ?? "",
        }),
      });
      const result = (await response.json()) as {
        message?: string;
        error?: string;
        details?: { fieldErrors?: Record<string, string[] | undefined> };
      };
      if (!response.ok) {
        const fieldError = Object.values(result.details?.fieldErrors ?? {}).flat()[0];
        setError(fieldError ?? result.error ?? "We could not save your profile.");
        return;
      }
      setProfileData({
        fullName: String(data.get("fullName")),
        email: String(data.get("email")),
        username: String(data.get("username")),
        organizationName: String(data.get("organizationName")),
        website: String(data.get("website") || "") || null,
        primaryMission: String(data.get("primaryMission")),
        communitiesServed: String(data.get("communitiesServed")),
        paidStaffCount: Number(data.get("paidStaffCount")),
        volunteerCount: Number(data.get("volunteerCount")),
        operationalChallenges: String(data.get("operationalChallenges")),
        supportAreas: areas,
        otherSupportArea: String(data.get("otherSupportArea") || "") || null,
      });
      setSaved(result.message ?? "Profile saved.");
      setEditing(false);
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="profile-view-wrap">
        <div className="profile-view-actions">
          <p>Review your organization’s information. You can update it whenever things change.</p>
          <button type="button" className="button button-outline" onClick={() => {
            setAreas(profileData.supportAreas);
            setError("");
            setEditing(true);
          }}>
            <Pencil size={15} /> Edit profile
          </button>
        </div>
        {saved && <p className="profile-saved" role="status"><Check size={15} />{saved}</p>}
        <div className="profile-view">
          <section className="profile-section" id="account">
            <div className="profile-section-heading"><span>01</span><div><h2>Your account</h2><p>Personal details for your Capacity Connect account.</p></div></div>
            <dl className="profile-details">
              <ProfileDetail label="Full name" value={profileData.fullName} />
              <ProfileDetail label="Email address" value={profileData.email} />
              <ProfileDetail label="Username" value={profileData.username} />
            </dl>
          </section>
          <section className="profile-section" id="organization">
            <div className="profile-section-heading"><span>02</span><div><h2>Your organization</h2><p>Organization details connected to your account.</p></div></div>
            <dl className="profile-details">
              <ProfileDetail label="Organization name" value={profileData.organizationName} />
              <ProfileDetail label="Organization website" value={profileData.website ?? "Not added"} />
            </dl>
          </section>
          <section className="profile-section">
            <div className="profile-section-heading"><span>03</span><div><h2>Organization orientation</h2><p>Your answers help Capacity Connect understand where support can make a difference.</p></div></div>
            <dl className="profile-details profile-details-stacked">
              <ProfileDetail label="Primary mission" value={profileData.primaryMission} />
              <ProfileDetail label="Communities or populations served" value={profileData.communitiesServed} />
              <ProfileDetail label="Paid staff members" value={String(profileData.paidStaffCount)} />
              <ProfileDetail label="Volunteers" value={String(profileData.volunteerCount)} />
              <ProfileDetail label="Biggest operational challenges" value={profileData.operationalChallenges} />
              <div className="profile-detail profile-detail-wide">
                <dt>Areas needing support</dt>
                <dd className="profile-area-list">
                  {profileData.supportAreas.length > 0
                    ? profileData.supportAreas.map((area) => <span className="profile-area" key={area}>{area}</span>)
                    : "None selected"}
                  {profileData.otherSupportArea && <span className="profile-area">{profileData.otherSupportArea}</span>}
                </dd>
              </div>
            </dl>
          </section>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <form className="profile-form" onSubmit={handleSubmit} noValidate>
      <section className="profile-section" id="account">
        <div className="profile-section-heading"><span>01</span><div><h2>Your account</h2><p>Personal details for your Capacity Connect account.</p></div></div>
        <div className="profile-grid">
          <div className="field">
            <label htmlFor="fullName">Full name</label>
            <input id="fullName" name="fullName" required minLength={2} maxLength={160} defaultValue={profileData.fullName} className="input" />
          </div>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" required maxLength={254} defaultValue={profileData.email} className="input" />
          </div>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input id="username" name="username" required minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" defaultValue={profileData.username} className="input" />
          </div>
        </div>
      </section>
      <section className="profile-section" id="organization">
        <div className="profile-section-heading"><span>02</span><div><h2>Your organization</h2><p>Keep your organization details up to date.</p></div></div>
        <div className="profile-grid">
          <div className="field">
            <label htmlFor="organizationName">Organization name</label>
            <input id="organizationName" name="organizationName" required minLength={2} maxLength={200} defaultValue={profileData.organizationName} className="input" />
          </div>
          <div className="field">
            <label htmlFor="website">Organization website <span className="optional">(optional)</span></label>
            <input id="website" name="website" type="url" defaultValue={profileData.website ?? ""} placeholder="https://yourorganization.org" className="input" />
          </div>
        </div>
      </section>
      <section className="profile-section">
        <div className="profile-section-heading"><span>03</span><div><h2>Organization orientation</h2><p>Your answers live here, and can be updated whenever things change.</p></div></div>
        <div className="profile-grid">
          <div className="field profile-field-wide">
            <label htmlFor="primaryMission">Primary mission</label>
            <textarea id="primaryMission" name="primaryMission" required minLength={10} maxLength={5000} defaultValue={profileData.primaryMission} rows={4} className="input textarea" />
          </div>
          <div className="field profile-field-wide">
            <label htmlFor="communitiesServed">Communities or populations served</label>
            <textarea id="communitiesServed" name="communitiesServed" required minLength={5} maxLength={5000} defaultValue={profileData.communitiesServed} rows={4} className="input textarea" />
          </div>
          <div className="field">
            <label htmlFor="paidStaffCount">Paid staff members</label>
            <input id="paidStaffCount" name="paidStaffCount" type="number" min="0" max="1000000" step="1" required defaultValue={profileData.paidStaffCount} className="input" />
          </div>
          <div className="field">
            <label htmlFor="volunteerCount">Volunteers</label>
            <input id="volunteerCount" name="volunteerCount" type="number" min="0" max="10000000" step="1" required defaultValue={profileData.volunteerCount} className="input" />
          </div>
          <div className="field profile-field-wide">
            <label htmlFor="operationalChallenges">Biggest operational challenges</label>
            <textarea id="operationalChallenges" name="operationalChallenges" required minLength={10} maxLength={5000} defaultValue={profileData.operationalChallenges} rows={4} className="input textarea" />
          </div>
          <fieldset className="field support-fieldset profile-field-wide">
            <legend className="field-label">Areas needing support</legend>
            <span className="field-hint support-instruction">Select all that apply.</span>
            <div className="support-options">
              {SUPPORT_AREAS.map((area) => <label key={area} className={`support-option${areas.includes(area) ? " selected" : ""}`}>
                <input type="checkbox" checked={areas.includes(area)} onChange={() => toggleArea(area)} />
                <span className="custom-checkbox">{areas.includes(area) && <Check size={13} />}</span>
                <span>{area}</span>
              </label>)}
            </div>
            {areas.includes("Other") && <div className="field other-field">
              <label htmlFor="otherSupportArea">Other support area</label>
              <input id="otherSupportArea" name="otherSupportArea" required minLength={1} maxLength={240} defaultValue={profileData.otherSupportArea ?? ""} className="input" />
            </div>}
          </fieldset>
        </div>
      </section>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="profile-submit">
        <p><Info size={14} /> Changes are saved to your account when submitted.</p>
        <div className="profile-edit-actions">
          <button type="button" className="button button-outline" disabled={saving} onClick={() => {
            setAreas(profileData.supportAreas);
            setError("");
            setEditing(false);
          }}><X size={15} /> Cancel</button>
          <button type="submit" className="button button-primary" disabled={saving}>{saving ? "Saving..." : "Save profile"} <ArrowRight size={16} /></button>
        </div>
      </div>
    </form>
  );
}

function ProfileDetail({ label, value }: { label: string; value: string }) {
  return <div className="profile-detail"><dt>{label}</dt><dd>{value || "Not provided"}</dd></div>;
}
