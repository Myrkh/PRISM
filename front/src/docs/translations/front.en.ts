import libraryOverviewImage from '@/docs/assets/front/front-library-overview.png'
import librarySidebarImage from '@/docs/assets/front/front-library-sidebar.png'
import libraryCollectionsImage from '@/docs/assets/front/front-library-collections.png'
import libraryFamiliesImage from '@/docs/assets/front/front-library-families.png'
import libraryRightPanelImage from '@/docs/assets/front/front-library-rightpanel.png'
import libraryMenuMoreImage from '@/docs/assets/front/front-library-menu-more.png'
import architectureLibraryImage from '@/docs/assets/front/front-architecture-library.png'
import shellOverviewImage from '@/docs/assets/front/front-shell-overview.png'
import projectTreeActiveSifImage from '@/docs/assets/front/front-projecttree-active-sif.png'
import contextMainImage from '@/docs/assets/front/front-context-main.png.png'
import architectureCanvasImage from '@/docs/assets/front/front-architecture-canvas.png'
import architectureRightPanelConfigImage from '@/docs/assets/front/front-architecture-rightpanel-config.png'
import componentPanelHeaderImage from '@/docs/assets/front/front-component-panel-header.png'
import componentPanelParametersImage from '@/docs/assets/front/front-component-panel-parameters.png'
import subcomponentPanelImage from '@/docs/assets/front/front-subcomponent-panel.png'
import searchOverviewImage from '@/docs/assets/front/front-search-overview.png'
import searchPaletteImage from '@/docs/assets/front/front-search-palette.png'
import searchFiltersImage from '@/docs/assets/front/front-search-filters.png'
import auditLogMainImage from '@/docs/assets/front/front-auditlog-main.png'
import auditLogRowsImage from '@/docs/assets/front/front-auditlog-rows.png'
import auditLogLeftPanelImage from '@/docs/assets/front/front-auditlog-leftpanel.png'
import auditLogRightPanelImage from '@/docs/assets/front/front-auditlog-rightpanel.png'
import compareMainImage from '@/docs/assets/front/front-compare-main.png'
import historyMainImage from '@/docs/assets/front/front-historiquebackend-main.png'
import historyRightPanelImage from '@/docs/assets/front/front-historiquebackend-rightpnale.png'
import runsMainImage from '@/docs/assets/front/front-runs-backend-main.png'
import runsRightPanelImage from '@/docs/assets/front/front-runs-backend-rightpanel.png'
import runsPayloadImage from '@/docs/assets/front/front-runs-backend-rightpnale-payload.png'
import type { DocChapterData } from '@/docs/types'
import { COMPONENT_TEMPLATE_IMPORT_DOC_EXAMPLE } from '@/features/library/templateUtils'

export const frontDocTranslationsEn = {
  "front-start": {
    id: "front-start",
    group: "front",
    kicker: "Front A to Z · 01",
    title: "Getting started with PRISM",
    summary:
      "This chapter explains what a user should understand before opening a first SIF: what PRISM does, what it does not do on its own, and how to approach the workflow without getting lost.",
    icon: "BookOpenText",
    highlights: [
      {
        label: "Starting point",
        value: "Project → SIF → documentation cycle",
      },
      {
        label: "Product promise",
        value: "Calculation + dossier + evidence",
      },
      {
        label: "Expected mindset",
        value: "Use the tool as engineering support",
      },
    ],
    blocks: [
      {
        title: "What PRISM is for",
        intro:
          "PRISM is used to build, read, and publish a coherent SIF dossier. The application brings together safety context, architecture modeling, calculation results, operational evidence, and revision artifacts.",
        points: [
          "The product avoids scattering information across spreadsheets, separate schematics, and isolated reports.",
          "Each SIF becomes a living dossier that can be reviewed, completed, and then published as a frozen revision.",
          "The calculation engine serves the justification; it does not replace expert review.",
        ],
        example: {
          title: "Concrete example",
          summary:
            "You need to justify a high-level function on a tank venting to flare. In PRISM, you create the SIF, document its scenario, model the function, and prepare the report in the same place.",
          steps: [
            "Create or open the project that contains the relevant unit.",
            "Create the SIF with its identifier and an explicit title.",
            "Move through the tabs in logical order: Context, Architecture, Verification, Operations, Report.",
          ],
          result: "At the end, you get a readable dossier, not just a PFDavg value.",
        },
      },
      {
        title: "What PRISM expects from the user",
        intro:
          "The software is useful when the user feeds it with a clean model and explicit assumptions.",
        points: [
          "Before looking for a result, clarify the safety scenario and the target you are trying to reach.",
          "Use the library as an accelerator, not as automatic truth.",
          "Review imported or copied critical parameters before publishing.",
        ],
      },
      {
        title: "Recommended workflow for a first SIF",
        intro:
          "For a first use, the simplest approach is to follow the documentary cycle intended by the application closely.",
        points: [
          "Start with Context to frame why the function exists.",
          "Then move to Architecture to translate the function into calculable subsystems.",
          "Read the result in Verification, complete Operations, then prepare the report package.",
        ],
      },
    ],
  },
  "front-navigation": {
    id: "front-navigation",
    group: "front",
    kicker: "Front A to Z · 02",
    title: "Navigation and interface reading",
    summary:
      "The interface is built like a workbench. This chapter explains what each area is for and when to use it.",
    icon: "LayoutDashboard",
    highlights: [
      {
        label: "Left rail",
        value: "Global application views",
      },
      {
        label: "ProjectTree",
        value: "Project / SIF / step navigation",
      },
      {
        label: "Right panel",
        value: "Contextual inspector",
      },
    ],
    blocks: [
      {
        title: "Understanding the four areas",
        intro:
          "The simplest way to read the interface is to distinguish app navigation, local navigation, the editing area, and the inspector.",
        points: [
          "The left rail gives access to global views such as projects, engine, audit, and documentation.",
          "The ProjectTree is used to choose a project, a SIF, and when needed the active local step.",
          "The center displays the current work view; the right panel shows the related properties or settings.",
        ],
        visual: {
          src: shellOverviewImage,
          alt: "Full PRISM view with header, icon rail, ProjectTree, center panel, and right panel.",
          caption:
            "High-level reading of the PRISM workbench: app navigation on the left, local project navigation, work area in the center, and inspector on the right.",
          layout: "stacked",
          fit: "contain",
          objectPosition: "center top",
          maxHeight: 520,
        },
      },
      {
        title: "When to use the ProjectTree",
        intro:
          "The ProjectTree is the main navigation for an open SIF. When visible, it is more efficient than a repetitive tab bar.",
        points: [
          "Clicking a project opens its structure and immediately shows its SIFs.",
          "Clicking a SIF activates its local reading and displays its internal steps.",
          "When the tree is hidden, the local bar in the center takes over to keep access to the SIF views.",
        ],
        visual: {
          src: projectTreeActiveSifImage,
          alt: "ProjectTree with an open project, active SIF, and expanded local steps.",
          caption:
            "The ProjectTree becomes the local navigation of the active SIF: open project, SIF in edition, and directly accessible steps.",
          layout: "split",
          fit: "contain",
          objectPosition: "left top",
          maxHeight: 520,
        },
        example: {
          title: "Reading example",
          summary:
            "You open a project and then a SIF from the tree. The active SIF shows its editing state and internal steps; you can jump straight into Architecture or Verification without passing through an intermediate view.",
          steps: [
            "Expand the project from the left panel.",
            "Click the desired SIF to activate it.",
            "Choose the desired step from the sub-level that appears under the active SIF.",
          ],
        },
      },
      {
        title: "Role of the right panel",
        intro:
          "The right panel is not a second page. It should be read as an inspector, configurator, or decision panel tied to the current view.",
        points: [
          "In Architecture, it configures subsystems, the library, and components.",
          "In Verification or Operations, it complements the view with useful settings and information without overloading the center.",
          "If the panel does not provide direct help for the current task, it should stay closed or minimal.",
        ],
      },
    ],
  },
  "front-projects": {
    id: "front-projects",
    group: "front",
    kicker: "Front A to Z · 03",
    title: "Projects, SIFs, and work organization",
    summary:
      "This chapter explains how to structure projects, create clean SIFs, and keep a readable working base over time.",
    icon: "FolderPlus",
    highlights: [
      {
        label: "Level 1",
        value: "Industrial project",
      },
      {
        label: "Level 2",
        value: "Documented SIF",
      },
      {
        label: "Good practice",
        value: "Name clearly before calculating",
      },
    ],
    blocks: [
      {
        title: "Create a clean project",
        intro:
          "The project is the business and documentary container. It should stay readable even several months later.",
        points: [
          "Give the project a name that clearly identifies the site, unit, or work scope.",
          "Use reference and client fields when they are genuinely useful for internal dossier operation.",
          "Avoid catch-all projects that mix several scopes with no clear logic.",
        ],
      },
      {
        title: "Create a usable SIF",
        intro:
          "A well-created SIF must be retrievable and reviewable without additional verbal context.",
        points: [
          "Provide a stable SIF identifier and a title that explicitly states the safety function.",
          "Link the SIF to its process tag or reference equipment when that helps future searches.",
          "Do not wait until the end of the dossier to clean the basic metadata.",
        ],
        example: {
          title: "Creation example",
          summary:
            "A good entry looks like SIF-001 · Very high level LSHH001 to flare rather than a vague title such as SIF test.",
          steps: [
            "Create the project for the unit or review campaign.",
            "Create the SIF with a stable number.",
            "Complete the title and markers from the start.",
          ],
        },
      },
      {
        title: "Keep the base readable",
        intro:
          "Document maintenance starts as soon as objects are created. A clean base reduces noise for the rest of the workflow.",
        points: [
          "Archive trials or drafts instead of leaving them mixed with active SIFs.",
          "Avoid cloning without correctly renaming visible identifiers.",
          "Use the tree and future global search to retrieve the right SIF quickly.",
        ],
      },
    ],
  },
  "front-context": {
    id: "front-context",
    group: "front",
    kicker: "Front A to Z · 04",
    title: "Document the safety context",
    summary:
      "The Context tab is used to ground the dossier: link to the HAZOP / LOPA scenario, SIL target, assumptions, and the elements that justify the need for the function.",
    icon: "ClipboardCheck",
    highlights: [
      {
        label: "Main question",
        value: "Why does the SIF exist?",
      },
      {
        label: "Inputs",
        value: "HAZOP / LOPA / SIL / assumptions",
      },
      {
        label: "Consequence",
        value: "Everything else in the dossier depends on it",
      },
    ],
    blocks: [
      {
        title: "What needs to be filled in",
        intro:
          "A good context should allow an external reader to understand the hazard scenario without asking three basic questions.",
        points: [
          "Identify the scenario, HAZOP node, initiating event, and LOPA reference when they exist.",
          "Define the SIL target and the associated risk reduction markers tied to the need.",
          "Document business or technical assumptions that will influence the model and the calculation.",
        ],
        visual: {
          src: contextMainImage,
          alt: "Full view of the Context tab with both the center panel and the right panel visible.",
          caption:
            "The Context tab sets the documentary basis of the SIF: scenario, SIL target, assumptions, and dossier completeness.",
          layout: "stacked",
          fit: "contain",
          objectPosition: "center top",
          maxHeight: 520,
        },
      },
      {
        title: "How to read the Context right panel",
        intro:
          "The right panel is used to quickly see whether the context is publishable or still fragile.",
        points: [
          "It flags missing essential fields instead of giving a false sense of completeness.",
          "It helps distinguish documentary gaps from real calculation problems.",
          "It should be used as a dossier robustness checklist, not as a decorative summary.",
        ],
      },
      {
        title: "Example of good usage",
        intro:
          "Suppose you have a tank high-level SIF. Before any architecture, you want to be able to explain the scenario and the level of risk being addressed.",
        points: [
          "Describe the overfill scenario and the relevant initiating event.",
          "Note the risk reduction logic retained in the LOPA or equivalent available source.",
          "Clearly write the assumptions that justify the sensor, logic, and final element strategy.",
        ],
      },
    ],
  },
  "front-architecture": {
    id: "front-architecture",
    group: "front",
    kicker: "Front A to Z · 05",
    title: "Model the SIF architecture",
    summary:
      "Architecture is the modeling core of the product. It is where subsystems, channels, components, and subcomponents are configured in a way the engine can interpret.",
    icon: "Network",
    highlights: [
      {
        label: "Reading path",
        value: "Subsystem → channel → component",
      },
      {
        label: "Strength",
        value: "Canvas + configuration + library",
      },
      {
        label: "Risk",
        value: "Wrong structure = wrong calculation",
      },
    ],
    blocks: [
      {
        title: "Read the canvas",
        intro:
          "The canvas represents the structure of the safety function, not a full P&ID diagram. It must be read as a calculation and justification model.",
        points: [
          "The three main families are sensors, logic, and actuators.",
          "Each subsystem may contain one or more channels depending on the selected architecture.",
          "The components carried by each channel describe what must work for that channel to fulfill its share of the function.",
        ],
        visual: {
          src: architectureCanvasImage,
          alt: "SIF architecture canvas showing subsystems, channels, components, and subcomponents.",
          caption:
            "The canvas shows the real structure used by the engine: families, channels, parent components, and subcomponents involved in the function.",
          layout: "stacked",
          fit: "contain",
          objectPosition: "center top",
          maxHeight: 560,
        },
      },
      {
        title: "Configure channels and architectures",
        intro:
          "The Architecture right panel is where you define the voting structure and the number of channels for each subsystem.",
        points: [
          "Choose the actual number of channels present and the configured architecture for each family.",
          "Account for common cause only when it is justified and entered correctly.",
          "Use channel configurations to represent a real architecture, not just a graphical convention.",
        ],
        visual: {
          src: architectureRightPanelConfigImage,
          alt: "Architecture right panel focused on channel configuration, votes, and CCF parameters.",
          caption:
            "The Architecture right panel structures channels, votes, and common cause before you enter component details.",
          layout: "split",
          fit: "contain",
          objectPosition: "right top",
          maxHeight: 660,
        },
      },
      {
        title: "Configure a component",
        intro:
          "When a component is selected, its panel should be treated like a technical datasheet that deserves serious review.",
        points: [
          "Fill in identity, category, instrument type, and data source carefully.",
          "Review the PFD tile and the component identity before diving into the detailed settings.",
          "Use the panel header to confirm that you are working on the right object in the right channel.",
        ],
        visual: {
          src: componentPanelHeaderImage,
          alt: "Top of the component panel showing component identity and PFD tile.",
          caption:
            "The top of the component panel is there to identify the object currently being edited before reviewing or changing its parameters.",
          layout: "split",
          fit: "contain",
          objectPosition: "right top",
          maxHeight: 520,
        },
        example: {
          title: "Concrete example",
          summary:
            "You add a valve and attach a solenoid valve to it as a subcomponent. The parent carries the package logic; the subcomponent remains clickable and configurable with its own template.",
          steps: [
            "Create the parent component in the actuator channel.",
            "Add the subcomponent from the configuration panel.",
            "Check that the parent and subcomponent do not count the same vendor data twice.",
          ],
          result:
            "The canvas stays readable and the engine contract keeps the parent-child relationship.",
        },
      },
      {
        title: "Parameters, units, and advanced settings",
        intro:
          "The parameters area is where you review the data that really feeds the calculation: lambdas, diagnostics, test coverage, durations, and units.",
        points: [
          "Enter factorized or developed parameters depending on the available data, but not both inconsistently.",
          "Systematically verify displayed units before validating entered values.",
          "Advanced settings are used to refine a real case, not to fill empty space just to look complete.",
        ],
        visual: {
          src: componentPanelParametersImage,
          alt: "Component panel focused on parameters with fields, units, and detailed settings.",
          caption:
            "Parameters must be read like a modeling sheet: useful data, coherent units, and explicit assumptions.",
          layout: "split",
          fit: "contain",
          objectPosition: "right top",
          maxHeight: 680,
        },
      },
      {
        title: "Subcomponents: keep the hierarchy readable",
        intro:
          "A subcomponent must not be confused with a sibling component in the same channel. It remains attached to its parent while keeping its own configuration.",
        points: [
          "The canvas must make the parent → subcomponent hierarchy obvious at first glance.",
          "The subcomponent uses the same overall configuration template as the parent, with its own parameters.",
          "The engine contract then flattens parent and subcomponents as required elements in series while preserving parent traceability.",
        ],
        visual: {
          src: subcomponentPanelImage,
          alt: "Subcomponent editing panel using the same configuration template as the parent.",
          caption:
            "The subcomponent remains a fully configurable object, but keeps its place as a subset of the parent component.",
          layout: "split",
          fit: "contain",
          objectPosition: "right top",
          maxHeight: 680,
        },
      },
    ],
  },
  "front-library": {
    id: "front-library",
    group: "front",
    kicker: "Front A to Z · 06",
    title: "Component library",
    summary:
      "The PRISM library gathers native backend IEC standards, your personal templates, and your project templates in one place. It lets you create, organize into colored collections, import, and export reusable components — with the same configuration panel as SIF components.",
    icon: "BookOpenText",
    highlights: [
      {
        label: "PRISM catalog",
        value: "IEC 61511 standards · lambda_db · read-only",
      },
      {
        label: "My library",
        value: "Editable personal and project templates",
      },
      {
        label: "Collections",
        value: "Colored, renameable, persistent folders",
      },
      {
        label: "Import / Export",
        value: "Native PRISM JSON via the ⋯ menu",
      },
    ],
    blocks: [
      {
        title: "Overview — three areas, one logic",
        intro:
          "The Library view is organized around three panels working together. The left panel (catalog) is used to navigate and filter. The center panel displays templates organized by family. The right panel becomes the create/edit inspector as soon as a template is selected or created.",
        points: [
          "The left panel exposes three collapsible sections: PRISM Catalog (native standards), My library (your templates and collections), and Family (filter by component type).",
          "The center panel lists templates in three distinct cards — Sensors, Logic, Actuators — each with a colored top border so the family is recognizable at a glance.",
          "The right panel uses exactly the same configuration shell as components in Architecture, which removes any extra learning curve.",
          "All changes — creation, import, deletion — are immediately reflected in the center panel without reload.",
        ],
        visual: {
          src: libraryOverviewImage,
          alt: "Full library view: sidebar on the left, template list in the center as three family cards, open right panel on the right.",
          caption:
            "The library is organized into three zones: navigation on the left, dense list in the center, inspector on the right.",
          layout: "stacked",
          fit: "contain",
          objectPosition: "center top",
          maxHeight: 660,
        },
      },
      {
        title: "PRISM Catalog — IEC standards",
        intro:
          "The PRISM Catalog groups all standard components provided by the PRISM backend. These values come from the lambda_db database and comply with IEC 61511. They are read-only: you can inspect and clone them, but not modify them directly.",
        points: [
          "Clicking PRISM Catalog in the left panel instantly filters the center list to show only standards.",
          "A standard can be cloned from the right panel: saving creates a copy in My templates or in a project, which you can then adapt.",
          "The PRISM badge on each row identifies standard-origin components; personal and project badges identify your templates.",
          "The Family filter (Sensors / Logic / Actuators) combines with the PRISM Catalog filter to refine the search quickly.",
        ],
        visual: {
          src: librarySidebarImage,
          alt: "Left panel of the library with PRISM Catalog, My library, and Family sections expanded.",
          caption:
            "The left panel exposes three collapsible sections. The active section is highlighted by a colored accent bar.",
          layout: "split",
          fit: "contain",
          objectPosition: "left top",
          maxHeight: 560,
        },
      },
      {
        title: "My library — create and edit templates",
        intro:
          "My library contains everything that is not a PRISM standard: your personal templates reusable across all projects and templates tied to a specific project. Three icons in the section header let you create a sensor, logic element, or actuator directly.",
        points: [
          "Activity (sensor), CPU (logic), and Bolt (actuator) are the three quick-create buttons visible on the right side of the My library title when the section is expanded.",
          "Clicking one of these icons opens the right panel in creation mode, prefilled with the selected component type.",
          "The right panel shell is identical to SIF components: Identification, Parameters (factorized or developed), Test, and Advanced. Not a simplified form, but a real calculation object.",
          "My templates groups templates tied to your account and reusable across all projects. Project-linked templates appear below with the project name.",
          "Any non-standard template can be edited: clicking it opens the right panel in edit mode.",
        ],
        visual: {
          src: libraryRightPanelImage,
          alt: "Library right panel in sensor creation mode, showing Identification, Parameters, and Test sections.",
          caption:
            "The right panel uses the same shell as SIF components. The PFD tile at the top gives immediate feedback on entered values.",
          layout: "split",
          fit: "contain",
          objectPosition: "right top",
          maxHeight: 680,
        },
        example: {
          title: "Concrete example",
          summary:
            "You are building a client library for a refinery project. You want to create a house pressure transmitter, a Safety PLC logic template, and a final valve.",
          steps: [
            "In the My library section, click the Activity icon (sensor): the right panel opens in creation mode.",
            "Enter name, manufacturer, instrument category, type, data source (FMEDA, manufacturer, etc.), and reliability parameters.",
            "Save: the template immediately appears in the center list under Sensors.",
            "Repeat for logic (the CPU icon) and actuator (the Bolt icon).",
            "From the right panel, assign the three templates to a collection named Refinery client library so they are easy to find.",
          ],
          result:
            "The three templates become available in the global library and in the Architecture picker of every SIF in the project.",
        },
      },
      {
        title: "Collections — organize your library",
        intro:
          "Collections are named, colored folders that let you organize templates by theme, project, or client. They are fully flexible: name, color, and content are up to you. They persist between sessions and are synchronized with Supabase.",
        points: [
          "Create a collection: click the Folder+ icon in the My library header.",
          "Change color from the collection menu, then pick one of the preset swatches.",
          "Rename from the same menu or directly from the dedicated actions depending on the current layout.",
          "Delete removes the collection from the sidebar, but templates remain available and simply lose that grouping.",
          "Click a collection to filter the center list to that collection only.",
          "To assign a template to a collection, open the template in the right panel, fill the Collection field, and save.",
        ],
        visual: {
          src: libraryCollectionsImage,
          alt: "Expanded My library section with several colored collections and a collection menu opened.",
          caption:
            "Each collection has its own color. The accent bar and active state reuse that color for quick visual identification.",
          layout: "split",
          fit: "contain",
          objectPosition: "left top",
          maxHeight: 520,
        },
      },
      {
        title: "Family filter — navigate by component type",
        intro:
          "The Family section in the left panel lets you restrict the view to Sensors, Logic, or Actuators, independently of the source (PRISM, personal, or project). This filter combines with all others.",
        points: [
          "All displays all templates from the three families.",
          "Sensors, Logic, and Actuators filter transmitters or switches, PLCs or relays, and valves, positioners, or final actuators respectively.",
          "The Family filter is cumulative: selecting My library > My templates + Family > Sensors displays only your personal sensor templates.",
          "The count displayed on the right side of each filter row updates in real time according to other active filters.",
          "The Reset button at the top of the left panel clears all active filters in one action.",
        ],
      },
      {
        title: "Center panel — read and select",
        intro:
          "The center panel displays templates as a dense list grouped by family. Each family is a separate card with a colored top border. This organization helps you scan the catalog quickly without getting lost in a single block.",
        points: [
          "Each family card (blue Sensors, purple Logic, orange Actuators) is independent. Empty families are hidden automatically.",
          "Each row shows the family icon, template name, manufacturer and instrument type, and an origin badge.",
          "Hovering a row reveals the Detail button, which expands reliability parameters directly in the list, and the Trash icon for deletion on editable templates.",
          "Clicking a row opens the right panel: read mode for PRISM standards, edit mode for your templates.",
          "Load more and Show less help manage large families without loading everything at once.",
          "The search bar at the top filters in real time by name, manufacturer, instrument type, data source, and tags.",
        ],
        visual: {
          src: libraryFamiliesImage,
          alt: "Center panel of the library with the three family cards: Sensors, Logic, and Actuators.",
          caption:
            "Three distinct cards, one per family. The colored top border identifies the family instantly. Empty families are hidden.",
          layout: "stacked",
          fit: "contain",
          objectPosition: "center top",
          maxHeight: 580,
        },
      },
      {
        title: "Import, export, and JSON model",
        intro:
          "Import and export functions are available from the ⋯ menu at the top right of the center panel. The native PRISM JSON format makes it possible to exchange whole libraries between environments or teams.",
        points: [
          "Import opens a JSON file picker. PRISM analyzes each entry and displays a review screen before saving so you control what is created or updated.",
          "JSON model downloads a pre-structured file compatible with the importer. It is the recommended entry point to prepare a library offline before import.",
          "Export generates a complete JSON from all templates currently visible in the view, excluding PRISM standards.",
          "On import, PRISM detects duplicates and proposes creating, updating, or ignoring each entry.",
          "Always review the right panel of an imported template before using it in a SIF.",
        ],
        visual: {
          src: libraryMenuMoreImage,
          alt: "The ⋯ menu opened at the top right of the center panel, showing Import, JSON model, and Export options.",
          caption:
            "The ⋯ menu groups import and export actions discreetly. The main bar stays focused on search.",
          layout: "split",
          fit: "contain",
          objectPosition: "right top",
          maxHeight: 360,
        },
        snippets: [
          {
            title: "Recommended flow — build a client library",
            tone: "terminal",
            code: [
              "1. Download the JSON model (⋯ menu → JSON model)",
              "2. Fill it offline: names, manufacturers, reliability values, tags",
              "3. Keep subsystemType and componentSnapshot consistent",
              "4. Reopen PRISM → ⋯ menu → Import → choose the file",
              "5. Review the review screen: create / update / ignore",
              "6. Verify every template in the right panel before use",
            ].join("\n"),
            caption:
              "This flow guarantees a controlled import. Do not change the id field of templates already in the database to avoid duplicates.",
          },
          {
            title: "Example of a complete JSON template",
            tone: "code",
            code: COMPONENT_TEMPLATE_IMPORT_DOC_EXAMPLE,
            caption:
              "This example shows a complete sensor starter. The model downloaded from PRISM includes three entries (sensor, logic, actuator) to bootstrap a complete library.",
          },
        ],
        actions: [
          {
            label: "Download the JSON model",
            actionId: "download-library-json-model",
            hint:
              "The file matches the format expected by the PRISM importer. Fill it offline, then reimport it into My library or a project.",
          },
        ],
      },
      {
        title: "Library in Architecture — the contextual picker",
        intro:
          "The same library is accessible from the right panel of the Architecture view, under the Library tab. This contextual picker lets you insert a component into a channel with drag and drop, without leaving the canvas.",
        points: [
          "The picker uses exactly the same data source as the global view: any template created or modified in the library is immediately available in Architecture.",
          "Search in the picker works the same way: name, manufacturer, instrument type.",
          "Dragging a template from the picker to a canvas channel instantiates the component with all its parameters prefilled.",
          "PRISM standards can be instantiated in a SIF without restriction: this is the main use of the PRISM catalog.",
          "If you modify a template in the global library after instantiating it in a SIF, the SIF component is not updated automatically.",
        ],
        visual: {
          src: architectureLibraryImage,
          alt: "Architecture right panel on the Library tab, with search results and a selectable template.",
          caption:
            "The Architecture picker consumes the same library as the global view. Drag a template to the target channel in the canvas.",
          layout: "split",
          fit: "contain",
          objectPosition: "right top",
          maxHeight: 600,
        },
      },
    ],
  },
  "front-search": {
    id: "front-search",
    group: "front",
    kicker: "Front A to Z · 07",
    title: "Global search",
    summary:
      "PRISM search indexes the entire portfolio in real time — projects, SIFs, components, library entries, assumptions, revisions, operational evidence, reports, and workspace notes. A universal keyboard shortcut (Ctrl+K) opens the command palette for instant navigation; the dedicated view provides advanced filtering by scope and project.",
    icon: "Search",
    highlights: [
      {
        label: "Universal shortcut",
        value: "Ctrl+K (Windows/Linux) · Cmd+K (macOS)",
      },
      {
        label: "Indexed scopes",
        value: "10 scopes: projects, SIFs, components, library, assumptions, actions, evidence, revisions, reports, workspace",
      },
      {
        label: "Relevance",
        value: "Multi-criteria scoring · normalized accents · multi-token search",
      },
      {
        label: "Direct navigation",
        value: "Result → target view with no intermediate step",
      },
    ],
    blocks: [
      {
        title: "Overview — two entry points, one index",
        intro:
          "PRISM search works on two complementary levels. The command palette (Ctrl+K) offers lightning-fast navigation from any view: type a few letters and the top 10 results appear immediately. The Global search view provides a dedicated space with side filters to explore the full portfolio without leaving context.",
        points: [
          "Ctrl+K or Cmd+K opens the palette from anywhere in the application, including in the middle of an Architecture canvas or a report.",
          "The palette integrates search in its main input: results span all indexed scopes and are sorted by relevance.",
          "Selecting a result in the palette navigates directly to the target view — SIF, Architecture component, Library template, workspace note.",
          "The Global search view opens from the palette or directly from the #/search URL.",
          "Without an active query, the view shows an overview of the main objects by category.",
        ],
        visual: {
          src: searchOverviewImage,
          alt: "Global search view with search bar on top, filter sidebar on the left, and results grouped by scope in the center.",
          caption:
            "The Global search view organizes results into color-coded groups by scope. The sidebar can instantly restrict scope or project.",
          layout: "stacked",
          fit: "contain",
          objectPosition: "center top",
          maxHeight: 660,
        },
      },
      {
        title: "Command palette — keyboard navigation",
        intro:
          "The command palette is the universal entry point of PRISM. It returns search results in real time without leaving your current work context.",
        points: [
          "Ctrl+K or Cmd+K opens the palette from any view, and the same combination closes it.",
          "The input is automatically focused. Search starts on the first character.",
          "Results display up to 10 entries with scope, destination, and context.",
          "Arrow up and down navigate, Enter selects, Escape closes.",
          "The Global search action opens the dedicated view with the current query already filled in.",
        ],
        visual: {
          src: searchPaletteImage,
          alt: "Open command palette with an active query and listed results.",
          caption:
            "The command palette overlays results above the active content. No reload, direct keyboard navigation.",
          layout: "stacked",
          fit: "contain",
          objectPosition: "center top",
          maxHeight: 520,
        },
      },
      {
        title: "What PRISM indexes — the 10 scopes",
        intro:
          "The index covers the entire portfolio loaded in memory. Each scope corresponds to a distinct object type and has its own accent color in results.",
        points: [
          "Projects: reference, client, site, applicable IEC standard, general description.",
          "SIFs: number, process tag, hazardous event, location, PID, target SIL.",
          "Components: sensors, logic, actuators, and their subcomponents.",
          "Library: native PRISM templates, project templates, and personal templates.",
          "Assumptions: items from the Context and Operations registers.",
          "Actions: cockpit priorities and non-compliance points.",
          "Evidence: proof test procedures, planned campaigns, operational events.",
          "Revisions: published history of each SIF.",
          "Reports: generated packages and archived PDFs.",
          "Workspace: Markdown notes and attached files.",
        ],
        example: {
          title: "Example of a multi-scope query",
          summary:
            "You are looking for everything related to valve XV-101 in a refinery project.",
          steps: [
            "Press Ctrl+K, then type XV-101.",
            "The palette immediately returns the component, related assumptions, and linked proof test material.",
            "Click the component to open the SIF in Architecture and select it automatically in the canvas.",
            "Then open the dedicated search view to continue filtering by scope.",
          ],
          result:
            "In a few seconds, you can cross several scopes without memorizing any navigation path.",
        },
      },
      {
        title: "Filters — scope and project",
        intro:
          "The sidebar of the Global search view exposes two cumulative filtering dimensions: scope and project. Combined, they reduce a large index to exactly what you are looking for.",
        points: [
          "Scope filter: All by default, plus the 10 individual scopes.",
          "Project filter: All projects plus the list of projects sorted by current result count.",
          "Both filters are cumulative.",
          "The Reset button clears all active filters in one action.",
          "The counter in the header shows either filtered objects or the total indexed count depending on the current state.",
        ],
        visual: {
          src: searchFiltersImage,
          alt: "Search sidebar with scope and project filters active.",
          caption:
            "Scope and project filters are cumulative and update in real time. One-click reset avoids manual unchecking.",
          layout: "split",
          fit: "contain",
          objectPosition: "left top",
          maxHeight: 560,
        },
      },
      {
        title: "Relevance algorithm — how results are ranked",
        intro:
          "PRISM uses an internal scoring engine to rank results by decreasing relevance. Each result gets a score based on where the match occurs in the record, with bonuses for title matches.",
        points: [
          "Exact title match gets the highest score.",
          "Title matches dominate subtitle, context, and keyword matches.",
          "Queries are multi-token and accent-insensitive.",
          "When two results tie, PRISM falls back to scope order, recency, and then alphabetical order.",
          "Revision histories are loaded asynchronously and the UI indicates when this loading is still in progress.",
        ],
      },
      {
        title: "Navigation — click a result",
        intro:
          "Each result is a direct navigation link. PRISM knows not only where to open the object, but also how to place it in context in the destination view.",
        points: [
          "Project opens the project dashboard.",
          "SIF opens the requested tab directly.",
          "Component opens the SIF in Architecture and selects the component in the canvas.",
          "Library template opens the Library view with the template visible and selectable.",
          "Assumption, action, and evidence open the corresponding SIF tab.",
          "Revision opens the Report tab.",
          "Workspace note opens the relevant file viewer.",
        ],
      },
    ],
  },
  "front-verification": {
    id: "front-verification",
    group: "front",
    kicker: "Front A to Z · 07",
    title: "Read verification and act on the result",
    summary:
      "The Verification tab is used to understand whether the architecture reaches the intended objective and where the contributions or gaps that must be treated are located.",
    icon: "ShieldCheck",
    highlights: [
      {
        label: "Key output",
        value: "PFDavg / achieved SIL / RRF",
      },
      {
        label: "Useful reading",
        value: "Result + breakdown + gap",
      },
      {
        label: "Decision",
        value: "Correct, justify, or publish",
      },
    ],
    blocks: [
      {
        title: "Start at the top of the page",
        intro:
          "The first reading should go from the global verdict to the main metrics before going into detail.",
        points: [
          "Look at the achieved SIL and PFDavg before discussing chart style.",
          "Then read the contribution breakdown to understand which subsystem drives the result.",
          "Do not interpret a good number without quickly reviewing architecture and assumptions coherence.",
        ],
      },
      {
        title: "Understand the gaps",
        intro:
          "A gap is not necessarily an engine failure. It often signals missing justification, missing data, or an architecture correction that is needed.",
        points: [
          "An insufficient achieved SIL may come from a structure that is too weak or from pessimistic but correct data.",
          "A documentary gap may also block publication even if the calculation is good.",
          "The cockpit should then be used to prioritize closure actions.",
        ],
        example: {
          title: "Concrete example",
          summary:
            "The global PFDavg looks too high. The breakdown shows the actuator share is dominant. The right action is not to fix the result, but to review the final package, its tests, and its subcomponents.",
          steps: [
            "Read the main contribution in the breakdown.",
            "Return to the relevant subsystem in Architecture.",
            "Verify the coherence of data and test assumptions.",
          ],
        },
      },
      {
        title: "What the view does not do for you",
        intro: "Verification provides readability, not automatic approval.",
        points: [
          "The product does not replace expert review of the business meaning of assumptions.",
          "A result is credible only if the model and the data are credible too.",
          "Before publishing, connect the result to the context and operations logic rather than to an isolated value.",
        ],
      },
    ],
  },
  "front-exploitation": {
    id: "front-exploitation",
    group: "front",
    kicker: "Front A to Z · 08",
    title: "Prepare operations and proof tests",
    summary:
      "Operations is used to prepare the procedure, record campaigns, trace dynamic measurements, and show that the function is being monitored over time.",
    icon: "FlaskConical",
    highlights: [
      {
        label: "Foundation",
        value: "Procedure + campaigns",
      },
      {
        label: "Measurements",
        value: "Observed results and times",
      },
      {
        label: "Objective",
        value: "Usable operational evidence",
      },
    ],
    blocks: [
      {
        title: "Create a credible test procedure",
        intro:
          "The procedure describes how the test is supposed to be run. It acts as the documentary framework for all future campaigns.",
        points: [
          "Structure the procedure into categories and steps that are truly executable in the field.",
          "Specify the expected result type to avoid ambiguous campaigns.",
          "Use signatures to freeze documentary responsibility for the procedure.",
        ],
      },
      {
        title: "Record a campaign",
        intro:
          "A campaign represents a test that was actually run, with its results, any non-conformities, and dynamic measurements.",
        points: [
          "Steps are filled campaign by campaign, not at procedure level.",
          "Dynamic measurements are used to document observed times during execution.",
          "The verdict depends on both completeness and observation conformity.",
        ],
        example: {
          title: "Concrete example",
          summary:
            "A proof test campaign on an ESD valve may include stroke time, team identity, witness, and comments on any deviation.",
          steps: [
            "Launch a new campaign from the approved procedure.",
            "Enter results step by step and record observed measurements.",
            "Close the campaign once the review is finished and the verdict established.",
          ],
          result: "The campaign becomes a readable, exportable evidence artifact.",
        },
      },
      {
        title: "Read the history",
        intro:
          "The history is not just there to show the last test. It allows you to assess the real consistency of operations.",
        points: [
          "Compare dates, verdicts, and conforming steps across campaigns.",
          "Identify schedule drifts or recurring campaigns that remain conditional.",
          "Use this reading in the cockpit and in the published report.",
        ],
      },
    ],
  },
  "front-report": {
    id: "front-report",
    group: "front",
    kicker: "Front A to Z · 09",
    title: "Prepare the report and publish a revision",
    summary:
      "The report is the documentary output of the work done in PRISM. It must be clean, traceable, stable, and reviewable in a review or audit.",
    icon: "FileText",
    highlights: [
      {
        label: "Output",
        value: "PDF, snapshots, artifacts",
      },
      {
        label: "Condition",
        value: "Dossier complete enough to be read",
      },
      {
        label: "Goal",
        value: "Publish without losing context",
      },
    ],
    blocks: [
      {
        title: "Before publishing",
        intro:
          "A revision should not be published because the PDF looks clean. It should be published because the dossier is defensible.",
        points: [
          "Verify that context, architecture, verification, and operations tell the same story.",
          "Make sure the major assumptions are visible and not buried in secondary fields.",
          "Close or explicitly state the gaps that would prevent an honest reading of the dossier.",
        ],
      },
      {
        title: "What the report package contains",
        intro:
          "The report should synthesize the dossier, not reinvent a parallel truth.",
        points: [
          "The PDF carries the SIF identity, assumptions, architecture, results, and useful evidence items.",
          "Components and subcomponents must remain readable in their documentary hierarchy.",
          "Revision artifacts are used to freeze a precise work state for later review.",
        ],
      },
      {
        title: "After publication",
        intro:
          "Once the revision is published, the dossier state must remain readable and comparable.",
        points: [
          "Use history to compare a published version to a more recent one.",
          "Create a new revision for any significant change instead of altering a frozen state.",
          "Keep documentary discipline on attachments and published exports.",
        ],
      },
    ],
  },
  "front-audit-log": {
    id: "front-audit-log",
    group: "front",
    kicker: "Front A to Z · 10",
    title: "Audit Log — cross-workspace traceability journal",
    summary:
      "Audit Log gathers all useful workspace events into a single stream: dossier governance, proof tests, field operations, and Engine runs. The view is designed to find a fact quickly, understand it, and reopen the right screen in one click.",
    icon: "ClipboardCheck",
    highlights: [
      {
        label: "4 scopes",
        value: "Governance · Proof tests · Operations · Engine",
      },
      {
        label: "Readable grid",
        value: "Colored dot, kind / sub-kind badges, date, context",
      },
      {
        label: "Direct navigation",
        value: "↗ button on each row to open the related view",
      },
      {
        label: "Sort order",
        value: "Most recent first or oldest first",
      },
    ],
    blocks: [
      {
        title: "Overview",
        intro:
          "The journal is organized into three areas: the left panel to frame the reading, the center journal to browse events, and the right inspector to understand a selected event and return to the relevant business view.",
        points: [
          "The header displays the view title with the number of visible events and the number of warnings in scope.",
          "The center journal shows events from newest to oldest by default, with integrated search and sorting.",
          "No view switching is required: governance, proof tests, operations, and Engine coexist in the same stream.",
        ],
        visual: {
          src: auditLogMainImage,
          alt: "Full Audit Log view with header, left scope panel, center journal, and right inspector.",
          caption:
            "Audit Log displays all documentary and technical activity of the workspace on a single screen.",
          layout: "stacked",
          fit: "contain",
          objectPosition: "center top",
          maxHeight: 660,
        },
      },
      {
        title: "Read the grid: dot, badges, and sorting",
        intro:
          "Each journal row follows the same visual structure so that you can read it quickly without deciphering the full text of each event.",
        points: [
          "The colored dot on the left indicates the event category. An amber triangle replaces the dot when the event is a warning.",
          "The kind and sub-kind badges help identify the type without reading the full action text.",
          "The ↗ button appears on row hover and opens the related view directly.",
          "The sort button in the search bar toggles between most recent first and oldest first.",
        ],
        visual: {
          src: auditLogRowsImage,
          alt: "Zoom on several journal rows showing colored dots, badges, and the hover navigation button.",
          caption:
            "The grid lets you qualify an event visually before even reading its label.",
          layout: "stacked",
          fit: "contain",
          objectPosition: "center top",
          maxHeight: 480,
        },
      },
      {
        title: "Refine with the left panel",
        intro:
          "The left panel is used to frame the reading before browsing the journal. It defines what is relevant for the question being asked.",
        points: [
          "Scope restricts the journal to all events, warnings only, or one of the four business categories.",
          "The project filter restricts the reading to a single dossier when multiple projects coexist in the workspace.",
          "The quick reading section displays the number of warnings in the current perimeter to signal priority items immediately.",
        ],
        visual: {
          src: auditLogLeftPanelImage,
          alt: "Audit Log left panel with scope selection, project filter, and quick reading summary.",
          caption:
            "Reducing the scope before reading prevents you from browsing dozens of irrelevant events.",
          layout: "split",
          fit: "contain",
          objectPosition: "left top",
          maxHeight: 560,
        },
      },
      {
        title: "Inspect an event and navigate to the related view",
        intro:
          "Selecting a row opens the inspector in the right panel. It displays the full context of the event and offers direct opening of the relevant business view.",
        points: [
          "The Context section shows date, project, linked SIF, and event actor.",
          "The Action section offers an adapted opening button.",
          "The ↗ button on the row does the same without having to open the inspector.",
        ],
        visual: {
          src: auditLogRightPanelImage,
          alt: "Audit Log right panel displaying the context and action for a selected event.",
          caption:
            "The inspector helps understand the event and reopen the right screen without reconstructing the path manually.",
          layout: "split",
          fit: "contain",
          objectPosition: "right top",
          maxHeight: 560,
        },
      },
      {
        title: "When to use Audit Log",
        intro:
          "Audit Log is useful when the question is temporal or narrative. To work on the substance of a dossier, it is better to stay in business views.",
        points: [
          "Reconstruct a chronology.",
          "Check whether an Engine run or compare was launched and with what result.",
          "Identify warnings awaiting review before a validation session.",
          "Quickly find the right screen to open from a known event.",
        ],
      },
    ],
  },
  "front-engine": {
    id: "front-engine",
    group: "front",
    kicker: "Front A to Z · 11",
    title: "Use Engine to run, compare, and trace calculations",
    summary:
      "Engine is the guided technical view of PRISM. It is used to execute the Python backend, compare front and backend results, review persisted run history, and inspect the payload that was actually sent for calculation.",
    icon: "Cpu",
    highlights: [
      {
        label: "Actions",
        value: "Backend run, compare, history",
      },
      {
        label: "Traceability",
        value: "Payload, response, status, runtime",
      },
      {
        label: "Marker",
        value: "Backend health always visible",
      },
      {
        label: "Goal",
        value: "Understand the calculation, not just trigger it",
      },
    ],
    blocks: [
      {
        title: "Start with Backend runs",
        intro:
          "The Backend runs view is used to select a SIF and run the Python calculation on the same business model built in the application.",
        points: [
          "The center table lists SIF candidates together with their project context.",
          "The right panel acts as a technical inspector of the selected run context.",
          "This view is designed to trigger a real calculation, not to read history.",
        ],
        visual: {
          src: runsMainImage,
          alt: "Engine view on Backend runs with the list of SIFs available for calculation.",
          caption:
            "Backend runs is used to choose the right SIF and launch the Python calculation without leaving the main PRISM shell.",
          layout: "stacked",
          fit: "contain",
          objectPosition: "center top",
          maxHeight: 660,
        },
      },
      {
        title: "Review the context sent to the calculation",
        intro:
          "When a SIF is selected, the right panel is used to confirm that the correct context is about to be sent to the backend.",
        points: [
          "The synthetic context view lets you confirm the project, SIF, and run scope before execution.",
          "The inspector avoids mixing up two similar SIFs when several dossiers are open.",
          "This reading strongly reduces launch errors caused by a wrong selection.",
        ],
        visual: {
          src: runsRightPanelImage,
          alt: "Right panel of Backend runs showing the inspector for the selected SIF.",
          caption:
            "Before execution, the right panel confirms the actual selected context: project, SIF, and calculation mode.",
          layout: "split",
          fit: "contain",
          objectPosition: "right top",
          maxHeight: 700,
        },
      },
      {
        title: "Inspect the payload that was actually transmitted",
        intro:
          "The payload tab shows the structure actually sent to the backend and allows you to verify that the calculation contract matches the intended model.",
        points: [
          "It helps understand what the backend sees.",
          "It is useful to review transmitted subsystems, channels, components, and subcomponents.",
          "It is the right place to confirm critical values before investigating a discrepancy.",
        ],
        visual: {
          src: runsPayloadImage,
          alt: "Right panel of Backend runs on the payload tab, showing the JSON actually sent to the backend.",
          caption:
            "The Payload tab exposes the concrete contract sent to the backend: useful for checking the model, not just the final result.",
          layout: "split",
          fit: "contain",
          objectPosition: "right top",
          maxHeight: 740,
        },
      },
      {
        title: "Compare front and backend without losing context",
        intro:
          "Compare is used to reconcile the local TypeScript calculation and the Python backend calculation.",
        points: [
          "The center table lets you launch or review a compare per SIF.",
          "The route inspector helps understand which route or subsystem carries the main discrepancy.",
          "A useful compare must open a concrete investigation path.",
        ],
        visual: {
          src: compareMainImage,
          alt: "Engine view on Compare TS / Python with comparison rows per SIF.",
          caption:
            "Compare brings front and backend side by side to detect a readable discrepancy, not just to show two numbers next to each other.",
          layout: "stacked",
          fit: "contain",
          objectPosition: "center top",
          maxHeight: 660,
        },
      },
      {
        title: "Read History as a calculation trace",
        intro:
          "History reads the runs actually persisted in PRISM. This view is used to know what was executed, when, with what status, and to reopen technical details without rerunning a calculation.",
        points: [
          "Each entry keeps trigger type, run state, duration, backend used, and the main summary.",
          "This view is distinct from Audit Log: detailed execution truth is central here.",
          "History becomes the foundation for technical review of calculations that were actually launched.",
        ],
        visual: {
          src: historyMainImage,
          alt: "Engine view on History with the list of persisted runs.",
          caption:
            "History exposes the runs that were actually recorded: status, duration, SIF context, and execution trace.",
          layout: "stacked",
          fit: "contain",
          objectPosition: "center top",
          maxHeight: 660,
        },
      },
      {
        title: "Use the right panel as technical evidence",
        intro:
          "In History, the right panel acts as a technical inspection point. It lets you review the run summary, backend response, and payload without leaving the view.",
        points: [
          "The Backend tab shows the actual response returned by the Python service.",
          "The Payload tab lets you quickly compare what was requested to what was obtained.",
          "This turns History into a real technical evidence view, not just a chronology.",
        ],
        visual: {
          src: historyRightPanelImage,
          alt: "Right panel of History showing the details of a backend run.",
          caption:
            "The History right panel ties the execution trace to technical content: summary, payload, and backend response.",
          layout: "split",
          fit: "contain",
          objectPosition: "right top",
          maxHeight: 720,
        },
      },
    ],
  },
} satisfies Record<string, DocChapterData>
