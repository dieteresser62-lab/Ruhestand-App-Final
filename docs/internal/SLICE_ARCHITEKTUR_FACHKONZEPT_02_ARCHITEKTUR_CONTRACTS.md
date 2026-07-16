# Slice 2: Architekturstand und Härtungs-Contracts

**Stand:** 2026-07-15

**Status:** durch den Nutzer freigegeben

**Feature-Branch:** `codex/architektur-fachkonzept-doku`

**GitHub-Status:** Branch nur lokal; Veröffentlichung und Push nicht beauftragt

**Übergeordneter Plan:**
[`ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md`](ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md)

**Primäres Zieldokument:**
[`docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`](../reference/ARCHITEKTUR_UND_FACHKONZEPT.md)

## Auftrag und Freigabegrundlage

Der Nutzer hat Slice 2 am 2026-07-15 mit „Implemtiere slice 2 des Doku
Projekt“ separat beauftragt. Die Zielgliederung und der Scope der Folgeslices
wurden zuvor mit U-02 freigegeben. Für diesen dokumentationsreinen Auftrag gilt
die im Arbeitsplan festgehaltene Prozessentscheidung: Nutzerfreigaben ersetzen
Gemini-/Claude-Reviews; Codex implementiert und dokumentiert, erteilt aber
keine Eigenfreigabe und erstellt keinen Git-Commit.

## Ziel

Den seit dem letzten vollständigen Dokumentabgleich nachgezogenen
Architekturstand als kohärentes Systembild dokumentieren. Im Mittelpunkt stehen
Ownership-, Daten-, Fehler-, Persistenz- und Jahresworkflow-Verträge zwischen
Balance, Simulator, Engine, Profilverbund, Tranchen und Tauri. Die Beschreibung
muss Implementierungsstand, Fallback, Fail-safe und Fail-closed sauber trennen,
ohne neue Laufzeitsemantik zu erfinden.

## Akzeptanzkriterien

- Drei-Schichten- und Laufzeitarchitektur entsprechen dem aktuellen Repository.
- Engine-Eingabe-, Ergebnis-, Settlement- und Fehlerverträge sind konsistent
  und nennen ihre Validierungs- beziehungsweise Fehlergrenzen.
- Der periodengebundene Balance-Jahresprozess ist als Zustandsfolge von
  Vorprüfung bis Abschluss oder Recovery dokumentiert.
- Persistenz, Import-Recovery, Korruptionsbehandlung und Tauri-Quarantäne sind
  als zusammenhängender Recovery-Vertrag erklärt.
- Profilverbund-Attribution, profilbezogenes Steuer-Settlement und
  Haushalts-Reconciliation sind mit eindeutigen Ownership-Grenzen beschrieben.
- Kanonischer Tranchenvertrag, Provenienz, Schreibgrenzen und bestätigter
  Realbestandsabgleich sind integriert.
- Live-Daten, Stichtage, Fallbacks und Provenienz werden nicht vermischt.
- Plattformstatus unterscheidet „buildbar“, „validiert“ und „ausgeliefert“.
- Datenschutz- und Netzwerkgrenzen sind nachweisbar und nicht absoluter als
  die Implementierung.
- Betroffene Referenzdokumente widersprechen dem Hauptdokument nicht.
- Keine Programm-, Test-, Build- oder generierte Datei wird geändert.

## Scope

### Primärer Scope

- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- diese Slice-MD
- Rückdokumentation im übergeordneten Arbeitsplan

### Bedingter Konsistenz-Scope

Folgende Referenzen werden gelesen und nur bei einem nachgewiesenen
Widerspruch geändert:

- `docs/reference/TECHNICAL.md`
- `docs/reference/DATA_SOURCES.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `docs/reference/TRANCHEN_MODULES_README.md`
- `engine/README.md`
- `tests/README.md`
- `README.md` bei einem nachgewiesenen Plattform-, Offline- oder
  Datenschutzwiderspruch

### Nicht-Scope

- Änderungen an Laufzeit-, Test-, Build- oder Konfigurationscode;
- Änderungen an Engine-Semantik, Datenverträgen oder öffentlichen APIs;
- manuelle Änderungen an `engine.js`, `dist/` oder `RuhestandSuite.exe`;
- neue Produkt-, Markt- oder wissenschaftliche Behauptungen aus den späteren
  Slices;
- Commit, Push oder Veröffentlichung des Branches.

## Branch- und Git-Status vor Start

Ausgeführt am 2026-07-15 vor dem ersten Slice-2-Edit:

```text
git branch --show-current
codex/architektur-fachkonzept-doku

git status --short
 M docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md
 M engine/README.md
?? docs/internal/ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md
?? docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_01_BESTAND_STRUKTUR.md
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
```

Die beiden geänderten und die beiden dokumentationsbezogenen ungetrackten
Dateien stammen aus dem freigegebenen Slice 1. Die Playwright-Dateien waren
bereits vor dem Dokumentationsprojekt ungetrackt, gehören nicht zum Auftrag
und bleiben unverändert. Slice 1 ist durch den Nutzer freigegeben, aber noch
nicht committed; der Arbeitsplan weist Commit und Push ausdrücklich als
separate Nutzerentscheidung U-09 aus.

## Diff-Risiko vor Umsetzung

**Geplante Dateien:**

- `docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_02_ARCHITEKTUR_CONTRACTS.md`
  (neu)
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/internal/ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md`
- weitere Markdown-Referenzen nur nach dokumentiertem Konsistenzbefund

**Voraussichtliche Änderungstiefe:**

- mittel; umfangreiche redaktionelle Konsolidierung bestehender
  Implementierungsverträge, aber keine Änderung der Laufzeitsemantik

**Gefährdete bestehende Tests:**

- keine Laufzeittests;
- gefährdet sind Markdown-Anker, relative Links, Überschriftenhierarchie,
  Zustands- und Contract-Konsistenz sowie die Abgrenzung von Slice 1.

**Nicht anfassen:**

- alle Programm-, Test-, Build- und generierten Dateien;
- fachliche Kapitel, Marktvergleich und Forschungsabgleich außerhalb
  notwendiger Querverweise;
- die vorbestehenden ungetrackten Playwright-Dateien unter `node_modules/`.

**Rollback-Strategie:**

- Für zusätzliche Slice-2-Änderungen an bereits getrackten Dateien:
  `git checkout -- <datei>`; wegen der überlappenden, uncommitteten
  Slice-1-Änderungen darf dies nur nach vorheriger Diff-Trennung erfolgen.
- Die neue Slice-2-Datei nur nach ausdrücklicher Nutzerfreigabe entfernen.
- Arbeitsplan und Hauptdokument werden anhand des dokumentierten Slice-2-Diffs
  getrennt von den bereits vorhandenen Slice-1-Änderungen zurückgeführt.

## Geplante Quellenprüfung

- Laufzeit- und Schichtenarchitektur: HTML-Einstiegspunkte, Binder,
  UI-Module, `engine/`, Worker und Tauri-Konfiguration.
- Engine-Verträge: `engine/README.md`, öffentliche Engine-Module und
  Contract-/Negative-Tests.
- Jahresworkflow und Recovery: Balance-Annual-, Storage-, Persistence- und
  Snapshot-Module samt zugehörigen Tests.
- Profilverbund: Profil-, Allokations-, Steuer- und
  Haushalts-Reconciliation-Module samt Tests.
- Tranchen: kanonischer Contract unter `types/`, Manager-, Status-,
  Provenienz- und Reconciliation-Module samt Tests.
- Marktdaten und Plattformgrenzen: Datenquellenreferenz, Provider,
  Tauri-Kommandos, Berechtigungen und Release-Dokumentation.

### Durchgeführter Source-of-Truth-Abgleich

Die Architekturbehauptungen wurden nicht aus archivierten Plänen übernommen,
sondern gegen folgende aktuelle Implementierungs- und Contractquellen geprüft:

| Vertragsbereich | Primäre Implementierungsquellen | Ergänzende Contract-/Referenzquellen |
| --- | --- | --- |
| Laufzeit, Schichten und Ownership | HTML-Einstiege, `app/balance/`, `app/simulator/`, `engine/`, `workers/`, `app/shared/persistence-facade.js`, `src-tauri/tauri.conf.json`, `src-tauri/src/lib.rs` | `package.json`, `docs/reference/TECHNICAL.md`, Modul-READMEs |
| Engine-Input, Ergebnis und Fehler | `engine/core.mjs`, `engine/errors.mjs`, `engine/validators/InputValidator.mjs` | `engine/README.md`, `tests/core-negative-contracts.test.mjs`, `tests/core-engine.test.mjs` |
| Settlement und Cash-Reconciliation | `engine/tax-settlement.mjs`, Settlementbereich in `engine/core.mjs`, `app/simulator/simulator-tax-recompute.js` | `tests/tax-settlement.test.mjs`, `tests/core-tax-settlement.test.mjs`, `tests/core-negative-contracts.test.mjs` |
| Jahresperiode und Recovery | `balance-annual-period.js`, `balance-binder-snapshots.js`, `balance-annual-orchestrator.js`, Annual-Live-Datenmodule | `balance-annual-*.test.mjs`, `tests/balance-annual-workflow-contract.test.mjs`, `tests/balance-binder-snapshots.test.mjs` |
| Persistenz, Import und Korruption | `app/shared/persistence-*`, `app/shared/snapshot-archive.js`, `balance-binder-imports.js`, `balance-expenses-storage.js`, Tauri-Persistenzkommandos | `tests/persistence.test.mjs`, `tests/snapshot-archive.test.mjs`, `tests/balance-storage-contract.test.mjs` |
| Profilverbund | `balance-main-profilverbund.js`, `app/profile/profilverbund-balance.js`, `app/profile/profilverbund-action-attribution.js` | `docs/reference/BALANCE_MODULES_README.md`, `tests/profilverbund-balance.test.mjs` |
| Tranchen und Reconcile | `types/tranche-contract.js`, `app/tranches/`, Profil-Assets-Reconcile | `docs/reference/TRANCHEN_MODULES_README.md`, `tests/tranche-contract.test.mjs`, `tests/tranche-reconciliation.test.mjs` |
| Live-Daten, Netzwerk und Plattform | Inflations-, ETF-, CAPE- und Quote-Provider; HTML-Fontimporte; Tauri-CSP und Yahoo-Proxy; Windows-Buildskripte | `docs/reference/DATA_SOURCES.md`, `tests/browser-smoke.test.mjs`, `tests/tauri-csp.test.mjs`, Tauri-Releaseplan |

Die Testdateien wurden als ausführbare Vertragsquelle gelesen. Slice 2 behauptet
keinen neuen Testlauf; die bestehende datierte Gesamtbaseline bleibt davon
getrennt.

## Geplante Validierung

- gezielter Source-of-Truth-Abgleich der beschriebenen Verträge;
- Prüfung auf widersprüchliche Ownership-, Fallback-, Fail-safe- und
  Fail-closed-Aussagen in den Referenzdokumenten;
- Markdown-Überschriften-, Anker- und relative-Link-Prüfung;
- Pfad- und Symbolaudit der neu beziehungsweise wesentlich geänderten
  Architekturpassagen;
- Suche nach absoluten Datenschutz-, Offline- und Plattformbehauptungen;
- `git diff --check`;
- abschließender Scope-Check gegen den vorstehenden Diff-Risiko-Block.

Ein `npm test`-Lauf ist für reine Markdown-Änderungen nicht vorgesehen. Falls
eine Aussage nur durch einen aktuellen Lauf belastbar wäre, wird sie entweder
mit einer vorhandenen datierten Baseline eingegrenzt oder als Stop-Punkt
gemeldet.

## Durchgeführte Änderungen

1. `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` auf den aktuellen
   Architekturstand konsolidiert:
   - logische Drei-Schichten-Architektur, Laufzeittopologie sowie eindeutige
     Ownership- und Schreibgrenzen ergänzt;
   - Fallback, Fail-safe und Fail-closed definiert und an konkreten Pfaden
     getrennt;
   - Tauri-/Browserlaufzeit, Windows-Releasepfad, Plattformreife,
     Netzwerk-/Datenschutzgrenzen und Offline-Bedeutung präzisiert;
   - PersistenceFacade, Flush/Migration, Import-Recovery, Snapshotgrenzen,
     bereichsspezifische Korruption und Tauri-Live-Datei-Quarantäne integriert;
   - den periodengebundenen Jahresabschluss einschließlich Preflight, Flush,
     Snapshot-Read-back, Commitphasen, Writes, Validierung, Abschluss und
     Recovery als Zustandsfolge dokumentiert;
   - Stichtags-, Fallback- und Provenienzverträge für Inflation, ETF/ATH, CAPE
     und Tranchenquotes zusammengeführt;
   - genau einen Haushalts-Engine-Lauf, reine Profilattribution,
     eigentümerbezogenes Settlement und centgenaue Haushalts-Reconciliation
     beschrieben;
   - Engine-Eingabe-, Vorzustands-, Erfolgs-, Fehler-, Settlement- und
     Cash-Reconciliation-Verträge ergänzt;
   - das repräsentative Testinventar um die maßgeblichen Contracttests
     erweitert;
   - ausschließlich die widersprechenden Selbstbeschreibungen zu Offline,
     Desktop und Multi-Plattform im alten Marktteil auf denselben belegten
     Architekturstand begrenzt; Wettbewerberdaten und Marktwertung blieben
     unangetastet.
2. `README.md` auf nachweisbare Aussagen begrenzt: lokaler Kern statt absoluter
   Netzwerklosigkeit, Windows-spezifischer Releasepfad statt pauschaler
   Desktopauslieferung, Trennung von Artefakt, Validierung und Veröffentlichung
   sowie transparente Request-/Datenschutzgrenzen.
3. `docs/reference/DATA_SOURCES.md` mit der strengeren Grenze des atomaren
   Jahres-Commits, ETF-/CAPE-Stichtags- und Provenienzverträgen, Google-Font-
   Netzwerkpfad und übertragenen Requestparametern synchronisiert.
4. `docs/reference/TECHNICAL.md` beim Offline-Jahresworkflow und bei den
   methodenspezifischen Engine-Fehler-Envelopes an den Hauptcontract angepasst.
5. Den Slice-Status und dieses Ergebnis in den übergeordneten Arbeitsplan
   zurückdokumentiert.

Es wurden keine Programm-, Test-, Build-, Konfigurations- oder generierten
Dateien für Slice 2 geändert.

## Ausgeführte Validierung

| Prüfung | Ausführung und Ergebnis |
| --- | --- |
| Branch-/Commit-Gate | `git branch --show-current` -> `codex/architektur-fachkonzept-doku`; `git rev-parse --short HEAD` -> `6ea3e7a` |
| Reproduzierbares Inventar | `rg --files` mit bereichsspezifischen JS-/MJS-/Testfiltern -> Balance 36, Simulator 95, Profile 13, Tranchen 7, Shared 12, Types 3, Engine 27, Workers 3, Tests 107; davon 106 ohne separates `browser-smoke.test.mjs` |
| Pfad- und Symbolaudit | alle 21 gezielt referenzierten Architektur-, Engine-, Annual-, Profil-, Tranchen-, Tauri- und Testpfade vorhanden; `rg` bestätigte die drei operativen Rechenmethoden, Profilverbund-Toleranz `0.01`, Attribution/KPI-Reconciliation sowie die Commitphasen `snapshot_confirmed`, `writes_started`, `validating` |
| Netzwerk-/CSP-Abgleich | HTML-Quellen bestätigen Google-Font-Requests; Tauri-CSP bestätigt lokale Yahoo-, Inflations-, CAPE- sowie separate Fontgrenzen; Provider-URLs stimmen mit der Datenquellenreferenz überein |
| Markdown-Struktur | eigener read-only PowerShell-Audit über acht Projektdokumente -> 0 Überschriften-Ebenensprünge, 0 defekte relative Links/Anker, 0 Tabellen-Spaltenfehler, 0 Soft-Hyphens/Ersatzzeichen |
| Absolutheitsprüfung | `rg`-Suche nach den abgelösten Offline-, Daten-, Plattform-, Größen-, Download- und Releaseformulierungen -> 0 unqualifizierte Treffer; das zitierte Gegenbeispiel „Desktop-App für alle Plattformen ausgeliefert“ bleibt ausdrücklich als unzulässige Aussage markiert |
| Whitespace und Diff | Slice-Scope-Scan -> 0 Zeilen mit nachlaufendem Whitespace; `git diff --check` -> Exit 0 |
| Abschließender Scope | `git diff --name-only` -> fünf getrackte Markdown-Dateien, 0 getrackte Nicht-Markdown-Dateien. Die neue Plan-/Slice-Dokumentation ist ebenfalls Markdown. `engine/README.md`, Slice 1 und die ungetrackten Playwright-Dateien waren bereits vor Slice 2 vorhanden; die Playwright-Dateien blieben unangetastet. |

`npm test`, Browser-Smoke, Coverage, Engine-Build und Tauri-Build wurden nicht
ausgeführt. Der Slice ändert ausschließlich Markdown und übernimmt nur die im
Repository bereits datierte Testbaseline; er behauptet kein neues
Laufzeitergebnis.

## Abweichungen vom Plan

- Der bedingte Konsistenz-Scope wurde tatsächlich benötigt. Neben
  `docs/reference/DATA_SOURCES.md` und `docs/reference/TECHNICAL.md` wurde auch
  `README.md` geändert, weil dort absolute Offline-, Download- und
  Plattformaussagen dem nachgewiesenen Architekturstand widersprachen. Dies
  fällt unter die vorab dokumentierte Öffnung für weitere Markdown-Referenzen;
  der Befund und die Datei sind hier ausdrücklich nachgetragen.
- Die übrigen gelesenen Modul- und Test-READMEs benötigten für Slice 2 keine
  Änderung.
- Wie geplant wurde kein `npm test` ausgeführt, da ausschließlich Markdown
  geändert und kein neues aktuelles Runner-Ergebnis behauptet wurde.

## Offene Risiken

- Slice 1 und Slice 2 teilen bis zur Nutzerentscheidung U-09 denselben
  uncommitteten Working Tree; deshalb muss der Slice-2-Diff besonders klar
  dokumentiert werden.
- Die technische Architektur ist über mehrere Referenzen und abgeschlossene
  Härtungspläne verteilt. Archivierte Pläne sind nur Entscheidungsnachweise;
  tatsächliche Contracts werden gegen aktuelle Module und Tests geprüft.
- Vorhandene Windows-EXE-Dateien belegen nur die lokale Artefakterzeugung. Ein
  zugehöriger grüner Testlauf, manueller Desktop-Smoke oder externer
  Distributionsnachweis ist aus dem Working Tree nicht ableitbar.
- Für Tauri unter macOS/Linux gibt es im geprüften Stand keinen aktuellen
  Build-, Smoke-, Signierungs- oder Auslieferungsnachweis.
- Die automatische Tauri-Quarantäne gilt für die Live-Datei, nicht pauschal für
  das separate Snapshot-Archiv. Ein Komplettimport besitzt eine vom Nutzer
  herunterzuladende Recovery-Datei, aber keinen behaupteten automatischen
  internen Rollback.
- Marktvergleich, wissenschaftliche Einordnung und weitergehende fachliche
  Modellgrenzen bleiben bewusst den Slices 3 bis 7 vorbehalten. Die in Slice 2
  korrigierten Eigenangaben zu Plattform und Netzwerk sind kein vorgezogener
  Wettbewerbervergleich.

## Rückdokumentation in den Arbeitsplan

Erfolgt am 2026-07-15: Paketlink, Slice-2-Ergebnis und die anschließend erteilte
Nutzerfreigabe wurden im übergeordneten Arbeitsplan ergänzt. U-03 bleibt
ausstehend, weil es den gemeinsamen Block nach Slice 2 und Slice 3 freigibt.

## Ergebnisse

- Die implementierungsseitigen Akzeptanzkriterien sind dokumentarisch
  abgearbeitet; der Nutzer hat Slice 2 am 2026-07-15 ausdrücklich freigegeben.
- Hauptdokument, README, technische Referenz und Datenquellenreferenz verwenden
  nun dieselben Ownership-, Recovery-, Plattform-, Offline- und
  Datenschutzgrenzen.
- Die Diagramme zeigen Schichten, Jahres-Commit und Profilverbund-Attribution,
  ohne Worker oder Laufzeitadapter als zusätzliche Fachschicht zu behandeln.
- Der Slice bleibt dokumentationsrein; es gibt keinen Laufzeit-, API-,
  Datenvertrags- oder Engine-Semantikwechsel.

## Freigabestatus

- Implementierung durch Codex: abgeschlossen, keine Eigenfreigabe
- Nutzerfreigabe des Slice-2-Architekturblocks: erteilt am 2026-07-15
- Review durch Gemini/Claude: gemäß Prozessentscheidung nicht erforderlich
- Commit/Push: nicht durch Codex; separate Nutzerentscheidung erforderlich

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U-02 | Nutzer | Zielgliederung und Scope für Slice 2 | angenommen | am 2026-07-15 freigegeben |
| U-S2-01 | Nutzer | Slice 2 separat umsetzen | angenommen | Auftrag vom 2026-07-15; Umsetzung abgeschlossen |
| U-S2-02 | Nutzer | Slice-2-Architekturblock prüfen und freigeben oder Findings nennen | angenommen | am 2026-07-15 mit „Ich gebe die Nutzerfreigabe für slice 2“ freigegeben |
