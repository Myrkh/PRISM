import searchOverviewImage  from '@/docs/assets/front/front-search-overview.png'
import searchPaletteImage   from '@/docs/assets/front/front-search-palette.png'
import searchFiltersImage   from '@/docs/assets/front/front-search-filters.png'
import type { DocChapterData } from '@/docs/types'

export const searchChapter: DocChapterData = {
  id: 'front-search',
  group: 'front',
  kicker: 'Front A to Z · 07',
  title: 'Recherche globale',
  summary: "La recherche PRISM indexe l'intégralité du portefeuille en temps réel — projets, SIFs, composants, bibliothèque, hypothèses, révisions, preuves d'exploitation, rapports et notes de workspace. Un raccourci clavier universel (Ctrl+K) ouvre la palette de commandes pour une navigation instantanée ; la vue dédiée permet un filtrage avancé par portée et par projet.",
  icon: 'Search',
  highlights: [
    {
      label: 'Raccourci universel',
      value: 'Ctrl+K (Windows/Linux) · Cmd+K (macOS)',
    },
    {
      label: 'Portées indexées',
      value: '10 scopes : projets, SIFs, composants, bibliothèque, hypothèses, actions, preuves, révisions, rapports, workspace',
    },
    {
      label: 'Pertinence',
      value: 'Scoring multi-critères · accents normalisés · multi-tokens',
    },
    {
      label: 'Navigation directe',
      value: "Résultat → vue cible sans étape intermédiaire",
    },
  ],
  blocks: [
    // ── 1. Vue d'ensemble ──────────────────────────────────────────────────────
    {
      title: "Vue d'ensemble — deux entrées, un index",
      intro: "La recherche PRISM fonctionne sur deux niveaux complémentaires. La **palette de commandes** (Ctrl+K) offre une navigation éclair depuis n'importe quelle vue : tapez quelques lettres, les 10 meilleurs résultats apparaissent immédiatement. La **vue Recherche globale** (#/search) offre un espace dédié avec filtres latéraux pour explorer l'ensemble du portefeuille sans quitter le contexte.",
      points: [
        "**Ctrl+K** (ou Cmd+K sur macOS) ouvre la palette depuis n'importe où dans l'application, y compris en plein milieu d'un canvas Architecture ou d'un rapport.",
        "La palette intègre la recherche dans son champ principal : les résultats couvrent tous les scopes indexés et sont triés par pertinence.",
        "Sélectionner un résultat dans la palette navigue directement vers la vue cible — SIF, composant dans Architecture, template dans la Bibliothèque, note dans Workspace.",
        "La vue **Recherche globale** s'ouvre via la palette (action dédiée) ou directement depuis l'URL `#/search`. Elle persiste la requête et les filtres actifs pendant la session.",
        "Sans requête active, la vue affiche un **aperçu** des objets principaux par catégorie (6 maximum par scope), utile pour naviguer à la souris sans taper.",
      ],
      visual: {
        src: searchOverviewImage,
        alt: "Vue Recherche globale : barre de recherche en haut, sidebar de filtres à gauche, résultats groupés par scope au centre.",
        caption: "La vue Recherche globale organise les résultats en groupes colorés par scope. La sidebar permet de restreindre instantanément la portée ou le projet.",
        layout: 'stacked',
        fit: 'contain',
        objectPosition: 'center top',
        maxHeight: 660,
      },
    },

    // ── 2. Palette de commandes ────────────────────────────────────────────────
    {
      title: "Palette de commandes — navigation au clavier",
      intro: "La palette de commandes est le point d'entrée universel de PRISM. Elle remplace le fil d'Ariane dans l'en-tête dès que vous commencez à taper, et restitue les résultats de recherche en temps réel sans quitter votre contexte de travail.",
      points: [
        "**Ctrl+K / Cmd+K** ouvre la palette depuis n'importe quelle vue. La même combinaison la referme.",
        "Le champ de saisie est focalisé automatiquement. La recherche démarre dès le premier caractère.",
        "Les résultats affichent jusqu'à **10 entrées** — titre, badge de scope (SIF, Composant, Révision…), emplacement dans l'application (tab de destination) et contexte (projet · SIF).",
        "**Flèche haut/bas** pour naviguer dans la liste, **Entrée** pour sélectionner, **Échap** pour fermer.",
        "L'action *Recherche globale* en bas de liste ouvre la vue dédiée avec la requête courante déjà pré-remplie.",
      ],
      visual: {
        src: searchPaletteImage,
        alt: "Palette de commandes ouverte avec une requête active et 10 résultats listés, chacun avec icône scope, titre et contexte projet.",
        caption: "La palette de commandes (Ctrl+K) superpose les résultats au-dessus du contenu actif. Aucun rechargement, navigation directe au clavier.",
        layout: 'stacked',
        fit: 'contain',
        objectPosition: 'center top',
        maxHeight: 520,
      },
    },

    // ── 3. Les 10 scopes indexés ───────────────────────────────────────────────
    {
      title: "Ce que PRISM indexe — les 10 scopes",
      intro: "L'index couvre l'intégralité du portefeuille chargé en mémoire. Chaque scope correspond à un type d'objet distinct et possède sa propre couleur d'accent dans les résultats.",
      points: [
        "**Projets** — Référence, client, site, standard IEC applicable, description générale.",
        "**SIFs** — Numéro, tag procédé, événement dangereux, localisation, PID, niveau SIL cible.",
        "**Composants** — Capteurs, logiques, actionneurs et leurs sous-composants : tag instrument, type, fabricant, voies, votes, tags personnalisés.",
        "**Bibliothèque** — Templates natifs PRISM, templates projet et templates personnels : nom, fabricant, type, catégorie, source de données, tags.",
        "**Hypothèses** — Items du registre Contexte et Exploitation : catégorie, statut, texte de justification.",
        "**Actions** — Priorités du Cockpit et points de non-conformité issus des calculs de vérification.",
        "**Preuves** — Procédures de proof test, campagnes planifiées, événements opérationnels.",
        "**Révisions** — Historique publié de chaque SIF avec descriptions de modifications (chargées en arrière-plan).",
        "**Rapports** — Packages générés et PDFs archivés (courants et historiques).",
        "**Workspace** — Notes Markdown (avec aperçu du contenu) et fichiers joints (PDFs, images).",
      ],
      example: {
        title: "Exemple de requête multi-scope",
        summary: "Vous cherchez tout ce qui concerne une vanne XV-101 sur un projet de raffinerie.",
        steps: [
          "Appuyer **Ctrl+K** → taper `XV-101`.",
          "La palette retourne immédiatement : le composant XV-101 dans Architecture (scope Composant), l'hypothèse de bypass mentionnant XV-101 (scope Hypothèses), la procédure de proof test associée (scope Preuves).",
          "Cliquer sur le composant → PRISM ouvre la SIF dans Architecture et sélectionne automatiquement le composant dans le canvas.",
          "Revenir → ouvrir la vue Recherche globale → filtrer par scope **Preuves** pour voir toutes les procédures liées.",
        ],
        result: "En moins de 10 secondes, vous avez traversé trois scopes différents sans mémoriser aucun chemin de navigation.",
      },
    },

    // ── 4. Filtres et sidebar ──────────────────────────────────────────────────
    {
      title: "Filtres — scope et projet",
      intro: "La sidebar de la vue Recherche globale expose deux dimensions de filtrage cumulatives : la portée (type d'objet) et le projet. Combinés, ils permettent de réduire un index de plusieurs milliers d'entrées à exactement ce que vous cherchez.",
      points: [
        "**Filtre scope** : `Tout` (par défaut) + les 10 scopes individuels. Chaque ligne affiche le nombre de résultats correspondant à la requête courante.",
        "**Filtre projet** : `Tous les projets` + liste des projets triée par nombre de résultats décroissant. Permet d'isoler un projet sans quitter la vue.",
        "Les deux filtres sont **cumulatifs** : scope `Composants` + projet `Raffinerie Nord` = uniquement les composants de ce projet.",
        "Le bouton **Reset** (en bas de sidebar) efface tous les filtres actifs en une seule action — il n'apparaît que si un filtre est actif.",
        "Le compteur dans l'en-tête de la vue indique dynamiquement le nombre d'objets filtrés ou le total indexé selon l'état de la recherche.",
      ],
      visual: {
        src: searchFiltersImage,
        alt: "Sidebar de la recherche avec le scope 'Composants' sélectionné et un projet filtré, affichant le compte de résultats par ligne.",
        caption: "Les filtres scope et projet sont cumulatifs et mis à jour en temps réel. Le reset en un clic évite de tout décocher manuellement.",
        layout: 'split',
        fit: 'contain',
        objectPosition: 'left top',
        maxHeight: 560,
      },
    },

    // ── 5. Pertinence et normalisation ─────────────────────────────────────────
    {
      title: "Algorithme de pertinence — comment les résultats sont classés",
      intro: "PRISM utilise un moteur de scoring interne pour classer les résultats par pertinence décroissante. Chaque résultat reçoit un score basé sur l'emplacement de la correspondance dans la fiche (titre, sous-titre, contexte, mots-clés), avec des bonifications pour les correspondances en début de titre.",
      points: [
        "**Correspondance exacte du titre** : score maximum (+320 pts). Ex : chercher `SIF-204` fait remonter la SIF exacte en premier.",
        "**Titre commence par la requête** (+220 pts), **titre contient la requête** (+140 pts) — les correspondances de titre dominent toujours.",
        "**Sous-titre** (+72 pts), **contexte** (+44 pts), **mots-clés** (+26 pts) — utiles pour les champs fabricant, type, rationale d'hypothèse.",
        "**Multi-tokens** : une requête `safety plc siemens` est découpée en trois tokens — tous doivent être présents dans l'entrée. Cela affine sans exiger un ordre exact.",
        "**Normalisation des accents** : `capteur`, `Capteur` et `captéur` sont traités identiquement. Les accents sont supprimés avant comparaison (NFD decomposition).",
        "**Égalité** : en cas de score identique, le tri est scope (ordre fixe) → date de modification décroissante → alphabétique.",
        "Les **révisions** sont chargées de manière asynchrone : un indicateur dans l'en-tête signale combien de SIFs sont encore en cours de chargement de leur historique.",
      ],
    },

    // ── 6. Navigation vers les résultats ──────────────────────────────────────
    {
      title: "Navigation — cliquer un résultat",
      intro: "Chaque résultat est un lien de navigation directe. PRISM sait non seulement où ouvrir l'objet, mais aussi comment le mettre en contexte dans la vue cible.",
      points: [
        "**Projet** → ouvre le dashboard du projet (liste des SIFs).",
        "**SIF** → ouvre la SIF sur l'onglet indiqué (Cockpit, Contexte, Architecture, Vérification, Exploitation ou Rapport).",
        "**Composant** → ouvre la SIF dans Architecture **et sélectionne automatiquement le composant** dans le canvas pour l'afficher dans le panneau droit.",
        "**Template bibliothèque** → ouvre la vue Bibliothèque avec le template visible et sélectionnable.",
        "**Hypothèse / Action / Preuve** → ouvre la SIF sur l'onglet correspondant (Contexte, Cockpit, Exploitation).",
        "**Révision** → ouvre la SIF sur l'onglet Rapport pour consulter le dossier de révision.",
        "**Note Workspace** → ouvre le viewer de fichier sur la note concernée.",
        "Le badge *tab de destination* affiché sur chaque ligne de résultat indique à l'avance où vous allez atterrir.",
      ],
    },
  ],
}
