# IVO KYC — Questionnaire de connaissance client

Le client remplit le questionnaire en ligne ; le site génère automatiquement une
réplique fidèle et remplie du vrai PDF « Annexe 4 », puis l'envoie **automatiquement**
par email au conseiller choisi (Supabase + Resend) — **aucune action du client dans
sa propre messagerie**. Le conseiller retrouve ensuite le dossier dans une interface
dédiée, complète sa partie (vigilance LCB-FT, profil de risque, préconisations), et
télécharge le PDF final combiné.

## Structure

```
client/                 Le site que remplit le client
  index.html              Le questionnaire complet
  config.js                À MODIFIER avant de déployer (voir ci-dessous) — partagé avec conseiller/
  calibrate.html            Outil interne : affiche le PDF avec les coordonnées de chaque champ
  extract.html              Outil interne : exporte toutes les coordonnées du PDF en JSON
  test-fill.html             Outil interne : remplit le PDF avec des données de test et l'affiche

conseiller/             L'interface interne IVO (connexion requise)
  index.html              Tableau de bord + formulaire de complétion du dossier
  test-fill.html           Outil interne : teste le remplissage combiné (partie client + partie IVO)

assets/
  annexe4-template.pdf     Le vrai formulaire officiel, utilisé comme calque de remplissage

lib/
  ivo-theme.css            Le design partagé (couleurs, typo, composants) entre client/ et conseiller/
  pdf-fill.js              Place chaque réponse (client + conseiller) aux bonnes coordonnées du PDF officiel
  submit.js                Envoie la fiche + le PDF à Supabase et déclenche l'email au conseiller

supabase/
  schema.sql                À coller dans Supabase → SQL Editor (table + sécurité + stockage)
  functions/send-advisor-email/index.ts   Edge Function : envoie le PDF via Resend
```

## Mise en route — 4 étapes

### 1. Supabase

1. Créez un projet sur [supabase.com](https://supabase.com) — **région Europe (Frankfurt ou Paris)**, pour le RGPD.
2. `SQL Editor` → collez le contenu de `supabase/schema.sql` → `Run`.
3. `Project Settings → API` → copiez l'**URL du projet** et la **clé `anon` `public`**.
4. `Authentication → Users → Add user` → créez un compte (email + mot de passe) pour
   **chaque conseiller** qui doit accéder à `conseiller/index.html`. C'est ce compte
   qu'il utilisera pour se connecter — il n'y a pas d'auto-inscription.

### 2. Resend

1. Sur [resend.com](https://resend.com), récupérez votre **clé API**.
2. Tant qu'aucun domaine n'est vérifié sur Resend, les emails ne peuvent partir
   qu'à l'adresse du compte Resend (mode bac à sable) — pour recevoir chez les
   vrais clients, vérifiez votre domaine (`Domains` → ajouter `ivocapital.com`
   → suivre les enregistrements DNS indiqués). Ça prend quelques minutes.

### 3. Déployer l'Edge Function

Avec la [CLI Supabase](https://supabase.com/docs/guides/cli) :

```bash
supabase login
supabase link --project-ref VOTRE-PROJECT-REF
supabase functions deploy send-advisor-email
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
supabase secrets set RESEND_FROM_EMAIL="IVO Capital Partners <onboarding@resend.dev>"
```

(remplacez `RESEND_FROM_EMAIL` par une adresse `@ivocapital.com` une fois le domaine vérifié.)

### 4. Configurer le site

Éditez `client/config.js` (utilisé aussi par `conseiller/`) :

```js
window.IVO_CONFIG = {
  SUPABASE_URL: "https://votre-project-ref.supabase.co",
  SUPABASE_ANON_KEY: "la-cle-anon-copiee-a-l-etape-1",
  ADVISORS: [
    { name: "Tristan Dantin", email: "tristan.dantin@ivocapital.com" },
    // ajoutez chaque conseiller ici — doit correspondre aux comptes créés à l'étape 1.4
  ],
};
```

⚠️ Ne mettez **jamais** la clé `service_role` de Supabase ni la clé Resend dans ce
fichier : elles ne doivent exister que côté Supabase (secrets de l'Edge Function),
jamais dans du code envoyé au navigateur.

## Lancer en local

```bash
cd ivo-kyc-app
python -m http.server 8000
```

Client : `http://localhost:8000/client/index.html`
Conseiller : `http://localhost:8000/conseiller/index.html`

## Déployer sur GitHub Pages

1. Créez un repo GitHub, poussez ce dossier tel quel (après avoir édité `config.js`).
2. Réglages du repo → Pages → Source = branche `main`, dossier `/ (root)`.
3. Client : `https://<votre-org>.github.io/<repo>/client/`
   Conseiller : `https://<votre-org>.github.io/<repo>/conseiller/`

Aucune étape de build : c'est du HTML/JS pur, GitHub Pages le sert directement.
Le dossier `conseiller/` n'est protégé que par la connexion Supabase (pas par
GitHub Pages, qui est public) — quelqu'un pourrait ouvrir la page de login sans
compte, mais ne verra jamais aucune donnée client sans s'authentifier (protégé par
les règles RLS de la base, pas par l'obscurité de l'URL).

## Ce qui fonctionne déjà

**Côté client** (`client/`)
- Le questionnaire (Parties 1 à 7), charte IVO.
- Génération d'un vrai PDF rempli à partir du modèle officiel — vérifié visuellement
  page par page.
- En fin de parcours : le client choisit son conseiller dans une liste déroulante,
  coche la case de certification, clique une fois — le PDF est déposé dans Supabase
  Storage et le conseiller le reçoit par email automatiquement (Edge Function → Resend).
  Le client garde la possibilité de télécharger une copie pour lui-même.
- En cas d'échec d'envoi (réseau, Supabase down, etc.), un message clair propose de
  réessayer ou de télécharger le PDF pour l'envoyer manuellement en secours.

**Côté conseiller** (`conseiller/`)
- Connexion par email/mot de passe (compte créé par vous dans Supabase, étape 1.4).
- Tableau de bord listant tous les dossiers reçus, avec statut (Reçu / Complété).
- Ouverture d'un dossier : récapitulatif en lecture seule des réponses du client,
  puis formulaire pour la partie IVO :
  - **Partie 3** — critères de vigilance renforcée LCB-FT (14 critères Oui/Non)
  - **Partie 8** — profil de risque retenu par IVO, avec une suggestion pré-cochée
    calculée à partir des réponses du client (modifiable)
  - **Partie 9** — préconisations (case à cocher + zone de texte libre par produit)
  - Reconnaissance de réception des documents + lieu/date
- "Générer le PDF final" combine la partie client et la partie IVO dans le document
  officiel complet, le dépose dans Supabase Storage, marque le dossier "Complété"
  et le télécharge.

**Non testé en conditions réelles** : je n'ai pas de compte Supabase/Resend, donc je
n'ai pas pu vérifier l'envoi ni la connexion bout en bout — seulement la logique, le
rendu et la gestion des erreurs (testés avec des identifiants placeholder et des
données simulées). À tester une fois `config.js`, les secrets et les comptes
conseillers renseignés.

## Prochaines étapes

- **Domaine Resend vérifié** pour que l'envoi automatique fonctionne avec de vrais
  clients (pas seulement en bac à sable).
- La signature électronique n'est volontairement pas gérée par l'outil (le PDF final
  laisse les zones de signature vides) — à traiter séparément (signature manuscrite
  sur le PDF imprimé, ou un outil de signature électronique dédié).

## Recalibrer le PDF (si le formulaire officiel change un jour)

`client/calibrate.html` affiche le PDF avec, en survol, les coordonnées (page/x/y)
de chaque bloc de texte — cliquer sur un champ les imprime en haut de l'écran.
`client/extract.html` exporte tout en JSON d'un coup. Ces coordonnées sont ensuite
reportées à la main dans `lib/pdf-fill.js` (objet `F` pour la partie client, et
`AML_ROWS` / `PROFIL_CHECK` / `PRECONISATIONS_ROWS` / `RECON_ROWS` pour la partie
conseiller).
