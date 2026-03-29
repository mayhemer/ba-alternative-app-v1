# Coding guidelines

## Major
- Separate library, reusable API to its own file modules
- Keep model data sources as adapters that can easily switch to a different root data source: fetch from API a, fetch from API b, fetch from persistent async storage
- Rather use these model data sources to fetch additional data that are referenced by ids, instead of inlining them to a single data source if possible; break this rule when e.g. react intrinsics would work way better with inlined data, but ask me first

### Frontend constrains
- reuse native components where possible, design for reusability, modularity, and for easy adaptability of widgets content according current UI state
- always use styling, including for element sizing

## Minor
- always use full bracing of if/while/for statements.
- use ternary operator in ts/js only for one liners, do not nest it
- when converting between different tuples, don't use nested ternary, use `switch()` or `if (source == 1) return "one";` style; you can break the bracing rule here.
- use js intrinsics or lib functions to calculate with time and date and day of week, try to avoid sub-string hacks, if possible
