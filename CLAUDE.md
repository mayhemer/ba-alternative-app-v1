This is a festival app with artist and event listing.

# Coding guidelines

You are a senior engineer with experience in writing expo/react native/aws fullstack applications.

## Major
- Separate library, reusable API to its own file modules
- Keep model data sources as adapters that can easily switch to a different root data source: fetch from API a, fetch from API b, fetch from persistent async storage
- Rather use these model data sources to fetch additional data that are referenced by ids, instead of inlining them to a single data source if possible; break this rule when e.g. react intrinsics would work way better with inlined data, but ask me first
- after making a change that may be suspect to cause integration problems, check the effect cross-file before finishing; mandatory for features spanning multiple files — read the relevant consumer files and trace the impact
- don't revert externally made changes

### Frontend constrains
- reuse native components where possible, design for reusability, modularity, and for easy adaptability of widgets content according current UI state
- always use styling, including for element sizing
- when introducing a hook or component that requires a root-level provider (SafeAreaProvider, GestureHandlerRootView, NavigationContainer, ReanimatedProvider, etc.), add the provider to App.tsx in the same step — never defer it
- when installing a package that requires build-time configuration (Babel plugins, Metro config, etc.), update the config file in the same step as the install
- all functions inside a React context provider must be useCallback-wrapped; the value object passed to <Context.Provider> must be useMemo-wrapped

### UI elements: one source per piece of information
- A UI element that shows one piece of information on screen (a plan gap, a set row, the now pill, a timeline block) is self-contained: its size, shape and every text it shows are computed together, from the same inputs, in one place. A gap drawn as 2 h tall says "2 h" because its height and its label come from the same pair of times.
- The element takes the raw inputs it depends on (e.g. a gap's start and the set listed under it). Never a size, label or time computed by its parent, and never a value taken from a differently filtered view of the same data (e.g. all picks vs the listed ones).
- How: one module per element, holding a pure model function (inputs → size, shape, text) and the component that draws only that model. Sizes stay pure functions, so lists can lay out without rendering (getItemLayout).
- When two elements show related information (e.g. the now pill and the plan list), the spec states which source each one follows. Never copy one element's rule into the other silently.
- A constant with one meaning is defined once and imported.

## Tests
- Write or update tests before the code, and show that they fail for the expected reason.
- Unit tests for each element's model function, boundaries included.
- Configuration tests for each element and screen. Define the dimensions that affect it at the top of the test file, then test their corner cases (not the whole product). Typical dimensions:
  - filter state: the lens, Show Maybe, conflicts only;
  - the data: sets with different interests (Must-see, Maybe, none, don't go), in the orders that matter (a Maybe before the first Must-see, overlapping sets, sets over 2 h);
  - time: another day; today with now before 08:00, at and around each set's start and end, in a gap, after the last set;
  - festival: a festival day, before the festival, after it.
- Write each expected value by hand. Never compute it with the code under test.
- A filter or toggle is only tested by a case where it changes the outcome. A fixture where the toggle makes no difference does not test it.
- A test's name states only what its assertions can distinguish. If it says "first listed set", the fixture's first listed set must differ from the alternative it rules out.
- Reactivity, in render tests for each screen:
  - the output updates when any input changes: each filter, an event added, removed or modified, interests, the minute tick;
  - elements whose output didn't change do not re-render. Count renders (measureRenders) and add these scenarios to the perf gate.

## Reporting
- Never write "as you specified" unless the user said it in those words. When interpreting a requirement, write "I read X as Y" and ask about the parts that are ambiguous.
- When explaining behaviour, put an exception in the same sentence as the rule it breaks, never at the end of the answer.
- A bug found while answering a question goes first, labelled as a bug. If the reply doesn't clearly decide it, ask once. If it stays unfixed, record it in 2027-TODO.md so it isn't lost.
- Describe code behaviour from the code, not from the spec or memory. Check commit summaries and test names against what the code actually does.

## DynamoDB tables — keeping infra and tests in sync

The canonical DynamoDB table definitions live in two places that must stay in sync:

| File | Purpose |
|------|---------|
| `infra/lib/constructs/tables.ts` | CDK stack — creates the real AWS tables |
| `backend/db-table-schema.js` | Plain-JS mirror — used by integration tests (DynamoDB Local) |

When you add, rename, or delete a table or key in `tables.ts`, make the matching change in `db-table-schema.js` in the same step. `db-table-schema.js` is imported by `jest-dynamodb-config.js` (table creation) and `tests/integration/clearTables.ts` (beforeEach wipe) — both derive from it automatically.

## Minor
- always use full bracing of if/while/for statements.
- use ternary operator in ts/js only for one liners, do not nest it
- when converting between different tuples, don't use nested ternary, use `switch()` or `if (source == 1) return "one";` style; you can break the bracing rule here.
- use js intrinsics or lib functions to calculate with time and date and day of week, try to avoid sub-string hacks, if possible

# Project description

Read DESIGN.md side by this file to understand the UX and most of internal design and implementation details.  Keep DESIGN.md file up to date when the design of the project changes, new features are added.
