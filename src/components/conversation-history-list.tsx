"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, MessageCircle, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/date-format";

export type ConversationListItem = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export function ConversationHistoryList({
  initialConversations,
}: {
  initialConversations: ConversationListItem[];
}) {
  const router = useRouter();
  const [conversations, setConversations] = useState(initialConversations);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");

  async function handleDelete(conversation: ConversationListItem) {
    if (!window.confirm(`Delete “${conversation.title}”? This will permanently remove its messages.`)) return;
    setError("");
    setDeletingId(conversation.id);
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversation.id)}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "We couldn’t delete this conversation.");
        return;
      }
      setConversations((items) => items.filter((item) => item.id !== conversation.id));
      router.refresh();
    } catch {
      setError("We couldn’t reach the server. The conversation was not deleted.");
    } finally {
      setDeletingId("");
    }
  }

  if (conversations.length === 0) {
    return (
      <div className="history-empty">
        <MessageCircle size={22} />
        <h2>No conversations yet</h2>
        <p>When you start a conversation, it’ll be saved here so you can return to it later.</p>
        <Link className="underlined-link" href="/assistant">Start a conversation <ArrowUpRight size={15} /></Link>
      </div>
    );
  }

  return (
    <div className="conversation-history">
      {error && <p className="form-error" role="alert">{error}</p>}
      <ul>
        {conversations.map((conversation) => (
          <li key={conversation.id}>
            <Link href={`/assistant?conversationId=${encodeURIComponent(conversation.id)}`} className="history-item-link">
              <span className="history-item-icon"><MessageCircle size={17} /></span>
              <span className="history-item-copy">
                <strong>{conversation.title}</strong>
                <small>Updated {formatDate(conversation.updatedAt)}</small>
              </span>
              <ArrowUpRight className="history-item-arrow" size={16} />
            </Link>
            <button
              type="button"
              className="history-delete-button"
              aria-label={`Delete ${conversation.title}`}
              disabled={deletingId === conversation.id}
              onClick={() => void handleDelete(conversation)}
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
