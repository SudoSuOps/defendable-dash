import { NextResponse } from "next/server";
import { routerFetch } from "@/lib/cloud";
export const runtime = "edge";
export async function GET() {
  const data = await routerFetch<Record<string, unknown>>("/eval/models");
  if (data === null) return NextResponse.json({ models: [], note: "router not wired" });
  return NextResponse.json(data);
}
