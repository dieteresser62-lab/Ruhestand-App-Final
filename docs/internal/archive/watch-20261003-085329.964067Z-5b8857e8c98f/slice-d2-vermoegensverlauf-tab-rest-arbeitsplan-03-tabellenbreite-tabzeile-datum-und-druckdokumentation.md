# Slice 3 von 3 – Tabellenbreite, Tabzeile, Datum und Druckdokumentation

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Die Ausgabentabelle wieder vollständig anzeigen, den Verlauf innerhalb seiner Spalte halten und die verbleibenden Layout- und Dokumentationsbefunde abschließen.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
1. Gemessen an SOURCE: `.form-column` hat die zusätzliche `min-width: 0`-Regel nicht mehr, `.wealth-scroll` nutzt `contain: inline-size`, und die neue mobile Drawer-Sonderregel samt Kommentar ist entfernt. Die Ausgabentabelle behält ihre Mindestbreite von 720 px und bestehende Drawer-Regeln bleiben erhalten.
2. Gemessen an SOURCE: Aus dem Quellstand gestartete Browserprüfungen belegen bei 1251, 1280, 1366, 1440 und 1920 px mindestens 720 px vollständig sichtbare Ausgabentabelle wie auf `main`; die Formularspalte wächst beim Öffnen des gefüllten Verlaufs nicht. Alle vier Tabs liegen vollständig in einer Zeile. Browsermaße werden mit höchstens 1 CSS-Pixel Rundungstoleranz verglichen und nach Animationsende erhoben.
3. Gemessen an SOURCE: Bei 375 px entsteht kein seitenweiter horizontaler Überlauf im Verlauf; Diagramm und Tabelle scrollen intern, alle Tabs und Capture bleiben erreichbar. Das Entfernen des Drawer-Sonderfalls verändert das bestehende Öffnen/Schließen nicht. Die Grenze 1250/1251 px entspricht weiterhin dem vorhandenen Layoutbreakpoint.
4. Gemessen an SOURCE: Node-Markuptests belegen Capture, Anzahl und Datum im selben Aktionscontainer mit unveränderter ID/Live-Ankündigung. Browserprüfungen belegen deren gemeinsame Desktopzeile und unveränderte Datumstexte. Node-Tests belegen, dass Capture bei aktiver/inaktiver Historie sowie Fehlern keinen Tab öffnet oder wechselt; die in Slice 1 abgesicherte Updatefreiheit beim Tabwechsel bleibt grün.
5. Gemessen an SOURCE: README, Handbuch, technische Referenz, Modulreferenz und Test-README beschreiben die endgültige Darstellung und Gatezuständigkeiten konsistent. Das Handbuch nennt die ausgeschlossene Druckausgabe; Druck-CSS wird dafür nicht verändert.
6. Gemessen an SOURCE: Die fokussierten Node-Prüfungen und anschließend die Orchestrator-Suite bestehen. Der Browserbericht der gesteuerten Sitzung nennt echte gemessene Tabellen-/Wrapper-/Formular-/Seitenbreiten und Tabzeilen für die Viewportmatrix sowie die 375-px-Messung; Review-Vorherwerte gelten nicht als neue Messung.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `Balance.html`
- `Handbuch.html`
- `README.md`
- `css/balance.css`
- `docs/internal/d2-vermoegensverlauf-tab-rest-implement-review-e2196f18.md`
- `docs/internal/slice-d2-vermoegensverlauf-tab-rest-arbeitsplan-03-tabellenbreite-tabzeile-datum-und-druckdokumentation.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
- `tests/balance-wealth-history-chart.test.mjs`
- `tests/balance-wealth-history.test.mjs`
- `tests/browser-smoke.test.mjs`
<!-- audit:scope:end -->

## Umsetzung

> > - Die zusätzliche `min-width: 0`-Regel auf `.form-column` ist entfernt. `.wealth-scroll` nutzt `contain: inline-size`, sodass breite Verlaufsinhalte intern scrollen und nicht die intrinsische Spaltenbreite bestimmen. Die Ausgabentabelle behält ihre Mindestbreite von 720 px.
> > - Der horizontale Innenabstand der Balance-Tabbuttons beträgt 8 px. Bestehender Umbruch und Layoutbreakpoint 1250/1251 px bleiben erhalten. Die mobile Drawer-Sonderregel samt Kommentar ist entfernt; bestehende Transformation, Transition und Overlayregeln bleiben unverändert.
> > - Das Datum steht als nicht fokussierbarer `span` neben Capture und Anzahl in `wealth-actions`. ID und `aria-live="polite"` bleiben gleich; der Status bleibt eine separate Region. Datumslogik und Texte werden nicht verändert.
> > - Node-Markuptests prüfen den gemeinsamen Aktionscontainer, eindeutige IDs, Live-Ankündigung und Fokusfolge. Capturetests prüfen aktive/inaktive Erfassung und Speicherfehler ohne Tabaktivierung; der tatsächlich gebundene Clicklistener wird auf allen vier Tabs mit Erfolg, Validierungs-, Write- und Readbackfehlern auf unveränderte Button-/Panelaktivität geprüft. Die Updatefreiheit der bisherigen Tabwechsel bleibt grün.
> > - `Balance wealth history` enthält eine eigene synthetische Layoutfixture mit 24 Ständen und bewusst breiten Eurospalten. Die Messmatrix umfasst 1250, 1251, 1280, 1366, 1440 und 1920 px; nach beobachtetem Idle, Schriftladen, Animationsende und Layoutframes werden Ausgabentabelle, sichtbare Tabellenbreite unter Berücksichtigung der Überlaufvorfahren, Wrapper, Formularspalte, Seite, Tabrechtecke/Textzeilen und Aktionszeile gemessen. Die Toleranz beträgt höchstens 1 CSS-Pixel. Bei 375 px werden Tabs/Capture, interne Scrollregionen und Drawer geschlossen/geöffnet/wieder geschlossen geprüft. Die bestehende Nullstand-/Fokusprüfung bleibt erhalten. Messwerte werden mit `Balance wealth layout SOURCE` als JSON ausgegeben; neue feste Aktionswartezeiten werden nicht eingeführt.
> > - README, Handbuch, technische Referenz, Modulreferenz und Test-README beschreiben die endgültige Darstellung konsistent. Das Handbuch nennt ausdrücklich den ausgeschlossenen Druckverlauf. Druck-CSS und produktive Tabmechanik bleiben unverändert. Die volle Node-Suite gehört dem Orchestrator, das Browsergate der gesteuerten Sitzung vor dem Merge.
>
> ### Gezielte Prüfung durch den Implementierer
>
> | Befehl | Ergebnis |
> |---|---|
> | `node tests/run-single.mjs tests/balance-wealth-history-chart.test.mjs` | Grün, 158 Assertions, Exitcode 0 |
> | `node tests/run-single.mjs tests/balance-wealth-history.test.mjs` | Grün, 714 Assertions, Exitcode 0 |
> | `node tests/run-single.mjs tests/balance-expenses.test.mjs` | Grün, 91 Assertions, Exitcode 0 |
> | `node tests/run-single.mjs tests/balance-smoke.test.mjs` | Grün, 36 Assertions, Exitcode 0 |
> | `node --check tests/browser-smoke.test.mjs` | Grün, Exitcode 0; nur Syntaxnachweis |
> | `node tests/browser-smoke.test.mjs --only='Balance wealth history'` | In der Sandbox nicht ausführbar: `listen EPERM: operation not permitted 127.0.0.1`, Exitcode 1 vor Seitenstart |
> | `git diff --check` | Grün |
>
> Die aus dem Browsertest gelesene Fixture wird vom produktiven `readWealthHistory`-Vertrag mit allen 24 Einträgen akzeptiert. Es liegen keine neuen Browsermesswerte vor; fremde Review-Vorherwerte wurden nicht als Nachweis übernommen. Der Sandboxfehler ist gemäß Projektvertrag kein Stoppgrund und kein grüner Browsernachweis. `npm test` wurde nicht vom Implementierer ausgeführt; die volle Suite folgt durch den Orchestrator auf diesem Stand. Die gesteuerte Sitzung fährt beide gezielten Browserfälle und anschließend `npm run test:browser` vor dem Merge. Ihr Browserbericht muss die tatsächlich ausgegebenen SOURCE-Maße einschließlich der 375-px-Zustände und den lesenden Vergleich mit `main` dokumentieren. Eigenes Prüfurteil oder Freigabe wird nicht erteilt.

## Abweichungen vom Plan

> Keine.

## Verlauf

<!-- audit:history:begin -->
- Runde 1: Umsetzung · Validierung grün · Prüfurteil freigegeben · 0 neu, 0 geschlossen.
<!-- audit:history:end -->

## Befunde

<!-- audit:findings:begin -->
Keine.
<!-- audit:findings:end -->

## Validierung

<!-- audit:validation:begin -->
- Runde 1: `npm test` · grün · Exitcode 0.
<!-- audit:validation:end -->

## Abschlussprüfung

<!-- audit:approval:begin -->
Geprüft:
> Diff im Review-Paket geprüft: Alle 10 Pfade liegen in der Slice-Allowlist. css/balance.css: `min-width: 0` an `.form-column` entfernt, `contain: inline-size` an `.wealth-scroll` ergänzt, Drawer-Mediaregel samt Kommentar gelöscht, `.tab-btn`-Padding auf 10px 8px gesetzt. Damit bestimmt die 720-px-Ausgabentabelle die Mindestbreite der Spalte, während SVG und Verlaufstabelle sie nicht mehr verbreitern. tests/browser-smoke.test.mjs prüft die Matrix 1250–1920 px (Breakpoint, Formularbreite ±1, sichtbare Tabelle ≥720 px, eine Tabzeile, gemeinsame Aktionszeile) sowie bei 375 px Tabs, Capture, Seitenüberlauf, interne Scrollregionen und Drawer; die Messwerte werden als JSON ausgegeben. tests/balance-wealth-history-chart.test.mjs prüft Aktionscontainer, eindeutige IDs, aria-live, fehlendes tabindex und separaten Status. tests/balance-wealth-history.test.mjs belegt über `tabCalls` und `tabState`, dass Capture bei aktivem/inaktivem Verlauf und über den echten Clicklistener auf allen 4 Tabs in den Pfaden Erfolg, write, readback und validation keinen Tab öffnet oder wechselt. Die Statusprüfung zeigt, dass der jeweilige Pfad tatsächlich durchlaufen wird. Die Dokumentation in README, Handbuch, TECHNICAL, Modul- und Test-README ist konsistent. npm test: PASS.

Größtes Restrisiko:
> Aus dem Snapshot nicht entscheidbar, weil das Paket nur Diffs und kein vollständiges CSS enthält: (a) ob die bestehende `.wealth-actions`-Regel Flex mit vertikaler Zentrierung setzt, die die 1-px-Zentrumsprüfung der Desktopzeile verlangt; (b) ob die Druck-CSS die Formularspalte tatsächlich ausblendet, wie es die Doku behauptet; (c) ob der geschlossene Drawer ohne die entfernte Regel bei 375 px Seitenüberlauf erzeugt. Alle drei Punkte erzwingt nur das Browsergate, das nicht Teil von npm test ist und erst die gesteuerte Sitzung vor dem Merge fährt. Kleines Flakerisiko: `manualAsOf` wird aus `new Date()` berechnet, ein Mitternachtswechsel ließe den Test fehlschlagen, aber nicht fälschlich bestehen.

Bruchbedingung:
> Diese Freigabe kippt, wenn `npm run test:browser` im Fall `Balance wealth history` fehlschlägt, insbesondere bei Tabzeile, Aktionszeile, sichtbarer Ausgabentabelle ≥720 px oder 375-px-Überlauf mit geschlossenem Drawer. Sie kippt ebenso, wenn die Druck-CSS die Formularspalte nicht ausblendet und der Verlauf damit gedruckt wird.

Vorab-Risikoanalyse:
> Wenn dieser Slice nach dem Merge scheitert, dann am wahrscheinlichsten so: Bei 1251 px passen die vier Tabtitel trotz 8 px Padding nicht in eine Zeile, oder die fehlende `min-width: 0` lässt die Formularspalte durch andere breite Inhalte wachsen und drückt die Ergebnisspalte. Möglich ist auch, dass der geschlossene Drawer mobil wieder horizontalen Scrollraum erzeugt. Diese Fälle deckt allein der Browserlauf der gesteuerten Sitzung ab; in der Orchestrator-Suite sind sie nicht messbar.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261003-085329.964067Z-5b8857e8c98f`, Arbeitseinheit(en) 4; Nachweise in der Recordkette.
<!-- audit:reference:end -->
