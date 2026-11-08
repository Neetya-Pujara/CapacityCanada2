import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getUserConversation } from "@/lib/conversations";
import { DatabaseNotConfiguredError } from "@/lib/db";

const requestSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
});

let defaultVoiceIdPromise: Promise<string | null> | undefined;

async function getVoiceId(apiKey: string): Promise<string | null> {
  const configuredVoiceId = process.env.ELEVENLABS_VOICE_ID?.trim();
  if (configuredVoiceId) return configuredVoiceId;

  defaultVoiceIdPromise ??= fetch("https://api.elevenlabs.io/v2/voices?voice_type=default&page_size=1", {
    headers: { "xi-api-key": apiKey },
    signal: AbortSignal.timeout(15_000),
  }).then(async (response) => {
    if (!response.ok) throw new Error(`ElevenLabs voice lookup failed with status ${response.status}.`);
    const result = await response.json() as { voices?: Array<{ voice_id?: string }> };
    return result.voices?.[0]?.voice_id ?? null;
  }).catch((error: unknown) => {
    defaultVoiceIdPromise = undefined;
    throw error;
  });

  return defaultVoiceIdPromise;
}

function toSpeechText(content: string, recommendations: Array<{ title: string; whyRelevant: string }> | null | undefined) {
  const marker = "<!--RESOURCE_RECOMMENDATIONS-->";
  const plainText = content
    .replace(marker, "\n")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/[`*_>#]/g, "")
    .replace(/^\s*[-+]\s/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const resourceText = recommendations?.map((resource) =>
    `${resource.title}. ${resource.whyRelevant}`,
  ).join("\n") ?? "";
  return [plainText, resourceText].filter(Boolean).join("\n\n");
}

export async function POST(request: Request) {
  let user: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Authenticating a voice playback request failed.", error);
    return NextResponse.json({ error: "We couldn’t verify your account. Please try again." }, { status: 500 });
  }
  if (!user) return NextResponse.json({ error: "Please log in to listen to assistant responses." }, { status: 401 });
  if (user.role !== "NONPROFIT_STAFF" || !user.organizationId) {
    return NextResponse.json({ error: "Voice playback is available to nonprofit staff accounts." }, { status: 403 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Voice playback isn’t configured. You can still read the assistant’s response." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please select an assistant response to play." }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please select a valid assistant response." }, { status: 400 });
  }

  try {
    const conversation = await getUserConversation(user.id, parsed.data.conversationId);
    if (!conversation) return NextResponse.json({ error: "That conversation could not be found." }, { status: 404 });

    const message = conversation.messages.find((item) =>
      item.id === parsed.data.messageId &&
      item.sender === "ASSISTANT" &&
      item.generationStatus === "COMPLETED",
    );
    if (!message) return NextResponse.json({ error: "That assistant response could not be found." }, { status: 404 });

    const text = toSpeechText(message.content, message.resourceRecommendations);
    if (!text || text.length > 10_000) {
      return NextResponse.json({ error: "This response is too long to play. You can still read it in the conversation." }, { status: 422 });
    }

    let voiceId: string | null;
    try {
      voiceId = await getVoiceId(apiKey);
    } catch {
      return NextResponse.json({ error: "A voice could not be selected from your ElevenLabs account. Set ELEVENLABS_VOICE_ID or check the account’s available voices." }, { status: 503 });
    }
    if (!voiceId) {
      return NextResponse.json({ error: "No default voice is available in your ElevenLabs account. Set ELEVENLABS_VOICE_ID to a voice ID from the account." }, { status: 503 });
    }

    let upstream: Response;
    try {
      upstream = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_22050_32`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
          signal: AbortSignal.timeout(60_000),
        },
      );
    } catch {
      return NextResponse.json({ error: "The speech service couldn’t be reached. Please try again." }, { status: 502 });
    }

    if (!upstream.ok || !upstream.body) {
      const status = upstream.status === 429 ? 429 : upstream.status >= 500 ? 503 : 502;
      const error = status === 429
        ? "Voice playback is temporarily rate-limited. Please try again later."
        : "Audio couldn’t be generated. You can still read the assistant’s response.";
      return NextResponse.json({ error }, { status });
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Generating speech for a nonprofit assistant response failed.", error);
    return NextResponse.json({ error: "We couldn’t generate audio for this response. Please try again." }, { status: 500 });
  }
}
