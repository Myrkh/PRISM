import auditLogMainImage      from '@/docs/assets/front/front-auditlog-main.png'
import auditLogRowsImage      from '@/docs/assets/front/front-auditlog-rows.png'
import auditLogLeftPanelImage from '@/docs/assets/front/front-auditlog-leftpanel.png'
import auditLogRightPanelImage from '@/docs/assets/front/front-auditlog-rightpanel.png'
import type { DocChapterData } from '@/docs/types'

export const auditLogChapter: DocChapterData = {
  id: 'front-audit-log',
  group: 'front',
  kicker: 'Front A to Z \u00b7 10',
  title: 'Audit Log \u2014 journal de traçabilité transverse',
  summary:
    "Audit Log regroupe en un seul flux tous les \u00e9v\u00e9nements utiles du workspace : gouvernance des dossiers, proof tests, op\u00e9rations terrain et runs Engine. La vue est con\u00e7ue pour retrouver rapidement un fait, le comprendre et rouvrir le bon \u00e9cran en un clic.",
  icon: 'ClipboardCheck',
  highlights: [
    {
      label: '4 portées',
      value: 'Gouvernance · Proof tests · Op\u00e9rations · Engine',
    },
    {
      label: 'Grille lisible',
      value: 'Dot coloré, badges kind / sous-kind, date, contexte',
    },
    {
      label: 'Navigation directe',
      value: 'Bouton \u2197 par ligne pour ouvrir la vue li\u00e9e',
    },
    {
      label: 'Tri',
      value: 'Plus r\u00e9cent ou plus ancien en premier',
    },
  ],
  blocks: [
    {
      title: 'Vue d\u2019ensemble',
      intro:
        "Le journal est organis\u00e9 en trois zones : le panneau gauche pour cadrer la lecture, le journal central pour parcourir les \u00e9v\u00e9nements, et l\u2019inspecteur droit pour comprendre un \u00e9v\u00e9nement s\u00e9lectionn\u00e9 et revenir \u00e0 la vue m\u00e9tier concern\u00e9e.",
      points: [
        "L\u2019en-t\u00eate affiche le titre de la vue avec le nombre d\u2019\u00e9v\u00e9nements visibles et le nombre de warnings en scope.",
        "Le journal central pr\u00e9sente les \u00e9v\u00e9nements du plus r\u00e9cent au plus ancien par d\u00e9faut, avec recherche et tri int\u00e9gr\u00e9s.",
        "Aucune navigation entre vues n\u2019est n\u00e9cessaire : gouvernance, proof tests, op\u00e9rations et Engine coexistent dans le m\u00eame flux.",
      ],
      visual: {
        src: auditLogMainImage,
        alt: "Vue compl\u00e8te d\u2019Audit Log avec le header, le panneau gauche de portée, le journal central et l\u2019inspecteur droit.",
        caption:
          "Audit Log pr\u00e9sente en un seul \u00e9cran la totalit\u00e9 de l\u2019activit\u00e9 documentaire et technique du workspace.",
        layout: 'stacked',
        fit: 'contain',
        objectPosition: 'center top',
        maxHeight: 660,
      },
    },
    {
      title: 'Lire la grille : dot, badges et tri',
      intro:
        "Chaque ligne du journal suit la m\u00eame structure visuelle pour permettre une lecture rapide sans avoir \u00e0 d\u00e9chiffrer le texte de chaque \u00e9v\u00e9nement.",
      points: [
        "Le dot color\u00e9 \u00e0 gauche indique la cat\u00e9gorie de l\u2019\u00e9v\u00e9nement (bleu = gouvernance, vert = proof test, violet = op\u00e9rations, teal = Engine). Un triangle amber remplace le dot quand l\u2019\u00e9v\u00e9nement est un warning.",
        "Le badge de kind (\u00abGOUVERNANCE\u00bb, \u00abENGINE\u00bb\u2026) et, pour les runs Engine, le badge de sous-kind (\u00abRun\u00bb, \u00abCompare\u00bb, \u00abBatch\u00bb) permettent d\u2019identifier le type sans lire l\u2019action.",
        "Le bouton \u2197 appara\u00eet au survol d\u2019une ligne. Il ouvre directement la vue li\u00e9e sans passer par l\u2019inspecteur.",
        "Le bouton de tri dans la barre de recherche bascule entre \u00ab Plus r\u00e9cent en premier \u00bb et \u00ab Plus ancien en premier \u00bb.",
      ],
      visual: {
        src: auditLogRowsImage,
        alt: "Zoom sur plusieurs lignes du journal montrant dot color\u00e9, badges de kind et de sous-kind, et bouton de navigation au survol.",
        caption:
          "La grille permet de qualifier un \u00e9v\u00e9nement visuellement avant m\u00eame de lire son libell\u00e9.",
        layout: 'stacked',
        fit: 'contain',
        objectPosition: 'center top',
        maxHeight: 480,
      },
    },
    {
      title: 'Affiner avec le panneau gauche',
      intro:
        "Le panneau gauche sert \u00e0 cadrer la lecture avant de parcourir le journal. Il ne filtre pas des colonnes : il d\u00e9finit ce qui est pertinent pour la question pos\u00e9e.",
      points: [
        "La portée restreint le journal \u00e0 une cat\u00e9gorie : tous les \u00e9v\u00e9nements, warnings uniquement, ou l\u2019une des quatre cat\u00e9gories m\u00e9tier.",
        "Le filtre projet restreint la lecture \u00e0 un seul dossier quand plusieurs projets coexistent dans le workspace.",
        "La section \u00ab Lecture rapide \u00bb affiche le nombre de warnings dans le p\u00e9rim\u00e8tre courant pour signaler imm\u00e9diatement si quelque chose demande une attention prioritaire.",
      ],
      visual: {
        src: auditLogLeftPanelImage,
        alt: "Panneau gauche d\u2019Audit Log avec la s\u00e9lection de port\u00e9e, le filtre projet et le r\u00e9sum\u00e9 de lecture rapide.",
        caption:
          "R\u00e9duire la port\u00e9e avant de lire \u00e9vite de parcourir des dizaines d\u2019\u00e9v\u00e9nements sans pertinence.",
        layout: 'split',
        fit: 'contain',
        objectPosition: 'left top',
        maxHeight: 560,
      },
    },
    {
      title: 'Inspecter un \u00e9v\u00e9nement et naviguer vers la vue li\u00e9e',
      intro:
        "S\u00e9lectionner une ligne ouvre l\u2019inspecteur dans le panneau droit. Il pr\u00e9sente le contexte complet de l\u2019\u00e9v\u00e9nement et propose l\u2019ouverture directe de la vue m\u00e9tier concern\u00e9e.",
      points: [
        "La section Contexte affiche la date, le projet, la SIF li\u00e9e et l\u2019acteur de l\u2019\u00e9v\u00e9nement.",
        "La section Action propose un bouton d\u2019ouverture adapt\u00e9 : \u00ab Ouvrir Engine \u00bb pour un run, \u00ab Ouvrir la SIF li\u00e9e \u00bb pour un \u00e9v\u00e9nement documentaire.",
        "Le bouton \u2197 sur la ligne fait la m\u00eame chose en un survol, sans avoir \u00e0 s\u00e9lectionner la ligne ni ouvrir l\u2019inspecteur.",
      ],
      visual: {
        src: auditLogRightPanelImage,
        alt: "Panneau droit d\u2019Audit Log affichant le contexte et l\u2019action d\u2019un run Engine s\u00e9lectionn\u00e9.",
        caption:
          "L\u2019inspecteur permet de comprendre l\u2019\u00e9v\u00e9nement et de rouvrir le bon \u00e9cran sans reconstituer le chemin manuellement.",
        layout: 'split',
        fit: 'contain',
        objectPosition: 'right top',
        maxHeight: 560,
      },
    },
    {
      title: 'Quand utiliser Audit Log',
      intro:
        "Audit Log est utile quand la question est temporelle ou narrative. Pour travailler le fond d\u2019un dossier, il vaut mieux rester dans les vues m\u00e9tier.",
      points: [
        "Reconstituer une chronologie : que s\u2019est-il pass\u00e9 sur ce projet depuis la derni\u00e8re revue ?",
        "V\u00e9rifier si un run Engine ou un compare a \u00e9t\u00e9 lanc\u00e9 et avec quel r\u00e9sultat, sans ouvrir Engine.",
        "Identifier des warnings en attente d\u2019examen avant une s\u00e9ance de validation.",
        "Retrouver rapidement le bon \u00e9cran \u00e0 ouvrir (Cockpit, Exploitation, Engine) depuis un \u00e9v\u00e9nement connu.",
      ],
      example: {
        title: 'Exemple',
        summary:
          "Une revue bloque et vous ne savez plus o\u00f9 regarder en premier.",
        steps: [
          "Ouvrir Audit Log et s\u00e9lectionner le projet concern\u00e9 dans le panneau gauche.",
          "Passer en port\u00e9e \u00ab Gouvernance \u00bb pour voir les changements de statut du dossier.",
          "S\u00e9lectionner le dernier \u00e9v\u00e9nement de statut et cliquer \u00ab Ouvrir la SIF li\u00e9e \u00bb pour reprendre depuis le bon \u00e9cran.",
        ],
        result:
          "En trois \u00e9tapes, vous \u00eates remont\u00e9 \u00e0 la situation exacte sans reconstituer l\u2019historique manuellement.",
      },
    },
  ],
}
