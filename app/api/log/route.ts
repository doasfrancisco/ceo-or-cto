import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const { reason = "unspecified", person, timestamp, ...rest } = payload ?? {};

    console.error("[client-log] Missing image report", {
      reason,
      timestamp,
      person,
      extras: rest,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Failed to process client log", error);
    return NextResponse.json({ error: "Invalid log payload" }, { status: 400 });
  }
}
