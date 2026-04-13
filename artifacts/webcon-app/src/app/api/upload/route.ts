import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || "chat-images";
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only JPG, PNG, WebP, and GIF images are allowed." }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${folder}/${session.userId}/${Date.now()}.${ext}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const supabase = getSupabase();

    // Ensure bucket exists (creates if not present)
    const { error: uploadError, data } = await supabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl, path: fileName });
  } catch (err) {
    console.error("Upload route error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
