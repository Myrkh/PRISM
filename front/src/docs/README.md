# Docs Source

Cette documentation alimente la vue `Aide & documentation` de PRISM.

Structure :
- `types.ts` : types partagés des chapitres
- `index.ts` : agrégation, groupes et mapping des icônes
- `chapters/front/` : documentation utilisateur de l'application front
- `chapters/engine/` : documentation du moteur et de son contrat
- `assets/` : captures et visuels source de la documentation

Règle de maintenance :
- un chapitre = un fichier
- enrichir le contenu dans le chapitre concerné, pas dans `DocsWorkspace`
- garder `DocsWorkspace` générique pour le rendu

Conventions de contenu :
- privilégier une écriture orientée aide utilisateur, pas commentaire de code
- ajouter captures et exemples concrets dans le chapitre concerné quand des assets existent dans `front/src/docs/assets/`
- utiliser les accents graves dans le texte pour faire ressortir commandes, endpoints et noms techniques
