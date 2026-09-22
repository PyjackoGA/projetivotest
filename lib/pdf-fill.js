/* Fills the real Annexe 4 PDF template using pdf-lib, based on coordinates
   calibrated against assets/annexe4-template.pdf (A4, 595.3 x 841.9 pt).
   Loaded as a plain <script> (no bundler) — exposes window.IvoPdfFill. */
(function () {
  "use strict";

  var TEMPLATE_URL = "../assets/annexe4-template.pdf";

  function sanitize(s) {
    if (s === null || s === undefined) return "";
    return String(s)
      .replace(/’/g, "'")
      .replace(/[‘‛]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/–|—/g, "-")
      .replace(/…/g, "...")
      .replace(/[^\x00-\xFF]/g, "?"); // WinAnsi-safe fallback
  }

  function n(v) {
    var f = parseFloat(v);
    return isNaN(f) ? 0 : f;
  }
    function fmt(v) {
    if (v === "" || v === null || v === undefined) return "";
    return n(v).toLocaleString("fr-FR").replace(/[\u202F\u00A0]/g, " ");
  }
  function yn(v) {
    return v === true ? "oui" : v === false ? "non" : null;
  }
  function fmtDate(v) {
    if (!v) return "";
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    return m ? m[3] + "/" + m[2] + "/" + m[1] : v;
  }

  /* ---- field map ------------------------------------------------------ *
   * Each entry: [page(1-based), x, y, kind]
   *   kind "text"  -> value drawn as-is at (x,y), baseline origin
   *   kind "check" -> an "X" drawn at (x,y) to tick a box
   * Coordinates are PDF points, origin bottom-left (pdf-lib convention == pdf.js item.transform).
   */
  var F = {
    // PARTIE 1 — identité (page 1)
    nom: [1, 96, 491.5],
    prenom: [1, 112, 470.8],
    dateNaissance: [1, 182, 450.5],
    adresseL1: [1, 118, 437.1],
    profession: [1, 59.4, 383.4],
    conjointNom: [1, 341, 491.5],
    conjointPrenom: [1, 357, 470.8],
    conjointDateNaissance: [1, 437, 450.5],
    nbEnfants: [1, 440, 250.6],
    situationFamille_Célibataire: [1, 162, 357, "check"],
    situationFamille_Pacsé_e_: [1, 243, 357, "check"],
    "situationFamille_Marié(e)": [1, 315, 357, "check"],
    "situationFamille_Divorcé(e)": [1, 378, 357, "check"],
    situationFamille_Veuf: [1, 450, 357, "check"],
    "regime_Communauté légale": [1, 54, 307.2, "check"],
    "regime_Communauté universelle": [1, 234, 307.2, "check"],
    regime_Séparation: [1, 408, 307.2, "check"],
    regime_Participation: [1, 54, 290.8, "check"],
    moraleDenomination: [1, 140, 162.4],
    moraleForme: [1, 145, 147],
    moraleAdresse: [1, 230, 132],
    moralePays: [1, 90, 116.1],
    moraleRcs: [1, 200, 100.7],
    moraleActivite: [1, 175, 85.2],
    regimeFiscal_IR: [1, 161, 70.2, "check"],
    regimeFiscal_IS: [1, 190, 70.2, "check"],

    // page 2 — représentant + PPE + origine des fonds (personne morale)
    repNom: [2, 85, 676.3],
    repPrenom: [2, 245, 676.3],
    repFonction: [2, 430, 676.3],
    repTel: [2, 85, 661],
    repEmail: [2, 95, 645.5],
    ppeVous_oui: [2, 177.4, 528, "check"],
    ppeVous_non: [2, 245.2, 528, "check"],
    ppeConjoint_oui: [2, 177.4, 512.7, "check"],
    ppeConjoint_non: [2, 245.2, 512.7, "check"],
    ppeFonction: [2, 250, 497.2],
    ppePays: [2, 130, 481.7],
    ppeFamille_oui: [2, 73.4, 420, "check"],
    ppeFamille_non: [2, 139, 420, "check"],
    ppeFamilleFonction: [2, 250, 404.5],
    ppeFamillePays: [2, 130, 389.1],
    beneficiaires: [2, 60, 295.5],
    controle: [2, 80, 233.7],

    // page 4 — origine des fonds + patrimoine physique
    fondsMontant: [4, 250, 675.9],
    fondsOrigine_france: [4, 54, 633.6, "check"],
    fondsOrigine_etranger: [4, 195.6, 633.6, "check"],
    fondsOrigineDetail: [4, 365, 633.6],
    fondsNature_transfert: [4, 54, 619.7, "check"],
    fondsNature_vm: [4, 54, 606.2, "check"],
    fondsNature_immo: [4, 54, 592.8, "check"],
    fondsNature_epargne: [4, 54, 579.4, "check"],
    fondsNature_heritage: [4, 54, 565.9, "check"],
    fondsNature_salaires: [4, 54, 552.5, "check"],
    fondsNature_autre: [4, 54, 539, "check"],
    fondsAutreNature: [4, 165, 539.5],
    ppResidencePrincipale: [4, 420, 393.5],
    ppResidenceSecondaire: [4, 420, 368.8],
    ppImmobilierInvest: [4, 420, 344.9],
    ppAutresImmo: [4, 420, 323.5],
    ppAssuranceVie: [4, 420, 289],
    ppComptesTitres: [4, 420, 267.5],
    ppEpargneLogement: [4, 420, 243.9],
    ppEpargneSalariale: [4, 420, 218.9],
    ppAutresFinanciers: [4, 420, 196.1],
    ppActifsPro: [4, 420, 174.5],
    ppLiquidites: [4, 420, 152.2],

    // page 5 — revenus/charges physique + patrimoine morale
    ppRevenusPro: [5, 235, 666],
    ppChargesEmprunt: [5, 478, 666],
    ppRevenusLocatifs: [5, 235, 652.1],
    ppChargesPension: [5, 478, 652.1],
    ppRevenusVM: [5, 235, 638.2],
    ppChargesCourantes: [5, 478, 638.2],
    ppRevenusAutres: [5, 235, 624.3],
    ppChargesAutres: [5, 478, 624.3],
    ppRevenusTotal: [5, 235, 610.3],
    ppChargesTotal: [5, 478, 610.3],
    ppImpotRevenu: [5, 160, 555.6],
    ppImpotLocatif: [5, 108, 527.8],
    ppImpotVM: [5, 158, 513.7],
    pmLocauxPro: [5, 420, 373.8],
    pmImmobilierInvest: [5, 420, 347.5],
    pmAutresImmo: [5, 420, 317.2],
    pmComptesTitres: [5, 420, 289.1],
    pmAutresFinanciers: [5, 420, 263.1],
    pmAutresActifs: [5, 420, 238.6],
    pmTresorerie: [5, 420, 216.3],
    pmProduitsExploitation: [5, 235, 143.4],
    pmChargesExploitation: [5, 478, 143.4],
    pmProduitsFinanciers: [5, 235, 129.5],
    pmChargesFinancieres: [5, 478, 129.5],
    pmProduitsExceptionnels: [5, 235, 115.6],
    pmChargesExceptionnelles: [5, 478, 115.6],

    // page 6 — impôt morale + connaissance/expérience
    pmImpot: [6, 215, 679.9],
    gereSeul_oui: [6, 74.1, 323.7, "check"],
    gereSeul_non: [6, 141.6, 323.7, "check"],
    gereSeulDepuis: [6, 270, 307.7],
    mandatGestion_oui: [6, 74.1, 267.9, "check"],
    mandatGestion_non: [6, 141.6, 267.9, "check"],
    experiencePro_oui: [6, 74.1, 212.2, "check"],
    experiencePro_non: [6, 141.6, 212.2, "check"],
    gains_oui: [6, 74.1, 170, "check"],
    gains_non: [6, 141.6, 170, "check"],
    pertes_oui: [6, 74.1, 127.6, "check"],
    pertes_non: [6, 141.6, 127.6, "check"],
    conscienceRisque_oui: [6, 74.1, 71.9, "check"],
    conscienceRisque_non: [6, 141.6, 71.9, "check"],

    // page 7 — objectifs, horizon, ESG q1/q2
    projetsCourtTerme: [7, 60, 299.9],
    "esgInclure_oui": [7, 54, 192.6, "check"],
    "esgInclure_non": [7, 54, 178.2, "check"],
    esgInclure_nonExprime: [7, 54, 163.7, "check"],
    esgThematique_environnementale: [7, 54, 120, "check"],
    esgThematique_sociale: [7, 54, 105.6, "check"],
    esgThematique_gouvernance: [7, 54, 91.1, "check"],

    // page 8 — ESG q3/q4, profil de risque
    esgSfdr_convient: [8, 54, 678.1, "check"],
    esgSfdr_pasImportant: [8, 54, 663.6, "check"],
    esgSfdr_revoir: [8, 54, 649.2, "check"],
    esgImpact_non: [8, 54, 593.2, "check"],
    esgImpact_oui: [8, 54, 564.3, "check"],
    risquePerte_p1: [8, 60.1, 449.1, "check"],
    risquePerte_p2: [8, 182.9, 449.1, "check"],
    risquePerte_p3: [8, 305.7, 449.1, "check"],
    risquePerte_p4: [8, 428.7, 449.1, "check"],
    risqueReaction_conserver: [8, 54, 408.3, "check"],
    risqueReaction_vendre: [8, 54, 394.8, "check"],
    risqueReaction_investir: [8, 54, 381.4, "check"],
    risqueRendement_r1: [8, 57.4, 327.7, "check"],
    risqueRendement_r2: [8, 57.4, 314.3, "check"],
    risqueRendement_r3: [8, 57.4, 300.9, "check"],
  };

  // Objectifs ranking + horizon checkbox coordinates (indexed by list position)
  var OBJ_ROWS_PHYSIQUE = {
    valoriser: [7, 621],
    completer: [7, 607.1],
    diversifier: [7, 592.6],
    securite: [7, 578.6],
    fiscalite: [7, 564.1],
    performance: [7, 549.7],
    succession: [7, 535.8],
  };
  var OBJ_ROWS_MORALE = {
    valoriser: [7, 438.7],
    tresorerie: [7, 424.7],
    diversifier: [7, 410.5],
    revenus: [7, 396.4],
    fiscalite: [7, 382.2],
    investissements: [7, 368],
    garantie: [7, 353.9],
  };
  var HORIZON_ROWS_PHYSIQUE = { court: 621.9, moyen: 607.9, long: 593.4, tlong: 579.5 };
  var HORIZON_ROWS_MORALE = { court: 439.7, moyen: 425.5, long: 411.4, tlong: 397.2 };

  var INSTRUMENT_ROWS = {
    actions: 552.4,
    obligations: 535.5,
    monetaire: 511.8,
    opcvm: 481.5,
    etf: 457.8,
    warrants: 440.9,
    defiscalisation: 417.3,
    nonCotees: 393.6,
    contratsFinanciers: 370,
  };
  var INSTRUMENT_COLS = { oui: 213, non: 259.6, aucune: 323.3, "1": 399.5, "5": 475.4 };

  // PARTIE 3 — critères de vigilance renforcée (page 3), rempli par le conseiller
  var AML_ROWS = [
    { key: "ppeBeneficiaires", y: 670.8, label: "Des Personnes Politiquement Exposées ont été identifiées parmi les bénéficiaires effectifs" },
    { key: "listesSanctions", y: 643.5, label: "Des personnes présentes dans une liste des terroristes ou de gel des avoirs ont été identifiées" },
    { key: "refusPieces", y: 616.1, label: "Refus ou impossibilité de produire des pièces justificatives sur la provenance des fonds" },
    { key: "diligencesImpossibles", y: 575.3, label: "Les diligences usuelles ne permettent pas d'identifier le bénéficiaire effectif" },
    { key: "rapatriementEtranger", y: 555.6, label: "Rapatriement de fonds d'un pays imposant des obligations LCB/FT non équivalentes" },
    { key: "relationDistance", y: 528.3, label: "Le client veut entrer en relation à distance" },
    { key: "paysRisque", y: 508.6, label: "Le ou les bénéficiaires effectifs résident dans un pays à risque" },
    { key: "changementsStatutaires", y: 488.9, label: "Changements statutaires fréquents non justifiés par la situation économique" },
    { key: "interpositionPersonnes", y: 461.5, label: "Interposition de personnes physiques n'intervenant qu'en apparence" },
    { key: "transactionSousEvaluee", y: 420.7, label: "Transaction immobilière à un prix manifestement sous-évalué" },
    { key: "comportementAtypique", y: 401.1, label: "Comportement atypique du client (urgence à investir, etc.)" },
    { key: "societesEcran1", y: 373.7, label: "Utilisation de sociétés écran (siège dans un État non coopératif)" },
    { key: "operationsIncoherentes", y: 292.6, label: "Opérations financières incohérentes / secteurs sensibles à la fraude TVA" },
    { key: "societesEcran2", y: 251.8, label: "Utilisation de sociétés écran (domiciliataire / adresse privée)" },
  ];
  var AML_OUI_X = 62.8, AML_NON_X = 95.9;

  // PARTIE 8 — profil de risque retenu par IVO (pages 8 et 9)
  var PROFIL_CHECK = {
    prudent: [8, 145, 190.5],
    equilibre: [8, 145, 135.7],
    dynamique: [9, 145, 706.8],
    discretionnaire: [9, 148.5, 639.1],
  };

  // PARTIE 9 — préconisations (page 9) : case à cocher + zone de texte libre en dessous
  var PRECONISATIONS_ROWS = {
    conseilInvestissement: { checkX: 54, checkY: 448.1, noteTop: 434, noteBottom: 374 },
    gestionMandat: { checkX: 54, checkY: 367.6, noteTop: 353, noteBottom: 293 },
    rto: { checkX: 54, checkY: 287.1, noteTop: 273, noteBottom: 213 },
    assuranceVie: { checkX: 54, checkY: 206.4, noteTop: 192, noteBottom: 96 },
  };

  // PARTIE 10 — reconnaissance de réception + lieu/date (page 10)
  var RECON_ROWS = {
    conseils: [10, 54, 693.9],
    documentInfo: [10, 54, 680.4],
    infosPrecontractuelles: [10, 54, 667],
    courrierCategorisation: [10, 54, 653.5],
  };

  function normalizeState(state) {
    state = state || {};
    state.morale = state.morale || {};
    state.contact = state.contact || {};
    state.ppe = state.ppe || {};
    state.fonds = state.fonds || {};
    state.pp = state.pp || {};
    state.pm = state.pm || {};
    state.instruments = state.instruments || {};
    Object.keys(INSTRUMENT_ROWS).forEach(function (k) { state.instruments[k] = state.instruments[k] || {}; });
    state.objOrder = state.objOrder || Object.keys(OBJ_ROWS_PHYSIQUE);
    state.objOrderMorale = state.objOrderMorale || Object.keys(OBJ_ROWS_MORALE);
    state.esg = state.esg || {};
    state.risque = state.risque || {};
    return state;
  }

  async function fillAnnexe4(state, advisorAnswers) {
    state = normalizeState(state);
    var PDFLib = window.PDFLib;
    var bytes = await fetch(TEMPLATE_URL).then(function (r) {
      if (!r.ok) throw new Error("Impossible de charger le modèle PDF (" + r.status + ")");
      return r.arrayBuffer();
    });
    var pdfDoc = await PDFLib.PDFDocument.load(bytes);
    var font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    var fontBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    var pages = pdfDoc.getPages();
    var navy = PDFLib.rgb(0.06, 0.1, 0.32);
    var black = PDFLib.rgb(0, 0, 0);

    function drawText(pageIdx, x, y, text, size) {
      var t = sanitize(text);
      if (!t) return;
      pages[pageIdx - 1].drawText(t, {
        x: x,
        y: y + 1.3,
        size: size || 9,
        font: font,
        color: navy,
      });
    }
    function drawCheck(pageIdx, x, y) {
      pages[pageIdx - 1].drawText("X", {
        x: x + 0.5,
        y: y + 0.5,
        size: 9,
        font: fontBold,
        color: black,
      });
    }
    function put(key, value) {
      var f = F[key];
      if (!f || value === null || value === undefined || value === "") return;
      if (f[3] === "check") drawCheck(f[0], f[1], f[2]);
      else drawText(f[0], f[1], f[2], value);
    }
    function putCheckIf(key, condition) {
      if (condition) {
        var f = F[key];
        if (f) drawCheck(f[0], f[1], f[2]);
      }
    }

    var isMorale = state.personType === "morale";

    // Identité
    if (!isMorale) {
      put("nom", state.nom);
      put("prenom", state.prenom);
      put("dateNaissance", fmtDate(state.dateNaissance));
      put("adresseL1", state.adresse);
      put("profession", state.profession);
      if (state.renseignerConjoint) {
        put("conjointNom", state.conjoint.nom);
        put("conjointPrenom", state.conjoint.prenom);
        put("conjointDateNaissance", fmtDate(state.conjoint.dateNaissance));
      }
      put("nbEnfants", state.nbEnfants);
      var sfKey = "situationFamille_" + (state.situationFamille || "").replace(/[^A-Za-zÀ-ÿ()]/g, "_");
      // direct lookups (accents/parentheses kept in map keys above)
      if (state.situationFamille === "Célibataire") putCheckIf("situationFamille_Célibataire", true);
      if (state.situationFamille === "Pacsé(e)") putCheckIf("situationFamille_Pacsé_e_", true);
      if (state.situationFamille === "Marié(e)") putCheckIf("situationFamille_Marié(e)", true);
      if (state.situationFamille === "Divorcé(e)") putCheckIf("situationFamille_Divorcé(e)", true);
      if (state.situationFamille === "Veuf / veuve") putCheckIf("situationFamille_Veuf", true);
      if (state.regimeMatrimonial === "Communauté légale") putCheckIf("regime_Communauté légale", true);
      if (state.regimeMatrimonial === "Communauté universelle") putCheckIf("regime_Communauté universelle", true);
      if (state.regimeMatrimonial === "Séparation de biens") putCheckIf("regime_Séparation", true);
      if (state.regimeMatrimonial === "Participation aux acquêts") putCheckIf("regime_Participation", true);
    } else {
      put("moraleDenomination", state.morale.denomination);
      put("moraleForme", state.morale.formeJuridique);
      put("moraleAdresse", state.morale.adresse);
      put("moralePays", state.morale.pays);
      put("moraleRcs", state.morale.rcs);
      put("moraleActivite", state.morale.activite);
      putCheckIf("regimeFiscal_IR", state.morale.regimeFiscal === "IR");
      putCheckIf("regimeFiscal_IS", state.morale.regimeFiscal === "IS");
      put("repNom", state.morale.repNom);
      put("repPrenom", state.morale.repPrenom);
      put("repFonction", state.morale.repFonction);
      put("repTel", state.morale.repTel);
      put("repEmail", state.morale.repEmail);
    }

    // Vigilance / PPE / origine des fonds
    putCheckIf("ppeVous_oui", state.ppe.vous === true);
    putCheckIf("ppeVous_non", state.ppe.vous === false);
    putCheckIf("ppeConjoint_oui", state.ppe.conjointPPE === true);
    putCheckIf("ppeConjoint_non", state.ppe.conjointPPE === false);
    put("ppeFonction", state.ppe.vousFonction);
    put("ppePays", state.ppe.vousPays);
    putCheckIf("ppeFamille_oui", state.ppe.famille === true);
    putCheckIf("ppeFamille_non", state.ppe.famille === false);
    put("ppeFamilleFonction", state.ppe.familleFonction);
    put("ppeFamillePays", state.ppe.famillePays);
    if (isMorale) {
      put("beneficiaires", state.beneficiaires);
      put("controle", state.controle);
    }
    put("fondsMontant", state.fonds.montant ? fmt(state.fonds.montant) : "");
    putCheckIf("fondsOrigine_france", state.fonds.origine === "france");
    putCheckIf("fondsOrigine_etranger", state.fonds.origine === "etranger");
    put("fondsOrigineDetail", state.fonds.origineDetail);
    var natures = state.fonds.natures || [];
    ["transfert", "vm", "immo", "epargne", "heritage", "salaires", "autre"].forEach(function (k) {
      putCheckIf("fondsNature_" + k, natures.indexOf(k) > -1);
    });
    put("fondsAutreNature", state.fonds.autreNature);

    // Patrimoine
    if (!isMorale) {
      var pp = state.pp;
      put("ppResidencePrincipale", pp.residencePrincipale ? fmt(pp.residencePrincipale) : "");
      put("ppResidenceSecondaire", pp.residenceSecondaire ? fmt(pp.residenceSecondaire) : "");
      put("ppImmobilierInvest", pp.immobilierInvest ? fmt(pp.immobilierInvest) : "");
      put("ppAutresImmo", pp.autresImmo ? fmt(pp.autresImmo) : "");
      put("ppAssuranceVie", pp.assuranceVie ? fmt(pp.assuranceVie) : "");
      put("ppComptesTitres", pp.comptesTitres ? fmt(pp.comptesTitres) : "");
      put("ppEpargneLogement", pp.epargneLogement ? fmt(pp.epargneLogement) : "");
      put("ppEpargneSalariale", pp.epargneSalariale ? fmt(pp.epargneSalariale) : "");
      put("ppAutresFinanciers", pp.autresFinanciers ? fmt(pp.autresFinanciers) : "");
      put("ppActifsPro", pp.actifsPro ? fmt(pp.actifsPro) : "");
      put("ppLiquidites", pp.liquidites ? fmt(pp.liquidites) : "");
      put("ppRevenusPro", pp.revenusPro ? fmt(pp.revenusPro) : "");
      put("ppChargesEmprunt", pp.chargesEmprunt ? fmt(pp.chargesEmprunt) : "");
      put("ppRevenusLocatifs", pp.revenusLocatifs ? fmt(pp.revenusLocatifs) : "");
      put("ppChargesPension", pp.chargesPension ? fmt(pp.chargesPension) : "");
      put("ppRevenusVM", pp.revenusVM ? fmt(pp.revenusVM) : "");
      put("ppChargesCourantes", pp.chargesCourantes ? fmt(pp.chargesCourantes) : "");
      put("ppRevenusAutres", pp.revenusAutres ? fmt(pp.revenusAutres) : "");
      put("ppChargesAutres", pp.chargesAutres ? fmt(pp.chargesAutres) : "");
      var revTotal = n(pp.revenusPro) + n(pp.revenusLocatifs) + n(pp.revenusVM) + n(pp.revenusAutres);
      var chgTotal = n(pp.chargesEmprunt) + n(pp.chargesPension) + n(pp.chargesCourantes) + n(pp.chargesAutres);
      if (revTotal) put("ppRevenusTotal", fmt(revTotal));
      if (chgTotal) put("ppChargesTotal", fmt(chgTotal));
      put("ppImpotRevenu", pp.impotRevenu ? fmt(pp.impotRevenu) : "");
      put("ppImpotLocatif", pp.impotLocatif ? fmt(pp.impotLocatif) : "");
      put("ppImpotVM", pp.impotVM ? fmt(pp.impotVM) : "");
    } else {
      var pm = state.pm;
      put("pmLocauxPro", pm.locauxPro ? fmt(pm.locauxPro) : "");
      put("pmImmobilierInvest", pm.immobilierInvest ? fmt(pm.immobilierInvest) : "");
      put("pmAutresImmo", pm.autresImmo ? fmt(pm.autresImmo) : "");
      put("pmComptesTitres", pm.comptesTitres ? fmt(pm.comptesTitres) : "");
      put("pmAutresFinanciers", pm.autresFinanciers ? fmt(pm.autresFinanciers) : "");
      put("pmAutresActifs", pm.autresActifs ? fmt(pm.autresActifs) : "");
      put("pmTresorerie", pm.tresorerie ? fmt(pm.tresorerie) : "");
      put("pmProduitsExploitation", pm.produitsExploitation ? fmt(pm.produitsExploitation) : "");
      put("pmChargesExploitation", pm.chargesExploitation ? fmt(pm.chargesExploitation) : "");
      put("pmProduitsFinanciers", pm.produitsFinanciers ? fmt(pm.produitsFinanciers) : "");
      put("pmChargesFinancieres", pm.chargesFinancieres ? fmt(pm.chargesFinancieres) : "");
      put("pmProduitsExceptionnels", pm.produitsExceptionnels ? fmt(pm.produitsExceptionnels) : "");
      put("pmChargesExceptionnelles", pm.chargesExceptionnelles ? fmt(pm.chargesExceptionnelles) : "");
      put("pmImpot", pm.impot ? fmt(pm.impot) : "");
    }

    // Connaissance / expérience
    Object.keys(INSTRUMENT_ROWS).forEach(function (k) {
      var v = state.instruments[k];
      if (!v) return;
      var y = INSTRUMENT_ROWS[k];
      if (v.connait === true) drawCheck(6, INSTRUMENT_COLS.oui, y);
      if (v.connait === false) drawCheck(6, INSTRUMENT_COLS.non, y);
      if (v.ops && INSTRUMENT_COLS[v.ops] !== undefined) drawCheck(6, INSTRUMENT_COLS[v.ops], y);
    });
    putCheckIf("gereSeul_oui", state.gereSeul === true);
    putCheckIf("gereSeul_non", state.gereSeul === false);
    put("gereSeulDepuis", state.gereSeulDepuis);
    putCheckIf("mandatGestion_oui", state.mandatGestion === true);
    putCheckIf("mandatGestion_non", state.mandatGestion === false);
    putCheckIf("experiencePro_oui", state.experiencePro === true);
    putCheckIf("experiencePro_non", state.experiencePro === false);
    putCheckIf("gains_oui", state.gains === true);
    putCheckIf("gains_non", state.gains === false);
    putCheckIf("pertes_oui", state.pertes === true);
    putCheckIf("pertes_non", state.pertes === false);
    putCheckIf("conscienceRisque_oui", state.conscienceRisque === true);
    putCheckIf("conscienceRisque_non", state.conscienceRisque === false);

    // Objectifs / horizon
    var objRows = isMorale ? OBJ_ROWS_MORALE : OBJ_ROWS_PHYSIQUE;
    var order = isMorale ? state.objOrderMorale : state.objOrder;
    order.forEach(function (key, idx) {
      var row = objRows[key];
      if (row) drawText(row[0], 240, row[1] + 0.4, String(idx + 1), 9);
    });
    var horizonRows = isMorale ? HORIZON_ROWS_MORALE : HORIZON_ROWS_PHYSIQUE;
    if (state.horizon && horizonRows[state.horizon] !== undefined) {
      drawCheck(7, 525.8, horizonRows[state.horizon]);
    }
    put("projetsCourtTerme", state.projetsCourtTerme);

    // Durabilité
    putCheckIf("esgInclure_oui", state.esg.inclure === "oui");
    putCheckIf("esgInclure_non", state.esg.inclure === "non");
    putCheckIf("esgInclure_nonExprime", state.esg.inclure === "nonExprime");
    putCheckIf("esgThematique_environnementale", state.esg.thematique === "environnementale");
    putCheckIf("esgThematique_sociale", state.esg.thematique === "sociale");
    putCheckIf("esgThematique_gouvernance", state.esg.thematique === "gouvernance");
    putCheckIf("esgSfdr_convient", state.esg.sfdr === "convient");
    putCheckIf("esgSfdr_pasImportant", state.esg.sfdr === "pasImportant");
    putCheckIf("esgSfdr_revoir", state.esg.sfdr === "revoir");
    putCheckIf("esgImpact_non", state.esg.impact === "non");
    putCheckIf("esgImpact_oui", state.esg.impact === "oui");

    // Profil de risque (Partie 7 — questions client)
    putCheckIf("risquePerte_p1", state.risque.perte === "p1");
    putCheckIf("risquePerte_p2", state.risque.perte === "p2");
    putCheckIf("risquePerte_p3", state.risque.perte === "p3");
    putCheckIf("risquePerte_p4", state.risque.perte === "p4");
    putCheckIf("risqueReaction_conserver", state.risque.reaction === "conserver");
    putCheckIf("risqueReaction_vendre", state.risque.reaction === "vendre");
    putCheckIf("risqueReaction_investir", state.risque.reaction === "investir");
    putCheckIf("risqueRendement_r1", state.risque.rendement === "r1");
    putCheckIf("risqueRendement_r2", state.risque.rendement === "r2");
    putCheckIf("risqueRendement_r3", state.risque.rendement === "r3");

    // ---- Partie conseiller (Parties 3, 8, 9, 10) ------------------------
    if (advisorAnswers) {
      var aa = advisorAnswers;

      if (aa.aml) {
        AML_ROWS.forEach(function (row) {
          var v = aa.aml[row.key];
          if (v === true) drawCheck(3, AML_OUI_X, row.y);
          if (v === false) drawCheck(3, AML_NON_X, row.y);
        });
      }

      if (aa.profil && PROFIL_CHECK[aa.profil]) {
        var pc = PROFIL_CHECK[aa.profil];
        drawCheck(pc[0], pc[1], pc[2]);
      }

      if (aa.preconisations) {
        Object.keys(PRECONISATIONS_ROWS).forEach(function (k) {
          var item = aa.preconisations[k];
          var row = PRECONISATIONS_ROWS[k];
          if (!item) return;
          if (item.checked) drawCheck(9, row.checkX, row.checkY);
          if (item.note) drawWrapped(9, 66.2, row.noteTop, row.noteBottom, 470, item.note, 8.5);
        });
      }

      if (aa.reconnaissance) {
        Object.keys(RECON_ROWS).forEach(function (k) {
          if (aa.reconnaissance[k]) {
            var r = RECON_ROWS[k];
            drawCheck(r[0], r[1], r[2]);
          }
        });
      }
      put_advisor_text(10, 400, 533.2, aa.lieu);
      put_advisor_text(10, 54, 519.3, aa.date ? fmtDate(aa.date) : "");
    }

    // Embarque les données structurées dans le PDF lui-même (pièce jointe invisible
    // à l'impression) pour pouvoir réimporter fidèlement ce dossier plus tard,
    // sans dépendre de Supabase (ex : envoi automatique en panne, dossier papier).
    var embedPayload = { ivoKyc: true, clientAnswers: state };
    if (advisorAnswers) embedPayload.advisorAnswers = advisorAnswers;
    await pdfDoc.attach(new TextEncoder().encode(JSON.stringify(embedPayload)), "ivo-kyc-data.json", {
      mimeType: "application/json",
      description: "Données structurées IVO KYC (usage interne, ne pas modifier)",
    });

    return pdfDoc.save();

    function put_advisor_text(pageIdx, x, y, text) {
      if (!text) return;
      drawText(pageIdx, x, y, text, 9);
    }

    function drawWrapped(pageIdx, x, yTop, yBottom, maxWidth, text, size) {
      var t = sanitize(text);
      if (!t) return;
      var words = t.split(/\s+/);
      var lines = [];
      var line = "";
      words.forEach(function (w) {
        var candidate = line ? line + " " + w : w;
        if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
          lines.push(line);
          line = w;
        } else {
          line = candidate;
        }
      });
      if (line) lines.push(line);
      var lineHeight = size + 2.5;
      var maxLines = Math.max(1, Math.floor((yTop - yBottom) / lineHeight));
      var y = yTop;
      for (var i = 0; i < Math.min(lines.length, maxLines); i++) {
        pages[pageIdx - 1].drawText(lines[i], { x: x, y: y, size: size, font: font, color: navy });
        y -= lineHeight;
      }
    }
  }

  // Relit les données structurées embarquées dans un PDF généré par fillAnnexe4
  // (pdf-lib 1.17 n'a pas d'API haut niveau pour ça : lecture manuelle du
  // dictionnaire /Names /EmbeddedFiles). Retourne null si le PDF n'en contient pas
  // (ex : PDF d'origine autre, ou modifié depuis).
  async function extractEmbeddedData(bytes) {
    try {
      var PDFLib = window.PDFLib;
      var doc = await PDFLib.PDFDocument.load(bytes, { updateMetadata: false });
      var namesDict = doc.catalog.lookup(PDFLib.PDFName.of("Names"));
      var embeddedFiles = namesDict && namesDict.lookup(PDFLib.PDFName.of("EmbeddedFiles"));
      var namesArr = embeddedFiles && embeddedFiles.lookup(PDFLib.PDFName.of("Names"));
      if (!namesArr) return null;
      for (var i = 0; i < namesArr.size(); i += 2) {
        var fileSpecRef = namesArr.get(i + 1);
        var fileSpec = doc.context.lookup(fileSpecRef);
        var efDict = fileSpec.lookup(PDFLib.PDFName.of("EF"));
        var streamRef = efDict.get(PDFLib.PDFName.of("F"));
        var stream = doc.context.lookup(streamRef);
        var decoded = PDFLib.decodePDFRawStream(stream).decode();
        var text = new TextDecoder().decode(decoded);
        var parsed = JSON.parse(text);
        if (parsed && parsed.ivoKyc) return parsed;
      }
      return null;
    } catch (e) {
      console.error("extractEmbeddedData failed:", e);
      return null;
    }
  }

  window.IvoPdfFill = { fillAnnexe4: fillAnnexe4, extractEmbeddedData: extractEmbeddedData };
})();
