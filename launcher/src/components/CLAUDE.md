# src/components/ — Vues et composants UI

## Carte des vues principales

| Composant | Vue | Contenu clé |
|-----------|-----|-------------|
| `LauncherShell.tsx` | Shell | Layout principal : TitleBar + Sidebar + vue active |
| `AuthScreen.tsx` | Auth | Login / signup avant accès launcher |
| `SetupScreen.tsx` | Setup | Wizard 1ère installation (crée le compte admin) |
| `HomeView.tsx` | Accueil | Grille projets récents + bouton "Lancer PRISM" |
| `UpdatesView.tsx` | Mises à jour | Cards PRISM Desktop + Launcher, changelogs par onglet |
| `SettingsView.tsx` | Paramètres | Fenêtre PRISM / Session / Backend / Documentation |
| `AdminView.tsx` | Admin | Gestion utilisateurs, audit log, licence |
| `LibraryView.tsx` | Bibliothèque | Gestion composants (futur) |
| `AccountModal.tsx` | Modal | Profil utilisateur, changement mot de passe |
| `UserProfileCard.tsx` | Widget | Avatar + nom dans la sidebar |

## Composants de chrome fenêtre

| Composant | Rôle |
|-----------|------|
| `TitleBar.tsx` | Barre frameless : draggable + min/max/close |
| `TopBar.tsx` | En-tête avec menu utilisateur |
| `TopNav.tsx` | Breadcrumb / navigation par onglets |
| `Sidebar.tsx` | Menu latéral principal (nav entre vues) |
| `LeftPanel.tsx` | Panneau latéral secondaire |
| `FooterBar.tsx` | Barre de statut bas de fenêtre |

## Fenêtre Documentation
```
docs/
└── DocsWindow.tsx    # App complète pour la fenêtre docs séparée
                      # Contient : ThemeCtx, NavCtx, DocsToc, DocsContent,
                      #            ChapterArticle, ChapterBlock, TitleBar
                      # Source données : @/docs/* → front/src/docs/
```

## Patterns dans les composants

### Récupérer les settings
```tsx
const [settings, setSettingsState] = useState<LauncherSettings>(DEFAULT_SETTINGS)
useEffect(() => { window.electron.getSettings().then(s => setSettingsState({ ...DEFAULT_SETTINGS, ...s })) }, [])

const patch = (partial: DeepPartial<LauncherSettings>) => {
  setSettingsState(prev => deepMerge(prev, partial))
  window.electron.setSettings(partial)
}
```

### PillGroup (composant réutilisable dans SettingsView)
```tsx
<PillGroup<'1280x800' | '1440x900' | 'maximized'>
  value={settings.prismWindow.defaultSize}
  options={SIZE_OPTIONS}
  onChange={v => patch({ prismWindow: { defaultSize: v } })}
/>
```

### Tokens de couleur
```ts
import { colors, alpha } from '@/tokens'
// ✅ colors.teal[400], alpha(colors.white, 0.1)
// ❌ '#14b8a6' hardcodé
```
