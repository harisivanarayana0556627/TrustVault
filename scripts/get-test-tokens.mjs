import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

try {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase URL or anon key missing from .env.local");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const [label, email] of [
    ["A", "owner@trustvault.demo"],
    ["B", "viewer@trustvault.demo"],
  ]) {
    const password = await rl.question(`Password for ${email}: `);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      throw new Error(`Sign-in failed for ${email}: ${error?.message}`);
    }

    console.log(`\nTEST_USER_${label}_JWT=${data.session.access_token}\n`);
    await supabase.auth.signOut();
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  rl.close();
}
