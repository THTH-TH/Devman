import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CONNECTION_ID = "default";
const DEFAULT_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/gmail.readonly",
];

const DEFAULT_STAGE_FOLDERS = [
  "Feasibility",
  "Acquisition",
  "Funding & Legal",
  "Resource Consent",
  "Building Consent",
  "Engineering Plan Approvals",
  "Sales & Marketing",
  "Pricing",
  "Construction",
  "Settlement & Handover",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getSupabase() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service credentials are not configured.");
  return createClient(supabaseUrl, serviceRoleKey);
}

async function getConnection(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("google_workspace_connections")
    .select("*")
    .eq("id", CONNECTION_ID)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function refreshTokenIfNeeded(connection: any, supabase: ReturnType<typeof createClient>) {
  if (!connection) throw new Error("Google Workspace is not connected.");
  if (new Date(connection.token_expires_at).getTime() > Date.now() + 60_000) {
    return connection.access_token;
  }
  if (!connection.refresh_token) {
    throw new Error("Google refresh token is missing. Reconnect Google Workspace.");
  }

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Google OAuth secrets are not configured.");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || "Google token refresh failed.");

  const expiresAt = new Date(Date.now() + Number(data.expires_in || 3600) * 1000).toISOString();
  await supabase
    .from("google_workspace_connections")
    .update({
      access_token: data.access_token,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", CONNECTION_ID);

  return data.access_token;
}

async function createDriveFolder(accessToken: string, name: string, parentId?: string | null) {
  const metadata: Record<string, unknown> = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) metadata.parents = [parentId];

  const res = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Could not create Drive folder.");
  return data;
}

async function gmailSearch(accessToken: string, query: string, maxResults: number) {
  const searchParams = new URLSearchParams({
    q: query || "newer_than:30d",
    maxResults: String(Math.min(Math.max(maxResults || 10, 1), 20)),
  });

  const searchRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${searchParams}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const searchData = await searchRes.json();
  if (!searchRes.ok) throw new Error(searchData.error?.message || "Gmail search failed.");

  const messages = await Promise.all((searchData.messages || []).map(async (message: any) => {
    const detailParams = new URLSearchParams({
      format: "metadata",
      metadataHeaders: "Subject",
    });
    detailParams.append("metadataHeaders", "From");
    detailParams.append("metadataHeaders", "Date");

    const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?${detailParams}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const detail = await detailRes.json();
    if (!detailRes.ok) return null;
    const headers = new Map((detail.payload?.headers || []).map((h: any) => [String(h.name).toLowerCase(), h.value]));
    return {
      id: detail.id,
      threadId: detail.threadId,
      subject: headers.get("subject") || "(No subject)",
      from: headers.get("from") || "",
      date: headers.get("date") || "",
      snippet: detail.snippet || "",
      url: `https://mail.google.com/mail/u/0/#all/${detail.id}`,
    };
  }));

  return messages.filter(Boolean);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "status";
    const supabase = getSupabase();

    if (action === "auth_url") {
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      if (!clientId || !supabaseUrl) return json({ error: "Google OAuth is not configured." }, 500);

      const state = btoa(JSON.stringify({
        redirect_url: body.redirect_url || "https://devman-liart.vercel.app/documents",
      }));
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: `${supabaseUrl}/functions/v1/google-drive-callback`,
        response_type: "code",
        scope: DEFAULT_SCOPES.join(" "),
        access_type: "offline",
        prompt: "consent",
        state,
      });
      return json({ auth_url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
    }

    const connection = await getConnection(supabase);

    if (action === "status") {
      return json({
        connected: Boolean(connection?.refresh_token || connection?.access_token),
        email: connection?.provider_account_email || "",
        scopes: connection?.scopes || [],
        root_folder_id: connection?.root_folder_id || "",
      });
    }

    const accessToken = await refreshTokenIfNeeded(connection, supabase);

    if (action === "create_project_folders") {
      const projectId = body.project_id;
      if (!projectId) return json({ error: "project_id is required." }, 400);

      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id,name,address")
        .eq("id", projectId)
        .single();
      if (projectError) throw projectError;

      const folderName = `${project.name}${project.address ? " - " + project.address : ""}`;
      const rootFolder = await createDriveFolder(accessToken, folderName, body.parent_folder_id || connection?.root_folder_id || null);
      const subfolders = [];
      for (const folder of DEFAULT_STAGE_FOLDERS) {
        subfolders.push(await createDriveFolder(accessToken, folder, rootFolder.id));
      }

      await supabase
        .from("projects")
        .update({
          drive_folder_url: rootFolder.webViewLink,
          drive_root_folder_id: rootFolder.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId);

      return json({
        success: true,
        root_folder_id: rootFolder.id,
        root_folder_url: rootFolder.webViewLink,
        subfolders,
      });
    }

    if (action === "gmail_search") {
      const messages = await gmailSearch(accessToken, body.query || "", body.max_results || 10);
      return json({ messages });
    }

    if (action === "link_gmail_message") {
      const { project_id, message } = body;
      if (!message?.id) return json({ error: "message is required." }, 400);
      const id = crypto.randomUUID();
      const { data, error } = await supabase.from("documents").insert({
        id,
        project_id: project_id || null,
        name: message.subject || "Gmail message",
        url: message.url || `https://mail.google.com/mail/u/0/#all/${message.id}`,
        category: "email",
        notes: [message.from, message.date, message.snippet].filter(Boolean).join(" | "),
        source: "gmail",
        gmail_message_id: message.id,
        gmail_thread_id: message.threadId || "",
      }).select("*").single();
      if (error) throw error;
      return json({ success: true, document: data });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (err) {
    console.error("google-workspace error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error." }, 500);
  }
});
