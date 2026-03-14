export async function POST(req) {
  const { code } = await req.json();
  if (code && code === process.env.ACCESS_CODE) {
    return Response.json({ valid: true });
  }
  return Response.json({ valid: false }, { status: 401 });
}
