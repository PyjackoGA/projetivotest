/* Sends a completed questionnaire to Supabase (DB row + PDF in Storage) and
   triggers the send-advisor-email Edge Function, so the advisor receives the
   filled PDF automatically — no action needed from the client's own mailbox. */
(function () {
  "use strict";

  function getClient() {
    var cfg = window.IVO_CONFIG;
    if (!cfg || !cfg.SUPABASE_URL || cfg.SUPABASE_URL.indexOf("your-project-ref") > -1) {
      throw new Error("config.js n'est pas encore renseigné avec vos identifiants Supabase.");
    }
    return window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }

  async function submitToAdvisor(state, pdfBytes) {
    var client = getClient();
    var isMorale = state.personType === "morale";
    var clientName = isMorale ? state.morale.denomination : (state.prenom + " " + state.nom).trim();
    var clientEmail = state.contact.email;

    var submissionId = crypto.randomUUID();
    var path = submissionId + ".pdf";

    var upload = await client.storage
      .from("submissions")
      .upload(
        path,
        new Blob([pdfBytes], { type: "application/pdf" }),
        {
          contentType: "application/pdf",
          upsert: false,
        }
      );

    if (upload.error) {
      throw new Error("Échec de l'envoi du PDF : " + upload.error.message);
    }

    var insert = await client
      .from("submissions")
      .insert({
        id: submissionId,
        client_name: clientName,
        client_email: clientEmail,
        person_type: state.personType,
        advisor_email: state.advisorEmail,
        status: "en_cours",
        answers: state,
        pdf_client_path: path,
      });

    if (insert.error) {
      throw new Error(
        "Échec de l'enregistrement de la fiche : " + insert.error.message
      );
    }

    var fn = await client.functions.invoke("send-advisor-email", {
      body: {
        submissionId: submissionId,
      },
    });

    if (fn.error) {
      throw new Error(
        "Le PDF est enregistré, mais l'envoi automatique a échoué : " +
          fn.error.message
      );
    }

    return submissionId;
  }

  window.IvoSubmit = { submitToAdvisor: submitToAdvisor };
})();
