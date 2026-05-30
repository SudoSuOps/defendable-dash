import { NextResponse } from "next/server";
import { routerFetch } from "@/lib/cloud";
export const runtime = "edge";
export async function GET() {
  const data = await routerFetch<Record<string, unknown>>("/eval/verdicts?limit=50");
  if (data === null) return NextResponse.json({ count: 0, verdicts: [] });
  return NextResponse.json(data);
}
