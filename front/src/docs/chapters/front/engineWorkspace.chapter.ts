import compareMainImage from '@/docs/assets/front/front-compare-main.png'
import historyMainImage from '@/docs/assets/front/front-historiquebackend-main.png'
import historyRightPanelImage from '@/docs/assets/front/front-historiquebackend-rightpnale.png'
import runsMainImage from '@/docs/assets/front/front-runs-backend-main.png'
import runsRightPanelImage from '@/docs/assets/front/front-runs-backend-rightpanel.png'
import runsPayloadImage from '@/docs/assets/front/front-runs-backend-rightpnale-payload.png'
import type { DocChapterData } from '@/docs/types'

export const engineWorkspaceChapter: DocChapterData = {
  id: 'front-engine',
  group: 'front',
  kicker: 'Front A to Z · 11',
  title: 'Utiliser Engine pour exécuter, comparer et tracer les calculs',
  summary:
    "Engine est la vue technique pilotée de PRISM. Elle sert à exécuter le backend Python, comparer les résultats front et backend, relire l'historique des runs persistés et inspecter le payload réellement envoyé au calcul.",
  icon: 'Cpu',
  highlights: [
    {
      label: 'Actions',
      value: 'Run backend, compare, historique',
    },
    {
      label: 'Traçabilité',
      value: 'Payload, réponse, statut, runtime',
    },
    {
      label: 'Repère',
      value: 'Health backend visible en permanence',
    },
    {
      label: 'But',
      value: 'Comprendre le calcul, pas seulement le lancer',
    },
  ],
  blocks: [
    {
      title: 'Commencer par Runs backend',
      intro:
        "La vue Runs backend sert à sélectionner une SIF et à exécuter le calcul Python sur le même modèle métier que celui construit dans l'application. La recherche au-dessus du tableau aide à retrouver rapidement une SIF par numéro, titre ou projet.",
      points: [
        "Le tableau central liste les SIF candidates avec leur contexte de projet, pour éviter de lancer un run sans savoir ce qui est réellement sélectionné.",
        "Le panneau droit est un inspecteur technique: il rappelle le projet, la SIF, le mode demandé et le contexte général du calcul.",
        "Cette vue sert à déclencher un calcul réel, pas à lire un historique: l'état courant de la sélection est donc plus important que l'accumulation des anciens runs.",
      ],
      visual: {
        src: runsMainImage,
        alt: 'Vue Engine sur Runs backend avec la liste des SIF disponibles au calcul.',
        caption:
          'Runs backend sert à choisir la bonne SIF puis à lancer le calcul Python sans quitter le shell principal de PRISM.',
        layout: 'stacked',
        fit: 'contain',
        objectPosition: 'center top',
        maxHeight: 660,
      },
      example: {
        title: 'Exemple concret',
        summary:
          "Vous voulez valider rapidement qu'une SIF modifiée donne toujours le même ordre de grandeur côté backend. Vous ouvrez Engine, cherchez la SIF, puis lancez un run Python dédié.",
        steps: [
          'Chercher la SIF dans la barre placée au-dessus du tableau.',
          'Sélectionner la ligne voulue pour alimenter le panneau droit.',
          'Lancer le run backend puis relire le résultat dans History ou Compare selon le besoin.',
        ],
        result:
          "Le calcul n'est plus un acte opaque: il est situé, sélectionné et relisible.",
      },
    },
    {
      title: 'Relire le contexte envoyé au calcul',
      intro:
        "Quand une SIF est sélectionnée, le panneau droit n'est pas décoratif. Il sert à vérifier immédiatement que le bon contexte est sur le point d'être envoyé au backend.",
      points: [
        'La vue de contexte synthétique permet de confirmer le projet, la SIF et la portée du run avant exécution.',
        "L'inspecteur évite de confondre deux SIF proches en nom ou en titre quand plusieurs dossiers sont ouverts.",
        'Cette lecture réduit fortement les erreurs de lancement liées à une mauvaise sélection.',
      ],
      visual: {
        src: runsRightPanelImage,
        alt: "Panneau droit de Runs backend montrant l'inspecteur de la SIF sélectionnée.",
        caption:
          "Avant d'exécuter, le right panel confirme le contexte réellement sélectionné: projet, SIF et mode de calcul.",
        layout: 'split',
        fit: 'contain',
        objectPosition: 'right top',
        maxHeight: 700,
      },
    },
    {
      title: 'Inspecter le payload réellement transmis',
      intro:
        "Le second niveau utile du panneau droit est le payload. Il montre la structure réellement envoyée au backend et permet de vérifier que le contrat de calcul correspond bien à l'intention de modélisation.",
      points: [
        "La vue payload aide à comprendre ce que voit le backend, indépendamment de l'affichage plus éditorial des autres tabs.",
        'Elle est précieuse pour relire la structure des sous-systèmes, channels, composants et sous-composants transmis au calcul.',
        "C'est aussi le bon endroit pour confirmer la présence d'un parentComponentId, d'un mode de calcul, ou de valeurs critiques avant d'investiguer un écart.",
      ],
      visual: {
        src: runsPayloadImage,
        alt: "Panneau droit de Runs backend sur l'onglet payload, montrant le JSON réellement envoyé au backend.",
        caption:
          "L'onglet Payload expose le contrat concret envoyé au backend: utile pour vérifier la modélisation, pas seulement le résultat final.",
        layout: 'split',
        fit: 'contain',
        objectPosition: 'right top',
        maxHeight: 740,
      },
    },
    {
      title: 'Comparer front et backend sans perdre le contexte',
      intro:
        "Compare sert à rapprocher le calcul TypeScript local et le calcul Python backend. L'objectif n'est pas de faire un tableau de score, mais d'identifier un écart, sa gravité et l'endroit où il faut enquêter.",
      points: [
        'Le tableau central permet de lancer ou relire un compare par SIF, avec un cadrage identique à Runs backend.',
        "Le route inspector aide à comprendre quelle route ou quel sous-système porte l'écart principal.",
        "Un compare utile n'est pas juste “match / mismatch”: il doit permettre d'ouvrir une piste d'investigation concrète.",
      ],
      visual: {
        src: compareMainImage,
        alt: 'Vue Engine sur Compare TS / Python avec les lignes de comparaison par SIF.',
        caption:
          'Compare met en regard le front et le backend pour détecter un écart lisible, pas seulement pour afficher deux chiffres côte à côte.',
        layout: 'stacked',
        fit: 'contain',
        objectPosition: 'center top',
        maxHeight: 660,
      },
    },
    {
      title: 'Relire History comme une trace de calcul',
      intro:
        "History lit les runs réellement persistés dans PRISM. Cette vue sert à savoir ce qui a été exécuté, quand, avec quel statut, et à rouvrir les détails techniques sans relancer un calcul.",
      points: [
        "Chaque entrée conserve le type de trigger, l'état du run, la durée, le backend utilisé et le résumé principal.",
        "Cette vue est distincte d'Audit Log: ici, la vérité détaillée d'exécution est centrale.",
        'History devient la base pour un futur batch run et pour toute lecture technique des calculs réellement lancés.',
      ],
      visual: {
        src: historyMainImage,
        alt: 'Vue Engine sur History avec la liste des runs persistés.',
        caption:
          "History expose les runs réellement enregistrés: statut, durée, contexte SIF et trace d'exécution.",
        layout: 'stacked',
        fit: 'contain',
        objectPosition: 'center top',
        maxHeight: 660,
      },
    },
    {
      title: 'Utiliser le panneau droit pour la preuve technique',
      intro:
        "Dans History, le panneau droit sert de point d'inspection technique. Il permet de relire le résumé du run, la réponse backend et le payload sans quitter la vue.",
      points: [
        "L'onglet Backend montre la réponse réellement renvoyée par le service Python et le résumé utile du run.",
        "L'onglet Payload permet de comparer rapidement ce qui a été demandé à ce qui a été obtenu.",
        "Cette logique fait de History une vraie vue de preuve technique, pas seulement une chronologie.",
      ],
      visual: {
        src: historyRightPanelImage,
        alt: "Panneau droit de History montrant le détail d'un run backend.",
        caption:
          "Le right panel History relie la trace d'exécution au contenu technique: résumé, payload et réponse backend.",
        layout: 'split',
        fit: 'contain',
        objectPosition: 'right top',
        maxHeight: 720,
      },
    },
  ],
}
