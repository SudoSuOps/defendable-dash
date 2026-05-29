import { NextResponse } from "next/server";
import { routerFetch } from "@/lib/cloud";

export const runtime = "edge";

// Live cook telemetry for the Tune tab — proxies the router's /tune (gated, via tunnel).
export async function GET() {
  const state = await routerFetch<Record<string, unknown>>("/tune");
  if (state === null) {
    return NextResponse.json({ status: "unavailable", note: "router not wired" });
  }
  return NextResponse.json(state);
}
