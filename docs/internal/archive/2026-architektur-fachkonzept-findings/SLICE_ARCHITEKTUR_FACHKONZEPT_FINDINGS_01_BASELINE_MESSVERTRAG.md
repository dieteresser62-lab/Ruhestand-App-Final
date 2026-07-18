# Slice Findings 01 – Baseline, Messvertrag und Entscheidungsprotokoll

**Stand:** 2026-07-16<br>
**Status:** implementiert – U-K02 und MIT bestätigt; Slice-Review ausstehend<br>
**Arbeitsplan:**
[`ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md`](ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md)<br>
**Feature-Branch:** `codex/architektur-fachkonzept-korrekturen`<br>
**GitHub-Status:** nur lokal angelegt; Veröffentlichung nicht beauftragt

## Ziel

Slice 1 friert die Ausgangsbasis des Findings-Korrekturvorhabens ein,
definiert einen reproduzierbaren Wortzählvertrag, bestätigt die vorgesehene
Dokumenttopologie und hält die fachlichen Richtungsentscheidungen fest. In
diesem Slice wird weder das Hauptdokument gekürzt noch Laufzeitsemantik
geändert.

## Akzeptanzkriterien

- Ausgangscommit, Branch, Worktree, Dokumentumfang sowie Modul- und
  Testinventar sind reproduzierbar dokumentiert.
- Nenner, Zähler, Ausschlüsse und Tokenregel der Wortzählung sind eindeutig.
- Die Zieltopologie für Hauptdokument und Evidenzregister ist festgelegt.
- PD-01, PD-03 und die autoritative Projektlizenz sind ausdrücklich durch den
  Nutzer entschieden; keine Richtungsfrage wird implizit durch Code gelöst.
- Jeder Folgeslice besitzt einen abgegrenzten voraussichtlichen
  Programmscope unterhalb der Zehn-Dateien-Stop-Schwelle oder ein
  ausdrückliches Stop-Gate.
- Der aktive Branch entspricht dem Arbeitsplan.

## Scope

- dieser Slice und der übergeordnete Korrekturplan;
- rein lesende Erhebung von Git-, Dokument-, Modul- und Testdaten;
- Messvertrag und Entscheidungsmatrix für die Folgeslices.

## Nicht-Scope

- Änderungen an `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`;
- Anlage der beiden Evidenzregister;
- Änderungen an Programm-, Test-, Build- oder Konfigurationsdateien;
- Änderungen an `engine.js`, `dist/` oder `RuheStandSuite.exe`;
- Ausführung oder Vorwegnahme der PD-01-, PD-02-, PD-03- oder
  Lizenzkorrekturen;
- Veröffentlichung, Commit oder Push;
- die vorbestehenden ungetrackten Playwright-Dateien unter `node_modules/`.

## Branch- und Statusnachweis vor dem ersten Codex-Edit

Ausgeführt am 2026-07-16 nach Anlage des vorgeschriebenen Feature-Branches:

- `git branch --show-current`:
  `codex/architektur-fachkonzept-korrekturen`
- `git rev-parse HEAD`:
  `ffdc3cb50088752e76f111c149713c7bb0ca0fe4`
- sicherer Ausgangscommit:
  `docs: Abschluss der Ueberarbeitung von Architektur und Fachkonzept
  (Slices 1-8)`, 2026-07-16 12:00:46 +02:00
- getrackte Voränderung: ausschließlich das von Gemini eingetragene Review in
  `docs/internal/ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md`
- vorbestehend und außerhalb des Auftrags: ungetrackte Playwright-Dateien
  unter `node_modules/`

Die Gemini-Änderung wird erhalten und als Review-Input in den Plan
eingearbeitet. Die ungetrackten Abhängigkeiten werden weder verändert noch in
den Scope aufgenommen.

## Diff-Risiko vor Coding

**Geplante Dateien:**

- `docs/internal/ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md`
- `docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_FINDINGS_01_BASELINE_MESSVERTRAG.md`

**Voraussichtliche Änderungstiefe:**

- klein; ausschließlich Plan- und Slice-Dokumentation

**Gefährdete bestehende Tests:**

- keine Laufzeitsemantik;
- redaktionelles Risiko bei Messvertrag, Dateiinventar und
  Folgeslice-Abgrenzung.

**Nicht anfassen:**

- Hauptdokument und Evidenzrecords;
- alle Programm-, Test-, Build- und generierten Dateien;
- `node_modules/`.

**Rollback-Strategie:**

- bestehende Planänderung gezielt mit
  `git checkout -- docs/internal/ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md`
  zurücksetzen;
- die neue Slice-Datei nur nach ausdrücklicher Nutzerfreigabe entfernen;
- keine destruktiven Git-Kommandos verwenden.

Die Stop-Regel für mehr als zehn Programmdateien greift nicht: Slice 1
verändert null Programmdateien.

## Geplante Validierung

- Branch, Commit und Git-Status erneut prüfen;
- Modul- und Testdateien mit `rg --files` zählen;
- Wortzählung mit dem festgelegten PowerShell-Verfahren wiederholen;
- Zieltopologie und Entscheidungsgates gegen den Arbeitsplan prüfen;
- `git diff --check` ausführen;
- abschließenden Scope-Check dokumentieren.

`npm test` ist für diesen reinen Dokumentationsslice nicht erforderlich. Der
Slice behauptet keine neue Laufzeit- oder Assertion-Baseline.

## Ausgangsbasis

### Commit und Dokument

Die unveränderliche Basis ist Commit
`ffdc3cb50088752e76f111c149713c7bb0ca0fe4`. Das zentrale Architektur- und
Fachkonzept besitzt in diesem Stand 4.995 physische Zeilen. Die Wortmessung
bezieht sich ausschließlich auf diesen Inhalt; Plan- und Slice-Dateien sind
nicht Teil des Nenners.

### Modul- und Testinventar

Ausgeführt im Repository-Root am 2026-07-16:

```powershell
(rg --files app\balance -g '*.js' | Measure-Object).Count
(rg --files app\simulator -g '*.js' | Measure-Object).Count
(rg --files app\profile -g '*.js' | Measure-Object).Count
(rg --files app\tranches -g '*.js' | Measure-Object).Count
(rg --files app\shared -g '*.js' | Measure-Object).Count
(rg --files types -g '*.js' | Measure-Object).Count
(rg --files engine -g '*.mjs' | Measure-Object).Count
(rg --files workers -g '*.js' | Measure-Object).Count
(rg --files tests -g '*.test.mjs' | Measure-Object).Count
```

| Bereich | Filter | Ergebnis |
| --- | --- | ---: |
| `app/balance/` | `*.js` | 36 |
| `app/simulator/` | `*.js` | 95 |
| `app/profile/` | `*.js` | 13 |
| `app/tranches/` | `*.js` | 7 |
| `app/shared/` | `*.js` | 12 |
| `types/` | `*.js` | 3 |
| `engine/` | `*.mjs` | 27 |
| `workers/` | `*.js` | 3 |
| `tests/` | `*.test.mjs` | 107 |

`tests/README.md` trennt weiterhin 106 Testdateien im Node-Standardgate und
`browser-smoke.test.mjs` als separates Browsergate. Die Zahlen sind ein
Dateiinventar, kein neuer Laufzeitnachweis.

## Verbindlicher Wortzählvertrag

### Abgrenzung

- **Nenner:** Text ab der Top-Level-Überschrift `# Übersicht` einschließlich
  dieser Überschrift bis unmittelbar vor
  `# Appendix: Modul-Inventar`.
- **Marktzähler:** Text ab `# Marktvergleich` bis unmittelbar vor
  `# Wissenschaftlicher Rahmen, Quellenkorpus und Tiefeneinordnung`.
- **Forschungszähler:** Text ab
  `# Wissenschaftlicher Rahmen, Quellenkorpus und Tiefeneinordnung` bis
  unmittelbar vor `# Appendix: Modul-Inventar`.
- Überschriften, Fließtext, Listen und Markdown-Tabellen zählen mit.
- Eingezäunte Codeblöcke, reine Linkreferenzdefinitionen und Linkziele/URLs
  zählen nicht; sichtbare Linklabels zählen mit.
- Ein Wort ist ein zusammenhängender Token aus Unicode-Buchstaben oder
  Ziffern. Binnenapostrophe, Unterstriche und Bindestriche verbinden den
  Token, sodass beispielsweise `MKT-PL-01` genau einmal zählt.
- Groß-/Kleinschreibung, Satzzeichen und Markdown-Auszeichnung ändern die
  Zählung nicht.

### Reproduktionsbefehl

Der folgende PowerShell-Block liest ausschließlich das Hauptdokument und
ändert keine Datei:

```powershell
$path = 'docs\reference\ARCHITEKTUR_UND_FACHKONZEPT.md'
$raw = Get-Content -Raw -LiteralPath $path

function Get-HeadingIndex([string]$text, [string]$heading) {
  $match = [regex]::Match(
    $text,
    '(?m)^# ' + [regex]::Escape($heading) + '\r?$'
  )
  if (-not $match.Success) {
    throw "Top-Level-Überschrift fehlt: $heading"
  }
  $match.Index
}

function Get-WordCount([string]$text) {
  $clean = [regex]::Replace(
    $text,
    '(?ms)^[ \t]*```[^\r\n]*\r?\n.*?^[ \t]*```[ \t]*\r?$',
    ''
  )
  $clean = [regex]::Replace(
    $clean,
    '(?m)^\s*\[[^\]]+\]:\s+\S+.*$',
    ''
  )
  $clean = [regex]::Replace($clean, '\]\([^\)\r\n]+\)', ']')
  $clean = [regex]::Replace($clean, '<https?://[^>]+>', '')
  $clean = [regex]::Replace($clean, 'https?://\S+', '')
  ([regex]::Matches(
    $clean,
    "[0-9\p{L}]+(?:[’'_\-][0-9\p{L}]+)*"
  )).Count
}

$overview = Get-HeadingIndex $raw 'Übersicht'
$market = Get-HeadingIndex $raw 'Marktvergleich'
$research = Get-HeadingIndex $raw `
  'Wissenschaftlicher Rahmen, Quellenkorpus und Tiefeneinordnung'
$appendix = Get-HeadingIndex $raw 'Appendix: Modul-Inventar'

$denominator = Get-WordCount $raw.Substring(
  $overview,
  $appendix - $overview
)
$marketWords = Get-WordCount $raw.Substring(
  $market,
  $research - $market
)
$researchWords = Get-WordCount $raw.Substring(
  $research,
  $appendix - $research
)
$combined = $marketWords + $researchWords

[pscustomobject]@{
  Denominator = $denominator
  Market = $marketWords
  Research = $researchWords
  Combined = $combined
  CombinedPct = [math]::Round(100 * $combined / $denominator, 2)
  MarketPct = [math]::Round(100 * $marketWords / $denominator, 2)
  ResearchPct = [math]::Round(100 * $researchWords / $denominator, 2)
  ResearchMinusMarket = $researchWords - $marketWords
}
```

### Baseline-Ergebnis

| Messgröße | Wörter | Anteil am Nenner |
| --- | ---: | ---: |
| Nenner | 34.582 | 100,00 % |
| Markt | 8.860 | 25,62 % |
| Forschung | 7.842 | 22,68 % |
| Markt und Forschung | 16.702 | 48,30 % |

Der Forschungsblock ist aktuell 1.018 Wörter kleiner als der Marktblock. Die
Baseline verfehlt damit beide Zielbedingungen deutlich. Da die Auslagerung
auch den Nenner verändert, werden für Slice 2 und 3 keine statischen
Zielwortzahlen festgeschrieben. Maßgeblich bleibt die erneute dynamische
Messung: zusammen 20 bis 25 % des dann aktuellen Nenners und Forschung größer
als Markt.

Die früher dokumentierten Näherungswerte 9.224 beziehungsweise 8.317 Wörter
stammen nicht aus diesem präzisierten Ausschlussvertrag. Sie bleiben als
historischer Befund nachvollziehbar, werden aber nicht als Baseline der
Korrekturslices weiterverwendet.

## Bestätigte Dokumenttopologie

1. `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` bleibt als eigenständig
   verständliches Hauptdokument bestehen. Es behält Methodik, zentrale
   Befunde, Positionierung, Modellgrenzen und Risikoregister.
2. Die vollständigen 69 MKT-Records wechseln in den normativen Beleganhang
   `docs/reference/MARKTVERGLEICH_EVIDENZREGISTER.md`.
3. Die vollständigen 55 FOR-Records und ausführlichen Mechanismusdossiers
   wechseln in
   `docs/reference/FORSCHUNGSABGLEICH_EVIDENZREGISTER.md`.
4. Hauptdokument und Register verlinken sich bidirektional über stabile
   Anker. Die Register sind normative Referenzen, keine Archive.
5. MKT-, FOR-, MAP-, FR-, FQ-, MR-, PD- und GAP-IDs bleiben eindeutig und
   vollständig auflösbar. Eine bloße Kürzung ohne erhaltene Ownership ist
   ausgeschlossen.

Diese Topologie entspricht der von Gemini ohne Blocker freigegebenen und vom
Nutzer mit dem Slice-01-Auftrag bestätigten Planrichtung. Der Nutzer hat den
Messvertrag und die Topologie am 2026-07-16 mit U-K02 freigegeben.

## Entscheidungsprotokoll

| Gegenstand | Entscheidung | Status / Folge |
| --- | --- | --- |
| U-K01 Korrekturplan | Gemini ohne Blocker freigegeben; Nutzer hat Slice 01 beauftragt | erledigt am 2026-07-16 |
| PD-01 / U-K06 | Route A: `jahresentnahme_real` bleibt echter Realwert; kumulierter Inflationsfaktor wird korrekt fortgeschrieben | Route bestätigt; zulässige Delta-Klassen und Baseline müssen vor Slice 6 festgelegt werden |
| PD-03 / U-K08 | reine Label-/Beschreibungskorrektur; technischer Key und Aggregation bleiben unverändert | Route bestätigt am 2026-07-16 |
| Lizenz / U-K05 | MIT ist die autoritative Projektlizenz | bestätigt am 2026-07-16; für Slice 5 verbindlich |
| PD-02 / U-K07 | Prozentwerte werden gespeichert/angezeigt und genau einmal in-memory auf ein Verhältnis normalisiert | Planvertrag; Nutzer-/Reviewer-Gate vor oder mit Slice 7 bleibt offen |

PD-01 Route A autorisiert noch keine konkrete Engine- oder
Spending-Semantikänderung außerhalb des beschriebenen Realwertvertrags. Vor
Slice 6 müssen Baseline, erwartete Delta-Klassen und der genaue
State-/Worker-Vertrag in der Slice-Datei dokumentiert werden.

## Programmscope der Folgeslices

Die Tabelle ist eine Obergrenzen- und Stop-Gate-Planung, keine Vorabfreigabe
für Dateien ohne späteren Datenflussnachweis.

| Slice | Voraussichtliche Programm-/Konfigurationsdateien | Obergrenze | Stop-Gate |
| ---: | --- | ---: | --- |
| 2 | keine; Hauptdokument, Marktregister, Plan und Slice-MD | 0 | bei Verlust oder Mehrdeutigkeit einer MKT-ID stoppen |
| 3 | keine; Hauptdokument, Forschungsregister, Plan und Slice-MD | 0 | bei Verlust oder Mehrdeutigkeit einer FOR-/MAP-/FR-/FQ-ID stoppen |
| 4 | `scripts/check-architecture-evidence.mjs`, eine gezielte Testdatei, `package.json`, optional Root-Metadatum in `package-lock.json` | 4 | kein Netzwerk; mehr als vier Dateien oder Dependency-Diff stoppen |
| 5 | `package.json`, Root-Lizenzfeld in `package-lock.json`, `src-tauri/Cargo.toml`, optional eine Metadaten-Testdatei | 4 | U-K05 ist erteilt; jeder Dependency-/Versions-Diff stoppt |
| 6 | `app/simulator/simulator-engine-direct.js`, `app/simulator/simulator-year-result.js` sowie nachgewiesene direkte State-/KPI-Consumer und fokussierte Headless-, Backtest-, MC-, Optimizer- und Worker-Paritätstests | 10 | vor Edit exakte Dateiliste; elfte Datei, unerwartete Deltas oder Worker-Abweichung stoppen |
| 7 | drei benannte Care-/Input-Module plus fokussierte Input-, Care- und Worker-/Runner-Tests | 8 | Persistenzschemaänderung, doppelte Skalierung oder neunte Datei stoppen |
| 8 | `app/simulator/results-metrics.js` und eine fokussierte KPI-/UI-Testdatei; Dokumentation separat | 2 | jede Änderung von Key, Aggregation oder Optimizervertrag stoppen |
| 9 | keine Produktdatei; interner Forschungsvalidierungs-Backlog, Plan und Slice-MD | 0 | jedes Folgepaket über zehn Dateien wird eigenes Arbeitsdokument |
| 10 | keine neue Produktdatei vorgesehen; nur bereits geänderte Dateien validieren und Dokumentation integrieren | 0 neue | unerwartete Datei, rotes Gate oder unauflösbare ID stoppt |

Die breite Trefferliste einzelner Suchbegriffe ist nicht automatisch Scope.
Insbesondere darf Slice 6 erst nach einem Datenflussnachweis festlegen, welche
der Consumer tatsächlich editiert werden. So bleibt die Stop-Schwelle vor dem
ersten Code-Edit überprüfbar.

## Durchgeführte Änderungen

- lokaler Feature-Branch angelegt und sicherer Ausgangscommit bestätigt;
- Gemini-Findings in den Arbeitsplan eingearbeitet;
- Planstatus und Freigabepunkte auf den extern bestätigten Stand gebracht;
- reproduzierbare Dokument-, Modul- und Testbaseline erfasst;
- Wortzählvertrag und Zieltopologie festgelegt;
- PD-01 Route A und PD-03 Labelroute dokumentiert;
- MIT als autoritative Projektlizenz und U-K02 dokumentiert;
- Programmscope und Stop-Gates der Slices 2 bis 10 abgegrenzt.

## Ausgeführte Validierung

| Prüfung | Ergebnis |
| --- | --- |
| Branch und Commit | bestanden: `codex/architektur-fachkonzept-korrekturen` auf `ffdc3cb50088752e76f111c149713c7bb0ca0fe4` |
| Modul-/Testinventar | bestanden: 36 / 95 / 13 / 7 / 12 / 3 / 27 / 3 / 107 gemäß Baseline-Tabelle |
| Wortzählung wiederholt | bestanden: Nenner 34.582, Markt 8.860, Forschung 7.842, zusammen 16.702 beziehungsweise 48,30 % |
| Größenrelation | bestätigt: Forschung aktuell 1.018 Wörter kleiner als Markt |
| Plan-/Slice-Verlinkung | bestanden: je ein auflösbarer relativer Link in beide Richtungen |
| `git diff --check` | ohne Befund |
| zusätzliche Prüfung auf nachgestellte Leerzeichen in beiden Scope-Dateien | ohne Befund |
| Programmdateien im Slice-Diff | 0; Stop-Schwelle eingehalten |
| Scope-Check | nur Arbeitsplan und neue Slice-MD; vorbestehende ungetrackte Playwright-Dateien bleiben außerhalb des Auftrags |

`npm test` und das Browsergate wurden nicht ausgeführt. Der Slice ändert
ausschließlich Markdown, behauptet keine neue Laufzeitbaseline und berührt
keinen Laufzeitvertrag.

## Abweichungen vom Plan

- U-K05 wurde nach der initialen Baseline am 2026-07-16 als MIT entschieden.
  Slice 5 darf damit beginnen, ändert in Slice 1 aber noch keine Metadaten.
- U-K06 ist nur hinsichtlich Route A entschieden. Die konkrete
  Delta-Baseline bleibt bewusst Aufgabe vor dem ersten Slice-6-Codeedit.
- Es wurde kein read-only Script angelegt, weil der dokumentierte
  PowerShell-Block den Messvertrag ohne zusätzliche Programmdatei
  reproduzierbar erfüllt.

## Offene Risiken

- Der Wortzählvertrag misst Umfang, nicht Informationsqualität. Die Slices 2
  und 3 dürfen den Zielkorridor nicht durch Verlust zentraler Aussagegrenzen
  erzwingen.
- Die Consumer-Treffer für PD-01 sind breiter als der voraussichtliche
  Edit-Scope. Slice 6 benötigt deshalb einen erneuten Datenfluss- und
  Zehn-Dateien-Check.
- Der lokale Branch ist nicht veröffentlicht; dies ist dokumentiert und kein
  Implementierungsblocker ohne Push-Auftrag.

## Rückdokumentation in den Arbeitsplan

Der Arbeitsplan enthält den Slice-Link, den lokalen Branchstatus, die
eingearbeiteten Gemini-Findings, die bestätigten PD-01-/PD-03-Routen und den
Status von Slice 1. U-K02 und MIT/U-K05 sind dort mit Datum final
zurückdokumentiert.

## Freigabestatus

- Implementierung durch Codex: abgeschlossen; keine Eigenfreigabe
- U-K02 Dokumenttopologie und Messvertrag: freigegeben am 2026-07-16
- Lizenzentscheidung U-K05: MIT bestätigt am 2026-07-16
- Review der Slice-Implementierung: ausstehend
- lokaler Commit: nicht durch Codex; erst nach positivem Review und
  Nutzerfreigabe
- Push: nicht beauftragt

## Review-Feedback von Gemini

### 1. Prüfdimensionen & Befunde

1. **Korrektheit:** Die Bestandsaufnahmen (Baseline-Commit `ffdc3cb`, Branch `codex/architektur-fachkonzept-korrekturen`, Modul- und Testzahlen) wurden vollständig und korrekt dokumentiert.
2. **Vertragstreue:** Der Wortzählvertrag und der PowerShell-Messalgorithmus wurden präzise operationalisiert. Die Zählungen (Nenner 34.582, Combined 48,30 %) sind mathematisch korrekt.
3. **Fehlerbehandlung:** Keine Laufzeitsemantik betroffen. Die Stop-Gates und Scopes der Slices 2 bis 10 wurden klar und defensiv definiert.
4. **Seiteneffekte:** Keine ungewollten Dateimutationen. Der Diff enthält ausschließlich die geplante MD-Änderung des Plans und die neue Slice-MD.
5. **Was könnte brechen?** Die PowerShell-Regex ist syntaktisch empfindlich gegenüber Markdown-Strukturänderungen (z. B. Einrückungen bei Codeblöcken). Dies ist bei der künftigen Befehlsausführung im Blick zu behalten, stellt jedoch kein unmittelbares Risiko dar.

### 2. Pre-Mortem
Angenommen, diese Implementierung (Slice 1) verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- *Ursache:* Das Word-Counting-Verfahren in PowerShell wird bei künftigen Dokumenten-Edits nicht mehr ausgeführt oder manuell manipuliert, wodurch das Hauptdokument unbemerkt wieder in ein unbalanciertes Verhältnis driftet (z. B. Marktblock wächst wieder über 25 %), da die Überprüfung nicht in ein automatisches Testgate integriert wurde.

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - *PowerShell-Syntaxtreue:* Abhängigkeit des Zählskripts von einheitlicher Markdown-Syntax.
- Pre-Mortem: (Siehe oben – mangelnde Automatisierung des Zählschritts führt zu schleichendem Doku-Drift).

## Review-Feedback von Claude

Optional und ausstehend.

## Review-Antworten von Codex

Werden nach konkretem Slice-Feedback ergänzt. Codex erteilt keine
Eigenfreigabe.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U-K01 | Nutzer/Gemini | Korrekturplan | freigegeben | im Plan dokumentiert |
| U-K06 | Nutzer | PD-01 Route | Route A | für Slice 6 vorgemerkt |
| U-K08 | Nutzer | PD-03 Route | Labelkorrektur | für Slice 8 vorgemerkt |
| U-K05 | Nutzer | autoritative Lizenz | MIT | für Slice 5 verbindlich |
| U-K02 | Nutzer | Topologie und Messvertrag | freigegeben | erledigt am 2026-07-16 |
