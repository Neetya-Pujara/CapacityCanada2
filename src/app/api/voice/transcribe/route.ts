import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_CONTENT_LENGTH = MAX_AUDIO_BYTES + 256 * 1024;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
]);

export async function POST(request: Request) {
  let user: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Authenticating a voice transcription request failed.", error);
    return NextResponse.json({ error: "We couldn’t verify your account. Please try again." }, { status: 500 });
  }
  if (!user) return NextResponse.json({ error: "Please log in to use voice input." }, { status: 401 });
  if (user.role !== "NONPROFIT_STAFF" || !user.organizationId) {
    return NextResponse.json({ error: "Voice input is available to nonprofit staff accounts." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_CONTENT_LENGTH) {
    return NextResponse.json({ error: "That recording is too large. Please record a shorter message." }, { status: 413 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Voice transcription is not configured. You can still type your message." }, { status: 503 });
  }

  let audio: FormDataEntryValue | null;
  try {
    audio = (await request.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "We couldn’t read that recording. Please try recording again." }, { status: 400 });
  }

  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "No recording was received. Please try again." }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "That recording is too large. Please record a shorter message." }, { status: 413 });
  }

  const mimeType = audio.type.split(";")[0].trim().toLowerCase();
  if (!ALLOWED_AUDIO_TYPES.has(mimeType)) {
    return NextResponse.json({ error: "This browser’s recording format isn’t supported. Please use a different browser or type your message." }, { status: 415 });
  }

  const form = new FormData();
  form.append("file", audio, "recording");
  form.append("model_id", "scribe_v2");
  form.append("tag_audio_events", "false");

  let upstream: Response;
  try {
    upstream = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    return NextResponse.json({ error: "The transcription service couldn’t be reached. Please try again or type your message." }, { status: 502 });
  }

  if (!upstream.ok) {
    const status = upstream.status === 429 ? 429 : upstream.status >= 500 ? 503 : 502;
    const error = status === 429
      ? "Voice transcription is temporarily rate-limited. Please try again later or type your message."
      : "The recording couldn’t be transcribed. Please try again or type your message.";
    return NextResponse.json({ error }, { status });
  }

  let result: { text?: unknown };
  try {
    result = (await upstream.json()) as { text?: unknown };
  } catch {
    return NextResponse.json({ error: "The transcription service returned an unreadable response. Please try again." }, { status: 502 });
  }

  if (typeof result.text !== "string" || !result.text.trim()) {
    return NextResponse.json({ error: "We couldn’t hear any words in that recording. Please try again or type your message." }, { status: 422 });
  }
  if (result.text.trim().length > 4000) {
    return NextResponse.json({ error: "That transcription is longer than the 4,000-character message limit. Please record a shorter message." }, { status: 422 });
  }

  return NextResponse.json({ text: result.text.trim() });
}
