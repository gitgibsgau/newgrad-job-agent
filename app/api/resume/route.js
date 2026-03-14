import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  try {
    const { text } = await req.json();

    if (!text || !text.trim()) {
      return Response.json({ error: "No resume text provided" }, { status: 400 });
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: "You are a resume analysis expert. Analyze resumes concisely and helpfully.",
      messages: [
        {
          role: "user",
          content: `Analyze this resume and return a JSON object with exactly this structure:
{
  "skills": ["skill1", "skill2", ...],
  "experience": "Entry-Level / Mid-Level / Senior / etc",
  "summary": "2-3 sentence summary of the candidate's profile",
  "suggestions": [
    "Specific improvement suggestion 1",
    "Specific improvement suggestion 2",
    "Specific improvement suggestion 3",
    "Specific improvement suggestion 4",
    "Specific improvement suggestion 5"
  ]
}

Resume text:
${text}

Return ONLY valid JSON, nothing else.`,
        },
      ],
    });

    const rawText = response.content[0]?.text || "";

    try {
      const parsed = JSON.parse(rawText.trim());
      return Response.json(parsed);
    } catch {
      // Try to extract JSON if there's surrounding text
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return Response.json(parsed);
        } catch {
          return Response.json({ error: "Could not parse resume" }, { status: 500 });
        }
      }
      return Response.json({ error: "Could not parse resume" }, { status: 500 });
    }
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
