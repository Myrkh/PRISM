import type { DocChapterData } from '@/docs/types'

export const engineDocTranslationsEn = {
  'engine-overview': {
    id: 'engine-overview',
    group: 'engine',
    kicker: 'Engine A to Z · 01',
    title: 'What the PRISM engine does',
    summary:
      'The engine takes the SIF model from the front-end, converts it into a calculation contract, applies supported conventions, and produces a result that can be used by verification and report views.',
    icon: 'Cpu',
    highlights: [
      {
        label: 'Input',
        value: 'Normalized contract',
      },
      {
        label: 'Output',
        value: 'PFD, SIL, breakdown, traceability',
      },
      {
        label: 'Position',
        value: 'Engine in service of the dossier',
      },
    ],
    blocks: [
      {
        title: 'Exact role of the engine',
        intro:
          'The engine is not a separate box detached from the product; it is the quantitative layer that supports the documentary reading of the SIF.',
        points: [
          'It consumes the structured SIF parameters to produce a result coherent with the current model.',
          'It returns enough information to feed the cockpit, verification, engine view, and report.',
          'It does not decide for the engineer whether the dossier is acceptable or publishable.',
        ],
      },
      {
        title: 'When the engine is invoked',
        intro: 'The calculation is used anywhere the product needs a quantitative reading of the SIF.',
        points: [
          'In Verification to display results and contribution breakdowns.',
          'In the cockpit to raise the global technical status.',
          'In Engine and Report to expose the contract and detailed results.',
        ],
      },
      {
        title: 'What the engine does not do on its own',
        intro:
          'The calculated value is never sufficient evidence on its own. It must remain linked to the safety scenario and the modeling conventions that were used.',
        points: [
          'The engine does not reconstruct business intent by itself if the canvas was misread or badly entered.',
          'It cannot automatically detect that vendor data was already included in a parent package.',
          'It does not replace documentary review, critical reading of the context, or expert validation before publication.',
        ],
      },
      {
        title: 'Example of healthy reading',
        intro:
          'A good use of the engine is to read its result as a quantitative answer to a given model, not as an absolute verdict.',
        points: [
          'A surprising result should first lead you to reread the architecture and parameters, not immediately question the formula.',
          'Comparing cockpit, detailed verification, and report is useful to spot inconsistencies or omissions.',
          'The cleaner the dossier traceability, the more defensible the calculated value becomes during review.',
        ],
      },
    ],
  },
  'engine-runtime': {
    id: 'engine-runtime',
    group: 'engine',
    kicker: 'Engine A to Z · 02',
    title: 'Start the backend and understand the call chain',
    summary:
      'The engine is not called directly by the browser. It is served by the FastAPI backend, which is itself called by the front-end through the development proxy. This chapter explains the full chain and the startup command.',
    icon: 'Cpu',
    highlights: [
      {
        label: 'Server',
        value: 'FastAPI + uvicorn',
      },
      {
        label: 'Expected port',
        value: '8000 in development',
      },
      {
        label: 'Scripts',
        value: '`./scripts/dev-backend.sh` and `./scripts/dev-all.sh`',
      },
    ],
    blocks: [
      {
        title: 'Full call chain',
        intro:
          'When a user launches a calculation, the front-end does not execute the scientific engine itself. It calls the local backend, which then takes over.',
        points: [
          'The front-end sends its requests to `/api/...`.',
          'In development, Vite proxies these calls to the local backend started on `http://127.0.0.1:8000`.',
          'The FastAPI backend receives the contract, calls the calculation services, and returns a JSON result consumed by front-end views.',
        ],
        example: {
          title: 'Sequence example',
          summary:
            'You open `Verification` and request a calculation. The browser only forwards the input; the real calculation is produced on the backend side.',
          steps: [
            'The front-end prepares the calculation contract from the current SIF.',
            'The request goes to `/api/engine/sil/compute`.',
            'The backend turns the engine response into a result usable by the front-end.',
          ],
          result:
            'If the backend is not running or uses the wrong port, the Engine or Verification view raises an error.',
        },
      },
      {
        title: 'Local startup command',
        intro: 'The full command launches the ASGI server that serves the backend application in development mode.',
        points: [
          'Direct command: `cd /home/user/safeloop/backend` then `.venv/bin/python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000`.',
          '`main:app` means: import the `main.py` module and expose the FastAPI object named `app`.',
          '`--reload` automatically restarts the server whenever the backend changes during development.',
          'To avoid retyping the command, PRISM provides `./scripts/dev-backend.sh` for the backend only and `./scripts/dev-all.sh` to launch front-end and backend together.',
        ],
        snippet: {
          title: 'Local startup sequence',
          tone: 'terminal',
          code: `$ cd /home/user/safeloop\n$ ./scripts/dev-backend.sh\n$ curl -sS http://127.0.0.1:8000/health`,
          caption:
            'The development front-end expects the backend on `8000`. The `/health` check is the fastest way to confirm the chain is responding.',
        },
      },
      {
        title: 'Useful endpoints to know',
        intro:
          'A handful of routes are enough to verify that the backend is running and understand what the front-end is asking it to do.',
        points: [
          '`GET /health` checks that the backend responds.',
          '`GET /engine/library/components` exposes the library coming from `lambda_db`.',
          '`POST /engine/sil/compute` launches a SIF calculation.',
          '`POST /engine/sil/report` produces the data required by the report.',
        ],
      },
      {
        title: 'Why port 8000 matters',
        intro:
          'The development front-end assumes the backend is available on a precise port. If this implicit contract breaks, the front-end looks broken even though the issue is only in the connection between both sides.',
        points: [
          'The front-end Vite proxy is wired to `localhost:8000` for `/api` calls.',
          'If you launch the backend on another port without reconfiguring the proxy, calculations and the library will stop responding correctly.',
          'The first simple test is therefore to verify `http://127.0.0.1:8000/health` before concluding that the engine itself is failing.',
        ],
      },
    ],
  },
  'engine-contract': {
    id: 'engine-contract',
    group: 'engine',
    kicker: 'Engine A to Z · 03',
    title: 'From front-end to calculation contract',
    summary:
      'The engine does not receive the canvas or front-end widgets directly. It receives a clean, structured, serializable contract that summarizes the SIF in a calculable form.',
    icon: 'Network',
    highlights: [
      {
        label: 'Origin',
        value: 'Structured front-end',
      },
      {
        label: 'Transformation',
        value: 'Normalization then flattening',
      },
      {
        label: 'Goal',
        value: 'Calculable and traceable contract',
      },
    ],
    blocks: [
      {
        title: 'General structure',
        intro:
          'The contract is organized by subsystem, then by channels, then by components useful to the calculation.',
        points: [
          'Each subsystem carries its type, vote, channels, and global parameters useful to the engine.',
          'Each channel contains the components actually required to represent the path under consideration.',
          'Component parameters are already consolidated before being sent to the backend.',
        ],
      },
      {
        title: 'Subcomponent case',
        intro:
          'Subcomponents keep a documentary parenthood, but they become calculable in the same contract as other components.',
        points: [
          'The front-end normalizes the subcomponent as a complete component with its own data template.',
          'At send time, parent and subcomponents are flattened into the channel component list.',
          'The `parentComponentId` field keeps traceability for display and report without breaking the calculation.',
        ],
        example: {
          title: 'Reading example',
          summary:
            'A parent valve with a solenoid valve subcomponent remains visible as a hierarchy in the UI, but the engine reads a path containing the parent and child as required elements of the same channel.',
          steps: [
            'The parent is configured in the canvas.',
            'The subcomponent gets its own configuration panel.',
            'The final contract transmits both elements with their parent relationship.',
          ],
          result:
            'The calculation stays coherent with a series reading, while the report keeps a readable hierarchy.',
        },
        snippet: {
          title: 'Simplified contract extract',
          tone: 'code',
          code: `{"subsystems":[{"type":"actuator","channels":[{"components":[{"id":"XV-101","parentComponentId":null},{"id":"SOV-101","parentComponentId":"XV-101"}]}]}]}`,
          caption:
            'The backend receives a flat list of calculable components, but the documentary relationship is preserved through `parentComponentId`.',
        },
      },
      {
        title: 'What the backend does not see',
        intro:
          'The backend does not need to know page layout details, animations, or purely visual front-end conventions.',
        points: [
          'The canvas, ProjectTree visual states, and pure interface choices remain strictly on the front-end side.',
          'The backend receives a stable business object rather than a fragile UI projection.',
          'This separation lets the UI evolve without breaking the engine as long as the contract remains compatible.',
        ],
      },
      {
        title: 'Why this normalization is useful',
        intro:
          'Normalization isolates the engine from UI details and provides a stable base for future evolution.',
        points: [
          'The backend does not need to understand visual canvas details.',
          'Engine and Report views can reread the same contract with no interpretation drift.',
          'Future front-end evolution remains possible as long as the contract stays stable.',
        ],
      },
    ],
  },
  'engine-logic': {
    id: 'engine-logic',
    group: 'engine',
    kicker: 'Engine A to Z · 04',
    title: 'How the engine interprets the architecture',
    summary:
      'This chapter explains how the engine reads MooN voting, required elements in series, subcomponents, proof test data, and common cause.',
    icon: 'ShieldCheck',
    highlights: [
      {
        label: 'Votes',
        value: 'Reading by subsystem',
      },
      {
        label: 'Paths',
        value: 'Channels and required elements',
      },
      {
        label: 'Meaning',
        value: 'Interpret before calculating',
      },
    ],
    blocks: [
      {
        title: 'MooN votes and channels',
        intro:
          'The engine first reads the voting structure at subsystem level. This is where the redundancy or requiredness logic of channels is decided.',
        points: [
          'The number of channels and the selected architecture define the calculation frame of the subsystem.',
          'A voting architecture is not a visual label; it changes the meaning of the subsystem contribution.',
          'The engine assumes this architecture reflects the real behavior of the function.',
        ],
      },
      {
        title: 'Elements in series within a channel',
        intro:
          'When several components in the same channel are required for that path to work, the engine reads them as a path whose unavailability accumulates.',
        points: [
          'This is especially important for final packages or parent / subcomponent combinations.',
          'A path is not made more robust just because it contains more objects; you must read the functional meaning of each one.',
          'Correct channel reading is therefore a critical model quality point.',
        ],
        example: {
          title: 'Concrete example',
          summary:
            'Two valves that must both open to empty a tank are not a 1oo2 safety redundancy. The engine must read them as two required elements of the same functional path.',
          steps: [
            'The SIF detects a high level and triggers the opening of two series elements to flare.',
            'If only one of the two valves remains stuck, the function fails despite the presence of two devices.',
            'The right model is therefore not more robust because there are two objects, but more demanding because both must succeed.',
          ],
          result:
            'This reading avoids confusing a functional series with a real availability redundancy.',
        },
      },
      {
        title: 'Proof test, CCF, and complementary parameters',
        intro:
          'The engine also uses test, coverage, and common-cause parameters wherever the current model supports them.',
        points: [
          'Test parameters influence the result as soon as they are provided and supported by the model.',
          'Common cause factors must be used with discipline because they depend strongly on the modeled case.',
          'Advanced data without clear justification can artificially worsen or improve the calculation.',
        ],
      },
      {
        title: 'Read a custom architecture carefully',
        intro:
          'A custom logic always requires an explicit rereading of the meaning applied by the model.',
        points: [
          'You must distinguish a high-level boolean combination from a truly equivalent MooN voting structure.',
          'A business `AND` is not always synonymous with a redundant architecture; it may simply mean several elements are required in series.',
          'When the case becomes ambiguous, best practice is to document the selected convention in the dossier and in the report.',
        ],
      },
    ],
  },
  'engine-results': {
    id: 'engine-results',
    group: 'engine',
    kicker: 'Engine A to Z · 05',
    title: 'What the engine returns',
    summary:
      'The engine produces more than a final number. It returns a detailed result that feeds the technical reading, the cockpit, the engine view, and report publication.',
    icon: 'FileText',
    highlights: [
      {
        label: 'Main result',
        value: 'SIL / PFDavg / RRF',
      },
      {
        label: 'Detail',
        value: 'Subsystems and components',
      },
      {
        label: 'Usage',
        value: 'Front-end, engine, report',
      },
    ],
    blocks: [
      {
        title: 'Global result',
        intro: 'The first level of output gives the synthetic reading of the calculated SIF.',
        points: [
          'Achieved SIL, PFDavg, and RRF provide the global technical reading of the obtained protection level.',
          'This synthetic output is what surfaces first in Verification and Cockpit.',
          'It must however always remain connected to the detailed construction of the result.',
        ],
      },
      {
        title: 'Detailed breakdown',
        intro:
          'The engine also returns per-subsystem results and information that enable a finer reading of the dossier.',
        points: [
          'Each subsystem keeps its own contribution and associated indicators.',
          'Components and subcomponents can be reread in the documentary hierarchy when traceability is preserved.',
          'This granularity lets you connect an observed problem to a precise area of the model.',
        ],
      },
      {
        title: 'How the front-end uses it',
        intro: 'Engine outputs are reused by several views, each with a different role.',
        points: [
          'Verification exposes the detailed technical reading and contribution breakdowns.',
          'The cockpit turns it into a synthetic decision-oriented reading.',
          'The report transforms the same results into stable, reviewable documentary evidence.',
        ],
        example: {
          title: 'Multi-view reading example',
          summary:
            'The same SIF can be viewed at three levels: synthesis in the cockpit, detail in Verification, then narrative form in the report.',
          steps: [
            'The cockpit quickly indicates whether the dossier seems to pass or not against the target.',
            'The Verification view helps identify the most contributive subsystem or package.',
            'The report reuses the same result to produce a stable, shareable artifact.',
          ],
          result: 'The engine does not feed a single page; it supports the whole dossier reading chain.',
        },
      },
      {
        title: 'Why traceability matters as much as the value',
        intro:
          'A number alone is not very helpful to defend a decision. What makes a result valuable is also its ability to be reread, explained, and challenged if necessary.',
        points: [
          'Keeping the parent / subcomponent structure avoids flattening the documentary reasoning.',
          'Per-subsystem detail helps justify where the real technical constraint lies.',
          'Clean traceability accelerates reviews and reduces fuzzy discussions at publication time.',
        ],
      },
    ],
  },
  'engine-limits': {
    id: 'engine-limits',
    group: 'engine',
    kicker: 'Engine A to Z · 06',
    title: 'Assumptions, limits, and good reading practices',
    summary:
      'Engine documentation must also clearly say what remains simplified, approximated, or not yet covered. This chapter exists to avoid false certainty.',
    icon: 'TriangleAlert',
    highlights: [
      {
        label: 'Principle',
        value: 'No magic black box',
      },
      {
        label: 'Healthy reading',
        value: 'Result + context + assumptions',
      },
      {
        label: 'Reflex',
        value: 'Expert review before publication',
      },
    ],
    blocks: [
      {
        title: 'What should always be checked',
        intro:
          'Before drawing conclusions from a value, you need to reread the quality of the model and the input data.',
        points: [
          'Check that the declared architecture really matches the actual function.',
          'Make sure imported parameters do not duplicate data already included in a package.',
          'Identify strong assumptions that influence the final result.',
        ],
      },
      {
        title: 'Known limits',
        intro:
          'Like any specialized engine, PRISM has a coverage perimeter that must be acknowledged rather than disguised.',
        points: [
          'Highly dynamic cases, rich temporal dependencies, or some advanced logic patterns go beyond the current native reading.',
          'Custom architectures require careful rereading of the actual meaning applied by the model.',
          'The final report should remain honest about approximations instead of artificially smoothing the discourse.',
        ],
      },
      {
        title: 'How to react to a surprising result',
        intro:
          'The right reflex is not to force the dossier to pass, but to go back through the modeling chain.',
        points: [
          'First reread the business context and the targeted hazardous scenario.',
          'Then compare the architecture / channels / components structure with the actually expected behavior.',
          'Finally, verify library, test, and coverage assumptions before concluding that there is a real technical issue.',
        ],
        example: {
          title: 'Review example',
          summary:
            'A function appears too penalized after a subcomponent was added. Before doubting the engine, you should first check whether the parent package did not already include the same data.',
          steps: [
            'Reread the parent component data source.',
            'Check whether the SOV or positioner was not already included in the vendor value.',
            'Correct the model, then rerun the calculation.',
          ],
          result:
            'Result quality often depends more on model quality than on an algorithm problem.',
        },
      },
      {
        title: 'Publishing best practice',
        intro:
          'The best use of the engine is to integrate it into a justification chain, not to treat it as the sole arbiter of the dossier.',
        points: [
          'Return to context and architecture when a result is surprising or contradicts business intuition.',
          'Document important assumptions in the dossier instead of leaving them implicit.',
          'Use publication only when the technical and documentary reading tells a coherent story.',
        ],
      },
    ],
  },
} satisfies Record<string, DocChapterData>
