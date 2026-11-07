import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/auth";
import { listJournalVersions } from "@/lib/journal-repository";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await assertAdminApi())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await listJournalVersions((await params).id));
}
