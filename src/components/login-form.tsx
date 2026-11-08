"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { PasswordField } from "@/components/password-field";
import { DemoNotice } from "@/components/registration-form";

type AccountType = "NONPROFIT_STAFF" | "CAPACITY_CANADA_ADMIN";

export function LoginForm({ initialRole }: { initialRole: AccountType }) {
  const router = useRouter();
  const [role, setRole] = useState<AccountType>(initialRole);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType: role,
          identity: formData.get("identity"),
          password: formData.get("password"),
          remember: formData.get("remember") === "on",
        }),
      });
      const result = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok) {
        setError(result.error ?? "The username or password is incorrect.");
        return;
      }
      router.replace(result.redirectTo === "/admin" ? "/admin" : "/profile");
      router.refresh();
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="form-heading">
        <span className="form-kicker">Good to have you back</span>
        <h1>Log in to your account</h1>
        <p>Choose your account type, then enter your details.</p>
      </div>
      <div className="login-role-select" role="group" aria-label="Account type">
        <button type="button" onClick={() => setRole("NONPROFIT_STAFF")} className={role === "NONPROFIT_STAFF" ? "login-role active" : "login-role"} aria-pressed={role === "NONPROFIT_STAFF"}>Nonprofit Staff</button>
        <button type="button" onClick={() => setRole("CAPACITY_CANADA_ADMIN")} className={role === "CAPACITY_CANADA_ADMIN" ? "login-role active" : "login-role"} aria-pressed={role === "CAPACITY_CANADA_ADMIN"}>Capacity Canada Admin</button>
      </div>
      <form className="account-form login-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="identity">{role === "NONPROFIT_STAFF" ? "Username or email" : "Admin username"}</label>
          <input id="identity" name="identity" type="text" autoComplete="username" placeholder={role === "NONPROFIT_STAFF" ? "Your username or email" : "Your admin username"} required minLength={role === "CAPACITY_CANADA_ADMIN" ? 3 : undefined} className="input" />
        </div>
        <PasswordField id="password" label="Password" autoComplete="current-password" />
        <div className="login-options">
          <label className="remember-option"><input name="remember" type="checkbox" /> <span>Remember me</span></label>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="button button-primary button-wide" disabled={submitting}>{submitting ? "Logging in..." : "Log in"} <ArrowRight size={17} /></button>
      </form>
      <div className="form-divider"><span /> <small>New to Capacity Connect?</small> <span /></div>
      <p className="form-bottom-link">Join our community <Link href="/register">Create an account <ArrowRight size={14} /></Link></p>
      <p className="privacy-note"><ShieldCheck size={14} /> Your account role is verified on the server when you log in.</p>
      {role === "CAPACITY_CANADA_ADMIN" && <DemoNotice>Admin accounts are created by the secure seed script, not through public registration.</DemoNotice>}
    </>
  );
}
