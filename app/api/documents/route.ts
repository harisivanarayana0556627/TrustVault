import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getIdentity } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
const Meta = z.object({
  name: z.string().trim().min(1).max(180),
  category: z.string().trim().min(1).max(60),
});
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "text/plain",
  "image/png",
  "image/jpeg",
]);
export async function POST(req: NextRequest) {
  const db = await createClient();
  const identity = await getIdentity(db);
  if (!identity)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (identity.role !== "owner") {
    await writeAudit({
      actorId: identity.user.id,
      action: "document.upload",
      outcome: "denied",
    });
    return NextResponse.json(
      { error: "Only document owners can upload" },
      { status: 403 },
    );
  }
  try {
    const form = await req.formData();
    const parsed = Meta.safeParse({
      name: form.get("name"),
      category: form.get("category"),
    });
    const file = form.get("file");
    if (!parsed.success || !(file instanceof File))
      return NextResponse.json(
        { error: "Invalid name, category or file" },
        { status: 400 },
      );
    if (file.size < 1 || file.size > MAX_BYTES)
      return NextResponse.json(
        { error: "File must be between 1 byte and 10 MB" },
        { status: 413 },
      );
    if (!ALLOWED.has(file.type))
      return NextResponse.json(
        { error: "Only PDF, TXT, PNG and JPEG are allowed" },
        { status: 415 },
      );
    // Create metadata first so the storage policy can verify the owner of this document.
    const admin = createAdminClient();
    const id = crypto.randomUUID();
    const storagePath = `${id}/content`;
    const { error: insertError } = await admin
      .from("documents")
      .insert({
        id,
        name: parsed.data.name,
        category: parsed.data.category,
        owner_id: identity.user.id,
        storage_path: storagePath,
        mime_type: file.type,
        size_bytes: file.size,
      })
      .select()
      .single();
    if (insertError) throw insertError;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from("vault-documents")
      .upload(storagePath, bytes, { contentType: file.type, upsert: false });
    if (uploadError) {
      await admin
        .from("documents")
        .delete()
        .eq("id", id)
        .eq("owner_id", identity.user.id);
      throw uploadError;
    }
    await writeAudit({
      actorId: identity.user.id,
      action: "document.upload",
      documentId: id,
      outcome: "success",
      details: {
        name: parsed.data.name,
        bytes: file.size,
        mimeType: file.type,
      },
    });
    return NextResponse.json({ id, name: parsed.data.name }, { status: 201 });
  } catch (e) {
    console.error("[documents POST] Upload failed:", e);

    return NextResponse.json(
      { error: "Upload failed. Check server logs for details." },
      { status: 500 },
    );
  }
}
