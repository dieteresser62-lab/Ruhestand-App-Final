# Balance-Diagnose-UX-Slice

Status: umgesetzt
Datum: 2026-04-26

## Anlass

Die fachliche Balance-Logik wirkt reif und handlungsorientiert. Die naechste Qualitaetsstufe liegt nicht primaer in neuen Berechnungen, sondern in besserer Erklaerbarkeit:

- Warum wird eine Aktion vorgeschlagen?
- Warum wird eine naheliegende Aktion nicht vorgeschlagen?
- Welche Werte sind Mindestbedarf, freigegebener Rahmen, konkrete Empfehlung und effektive Umsetzung?
- Welche Guardrail hat eine Aktion ausgeloest, verhindert oder nur beobachtet?

Ziel ist ein kompakter UX-/Diagnose-Slice, der Vertrauen schafft, ohne die bestehende Kernlogik unnoetig umzubauen.

## Ausgangsbefund

### Staerken

- Die UI liefert konkrete Handlungsanweisungen statt nur Kennzahlen.
- Runway, Liquiditaet, Guardrails und Transaktionsvorschlaege sind prominent sichtbar.
- Steuer- und Tranchenlogik sind fuer grosse ETF-Bestaende wertvoll und nachvollziehbar.
- Die Diagnose macht Entscheidungswege sichtbar und ist damit ein wichtiger Vertrauensanker.

### Risiken

- Einzelne Begriffe koennen wie Blackbox oder Handlungszwang wirken.
- Nicht ausgefuehrte Zielaktionen, z.B. Gold-Ziel ohne Goldkauf, koennen wie Fehler erscheinen.
- Grenzwertfarben koennen pedantisch wirken, wenn der Text die Logik nicht erklaert.
- VPW-/Flex-Begriffe koennen missverstaendlich sein, wenn Rahmen, Bedarf und Empfehlung vermischt werden.

## Zielbild

Die Balance-App soll nicht nur sagen, was zu tun ist, sondern auch kurz erklaeren:

- was empfohlen wird,
- warum es empfohlen wird,
- was bewusst nicht empfohlen wird,
- welche Regel oder Guardrail dafuer verantwortlich ist,
- ob ein Wert Mindestbedarf, erlaubter Rahmen oder konkrete Empfehlung ist.

## Scope

### In Scope

- Diagnose-Labels und UI-Texte im Balance-Tool.
- Guardrail-Erklaertexte fuer Grenzfaelle.
- Hinweise fuer nicht ausgefuehrte Zielaktionen.
- Strukturierung von Entnahme- und Transaktionsbegriffen.
- Tests fuer neue Diagnose-/Renderer-Hilfen, falls Logik ausgelagert oder erweitert wird.

### Out of Scope

- Aenderung der fachlichen Entnahmeberechnung.
- Aenderung der Steuerlogik oder Tranchenverkaufsreihenfolge.
- Aenderung der Engine-Contracts, ausser sie wird fuer saubere Diagnosefelder zwingend noetig.
- Redesign der gesamten Balance-Oberflaeche.

## Vorgeschlagene Aktivitaeten

### 1. Diagnose-Begriff entschaerfen

Prioritaet: P0

Problem:

Der Begriff `KI-Diagnose` kann im Finanzkontext Blackbox-Erwartungen wecken, obwohl die App regelbasiert und nachvollziehbar arbeitet.

Vorschlag:

- UI-Label von `KI-Diagnose` auf `Entscheidungsdiagnose` umstellen.
- Alternativen: `Regel-Diagnose`, `Strategie-Diagnose`, `Warum diese Vorschlaege?`
- Favorit: `Entscheidungsdiagnose`, weil der Begriff fachlich neutral und pruefbar wirkt.

Akzeptanzkriterien:

- In der Balance-UI erscheint kein primärer Diagnose-Titel `KI-Diagnose` mehr.
- Die neue Bezeichnung macht klar, dass Regeln und Entscheidungslogik erklaert werden.
- Keine fachliche Logik wird geaendert.

### 2. Gold-/Asset-Zielabweichungen erklaeren

Prioritaet: P0

Problem:

Wenn ein Gold-Mindestbestand oder ein anderes Ziel angezeigt wird, aber keine passende Transaktion vorgeschlagen wird, wirkt das fuer Nutzer wie ein Widerspruch.

Vorschlag:

- Diagnose-Hinweis einfuehren: `Warum kein Goldkauf?`
- Analog fuer andere Zielabweichungen nutzbar halten: Aktien, Bonds, Liquiditaet.
- Ursache kurz benennen, z.B.:
  - Rebalancing-Band nicht verletzt.
  - Mindestkaufbetrag nicht erreicht.
  - Liquiditaetsziel hat Vorrang.
  - Steuer-/Tranchenlogik priorisiert andere Verwendung.
  - Ziel ist ein Beobachtungswert, kein sofortiger Kaufauftrag.

Akzeptanzkriterien:

- Wenn ein Zielwert sichtbar ist, aber keine Aktion daraus folgt, gibt es einen kurzen Diagnosegrund.
- Der Hinweis ist regelbasiert und kommt aus vorhandenen Entscheidungsdaten, nicht aus freiem Text-Raten.
- Bestehende Transaktionsvorschlaege bleiben unveraendert.

### 3. Guardrail-Grenzfaelle besser texten

Prioritaet: P0

Problem:

Eine orange Warnung bei exakt erreichter Schwelle wirkt ohne Erklaerung willkuerlich oder pingelig.

Vorschlag:

- Grenzwerttexte expliziter machen:
  - `Exakt auf Mindestniveau`
  - `Knapp ueber Mindestniveau`
  - `Unter Sicherheitsabstand`
- Pruefen, ob Ampellogik fachlich `>= Schwelle` als gruen behandeln soll oder ob Orange fuer fehlenden Puffer bewusst gewollt ist.
- Falls Orange fachlich gewollt ist: Erklaertext statt Logikaenderung.

Akzeptanzkriterien:

- Nutzer erkennt, ob Orange ein echter Mangel oder ein fehlender Sicherheitsabstand ist.
- Schwellenlogik ist in Text und Farbe konsistent.
- Tests decken mindestens den Grenzfall `Wert == Schwelle` ab, falls die Statuslogik angepasst wird.

### 4. VPW-/Flex-Begriffe sauber trennen

Prioritaet: P0

Problem:

`VPW-Flex abgeleitet` kann missverstaendlich wirken, wenn VPW-Total, Floor, sichere Einkuenfte und Gesamtentnahme optisch nah beieinander liegen.

Vorschlag:

Die Diagnose sollte klar zwischen diesen Groessen unterscheiden:

- `Floor gesamt`: Pflichtausgaben.
- `Floor aus Depot`: Pflichtausgaben minus sichere Einkuenfte.
- `VPW-Rahmen`: aus Vermoegen, Renditeannahme und Resthorizont berechneter Entnahmerahmen.
- `Flex freigegeben`: zusaetzlicher Spielraum nach Floor/Guardrails.
- `Geplante Entnahme`: Strategie- oder Bedarfsgroesse vor Begrenzungen.
- `Empfohlene Entnahme`: konkrete Handlungsempfehlung.
- `Effektive Entnahme`: nach Liquiditaets-/Steuer-/Transaktionslogik umgesetzter Betrag.

Akzeptanzkriterien:

- Hohe VPW-Werte erscheinen nicht als automatischer Konsumauftrag.
- Diagnose unterscheidet Rahmen, Bedarf und konkrete Empfehlung.
- Bestehende Zahlen bleiben rechnerisch unveraendert, nur Benennung/Erklaerung wird verbessert.

### 5. Transaktionen nach Zweck gruppieren

Prioritaet: P1

Problem:

Quellen und Verwendungen sind bereits konkret, aber Nutzer koennen den Gesamtplan schneller erfassen, wenn Transaktionen zusaetzlich nach Zweck gruppiert werden.

Vorschlag:

Zusaetzliche Zweck-Zusammenfassung oberhalb oder unterhalb der Transaktionen:

- Liquiditaet auffuellen.
- Bonds/Zieltopf aufbauen.
- Aktienquote herstellen.
- Steuerzahlung.
- Rest/Puffer.

Akzeptanzkriterien:

- Bestehende Detailtransaktionen bleiben sichtbar.
- Zweck-Zusammenfassung ist rein aggregierend und aendert keine Buchungslogik.
- Differenz zwischen Quellen und Verwendungen bleibt pruefbar.

### 6. Empfohlen vs. erlaubt trennen

Prioritaet: P1

Problem:

Bei Dynamic Flex kann ein hoher freigegebener Rahmen als direkte Konsumempfehlung missverstanden werden.

Vorschlag:

Explizite Darstellung:

- Geplante Entnahme.
- Maximal freigegebener Rahmen.
- Tatsaechlich empfohlene Entnahme.
- Nicht genutzter Spielraum.

Akzeptanzkriterien:

- Nutzer sieht klar, ob ein Betrag ein Limit, ein Planwert oder eine Empfehlung ist.
- Dynamic-Flex-Diagnose bleibt mit Monte-Carlo-/Backtest-Log-Begriffen konsistent.

## Reihenfolge

1. Diagnose-Label umbenennen.
2. Guardrail-Grenzfalltexte klaeren.
3. Gold-/Asset-`Warum nicht?`-Hinweise einfuehren.
4. VPW-/Flex-Begriffe trennen.
5. Transaktionen nach Zweck aggregieren.
6. Empfohlen-vs-erlaubt-Darstellung ergaenzen.

## Wahrscheinliche betroffene Dateien

Noch zu verifizieren:

- `Balance.html`
- `app/balance/balance-renderer*.js`
- `app/balance/balance-diagnosis*.js`
- `app/balance/balance-action-postprocessor.js`
- `app/balance/balance-update-pipeline.js`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `Handbuch.html`, falls Nutzerbegriffe sichtbar geaendert werden.

## Testplan

Pflicht bei Codeaenderungen:

- Fokussierte Tests fuer betroffene Balance-/Diagnose-Helfer, falls vorhanden oder neu anzulegen.
- `npm test`, weil Balance-Diagnose/Renderer an gemeinsam genutzte Entscheidungs- und Darstellungskontrakte angrenzen kann.
- `git diff --check`

Bei reinen Doku-/Textaenderungen:

- `git diff --check`

## Offene Pruefpunkte vor Umsetzung

- Existiert `KI-Diagnose` nur als UI-Label oder auch in Tests/Doku? Ergebnis: UI-Label und Copy-Export wurden auf `Entscheidungsdiagnose` umgestellt.
- Wo wird die Guardrail-Ampellogik fuer `Budget-Floor Deckung` berechnet? Ergebnis: UI-Normalisierung in `balance-diagnosis-format.js`; exakt erfuellte Mindestschwellen sind jetzt `ok` mit Hinweistext.
- Gibt es bereits interne Diagnosegruende fuer Gold-/Asset-Nichtaktionen, oder muessen sie aus Action-/Guardrail-Daten abgeleitet werden? Ergebnis: Gold-Zielwerte wurden in `transactionDiagnostics.goldThresholds` ergaenzt; UI leitet daraus `Warum kein Goldkauf?` ab.
- Werden VPW-/Flex-Werte in Balance direkt aus Engine-Diagnose oder aus UI-Postprocessing dargestellt? Ergebnis: `balance-diagnosis-keyparams.js` nutzt vorhandene VPW-Felder und benennt sie als Rahmen/Flex/ungenutzten Spielraum.
- Soll Orange bei `Wert == Schwelle` fachlich erhalten bleiben oder in Gruen uebergehen? Ergebnis: `Wert == Schwelle` ist gruen/`ok`; knappe Sicherheitsabstaende bleiben `warn`.

## Umsetzung 2026-04-26

Umgesetzt:

- `KI-Diagnose` in UI und Copy-Export durch `Entscheidungsdiagnose` ersetzt.
- Guardrail-Grenzfalltexte eingefuehrt: exakt erfuellte Mindestwerte werden als `ok` mit Hinweis `Exakt auf Mindestniveau` angezeigt.
- Gold-`Warum nicht?`-Karte in der Transaktionsdiagnostik eingefuehrt, wenn Gold-Ziele sichtbar sind, aber kein Goldkauf vorgeschlagen wird.
- Dynamic-Flex-Begriffe in der Diagnose geschaerft: `VPW-Rahmen`, `Statischer Flex-Bedarf`, `Flex freigegeben`, `Nicht genutzter Rahmen`.
- Handlungskarte um `Plan nach Zweck` ergaenzt.
- `transactionDiagnostics.goldThresholds` enthaelt jetzt auch aktuellen Goldwert und Zielwert, damit die UI erklaeren kann, warum kein Goldkauf erfolgt.

Tests/Validierung:

- `node --check` fuer geaenderte Balance- und Engine-Module.
- `node tests/run-single.mjs tests/balance-diagnosis-format.test.mjs`
- `node tests/run-single.mjs tests/balance-diagnosis-transaction.test.mjs`
- `node tests/run-single.mjs tests/balance-diagnosis-keyparams.test.mjs`
- `node tests/run-single.mjs tests/balance-renderer-action.test.mjs`
- `node tests/run-single.mjs tests/balance-diagnosis-guardrails.test.mjs`
- `node tests/run-single.mjs tests/transaction-gold-liquidity.test.mjs`
- `node tests/run-single.mjs tests/transaction-engine-rebal.test.mjs`
- `npm run build:engine`
- `npm test` bestanden: 70 Testdateien, 1346 Assertions, 0 Fehler.
