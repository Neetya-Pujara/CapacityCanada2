"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Info, MailCheck } from "lucide-react";
import { AccountLayout } from "@/components/account-layout";
import { DemoNotice } from "@/components/registration-form";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    setSubmitted(true);
  }

  return (
    <AccountLayout eyebrow="A fresh start" title="A small reset. Then back to the big picture." description="It happens. Tell us where to reach you and we’ll help you find your way back.">
      <div className="form-heading">
        <span className="form-kicker">Account recovery</span>
        <h1>{submitted ? "Request received" : "Forgot your password?"}</h1>
        <p>{submitted ? "This demo does not send recovery emails, but the flow is ready to connect to an authentication provider." : "Enter the email address associated with your account."}</p>
      </div>
      {submitted ? <div className="recovery-success"><MailCheck size={26} /><DemoNotice>Password recovery is not connected yet. No email was sent.</DemoNotice></div> : <form className="account-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="you@organization.org" required className="input" />
        </div>
        <button type="submit" className="button button-primary button-wide">Request password reset <ArrowRight size={17} /></button>
      </form>}
      <p className="form-bottom-link recovery-link"><Link href="/login"><ArrowLeft size={14} /> Back to log in</Link></p>
      <p className="privacy-note"><Info size={14} /> This demonstration does not send emails or change passwords.</p>
    </AccountLayout>
  );
}
