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
