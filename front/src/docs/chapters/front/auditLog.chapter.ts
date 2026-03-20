import auditLogImage from '@/docs/assets/front/front-auditlog-main.png'
import auditLogRightPanelImage from '@/docs/assets/front/front-auditlog-rightpnale.png'
import type { DocChapterData } from '@/docs/types'

export const auditLogChapter: DocChapterData = {
  id: 'front-audit-log',
  group: 'front',
  kicker: 'Front A to Z · 10',
  title: 'Lire Audit Log comme un registre d’activité',
  summary:
    "Audit Log sert à relire l'activité documentaire et opérationnelle du dossier: gouvernance, exploitation, alertes et désormais runs Engine. Cette vue n'est pas un simple journal brut: elle aide à retrouver rapidement un événement, le comprendre et rouvrir le bon contexte.",
  icon: 'ClipboardCheck',
  highlights: [
    {
      label: 'Portées',
      value: 'Gouvernance, proof tests, opérations, Engine',
    },
    {
      label: 'Recherche',
      value: 'Filtre rapide dans le journal central',
    },
    {
      label: 'Lecture',
      value: 'Sélection + inspecteur à droite',
    },
    {
      label: 'Usage',
      value: 'Retrouver un fait puis rouvrir le bon écran',
    },
  ],
  blocks: [
    {
      title: 'Comprendre la logique de la vue',
      intro:
        "Audit Log ne remplace pas les vues métier. Il centralise les événements importants pour éviter de reconstituer l'historique à la main entre Cockpit, Exploitation, Révisions et Engine.",
      points: [
        'Le panneau gauche sert de contexte de lecture: portée active, projet filtré et volume du journal visible.',
        "Le panneau central liste les événements dans l'ordre de lecture utile, avec une recherche inline pour réduire rapidement le bruit.",
        "Le panneau droit agit comme un inspecteur: il explicite l'événement sélectionné et propose l'ouverture directe du bon écran.",
      ],
      visual: {
        src: auditLogImage,
        alt: "Vue Audit Log montrant la navigation latérale, le journal central et l'inspecteur d'événement.",
        caption:
          "Audit Log relit l'activité du dossier dans un seul flux: gouvernance, exploitation, alertes et événements Engine.",
        layout: 'stacked',
        fit: 'contain',
        objectPosition: 'center top',
        maxHeight: 660,
      },
    },
    {
      title: 'Filtrer avant de lire',
      intro:
        "La première bonne pratique consiste à réduire le périmètre avant de parcourir des dizaines d'événements. Audit Log a été pensé pour une lecture ciblée, pas pour faire défiler un flux sans fin.",
      points: [
        'Utiliser la portée pour isoler les événements de gouvernance, de proof test, d’exploitation ou de runs Engine.',
        "Appliquer un filtre projet quand plusieurs dossiers coexistent et qu'on ne veut pas mélanger les chronologies.",
        "Saisir quelques mots dans la recherche centrale pour retrouver un nom de SIF, un run, un statut ou un événement terrain.",
      ],
      example: {
        title: 'Exemple concret',
        summary:
          "Vous voulez comprendre pourquoi une revue bloque encore. La bonne approche n'est pas de repartir du Cockpit, mais de filtrer Audit Log sur le projet concerné puis sur la portée gouvernance.",
        steps: [
          'Choisir le projet dans le panneau gauche.',
          'Conserver seulement la portée qui correspond à la question posée.',
          "Utiliser la recherche inline pour retrouver l'événement exact si besoin.",
        ],
        result:
          'Le journal devient une chronologie lisible, au lieu de rester une simple liste globale.',
      },
    },
    {
      title: 'Lire aussi les runs Engine dans le même fil',
      intro:
        "Les runs backend et les compares TS / Python remontent désormais dans Audit Log. Cela permet de relier un événement de calcul à la vie documentaire du dossier, sans ouvrir Engine uniquement pour savoir qu'un calcul a été lancé ou qu'un compare a échoué.",
      points: [
        "Un run Engine apparaît avec son type d'action, son statut et son contexte de SIF.",
        "La sélection d'un run dans Audit Log met à disposition un résumé dans l'inspecteur, puis un accès direct vers Engine.",
        "Cette lecture reste synthétique: la vérité détaillée d'exécution reste dans Engine et dans les tables dédiées aux runs.",
      ],
      visual: {
        src: auditLogRightPanelImage,
        alt: "Panneau droit d'Audit Log affichant le détail d'un compare Engine sélectionné.",
        caption:
          "Quand un compare Engine est sélectionné dans Audit Log, l'inspecteur de droite résume l'événement et renvoie vers Engine pour l'analyse détaillée.",
        layout: 'split',
        fit: 'contain',
        objectPosition: 'right top',
        maxHeight: 700,
      },
    },
    {
      title: 'Quand utiliser Audit Log plutôt qu’une vue métier',
      intro:
        "Audit Log est particulièrement utile quand la question de départ est temporelle ou narrative: que s'est-il passé, dans quel ordre, et où faut-il revenir pour relire la situation.",
      points: [
        'Utiliser Audit Log pour retrouver un événement, un changement de statut, une campagne, un run ou une action récente.',
        'Revenir ensuite dans la vue métier concernée pour travailler le fond: Engine, Exploitation, Cockpit ou Rapport.',
        "Ne pas demander au journal de remplacer les vues spécialisées: il est là pour relier les pièces du dossier, pas pour les dupliquer.",
      ],
    },
  ],
}
