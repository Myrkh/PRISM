import libraryOverviewImage         from '@/docs/assets/front/front-library-overview.png'
import librarySidebarImage          from '@/docs/assets/front/front-library-sidebar.png'
import libraryCollectionsImage      from '@/docs/assets/front/front-library-collections.png'
import libraryFamiliesImage         from '@/docs/assets/front/front-library-families.png'
import libraryRightPanelImage       from '@/docs/assets/front/front-library-rightpanel.png'
import libraryMenuMoreImage         from '@/docs/assets/front/front-library-menu-more.png'
import architectureLibraryImage     from '@/docs/assets/front/front-architecture-library.png'
import type { DocChapterData } from '@/docs/types'
import { COMPONENT_TEMPLATE_IMPORT_DOC_EXAMPLE } from '@/features/library/templateUtils'

export const libraryChapter: DocChapterData = {
  id: 'front-library',
  group: 'front',
  kicker: 'Front A to Z · 06',
  title: 'Bibliothèque de composants',
  summary: "La bibliothèque PRISM rassemble en un seul endroit les standards IEC natifs du backend, vos templates personnels et ceux de vos projets. Elle permet de créer, organiser en collections colorées, importer et exporter des composants réutilisables — avec le même panneau de configuration que les composants SIF.",
  icon: 'BookOpenText',
  highlights: [
    {
      label: 'Catalogue PRISM',
      value: 'Standards IEC 61511 · lambda_db · lecture seule',
    },
    {
      label: 'Ma bibliothèque',
      value: 'Templates personnels et projets, éditables',
    },
    {
      label: 'Collections',
      value: 'Dossiers colorés, renommables, persistants',
    },
    {
      label: 'Import / Export',
      value: 'JSON natif PRISM via le menu ⋯',
    },
  ],
  blocks: [
    // ── 1. Vue d'ensemble ──────────────────────────────────────────────────────
    {
      title: "Vue d'ensemble — trois espaces, une logique",
      intro: "La vue Bibliothèque s'articule autour de trois panneaux qui travaillent ensemble. Le panneau gauche (catalogue) sert à naviguer et filtrer. Le panneau central affiche les templates organisés par famille. Le panneau droit devient l'inspecteur de création et d'édition dès qu'un template est sélectionné ou créé.",
      points: [
        "Le panneau gauche expose trois sections repliables : **Catalogue PRISM** (standards natifs), **Ma bibliothèque** (vos templates et collections), **Famille** (filtre par type de composant).",
        "Le panneau central liste les templates en trois cartes distinctes — Capteurs, Logique, Actionneurs — chacune avec une bordure supérieure colorée pour identifier la famille d'un coup d'œil.",
        "Le panneau droit reprend exactement le même gabarit de configuration que les composants dans Architecture, ce qui supprime toute courbe d'apprentissage supplémentaire.",
        "Toutes les modifications — création, import, suppression — sont immédiatement reflétées dans le panneau central sans rechargement.",
      ],
      visual: {
        src: libraryOverviewImage,
        alt: "Vue complète de la bibliothèque : sidebar à gauche, liste de templates au centre en trois cartes famille, right panel ouvert à droite.",
        caption: "La bibliothèque s'organise en trois zones : navigation à gauche, liste dense au centre, inspecteur à droite.",
        layout: 'stacked',
        fit: 'contain',
        objectPosition: 'center top',
        maxHeight: 660,
      },
    },

    // ── 2. Catalogue PRISM ─────────────────────────────────────────────────────
    {
      title: 'Catalogue PRISM — les standards IEC',
      intro: "Le Catalogue PRISM regroupe tous les composants standards fournis par le backend PRISM. Ces données proviennent de la base `lambda_db` et sont conformes à l'IEC 61511. Ils sont en lecture seule : vous pouvez les consulter et les cloner, mais pas les modifier directement.",
      points: [
        "Cliquer sur **Catalogue PRISM** dans le panneau gauche filtre instantanément la liste centrale pour n'afficher que les standards.",
        "Un standard peut être cloné depuis le panneau droit : l'enregistrement crée une copie dans **Mes templates** ou dans un projet, que vous pouvez ensuite adapter.",
        "Le badge **PRISM** (bleu-vert) sur chaque ligne identifie les composants d'origine standard ; les badges **perso** et **projet** identifient vos templates.",
        "Le filtre Famille (Capteurs / Logique / Actionneurs) se cumule avec le filtre Catalogue PRISM pour affiner rapidement la recherche.",
      ],
      visual: {
        src: librarySidebarImage,
        alt: "Panneau gauche de la bibliothèque avec les sections Catalogue PRISM, Ma bibliothèque et Famille dépliées.",
        caption: "Le panneau gauche expose trois sections repliables. La section active est mise en évidence par une barre accent colorée.",
        layout: 'split',
        fit: 'contain',
        objectPosition: 'left top',
        maxHeight: 560,
      },
    },

    // ── 3. Ma bibliothèque — créer des templates ───────────────────────────────
    {
      title: "Ma bibliothèque — créer et éditer des templates",
      intro: "Ma bibliothèque regroupe tout ce qui n'est pas un standard PRISM : vos templates personnels (réutilisables sur tous les projets) et les templates liés à un projet spécifique. Trois icônes dans l'en-tête de la section permettent de créer directement un capteur, une logique ou un actionneur.",
      points: [
        "**Activité (capteur)**, **CPU (logique)** et **Éclair (actionneur)** sont les trois boutons de création rapide, visibles à droite du titre Ma bibliothèque quand la section est dépliée.",
        "Cliquer sur l'une de ces icônes ouvre le panneau droit en mode création, pré-rempli avec le type de composant choisi.",
        "Le gabarit du panneau droit est identique à celui des composants SIF : Identification, Paramètres (factorisé ou développé), Test et Avancé. Pas de formulaire simplifié, un vrai objet de calcul.",
        "**Mes templates** (indentation grise) regroupe les templates liés à votre compte, réutilisables dans tous les projets. Les templates liés à un projet apparaissent en dessous avec le nom du projet.",
        "Tout template non-standard peut être édité : cliquer dessus ouvre le panneau droit en mode édition.",
      ],
      visual: {
        src: libraryRightPanelImage,
        alt: "Panneau droit de la bibliothèque en mode création d'un capteur, montrant les sections Identification, Paramètres et Test.",
        caption: "Le panneau droit reprend le même gabarit que les composants SIF. La tuile PFD en haut donne un retour immédiat sur les valeurs saisies.",
        layout: 'split',
        fit: 'contain',
        objectPosition: 'right top',
        maxHeight: 680,
      },
      example: {
        title: 'Exemple concret',
        summary: "Vous constituez une bibliothèque client pour un projet de raffinerie. Vous voulez créer un transmetteur de pression standard maison, une logique Safety PLC et une vanne finale.",
        steps: [
          "Dans la section **Ma bibliothèque**, cliquer sur l'icône **Activité** (capteur) → le panneau droit s'ouvre en mode création.",
          "Renseigner : nom, fabricant, catégorie d'instrument, type, source de données (FMEDA, fabricant…) et les paramètres de fiabilité.",
          "Enregistrer → le template apparaît immédiatement dans la liste centrale sous **Capteurs**.",
          "Répéter pour la logique (icône **CPU**) et l'actionneur (icône **Éclair**).",
          "Depuis le panneau droit, assigner les trois templates à une collection nommée `Bibliothèque client raffinerie` pour les retrouver facilement.",
        ],
        result: "Les trois templates sont disponibles dans la bibliothèque globale et dans le picker d'Architecture de chaque SIF du projet.",
      },
    },

    // ── 4. Collections ─────────────────────────────────────────────────────────
    {
      title: 'Collections — organiser sa bibliothèque',
      intro: "Les collections sont des dossiers nommés et colorés qui vous permettent d'organiser vos templates par thème, projet ou client. Elles sont entièrement libres : nom, couleur et contenu sont à votre main. Elles persistent entre les sessions et seront synchronisées avec Supabase dans une prochaine version.",
      points: [
        "**Créer une collection** : cliquer sur l'icône **Dossier+** dans l'en-tête de Ma bibliothèque → un champ de saisie apparaît inline → taper le nom → Entrée ou OK.",
        "**Changer la couleur** : survoler une collection → cliquer sur l'icône **Palette** → choisir parmi 9 couleurs preset. La couleur se répercute sur la barre accent de sélection dans la sidebar.",
        "**Renommer** : double-cliquer directement sur le nom de la collection → éditer → Entrée pour valider, Échap pour annuler.",
        "**Supprimer** : survoler → icône **Corbeille** rouge. La collection est retirée de la sidebar, les templates qui y étaient rattachés restent mais ne sont plus filtrés par cette collection.",
        "**Filtrer par collection** : cliquer sur une collection → la liste centrale n'affiche que les templates de cette collection. Cliquer à nouveau pour désélectionner.",
        "Pour assigner un template à une collection : ouvrir le template dans le panneau droit → renseigner le champ **Collection** → enregistrer.",
      ],
      visual: {
        src: libraryCollectionsImage,
        alt: "Section Ma bibliothèque dépliée avec plusieurs collections colorées et la palette de couleurs ouverte sur l'une d'elles.",
        caption: "Chaque collection a sa couleur propre. La barre accent gauche reprend cette couleur quand la collection est sélectionnée. Survol → palette + corbeille.",
        layout: 'split',
        fit: 'contain',
        objectPosition: 'left top',
        maxHeight: 520,
      },
    },

    // ── 5. Filtre Famille ──────────────────────────────────────────────────────
    {
      title: 'Filtre Famille — naviguer par type de composant',
      intro: "La section Famille du panneau gauche permet de restreindre la vue aux Capteurs, à la Logique ou aux Actionneurs, indépendamment de la source (PRISM, personnel ou projet). Ce filtre se cumule avec tous les autres.",
      points: [
        "**Toutes** affiche l'ensemble des templates des trois familles.",
        "**Capteurs**, **Logique** et **Actionneurs** filtrent respectivement les transmetteurs/switchs, les PLCs/relais et les vannes/positionneurs/actionneurs finaux.",
        "Le filtre Famille est cumulatif : sélectionner `Ma bibliothèque > Mes templates` + `Famille > Capteurs` affiche uniquement vos capteurs personnels.",
        "Le compteur affiché à droite de chaque ligne de filtre se met à jour en temps réel selon les filtres actifs dans les autres sections.",
        "Le bouton **Reset** en haut du panneau gauche efface tous les filtres actifs en une seule action.",
      ],
    },

    // ── 6. Panel central ───────────────────────────────────────────────────────
    {
      title: 'Panel central — lire et sélectionner',
      intro: "Le panneau central affiche les templates sous forme de liste dense regroupée par famille. Chaque famille est une carte séparée avec une bordure supérieure colorée. Cette organisation permet de scanner rapidement le catalogue sans se perdre dans un seul bloc.",
      points: [
        "Chaque carte famille (Capteurs bleu, Logique violet, Actionneurs orange) est indépendante. Les familles sans template sont masquées automatiquement.",
        "Chaque ligne affiche : icône famille colorée, nom du template, fabricant et type d'instrument, badge d'origine (PRISM / perso / projet).",
        "Survoler une ligne fait apparaître le bouton **Détail** (couches) qui déplie les paramètres de fiabilité directement dans la liste, et la **Corbeille** pour supprimer (templates non-PRISM uniquement).",
        "Cliquer sur une ligne ouvre le panneau droit : mode lecture pour les standards PRISM, mode édition pour vos templates.",
        "**Charger plus** / **Voir moins** permettent de gérer l'affichage des grandes familles sans tout charger d'un coup.",
        "La barre de recherche en haut filtre en temps réel sur le nom, le fabricant, le type d'instrument, la source de données et les tags.",
      ],
      visual: {
        src: libraryFamiliesImage,
        alt: "Panel central de la bibliothèque avec les trois cartes famille : Capteurs (bordure bleue), Logique (violette) et Actionneurs (orange).",
        caption: "Trois cartes distinctes, une par famille. La bordure supérieure colorée identifie la famille instantanément. Les familles vides sont masquées.",
        layout: 'stacked',
        fit: 'contain',
        objectPosition: 'center top',
        maxHeight: 580,
      },
    },

    // ── 7. Import / Export ─────────────────────────────────────────────────────
    {
      title: 'Import, export et modèle JSON',
      intro: "Les fonctions d'import et d'export sont accessibles via le menu ⋯ en haut à droite du panneau central. Le format JSON natif PRISM permet d'échanger des bibliothèques entières entre environnements ou équipes.",
      points: [
        "**Importer** : ouvre un sélecteur de fichier JSON. PRISM analyse chaque entrée et affiche un écran de révision avant d'enregistrer — vous contrôlez ce qui est créé ou mis à jour.",
        "**Modèle JSON** : télécharge un fichier pré-structuré compatible avec l'importeur. C'est le point d'entrée recommandé pour constituer une bibliothèque hors ligne avant import.",
        "**Exporter** : génère un JSON complet à partir de tous les templates visibles dans la vue courante (standards PRISM exclus). Le fichier peut être réimporté dans un autre environnement PRISM.",
        "À l'import, PRISM détecte les doublons (par identifiant ou par identité nom + fabricant + type) et propose de créer, mettre à jour ou ignorer chaque entrée.",
        "Conseil : toujours relire le panneau droit d'un template importé avant de l'utiliser dans une SIF — la réhydratation des paramètres peut nécessiter une vérification des valeurs.",
      ],
      visual: {
        src: libraryMenuMoreImage,
        alt: "Menu ⋯ ouvert en haut à droite du panel central, affichant les options Importer, Modèle JSON et Exporter.",
        caption: "Le menu ⋯ regroupe les actions d'import/export discrètement. La barre principale reste propre pour la recherche.",
        layout: 'split',
        fit: 'contain',
        objectPosition: 'right top',
        maxHeight: 360,
      },
      snippets: [
        {
          title: 'Flux recommandé — constituer une bibliothèque client',
          tone: 'terminal',
          code: [
            '1. Télécharger le modèle JSON (menu ⋯ → Modèle JSON)',
            '2. Compléter hors ligne : noms, fabricants, valeurs de fiabilité, tags',
            '3. Conserver `subsystemType` et `componentSnapshot` cohérents',
            '4. Rouvrir PRISM → menu ⋯ → Importer → choisir le fichier',
            "5. Revoir l'écran de révision : créer / mettre à jour / ignorer",
            '6. Vérifier chaque template dans le panneau droit avant usage',
          ].join('\n'),
          caption: "Ce flux garantit un import contrôlé. Ne pas modifier le champ `id` des templates déjà en base pour éviter les doublons.",
        },
        {
          title: 'Exemple de template JSON complet',
          tone: 'code',
          code: COMPONENT_TEMPLATE_IMPORT_DOC_EXAMPLE,
          caption: "Cet exemple montre un starter capteur complet. Le modèle téléchargé depuis PRISM en contient trois (capteur, logique, actionneur) pour démarrer une bibliothèque complète.",
        },
      ],
      actions: [
        {
          label: 'Télécharger le modèle JSON',
          actionId: 'download-library-json-model',
          hint: "Le fichier correspond au format attendu par l'importeur PRISM. Remplir hors ligne puis réimporter dans Ma bibliothèque ou un projet.",
        },
      ],
    },

    // ── 8. Bibliothèque dans Architecture ──────────────────────────────────────
    {
      title: 'Bibliothèque dans Architecture — le picker contextuel',
      intro: "La même bibliothèque est accessible dans le panneau droit de la vue Architecture, sous l'onglet Bibliothèque. Ce picker contextuel permet d'insérer rapidement un composant dans un channel par glisser-déposer, sans quitter le canvas.",
      points: [
        "Le picker partage exactement la même source de données que la vue globale : tout template créé ou modifié dans la bibliothèque est immédiatement disponible dans Architecture.",
        "La recherche dans le picker fonctionne de la même façon : nom, fabricant, type d'instrument.",
        "Glisser un template depuis le picker vers un channel du canvas instancie le composant avec tous ses paramètres pré-remplis.",
        "Les standards PRISM (lecture seule dans la bibliothèque) peuvent être instanciés dans une SIF sans restriction : c'est l'usage principal du catalogue PRISM.",
        "Si vous modifiez un template dans la bibliothèque globale après l'avoir instancié dans une SIF, le composant SIF n'est pas mis à jour automatiquement — la liaison est rompue à l'instanciation.",
      ],
      visual: {
        src: architectureLibraryImage,
        alt: "Right panel Architecture sur l'onglet Bibliothèque, avec résultats de recherche et un template sélectionnable.",
        caption: "Le picker Architecture consomme la même bibliothèque que la vue globale. Il suffit de glisser un template vers le channel cible dans le canvas.",
        layout: 'split',
        fit: 'contain',
        objectPosition: 'right top',
        maxHeight: 600,
      },
    },
  ],
}
