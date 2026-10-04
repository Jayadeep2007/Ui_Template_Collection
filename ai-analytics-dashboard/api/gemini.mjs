// ============================================================
// NOVA ANALYTICS - GEMINI AI BACKEND (Vercel serverless function)
// Needs env var GEMINI_API_KEY. Place the /api folder at the
// root of the Vercel project so the route is /api/gemini.
// ============================================================

const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

function extractJson(raw) {
    let text = String(raw || "").trim();
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    try {
        return JSON.parse(text);
    } catch (e) {
        const a = text.indexOf("{");
        const b = text.lastIndexOf("}");
        if (a !== -1 && b > a) {
            try {
                return JSON.parse(text.slice(a, b + 1));
            } catch (e2) { /* fall through */ }
        }
    }
    return { answer: text };
}

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Only POST requests are allowed." });

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: "GEMINI_API_KEY is not configured." });

    let body = req.body || {};
    if (typeof body === "string") {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
    }

    const { question, schema, dataset, conversation } = body;
    if (!question) return res.status(400).json({ error: "Question is required." });

    const safeSchema = Array.isArray(schema) ? schema : [];
    const safeDataset = dataset || {};
    const safeConversation = Array.isArray(conversation) ? conversation.slice(-6) : [];

    const systemInstruction = `
You are NOVA, a data analyst assistant inside a dashboard.

The user may make spelling mistakes or write casually. Silently work out what they meant and answer that.

Decide what the question is:
1. About the loaded dataset (columns, statistics, comparisons, rankings, trends, meaning of the data).
2. A general question not about the dataset.

RULES:
- Answer ONLY what was asked. Be short: one to three sentences. No intro, no extra advice.
- Never invent dataset facts. Use only the dataset summary below.
- The browser does exact calculations. For a calculation, return an analysis plan.
- Use exact column names from the schema.
- For general questions, answer normally and briefly.
- Use recent conversation to resolve follow-ups.
- Never expose keys or implementation details.

DATASET SCHEMA:
${JSON.stringify(safeSchema)}

DATASET SUMMARY:
${JSON.stringify(safeDataset)}

RECENT CONVERSATION:
${JSON.stringify(safeConversation)}

RETURN ONE JSON OBJECT ONLY. No markdown. No code fences.

Calculation / ranking / comparison / filter:
{"intent":"agg|topn|extreme|list|percentage|trend|stats|insights","column":"column or null","groupBy":"column or null","agg":"count|sum|average|min|max|null","sup":"hi|lo|null","limit":number or null,"filters":[],"chart":"bar|line|donut|hbar|scatter|null"}

Dataset meaning, or any other answer:
{"answer":"short answer","bullets":[]}
`;

    const payload = {
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: String(question) }] }],
        generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 800,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 }
        }
    };

    let lastStatus = 0;

    for (const model of MODELS) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
                    body: JSON.stringify(payload)
                }
            );

            if (!response.ok) {
                lastStatus = response.status;
                console.error(`Gemini ${model} error:`, response.status, await response.text());
                continue;
            }

            const data = await response.json();
            const raw = (data?.candidates?.[0]?.content?.parts || [])
                .map(p => p.text || "")
                .join("")
                .trim();

            if (!raw) continue;

            return res.status(200).json(extractJson(raw));
        } catch (error) {
            console.error(`Gemini ${model} failed:`, error);
        }
    }

    return res.status(502).json({ error: "Gemini request failed.", status: lastStatus });
}
