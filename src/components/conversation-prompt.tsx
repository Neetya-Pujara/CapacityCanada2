"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, MessageCircle, Send } from "lucide-react";

type ConversationResponse = { conversationId?: string; error?: string };
type PendingPrompt = { requestId: string; content: string };

export function ConversationPrompt() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<PendingPrompt | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = content.trim();
    if (!message || sending) return;
    setError("");
    setSending(true);
    const requestId = pendingPrompt?.content === message
      ? pendingPrompt.requestId
      : crypto.randomUUID();
    setPendingPrompt({ requestId, content: message });
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message, requestId }),
      });
      const result = (await response.json()) as ConversationResponse;
      if (result.conversationId) {
        router.push(`/assistant?conversationId=${encodeURIComponent(result.conversationId)}`);
        return;
      }
      setError(result.error ?? "We couldn’t start a conversation. Please try again.");
    } catch {
      setError("We couldn’t reach the server. Your message may not have been saved; please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="dashboard-start" aria-labelledby="dashboard-start-heading">
      <div className="dashboard-start-copy">
        <span className="dashboard-kicker"><MessageCircle size={15} /> A PLACE TO START</span>
        <h2 id="dashboard-start-heading">What’s taking your energy right now?</h2>
        <p>Describe a challenge in your own words. The assistant will consider your organization’s profile and help you find a practical next step.</p>
      </div>
      <form className="dashboard-prompt-form" onSubmit={handleSubmit}>
        <label className="visually-hidden" htmlFor="challenge-prompt">Describe an organizational challenge</label>
        <textarea
          id="challenge-prompt"
          value={content}
          maxLength={4000}
          rows={3}
          required
          placeholder="For example: We’re finding it hard to keep volunteers engaged between events…"
          onChange={(event) => {
            const nextContent = event.target.value;
            setContent(nextContent);
            if (pendingPrompt && nextContent.trim() !== pendingPrompt.content) setPendingPrompt(null);
          }}
          disabled={sending}
        />
        <div className="dashboard-prompt-foot">
          <span>{content.length}/4,000 characters · Your message is saved with your conversation.</span>
          <button type="submit" className="button button-primary" disabled={sending || !content.trim()}>
            {sending ? "Starting…" : "Start a conversation"} <Send size={15} />
          </button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
      <div className="dashboard-start-note">
        <span>Not sure where to begin?</span>
        <button type="button" onClick={() => setContent("I’m not sure what to focus on first. Can you help me think it through?")}>
          Start with a question <ArrowUpRight size={14} />
        </button>
      </div>
    </section>
  );
}
