import { NextResponse } from "next/server";
import { routerFetch } from "@/lib/cloud";
export const runtime = "edge";
export async function POST(req: Request) {
  const body = await req.text();
  const data = await routerFetch<Record<string, unknown>>("/eval/infer", { method: "POST", body });
  if (data === null) return NextResponse.json({ error: "inference failed — model may not be served, or router not wired" }, { status: 502 });
  return NextResponse.json(data);
}
