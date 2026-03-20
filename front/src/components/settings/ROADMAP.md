# Settings Roadmap

Ce document sépare les réglages déjà branchés dans PRISM des réglages pertinents mais à traiter plus tard. L'objectif est d'éviter les faux settings et de ne mettre dans l'application que des options reliées à un comportement réel.

## Déjà actifs

### Préférences utilisateur
- Thème clair / sombre
- Tolérance de comparaison TypeScript / Python dans Engine
- Largeur du panneau gauche du shell
- Largeur du panneau droit du shell

## À faire ensuite

### Préférences utilisateur
Ces options relèvent bien d'un réglage personnel, local ou synchronisable plus tard par compte.

- Langue de l'interface FR / EN
- Précision numérique par défaut pour l'affichage des KPI
- Format d'affichage des nombres et des dates dans l'UI
- Densité visuelle confortable / compacte
- Restaurer automatiquement le dernier contexte ouvert au lancement
- Conserver l'état ouvert / fermé des panneaux gauche et droit
- Mode de comparaison front / backend enrichi
  - tolérance relative
  - éventuellement seuil absolu minimum
- Persister ou non les détails de comparaison dans les journaux techniques

### Réglages projet / workflow
Ces options ne doivent pas être de simples préférences utilisateur. Elles appartiennent au projet, à la gouvernance ou au workflow de validation.

- Bloquer l'export si des champs obligatoires sont manquants
- Marquer un export non approuvé comme draft
- Exiger une validation avant une transition de statut
- Politique de signature électronique pour les approbations
- Template de rapport par défaut pour un projet
- Profil par défaut pour un nouveau projet
- Procédures SIF préremplies pour un nouveau dossier
- Valeurs initiales métier pour de nouveaux composants
  - exemple : beta factor initial
- Stratégie quand des éditions concurrentes sont détectées
- Sauvegarde continue des modifications utilisateur

### Réglages système / desktop / admin
Ces options deviennent pertinentes surtout avec une version desktop ou on-prem.

- Conserver un cache local pour usage desktop / on-prem
- Taille cible du cache local
- Rétention cible des logs d'audit
- Dossier d'export par défaut
- Dossier de sauvegarde / backup local
- Démarrage automatique du backend local
- Port ou endpoint backend local en mode avancé
- Canal de mise à jour desktop
- Niveau de logs techniques
- Politique offline / resync

## Ce qui ne doit pas vivre dans Settings utilisateur

Certains besoins sont légitimes, mais relèvent d'autres écrans ou d'autres objets métier.

- Bibliothèques client : doivent vivre dans Library
- Templates de rapport : doivent vivre dans un système de templates
- Paramètres par défaut des composants : doivent vivre dans les templates / la bibliothèque
- Règles d'approbation et de sign-off : doivent vivre dans la gouvernance projet
- Règles d'export et de validation : doivent vivre dans le workflow projet

## Ordre recommandé

1. Langue FR / EN et couche de strings
2. Persistance plus fine du layout et du dernier contexte
3. Réglages projet / workflow réellement branchés
4. Réglages desktop quand le wrapper natif existe
5. Synchronisation compte Supabase pour certaines préférences utilisateur

## Note produit

Tant qu'un réglage ne pilote pas réellement un comportement observable du logiciel, il ne doit pas être exposé dans la modale Settings.
