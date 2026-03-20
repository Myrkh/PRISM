import contextMainImage from '@/docs/assets/front/front-context-main.png.png'
import type { DocChapterData } from '@/docs/types'

export const contextChapter: DocChapterData = {
  id: 'front-context',
  group: 'front',
  kicker: 'Front A to Z · 04',
  title: 'Documenter le contexte de sécurité',
  summary: 'Le tab Contexte sert à fonder le dossier: lien avec le scénario HAZOP / LOPA, cible SIL, hypothèses et éléments qui justifient le besoin de la fonction.',
  icon: 'ClipboardCheck',
  highlights: [
    {
      label: 'Question principale',
      value: 'Pourquoi la SIF existe ?',
    },
    {
      label: 'Entrées',
      value: 'HAZOP / LOPA / SIL / hypothèses',
    },
    {
      label: 'Conséquence',
      value: 'Tout le reste du dossier en dépend',
    },
  ],
  blocks: [
    {
      title: 'Ce qu’il faut renseigner',
      intro: 'Un bon contexte doit permettre à un lecteur externe de comprendre le scénario de danger sans te poser trois questions de base.',
      points: [
        'Identifier le scénario, le nœud HAZOP, l’événement initiateur et la référence LOPA quand ils existent.',
        'Définir la cible SIL et les repères de réduction de risque associés au besoin.',
        'Documenter les hypothèses métier ou techniques qui influenceront la modélisation et le calcul.',
      ],
      visual: {
        src: contextMainImage,
        alt: 'Vue complète de l’onglet Contexte avec panneau central et panneau droit visibles.',
        caption: 'Le tab Contexte sert à poser la base documentaire de la SIF: scénario, cible SIL, hypothèses et niveau de complétude du dossier.',
        layout: 'stacked',
        fit: 'contain',
        objectPosition: 'center top',
        maxHeight: 520,
      },
    },
    {
      title: 'Comment lire le panneau droit Contexte',
      intro: 'Le panneau droit sert à voir rapidement si le contexte est publiable ou encore fragile.',
      points: [
        'Il signale les champs essentiels manquants au lieu de laisser un faux sentiment de complétude.',
        'Il aide à distinguer les trous documentaires des vrais problèmes de calcul.',
        'Il doit être utilisé comme checklist de solidité du dossier, pas comme simple résumé décoratif.',
      ],
    },
    {
      title: 'Exemple de bon usage',
      intro: 'Supposons une SIF de niveau haut de bac. Avant toute architecture, on veut être capable d’expliquer le scénario et le niveau de risque traité.',
      points: [
        'Décrire le scénario de sur-remplissage et l’événement initiateur pertinent.',
        'Noter la logique de réduction de risque retenue dans la LOPA ou l’équivalent disponible.',
        'Écrire clairement les hypothèses qui justifient la stratégie de capteurs, de logique et d’éléments finaux.',
      ],
    },
  ],
}
