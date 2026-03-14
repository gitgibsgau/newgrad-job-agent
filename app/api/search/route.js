import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  try {
    const { role, location, level, userProfile, resumeText } = await req.json();

    const levelStr = level && level !== "Any Level" ? level : "";
    const locationStr = location && location.trim() ? `in ${location.trim()}` : "across the US";
    const jobQuery = [levelStr, role].filter(Boolean).join(" ");

    const profileContext =
      userProfile?.skills || userProfile?.field
        ? `\n\nCandidate profile — Name: ${userProfile.name || "not provided"}, Field: ${userProfile.field || "not provided"}, Skills: ${userProfile.skills || "not provided"}, Experience: ${userProfile.experience || "not provided"}. Use this to populate fitScore (0-100) and fitReason for each job.`
        : "\n\nNo candidate profile provided. Leave fitScore as null and fitReason as null.";

    const resumeContext =
      resumeText && resumeText.trim()
        ? `\n\nCandidate resume summary: ${resumeText.slice(0, 1500)}\nUse the resume to provide more accurate fitScore and fitReason values for each job.`
        : "";

    const systemPrompt = `You are a job search agent. Search LinkedIn for ${levelStr ? levelStr + " " : ""}${role} jobs ${locationStr} in 2025. Find 10-15 real current postings. Return ONLY a JSON array inside <jobs>...</jobs> tags: [{"company":"...","role":"...","location":"...","level":"...","posted":"...","link":"...","summary":"...","fitScore":null,"fitReason":null}]. If user profile has skills/field, populate fitScore (0-100) and fitReason. After the JSON, write 1-2 sentences on the market.`;

    const userMessage = `Find ${levelStr ? levelStr + " " : ""}${role} jobs ${locationStr}`;

    const messages = [{ role: "user", content: userMessage }];

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: systemPrompt + profileContext + resumeContext,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages,
    });

    const fullText = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const jobsMatch = fullText.match(/<jobs>([\s\S]*?)<\/jobs>/);

    if (!jobsMatch) {
      return Response.json({ jobs: [], summary: fullText });
    }

    let jobs = [];
    try {
      jobs = JSON.parse(jobsMatch[1].trim());
    } catch {
      return Response.json({ jobs: [], summary: fullText });
    }

    const summary = fullText
      .replace(/<jobs>[\s\S]*?<\/jobs>/g, "")
      .trim();

    return Response.json({ jobs, summary });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
