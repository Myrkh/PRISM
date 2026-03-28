import prismAiOverviewImage from '@/docs/assets/front/front-prismia-overview.png'
import prismAiHistoryImage from '@/docs/assets/front/front-prismia-history.png'
import prismAiModelImage from '@/docs/assets/front/front-prismia-model.png'
import prismAiCommandsImage from '@/docs/assets/front/front-prismia-cmd.png'
import prismAiCreateImage from '@/docs/assets/front/front-prismia-cmd-create.png'
import prismAiHelpImage from '@/docs/assets/front/front-prismia-cmd-aide.png'
import prismAiAttachImage from '@/docs/assets/front/front-prismia-cmd-attach.png'
import prismAiMinimapImage from '@/docs/assets/front/front-prismia-minimap.png'
import prismAiCreateNoteImage from '@/docs/assets/front/front-prismia-createnote.png'
import type { DocChapterData, LocalizedDocChapterData } from '@/docs/types'

const prismAiChapterFr: DocChapterData = {
  id: 'front-prism-ai',
  group: 'front',
  kicker: 'Front A to Z · AI',
  title: 'PRISM AI — aide, contexte et commandes gouvernées',
  summary: 'PRISM AI est le poste de travail conversationnel de PRISM. Il permet d’interroger la documentation complète, joindre du contexte utile, préparer des brouillons gouvernés et créer des artefacts de travail sans sortir du dossier.',
  icon: 'Cpu',
  highlights: [
    {
      label: 'Accès',
      value: 'Header · Ctrl+I / Cmd+I',
    },
    {
      label: 'Modes',
      value: '`>` commandes · `#` contexte · `?` documentation',
    },
    {
      label: 'Gouvernance',
      value: 'Preview exacte · JSON · Apply / Discard',
    },
    {
      label: 'Mémoire',
      value: '.prism + pièces jointes + historique serveur',
    },
  ],
  blocks: [
    {
      title: 'Vue d’ensemble — un chat intégré au workflow, pas un gadget isolé',
      intro: 'PRISM AI n’est pas une popup déconnectée du produit. Le panneau s’ouvre au-dessus de l’atelier PRISM, garde le contexte du dossier, et peut créer ou préparer des objets réels du logiciel quand la commande le permet.',
      points: [
        'Le bouton PRISM AI dans le header ouvre le panneau; le raccourci `Ctrl+I` / `Cmd+I` fait le même toggle.',
        'Le panneau garde une logique VS Code-like: header léger, historique, minimap, composeur en bas, badges de mode et actions clavier rapides.',
        'Le chat ne se limite pas à répondre en prose: il peut aussi ouvrir des previews gouvernées, créer une note, rouvrir un brouillon ou pointer vers un objet du dossier.',
        'Le but n’est pas de remplacer l’ingénieur, mais d’accélérer la lecture, la préparation et la traçabilité du travail dans PRISM.',
      ],
      visual: {
        src: prismAiOverviewImage,
        alt: 'Vue complète du panneau PRISM AI avec header, historique, conversation, minimap et composeur en bas.',
        caption: 'PRISM AI s’intègre comme un vrai panneau de travail: historique à gauche, conversation au centre, minimap à droite, composeur gouverné en bas.',
        layout: 'stacked',
        fit: 'contain',
        objectPosition: 'center top',
        maxHeight: 660,
      },
    },
    {
      title: 'Header, historique et modèle — piloter une session proprement',
      intro: 'Le haut du panneau sert à contrôler la session, pas à surcharger la conversation. L’historique permet de reprendre un raisonnement, tandis que le sélecteur de modèle en bas du composeur permet de choisir le moteur réellement utilisé pour la requête suivante.',
      points: [
        'Le header expose les actions de session: nouveau chat, historique, paramètres, maximisation et fermeture.',
        'L’historique sauvegarde désormais les conversations côté base quand l’utilisateur est connecté; il n’est plus limité au simple localStorage.',
        'Le modèle actif se choisit directement dans la barre de composition, au même niveau que l’attachement de contexte.',
        'Le panneau Paramètres du chat reste utile pour le system prompt, mais le choix du modèle est volontairement ramené dans le flux principal de travail.',
      ],
      visual: {
        src: prismAiHistoryImage,
        alt: 'Sidebar historique de PRISM AI avec plusieurs conversations réutilisables.',
        caption: 'L’historique permet de rouvrir un fil existant au lieu de repartir d’un contexte vide.',
        layout: 'split',
        fit: 'contain',
        objectPosition: 'left top',
        maxHeight: 520,
      },
    },
    {
      title: 'Choisir le modèle sans quitter le flux',
      intro: 'Le sélecteur de modèle fait partie du composeur, comme dans un outil orienté clavier. Il est à sa place au moment où l’on prépare la requête, pas caché derrière un panneau secondaire.',
      points: [
        'Le modèle affiché dans le sélecteur du bas est celui réellement envoyé au backend pour la requête suivante.',
        'Changer de modèle n’affecte pas rétroactivement les réponses déjà produites; cela ne concerne que les tours suivants.',
        'Le composeur reste centré sur trois gestes fréquents: choisir un contexte, choisir un modèle, envoyer.',
      ],
      visual: {
        src: prismAiModelImage,
        alt: 'Barre basse de PRISM AI avec trombone, sélecteur de modèle et bouton envoyer sur une seule ligne.',
        caption: 'Le choix du modèle vit dans le composeur, au même endroit que les pièces jointes et l’envoi.',
        layout: 'split',
        fit: 'contain',
        objectPosition: 'right top',
        maxHeight: 260,
      },
    },
    {
      title: 'Le mode `>` — commandes PRISM AI gouvernées',
      intro: 'Le préfixe `>` ne sert pas à “parler autrement” au modèle. Il sert à activer de vraies commandes PRISM AI, reconnues par l’application et transformées en flux gouvernés.',
      points: [
        '`>strict` active un mode de réponse plus sobre et plus prudent, avec hypothèses explicites et refus d’inventer quand la donnée manque.',
        '`>create_project` prépare un brouillon de projet au contrat `.prism` avant application.',
        '`>create_sif` et `>draft_sif` préparent un brouillon de SIF gouverné pour un projet cible explicite.',
        '`>create_library` prépare un template Library gouverné avec preview dans le vrai panneau Library.',
        '`>draft_note` génère une note Markdown utile et la crée proprement dans le workspace.',
      ],
      visual: {
        src: prismAiCommandsImage,
        alt: 'Liste des commandes PRISM AI affichée sous le composeur après saisie du préfixe >.',
        caption: 'Le mode `>` liste les commandes comme une palette structurée: badge, commande et description alignés.',
        layout: 'stacked',
        fit: 'contain',
        objectPosition: 'center top',
        maxHeight: 360,
      },
      snippets: [
        {
          title: 'Exemples de commandes',
          tone: 'terminal',
          code: [
            '>strict',
            '>create_project Projet de revue SIL pour unité de distillation atmosphérique.',
            '>create_sif project:HTI199 Créer une SIF de surpression pour R-201 avec fermeture de XV-201.',
            '>draft_sif project:"HTI199 - OSBL EPAca Galaxie" Préparer un brouillon niveau haut.',
            '>create_library project:HTI199 Créer un starter capteur pression SIL 2 pour surpression R-201.',
            '>draft_note Résume les hypothèses encore ouvertes sur la SIF-103.',
          ].join('\n'),
          caption: 'Les commandes gouvernées déclenchent une logique PRISM réelle: preview, JSON, validation et application explicite.',
        },
      ],
    },
    {
      title: 'Créer un brouillon gouverné — project, SIF, Library',
      intro: 'Les commandes de création ne poussent pas directement des écritures définitives. Elles produisent d’abord un brouillon gouverné, avec preview exacte du rendu métier attendu.',
      points: [
        'Pour une SIF, la preview ouvre le vrai workflow SIF en lecture contrôlée, avec bannière `Apply / Discard / JSON`.',
        'Pour un projet, la preview ouvre un aperçu du contrat `.prism` avant création effective.',
        'Pour Library, la preview réutilise le vrai panneau de configuration, avec indicateurs inline et possibilité d’éditer le contrat JSON si besoin.',
        'Le bouton `JSON` donne accès au contrat temporaire du brouillon; sa sauvegarde resynchronise immédiatement la preview.',
      ],
      visual: {
        src: prismAiCreateImage,
        alt: 'Exemples de commandes de création PRISM AI et preview gouvernée associée.',
        caption: 'Les commandes structurées ne créent pas à l’aveugle: elles passent toujours par un brouillon et une preview relisible.',
        layout: 'stacked',
        fit: 'contain',
        objectPosition: 'center top',
        maxHeight: 420,
      },
      example: {
        title: 'Exemple de flux gouverné',
        summary: 'Vous préparez une SIF à partir du contexte `.prism` et d’un projet cible.',
        steps: [
          'Taper `>draft_sif project:REF ...` dans le chat.',
          'Lire la carte de proposition et ouvrir la preview exacte du workflow.',
          'Corriger si besoin le JSON temporaire, puis appliquer ou rejeter le brouillon.',
        ],
        result: 'Le logiciel garde la main sur l’application finale; l’IA ne force pas une écriture silencieuse.',
      },
    },
    {
      title: 'Le mode `?` — aide commande et documentation PRISM complète',
      intro: 'Le préfixe `?` ne sert pas à faire une recherche internet. Il sert à interroger l’aide commande et la documentation locale PRISM, c’est-à-dire la même base documentaire que celle visible dans le Launcher.',
      points: [
        '`?create_sif` ou `?draft_sif` servent à obtenir la bonne syntaxe d’une commande et le contexte qu’elle consomme.',
        '`?library`, `?proof test`, `?architecture` ou `?moteur` servent à retrouver les chapitres documentaires pertinents.',
        'PRISM AI ne joint pas “toute la doc brute” au modèle; il cherche d’abord dans l’index documentaire puis joint les entrées les plus pertinentes.',
        'Le but du mode `?` est de garder des réponses appuyées sur la doc PRISM, pas sur la mémoire approximative du modèle.',
      ],
      visual: {
        src: prismAiHelpImage,
        alt: 'Mode aide de PRISM AI affichant une liste de sujets documentaires et de commandes.',
        caption: 'Le mode `?` sert à chercher dans l’aide des commandes et dans la documentation PRISM complète.',
        layout: 'split',
        fit: 'contain',
        objectPosition: 'right top',
        maxHeight: 420,
      },
      snippets: [
        {
          title: 'Exemples de requêtes documentation',
          tone: 'terminal',
          code: [
            '?create_sif',
            '?draft_sif',
            '?library',
            '?proof test',
            '?comment le moteur interprète l’architecture',
          ].join('\n'),
          caption: 'Le mode `?` cherche d’abord la meilleure documentation locale PRISM avant de construire la réponse du chat.',
        },
      ],
    },
    {
      title: 'Le mode `#` — joindre le bon contexte au bon moment',
      intro: 'Le préfixe `#` remplace le trombone en version clavier. Il sert à joindre rapidement une SIF ou un fichier workspace à la conversation courante.',
      points: [
        'Le menu `#` permet de choisir une SIF, une note Markdown, un PDF, une image ou un JSON du workspace.',
        'Les fichiers `.prism` ne figurent pas dans cette liste, car ils sont déjà injectés automatiquement à chaque requête.',
        'Joindre le bon contexte réduit l’ambiguïté et permet au modèle de s’appuyer sur des pièces de travail explicites.',
        'Le badge de pièce jointe reste visible au-dessus du composeur tant que l’élément est attaché à la conversation.',
      ],
      visual: {
        src: prismAiAttachImage,
        alt: 'Mode # de PRISM AI listant les SIF et fichiers workspace joignables à la conversation.',
        caption: 'Le mode `#` sert à joindre explicitement une SIF ou un fichier workspace sans quitter le clavier.',
        layout: 'split',
        fit: 'contain',
        objectPosition: 'left top',
        maxHeight: 420,
      },
    },
    {
      title: 'Créer une note depuis une réponse IA',
      intro: 'Une réponse utile du chat n’a pas vocation à rester prisonnière de la conversation. PRISM AI peut transformer une réponse assistant en note workspace propre, sans conserver l’introduction ou l’outro conversationnelles.',
      points: [
        'Le bouton `Créer une note` apparaît sous une réponse assistant finalisée quand le contenu peut être converti en note utile.',
        'PRISM extrait uniquement le corps utile de la note au lieu de recopier les phrases de conversation autour.',
        'Une fois la note créée, le bouton devient `Ouvrir la note` pour éviter les doublons immédiats.',
        'Le lien entre réponse assistant et note créée est conservé pour retrouver la bonne note à la réouverture du chat.',
      ],
      visual: {
        src: prismAiCreateNoteImage,
        alt: 'Réponse PRISM AI avec bouton de création de note dans le workspace.',
        caption: 'Une réponse utile peut devenir une vraie note workspace, sans copier le bruit conversationnel autour.',
        layout: 'stacked',
        fit: 'contain',
        objectPosition: 'center top',
        maxHeight: 420,
      },
    },
    {
      title: 'Lire les longues conversations — minimap et navigation rapide',
      intro: 'Quand une conversation devient longue, PRISM AI ne se contente pas d’une simple scrollbar. Le panneau fournit une vue compacte de navigation pour garder la main sur le fil de discussion.',
      points: [
        'La minimap à droite donne une vue d’ensemble de la conversation et de la zone actuellement visible.',
        'Cliquer sur la minimap permet de sauter rapidement vers une zone précise du fil.',
        'Le bouton flottant `aller en bas` apparaît quand vous vous éloignez du dernier message.',
        'L’objectif est de garder une conversation longue lisible sans vous battre avec la scrollbar native.',
      ],
      visual: {
        src: prismAiMinimapImage,
        alt: 'Conversation PRISM AI avec overview rail et navigation rapide sur le côté droit.',
        caption: 'La minimap sert de rail de navigation: elle permet de sauter rapidement dans un fil long.',
        layout: 'split',
        fit: 'contain',
        objectPosition: 'right top',
        maxHeight: 420,
      },
    },
    {
      title: 'Bonne pratique — utiliser PRISM AI comme couche de travail gouvernée',
      intro: 'PRISM AI est le plus utile quand il est nourri par un contexte propre et relu comme une aide d’ingénierie, pas comme une autorité magique.',
      points: [
        'Des fichiers `.prism` précis et bien structurés améliorent fortement la qualité des brouillons et des réponses contextuelles.',
        'Le mode `?` est le bon réflexe quand vous voulez une réponse strictement ancrée dans la documentation PRISM.',
        'Les previews gouvernées existent pour être relues: elles ne dispensent pas d’une lecture experte de l’architecture, des hypothèses et des paramètres.',
        'Si une information manque ou reste incertaine, la bonne pratique consiste à l’exprimer comme telle plutôt qu’à remplir le vide artificiellement.',
      ],
    },
  ],
}

const prismAiChapterEn: DocChapterData = {
  id: 'front-prism-ai',
  group: 'front',
  kicker: 'Front A to Z · AI',
  title: 'PRISM AI — governed help, context, and commands',
  summary: 'PRISM AI is PRISM’s conversational workstation. It lets you query the full documentation, attach useful context, prepare governed drafts, and create work artifacts without leaving the current dossier.',
  icon: 'Cpu',
  highlights: [
    {
      label: 'Access',
      value: 'Header · Ctrl+I / Cmd+I',
    },
    {
      label: 'Modes',
      value: '`>` commands · `#` context · `?` documentation',
    },
    {
      label: 'Governance',
      value: 'Exact preview · JSON · Apply / Discard',
    },
    {
      label: 'Memory',
      value: '.prism + attachments + server-side history',
    },
  ],
  blocks: [
    {
      title: 'Overview — a workflow-native chat, not an isolated gadget',
      intro: 'PRISM AI is not a detached popup. The panel opens over the PRISM workstation, keeps the dossier context, and can prepare or create real software objects whenever the command allows it.',
      points: [
        'The PRISM AI button in the header opens the panel; the `Ctrl+I` / `Cmd+I` shortcut toggles it as well.',
        'The panel keeps a VS Code-like logic: light header, history, minimap, bottom composer, mode badges, and keyboard-first actions.',
        'The chat is not limited to prose answers: it can open governed previews, create a note, reopen a draft, or point back to a dossier object.',
        'The goal is not to replace the engineer, but to accelerate reading, preparation, and traceability inside PRISM.',
      ],
      visual: {
        src: prismAiOverviewImage,
        alt: 'Full PRISM AI panel with header, history, conversation, minimap, and bottom composer.',
        caption: 'PRISM AI behaves like a real work panel: history on the left, conversation in the middle, minimap on the right, governed composer at the bottom.',
        layout: 'stacked',
        fit: 'contain',
        objectPosition: 'center top',
        maxHeight: 660,
      },
    },
    {
      title: 'Header, history, and model — drive a session cleanly',
      intro: 'The top of the panel is for session control, not for cluttering the conversation. History lets you resume a reasoning thread, while the model selector in the composer chooses the engine actually used for the next request.',
      points: [
        'The header exposes session actions: new chat, history, settings, maximize, and close.',
        'History is now stored in the database when the user is signed in; it is no longer limited to localStorage only.',
        'The active model is chosen directly from the composer, at the same level as context attachments.',
        'Chat settings remain useful for the system prompt, but model choice is intentionally brought back into the main work flow.',
      ],
      visual: {
        src: prismAiHistoryImage,
        alt: 'PRISM AI history sidebar with reusable conversations.',
        caption: 'History lets you reopen an existing thread instead of starting again from an empty context.',
        layout: 'split',
        fit: 'contain',
        objectPosition: 'left top',
        maxHeight: 520,
      },
    },
    {
      title: 'Choose the model without leaving the flow',
      intro: 'The model selector is part of the composer, like in a keyboard-first tool. It belongs to the moment where you prepare the request, not hidden behind a secondary panel.',
      points: [
        'The model shown in the bottom selector is the one actually sent to the backend for the next request.',
        'Changing the model does not affect answers already generated; it only applies to subsequent turns.',
        'The composer stays focused on three common gestures: choose context, choose model, send.',
      ],
      visual: {
        src: prismAiModelImage,
        alt: 'Bottom PRISM AI bar with attach button, model selector, and send button on one line.',
        caption: 'Model choice lives in the composer, in the same place as attachments and sending.',
        layout: 'split',
        fit: 'contain',
        objectPosition: 'right top',
        maxHeight: 260,
      },
    },
    {
      title: 'The `>` mode — governed PRISM AI commands',
      intro: 'The `>` prefix does not mean “talk differently” to the model. It activates real PRISM AI commands, recognized by the application and transformed into governed flows.',
      points: [
        '`>strict` enables a more sober and cautious response mode, with explicit assumptions and refusal to invent when data is missing.',
        '`>create_project` prepares a project draft against the `.prism` contract before application.',
        '`>create_sif` and `>draft_sif` prepare a governed SIF draft for an explicit target project.',
        '`>create_library` prepares a governed Library template with preview in the real Library panel.',
        '`>draft_note` generates a useful Markdown note and creates it cleanly in the workspace.',
      ],
      visual: {
        src: prismAiCommandsImage,
        alt: 'PRISM AI command list shown under the composer after typing the > prefix.',
        caption: 'The `>` mode lists commands like a structured palette: aligned badge, command, and description.',
        layout: 'stacked',
        fit: 'contain',
        objectPosition: 'center top',
        maxHeight: 360,
      },
      snippets: [
        {
          title: 'Command examples',
          tone: 'terminal',
          code: [
            '>strict',
            '>create_project SIL review project for atmospheric distillation unit.',
            '>create_sif project:HTI199 Create an overpressure SIF for R-201 with XV-201 closure.',
            '>draft_sif project:"HTI199 - OSBL EPAca Galaxie" Prepare a high-level draft.',
            '>create_library project:HTI199 Create a SIL 2 pressure transmitter starter for R-201 overpressure.',
            '>draft_note Summarize the remaining assumptions for SIF-103.',
          ].join('\n'),
          caption: 'Governed commands trigger real PRISM logic: preview, JSON, validation, and explicit application.',
        },
      ],
    },
    {
      title: 'Create a governed draft — project, SIF, Library',
      intro: 'Creation commands do not push final writes directly. They first produce a governed draft, with an exact preview of the expected business rendering.',
      points: [
        'For a SIF, the preview opens the real SIF workflow in controlled read mode, with an `Apply / Discard / JSON` banner.',
        'For a project, the preview opens a `.prism` contract preview before effective creation.',
        'For Library, the preview reuses the real configuration panel, with inline indicators and the option to edit the JSON contract if needed.',
        'The `JSON` button exposes the draft’s temporary contract; saving it resynchronizes the preview immediately.',
      ],
      visual: {
        src: prismAiCreateImage,
        alt: 'Examples of PRISM AI creation commands and their governed preview.',
        caption: 'Structured commands do not create blindly: they always go through a readable draft and preview.',
        layout: 'stacked',
        fit: 'contain',
        objectPosition: 'center top',
        maxHeight: 420,
      },
      example: {
        title: 'Example of a governed flow',
        summary: 'You prepare a SIF from the `.prism` context and an explicit target project.',
        steps: [
          'Type `>draft_sif project:REF ...` in the chat.',
          'Read the proposal card and open the exact workflow preview.',
          'If needed, correct the temporary JSON, then apply or discard the draft.',
        ],
        result: 'The software keeps control over the final application; the AI does not force a silent write.',
      },
    },
    {
      title: 'The `?` mode — command help and complete PRISM documentation',
      intro: 'The `?` prefix is not for internet search. It is used to query command help and the local PRISM documentation, which is the same documentation base exposed in the Launcher.',
      points: [
        '`?create_sif` or `?draft_sif` return the proper syntax for a command and the context it consumes.',
        '`?library`, `?proof test`, `?architecture`, or `?engine` return the most relevant documentation chapters.',
        'PRISM AI does not attach the whole documentation as raw text; it first searches the documentation index, then attaches the most relevant entries.',
        'The goal of `?` mode is to keep answers grounded in PRISM documentation, not in the model’s approximate memory.',
      ],
      visual: {
        src: prismAiHelpImage,
        alt: 'PRISM AI help mode showing command and documentation topics.',
        caption: 'The `?` mode is used to search both command help and the complete PRISM documentation.',
        layout: 'split',
        fit: 'contain',
        objectPosition: 'right top',
        maxHeight: 420,
      },
      snippets: [
        {
          title: 'Documentation query examples',
          tone: 'terminal',
          code: [
            '?create_sif',
            '?draft_sif',
            '?library',
            '?proof test',
            '?how the engine interprets architecture',
          ].join('\n'),
          caption: 'The `?` mode first looks for the best local PRISM documentation before the chat builds its answer.',
        },
      ],
    },
    {
      title: 'The `#` mode — attach the right context at the right time',
      intro: 'The `#` prefix is the keyboard version of the paperclip. It lets you quickly attach a SIF or a workspace file to the current conversation.',
      points: [
        'The `#` menu can target a SIF, a Markdown note, a PDF, an image, or a JSON file from the workspace.',
        '`.prism` files are not listed there because they are already injected automatically into every request.',
        'Attaching the right context reduces ambiguity and lets the model rely on explicit working material.',
        'The attachment badge stays visible above the composer as long as the item is attached to the conversation.',
      ],
      visual: {
        src: prismAiAttachImage,
        alt: 'PRISM AI # mode listing SIFs and workspace files attachable to the conversation.',
        caption: 'The `#` mode explicitly attaches a SIF or workspace file without leaving the keyboard.',
        layout: 'split',
        fit: 'contain',
        objectPosition: 'left top',
        maxHeight: 420,
      },
    },
    {
      title: 'Create a note from an AI answer',
      intro: 'A useful chat answer should not remain trapped in the conversation. PRISM AI can turn an assistant answer into a clean workspace note, without keeping the conversational intro or outro.',
      points: [
        'The `Create note` button appears under a finalized assistant answer when the content can be converted into a useful note.',
        'PRISM extracts only the useful body of the note instead of copying the conversational sentences around it.',
        'Once the note is created, the button becomes `Open note` to avoid immediate duplicates.',
        'The link between the assistant answer and the created note is preserved so the right note can be reopened when the chat is reopened.',
      ],
      visual: {
        src: prismAiCreateNoteImage,
        alt: 'PRISM AI answer with note creation button in the workspace.',
        caption: 'A useful answer can become a real workspace note without copying the conversational noise around it.',
        layout: 'stacked',
        fit: 'contain',
        objectPosition: 'center top',
        maxHeight: 420,
      },
    },
    {
      title: 'Read long conversations — minimap and quick navigation',
      intro: 'When a conversation grows long, PRISM AI does not stop at a basic scrollbar. The panel provides a compact navigation overview so you keep control of the discussion thread.',
      points: [
        'The minimap on the right gives an overview of the conversation and the currently visible area.',
        'Clicking the minimap jumps quickly to a specific zone of the thread.',
        'The floating `go to bottom` button appears when you move away from the latest message.',
        'The goal is to keep long conversations readable without fighting the native scrollbar.',
      ],
      visual: {
        src: prismAiMinimapImage,
        alt: 'PRISM AI conversation with overview rail and quick navigation on the right side.',
        caption: 'The minimap acts as a navigation rail: it lets you jump quickly inside a long thread.',
        layout: 'split',
        fit: 'contain',
        objectPosition: 'right top',
        maxHeight: 420,
      },
    },
    {
      title: 'Good practice — use PRISM AI as a governed work layer',
      intro: 'PRISM AI is most useful when it is fed with clean context and reviewed as an engineering aid, not treated like a magical authority.',
      points: [
        'Precise and well-structured `.prism` files strongly improve the quality of drafts and contextual answers.',
        'The `?` mode is the right reflex when you want an answer strictly anchored in PRISM documentation.',
        'Governed previews exist to be reviewed; they do not replace expert reading of architecture, assumptions, and parameters.',
        'If information is missing or still uncertain, the right practice is to state it as such rather than filling the gap artificially.',
      ],
    },
  ],
}

export const prismAiChapter: LocalizedDocChapterData = {
  fr: prismAiChapterFr,
  en: prismAiChapterEn,
}
