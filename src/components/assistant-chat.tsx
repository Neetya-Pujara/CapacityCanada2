"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  ArrowUpRight,
  CircleStop,
  ExternalLink,
  LoaderCircle,
  Mic,
  Pause,
  Play,
  Plus,
  Send,
  Square,
  X,
} from "lucide-react";
import type { ResourceRecommendationSnapshot } from "@/lib/db/schema";
import { formatDate } from "@/lib/date-format";

export type AssistantChatMessage = {
  id: string;
  sender: "USER" | "ASSISTANT";
  content: string;
  requestId: string | null;
  generationStatus: "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: string;
  resourceRecommendations?: ResourceRecommendationSnapshot[] | null;
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
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "recording" | "transcribing" | "ready" | "error">("idle");
  const [voiceError, setVoiceError] = useState("");
  const [audioStatus, setAudioStatus] = useState<"idle" | "loading" | "playing" | "paused" | "error">("idle");
  const [audioMessageId, setAudioMessageId] = useState("");
  const [audioError, setAudioError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStartPendingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingCancelledRef = useRef(false);
  const recordingFailedRef = useRef(false);
  const recordingDraftRef = useRef("");
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef(new Map<string, string>());
  const speechRequestRef = useRef<AbortController | null>(null);
  const componentMountedRef = useRef(true);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  const releaseRecordingResources = useCallback(() => {
    if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
    recordingTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  async function transcribeAudio(blob: Blob) {
    setVoiceStatus("transcribing");
    setVoiceError("");
    const form = new FormData();
    form.append("file", blob, "recording");
    try {
      const response = await fetch("/api/voice/transcribe", { method: "POST", body: form });
      const result = (await response.json()) as { text?: string; error?: string };
      if (!response.ok || !result.text) throw new Error(result.error ?? "We couldn’t transcribe that recording.");
      setContent([recordingDraftRef.current.trim(), result.text].filter(Boolean).join("\n"));
      setVoiceStatus("ready");
    } catch (caught) {
      setVoiceStatus("error");
      setVoiceError(caught instanceof Error ? caught.message : "We couldn’t transcribe that recording. Please type your message instead.");
    }
  }

  async function startRecording() {
    if (recordingStartPendingRef.current) return;
    setVoiceError("");
    recordingDraftRef.current = content;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceStatus("error");
      setVoiceError("Voice recording isn’t supported by this browser. You can still type your message.");
      return;
    }

    recordingStartPendingRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStartPendingRef.current = false;
      if (!componentMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const supportedTypes = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/webm",
      ];
      const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recordingChunksRef.current = [];
      recordingCancelledRef.current = false;
      recordingFailedRef.current = false;
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size) recordingChunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        const cancelled = recordingCancelledRef.current;
        const recording = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        recordingChunksRef.current = [];
        releaseRecordingResources();
        if (recordingFailedRef.current) {
          setVoiceStatus("error");
          setVoiceError("The recording stopped unexpectedly. Please try again or type your message.");
          return;
        }
        if (cancelled) {
          setVoiceStatus("idle");
          return;
        }
        void transcribeAudio(recording);
      }, { once: true });
      recorder.addEventListener("error", () => {
        recordingFailedRef.current = true;
        recordingCancelledRef.current = true;
        releaseRecordingResources();
        setVoiceStatus("error");
        setVoiceError("The recording stopped unexpectedly. Please try again or type your message.");
      }, { once: true });
      recorder.start();
      setVoiceStatus("recording");
      recordingTimerRef.current = setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 120_000);
    } catch (caught) {
      recordingStartPendingRef.current = false;
      releaseRecordingResources();
      setVoiceStatus("error");
      setVoiceError(
        caught instanceof DOMException && caught.name === "NotAllowedError"
          ? "Microphone access was denied. Allow microphone access in your browser settings, or type your message."
          : "We couldn’t access the microphone. Check your browser permissions or type your message.",
      );
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function cancelRecording() {
    recordingCancelledRef.current = true;
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    } else {
      releaseRecordingResources();
      setVoiceStatus("idle");
    }
  }

  function stopAudio() {
    speechRequestRef.current?.abort();
    speechRequestRef.current = null;
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setAudioStatus("idle");
    setAudioMessageId("");
    setAudioError("");
  }

  async function playAssistantResponse(message: AssistantChatMessage) {
    if (speechRequestRef.current && audioMessageId === message.id) return;
    if (audioMessageId === message.id && audioRef.current) {
      try {
        await audioRef.current.play();
        setAudioStatus("playing");
      } catch {
        setAudioStatus("error");
        setAudioError("Audio playback couldn’t start. Please try again.");
      }
      return;
    }

    stopAudio();
    const controller = new AbortController();
    speechRequestRef.current = controller;
    setAudioMessageId(message.id);
    setAudioStatus("loading");
    setAudioError("");
    try {
      let audioUrl = audioCacheRef.current.get(message.id);
      if (!audioUrl) {
        const response = await fetch("/api/voice/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, messageId: message.id }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const result = (await response.json()) as { error?: string };
          throw new Error(result.error ?? "Audio couldn’t be generated.");
        }
        audioUrl = URL.createObjectURL(await response.blob());
        audioCacheRef.current.set(message.id, audioUrl);
      }
      if (controller.signal.aborted) return;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        if (audioRef.current !== audio) return;
        audioRef.current = null;
        speechRequestRef.current = null;
        setAudioStatus("idle");
        setAudioMessageId("");
      };
      audio.onerror = () => {
        if (audioRef.current !== audio) return;
        audioRef.current = null;
        speechRequestRef.current = null;
        setAudioStatus("error");
        setAudioError("Audio playback failed. Please try generating it again.");
      };
      await audio.play();
      if (controller.signal.aborted) return;
      speechRequestRef.current = null;
      setAudioStatus("playing");
    } catch (caught) {
      if (controller.signal.aborted) return;
      speechRequestRef.current = null;
      setAudioStatus("error");
      setAudioError(caught instanceof Error ? caught.message : "Audio couldn’t be generated. You can still read the response.");
    }
  }

  useEffect(() => {
    componentMountedRef.current = true;
    const cachedAudioUrls = audioCacheRef.current;
    return () => {
      componentMountedRef.current = false;
      recordingCancelledRef.current = true;
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") recorder.stop();
      releaseRecordingResources();
      audioRef.current?.pause();
      speechRequestRef.current?.abort();
      cachedAudioUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [releaseRecordingResources]);

  async function sendMessage(text: string, retryRequestId?: string) {
    const trimmed = text.trim();
    if (!trimmed || sendingRef.current) return;
    sendingRef.current = true;
    const requestId = retryRequestId ?? crypto.randomUUID();
    setError("");
    setVoiceStatus("idle");
    setVoiceError("");
    recordingDraftRef.current = "";
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
      sendingRef.current = false;
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

  function renderAssistantMessage(message: AssistantChatMessage) {
    const marker = "<!--RESOURCE_RECOMMENDATIONS-->";
    const markerIndex = message.content.indexOf(marker);
    if (markerIndex < 0) return <div className="assistant-markdown"><ReactMarkdown>{message.content}</ReactMarkdown></div>;

    const before = message.content.slice(0, markerIndex);
    const after = message.content.slice(markerIndex + marker.length);
    return (
      <>
        <div className="assistant-markdown"><ReactMarkdown>{before}</ReactMarkdown></div>
        {message.resourceRecommendations?.length ? (
          <div className="assistant-resource-list">
            {message.resourceRecommendations.map((resource) => (
              <article className="assistant-resource" key={resource.id}>
                <h3>{resource.title}</h3>
                <p>{resource.description}</p>
                <p className="assistant-resource-relevance">{resource.whyRelevant}</p>
                <div className="assistant-resource-meta">
                  <span>{resource.sourceOrganization}</span>
                  {resource.lastVerifiedAt && <span>Verified {formatDate(resource.lastVerifiedAt)}</span>}
                </div>
                <a href={resource.url} target="_blank" rel="noreferrer">
                  Visit resource <ExternalLink size={14} aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
        ) : (
          <p className="assistant-resource-empty">No suitable verified resources were found in the current library.</p>
        )}
        <div className="assistant-markdown"><ReactMarkdown>{after}</ReactMarkdown></div>
      </>
    );
  }

  function renderAudioControls(message: AssistantChatMessage) {
    const isCurrent = audioMessageId === message.id;
    return (
      <div className="assistant-audio-controls">
        {!isCurrent || audioStatus === "idle" || audioStatus === "error" ? (
          <button type="button" onClick={() => void playAssistantResponse(message)} aria-label="Listen to this response">
            <Play size={14} aria-hidden="true" /> Listen
          </button>
        ) : audioStatus === "loading" ? (
          <button type="button" disabled aria-label="Generating audio">
            <LoaderCircle size={14} className="assistant-spinner" aria-hidden="true" /> Preparing audio…
          </button>
        ) : (
          <>
            {audioStatus === "playing" ? (
              <button type="button" onClick={() => {
                audioRef.current?.pause();
                setAudioStatus("paused");
              }} aria-label="Pause response audio">
                <Pause size={14} aria-hidden="true" /> Pause
              </button>
            ) : (
              <button type="button" onClick={() => void playAssistantResponse(message)} aria-label="Resume response audio">
                <Play size={14} aria-hidden="true" /> Resume
              </button>
            )}
            <button type="button" onClick={stopAudio} aria-label="Stop response audio">
              <Square size={12} aria-hidden="true" /> Stop
            </button>
          </>
        )}
        {isCurrent && audioStatus === "error" && <span role="alert">{audioError}</span>}
      </div>
    );
  }

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
                    ? renderAssistantMessage(message)
                    : <p>{message.content}</p>}
                </div>
                {message.sender === "ASSISTANT" && renderAudioControls(message)}
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
        <div className="assistant-voice-controls">
          {voiceStatus === "recording" ? (
            <>
              <span className="assistant-recording-status" role="status"><span /> Recording — up to 2 minutes</span>
              <button type="button" onClick={stopRecording} aria-label="Stop recording">
                <CircleStop size={16} aria-hidden="true" /> Stop recording
              </button>
              <button type="button" onClick={cancelRecording} aria-label="Cancel recording">
                <X size={15} aria-hidden="true" /> Cancel
              </button>
            </>
          ) : voiceStatus === "transcribing" ? (
            <span className="assistant-voice-status" role="status"><LoaderCircle size={15} className="assistant-spinner" aria-hidden="true" /> Transcribing your recording…</span>
          ) : voiceStatus === "ready" ? (
            <>
              <span className="assistant-voice-status" role="status">Transcription ready — review or edit it above, then press Send.</span>
              <button type="button" onClick={() => {
                setContent(recordingDraftRef.current);
                recordingDraftRef.current = "";
                setVoiceStatus("idle");
              }} aria-label="Clear transcription">
                <X size={15} aria-hidden="true" /> Clear
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void startRecording()}
                disabled={sending}
                aria-label="Record a voice message"
              >
                <Mic size={16} aria-hidden="true" /> Record voice message
              </button>
              {voiceStatus === "error" && <span className="assistant-voice-error" role="alert">{voiceError}</span>}
            </>
          )}
        </div>
        <textarea
          id="assistant-message"
          rows={2}
          maxLength={4000}
          value={content}
          placeholder="Describe a challenge, or ask a follow-up…"
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending || voiceStatus === "recording" || voiceStatus === "transcribing"}
        />
        <div className="assistant-composer-foot">
          <span>Enter to send · Shift + Enter for a new line</span>
          <button type="submit" className="button button-primary" disabled={sending || voiceStatus === "recording" || voiceStatus === "transcribing" || !content.trim()}>
            {sending ? "Thinking…" : "Send"} <Send size={15} />
          </button>
        </div>
      </form>
      <p className="assistant-disclaimer">AI can be wrong. Treat suggestions as a starting point and verify important decisions.</p>
    </div>
  );
}
