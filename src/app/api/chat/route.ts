import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ── In-memory rate limiter (per IP) ────────────────────────────────────────
// Protects the paid Gemini API call from abuse/DoS. Bounded map size avoids
// unbounded memory growth; stale entries are swept opportunistically.
const rateMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const MAX_TRACKED_KEYS = 5_000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  if (rateMap.size > MAX_TRACKED_KEYS) {
    for (const [k, entry] of rateMap) {
      if (now - entry.windowStart > RATE_WINDOW_MS) rateMap.delete(k);
    }
  }
  const entry = rateMap.get(key);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

const MAX_QUESTION_LENGTH = 500;
const GEMINI_TIMEOUT_MS = 10_000;

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { wedding_id, wedding_slug, question } = body as {
      wedding_id?: unknown;
      wedding_slug?: unknown;
      question?: unknown;
    };

    if ((typeof wedding_id !== "string" || !wedding_id.trim()) &&
        (typeof wedding_slug !== "string" || !wedding_slug.trim())) {
      return NextResponse.json({ error: "Missing wedding identifier" }, { status: 400 });
    }
    if (typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ error: "Missing wedding identifier or question" }, { status: 400 });
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      return NextResponse.json(
        { error: `Question too long (max ${MAX_QUESTION_LENGTH} characters)` },
        { status: 400 }
      );
    }
    if (wedding_slug !== undefined && (typeof wedding_slug !== "string" || wedding_slug.length > 128)) {
      return NextResponse.json({ error: "Invalid wedding identifier" }, { status: 400 });
    }
    if (wedding_id !== undefined && (typeof wedding_id !== "string" || wedding_id.length > 128)) {
      return NextResponse.json({ error: "Invalid wedding identifier" }, { status: 400 });
    }
    const sanitisedQuestion = question.trim();

    // Step 1: Resolve the wedding document from Firestore
    let resolvedWeddingSlug = typeof wedding_slug === "string" ? wedding_slug.trim() : "";
    let weddingSnap = resolvedWeddingSlug ? await getDoc(doc(db, "weddings", resolvedWeddingSlug)) : null;

    if ((!weddingSnap || !weddingSnap.exists()) && typeof wedding_id === "string" && wedding_id.trim()) {
      const trimmedWeddingId = wedding_id.trim();

      // Legacy direct-doc lookup by wedding_id as doc ID
      const legacySnap = await getDoc(doc(db, "weddings", trimmedWeddingId));
      if (legacySnap.exists()) {
        weddingSnap = legacySnap;
        resolvedWeddingSlug = trimmedWeddingId;
      } else {
        // Modern lookup by wedding_id field where doc id is slug
        const weddingsRef = collection(db, "weddings");
        const byWeddingIdSnap = await getDocs(query(weddingsRef, where("wedding_id", "==", trimmedWeddingId)));
        if (!byWeddingIdSnap.empty) {
          weddingSnap = byWeddingIdSnap.docs[0];
          resolvedWeddingSlug = byWeddingIdSnap.docs[0].id;
        }
      }
    }

    if (!weddingSnap || !weddingSnap.exists()) {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }

    const weddingData = weddingSnap.data();

    // Step 2: Fetch FAQs sub-collection (if exists)
    let faqs: Array<{ question: string; answer: string }> = [];
    try {
      const faqsRef = collection(db, "weddings", resolvedWeddingSlug, "faqs");
      const faqsSnap = await getDocs(faqsRef);
      faqs = faqsSnap.docs.map((d) => d.data() as { question: string; answer: string });
    } catch {
      // FAQs collection may not exist, that's fine
    }

    // Step 3: Build the context string from structured Firestore JSON
    // This is the "narrow-context injection" (NOT RAG — no vectors needed)
    const contextString = JSON.stringify({
      couple: weddingData.couple,
      events: weddingData.events,
      occasion: weddingData.occasion_label,
      faqs: faqs.length > 0 ? faqs : undefined,
    }, null, 2);

    // Step 4: Build the Gemini prompt
    const systemPrompt = `You are a gracious and helpful wedding concierge assistant for ${weddingData.couple?.bride} and ${weddingData.couple?.groom}'s celebration. 
Your role is to answer guests' questions warmly and helpfully.
You must ONLY answer based on the following wedding context. Do not make up information.
If you don't know the answer, politely say so.

WEDDING CONTEXT:
${contextString}

Guidelines:
- Be warm, celebratory, and elegant in tone
- Keep responses concise (2-3 sentences max)
- For venue directions, reference the Google Maps links from the context
- Never reveal personal guest information
- If asked about dress code or gifts and it's not in the context, suggest the guest contact the couple directly`;

    // Step 5: Call Gemini API (API key from environment variable)
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      // Graceful fallback if API key not configured yet
      return NextResponse.json({
        answer: "The AI concierge is being set up. For any questions, please contact the couple directly. Thank you for your understanding!",
      });
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), GEMINI_TIMEOUT_MS);

    let geminiResponse: Response;
    try {
      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: systemPrompt },
                  { text: `\nGuest's question: ${sanitisedQuestion}` }
              ]
            }
          ],
            generationConfig: {
              temperature: 0.3,      // Low temperature for factual accuracy
              maxOutputTokens: 256,  // Keep answers concise
            }
          }),
        }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const answer = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 
      "I'm sorry, I couldn't find an answer to that. Please contact the couple directly.";

    return NextResponse.json({ answer });

  } catch (error) {
    console.error("AI Chat error:", error);
    return NextResponse.json({
      answer: "I'm experiencing a brief hiccup. For urgent questions, please reach out to the couple directly!",
    });
  }
}
