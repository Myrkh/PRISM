# PRISM Launcher v1.0.9

## Nouveautés
- Recently Opened affiche désormais les vrais projets ouverts dans PRISM
- Les projets apparaissent avec nom, standard, nombre de SIFs et temps relatif d'accès
- Mise à jour automatique du Launcher (téléchargement NSIS + installation silencieuse `/S`)
- Page Updates restructurée : deux cards côte à côte (PRISM Desktop + Launcher) avec changelogs par onglet
- Settings — section **Fenêtre PRISM** : taille par défaut (5 presets), mémorisation de position, réduction automatique du Launcher à l'ouverture de PRISM
- Settings — section **Session** : durée configurable (1h / 4h / 8h / 24h)
- Settings — **Connexion moteur** : délai de démarrage configurable (champ numérique, 5–300 s)
- **Fenêtre Documentation** : le bouton "Open" dans Config ouvre une fenêtre dédiée avec la documentation complète de PRISM (18 chapitres, 2 groupes, ~100 sections) — table des matières à gauche, contenu à droite

## Améliorations
- Notes de version enrichies avec icônes Lucide par type de changement (Nouveautés, Corrections, Refonte, etc.)
- Temps relatif dynamique sur les projets récents (À l'instant, Il y a 14 min, Hier…)
- Empty state visuel quand aucun projet n'a encore été ouvert
- Rétrocompatibilité avec l'ancien format texte brut pour les release notes
- Toggles Auto-start et Auto-update backend désormais persistés dans `launcher-settings.json`
- Taille et position de la fenêtre PRISM sauvegardées dans `prism-window-bounds.json` (userData)

## Corrections
- Suppression de la propriété `hasAlert` fantôme sur `RecentProject` (erreur TypeScript)
- Import `semantic` inutilisé retiré de `HomeView.tsx`

## Interne
- Bridge IPC Launcher ↔ PRISM pour la synchronisation des projets récents (`prism:recent:record`)
- Persistance locale des projets récents dans `recent-projects.json` (userData)
- Persistance des préférences dans `launcher-settings.json` (userData) — lecture/écriture deep-merge
- `SESSION_TTL` passé en `let` avec `setSessionTTL(hours)` exporté depuis `session.js`
- `openPrismWindow()` utilise désormais les settings (taille, position, minimize on open)
- Fenêtre docs : entrée Vite séparée (`docs.html`), `preload-docs.js` minimal, alias `@/docs` → `front/src/docs/`
- Données docs sourcées directement depuis `front/src/docs/` — aucune copie, images bundlées par Vite
- Stub `src/features/library/templateUtils.ts` pour isolation des dépendances PRISM front
- Vérification cohérence IPC : 29 handlers ↔ 29 bridges preload (aucun orphelin)
