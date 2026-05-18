import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONNECTION_ID = "default";

function htmlEscape(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char] || char));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const rawState = url.searchParams.get("state");

  let redirectUrl = "https://devman-liart.vercel.app/documents";
  try {
    if (rawState) {
      const state = JSON.parse(atob(rawState));
      if (state.redirect_url) redirectUrl = state.redirect_url;
    }
  } catch {
    // Keep default redirect.
  }

  if (!code) {
    return Response.redirect(`${redirectUrl}?google_error=missing_code`, 302);
  }

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!clientId || !clientSecret || !supabaseUrl || !serviceRoleKey) {
    const message = encodeURIComponent("Google OAuth is not configured in Supabase secrets.");
    return Response.redirect(`${redirectUrl}?google_error=${message}`, 302);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${supabaseUrl}/functions/v1/google-drive-callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    const message = encodeURIComponent(tokenData.error_description || tokenData.error || "Google token exchange failed.");
    return Response.redirect(`${redirectUrl}?google_error=${message}`, 302);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: existing } = await supabase
    .from("google_workspace_connections")
    .select("refresh_token")
    .eq("id", CONNECTION_ID)
    .maybeSingle();

  const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userInfo = userInfoRes.ok ? await userInfoRes.json() : {};
  const expiresAt = new Date(Date.now() + Number(tokenData.expires_in || 3600) * 1000).toISOString();
  const scopes = String(tokenData.scope || "").split(" ").filter(Boolean);

  const { error } = await supabase.from("google_workspace_connections").upsert({
    id: CONNECTION_ID,
    provider_account_email: userInfo.email || "",
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || existing?.refresh_token || "",
    token_expires_at: expiresAt,
    scopes,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });

  if (error) {
    return new Response(
      `<h1>DevMan Google connection failed</h1><p>${htmlEscape(error.message)}</p>`,
      { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html" } },
    );
  }

  return Response.redirect(`${redirectUrl}?google_connected=true`, 302);
});
