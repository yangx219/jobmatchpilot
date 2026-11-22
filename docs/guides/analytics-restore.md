# Analytics restored

The original dashboard comes from the downloaded JobSync project. Its source
is retained in `../jobsync-main/src/app/dashboard/page.tsx`. The charts,
activity history and daily-goal components are inherited JobSync features.
JobSpy is a separate collection library; it is not the source of these screens.

Restored on the JobMatchPilot home dashboard:

- Quick actions, combined jobs/activity analysis with 7/30-day selection.
- Weekly applications and activity charts with working tabs.
- Yearly activity heatmap with year selection.
- Monthly goal summary and interactive day calendar with month navigation.
- Recent application and activity records.
- Compact header with the current date in the Europe/Paris time zone.

The former large welcome, onboarding and dark-green assistant cards are no
longer on this dashboard. The existing assistant remains available in the
header. The public homepage and language selector remain in place. White,
grey and blue styling replaces the dark-green presentation across the main
shell, auth screens and public homepage. Existing user data is not reset.

The inherited yearly heatmap had identical `from` and `to` dates. Its visible
range now covers January 1 through December 31 of the selected year. A user
without activity still gets a valid current-year calendar. Its mobile view
scrolls inside the card so individual days stay readable.

The layout follows the content container: wide screens show analysis beside
the monthly calendar; narrower screens stack those sections. This also works
when the assistant reduces the available desktop width. The mobile sidebar is
replaced by the existing menu sheet. The goal calendar retains its original
adaptive grid.

The quick-action/analysis row also stacks independently at narrower content
widths. Weekly chart date ticks use the measured chart width rather than the
browser viewport, so a visible sidebar on a tablet does not crowd the axis.

Local browser checks use temporary, automatically cleaned-up accounts and
fixture records:

    node --env-file=.env scripts/smoke-analytics.mjs

`scripts/smoke-workspace.mjs` delegates to that check after the restoration.
Screenshots are written to ignored `test-results/analytics-*.png`.

A phone cannot reach a computer through the computer's `127.0.0.1` URL. For
physical-device testing, use a reachable deployment or configure the local
server to listen on the LAN (`JOBMATCHPILOT_HOST=0.0.0.0 npm start`, after stopping
the existing local process), then open the computer's LAN IP on the same Wi-Fi.
