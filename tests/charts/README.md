# Why there's no test here

`components/charts/ring-center.tsx` had a bug where its `children`
render-prop (used by `components/SeatsRingChart.tsx` to show "N seats
left") only activated while a ring segment was being hovered
(`if (children && hoveredData)`), so the default, most-seen state on
every page load silently fell back to the library's own rendering — the
summed ring value labeled "Total" — instead of the caller's intended
content. Fixed by dropping the `hoveredData` condition so `children`
always renders, falling back to `data[0]` for the `data` field it's
passed when nothing is hovered.

No automated test covers this: this project's Jest setup
(`jest.config.js`) runs API route/integration tests against real
Postgres with `testEnvironment: 'node'` and no jsdom or React Testing
Library — there's no component-rendering test infrastructure to hook
into without adding new tooling. Verified manually instead: a screenshot
of an event detail page in its resting (non-hovered) state, confirming
the ring center shows the correct seats-remaining figure and label.
