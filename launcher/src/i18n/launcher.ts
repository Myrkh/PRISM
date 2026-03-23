/**
 * src/i18n/launcher.ts — PRISM Launcher
 * Interface LauncherStrings + getter. Même pattern que PRISM front.
 */

import type { AppLocale } from './types'
import { launcherStringsFr } from './locales/fr/launcher'
import { launcherStringsEn } from './locales/en/launcher'

// ── Interface ─────────────────────────────────────────────────────────────────

export interface LauncherStrings {
  nav: {
    home:     string
    library:  string
    updates:  string
    settings: string
  }

  topBar: {
    launch:     string
    themeLight: string
    themeDark:  string
    minimize:   string
    maximize:   string
    close:      string
  }

  home: {
    recentlyOpened: string
    projects:       string   // "{n} projets" — insert count in component
    newProject:     string
    openInPrism:    string
  }

  updates: {
    stateLabel:     string
    changelogLabel: string
    // Product labels
    prismLabel:     string
    launcherLabel:  string
    // Changelog tabs
    tabPrism:       string
    tabLauncher:    string
    // Sim switcher labels
    simUpToDate:    string
    simAvailable:   string
    simUpdating:    string
    simDone:        string
    // Up-to-date card
    upToDateBadge:  string
    upToDateTitle:  string          // {product} est à jour
    upToDateBody:   string          // {version} placeholder
    checkNow:       string
    checking:       string
    // Checking card
    checkingBadge:  string
    checkingTitle:  string
    checkingBody:   string
    // Downloading / installing
    downloadingBadge:  string
    installingBadge:   string
    inProgressTitle:   string
    // Done card (PRISM — redémarrer PRISM)
    doneBadge:      string
    doneTitle:      string
    doneBody:       string
    restartBtn:     string
    // Ready card (Launcher — quitter + installer)
    readyBadge:     string
    readyTitle:     string
    readyBody:      string
    readyBtn:       string
    // Available card
    availableBadge: string
    availableTitle: string          // {product} {tag} disponible
    currentVersion: string          // {version} placeholder
    updateNowBtn:   string
    scheduleBtn:    string
    // Inline schedule picker
    pickerMonth:    string
    pickerDay:      string
    pickerHour:     string
    scheduleConfirm: string         // {month} {day} {hour} placeholders
    months:         string[]
    // Changelog
    installedBadge:  string
    noReleaseInfo:   string
    // Error
    errorTitle:      string
    // Progress step labels
    stepConnecting:  string
    stepDownloading: string
    stepVerifying:   string
    stepExtracting:  string
    stepFinalizing:  string
  }

  library: {
    included:        string
    modulesCount:    string   // "{n} modules"
    extensions:      string
    roadmap:         string
    badgeNative:     string
    actionIncluded:  string
    actionInstall:   string
    actionSoon:      string
  }

  footer: {
    checking:   string
    engineOk:   string
    engineOff:  string
    copyright:  string
    legal:      string
  }

  settings: {
    title:    string
    subtitle: string
    sections: {
      appearance: string
      window:     string
      backend:    string
      session:    string
      data:       string
      about:      string
      danger:     string
    }
    appearance: {
      theme:     string
      themeHint: string
      dark:      string
      light:     string
    }
    language: {
      label: string
      hint:  string
      fr:    string
      en:    string
    }
    window: {
      defaultSize:          string
      defaultSizeHint:      string
      rememberPosition:     string
      rememberPositionHint: string
      minimizeOnOpen:       string
      minimizeOnOpenHint:   string
      sizes: {
        lastUsed:  string
        s1280:     string
        s1440:     string
        s1920:     string
        maximized: string
      }
    }
    backend: {
      url:                  string
      urlHint:              string
      autoStart:            string
      autoStartHint:        string
      autoUpdate:           string
      autoUpdateHint:       string
      startupTimeout:       string
      startupTimeoutHint:   string
    }
    session: {
      duration:     string
      durationHint: string
      hours1:       string
      hours4:       string
      hours8:       string
      hours24:      string
    }
    data: {
      sqlite:        string
      sqliteHint:    string
      openBtn:       string
      backup:        string
      backupHint:    string
      exportBtn:     string
      telemetry:     string
      telemetryHint: string
    }
    about: {
      desktop:      string
      launcher:     string
      standard:     string
      standardHint: string
      docs:         string
      openBtn:      string
      bug:          string
    }
    danger: {
      reset:     string
      resetHint: string
      resetBtn:  string
    }
  }

  auth: {
    welcome:             string
    createAccount:       string
    loginSubtitle:       string
    signupSubtitle:      string
    namePlaceholder:     string
    emailPlaceholder:    string
    passwordPlaceholder: string
    confirmPlaceholder:  string
    loginBtn:            string
    signupBtn:           string
    noAccount:           string
    hasAccount:          string
    createLink:          string
    loginLink:           string
    localData:           string
    contactAdmin:        string
  }

  setup: {
    configTitle:         string
    adminBadge:          string
    adminBadgeHint:      string
    heading:             string
    subtitle:            string
    namePlaceholder:     string
    emailPlaceholder:    string
    passwordPlaceholder: string
    confirmPlaceholder:  string
    createBtn:           string
    localData:           string
    errMinLength:        string
    errMismatch:         string
  }

  admin: {
    // Sidebar tabs
    tabUsers:         string
    tabLicense:       string
    tabAudit:         string
    // Users
    usersTitle:       string
    usersNew:         string
    colUser:          string
    colRole:          string
    colLastLogin:     string
    youLabel:         string
    roleAdmin:        string
    roleUser:         string
    editTitle:        string
    newTitle:         string
    fieldName:        string
    fieldEmail:       string
    fieldPassword:    string
    fieldPasswordOpt: string
    fieldRole:        string
    cancelBtn:        string
    createBtn:        string
    saveBtn:          string
    errRequired:      string
    errMinLength:     string
    errUpdateFailed:  string
    // License
    noLicense:        string
    noLicenseHint:    string
    contactBtn:       string
    activeBadge:      string
    fieldCompany:     string
    fieldKey:         string
    fieldActivated:   string
    fieldExpiry:      string
    perpetual:        string
    daysLeft:         string   // '{n}j' / '{n} days'
    seatsTitle:       string
    seatsLimit:       string
    renewTitle:       string
    renewContact:     string
    // Audit
    auditTitle:       string
    auditEmpty:       string
    actionLogin:      string
    actionLoginFailed:string
    actionUserCreated:string
    actionUserUpdated:string
    actionLicenseSet: string
  }

  account: {
    title:        string
    tabProfile:   string
    tabSecurity:  string
    avatarColor:  string
    fullName:     string
    email:        string
    emailHint:    string
    plan:         string
    planDetail:   string
    saveBtn:      string
    saved:        string
    currentPwd:   string
    newPwd:       string
    confirmPwd:   string
    changePwdBtn: string
    pwdUpdated:   string
    pwdMismatch:  string
    pwdTooShort:  string
    strength: {
      tooShort:   string
      weak:       string
      medium:     string
      strong:     string
      veryStrong: string
    }
  }

  userCard: {
    myAccount: string
    logout:    string
  }
}

// ── Getter ────────────────────────────────────────────────────────────────────

const STRINGS: Record<AppLocale, LauncherStrings> = {
  fr: launcherStringsFr,
  en: launcherStringsEn,
}

export function getLauncherStrings(locale: AppLocale): LauncherStrings {
  return STRINGS[locale]
}
