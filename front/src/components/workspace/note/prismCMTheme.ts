/**
 * prismCMTheme.ts — CodeMirror 6 theme & highlight style for PRISM
 *
 * Fully integrated with the PRISM design token system (dark/light).
 * Use createPrismCMExtensions(isDark) in a Compartment for live theme switching.
 */
import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { dark, light, colors } from '@/styles/tokens'

// ─── Editor base theme ─────────────────────────────────────────────────────

function editorTheme(isDark: boolean) {
  const p   = isDark ? dark  : light
  const teal = colors.teal

  return EditorView.theme(
    {
      '&': {
        height:          '100%',
        backgroundColor: p.page,
        color:           p.text,
      },
      '.cm-content': {
        caretColor:  teal,
        fontFamily:  "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        paddingTop:  '24px',
        paddingBottom: '48px',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: teal,
        borderLeftWidth: '2px',
      },
      '.cm-activeLine': {
        backgroundColor: isDark
          ? 'rgba(0,155,164,0.055)'
          : 'rgba(0,155,164,0.04)',
      },
      '.cm-gutters': {
        backgroundColor: p.panel,
        borderRight:     `1px solid ${p.border}`,
        color:           p.textDim,
        minWidth:        '44px',
      },
      '.cm-gutter': { paddingRight: '8px' },
      '.cm-lineNumbers .cm-gutterElement': { color: p.textDim },
      '.cm-activeLineGutter': {
        backgroundColor: isDark
          ? 'rgba(0,155,164,0.08)'
          : 'rgba(0,155,164,0.06)',
        color: teal,
      },
      '.cm-selectionBackground': {
        backgroundColor: isDark
          ? 'rgba(0,155,164,0.22)'
          : 'rgba(0,155,164,0.16)',
      },
      '&.cm-focused .cm-selectionBackground': {
        backgroundColor: isDark
          ? 'rgba(0,155,164,0.28)'
          : 'rgba(0,155,164,0.20)',
      },
      '.cm-selectionMatch': {
        backgroundColor: isDark
          ? 'rgba(0,155,164,0.18)'
          : 'rgba(0,155,164,0.12)',
      },
      '.cm-matchingBracket': {
        backgroundColor: isDark
          ? 'rgba(0,155,164,0.25)'
          : 'rgba(0,155,164,0.18)',
        outline: `1px solid ${teal}60`,
        borderRadius: '2px',
      },
      '.cm-searchMatch': {
        backgroundColor: 'rgba(245,158,11,0.3)',
        outline: '1px solid rgba(245,158,11,0.6)',
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: 'rgba(245,158,11,0.5)',
      },
      '.cm-tooltip': {
        backgroundColor: p.card,
        border:          `1px solid ${p.border}`,
        boxShadow:       isDark
          ? '0 8px 24px rgba(0,0,0,0.45)'
          : '0 8px 24px rgba(0,0,0,0.12)',
        borderRadius: '6px',
      },
      '.cm-tooltip .cm-tooltip-arrow:before': {
        borderTopColor: p.border,
      },
      '.cm-tooltip .cm-tooltip-arrow:after': {
        borderTopColor: p.card,
      },
      '.cm-panels': { backgroundColor: p.panel, color: p.text },
      '.cm-panels.cm-panels-top': { borderBottom: `1px solid ${p.border}` },
      '.cm-panels.cm-panels-bottom': { borderTop: `1px solid ${p.border}` },
    },
    { dark: isDark },
  )
}

// ─── Syntax highlight style ────────────────────────────────────────────────

function highlightStyle(isDark: boolean) {
  const p    = isDark ? dark  : light
  const teal = colors.teal

  return HighlightStyle.define([
    // ── Markdown headings ──
    { tag: tags.heading1, fontWeight: '700', fontSize: '1.5em',  color: teal },
    { tag: tags.heading2, fontWeight: '600', fontSize: '1.25em', color: teal, borderBottom: `1px solid ${p.border}`, paddingBottom: '0.1em' },
    { tag: tags.heading3, fontWeight: '600', fontSize: '1.1em',  color: colors.tealDim },
    { tag: tags.heading4, fontWeight: '600',                     color: colors.tealDim },
    { tag: tags.heading5, fontWeight: '600',                     color: p.text },
    { tag: tags.heading6, fontWeight: '600',                     color: p.textDim },

    // ── Emphasis ──
    { tag: tags.emphasis,     fontStyle: 'italic',                        color: p.text },
    { tag: tags.strong,       fontWeight: '700',                          color: p.text },
    { tag: tags.strikethrough, textDecoration: 'line-through',            color: p.textDim },

    // ── Inline code / monospace ──
    { tag: tags.monospace, fontFamily: "'JetBrains Mono', monospace", color: '#F59E0B' },

    // ── String / code content ──
    { tag: tags.string,  color: '#4ADE80' },
    { tag: tags.number,  color: '#F97316' },
    { tag: tags.keyword, color: '#A78BFA', fontWeight: '500' },
    { tag: tags.operator, color: '#60A5FA' },
    { tag: tags.typeName, color: '#34D399' },
    { tag: tags.function(tags.variableName), color: teal },
    { tag: tags.definition(tags.variableName), color: p.text },
    { tag: tags.className,  color: '#F59E0B' },
    { tag: tags.propertyName, color: '#60A5FA' },
    { tag: tags.attributeName, color: '#34D399' },
    { tag: tags.attributeValue, color: '#4ADE80' },
    { tag: tags.bool, color: '#F97316' },

    // ── Links ──
    { tag: tags.url,  color: '#60A5FA', textDecoration: 'underline' },
    { tag: tags.link, color: '#60A5FA' },

    // ── Lists / meta ──
    { tag: tags.list,                 color: teal },
    { tag: tags.meta,                 color: p.textDim },
    { tag: tags.processingInstruction, color: p.textDim },

    // ── Comments / blockquote ──
    { tag: tags.comment,       color: p.textDim, fontStyle: 'italic' },
    { tag: tags.quote,         color: p.textDim, fontStyle: 'italic' },

    // ── HR / separator ──
    { tag: tags.contentSeparator, color: p.border },

    // ── HTML tags (embedded) ──
    { tag: tags.tagName,        color: '#EF4444' },
    { tag: tags.angleBracket,   color: p.textDim },

    // ── Math delimiters ──
    { tag: tags.labelName,      color: '#A78BFA' },

    // ── Invalid ──
    { tag: tags.invalid, color: '#EF4444', textDecoration: 'underline wavy #EF4444' },
  ])
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Returns a list of CodeMirror extensions for the current theme.
 * Wrap in a Compartment to swap theme live when isDark changes.
 *
 * @example
 * const compartment = new Compartment()
 * // initial:
 * extensions: [compartment.of(createPrismCMExtensions(isDark))]
 * // on change:
 * view.dispatch({ effects: compartment.reconfigure(createPrismCMExtensions(isDark)) })
 */
export function createPrismCMExtensions(isDark: boolean) {
  return [
    editorTheme(isDark),
    syntaxHighlighting(highlightStyle(isDark), { fallback: true }),
  ]
}
