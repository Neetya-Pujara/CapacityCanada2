"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Info } from "lucide-react";
import { PasswordField } from "@/components/password-field";
import { SUPPORT_AREAS } from "@/lib/validation";

const steps = [
  "Your account",
  "Your mission",
  "Your community",
  "Paid staff",
  "Volunteers",
  "Your challenges",
  "Support areas",
];

type FormValues = Record<string, string>;

export function RegistrationForm() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormValues>({});
  const [areas, setAreas] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function toggleArea(area: string) {
    setAreas((current) =>
      current.includes(area) ? current.filter((value) => value !== area) : [...current, area],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const currentValues = Object.fromEntries(new FormData(form).entries());
    if (step === 0) {
      if (currentValues.password !== currentValues["confirm-password"]) {
        setError("Those passwords do not match. Check them and try again.");
        return;
      }
      if (new TextEncoder().encode(String(currentValues.password)).length > 72) {
        setError("Password must be no more than 72 UTF-8 bytes.");
        return;
      }
    }

    const nextValues = { ...values, ...currentValues } as FormValues;
    setValues(nextValues);
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    if (!areas.length) {
      setError("Choose at least one area so we know where to start.");
      return;
    }
    if (areas.includes("Other") && !String(nextValues.otherSupportArea ?? "").trim()) {
      setError("Tell us what other kind of support would help.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: nextValues["full-name"],
          email: nextValues.email,
          username: nextValues.username,
          password: nextValues.password,
          confirmPassword: nextValues["confirm-password"],
          organizationName: nextValues.organization,
          website: nextValues.website,
          primaryMission: nextValues.mission,
          communitiesServed: nextValues.communities,
          paidStaffCount: Number(nextValues.staff),
          volunteerCount: Number(nextValues.volunteers),
          operationalChallenges: nextValues.challenges,
          supportAreas: areas,
          otherSupportArea: nextValues.otherSupportArea ?? "",
        }),
      });
      const result = (await response.json()) as {
        message?: string;
        error?: string;
        details?: { fieldErrors?: Record<string, string[] | undefined> };
      };
      if (!response.ok) {
        const fieldError = Object.values(result.details?.fieldErrors ?? {}).flat()[0];
        setError(fieldError ?? result.error ?? "We could not create your account. Please try again.");
        return;
      }
      setValues({});
      setAreas([]);
      setNotice(result.message ?? "Your account has been created. You can now log in.");
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function goBack() {
    setError("");
    setStep((current) => Math.max(0, current - 1));
  }

  if (notice) {
    return (
      <>
        <div className="complete-screen">
          <span className="complete-icon"><Check size={30} /></span>
          <span className="form-kicker">Registration complete</span>
          <h1>Your account is ready.</h1>
          <p>{notice} Your password was securely hashed before it was saved.</p>
          <Link className="button button-primary button-wide" href="/login">Continue to login <ArrowRight size={17} /></Link>
        </div>
        <p className="privacy-note"><Info size={14} /> Your account and organization orientation are saved securely.</p>
      </>
    );
  }

  return (
    <>
      <div className="form-heading onboarding-heading">
        <span className="form-kicker">Nonprofit Staff account</span>
        <h1>{step === 0 ? "Create your account" : steps[step]}</h1>
        <p>{step === 0 ? "First, tell us how to reach you and which organization you call home." : "Share what feels useful. Your answers help us understand what support may fit."}</p>
      </div>
      <div className="progress-meta"><span>{step === 0 ? "Account details" : `Question ${step} of 6`} <span className="progress-of">· {steps[step]}</span></span><strong>{Math.round(((step + 1) / steps.length) * 100)}%</strong></div>
      <div className="progress-track" role="progressbar" aria-label="Registration progress" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={steps.length}>
        <span style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>
      <div className="step-dots" aria-hidden="true">{steps.map((title, index) => <span key={title} className={index <= step ? "step-dot is-active" : "step-dot"} />)}</div>
      <form className="account-form onboarding-form" onSubmit={handleSubmit} noValidate>
        {step === 0 && <div className="form-grid">
          <div className="field field-span">
            <label htmlFor="full-name">Full name</label>
            <input id="full-name" name="full-name" type="text" autoComplete="name" placeholder="e.g. Alex Morgan" required minLength={2} maxLength={160} defaultValue={values["full-name"]} className="input" />
          </div>
          <div className="field field-span">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="you@organization.org" required maxLength={254} defaultValue={values.email} className="input" />
          </div>
          <div className="field field-span">
            <label htmlFor="username">Username</label>
            <input id="username" name="username" type="text" autoComplete="username" placeholder="Choose a username" required minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" title="Use 3–32 letters, numbers, dots, underscores or hyphens." defaultValue={values.username} className="input" />
            <span className="field-hint">3–32 characters. Letters, numbers, . _ -</span>
          </div>
          <div className="field field-span">
            <label htmlFor="organization">Nonprofit organization name</label>
            <input id="organization" name="organization" type="text" autoComplete="organization" placeholder="Your organization's name" required minLength={2} maxLength={200} defaultValue={values.organization} className="input" />
          </div>
          <div className="field field-span">
            <label htmlFor="website">Organization website <span className="optional">(optional)</span></label>
            <input id="website" name="website" type="url" autoComplete="url" placeholder="https://yourorganization.org" defaultValue={values.website} className="input" />
          </div>
          <PasswordField id="password" label="Password" autoComplete="new-password" minLength={8} defaultValue={values.password} hint="At least 8 characters" />
          <PasswordField id="confirm-password" label="Confirm password" autoComplete="new-password" minLength={8} defaultValue={values["confirm-password"]} />
        </div>}
        {step === 1 && <div className="field">
          <label htmlFor="mission">What is your organization&apos;s primary mission?</label>
          <textarea id="mission" name="mission" required minLength={10} maxLength={5000} rows={5} defaultValue={values.mission} placeholder="What change is your organization here to make?" className="input textarea" />
          <span className="field-hint">A few sentences is plenty.</span>
        </div>}
        {step === 2 && <div className="field">
          <label htmlFor="communities">What communities or populations does your organization serve?</label>
          <textarea id="communities" name="communities" required minLength={5} maxLength={5000} rows={5} defaultValue={values.communities} placeholder="Tell us who you work alongside..." className="input textarea" />
          <span className="field-hint">Include any communities, regions, or groups that feel important.</span>
        </div>}
        {step === 3 && <div className="field">
          <label htmlFor="staff">How many paid staff members does your organization have?</label>
          <input id="staff" name="staff" type="number" min="0" max="1000000" step="1" required value={values.staff ?? ""} onChange={(event) => setValues((current) => ({ ...current, staff: event.target.value }))} placeholder="e.g. 12" className="input" />
          <span className="field-hint">Enter 0 if your organization has no paid staff.</span>
        </div>}
        {step === 4 && <div className="field">
          <label htmlFor="volunteers">How many volunteers does your organization have?</label>
          <input id="volunteers" name="volunteers" type="number" min="0" max="10000000" step="1" required value={values.volunteers ?? ""} onChange={(event) => setValues((current) => ({ ...current, volunteers: event.target.value }))} placeholder="e.g. 35" className="input" />
          <span className="field-hint">An approximate number is fine.</span>
        </div>}
        {step === 5 && <div className="field">
          <label htmlFor="challenges">What are your organization&apos;s biggest operational challenges?</label>
          <textarea id="challenges" name="challenges" required minLength={10} maxLength={5000} rows={5} defaultValue={values.challenges} placeholder="What feels hardest to move forward right now?" className="input textarea" />
          <span className="field-hint">Share as much or as little as you&apos;re comfortable with.</span>
        </div>}
        {step === 6 && <fieldset className="field support-fieldset">
          <legend className="field-label">Which areas does your organization currently need support with?</legend>
          <span className="field-hint support-instruction">Select all that apply.</span>
          <div className="support-options">
            {SUPPORT_AREAS.map((area) => <label key={area} className={`support-option${areas.includes(area) ? " selected" : ""}`}>
              <input type="checkbox" checked={areas.includes(area)} onChange={() => toggleArea(area)} />
              <span className="custom-checkbox">{areas.includes(area) && <Check size={13} />}</span>
              <span>{area}</span>
            </label>)}
          </div>
          {areas.includes("Other") && <div className="field other-field">
            <label htmlFor="otherSupportArea">What other area would you like support with?</label>
            <input id="otherSupportArea" name="otherSupportArea" required minLength={1} maxLength={240} value={values.otherSupportArea ?? ""} onChange={(event) => setValues((current) => ({ ...current, otherSupportArea: event.target.value }))} placeholder="Tell us what you have in mind" className="input" />
          </div>}
        </fieldset>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="step-actions">
          <button type="button" className="button button-quiet" onClick={goBack} disabled={step === 0}><ArrowLeft size={16} /> Back</button>
          <button type="submit" className="button button-primary" disabled={submitting}>{submitting ? "Creating account..." : step === 6 ? "Create account" : step === 0 ? "Continue to your organization's story" : "Continue"} <ArrowRight size={16} /></button>
        </div>
        <p className="autosave-note"><Info size={14} /> Answers stay in this page only until submitted.</p>
      </form>
      <div className="form-divider"><span /> <small>Already have an account?</small> <span /></div>
      <p className="form-bottom-link">Welcome back? <Link href="/login">Log in instead <ArrowRight size={14} /></Link></p>
      <p className="privacy-note"><Info size={14} /> Passwords are hashed server-side and never saved in browser storage.</p>
    </>
  );
}

export function DemoNotice({ children }: { children: React.ReactNode }) {
  return <div className="demo-notice" role="status"><Info size={16} /><span>{children}</span></div>;
}
