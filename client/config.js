/* ==========================================================================
   CONFIGURATION — à modifier avant de déployer.
   Aucune valeur ici n'est secrète : la clé Supabase "anon" est faite pour
   être publique (elle est protégée par les règles RLS côté serveur).
   Ne JAMAIS mettre ici la clé "service_role" de Supabase ni la clé Resend.
   ========================================================================== */
window.IVO_CONFIG = {
  // Réglages → API → Project URL / anon public key, dans votre projet Supabase
  SUPABASE_URL: "https://your-project-ref.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-public-key",

  // Liste affichée dans le menu déroulant "Votre conseiller" en fin de questionnaire.
  ADVISORS: [
    { name: "Tristan Dantin", email: "tristan.dantin@ivocapital.com" },
    { name: "Exemple Conseiller", email: "conseiller.exemple@ivocapital.com" },
  ],
};
