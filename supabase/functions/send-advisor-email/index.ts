// Edge Function Supabase (Deno). Déploiement :
//   supabase functions deploy send-advisor-email
// Secrets nécessaires (Supabase → Project Settings → Edge Functions → Secrets,
// ou `supabase secrets set NOM=valeur`) :
//   RESEND_API_KEY          la clé API de votre compte Resend
//   RESEND_FROM_EMAIL       ex: "IVO Capital Partners <kyc@ivocapital.com>"
//                            (tant que le domaine n'est pas vérifié sur Resend,
//                             utilisez "onboarding@resend.dev" — n'enverra qu'à
//                             l'adresse du compte Resend, pas aux vrais clients)
//   SUPABASE_SERVICE_ROLE_KEY  auto-fournie par Supabase, rien à faire
//   SUPABASE_URL               auto-fournie par Supabase, rien à faire

import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "onboarding@resend.dev";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY absente (secret non configuré)" }, 500);

  let submissionId: string | undefined;
  try {
    ({ submissionId } = await req.json());
  } catch {
    return json({ error: "corps de requête invalide, {submissionId} attendu" }, 400);
  }
  if (!submissionId) return json({ error: "submissionId manquant" }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: sub, error: subErr } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", submissionId)
    .single();
  if (subErr || !sub) return json({ error: "fiche introuvable", detail: subErr?.message }, 404);
  if (!sub.pdf_client_path) return json({ error: "aucun pdf associé à cette fiche" }, 400);

  const { data: file, error: dlErr } = await supabase.storage
    .from("submissions")
    .download(sub.pdf_client_path);
  if (dlErr || !file) return json({ error: "impossible de récupérer le pdf", detail: dlErr?.message }, 404);

  const pdfBytes = new Uint8Array(await file.arrayBuffer());
  const pdfBase64 = toBase64(pdfBytes);

  const clientLabel = sub.client_name || "un client";
  const resendResp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [sub.advisor_email],
      subject: `Questionnaire de connaissance client — ${clientLabel}`,
      html:
        `<p>Bonjour,</p>` +
        `<p><strong>${clientLabel}</strong>${sub.client_email ? " (" + sub.client_email + ")" : ""} vient de compléter son questionnaire de connaissance client en ligne.</p>` +
        `<p>La fiche pré-remplie (format officiel Annexe 4) est jointe à cet email — il ne vous reste qu'à compléter la partie IVO et à la valider avec le client.</p>` +
        `<p style="color:#5C6B7D;font-size:12px">Envoyé automatiquement par l'outil de connaissance client IVO Capital Partners.</p>`,
      attachments: [
        {
          filename: `connaissance-client-${clientLabel.replace(/[^a-zA-Z0-9-]+/g, "_")}.pdf`,
          content: pdfBase64,
        },
      ],
    }),
  });

  if (!resendResp.ok) {
    const detail = await resendResp.text();
    return json({ error: "l'envoi via Resend a échoué", detail }, 502);
  }

  await supabase.from("submissions").update({ status: "recu", updated_at: new Date().toISOString() }).eq("id", submissionId);

  return json({ ok: true });
});
