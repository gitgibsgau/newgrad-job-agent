import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  try {
    const { job, action, userProfile, resumeText } = await req.json();

    const profile =
      userProfile?.name || userProfile?.field || userProfile?.skills
        ? `Candidate profile — Name: ${userProfile.name || "not provided"}, Field/Role: ${userProfile.field || "not provided"}, Skills: ${userProfile.skills || "not provided"}, Experience: ${userProfile.experience || "not provided"}.`
        : "";

    const prompts = {
      "cold-dm": `Write a short, personalized LinkedIn cold DM (under 120 words) to a recruiter at ${job.company} about the ${job.role} position in ${job.location}. ${profile} Make it genuine and conversational. End with a clear but low-pressure ask. Do NOT use openers like "I hope this message finds you well" or "I came across your profile". Go straight to the point.`,

      "cover-letter": `Write a punchy 2-paragraph cover letter snippet for the ${job.role} role at ${job.company} in ${job.location}. ${profile} First paragraph: connect the candidate's background and skills directly to what this role needs. Second paragraph: show genuine enthusiasm for this specific company and role, and invite next steps. Keep it under 160 words total. No fluff.`,

      "interview-prep": `Generate 5 likely interview questions for the ${job.role} role at ${job.company}. ${profile} Include a mix of behavioral, technical, and role-specific questions. For each, write a 1–2 sentence tip on how to answer it well. Format as:

Q1: [question]
Tip: [tip]

Q2: ...`,

      "find-recruiter": `Suggest 3 specific types of people to reach out to at ${job.company} for the ${job.role} role in ${job.location}. ${profile}

For each contact type, provide:
- Their likely job title
- A LinkedIn search tip to find them
- A short personalized opening line tailored to this role

Format exactly as:
1. [Title]
Find: [LinkedIn search tip, e.g. search "${job.company} Technical Recruiter"]
Message: [one-sentence opening line]

2. [Title]
Find: [LinkedIn search tip]
Message: [one-sentence opening line]

3. [Title]
Find: [LinkedIn search tip]
Message: [one-sentence opening line]

Keep each message under 20 words. Be specific to ${job.company} and the ${job.role} role.`,

      "tailor-resume": `Review this resume for the ${job.role} role at ${job.company} in ${job.location}. ${profile}

Resume:
${resumeText ? resumeText.slice(0, 2000) : "No resume provided"}

Provide exactly 5 specific, actionable bullet points on how to tailor this resume for this specific role. Focus on:
- Keywords to add
- Experience to highlight or reframe
- Skills gaps to address
- Formatting or structure improvements

Format as:
• [specific suggestion]
• [specific suggestion]
• [specific suggestion]
• [specific suggestion]
• [specific suggestion]`,
    };

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      messages: [{ role: "user", content: prompts[action] }],
    });

    return Response.json({ content: response.content[0]?.text || "" });
  } catch (err) {
    console.error(err);
    if (err.status === 429) {
      const retryAfter = err.headers?.["retry-after"] || 60;
      return Response.json(
        { error: "rate_limit", retryAfter: parseInt(retryAfter) },
        { status: 429 }
      );
    }
    return Response.json({ error: err.message }, { status: 500 });
  }
}
