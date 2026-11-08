"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, ArrowUpRight, LoaderCircle, Plus, Send } from "lucide-react";

export type AssistantChatMessage = {
  id: string;
  sender: "USER" | "ASSISTANT";
  content: string;
  requestId: string | null;
  generationStatus: "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: string;
};

type ConversationResult = {
  conversationId?: string;
  title?: string;
  userMessage?: AssistantChatMessage;
  assistantMessage?: AssistantChatMessage;
  error?: string;
};

export function AssistantChat({
  initialConversationId,
  initialTitle,
  initialMessages,
  displayName,
  organizationName,
}: {
  initialConversationId?: string;
  initialTitle?: string;
  initialMessages: AssistantChatMessage[];
  displayName: string;
  organizationName: string;
}) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState(initialConversationId ?? "");
  const [title, setTitle] = useState(initialTitle ?? "");
  const [messages, setMessages] = useState(initialMessages);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function sendMessage(text: string, retryRequestId?: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const requestId = retryRequestId ?? crypto.randomUUID();
    setError("");
    setSending(true);

    if (retryRequestId) {
      setMessages((items) => items.map((item) =>
        item.requestId === requestId ? { ...item, generationStatus: "PROCESSING" } : item,
      ));
    } else {
      setMessages((items) => [...items, {
        id: requestId,
        sender: "USER",
        content: trimmed,
        requestId,
        generationStatus: "PROCESSING",
        createdAt: new Date().toISOString(),
      }]);
      setContent("");
    }

    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          requestId,
          ...(conversationId ? { conversationId } : {}),
        }),
      });
      const result = (await response.json()) as ConversationResult;
      if (result.conversationId) {
        setConversationId(result.conversationId);
        if (result.title) setTitle(result.title);
        router.replace(`/assistant?conversationId=${encodeURIComponent(result.conversationId)}`, { scroll: false });
      }

      if (!response.ok || !result.userMessage || !result.assistantMessage) {
        if (result.userMessage) {
          setMessages((items) => items.map((item) =>
            item.requestId === requestId ? { ...result.userMessage!, generationStatus: "FAILED" } : item,
          ));
        } else {
          setMessages((items) => items.map((item) =>
            item.requestId === requestId ? { ...item, generationStatus: "FAILED" } : item,
          ));
        }
        setError(result.error ?? "The assistant couldn’t respond. Your message is saved; please try again.");
        return;
      }

      setMessages((items) => [
        ...items.map((item) =>
          item.requestId === requestId ? result.userMessage! : item,
        ),
        result.assistantMessage!,
      ]);
    } catch {
      setMessages((items) => items.map((item) =>
        item.requestId === requestId ? { ...item, generationStatus: "FAILED" } : item,
      ));
      setError("We couldn’t reach the server. Retry this message to continue.");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(content);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void sendMessage(content);
    }
  }

  const failedMessage = [...messages].reverse().find(
    (message) => message.sender === "USER" && message.generationStatus === "FAILED" && message.requestId,
  );

  return (
    <div className="assistant-page">
      <header className="assistant-page-heading">
        <div>
          <span className="page-eyebrow"><span className="page-eyebrow-dot" /> YOUR CAPACITY COMPANION</span>
          <h1>{title || "A thoughtful place to think it through."}</h1>
          <p>Guidance shaped by what you’ve shared about {organizationName}.</p>
        </div>
        <div className="assistant-heading-actions">
          <Link className="button button-outline" href="/history"><ArrowLeft size={15} /> History</Link>
          <Link className="button button-primary" href="/assistant"><Plus size={16} /> New conversation</Link>
        </div>
      </header>

      <section className={`assistant-conversation${messages.length === 0 ? " is-empty" : ""}`} aria-label="Conversation">
        {messages.length === 0 ? (
          <div className="assistant-empty">
            <span className="assistant-empty-index">A place to begin</span>
            <h2>Hello, {displayName.split(" ")[0]}.</h2>
            <p>What feels difficult for your organization right now? Share as much or as little context as you have. We can work through it together.</p>
            <div className="assistant-suggestions" aria-label="Example prompts">
              {[
                "We’re struggling to recruit and keep volunteers.",
                "Our small team is stretched across too many priorities.",
                "We need a more steady approach to fundraising.",
              ].map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => setContent(suggestion)}>
                  {suggestion}<ArrowUpRight size={14} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="assistant-messages" aria-live="polite">
            {messages.map((message) => (
              <li key={message.id} className={`assistant-message ${message.sender === "USER" ? "from-user" : "from-assistant"}`}>
                <div className="assistant-message-label">
                  <span>{message.sender === "USER" ? "YOU" : "CAPACITY CONNECT"}</span>
                  {message.sender === "USER" && message.generationStatus === "FAILED" && <span className="message-status">RESPONSE NEEDED</span>}
                </div>
                <div className="assistant-message-body">
                  {message.sender === "ASSISTANT"
                    ? <div className="assistant-markdown"><ReactMarkdown>{message.content}</ReactMarkdown></div>
                    : <p>{message.content}</p>}
                </div>
              </li>
            ))}
            {sending && (
              <li className="assistant-typing" role="status">
                <LoaderCircle size={16} className="assistant-spinner" /> Thinking it through…
              </li>
            )}
          </ol>
        )}
        {(error || failedMessage) && (
          <div className="assistant-error" role="alert">
            <p>{error || "That message didn’t receive a response. Retry it to continue."}</p>
            {failedMessage?.requestId && (
              <button type="button" onClick={() => void sendMessage(failedMessage.content, failedMessage.requestId ?? undefined)} disabled={sending}>
                Retry response
              </button>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </section>

      <form className="assistant-composer" onSubmit={handleSubmit}>
        <label className="visually-hidden" htmlFor="assistant-message">Write a message</label>
        <textarea
          id="assistant-message"
          rows={2}
          maxLength={4000}
          value={content}
          placeholder="Describe a challenge, or ask a follow-up…"
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <div className="assistant-composer-foot">
          <span>Enter to send · Shift + Enter for a new line</span>
          <button type="submit" className="button button-primary" disabled={sending || !content.trim()}>
            {sending ? "Thinking…" : "Send"} <Send size={15} />
          </button>
        </div>
      </form>
      <p className="assistant-disclaimer">AI can be wrong. Treat suggestions as a starting point and verify important decisions.</p>
    </div>
  );
}
