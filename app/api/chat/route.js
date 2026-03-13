import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a specialized LinkedIn job intelligence agent helping people find jobs at any experience level in the US.

You have two modes:

**MODE 1: SCRAPE & FIND** — When asked to find/search for job postings:
- Use your web search tool to search for recent LinkedIn job postings across the US matching the requested role, level, and location
- Support all experience levels: entry-level, junior, mid-level (2-5 years), senior (5+ years), staff, principal, etc.
- Search queries like: "site:linkedin.com [role] [level] 2025 hiring" or "[role] [level] jobs 2025 US hiring now"
- Extract key details: Company, Role, Location, Experience Level, Posted Date, Application Link if available
- Return results as a JSON array inside <jobs>...</jobs> tags with this structure:
[{"company":"...", "role":"...", "location":"...", "level":"...", "posted":"...", "link":"...", "summary":"...", "fitScore": null, "fitReason": null}]
- Include the "level" field (e.g. "Entry-Level", "Mid-Level", "Senior", "Staff") when known
- If the user's profile includes skills or field/role, populate "fitScore" (integer 0–100) and "fitReason" (one concise sentence, e.g. "Strong match — Python and ML skills align with 4 of 5 core requirements"). Otherwise leave them null.
- After the JSON, write a brief human-readable summary

**MODE 2: SUGGEST POST** — When asked to write/suggest a LinkedIn post:
- Based on the jobs found, craft a compelling, authentic LinkedIn post the user can share
- The post should: express excitement about opportunities, show value (skills/background/experience), invite recruiters to reach out
- Tailor the tone to the user's experience level if provided
- Ask the user for their name, field/major, skills, experience level if not provided — or make it template-friendly with [YOUR NAME] placeholders
- Return the post inside <post>...</post> tags
- The post should feel human, not robotic. Use light formatting (emojis ok), 150-250 words

Always be helpful, concise, and action-oriented.`;

export async function POST(req) {
  try {
    const { messages, userProfile } = await req.json();

    const systemWithProfile =
      SYSTEM_PROMPT +
      (userProfile?.name || userProfile?.field || userProfile?.skills || userProfile?.experience
        ? `\n\nUser profile: Name=${userProfile.name || "not provided"}, Field/Major=${userProfile.field || "not provided"}, Skills=${userProfile.skills || "not provided"}, Experience Level=${userProfile.experience || "not provided"}`
        : "");

    // First call
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: systemWithProfile,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages,
    });

    // Agentic loop — handle tool use
    if (response.stop_reason === "tool_use") {
      const toolResults = response.content
        .filter((b) => b.type === "tool_use")
        .map((b) => ({ type: "tool_result", tool_use_id: b.id, content: "Search completed" }));

      const continueMessages = [
        ...messages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ];

      const response2 = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: systemWithProfile,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: continueMessages,
      });

      return Response.json({ content: response2.content, stop_reason: response2.stop_reason });
    }

    return Response.json({ content: response.content, stop_reason: response.stop_reason });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
