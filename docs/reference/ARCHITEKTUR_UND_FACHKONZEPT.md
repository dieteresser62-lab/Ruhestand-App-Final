# Architektur und Fachkonzept: Ruhestand-Suite

**Technische Dokumentation der DIY-Software für Ruhestandsplanung**

**Dokumentstand:** 2026-07-15 (redaktionell integrierter Abschlussstand nach Architektur-, Fach-, Markt- und Forschungsabgleich)
**Inhaltlicher Codeabgleich:** Architekturabschnitt B sowie Fachkonzept-, Rechenkonventions- und Modellgrenzen gegen Commit `6ea3e7a` und die lokale Arbeitskopie vom 2026-07-15
**Reproduzierbarer Inventarstand:** Commit `6ea3e7a` vom 2026-07-15; Ermittlungsweg siehe Release-Checkliste
**Engine API:** v31.0, Build-ID `2025-12-22_16-35`; acht exponierte Methoden, davon fünf unterstützte operative Methoden und drei deprecated No-op-Kompatibilitäts-Stubs
**Externer Quellenstand:** Marktvergleich mit Stichtag 2026-07-15; wissenschaftliches Korpus mit 55 Records, Abrufstand 2026-07-15 und abgeschlossenem Mechanismusabgleich MAP-01 bis MAP-17
**Lizenz:** MIT

---

# Übersicht

## Inhaltsverzeichnis

- [Software-Profil](#software-profil)
- [Stand und Reproduzierbarkeit](#stand-und-reproduzierbarkeit)
- [Komponenten](#komponenten)
- [Hauptfunktionen](#hauptfunktionen)
- [Bekannte Einschränkungen](#bekannte-einschränkungen)
- [Anlagephilosophie und Eignung](#anlagephilosophie-und-eignung)
- [Geltungsbereich und Abgrenzung](#geltungsbereich-und-abgrenzung)
- [Release-Checkliste (Dokumentpflege)](#release-checkliste-dokumentpflege)
- [Technische Architektur](#technische-architektur)
- [Fachkonzept und Rechenkonventionen](#fachkonzept-und-rechenkonventionen)
- [Annahmen, Modellgrenzen und Validierung](#annahmen-modellgrenzen-und-validierung)
- [Marktvergleich](#marktvergleich)
- [Wissenschaftlicher Rahmen, Quellenkorpus und Tiefeneinordnung](#wissenschaftlicher-rahmen-quellenkorpus-und-tiefeneinordnung)
- [Appendix: Modul-Inventar](#appendix-modul-inventar)

## Software-Profil

**Ruhestand-Suite** — DIY-Softwaresuite zur Ruhestandsplanung
- **Sprache:** JavaScript (ES6 Module)
- **Lizenz:** MIT
- **Zielgruppe:** Deutschsprachige Einzelpersonen und Haushalte (inkl. Paare) mit Finanzverständnis

## Stand und Reproduzierbarkeit

Die Aktualitätsstände werden getrennt ausgewiesen, damit ein frischer
Dateizähler nicht mit einem vollständigen fachlichen Codeabgleich oder einer
aktuellen externen Recherche verwechselt wird. Die Ausgangsfassung vor dieser
Überarbeitung hatte 3.076 physische Zeilen. Davon entfielen 904 Zeilen (29,4 %)
auf die technische Architektur, 1.566 (50,9 %) auf die fachlichen Algorithmen,
158
(5,1 %) auf den Marktvergleich, 112 (3,6 %) auf den Forschungsabgleich und 145
(4,7 %) auf Appendix und Quellen. Die Ermittlung erfolgte am 2026-07-15 über
die Top-Level-Überschriften und `(Get-Content <datei>).Count`; die restlichen
191 Zeilen umfassten Dokumentkopf und Übersicht.

Der Abschlussstand verbindet die aktualisierte Inventar- und Metadatenbasis
mit dem bis zur lokalen Arbeitskopie vom 2026-07-15 geprüften Architektur- und
Fachstand. Marktvergleich und Forschungsabgleich verwenden getrennte,
datierte Evidenzsysteme: Produktbefunde gelten nur für Stichprobe,
Produktstufe, öffentliche Dokumentation und Stichtag; wissenschaftliche
Quellen werden je Mechanismus mit Suite-Abweichung, Übertragbarkeit, lokaler
Validierungsgrenze und Restrisiko verknüpft. Weder ein Quellenrecord noch ein
bestandener lokaler Test ist eine Wirksamkeitsfreigabe.

## Komponenten

*Reproduzierbare Momentaufnahme von Commit `6ea3e7a` am 2026-07-15. Gezählt
wurden die jeweils angegebenen Dateiendungen mit den Befehlen aus der
Release-Checkliste. Dateizahlen sind Orientierungshilfen, keine normativen
Architekturgrenzen. Spezialisierte Referenzen (`TECHNICAL.md`, Modul-READMEs,
`engine/README.md`, `tests/README.md`) führen die veränderlichen Detail- und
Exportkataloge.*

| Komponente | Zweck | Momentaufnahme |
|------------|-------|----------------|
| **Balance-App** | Jahresplanung: Liquidität, Entnahme, Steuern, Transaktionen, Ausgaben-Check, Pflegebucket-Diagnose, Jahresabschluss-Snapshots | 36 JS-Module unter `app/balance/` |
| **Simulator** | Monte-Carlo-Simulation, Parameter-Sweeps, Auto-Optimize, Dynamic Flex, Stationary Bootstrap, Tail-Risk-Overlay, Pflegebucket-Wirklogik | 95 JS-Module unter `app/simulator/` |
| **Engine** | Kern-Berechnungslogik, Guardrails, Steuern, kontinuierliche Regime-Signale und VPW-Rendite-Policy | 27 MJS-Module unter `engine/` |
| **Workers** | Parallelisierung für MC/Sweep/Optimizer-Pfade | 3 JS-Module unter `workers/` |
| **Tests** | Unit-, Integration-, Browser-Smoke- und Coverage-Gates | 107 entdeckte `*.test.mjs`-Dateien; davon 106 im Node-Standardgate, Browser-Smoke separat |
| **Profile, Tranchen, Shared, Types** | Profilverwaltung, Profilverbund, Tranchenstatus, gemeinsame Utilities und Datenverträge | 13 + 7 + 12 JS-Module sowie 3 JS-Module unter `types/` |

*Hinweis: Dieses Dokument beschreibt Konzepte und Architekturentscheidungen. Für konkrete Implementierungsdetails gelten die genannten Module und Tests als Referenz; exakte Code-Zeilen werden bewusst vermieden, weil sie nach Refactorings schnell veralten.*

## Hauptfunktionen

Die Ruhestand-Suite kombiniert folgende Funktionen:

1. **Parametrisiertes deutsches Kapitalertragsteuer-Modell** für Verkäufe (Abgeltungssteuer, Soli, vereinfachte KiSt, Teilfreistellung, SPB, modellbasierte Verkaufsreihenfolge und ein gemeinsamer jahresübergreifender Verlustvortrag); keine vollständige Steuererklärung oder automatische Rechtsfortschreibung
2. **Dynamische Guardrails** mit 7-stufiger Marktregime-Erkennung
3. **Pflegefall-Modellierung** (PG1-5, Progression, Dual-Care)
4. **Multi-Profil-Unterstützung** für Paare mit getrennten Depots und **Witwenrente**
5. **Tranchen-Management** mit steuerorientierter, kontextabhängiger Verkaufsreihenfolge und Online-Kursaktualisierung
6. **Balance-App** für operative Jahresplanung mit Online-Datenabruf
7. **Simulator** mit Monte-Carlo, historischem Backtest, Parameter-Sweeps und mehrphasiger Auto-Optimierung
8. **Historische Datenbasis 1925-2025** mit geschätzter Erweiterung 1925-1949 und darauf aufsetzenden Stress-Szenarien (Große Depression, WWII)
9. **Optionale Ansparphase** für vollständige Lebenszyklus-Modellierung
10. **Rentensystem** für 1-2 Personen mit verschiedenen Indexierungsarten
11. **Windows-Desktop-Paketierung** via Tauri sowie browserbasierter Quellbetrieb;
    macOS- und Linux-Tauri-Ziele sind konfigurierbar, aber in diesem
    Dokumentstand weder als gebaut noch als ausgeliefert nachgewiesen
12. **Ausgaben-Check** zur Kontrolle monatlicher Ausgaben gegen das Budget mit CSV-Import, Hochrechnung und Ampel-Visualisierung
13. **Dynamic-Flex (VPW)** mit CAPE-basierter Renditeerwartung, Sterbetafeln, konservativen Langlebigkeitsaufschlaegen, EMA-Glättung und Go-Go-Phase; integriert in Balance-App, Backtest, Monte Carlo, Sweep und Auto-Optimize
14. **Auto-CAPE im Jahreswechsel** (US-Shiller-CAPE mit Fallback-Kette und non-blocking Fehlerbehandlung)
15. **Pflegebucket** als gesperrte Geldmarkt-/Cash-Reserve mit Profildefinition, Simulator-Air-Gap, Pflegegrad-Trigger, Monte-Carlo-KPIs und Balance-Diagnose
16. **Mindest-Flex p.a.** als optionale Untergrenze für Flex-Ausgaben in gekürzten Safety-/Guardrail-Jahren; ratenbasiert, validiert gegen den Flex-Bedarf und in Balance, Simulator, Backtest, Monte Carlo, Sweep, Auto-Optimize und Profilverbund integriert
17. **Internes Jahresabschluss-Snapshot-Archiv** mit Pre-Mutation-Snapshots, separatem Browser-/Tauri-Speicher und Standard-Restore mit Profilzuordnungspruefung
18. **Stationary Bootstrap** mit variablen Blocklaengen, deterministischem Run-State und Worker-Paritaet als Alternative zum festen Block-Bootstrap
19. **Kontinuierliche Regime-Signale** fuer Drawdown, CAPE und Runway; die geglaettete Runway-Zielsteuerung ist additiv und standardmaessig deaktiviert
20. **Tail-Risk-/Crash-Overlay** als expliziter, standardmaessig deaktivierter Monte-Carlo-Stresstest mit Anti-Doppelpessimismus, eigenen KPIs und exportierbaren Ereignisfeldern

## Bekannte Einschränkungen

- Das Tail-Risk-Overlay ist eine synthetische Ereignis-Injektion fuer Monte Carlo, kein kalibriertes GARCH-/Student-t-Modell und keine Prognose. Es ist standardmaessig deaktiviert.
- Historische Krisen und synthetische Tail-Risk-Ereignisse werden durch eine Skip-Regel gegen doppelte Return-Schocks geschuetzt; diese Heuristik ersetzt keine gemeinsame statistische Kalibrierung beider Risikomodelle.
- Kontinuierliche Runway-Zielglaettung und die kontinuierliche CAPE-Rendite-Policy sind vorhanden, bleiben aber opt-in. Die diskreten Bestandsdefaults bleiben dadurch reproduzierbar.
- Gebühren, Spreads, Slippage und laufende Produktkosten werden in Engine und Simulator nicht als eigene Cashflows abgezogen. Nur der bestätigte Realbestands-Reconcile erfasst tatsächlich eingegebene Ausführungsgebühren.
- Alle Planungsbeträge und automatisch akzeptierten Tranchenkurse sind EUR-basiert. Es gibt keine implizite Fremdwährungsumrechnung; Nicht-EUR-Quotes werden abgelehnt.
- Das Steuermodell bildet einen begrenzten Verkaufskontext ab, nicht die gesamte deutsche Ertrags-, Einkommen- oder Investmentbesteuerung. Rechtliche Parameter werden nicht automatisch aktualisiert.
- Der Simulator führt den kumulierten Inflationsfaktor über den vollständigen Jahrespfad einschließlich Ansparjahren fort. `jahresentnahme_real` ist die effektive nominale Entnahme geteilt durch den Faktor des aktuellen Modelljahres und bezieht sich auf die Kaufkraft des ersten Simulatorjahres.
- Der zusätzliche Pflegekostenanstieg bleibt in UI und gespeicherten Profilen ein Prozentwert. DOM- und Profil-Reader normalisieren ihn genau einmal in-memory; die Pflegelogik, Runner und Worker verwenden danach das Verhältnis direkt. Angezeigte 3,5 % wirken daher als jährlicher Faktor 1,035. Die Parameterkalibrierung bleibt davon getrennt eine Modellgrenze.
- Indexvariante, geschätzte Frühhistorie und weitere Ergebnisgrenzen stehen in C.3.3 sowie im Annahmen- und Modellrisikoregister.

## Nachgezogene Entwicklungspakete seit dem Dokumentstand 2026-06-12

Die Bestandsaufnahme wurde im Architekturabgleich bis Commit `6ea3e7a` und zur
lokalen Arbeitskopie vom 2026-07-15 fortgeschrieben. Archivierte
Arbeitsdokumente dienen nur als Entscheidungsnachweis; die folgende Einordnung
wurde gegen aktuelle Module, Tests und aktive Referenzen abgeglichen:

| Paket | Ergebnis im aktuellen System | Architektur-/Fachauswirkung |
|-------|------------------------------|-----------------------------|
| Testabdeckung-Erweiterung | Node-Standardsuite, V8-Coverage, Playwright-Browser-Smokes, Worker-/UI-/Persistenz-Gates | Tests sind ein mehrstufiges Gate; Coverage ist kein Ersatz fuer Browser- oder Tauri-Validierung |
| Konservatives Langlebigkeitsmodell | optionale Quantil-, relative und feste Horizontpuffer; Joint-to-Single-Glaettung | Demographische Horizontableitung bleibt in der App-Schicht; die Engine erhaelt den effektiven Horizont plus Diagnose |
| Kontinuierliche CAPE-Rendite | `cape_continuous` neben `legacy_step` | Policy ist in `vpw-return-policy.mjs` gekapselt; kein Default-Wechsel, da fachlich relevante Ergebnisdeltas bestehen |
| Regime-Uebergangs-Glaettung | kontinuierliche Severity-Signale und optional interpoliertes Runway-Ziel | Diskrete Regime und harte Sicherheitsgrenzen bleiben autoritativ; Zielglaettung ist per Feature-Config aus |
| Stationary Bootstrap | variable Blocklaengen mit deterministischem Sampler-State | neue MC-Samplingmethode `stationary`; Filter/Recency/CAPE greifen nur an Blockstarts |
| Tail-Risk-/Crash-Modell V1 | deterministisches Ereignis-Overlay, Anti-Doppelpessimismus, KPIs und Logexport | getrennte Stressschicht nach historischem Sampling; nur Monte Carlo, opt-in, keine Mutation der Quelldaten |
| Engine-Contract-Hardening | validierte Eingabegrenzen, strukturierter Ergebnis-/Fehlervertrag und zentrales Steuer-Settlement | `simulateSingleYear()` liefert entweder den vollständigen Erfolgs-Shape oder ein `error`-Envelope; Verkaufsschätzung und finale Jahressteuer sind getrennt |
| Balance-Workflow-Hardening | gebundener Engine-Handshake, maschinenlesbare Update-Status und periodengebundener Jahresabschluss | inkompatible Engines und fehlerhafte Updates persistieren nicht; ein Jahres-Commit benötigt Preflight, Flush und bestätigten Recovery-Snapshot |
| Persistenz- und Snapshot-Hardening | Backend-Facade, separates Snapshot-Archiv, Import-Recovery und Korruptionszustände | Live-State, interne Sicherungspunkte und Austausch-Backups besitzen getrennte Ownership und Recovery-Pfade |
| Profilverbund-Attribution | genau ein Haushalts-Engine-Lauf, danach profilbezogene Quellen-, Steuer- und Verwendungsattribution | Haushalts-Guardrails bleiben gemeinsam; Verlustvortrag, Pauschbetrag, Kirchensteuer, TQF und Cost Basis bleiben eigentümerbezogen |
| Tranchenmanagement-Hardening | kanonisches Schema, raw-erhaltende Recovery, EUR-Quote-Grenze und bestätigtes Reconcile | Balance, Simulator und Engine planen schreibfrei; nur der Profil-Assets-Manager darf reale Lots nach Brokerausführung fortschreiben |

Die Detailvertraege stehen in den jeweiligen Fachabschnitten dieses Dokuments. Die archivierten Plaene bleiben Entstehungs- und Entscheidungsnachweis, sind aber keine Laufzeit-Source-of-Truth.

## Anlagephilosophie und Eignung

Die Suite basiert auf einer spezifischen Anlagephilosophie und ist für Nutzer konzipiert, die diesem Ansatz folgen:

### Vorausgesetztes Anlagemodell

| Asset-Klasse | Umsetzung | Rolle im Portfolio |
|--------------|-----------|-------------------|
| **Liquidität** | Tagesgeld/Giro-nahe Liquidität und Geldmarkt-ETF (z.B. €STR-basiert) | Laufende Entnahmen, Notreserve, Runway-Puffer |
| **Aktien** | Breit gestreuter Aktien-ETF (z.B. Vanguard FTSE All-World, MSCI World, ACWI) | Langfristiger Vermögensaufbau und -erhalt |
| **Gold** | Physisch, ETC oder vergleichbarer Gold-Baustein | Krisenabsicherung, Rebalancing-Quelle in Bärenmärkten |
| **Bonds / Anleihen** | Optional im Modus **3-Bucket Jilge**: Anleihen-ETF bzw. Bond-Tranchen | Zusätzlicher defensiver Puffer zwischen Liquidität und Aktien; in schlechten Jahren vorrangige Verkaufsquelle, in guten Jahren Zieltopf zum Wiederauffüllen |

Die Grundstrategie bleibt ein einfaches, passives Portfolio aus Liquidität, Aktien-ETF und optional Gold. Der per Strategieauswahl aktivierbare Modus **3-Bucket Jilge** erweitert dieses Modell um einen Bond-/Anleihen-Bucket. Bonds sind damit kein allgemeines Multi-Asset-Modell beliebiger Rentenpapiere, sondern ein regelbasierter Zieltopf innerhalb der Entnahmelogik.

### Kernprinzipien

1. **Passive, breit diversifizierte Aktienanlage:** Die Suite geht von einem oder wenigen global gestreuten Aktien-ETFs aus – keine Einzelaktien, keine Sektorwetten, keine aktive Titelauswahl.

2. **Liquiditätsmanagement über Geldmarkt-ETF:** Statt klassischem Tagesgeld bei Banken wird Liquidität in Geldmarkt-ETFs gehalten, die täglich handelbar sind und aktuell marktnahe Zinsen bieten.

3. **Gold als antizyklischer Puffer:** Gold dient nicht primär der Rendite, sondern als Stabilitätsanker. In Bärenmärkten, wenn Aktien fallen, kann Gold zur Liquiditätsbeschaffung verkauft werden, ohne Aktien zu ungünstigen Kursen liquidieren zu müssen.

4. **Optionaler 3-Bucket-Jilge-Puffer:** Im 3-Bucket-Modus kommen Bonds/Anleihen-ETF als zusätzlicher defensiver Puffer hinzu. Die Logik kann in schlechten Jahren Bond-Bestände statt Aktien heranziehen und in guten Jahren den Bond-Zieltopf wieder auffüllen.

5. **Regelbasierte Planung:** Guardrails, Marktregime-Erkennung und optionale 3-Bucket-Regeln erzeugen reproduzierbare Entnahme- und Transaktionsvorschläge. Die tatsächliche Brokerausführung, der bestätigte Realbestandsabgleich und Änderungen der Nutzerparameter bleiben operative Nutzerentscheidungen.

### Für wen die Suite geeignet ist

✅ Passiv-Investoren mit Buy-and-Hold-Strategie
✅ Nutzer von Welt-ETFs (MSCI World, FTSE All-World, ACWI)
✅ Anleger, die Geldmarkt-ETFs als Liquiditätsinstrument nutzen
✅ Investoren mit optionaler Gold-Beimischung zur Diversifikation
✅ Nutzer, die im 3-Bucket-Jilge-Modus einen defensiven Bond-/Anleihen-ETF-Puffer modellieren möchten
✅ Ruheständler, die regelbasierte Entnahmestrategien bevorzugen

### Für wen die Suite nicht geeignet ist

❌ **Einzelaktien-Investoren:** Keine Unterstützung für Stock-Picking oder Dividendenstrategien mit Einzeltiteln
❌ **Komplexe Anleihen-Portfolios:** Keine detaillierte Modellierung einzelner Staatsanleihen, Unternehmensanleihen, Laufzeiten, Kupons, Duration-Profile oder Zinskurven. Unterstützt ist ein vereinfachter Bond-/Anleihen-ETF-Bucket im 3-Bucket-Jilge-Modus.
❌ **Immobilien-Investoren:** Keine Integration von Mieteinnahmen oder Immobilienwerten
❌ **Krypto-Anleger:** Keine Unterstützung für Bitcoin, Ethereum oder andere Kryptowährungen
❌ **Aktive Trader:** Keine Unterstützung für Market-Timing, Optionen oder gehebelte Produkte
❌ **Freie Multi-Asset-Strategien:** Keine Modellierung komplexer Portfolios mit beliebig vielen Asset-Klassen jenseits der unterstützten Bausteine Liquidität, Aktien-ETF, Gold und optionalem Bond-Bucket.

### Warum diese Einschränkung?

Die Fokussierung auf ein einfaches, aber robustes Anlagemodell ermöglicht:

- **Nachvollziehbare Steuerplanung:** Verkäufe werden mit Cost Basis, Teilfreistellung, Pauschbetrag, parametrisiertem Steuersatz und gemeinsamem Verlustvortrag modelliert; dies ersetzt keine vollständige steuerliche Veranlagung
- **Zuverlässige historische Simulation:** Die Monte-Carlo-Daten basieren auf MSCI-World-ähnlichen Renditereihen
- **Klare Entscheidungslogik:** Guardrails, Rebalancing- und 3-Bucket-Regeln sind auf wenige Bausteine abgestimmt: Aktien-ETF, Geldmarkt/Liquidität, Gold und optional Bonds
- **Geringere Komplexität:** Weniger Stellschrauben bedeuten weniger Fehlkonfiguration

*Wer einem anderen Anlagemodell folgt, sollte prüfen, ob die Annahmen der Suite auf das eigene Portfolio übertragbar sind.*

## Geltungsbereich und Abgrenzung

- **Monte-Carlo vs. Backtest:** Die MC-Datenbasis reicht bis 1925 zurück; der deterministische Backtest nutzt ein engeres historisches Fenster (siehe Abschnitt C.8).
- **Single vs. Haushalt:** Das Dokument beschreibt sowohl Einzelprofil- als auch Profilverbund-Flows. Aussagen zur Zielgruppe und zu Workflows gelten für beide Modi.
- **Codebezug:** Codezeilen-/LOC-Angaben dienen der Orientierung und sind nicht normativ. Bei Abweichungen gilt immer der aktuelle Code im Repository.
- **Abgrenzung zu `TECHNICAL.md`:** `TECHNICAL.md` dient als kompakte Betriebs- und Entwicklerreferenz. Dieses Dokument enthält die vertiefte fachliche Herleitung, Designentscheidungen und Vergleichskapitel.
- **Doku-Scope:** Dieses Dokument muss als eigenständige Architektur- und Fachlektüre ausreichen. Spezialisierte Referenzen liefern ergänzende Exportlisten, Betriebsdetails und Testinventare, ersetzen aber nicht die konzeptionelle Beschreibung hier.

## Release-Checkliste (Dokumentpflege)

Vor jedem Release oder größeren Merge diese Punkte aktualisieren:

1. **Metadaten aktualisieren:** `Dokumentstand`, `Inhaltlicher Codeabgleich`,
   `Reproduzierbarer Inventarstand`, `Engine API` und getrennte externe
   Quellenstände.
2. **Bestandszahlen prüfen:** Modulanzahlen, Testdateien und Build-Hinweise;
   volatile LOC-Schätzwerte nicht als Architekturkennzahl fortschreiben.
3. **Codeverweise verifizieren:** Dateinamen, Funktionsnamen,
   Modulzuordnungen, öffentliche Engine-Methoden und Persistenzverträge.
4. **Zeitfenster prüfen:** Historische Datenräume in Monte Carlo und Backtest
   sowie Daten-, Rekonstruktions- und Fallbackstände klar abgrenzen.
5. **Feature-Delta nachziehen:** Neue Funktionen in `Hauptfunktionen`, den
   Architektur-/Fachabschnitten, Annahmen-/Risikoregistern und der Modulkarte
   ergänzen.
6. **Marktvergleich aktualisieren:** Produktidentität, untersuchte Stufe,
   Preis/Lizenz, offizielle Quellen und Evidenzlücken für einen neuen
   Vergleichsstichtag prüfen; alte Befunde nicht still überschreiben.
7. **Forschungsabgleich aktualisieren:** neue Literatur- oder amtliche
   Datenstände versionieren, FOR-Records nachziehen und betroffene MAP-, FR-
   und FQ-Einträge neu bewerten; Literaturbefunde nicht als Suite-Ergebnisse
   ausgeben.
8. **Quellenintegrität prüfen:** zentrale Aussagen quellennahe belegen,
   MKT-/FOR-IDs eindeutig halten und Abruf-, Publikations- und Datenstand nicht
   vermischen.
9. **Navigation prüfen:** Inhaltsverzeichnis, Überschriften, Anker, lokale
   Links, Tabellen und Querverweise mechanisch kontrollieren.
10. **Scope- und Smoke-Review durchführen:** Dokument auf doppelte oder
    obsolete Aussagen, widersprüchliche Zahlen, unbelegte Absolutheiten und
    unerwartete Nicht-Markdown-Änderungen durchsuchen.

Reproduzierbare Inventarpruefung fuer die Komponenten-Tabelle:

```powershell
git rev-parse HEAD
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

---

# Technische Architektur

## B.1 Drei-Schichten-Architektur

Die Suite umfasst mehrere HTML-Oberflächen und Begleitmodule: Neben Balance und Simulator gibt es Einstiegsseiten für Profilverwaltung, Tranchenverwaltung und Handbuch; die UI-nahe Logik ist in thematische ES-Module aufgeteilt. Die Engine bildet die gemeinsame deterministische Rechenschicht, `engine.js` ist daraus generiert.

### B.1.0 Aktuelle Top-Level-Struktur

| Bereich | Pfade | Rolle |
|---------|-------|-------|
| **Start- und Oberflächen-HTML** | `index.html`, `Balance.html`, `Simulator.html`, `depot-tranchen-manager.html`, `Handbuch.html` | Einstieg, Profilverwaltung, Jahresplanung, Simulation, Tranchenpflege, lokale Hilfe |
| **Balance-App** | `app/balance/`, `css/balance.css` | Operative Jahresplanung, Diagnose, Jahresupdate, Ausgaben-Check, Profilverbund-Anbindung |
| **Simulator** | `app/simulator/`, `simulator.css` | Monte Carlo, Backtest, Sweep, Auto-Optimize, Pflege/Rente/Portfolio-UI, DOM-freie Jahreslogik |
| **Profil/Verbund/Tranchen** | `app/profile/`, `app/tranches/` | Profilregistry, Profilwechsel, Profilverbund-Aggregation, Tranchenstatus und Tranchenmanager |
| **Shared Utilities** | `app/shared/`, `types/` | Formatter, Feature-Flags, Security-Utilities, PersistenceFacade, SnapshotArchive, gemeinsame Typ-/Contract-Hilfen |
| **Engine-Quellen** | `engine/` | ESM-Quelle für Validierung, Marktanalyse, Spending-Policies, Steuer-/Transaktionslogik |
| **Generierte Engine** | `engine.js` | Browser-Bundle bzw. Modul-Fallback der Engine; nicht manuell bearbeiten |
| **Workers** | `workers/`, `app/simulator/worker-job-runner.js` | Parallele MC-/Sweep-/Optimizer-Jobs mit seriellen Fallbacks |
| **Desktop-Paketierung** | `src-tauri/`, `dist/`, `scripts/` | Tauri-WebView, integrierter Yahoo-Proxy, Sync-/Build-Skripte |
| **Tests und Doku** | `tests/`, `docs/reference/`, `docs/internal/` | Regressionstests, Referenzdoku, interne Arbeitspläne |

### B.1.1 Laufzeitschichten

Die drei Schichten sind logische Ownership-Grenzen und nicht jeweils genau ein
Verzeichnis. Insbesondere enthält `app/simulator/` neben UI-Code auch DOM-freie
Jahres- und Runnerlogik; `app/shared/` enthält sowohl reine Hilfen als auch
Persistenzinfrastruktur.

| Logische Schicht | Verantwortliche Bereiche | Darf entscheiden oder schreiben |
| --- | --- | --- |
| **1. Interaktion und Workflow** | HTML-Einstiege, Binder und UI-nahe Module unter `app/balance/`, `app/simulator/`, `app/profile/`, `app/tranches/` | liest Nutzeraktionen, orchestriert Workflows, rendert Ergebnisse; schreibt Fachzustand nur über die dafür vorgesehene Ownership-Grenze |
| **2. Fachlogik und Verträge** | `engine/`, DOM-freie Simulator-Runner, `types/`, reine Policy-/Attributionsmodule | validiert und berechnet deterministisch; besitzt weder DOM- noch Backend-Ownership |
| **3. Infrastruktur und Zustand** | `app/shared/persistence-*`, `snapshot-archive.js`, Worker-Pool, Laufzeiterkennung, Tauri-Rust-Shell und lokale Daten-Gateways | wählt Adapter, serialisiert und flusht Zustände, isoliert Worker und vermittelt optionale Netzwerkzugriffe |

```text
Nutzeraktion
   │
   ▼
HTML + Binder + App-Orchestrierung
   │  normalisierte Eingaben / expliziter Workflowauftrag
   ▼
Engine und DOM-freie Fachmodule
   │  vollständiges Ergebnis oder strukturierter Fehler
   ▼
Renderer / Profil- und Tranchenattribution
   │  nur nach erfolgreichem Contract-Gate
   ▼
PersistenceFacade ──> IndexedDB | Tauri-JSON | localStorage-Fallback

Monte Carlo / Sweep / Auto-Optimize
   └──> Worker-Pool ──> identische DOM-freie Runner ──> serieller Fallback

Optionale Live-Daten
   └──> lokale Yahoo-Proxy-Grenze oder explizit erlaubte HTTPS-Endpunkte
```

Worker und Browser/Tauri sind damit keine vierte fachliche Schicht. Worker
ändern nur die Ausführungstopologie und müssen zum seriellen Pfad deterministisch
paritätisch bleiben. Browser und Tauri wählen Infrastrukturadapter und
Netzwerkgrenzen; sie ändern nicht den fachlichen Engine-Vertrag.

### B.1.1a Ownership- und Schreibgrenzen

| Bereich | Autoritative Verantwortung | Explizite Grenze |
| --- | --- | --- |
| **Balance** | aktuelles Planungsjahr, Diagnose, Jahres- und Importworkflow | persistiert nur erfolgreiche Update-Ergebnisse; schreibt keine Empfehlung in den realen Tranchenbestand |
| **Simulator** | mehrjährige In-Memory-Pfade, Backtest, Monte Carlo, Sweep und Optimierung | mutiert nur tief kopierte Simulationsportfolios; `simlot:`-/`simbase:`-Lots sind kein Realbestand |
| **Engine** | normalisierte Jahresrechnung, Markt-/Spending-/Transaktionsentscheidung und Einzeljahres-Settlement | kein DOM, kein Netzwerk und kein Persistenzzugriff; liefert Daten oder ein Fehler-Envelope |
| **Profile/Profilverbund** | Registry, aktive Profile, Haushaltsaggregation und eigentümerbezogene Attribution | ein Haushalts-Engine-Lauf; danach reine Profilaufteilung ohne zweite Spending- oder Transaktionsentscheidung |
| **Tranchenmanager** | kanonischer profilbezogener Realbestand und bestätigtes Reconcile | einzige produktive Schreibgrenze für tatsächlich ausgeführte Lotverkäufe |
| **PersistenceFacade** | Laufzeitadapter, synchroner Cache, geordnete Flushes, Live-Replace und Snapshot-Delegation | Feature-Code wählt weder IndexedDB noch Tauri-Dateien direkt; Snapshot-Archiv und Live-State bleiben getrennt |

### B.1.1b Fallback, Fail-safe und Fail-closed

Die drei Begriffe bezeichnen unterschiedliche Reaktionen und dürfen nicht als
Synonyme verwendet werden:

| Reaktion | Bedeutung in dieser Suite | Beispiele |
| --- | --- | --- |
| **Fallback** | Ein definierter Alternativpfad liefert weiterhin ein fachlich gekennzeichnetes Ergebnis. | ECB -> World Bank -> OECD; CAPE-Primary -> Mirror -> gespeicherter Wert; Worker -> serieller Runner; IndexedDB -> ausdrücklich gewählter `localStorage`-Adapter, wenn IndexedDB nicht verfügbar ist. |
| **Fail-safe** | Der aktuelle oder vorherige Zustand bleibt erhalten beziehungsweise wird als wiederherstellbarer Zustand gesichert; der Vorgang meldet den Fehler sichtbar. | fehlgeschlagene Flush-Batches wieder als dirty/deleted vormerken; Recovery-Snapshot vor Jahreswrites; Rohdaten bei Ausgaben-/Tranchenkorruption erhalten; beschädigte Tauri-Live-Datei quarantänisieren. |
| **Fail-closed** | Ein mutierender oder fachlich nicht belastbarer Vorgang wird blockiert, bis der Vertrag wieder eindeutig erfüllt ist. | ungültiger Engine-Handshake; `incomplete_recovery`; periodenfremde ETF-Daten; korrupter Tranchen-/Ausgabenstore; fehlende Profilprovenienz oder Haushaltsabweichung über 0,01 EUR. |

Ein Fallback ist nur zulässig, wenn Quelle und Semantik des Ersatzpfads
feststehen. Das bloße Weiterschreiben mit einem alten, falschen oder
nicht zuordenbaren Wert ist weder Fallback noch Fail-safe.

**Aktuelle Bestandszahlen (Commit `6ea3e7a`, ermittelt am 2026-07-15):**

- `app/balance/`: 36 JS-Module
- `app/simulator/`: 95 JS-Module
- `app/profile/`: 13 JS-Module
- `app/tranches/`: 7 JS-Module
- `app/shared/`: 12 JS-Module
- `types/`: 3 JS-Module
- `engine/`: 27 MJS-Module
- `workers/`: 3 JS-Module
- `tests/`: 107 entdeckte `*.test.mjs`-Dateien, davon 106 im
  Node-Standardgate; `browser-smoke.test.mjs` ist ein separates Pflichtgate

## B.1.2 Desktop-Laufzeit, Release und Netzwerkgrenzen

Tauri kapselt dieselben HTML-/CSS-/ES-Modul-Quellen in einer System-WebView.
Die Rust-Schicht ersetzt nicht die fachliche Engine. Sie stellt die lokale
Dateipersistenz, den Loopback-Yahoo-Proxy und den Flush-vor-Schließen-Handshake
bereit. Das Frontend wird im Desktop-Build ausschließlich aus dem generierten
`dist/` geladen.

```text
Quellmodule im Repo
   └── npm run sync-dist
         └── validiertes dist/
               └── Tauri-System-WebView
                     ├── Engine/Runner wie im Browser
                     ├── Rust-Kommandos für Live-State/Snapshots
                     └── Loopback-Proxy 127.0.0.1:8787 -> Yahoo
```

**Desktop-relevante Projektstruktur:**

```text
src-tauri/
├── Cargo.toml
├── tauri.conf.json       # dist-Eingang, Fenster, Bundleziele und CSP
├── src/main.rs           # Rust-Einstieg
├── src/lib.rs            # Persistenzkommandos, Close-Handshake, Yahoo-Proxy
└── icons/
```

### B.1.2a Windows-Releasepfad

Der gepflegte Release-Orchestrator ist Windows-spezifisch:

```text
grüne, separat nachgewiesene Testgates
   -> build-tauri.bat oder npm run build-tauri-exe
   -> Preflight für npm, Rust/Cargo und MSVC
   -> npm run sync-dist und Assetprüfung
   -> npm run tauri:build
   -> Quellartefakt src-tauri/target/release/ruhestand_suite.exe prüfen
   -> vorhandene Root-EXE zeitgestempelt archivieren
   -> geprüft nach RuhestandSuite.exe kopieren
   -> manueller Desktop-Smoke
```

Der Build-Orchestrator startet die fachlichen Tests nicht automatisch. Eine
vorhandene EXE beweist deshalb Artefakterzeugung und Kopie, aber weder einen
grünen Testlauf noch einen manuellen Funktions-Smoke. In der lokalen
Arbeitskopie vom 2026-07-15 waren Quell- und Root-Artefakt für Windows
vorhanden. Ob genau dieses Artefakt extern veröffentlicht wurde, lässt sich aus
dem Repositoryzustand nicht ableiten und wird hier nicht behauptet.

Änderungen unter `engine/` müssen vor dem Release über `npm run build:engine`
in `engine.js` übertragen werden; CI-/Releasepfade sollen
`npm run build:engine:strict` verwenden. `dist/`, das Tauri-Zielverzeichnis und
die Root-EXE sind generierte Artefakte und keine primären Bearbeitungsorte.

### B.1.2b Netzwerk- und Datenschutzgrenzen

„Lokal gespeichert“ und „ohne jeden Netzwerkverkehr“ sind unterschiedliche
Aussagen. Die Suite besitzt keine serverseitige Fachlogik und keinen
automatischen Cloud-Sync. Bei aktivem Netzwerk können jedoch folgende
Verbindungen entstehen:

| Grenze | Übertragene Information | Nicht Teil dieses Pfads |
| --- | --- | --- |
| **Yahoo über Loopback-Proxy** | Symbol beziehungsweise Suchbegriff und bei Charts Zeitfenster/Intervall; der Proxy leitet dies an Yahoo weiter | Depotmenge, Cost Basis, Bedarf, Profil- oder Haushaltszustand |
| **Inflationsquellen** | feste deutsche Reihenkennung und Zieljahr an ECB, World Bank oder OECD | persönliche Finanzdaten |
| **CAPE-Abruf** | Abruf der fest konfigurierten Yale-/Mirror-Ressource über `r.jina.ai` | Profil- oder Simulationswerte |
| **Google Fonts** | Stylesheet-/Font-Request mit üblichen Netzwerkmetadaten, wenn die HTML-Seite online lädt | Fachzustand der Suite |
| **Worker-Telemetrie** | keine Remote-Übertragung; opt-in Laufzeitmessung im lokalen Prozess, in Konsole beziehungsweise manuell exportierbar | kein Analyse-Backend |
| **Export/Backup** | lokale Datei erst durch ausdrückliche Nutzeraktion | kein automatischer Upload |

Persistierte Eingaben, Profile, Tranchen und Ergebnisse bleiben im gewählten
lokalen Backend, solange der Nutzer sie nicht selbst exportiert oder außerhalb
der Suite weitergibt. Netzwerkprovider sehen dennoch IP-/Transportmetadaten und
die oben genannten Abrufparameter. Eine pauschale Aussage „keine Daten
verlassen den Rechner“ wäre deshalb falsch.

Die Tauri-CSP erlaubt unter `connect-src` nur die dokumentierten lokalen Proxy-
und HTTPS-Ziele; `worker-src` erlaubt `'self'` und `blob:`. Google-Font-Ziele
stehen separat unter `style-src`/`font-src`. Die bestehende Policy benötigt noch
`unsafe-inline` und `unsafe-eval`; das ist eine dokumentierte technische
Restgrenze und kein allgemeiner Sicherheitsnachweis. Browserbetrieb unterliegt
zusätzlich den CORS- und Sicherheitsregeln des verwendeten Browsers.

### B.1.2c Offline-Bedeutung und Live-Daten

Berechnung, lokale Persistenz und manuelle Eingabe bleiben nach lokalem Laden
der Assets ohne Internet nutzbar. Google Fonts degradieren auf lokale
Fallback-Schriften; Live-Kurse, Inflation und CAPE können dann nicht neu
abgerufen werden. Normale Planung darf dadurch nicht mit einem White-Screen
oder Datenverlust enden. Ein bereits bestätigter, atomarer Jahresabschluss hat
jedoch strengere Regeln: Schlägt ein für diesen Commit erforderlicher
periodengebundener Schritt fehl, wird nicht still mit einem falschen Stichtag
weitergeschrieben, sondern in den Recovery-Pfad gewechselt (B.2.5).

| Quelle | Laufzeitpfad | Contract-Grenze |
| --- | --- | --- |
| Yahoo Finance | Browser: Node-Proxy aus `start_suite.cmd`/`.ps1`; Tauri: Rust-Proxy in `src-tauri/src/lib.rs` | Loopback only; fachliche Quote- und Stichtagsvalidierung vor Write |
| ECB, World Bank, OECD | direkter HTTPS-Fetch aus Browser/Tauri-WebView | feste Fallback-Reihenfolge, exaktes Zieljahr und gemeinsame Inflationsmetrik |
| Yale/CAPE-Mirror | direkter HTTPS-Fetch über `r.jina.ai` | Quelle, Stichtag und Fetchstatus werden getrennt persistiert; lokaler Fallback möglich |

Neue externe Ziele benötigen in derselben Änderung einen Code-/CSP-Abgleich und
eine Aktualisierung von `docs/reference/DATA_SOURCES.md`.

---

## B.1.3 Plattform- und Validierungsstatus

Plattformangaben verwenden in diesem Dokument drei getrennte Reifegrade:

- **buildbar:** Quellcode, Konfiguration und Host-Toolchain beschreiben einen
  Build- beziehungsweise Startpfad;
- **validiert:** der konkrete Pfad besitzt einen datierten automatisierten Test
  oder manuellen Smoke-Nachweis;
- **ausgeliefert:** ein benanntes Artefakt wurde tatsächlich über einen
  dokumentierten Distributionskanal bereitgestellt.

Ein konfiguriertes Tauri-Bundleziel ist damit nicht automatisch ein validierter
oder ausgelieferter Desktop-Build.

| Laufzeit / Plattform | Build- oder Startfähigkeit | Validierungsstand in diesem Repository | Auslieferungsnachweis |
| --- | --- | --- | --- |
| **Browser unter Windows** | `start_suite.cmd` und `start_suite.ps1` starten lokalen Webserver und optionalen Yahoo-Proxy | HTML-Einstiege werden automatisiert mit Playwright/Chromium geprüft; Windows bleibt zusätzlich der gepflegte manuelle Nutzungspfad | Quellbetrieb, kein separates Binärartefakt |
| **Browser unter macOS/Linux** | ES-Module können grundsätzlich über einen beliebigen lokalen HTTP-Server geladen werden; ein `start_suite.sh` gehört nicht zum Repository | keine vollständige OS-/Browser-Matrix nachgewiesen; das Browser-Gate deckt Chromium, nicht jede WebKit-/Firefox-/Datei-API-Variante ab | nicht separat paketiert |
| **Tauri unter Windows** | dedizierter Releasepfad über `build-tauri.bat`/`npm run build-tauri-exe`; lokale Artefakte waren am 2026-07-15 vorhanden | CSP-, Rust- und Build-Contracts sind testbar; ein manueller Desktop-Smoke muss je Release gesondert dokumentiert werden | aus dem lokalen Git-Status allein nicht ableitbar |
| **Tauri unter macOS/Linux** | `bundle.targets: "all"` beschreibt Buildabsicht auf einem passenden Host | kein aktueller Build-, Smoke- oder Signierungsnachweis in der geprüften Arbeitskopie | kein in diesem Dokument belegtes `.app`-, `.dmg`-, AppImage- oder `.deb`-Release |

Native Builds sind host- und toolchainabhängig. Die Windows-Orchestrierung ist
nicht als Cross-Compiler für macOS oder Linux zu lesen. Aussagen wie „native
Desktop-App für alle Plattformen ausgeliefert“ oder feste Paketgrößen sind ohne
Artefakt- und Releasebeleg unzulässig.

### B.1.3a Browserstart

Ein HTTP-Ursprung ist erforderlich, weil die Suite native ES-Module und Worker
lädt; ein direkter `file://`-Start ist kein unterstützter Hauptpfad. Unter
Windows sind die Repository-Skripte autoritativ. Auf anderen Plattformen kann
ein lokaler statischer Server verwendet werden, der Yahoo-Proxy und dessen
Lifecycle müssen dann bei Bedarf separat bereitgestellt werden. Daraus folgt
keine automatische Kompatibilitätsfreigabe für jede Browser-/OS-Kombination.

### B.1.3b Persistenz je Laufzeit

`app/shared/persistence-facade.js` kapselt das Backend, damit Feature-Module
nicht direkt zwischen Browser-IndexedDB, Tauri-Datei und Fallback unterscheiden.

| Laufzeit | Live-State | Snapshot-Archiv | Rolle von `localStorage` |
| --- | --- | --- | --- |
| **Browser mit IndexedDB** | Datenbank `ruhestand-suite`, Version 2, Store `kv` plus `metadata` | separater Store `snapshots` in derselben Datenbank | einmalige Legacy-Migration, danach nicht primäre Source of Truth |
| **Tauri** | App-Daten-Datei `ruhestand_suite_data.json` | separate Datei `ruhestand_suite_snapshots.json` über Target `snapshots` | einmalige Migration erlaubter WebView-Legacy-Keys |
| **Browser-Fallback** | Storage-like Zugriff auf `localStorage` | `rs_snapshot_archive_v1` | Fallback und Kompatibilität, nicht mit IndexedDB gleichzusetzen |

Der unterstützte Plattformwechsel läuft über das zentrale Komplettbackup und
den bestätigten Komplettimport. Jahresabschluss-Snapshots sind adapterinterne
Sicherungspunkte und kein Geräte- oder Profil-Merge-Format. Manuelles Kopieren
einzelner `localStorage`-Keys ist nur ein Legacy-/Debugpfad.

---

## B.2 Balance-App: Architektur und Modulzuschnitt

Die Balance-App ist die operative Jahresplanungsoberfläche. Sie beantwortet jedes Jahr dieselbe praktische Frage: Welche Entnahme ist unter den aktuellen Markt-, Steuer-, Liquiditäts- und Profilbedingungen sinnvoll, welche Transaktionen sind dafür nötig und welche Diagnose erklärt die Entscheidung? Dafür liest sie Profil- und UI-Daten, ruft die gemeinsame `EngineAPI` für ein einzelnes Planungsjahr auf, bereitet Handlungsempfehlungen und Diagnose-Payloads auf und persistiert Eingaben, Guardrail-/Steuerzustand, Snapshots und Ausgabenhistorie.

Der Detailkatalog in `docs/reference/BALANCE_MODULES_README.md` ergänzt diese Beschreibung mit Exportlisten. Die fachliche Architektur steht hier: Balance ist eine UI-nahe Orchestrierungsschicht um die deterministische Engine, nicht selbst der Ort für Steuer-, Guardrail- oder Marktregime-Kernlogik.

### B.2.1 Modulcluster

| Cluster | Module | Verantwortung |
|---------|--------|---------------|
| **Bootstrap und Orchestrierung** | `balance-main.js`, `balance-main-profile-sync.js`, `balance-main-profilverbund.js`, `balance-update-pipeline.js`, `balance-action-postprocessor.js` | App-Initialisierung, Engine-Handshake, Update-Zyklus, Profilwerte in Inputs spiegeln, Profilverbund-Läufe, Renderer-/Persistenz-Payloads, Action-Nachbearbeitung |
| **Konfiguration und Utilities** | `balance-config.js`, `balance-utils.js` | App-Konfiguration, Engine-Versionserwartung, Fehlerklassen, Währungs-/Zahlen-/Prozentformatierung, Zugriff auf Engine-Konfiguration |
| **Input und Persistenz** | `balance-reader.js`, `balance-storage.js`, `balance-guardrail-reset.js` | DOM-Input-Lesen, Input-Side-Effects, PersistenceFacade-Anbindung, internes Snapshot-Archiv, Erhalt von `lastState.taxState`, Reset-Erkennung für Guardrail-Historie |
| **Event-Binding und Workflows** | `balance-binder.js`, `balance-binder-annual.js`, `balance-binder-imports.js`, `balance-binder-snapshots.js`, `balance-binder-diagnosis.js` | Event-Hub, Tabs, Keyboard-Shortcuts, Import/Export, Snapshot-Aktionen, Diagnose-Kopie, Jahresabschluss und Jahresupdate |
| **Jahresperiode und Live-Daten** | `balance-annual-period.js`, `balance-annual-inflation.js`, `balance-annual-marketdata.js`, `balance-annual-modal.js`, `balance-annual-orchestrator.js`, `balance-binder-snapshots.js` | stabile Kalenderperioden-ID, Doppel-Commit-/Recovery-Status, Inflation, ETF-/CAPE-Abruf, Marktdaten-Nachrücken, Snapshot-gesicherter Commit und Ergebnisprotokoll |
| **Rendering** | `balance-renderer.js`, `balance-renderer-summary.js`, `balance-renderer-action.js`, `balance-renderer-diagnosis.js` | Summary, Marktstatus, Liquiditätsbalken, Handlungsempfehlungen, Steuer-/Cash-Aufschlüsselung, Diagnose-Container |
| **Diagnose** | `balance-diagnosis-format.js`, `balance-diagnosis-chips.js`, `balance-diagnosis-decision-tree.js`, `balance-diagnosis-guardrails.js`, `balance-diagnosis-keyparams.js`, `balance-diagnosis-transaction.js` | Diagnose-Payload normalisieren, Status-Chips, Entscheidungsbaum, Guardrail-Karten, VPW-/Key-Parameter, Transaktionsdiagnostik |
| **Ausgaben-Check** | `balance-expenses.js`, `balance-expenses-storage.js`, `balance-expenses-csv.js`, `balance-expenses-metrics.js`, `balance-expenses-renderer.js` | Monatsweise CSV-Importe pro Profil, Budgetvergleich, Median-basierte Jahreshochrechnung, Summary/Tabelle/Detaildialog, Storage `balance_expenses_v1` |
| **Profilverbund-Anbindung** | `balance-main-profilverbund.js`, `app/profile/profilverbund-balance.js`, `profilverbund-action-attribution.js`, `profilverbund-balance-ui.js` | Profilauswahl, ein Haushalts-Engine-Lauf, finale Quellen-/Steuerattribution, Asset-Summaries und getrennte Haushalts-/Profilzustände |
| **Tranchen-Anbindung** | `app/tranches/depot-tranchen-status.js`, `app/tranches/*manager*.js`, `depot-tranchen-manager.html` | Detailtranchen laden, aggregieren, in Inputs synchronisieren, Kursaktualisierung und Status-Badge bereitstellen |

**Aktueller Bestand (Commit `6ea3e7a`, ermittelt am 2026-07-15):** 36 JS-Module unter `app/balance/`. Profilverbund-, Profil- und Tranchenmodule liegen bewusst außerhalb dieses Ordners und werden von Balance genutzt.

### B.2.1a Zentrale Modulverantwortung

| Modul | Rolle im System | Wichtigste Verträge |
|-------|-----------------|---------------------|
| `balance-main.js` | Einstiegspunkt der Balance-App | Initialisiert DOM-Referenzen, Storage, Reader, Renderer, Binder und Profilverbund; prüft `EngineAPI.getVersion()` gegen `REQUIRED_ENGINE_API_VERSION_PREFIX`; stellt `update()` und `debouncedUpdate()` bereit |
| `balance-reader.js` | Input-Grenze zwischen DOM und Modell | Normalisiert Währungen, Prozentwerte, Checkboxen und abhängige Panels; liefert ein Engine-kompatibles Inputobjekt; übernimmt gespeicherte Inputs wieder ins Formular |
| `balance-storage.js` | Persistenzgrenze der Jahresplanung | Lädt/speichert Eingaben und `lastState` über die PersistenceFacade; migriert ältere lokale Daten; verwaltet das interne Snapshot-Archiv; erhält `taxState.lossCarry`, damit Verlustvorträge nicht durch Guardrail-Resets verschwinden |
| `balance-update-pipeline.js` | Fachliche UI-Pipeline nach dem Engine-Call | Formt Engine-Ergebnisse in Render-, Diagnose-, Budget- und Persistenzpayloads um; entscheidet, welche Teile persistiert und welche nur angezeigt werden |
| `balance-action-postprocessor.js` | Nachbearbeitung der Handlungsempfehlung | Merged Profilverbund-Actions und ergänzt Single-3-Bucket-Postprocessing, ohne die Engine-Entscheidung selbst zu ersetzen |
| `balance-binder.js` | Event-Hub | Bindet Formularänderungen, Tabs, Reset, Jahresabschluss, Import/Export, Snapshot-Aktionen, Diagnose-Kopie und Jahresupdate-Handler |
| `balance-binder-snapshots.js` | Jahres-Commit-Coordinator | Erzwingt Preflight, synchronen Pre-Flush, validierten Recovery-Snapshot, persistierte Commit-Phasen, Post-Write-Validierung und finalen Abschluss |
| `balance-renderer.js` | Render-Fassade | Verteilt die Darstellung auf Summary, Action und Diagnose; kapselt Toasts, Fehlermeldungen und Theme-Anwendung |
| `profilverbund-action-attribution.js` | Haushalts-/Profilgrenze | Attribuiert die bereits finalisierte Haushaltsaktion auf eigentümerbezogene Quellen, führt je Profil genau ein Steuer-Settlement aus und blockiert Reconciliation-Abweichungen |

Damit bleibt die Richtung klar: Reader und Storage übersetzen Randbedingungen in Daten, `balance-main.js` orchestriert, die Engine rechnet, Pipeline/Postprocessor bereiten auf, Renderer zeigen an, Binder verdrahtet Nutzeraktionen.

### B.2.2 Update-Zyklus

Der Balance-Update-Zyklus ist in `balance-main.js` und `balance-update-pipeline.js` aufgeteilt. Vereinfacht:

```javascript
async function update({ persist = true } = {}) {
    const engineApi = assertActiveEngineHandshake(boundHandshake, window.EngineAPI);
    syncProfileDerivedInputs();
    const inputData = UIReader.readAllInputs();
    validateBalanceInputs(inputData);

    const persistentState = StorageManager.loadState();
    const lastState = shouldResetGuardrailState(persistentState.inputs, inputData)
        ? preserveTaxStateOnly(persistentState.lastState)
        : persistentState.lastState;

    const profiles = loadProfilverbundProfiles();
    const profilverbundRuns = profiles.length > 1
        ? runOneHouseholdSimulationAndAttribute(inputData, profiles)
        : null;
    const modelResult = profilverbundRuns?.householdResult
        ?? engineApi.simulateSingleYear(inputData, lastState);
    if (modelResult?.error) throw modelResult.error;

    const uiPayload = buildBalanceUiPayload(modelResult, profilverbundRuns);

    UIRenderer.render(uiPayload);
    UIRenderer.renderDiagnosis(uiPayload.diagnosis);
    updateExpensesBudget(uiPayload.budget);
    if (persist) persistSuccessfulResult(modelResult, profilverbundRuns);
    return { ok: true, status: 'success', inputData, modelResult };
}
```

Wichtige Verträge:

- Beim Bootstrap wird die konkrete `EngineAPI`-Objekt-, Versions- und
  Methodenreferenz gebunden. Eine fehlende, inkompatible oder nachträglich
  ausgetauschte Engine blockiert bereits vor Input-Lesen, Rechnung und
  Persistenz; es gibt keinen stillen Cache-Busting-Scriptwechsel.
- `EngineAPI.simulateSingleYear()` bleibt der zentrale Rechenaufruf. Single-
  Profile erhalten einen Einzelaufruf; ein Profilverbund erhält genau einen
  Haushaltsaufruf und danach reine Attributionen, keine technischen
  Profil-Engine-Läufe.
- `balance-update-pipeline.js` bündelt Last-State, Diagnose-, Renderer- und
  Persistenzentscheidungen. Das öffentliche Update-Ergebnis unterscheidet
  `success`, `validation_error`, `engine_error` und `blocked`; `ok` bleibt der
  Kompatibilitätswert für Jahres- und Importaufrufer.
- `balance-action-postprocessor.js` ergänzt 3-Bucket-Postprocessing nur im
  Single-Profil-Pfad. Die im Profilverbund bereits einmal finalisierte
  Haushaltsaktion wird unverändert weitergereicht.
- Steuerzustand (`lastState.taxState`, insbesondere `lossCarry`) wird bei Guardrail-Resets erhalten, sofern nur die Guardrail-Historie invalidiert wird.
- Persistenz ist ausschließlich im erfolgreichen Pfad erlaubt. Der
  Import-Dry-Run nutzt denselben Update-Contract mit `persist: false`.

### B.2.2a Zustands- und Reset-Logik

Balance unterscheidet bewusst zwischen **Eingaben**, **Engine-Folgezustand** und **historischem Steuerzustand**:

- Eingaben beschreiben das aktuelle Planungsjahr: Bedarf, Vermögen, Renten, Tranchen, Marktdaten, Guardrail- und VPW-Parameter.
- `lastState` enthält Engine-Folgewerte aus Vorjahren, z. B. ATH-/Guardrail-Historie, geglättete Dynamic-Flex-Werte und Steuerzustand.
- `balance-guardrail-reset.js` erkennt Eingriffe, die historische Guardrail-Aussagen fachlich entwerten würden, etwa starke Änderungen bei Bedarf, Vermögen, Rentenstatus oder Marktdaten.
- Ein Reset bedeutet nicht automatisch „alles vergessen“: Steuerliche Verlustvorträge bleiben erhalten, weil sie reale, jahresübergreifende Steuerhistorie abbilden.

Diese Trennung ist wichtig, weil die Balance-App operativ genutzt wird: Nutzer können reale Depot- und Bedarfswerte korrigieren, ohne dadurch steuerliche Vorträge oder Snapshots unabsichtlich zu verlieren.

### B.2.3 Rendering und Diagnose

`balance-renderer.js` ist die Fassade. Die eigentliche Darstellung ist auf Summary-, Action- und Diagnosemodule verteilt:

| Bereich | Module | Inhalt |
|---------|--------|--------|
| **Summary** | `balance-renderer-summary.js` | KPIs, Marktstatus, Liquiditätsbalken |
| **Action** | `balance-renderer-action.js` | Quellen/Verwendungen, Transaktionen, Cash-Rebalancing, finale Steuer inklusive Verlusttopf-Effekten |
| **Diagnosis** | `balance-renderer-diagnosis.js`, `balance-diagnosis-*` | Chips, Entscheidungsbaum, Guardrails, KeyParams, Transaktionsdiagnose, kopierbarer Diagnose-Export |

Die Diagnosemodule sind in thematische Untermodule aufgeteilt, um einen großen Renderer-Monolithen zu vermeiden. Neue Diagnosebausteine gehören in ein thematisches `balance-diagnosis-*` Modul; `balance-renderer-diagnosis.js` dient als Integrationsschicht.

Die Diagnose ist fachlich Teil der Entscheidung, nicht bloß Debug-Ausgabe. Sie erklärt:

- warum ein Marktregime gewählt wurde,
- welche Guardrails ausgelöst oder nicht ausgelöst haben,
- wie Floor, Flex, VPW-Rahmen und freigegebener Flex zusammenhängen,
- warum bestimmte Transaktionen geplant oder unterlassen wurden,
- welche Steuer- und Verlusttopf-Effekte in der finalen Handlungsempfehlung stecken.

Für Nutzer ist damit nachvollziehbar, ob die App wegen Liquidität, Marktregime, Steueroptimierung, Gold-/Geldmarktgewichtung oder Budgetgrenzen handelt.

### B.2.4 Persistenz, Snapshots und Importe

| Speicherbereich | Modul(e) | Inhalt |
|-----------------|----------|--------|
| **Live-State** | `balance-storage.js`, `app/shared/persistence-facade.js`, Adapter unter `app/shared/persistence-adapter-*.js` | Eingaben, `lastState`, Profil-/Simulator-/Tranchen-Records und Metadata im aktiven Backend |
| **Snapshot-Archiv** | `app/shared/snapshot-archive.js`, `balance-binder-snapshots.js`, Adapter-Snapshot-Methoden | Jahresabschluss- und manuelle Snapshots im kanonischen Format `persistence-records-v1`, getrennt von Live-Daten |
| **Profil-State** | `app/profile/profile-storage.js`, `profile-key-policy.js`, `profile-live-storage.js`, `profile-bundle-io.js` | Profilregistry, aktive Profile, profilbezogene Live-Daten-Isolation, Bundle-Import/-Export |
| **Ausgaben-State** | `balance-expenses-storage.js` | Jahres-/Monatscontainer je Profil unter `balance_expenses_v1` |
| **Tranchen-State** | `app/tranches/*`, Profilbundle | Depot-Tranchen, Kurs-/Statusdaten, Profilherkunft bei Multi-Profil-Setups |
| **Import/Export** | `balance-binder-imports.js`, `app/shared/persistence-backup.js`, `profile-bundle-io.js` | Komplettbackup/-import, Profilbundle, CSV-Importpfade |

Für CSV-Ausgabenimporte liegt Parsing in `balance-expenses-csv.js`, Kennzahlenberechnung in `balance-expenses-metrics.js` und DOM-Ausgabe in `balance-expenses-renderer.js`.

Die Persistenzschicht ist in drei Ebenen getrennt:

1. **Live-Persistenz:** `PersistenceFacade` hält einen synchron lesbaren In-Memory-Cache und schreibt asynchron über den aktiven Adapter. Browser nutzt IndexedDB `ruhestand-suite` Version 2 mit Store `kv`; Tauri nutzt `ruhestand_suite_data.json`.
2. **Snapshot-Archiv:** `SnapshotArchive` baut und validiert kanonische Snapshots. Browser speichert sie im IndexedDB-Store `snapshots`; Tauri speichert sie in `ruhestand_suite_snapshots.json`; der localStorage-Fallback nutzt `rs_snapshot_archive_v1`. `listSnapshots()` liefert nur Indexdaten ohne `records`.
3. **Komplettbackup/Profilbundle:** Export/Import ist der Austausch- und Recovery-Pfad zwischen Browser und Tauri. Er liest aus der Live-Persistenz, nicht aus alten Snapshot-Keys.

#### B.2.4a Adapter-, Cache- und Flush-Contract

```text
Feature-Code
   └── synchrone Storage-like API der PersistenceFacade
         ├── In-Memory-Cache
         ├── dirtyKeys / deletedKeys
         └── serialisierte Flush-Kette
               ├── Browser mit IndexedDB
               ├── Tauri JSON File
               └── localStorage-Fallback
```

Die Facade wählt das Backend einmal aus der Laufzeit. Erlaubte Legacy-Keys
werden nur dann automatisch in IndexedDB beziehungsweise Tauri migriert, wenn
das Ziel leer ist und noch kein passender Migrationsmarker existiert. Ist ein
bereits migriertes Ziel später leer, wird nicht still wieder aus alten
`localStorage`-Daten befüllt; stattdessen entsteht eine Recovery-Warnung.

Schreibaufrufe aktualisieren zunächst den synchronen Cache und markieren Keys.
`flush()` serialisiert konkurrierende Batches. Bei einem Adapterfehler werden
die noch offenen Änderungen wieder als dirty/deleted vorgemerkt, statt als
gespeichert zu gelten. `replaceLiveRecords()` arbeitet auf einem explizit
gefilterten Delete-/Upsert-Satz; bei einem Fehler muss der sichtbare Cache auf
den vorherigen Satz zurückkehren. Der Tauri-Schließpfad verhindert das
Fensterschließen kurzzeitig, flusht und bestätigt das Schließen danach über
`confirm_app_close`.

#### B.2.4b Import- und Recovery-Grenzen

| Vorgang | Vorbedingung und Sicherung | Write-Grenze | Fehlerverhalten |
| --- | --- | --- | --- |
| **Balance-Zustandsimport** | aktuelles/Legacy-Schema validieren, Inputs anwenden, kompletter Engine-Dry-Run mit `persist: false`, Pre-Flush und zurückgelesener interner Snapshot `balance-import-recovery` | ersetzt nur den kanonischen Balance-State-Key | nachgelagerte Update-/Bestätigungsfehler lösen automatischen Snapshot-Rollback aus; misslingt dieser, bleibt die Snapshot-ID für manuellen Restore sichtbar |
| **Komplettimport** | Backup-Typ/Shape prüfen, Nutzerbestätigung und vor dem Replace heruntergeladenes Recovery-Komplettbackup; bei leerem Altbestand darf diese Datei entfallen | ersetzt alle im Bundle zugelassenen Live-Records und lädt die App neu | Recovery-Datei ist ein nutzerverwalteter Wiederimportpfad, kein behaupteter automatischer interner Rollback |
| **Profilbundle** | profilbezogener Bundle-Contract und Registry-Prüfung | Profil-/Transfer-Keys gemäß Profilmodulen | kein Ersatz für einen Komplettbackup-Restore |
| **Snapshot-Standard-Restore** | validiertes `persistence-records-v1` und vorhandenes `activeProfileId` in der aktuellen Registry | nur erlaubte Live-Keys des Snapshot-Profils; Registry und Snapshot-Historie bleiben erhalten | fehlende Profilzuordnung oder ungültiger Snapshot blockiert vor dem Replace |

Der Jahresabschluss erzeugt den Snapshot vor Inflation, Altersfortschreibung und Ausgabenjahr-Rollover. Schlaegt der Pre-Flush oder die Snapshot-Erstellung fehl, wird der Jahresabschluss ohne Mutation abgebrochen. Schlaegt erst der Post-Mutation-Flush fehl, bleibt der Pre-Mutation-Snapshot als Recovery-Punkt erhalten und der Fehler wird gemeldet.

Standard-Restore ist bewusst begrenzt. Er schreibt nur erlaubte Live-Records zurueck, erhaelt die Snapshot-Historie, bewahrt die Profil-Registry, setzt `rs_current_profile`/`rs_active_profile` auf das Snapshot-Profil und bricht ab, wenn `snapshot.activeProfileId` in der aktuellen Registry nicht mehr existiert. Er ist kein Profil-Merge und kein Austauschformat zwischen Geraeten.

Legacy-Snapshots mit Prefix `ruhestandsmodell_snapshot_` werden erkannt und in das kanonische Archiv migriert, sofern sie gueltig und standard-restore-faehig sind. Archivdaten duerfen nicht in neue Live-Snapshots eingebettet werden und gehoeren weder in `ruhestand_suite_data.json` noch in normale Komplettbackup-Records.

#### B.2.4c Korruption und Tauri-Quarantäne

Korruption wird nicht einheitlich als „leer“ normalisiert. Der Recovery-Pfad
hängt von der betroffenen Ownership-Grenze ab:

| Betroffener Bereich | Erkennung | Schutzreaktion |
| --- | --- | --- |
| **Tauri-Live-Datei** `ruhestand_suite_data.json` | JSON-Parsing beim Adapter-Open schlägt fehl | Rust versucht die Datei nach `ruhestand_suite_data.corrupt.<timestamp>.json` umzubenennen; die Facade startet ohne stille Legacy-Rückmigration mit leerem Cache und `tauri-state-corrupt`-Warnung. Der lokale Quarantänepfad wird nicht in die Balance-UI kopiert. |
| **Separates Tauri-Snapshot-Archiv** | ungültiges Archivschema oder JSON beim Öffnen | Fehler wird weitergegeben; der automatische Live-Datei-Quarantänevertrag darf nicht pauschal auf die Snapshot-Datei übertragen werden. |
| **Ausgaben-Store** `balance_expenses_v1` | JSON-, Shape-, Versions- oder Lesefehler | Status `corrupt`, Rohinhalt bleibt erhalten und normale Writes sind gesperrt. Reset erst nach Recovery-Export und Bestätigung; ein Flushfehler stellt den Rohinhalt wieder her. |
| **Tranchen-Store** `depot_tranchen` | korrupter JSON-Text, Schema-/Klassifikationsfehler oder doppelte IDs | `corrupt` bleibt raw-erhaltend und schreibgesperrt; Backend-/IO-Fehler heißen separat `unavailable` und bieten Retry statt Reset. |

Die Tauri-Quarantäne priorisiert Startfähigkeit und Datenrettung, ist aber kein
automatischer fachlicher Restore. Nutzer müssen den Warnzustand prüfen und
gegebenenfalls ein Komplettbackup importieren. Umgekehrt sind die
bereichsspezifischen `corrupt`-Zustände fail-closed: Sie erlauben keinen
normalen Write, solange Recovery oder bestätigter Reset aussteht.

### B.2.5 Jahresupdate und Live-Daten

Der Jahreswechsel ist kein Bündel unabhängiger Buttons mehr. Sowohl
„Jahres-Update“ als auch „Jahresabschluss“ laufen durch denselben Coordinator in
`balance-binder-snapshots.js`. Die fachliche Einheit ist das abgeschlossene
Kalenderjahr mit stabiler ID `calendar-year:<YYYY>`.

| Modul | Vertrag |
| --- | --- |
| `balance-annual-period.js` | DOM-/persistenzfreier Plan, Status- und Doppel-Commit-Contract für Alter, Inflation, Marktdaten und Ausgaben-Rollover derselben Periode |
| `balance-binder-snapshots.js` | In-Flight-Sperre, Preflight, Flush, validierter Recovery-Snapshot, persistierte Commit-Phasen, Post-Write-Prüfung und Abschluss/Recovery |
| `balance-annual-orchestrator.js` | fachliche Write-Sequenz Alter -> Inflation -> ETF/Nachrücken -> CAPE -> Profil-Sync und Ergebnisprotokoll |
| `balance-annual-inflation.js` | exaktes Zieljahr, Provider-Fallback und gemeinsame Inflationsmetrik; Bedarfs- und kumulierte Inflationsfortschreibung |
| `balance-annual-marketdata.js` | periodengebundener ETF-Jahresendkurs, Stichtagsmetadaten, lokaler Rollback sowie davon getrennte CAPE-Provenienz |
| `balance-annual-modal.js` | sichtbares Protokoll aller Teilschritte und Fehler |

#### B.2.5a Perioden- und Statusvertrag

`annualPeriodMetadata` besitzt Schema 1, `lastCommittedPeriod` und entweder
`pendingCommit: null` oder einen Recovery-Eintrag mit `periodId`, `snapshotId`
und einer der Phasen `snapshot_confirmed`, `writes_started`, `validating`.

| Status | Bedeutung | Darf mutieren? |
| --- | --- | --- |
| `legacy_confirmation_required` | Altdaten besitzen noch keine Periodenmetadaten; Nutzer muss „offen“ oder „bereits abgeschlossen“ bestätigen | nein |
| `ready` | Zieljahr, Alter, Metadaten und abgeleiteter Plan sind konsistent | erst nach Bestätigung, Flush und Snapshot |
| `already_committed` | dieselbe Periode wurde vollständig abgeschlossen | nein; idempotenter Erfolgshinweis |
| `incomplete_recovery` | ein Commit besitzt einen bestätigten Snapshot, ist aber nicht vollständig abgeschlossen | nein; weiterer Jahresprozess bleibt bis Restore blockiert |
| `invalid` | Jahr, Plan, Schema, Alters- oder Metadatencontract ist verletzt | nein |

Das UI-Zieljahr muss dem abgeschlossenen Kalenderjahr entsprechen und zugleich
das aktuell angezeigte Ausgabenjahr sein. Rückwärts-Commits, manipulierte
abgeleitete Planfelder, fehlende Snapshot-ID und die Wiederholung einer bereits
abgeschlossenen Periode werden vor neuen Writes abgelehnt.

#### B.2.5b Zustandsfolge des Jahres-Commits

```text
Vorprüfung
  - Engine-Handshake und nebenwirkungsarmer Balance-Update-Check
  - Jahres-ID, Alter, Metadaten, Ziel-/Ausgabenjahr und Doppel-Commit prüfen
        │
        ▼
synchroner Pre-Flush
        │
        ▼
Recovery-Snapshot erzeugen, wiederauflisten, lesen und Records validieren
        │
        ▼
pendingCommit.phase = snapshot_confirmed persistieren
        │
        ▼
pendingCommit.phase = writes_started persistieren
        │
        ▼
fachliche Writes
  Alter +1 -> Inflation -> periodengebundener ETF/ATH -> CAPE
  -> kumulierte Inflation -> Ausgabenjahr +1
        │
        ▼
pendingCommit.phase = validating persistieren
        │
        ▼
Alter und Ausgaben-Folgejahr prüfen -> synchroner Post-Write-Flush
        │
        ▼
lastCommittedPeriod setzen, pendingCommit löschen und final flushen
        │
        ├── Erfolg: already_committed
        └── Fehler nach Snapshot: incomplete_recovery -> Snapshot-Restore nötig
```

Vor dem bestätigten Snapshot ist ein Fehler `invalid` und darf keine fachliche
Jahresmutation hinterlassen. Nach dem Snapshot bleibt dessen ID in den
persistierten Metadaten erhalten. Ein erneuter Klick oder App-Neustart darf
dann keinen zweiten Snapshot und keine zweite Jahresmutation erzeugen. Erst der
Restore des referenzierten Pre-Mutation-Snapshots hebt die Recovery-Sperre auf.
Der Marktdatenhandler besitzt zusätzlich einen lokalen DOM-/State-Rollback für
Fehler während seines eigenen Schritts; dieser ersetzt nicht den übergeordneten
Jahres-Recovery-Punkt.

#### B.2.5c Stichtage, Fallbacks und Provenienz

„Optional live“ bedeutet, dass normale Planung mit manuell gepflegten oder
bereits gespeicherten Werten möglich bleibt. Es bedeutet nicht, dass ein
begonnener atomarer Jahres-Commit ungültige oder periodenfremde Daten still
akzeptiert.

| Datenbereich | Ziel-/Stichtagscontract | Provenienzfelder | Fehler- und Fallbackverhalten |
| --- | --- | --- | --- |
| **Inflation** | exakt das abgeschlossene Zieljahr; normalisiert auf `consumer_prices_all_items_annual_average_growth_pct`, Rate `-10` bis `50` | `rate`, `year`, `source`, `dataAsOf`, `fetchStatus`, `metric` | ECB -> World Bank -> OECD, je eigener Timeout; falsche Reihe/Jahr, Mehrdeutigkeit und unplausible Werte werden verworfen. Scheitern alle Quellen, bleiben Bedarfswerte unverändert und der Jahres-Commit wechselt in Recovery. Deflation wird nicht auf null geklemmt. |
| **ETF/ATH** | `VWCE.DE`, UTC-Fenster 27.12. bis exklusiv 01.01. des Folgejahres; letzter gültiger Schlusskurs vom 27.-31.12. des Zieljahres, Preis `0,50` bis `100.000` EUR | `annualMarketDataMeta`: Schema, Preis, ISO-`asOf`, Ticker, Quelle, Zieljahr, Perioden-ID sowie stichtagsgleiche ATH-Auswertung | erfordert laufenden Commit in Phase `writes_started` samt Snapshot-ID. Falsches/stales Jahr, leerer Chart, unplausibler Preis oder Proxyfehler blockieren fail-closed; alte Inputs werden lokal zurückgestellt. |
| **CAPE** | jüngster plausibler Datensatz der konfigurierten Yale-/Mirror-Ressource; nicht an denselben ETF-Stichtag gekoppelt | `capeAsOf`, `capeSource`, `capeFetchStatus`, `capeUpdatedAt` | Primary -> Mirror -> gespeicherter Wert. Ein gespeicherter oder veralteter Wert wird ausdrücklich gekennzeichnet. Ohne Quelle und ohne gespeicherten Wert entsteht ein Teilschrittfehler; beim atomaren Abschluss ist er commit-blockierend. |
| **Tranchenquotes** | aktueller positiver EUR-Preis, Symbolgleichheit, plausible UTC-Sekunde; höchstens sieben Kalendertage alt und maximal fünf Minuten in der Zukunft | Symbol, Preis, Währung, Quote-Zeit und Quelle im Quote-Ergebnis | Batch dedupliziert Symbole, schreibt gültige Teilerfolge einmal und lässt fehlerhafte Lots unverändert; ohne Erfolg kein Write. Keine implizite FX-Konvertierung. |

`docs/reference/DATA_SOURCES.md` ist die operative Quellen- und
Provenienzreferenz. Ein Abrufzeitpunkt ersetzt dort nicht den fachlichen
Datenstichtag (`asOf` beziehungsweise `dataAsOf`).

### B.2.6 Profilverbund und Tranchen

Balance nutzt dieselbe Profilregistry wie Simulator und Startseite.
`balance-main-profile-sync.js` spiegelt Einzelprofilwerte in die Balance-Inputs;
`balance-main-profilverbund.js` orchestriert dagegen einen gemeinsamen
Haushaltslauf. Detailtranchen ersetzen dabei die zugehörigen aggregierten
Depotwerte, damit Vermögen nicht doppelt gezählt wird. Jede zusammengeführte
Tranche trägt eine haushaltsweit eindeutige `trancheId` und ihre
`sourceProfileId`.

```text
aktive Profile und eigentümerbezogene Tranchen
        │
        ▼
Haushaltsbedarf, Renten, Vermögen und Detailtranchen aggregieren
        │
        ▼
genau ein EngineAPI.simulateSingleYear(householdInput, householdLastState)
        │
        ▼
finale Haushaltsentnahme und Haushaltsverwendungen
        │
        ├── optional: 3-Bucket-Aktion einmal auf Haushaltsebene finalisieren
        ▼
Entnahme und Quellen auf Profile/Lots attribuieren
        │
        ▼
je Eigentümer genau ein Steuer-Settlement
        │
        ▼
Haushaltssummen und Liquiditäts-KPIs reconciliieren oder fail-closed abbrechen
```

Es gibt im technischen Multi-Profil-Pfad keine nachgelagerten
Einzelprofil-Engine-Läufe. Die profilbezogenen Ergebnisobjekte sind reine
Attribution der bereits getroffenen Haushaltsentscheidung; sie dürfen keinen
zweiten Spending-, Guardrail-, 3-Bucket- oder Transaktionszweck erzeugen.

**Zustands- und Steuerownership:** Der gemeinsame Engine-Folgezustand hält
Guardrail-, VPW- und Marktgedächtnis als `profilverbundHouseholdLastState`. Sein
temporäres Engine-Steuerergebnis wird nicht als gemeinsamer Verlusttopf
fortgeschrieben. Jedes Profil behält stattdessen seinen eigenen
`lastState.taxState`, Sparer-Pauschbetrag und Kirchensteuersatz. Nach der
Quellenattribution wird `settleTaxYear()` je Eigentümer genau einmal auf dessen
signierte Rohaggregate angewandt; `taxStateNext` geht nur an dieses Profil.
Haushalts-Guardrail-State und profilbezogene Steuerzustände bleiben damit
getrennte Sources of Truth.

Für die Entnahme- und Quellenauswahl bestehen drei Modi:

| Modus | Prinzip | Zweck |
|-------|---------|-------|
| `tax_optimized` | Profile und konkrete Tranchen nach der marginalen profilbezogenen Steuerwirkung auswählen | Verlusttopf und Pauschbetrag des Eigentümers berücksichtigen |
| `proportional` | Entnahme nach verfügbarem Vermögensanteil verteilen | Profile proportional belasten |
| `runway_first` | Profilverteilung nach positiven Runway-Zielgewichten bilden | unterschiedliche Liquiditätspuffer in der Verteilung berücksichtigen |

Die Attribution arbeitet centgenau und fail-closed: Der beschlossene
Haushaltsbedarf muss vollständig verteilbar sein; jede Verkaufsquelle braucht
eine bekannte `sourceProfileId` und vollständige signierte Steuerrohwerte; die
Summe der finalen Nettoquellen muss innerhalb von 0,01 EUR den unveränderten
Haushaltsverwendungen entsprechen. Fehlende Kapazität, Provenienz oder
Reconciliation bricht den gesamten Multi-Profil-Pfad ab. Erst nach erfolgreicher
Attribution werden Haushaltssteuer, Diagnose und Liquiditäts-KPIs aus den
finalen Quellen neu aufgebaut.

**Tranchen-Contract:** Detailtranchen sind mehr als UI-Komfort. `types/tranche-contract.js` erzwingt Schema 1, eindeutige Lot-IDs, endliche Finanzwerte, explizite TQF und eine disjunkte Kategorie-/Typ-Matrix. Marktwert und Einstand werden aus Stueckzahl und Preisen abgeleitet. Gueltige unversionierte Altdaten werden deterministisch gelesen. Der Persistenz-Lesepfad migriert dabei ausschliesslich den von der frueheren Manager-UI erzeugbaren Fall eines alten Aktien-Typs unter einer eindeutigen Nicht-Aktien-Kategorie; Schema 1 und Engine-Eingaben bleiben strikt. Nicht automatisch behebbare Widersprueche, Duplikate und korrupter JSON-Rohtext bleiben unveraendert und blockieren fail-closed. Bei mehrprofiligen Haushalten muessen `trancheId` und `sourceProfileId` erhalten bleiben, damit spaetere Reduktionen nicht versehentlich Cost Basis oder Profilherkunft vermischen.

Der automatische Quote-Pfad akzeptiert nur positive EUR-Kurse mit Symbol,
Quelle und plausibler UTC-Zeit. Gültige Teilergebnisse eines deduplizierten
Batches werden in einem Commit geschrieben; fehlerhafte Lots behalten ihren
vorherigen Kurs. Eine implizite Fremdwährungsumrechnung ist nicht Teil des
Contracts.

Balance und Simulator sind schreibfrei gegen den Realbestand. Erst eine tatsaechliche Broker-Ausfuehrung darf im Profil-Assets-Manager nach schreibfreier Vorschau und separater Bestaetigung reconciliert werden. Der Write umfasst Live-Lot, profilgebundenes Lot und datensparsamen Auditverlauf in einem Flush; identische Wiederholungen sind No-ops. Die vollstaendige Modulgrenze steht in `TRANCHEN_MODULES_README.md`.

### B.2.7 Ausgaben-Check

Der Ausgaben-Check verbindet Jahresplanung mit tatsächlichen monatlichen Ausgaben:

- CSV-Import pro Profil und Monat.
- Speicherung unter `balance_expenses_v1` mit Jahres- und Monatscontainern.
- Monatliche Ampel mit 5%-Warnschwelle.
- Jahresverbrauch, Restbudget, Soll/Ist für importierte Monate.
- Jahreshochrechnung: ab zwei Datenmonaten Median statt Mittelwert.
- Profilverbund-Ansicht mit Profilspalten und aggregierter Gesamtspalte.
- Jahresabschlussintegration über `rollExpensesYear()`.

Die Modulgrenzen sind bewusst DOM-frei, wo möglich: Parsing und Kennzahlen lassen sich isoliert testen; Rendering und Event-Wiring bleiben in eigenen Modulen.

Der Ausgaben-Check ist fachlich die Brücke zwischen geplanter Jahresentnahme und realem Cashflow. Er ersetzt nicht die Engine-Entnahmeentscheidung, sondern prüft, ob der reale Verbrauch zur geplanten Budgetlogik passt. Die Median-Hochrechnung ist bewusst robuster als ein einfacher Durchschnitt, weil einzelne Sonderausgaben einen Jahresforecast sonst stark verzerren würden.

---

## B.3 Simulator: Architektur und Modulzuschnitt

Der Simulator ist die explorative Oberfläche der Suite. Während die Balance-App ein konkretes Planungsjahr operativ entscheidet, untersucht der Simulator ganze Lebenspfade: stochastisch per Monte Carlo, deterministisch per historischem Backtest, systematisch per Parameter-Sweep und automatisch per Auto-Optimize. Er nutzt dieselbe Engine-API wie Balance, ergänzt aber eigene Jahreslogik für Portfoliofortschreibung, Pflege-/Rentenereignisse, Ansparphase, Forced Sales, 3-Bucket-Bond-Puffer und Ergebnisaggregation.

Der Simulator ist deshalb nicht nur ein UI-Wrapper um `EngineAPI.simulateSingleYear()`. Er baut pro Simulationsjahr den passenden Haushalts-, Portfolio- und Marktkontext, ruft die Engine für die Entnahmeentscheidung auf und verarbeitet danach simulator-spezifische Effekte wie Auszahlung, Notverkäufe, Bond-Refill, Steuer-Recompute und Jahreslog.

### B.3.1 Modulcluster

| Cluster | Module | Verantwortung |
|---------|--------|---------------|
| **Bootstrap und UI-Fassade** | `simulator-main.js`, `simulator-main-init.js`, `simulator-main-tabs.js`, `simulator-main-input-persist.js`, `simulator-main-reset.js` | App-Start, Engine-Handshake, Tab-/Button-Bindings, Persistenz gemeinsamer Eingaben, Reset-Flow |
| **UI-Fachmodule** | `simulator-ui-pflege.js`, `simulator-ui-rente.js`, `simulator-main-partner.js`, `simulator-main-accumulation.js`, `simulator-main-dynamic-flex.js`, `simulator-main-3bucket.js`, `simulator-main-stress.js`, `simulator-main-sweep-ui.js` | Pflege-, Renten-, Partner-, Anspar-, Dynamic-Flex-, 3-Bucket-, Stress- und Sweep-spezifische UI-Logik |
| **Input-Layer** | `simulator-input-dom.js`, `simulator-input-care.js`, `simulator-input-pension.js`, `simulator-input-strategy.js`, `simulator-input-tranches.js`, `simulator-profile-inputs.js` | DOM-Inputs normalisieren, Profilverbund in Simulator-Inputs mappen, Strategie-/Pflege-/Renten-/Tranchenparameter strukturieren |
| **Portfolio und Tranchen** | `simulator-portfolio.js`, `simulator-portfolio-*.js`, `simulator-portfolio-tranches.js`, `simulator-portfolio-chart.js`, `simulator-year-portfolio.js` | Startportfolio, Detailtranchen, Renditefortschreibung, Aktien/Gold/Bonds, Anzeige und Reduktion von Portfolio-Bausteinen |
| **Jahressimulation** | `simulator-engine-wrapper.js`, `simulator-engine-direct.js`, `simulator-engine-input.js`, `simulator-engine-direct-utils.js`, `simulator-year-result.js`, `simulator-household-pension.js`, `simulator-accumulation-year.js` | Jahr-für-Jahr-Simulation, Engine-Input-Mapping, Rente/Witwenlogik, Ansparjahre, Ergebnis- und Logshape |
| **Sondersituationen nach Engine-Call** | `simulator-forced-sale.js`, `simulator-tax-recompute.js`, `simulator-bond-refill.js` | Liquiditätsdeckung nach Auszahlung, Forced Sales, Gesamt-Settlement-Recompute, 3-Bucket-Bond-Verkauf und Wiederauffüllung |
| **Monte Carlo** | `simulator-monte-carlo.js`, `monte-carlo-runner.js`, `monte-carlo-ui.js`, `mc-run-context.js`, `mc-year-sampling.js`, `stationary-bootstrap-contract.js`, `stationary-bootstrap-sampler.js`, `tail-risk-contract.js`, `tail-risk-overlay.js`, `mc-life-events.js`, `mc-stress-tracker.js`, `mc-log-builder.js`, `mc-run-metrics.js`, `monte-carlo-aggregates.js`, `monte-carlo-runner-utils.js`, `scenario-analyzer.js` | Run-Orchestrierung, deterministische Seeds, Startjahr-/CAPE-/Bootstrap-Sampling, Tail-Risk-Overlay, Life-State, Stressmetriken, Logs, KPIs, Szenarioauswahl |
| **Backtest, Sweep und Optimierung** | `simulator-backtest.js`, `simulator-sweep.js`, `sweep-runner.js`, `simulator-sweep-utils.js`, `simulator-heatmap.js`, `simulator-optimizer.js`, `simulator-visualization.js`, `auto_optimize*.js` | Historische Pfade, Sensitivitätsraster, Worker-kompatible Sweep-Runs, Heatmaps, Sensitivität/Pareto, automatische Parameteroptimierung |
| **Ergebnisdarstellung** | `simulator-results.js`, `results-metrics.js`, `results-renderers.js`, `results-formatting.js`, `simulator-formatting.js`, `simulator-main-helpers.js` | KPI-Karten, Szenario-/Backtest-Logs, CSV/JSON-Export, Spaltenkonfiguration, Formatierung |
| **Daten und Shared Utilities** | `simulator-data.js`, `simulator-utils.js`, `cape-utils.js`, `app/shared/shared-formatting.js` | Historische Daten, Mortalität/Pflege/Stress-Presets, RNG/Statistik, CAPE-Kandidaten, gemeinsame Formatter |

**Aktueller Bestand (Commit `6ea3e7a`, ermittelt am 2026-07-15):** 95 JS-Module unter `app/simulator/`. Profil-, Tranchen- und Shared-Module liegen teilweise außerhalb des Simulator-Ordners, sind aber Teil des fachlichen Datenflusses.

### B.3.2 Hauptflüsse

Der Simulator hat vier zentrale Ausführungspfade:

1. **Monte Carlo:** Viele Runs über zufällig oder gewichtet gezogene historische Jahre. Ergebnisse sind Verteilungen, Perzentile, Stressmetriken und ausgewählte Szenario-Logs.
2. **Historischer Backtest:** Ein deterministischer Pfad über echte historische Jahre. Ergebnis ist ein nachvollziehbarer Jahreslog für die Frage, ob ein Plan durch konkrete Sequenzen wie 2000-2003 oder 2008 getragen hätte.
3. **Parameter-Sweep:** Systematisches Raster über erlaubte Parameter. Ergebnis sind Sensitivitäten, Heatmaps und Vergleichstabellen.
4. **Auto-Optimize:** Kandidatengenerierung, Bewertung und Verfeinerung zur Suche nach robusten Parameterkombinationen unter Zielmetriken und Constraints.

Alle vier Pfade teilen dieselbe Jahreslogik, soweit möglich. Das reduziert fachliche Drift: Pflege, Rente, Steuer-Recompute, Dynamic Flex, 3-Bucket und Portfoliofortschreibung sollen im Backtest nicht anders funktionieren als in Monte Carlo oder Sweep.

### B.3.3 Jahr-für-Jahr-Pipeline

Die Kernpipeline eines Simulatorjahres sieht konzeptionell so aus:

```javascript
function simulateSimulatorYear(state, inputs, yearData, yearIndex) {
    applyAnnualReturnsToPortfolio(state.portfolio, yearData, inputs.decumulation);
    const household = computeHouseholdPensionAndLifeState(state, inputs, yearData);

    if (isAccumulationYear(state, inputs)) {
        return simulateAccumulationYear(state, inputs, yearData);
    }

    const engineInput = buildEngineInput({
        state, inputs, yearData, household, portfolio: state.portfolio
    });
    const engineResult = EngineAPI.simulateSingleYear(engineInput, state.lastEngineState);

    const payoutResult = applyPayoutAndForcedSales({
        engineResult, portfolio: state.portfolio, inputs, yearData
    });
    const taxResult = recomputeTaxSettlementIfNeeded({
        engineResult, payoutResult, taxStatePrev: state.taxState
    });
    const bondRefill = applyThreeBucketBondRefillIfNeeded({
        engineResult, portfolio: state.portfolio, inputs, yearData
    });

    return buildSimulatorYearResult({
        engineResult, payoutResult, taxResult, bondRefill, household, yearData
    });
}
```

Wichtige Verträge:

- Die Engine entscheidet über Entnahme, Guardrails, Marktregime, Ziel-Liquidität und reguläre Transaktionen.
- Der Simulator führt danach reale Simulationsmechanik aus: Auszahlung, Portfoliofortschreibung, Notverkäufe, Bonds-Puffer, Pflege-/Rentenstatus und Logs.
- Wenn nach dem Engine-Call zusätzliche Verkäufe nötig werden, wird die Steuer aggregiert neu berechnet, damit Sparer-Pauschbetrag und Verlusttopf nicht doppelt verbraucht werden.
- Der Jahreslog enthält additive Erklärfelder zu Entnahme, Payout, Liquidität, VPW, Steuer und 3-Bucket, ohne die Normalansicht zu überfrachten.

### B.3.4 Monte Carlo, Sampling und Workers

Monte Carlo ist in eine UI-Schicht (`simulator-monte-carlo.js`, `monte-carlo-ui.js`) und eine DOM-freie Rechenschicht (`monte-carlo-runner.js` plus `mc-*` Module) getrennt. Pro Run werden Seed, Startjahr, Stresskontext, Pflege-/Partnerstatus und Logauswahl deterministisch initialisiert. Dadurch darf Chunking oder Worker-Aufteilung die Ergebnisse nicht verändern.

Die Sampling-Logik umfasst:

| Modus | Bedeutung |
|-------|-----------|
| `UNIFORM` | Startjahre und Folgejahre historisch gleichgewichtet |
| `CAPE` | Auswahl über CAPE-nahe historische Startjahre mit Fallback-Toleranzen |
| `FILTER` | harte Begrenzung, z. B. Ausschluss früher Nachkriegsjahre |
| `RECENCY` | exponentielle Gewichtung jüngerer Historie über Half-Life |
| `block_bootstrap` | Blöcke zusammenhängender Jahre zur Erhaltung von Autokorrelation |
| `stationary` | variable Blocklaengen; Neustartwahrscheinlichkeit `1 / erwartete Blocklaenge`, deterministisch pro Run |
| `regime` | Markov-artige Regime-Transitions auf Basis historischer Regime |

Workers werden für Monte Carlo, Sweep und Auto-Optimize eingesetzt. `workers/worker-pool.js` steuert Queue, Chunking und Fallbacks; `workers/mc-worker.js` führt Worker-Jobs aus; Telemetrie ist optional und dev-only. Detaillierte Logs werden bewusst nicht für jeden Run im Worker transportiert, sondern nur für ausgewählte Szenarien aufgebaut.

### B.3.5 Portfolio, 3-Bucket und Bonds

Der Simulator modelliert das Portfolio nicht nur als Gesamtwert. Detailtranchen tragen Kategorie, Marktwert, Cost Basis, TQF, Typ und Profilherkunft. Aktien, Gold, Geldmarkt/Liquidität und optional Bonds werden unterschiedlich fortgeschrieben und verkauft. Zwei tiefe Kopiergrenzen isolieren Profilregistry und UI-State von diesen Mutationen. Teilverkaeufe reduzieren Stueckzahl, Marktwert und Cost Basis proportional; Vollverkaeufe entfernen das Lot und simulierte Kaeufe erzeugen eigene `simlot:`-Lots.

Der Strategie-Modus `3_bucket_jilge` erweitert die Entnahmelogik um einen Bond-/Anleihen-Bucket:

- In schlechten Jahren können Bond-Tranchen bevorzugt verkauft werden, um Aktienverkäufe zu vermeiden.
- In guten Jahren kann der Bond-Zieltopf wieder aufgefüllt werden.
- `bondTargetFactor` steuert die Zielgröße des Bond-Puffers.
- `bondRefillThreshold` kann eine Wiederauffüllschwelle definieren.
- Logs und CSVs zeigen in diesem Modus Bond-Verkäufe, Bond-Refill und `Bonds/Puffer` separat.

Fachlich ist das kein freies Rentenportfolio mit Duration-/Kuponmodell. Es ist ein defensiver Pufferbaustein innerhalb der Entnahmestrategie. Diese Abgrenzung muss mit dem Anlagemodell in der Übersicht konsistent bleiben.

### B.3.6 Profilverbund, Rente, Pflege und Ansparphase

`simulator-profile-inputs.js` überführt aktive Profile in ein kombiniertes Simulator-Inputobjekt. Dabei werden Bedarfe, Vermögen, Renten, Gold-Parameter und Tranchen zusammengeführt; Tranchen erhalten profilbezogene IDs und `sourceProfileId`, damit Verkäufe später korrekt auf Ursprungsprofile zurückgeführt werden können.

Renten- und Haushaltslogik sind als wiederkehrende Jahreslogik gekapselt:

- Rente 1 und Rente 2 haben eigene Start-, Steuer- und Indexierungsparameter.
- Indexierung kann fix, inflations- oder lohnbezogen erfolgen.
- Witwenrente wird über Haushaltsstatus und Partnerereignisse modelliert.
- Pflegeereignisse haben eigene Eintrittswahrscheinlichkeiten, Progression, Kosten, Dauer und Mortalitätsmultiplikatoren.
- Dual-Care-Metriken erfassen simultane Pflegejahre und maximale/kumulative Pflegekosten.

Die Ansparphase ist ein eigener Vor-Ruhestandsmodus: vor der Transition werden Sparraten und Marktrenditen fortgeschrieben, aber keine regulären Entnahmen gerechnet. Pflegeeintritt kann die Ansparphase vorzeitig beenden und in die Entnahmelogik wechseln.

### B.3.7 Ergebnis- und Logsystem

Ergebnisse sind bewusst mehrschichtig:

- KPI-Karten zeigen robuste Zusammenfassungen wie Erfolgsquote, Perzentile, Kürzungsjahre, Depoterschöpfung, Steuerersparnis aus Verlusttopf und Pflegekennzahlen.
- Szenario-Logs zeigen ausgewählte Runs: Worst, Perzentile, Pflegefälle, lange Lebensdauer, hohe Kürzung und Zufallssamples.
- Backtest-Logs zeigen den deterministischen historischen Jahrespfad.
- Sweep- und Optimizer-Ausgaben zeigen Parameterwirkung, Heatmaps, Sensitivität, Pareto-Frontier und Champion-Parameter.
- Detailmodus ergänzt technische Spalten zu Entnahme/Payout/VPW/Liquidität/Bonds, ohne die Normalansicht zu verändern.

Diese Trennung ist fachlich wichtig: Der Simulator soll nicht nur eine Erfolgsquote liefern, sondern erklären, welche Pfade scheitern, wodurch Kürzungen entstehen und welche Parameter die Robustheit wirklich treiben.

---

## B.4 Engine: Kernlogik und Verträge

Die Engine ist die deterministische Rechenschicht der Suite. Balance und Simulator liefern ihr ein normalisiertes Jahres-Inputobjekt und einen optionalen Vorjahreszustand; die Engine liefert daraus eine einjährige Entnahmeentscheidung, Diagnose, Transaktionsvorschlag, finale Jahressteuer und neuen Folgezustand. Sie besitzt bewusst keine DOM-Abhängigkeiten und wird aus `engine/index.mjs` per `build-engine.mjs` in das Browser-Artefakt `engine.js` gebündelt.

### B.4.1 Modulstruktur

```
engine/
├── config.mjs                         → Schwellen, Profile, Texte, Engine-Version
├── core.mjs                           → Orchestrierung, EngineAPI, Input-Normalisierung, VPW
├── errors.mjs                         → AppError, ValidationError, FinancialCalculationError
├── index.mjs                          → Bundle-/ESM-Entry, Re-Export von EngineAPI
├── tax-settlement.mjs                 → Jahres-Settlement: Verlusttopf, SPB, finale Steuer
├── validators/
│   └── InputValidator.mjs             → Plausibilisierung der Jahresinputs
├── analyzers/
│   └── MarketAnalyzer.mjs             → Marktregime, Stagflation, CAPE-Erwartungsrendite
├── planners/
│   ├── SpendingPlanner.mjs            → Fassade der Entnahmeplanung
│   ├── alarm-policy.mjs               → Alarm-Aktivierung und Deeskalation
│   ├── flex-rate-policy.mjs           → Flex-Rate, Glättung, S-Kurve, harte Caps
│   ├── flex-budget-policy.mjs         → mehrjähriger Flex-Kürzungstopf
│   ├── final-rate-policy.mjs          → finale jährliche Änderungsgrenzen
│   ├── spending-guardrails.mjs        → Recovery-/Caution-Guardrails, Budget-Floor
│   ├── spending-policy-pipeline.mjs   → stabile Reihenfolge der Spending-Regeln
│   ├── spending-diagnosis.mjs         → Diagnose-Shape, Runway-Ziel, Key-Parameter
│   ├── spending-policy-helpers.mjs    → Quantisierung, S-Kurven, Hilfsformeln
│   └── wealth-reduction.mjs           → Dämpfung bei niedriger Entnahmequote
└── transactions/
    ├── TransactionEngine.mjs          → Fassade für Liquidität, Verkäufe, Rebalancing
    ├── transaction-action.mjs         → Entscheidung: Notfüllung, Refill, Verkauf, keine Aktion
    ├── transaction-opportunistic.mjs  → opportunistisches Rebalancing in guten Märkten
    ├── transaction-surplus.mjs        → Anlage überschüssiger Liquidität
    ├── transaction-utils.mjs          → Ziel-Liquidität, Gewichtung, Quantisierung, Mindesttrade
    ├── sale-engine.mjs                → steuerbewusste Verkäufe und Tranchenreihenfolge
    └── three-bucket-logic.mjs         → 3-Bucket-Jilge: Bond-Verkauf und Bond-Refill
```

Ziel-Liquidität und Liquiditäts-Gates liegen in `transaction-utils.mjs` und werden über `TransactionEngine.calculateTargetLiquidity()` aufgerufen.

### B.4.2 Öffentliche API

Der unterstützte fachliche `EngineAPI`-Vertrag umfasst fünf operative Methoden:

| Methode | Zweck |
|---------|-------|
| `getVersion()` | liefert API-Version und Build-ID |
| `getConfig()` | liefert die zentrale Engine-Konfiguration |
| `analyzeMarket(input)` | führt nur die Marktanalyse aus |
| `calculateTargetLiquidity(profil, market, inflatedBedarf)` | berechnet das Liquiditätsziel für Profil und Marktregime |
| `simulateSingleYear(input, lastState)` | führt die vollständige Jahresrechnung aus |

`simulateSingleYear()` ist der Normalpfad für Balance, Simulator und Tests. Sein
Fehler-Envelope ist methodenspezifisch und wird in B.4.2b beschrieben; es darf
nicht pauschal auf die beiden Rechenhilfen `analyzeMarket()` und
`calculateTargetLiquidity()` übertragen werden.

Die enumerable Objektoberfläche enthält zusätzlich die drei als `@deprecated`
markierten No-op-Kompatibilitäts-Stubs `addDecision()`, `updateDecision()` und
`removeDecision()`. Damit exponiert das Laufzeitobjekt insgesamt acht Methoden,
obwohl nur die fünf Methoden aus der Tabelle fachlich implementiert und für
Aufrufer unterstützt sind. Die Stubs haben keine Implementierung, keinen
Rückgabevertrag und keine fachlichen Seiteneffekte; neue Aufrufer dürfen sie
nicht verwenden. Ihre spätere Entfernung wäre eine gesonderte Änderung der
sichtbaren EngineAPI-Oberfläche und benötigt eine eigene Contractentscheidung
und Validierung.

#### B.4.2a Eingabe- und Vorzustandsvertrag

`simulateSingleYear(rawInput, lastState)` erwartet zwei plain Objects; der
Vorzustand ist optional. Die Engine hat keinen Speicherzugriff: Aufrufer
entscheiden erst nach einem erfolgreichen Ergebnis, ob und wohin der gelieferte
Folgezustand persistiert wird.

| Eingangsbereich | Vertrag |
| --- | --- |
| **Rohinput** | `_normalizeEngineInput()` übernimmt kompatible Aliasfelder und definierte Defaults. Numerische Legacy-Vermögensfelder mit `NaN`/`Infinity` werden nach dem bestehenden Kompatibilitätsvertrag auf null normalisiert; daraus folgt keine allgemeine Erlaubnis für beliebige Strings an strikten Feldern. |
| **Validierung** | `InputValidator.validate()` prüft Pflichtfelder, endliche Werte, Bereiche und fachliche Beziehungen vor der Modellrechnung. Fehler besitzen `fieldId` und `message`. |
| **Aktuelle Liquidität** | `aktuelleLiquiditaet` ist optional. Fehlt sie, gilt `tagesgeld + geldmarktEtf`; ist sie vorhanden, muss sie eine endliche, nichtnegative Zahl sein. Lokalisierte Zahlstrings gehören in den UI-Parser, nicht in diesen Engine-Vertrag. |
| **Mindest-Flex** | Ein endlicher numerischer Wert wird als Eingabe validiert: negativ oder größer als `flexBedarf` führt zum Feldfehler, nicht zu einem stillen Clamp. Ein nichtnumerischer Legacy-Wert folgt weiterhin dem ausdrücklich getesteten Kompatibilitätsfallback auf null. |
| **Detailtranchen** | `detailledTranches` müssen vor Verkauf als kanonische, eindeutig klassifizierte Lots mit stabiler ID, Cost Basis, TQF und gegebenenfalls `sourceProfileId` vorliegen. Ungültige Lots dürfen nicht als aggregierter Ersatzverkauf kaschiert werden. |
| **Vorzustand** | `lastState` enthält Guardrail-/VPW-Historie und optional `taxState.lossCarry`. Ein fehlender Zustand wird initialisiert; ein Verlustvortrag wird als nichtnegative endliche Größe gelesen. Der Rückgabewert `newState` ist der alleinige Nachfolger für den nächsten Jahresaufruf. |

Normalisierung ist damit ein versionierter Kompatibilitätsschritt, Validierung
das fachliche Gate. Sie darf nicht dazu verwendet werden, neue ungültige
Eingaben still in scheinbar gültige Geschäftsparameter umzudeuten.

#### B.4.2b Ergebnis- und Fehlervertrag

| Aufruf | Erfolg | Fehlergrenze |
| --- | --- | --- |
| `simulateSingleYear()` | `{ input, newState, diagnosis, ui }`; `input` ist normalisiert, `newState` der Folgezustand, `diagnosis` die Begründung und `ui` das anwendungsnahe Jahresergebnis | `{ error: ValidationError }` bei Feldfehlern; `{ error: AppError }` bei erwarteten oder abgefangenen unerwarteten Enginefehlern. Es gibt kein partielles Erfolgsobjekt. |
| `analyzeMarket()` | direktes Marktanalyseobjekt | historisch abweichend `{ error: <string> }`; kein `AppError`-Envelope |
| `calculateTargetLiquidity()` | direkte endliche Zielgröße aus Profil, Markt und Bedarf | keine eigene Catch-/Envelope-Grenze; Aufrufer müssen gültige Vorbedingungen liefern |
| `getVersion()` / `getConfig()` | Versionsobjekt beziehungsweise Konfiguration | keine fachliche Jahresrechnung |

`ValidationError.errors` ist eine Liste aus `{ fieldId, message }` und wird von
UI-Aufrufern zur Feldmarkierung ausgewertet. Ein unerwarteter Fehler in
`simulateSingleYear()` wird in einen allgemeinen `AppError` mit
`originalError` im Kontext gekapselt. `FinancialCalculationError` existiert als
spezialisierte Klasse, ist aber kein Versprechen, dass jeder denkbare
Rechenfehler bereits genau mit diesem Typ klassifiziert wird.

Balance, Simulator und Profilverbund müssen deshalb zuerst `result.error`
prüfen. Erst ein vollständiger Erfolg darf gerendert oder persistiert werden;
die Engine selbst kann wegen ihrer IO-Freiheit weder Teilzustand speichern noch
einen Persistenz-Rollback ausführen.

#### B.4.2c Settlement- und Cash-Reconciliation-Vertrag

```text
steuerbewusste Verkaufsplanung
  └── Plansteuer und Nettoerlös zur Mengenermittlung
        │
        ▼
signierte Rohaggregate aller geplanten Verkäufe
  - sumRealizedGainSigned
  - sumTaxableAfterTqfSigned
        │
        ▼
settleTaxYear(taxStatePrev, Pauschbetrag, Kirchensteuer)
        │
        ├── taxDue + Settlementdetails
        └── taxStateNext.lossCarry
        │
        ▼
Planreserve gegen finale Steuer reconciliieren
        │
        └── action, diagnosis und newState konsistent ausgeben
```

Die Sale-Engine darf für die Brutto-/Netto-Planung eine vorläufige Steuer
verwenden. Die offizielle Jahressteuer entsteht danach genau einmal aus den
signierten Rohaggregaten. Das Settlement verrechnet zuerst den profilbezogenen
Verlustvortrag, dann den Sparer-Pauschbetrag und anschließend den Steuersatz
einschließlich Solidaritätszuschlag und konfigurierter Kirchensteuer. Ergebnis
sind `taxDue`, `taxStateNext` und erklärende `details`.

Im Engine-Jahreslauf wird die Differenz zwischen Planreserve und finaler Steuer
als `taxCashAdjustment` in die Liquiditätsverwendung zurückgeführt. Übersteigt
die finale Steuer die Planreserve um mehr als 0,01 EUR, bricht der Contract ab,
statt eine ungedeckte Verwendung auszugeben. Zusätzliche Forced Sales des
Simulators lösen einen Gesamt-Recompute über reguläre und erzwungene Verkäufe
aus; Verlusttopf und Pauschbetrag dürfen nicht zweimal verbraucht werden. Im
Profilverbund wird dasselbe Settlement nach der Haushaltsentscheidung je
Eigentümer genau einmal ausgeführt (B.2.6).

### B.4.3 Jahrespipeline in `core.mjs`

Die Engine normalisiert zuerst Strategie- und VPW-Felder. Das ist wichtig, weil ältere UI-/Testpfade noch Aliaswerte liefern können. `decumulation.mode` wird auf `standard` oder `3_bucket_jilge` begrenzt; `drawdownTrigger`, `bondTargetFactor` und `bondRefillThreshold` erhalten sinnvolle Defaults aus `CONFIG`.

```javascript
function _internal_calculateModel(rawInput, lastState) {
    const input = normalize(rawInput);
    const taxStatePrev = lastState?.taxState ?? { lossCarry: 0 };

    validate(input);
    const profil = resolveRiskProfile(input.risikoprofil);
    const aktuelleLiquiditaet = input.aktuelleLiquiditaet ?? input.tagesgeld + input.geldmarktEtf;
    const depotwertGesamt = input.depotwertAlt + input.depotwertNeu + optionalGold(input);
    const market = MarketAnalyzer.analyzeMarket(input);

    const inflatedBedarf = calculateFloorAndFlexAfterPension(input);
    applyDynamicFlexVpwIfEnabled({ input, market, lastState, inflatedBedarf });

    const spending = SpendingPlanner.determineSpending({
        market, lastState, inflatedBedarf, runwayMonate, profil, depotwertGesamt, gesamtwert, renteJahr, input
    });

    const zielLiquiditaet = TransactionEngine.calculateTargetLiquidity(profil, market, inflatedBedarf, input);
    const action = TransactionEngine.determineAction({
        aktuelleLiquiditaet, depotwertGesamt, zielLiquiditaet, market,
        spending: spending.spendingResult, minGold, profil, input
    });

    const taxSettlement = settleTaxYear({
        taxStatePrev,
        rawAggregate: action.taxRawAggregate,
        sparerPauschbetrag: input.sparerPauschbetrag,
        kirchensteuerSatz: input.kirchensteuerSatz
    });

    action.steuer = taxSettlement.taxDue;
    spending.newState.taxState = taxSettlement.taxStateNext;
    updateDynamicFlexSafetyState(spending.newState);

    return { input, newState: spending.newState, diagnosis, ui };
}
```

Die Sale-Engine liefert während der Transaktionsplanung noch eine Plansteuer, damit Nettoverkaufsmengen bestimmt werden können. Die offizielle Jahressteuer entsteht danach zentral im Settlement. Dadurch werden Sparer-Pauschbetrag, Verlustvortrag und mehrere Verkaufsquellen nicht mehrfach oder widersprüchlich verrechnet.

### B.4.4 Marktanalyse

`MarketAnalyzer` klassifiziert ein Jahr in operative Regime. Diese Regime steuern nicht direkt eine starre Entnahme, sondern liefern Kontext für SpendingPlanner, Ziel-Liquidität, Rebalancing und Diagnose.

| Regime | Bedeutung |
|--------|-----------|
| `peak_hot` | neues Hoch mit starker 1-Jahres-Performance |
| `peak_stable` | neues Hoch ohne Überhitzung |
| `bear_deep` | deutlicher realer Drawdown gegenüber ATH |
| `recovery` | Erholung nach Drawdown mit positiver Dynamik |
| `corr_young` | junge Korrektur, noch kein tiefer Bärenmarkt |
| `side_long` | seitwärts/neutral, kein stärkeres Signal |
| `recovery_in_bear` | Erholungsrally innerhalb oder nach Bärenmarkt |

Zusätzlich erkennt die Analyse Stagflation über hohe Inflation bei negativer Realrendite und berechnet aus CAPE-Daten eine erwartete Aktienrendite. Diese erwartete Rendite fließt vor allem in Dynamic Flex/VPW ein.

Kontinuierliche Regime-Signale ergaenzen diese diskreten Labels, ersetzen sie aber nicht. `regime-signals.mjs` berechnet endliche Severity-Werte in `[0, 1]` fuer Drawdown, CAPE und Runway. Die Interpolation ist richtungssensitiv: Drawdown nutzt eine aufsteigende Skala, Runway eine absteigende Skala. Identische Stuetzwerte werden als harte Schwelle behandelt, nicht als Division durch Null. Diese Signale duerfen harte Sicherheitsgrenzen nicht weichzeichnen.

### B.4.5 SpendingPlanner und Dynamic Flex

Der SpendingPlanner führt mehrere Policy-Module in stabiler Reihenfolge aus, wobei `SpendingPlanner.mjs` als Fassade dient:

1. Vorjahreszustand laden oder initialisieren: Flex-Rate, realer Vermögens-Peak, Inflation, Alarmstatus.
2. Alarmbedingungen prüfen: tiefer Bärenmarkt, hohe Entnahmequote, Runway-Stress oder realer Drawdown.
3. Initiale Flex-Rate berechnen: Marktregime, Glättung und Alarmverhalten.
4. Spending-Policy-Pipeline anwenden: Guardrails, Mindest-Flex, Flex-Budget, finale Rate-Limits.
5. Jahresentnahme quantisieren und Diagnose erzeugen.

Dynamic Flex ist ein vorgeschalteter VPW-Pfad. Bei aktivem `dynamicFlex` berechnet die Engine aus Gesamtvermögen, Resthorizont, CAPE-basierter erwarteter Realrendite, Gold-/Safe-Asset-Anteil und optionalem Go-Go-Multiplikator einen dynamischen Flex-Bedarf. Die VPW-Renditeherleitung ist in `engine/planners/vpw-return-policy.mjs` gekapselt: `legacy_step` bleibt Default, `cape_continuous` ist ein expliziter Config-Modus mit robuster CAPE-Normalisierung und separaten Aktien-/Portfolio-Clamps. Der Resthorizont kann optional durch Longevity-Modi konservativer gemacht werden: `none` bleibt Default, `quantile_shift`, `relative_horizon_buffer` und `buffer_years` sind explizite Sicherheitsannahmen. Der Floor bleibt geschützt; VPW ersetzt nur den flexiblen Teil. Eine Sicherheitsstufe kann Go-Go deaktivieren oder Dynamic Flex temporär auf statischen Flex zurücksetzen, wenn Alarm-, Runway- oder Drawdown-Signale zu stark werden.

Der optionale `minimumFlexAnnual` ist kein zweiter Floor und mutiert den Bedarf nicht. Er wird nach den Guardrails als Mindest-Effektivbetrag für den Flex-Anteil interpretiert: Wenn die berechnete Flex-Rate weniger als diesen Betrag freigeben würde, hebt `applyMinimumFlexFloor()` die Rate bis zur erforderlichen Mindest-Flex-Rate an. Danach dürfen Flex-Budget-Cap und finale Rate-Limits die Anhebung weiterhin begrenzen. Notfallbedingungen blockieren die Anhebung bei aktivem Alarm, fehlender Gesamtvermögensdeckung für Floor plus Mindest-Flex oder wenn der Mindest-Runway nach dem Proxy nicht wiederherstellbar wäre.

Die wichtigsten fachlichen Bremsen sind:

| Mechanismus | Zweck |
|-------------|-------|
| Wealth-Adjusted Reduction | geringe Entnahmequoten werden weniger stark gekürzt |
| Mindest-Flex p.a. | optionale Untergrenze für Flex-Ausgaben, ohne den Floor zu verändern |
| Flex-Budget | mehrjähriger Topf begrenzt kumulative Flex-Kürzungen in Stressphasen |
| Flex-Share S-Curve | verhindert überharte Kürzungen, wenn Flex nur einen Teil des Gesamtbedarfs ausmacht |
| Runway-/Hard-Caps | begrenzen Entnahmen bei schwacher Liquiditätsdeckung |
| Final Rate Limits | begrenzen jährliche Sprünge der Flex-Rate nach allen Policies |

### B.4.6 Transaktions- und Steuerlogik

`TransactionEngine` entscheidet nach der Entnahmeplanung, ob eine Handlung nötig ist. Die Reihenfolge ist fachlich wichtig:

- Bei echter Runway- oder Floor-Gefahr darf eine Notfüllung auch Mindesttrade-Grenzen ignorieren.
- Im Bärenmarkt schützt die Logik zuerst Liquidität und kann Gold-Floors für Notverkäufe lockern.
- In Peak-/neutralen Märkten kann opportunistisch Liquidität oder Gold wieder aufgebaut werden.
- Bei überschüssiger Liquidität kann `transaction-surplus.mjs` Investitionsvorschläge erzeugen.
- Wenn keine Schwelle ausgelöst wird, liefert die Engine bewusst `type: 'NONE'`.

Verkäufe laufen über `sale-engine.mjs`. Die Eingangsgrenze akzeptiert nur kanonisch validierte, eindeutig klassifizierte Lots. Bei Detailtranchen werden `trancheId`, `sourceProfileId`, `isin`, Kaufdatum, Cost Basis und TQF mitgeführt. Die Reihenfolge ist steuerbewusst:

- Aktien/ETF werden primär nach niedriger effektiver Steuerlast und danach nach
  niedriger nichtnegativer Gewinnquote sortiert; der Datums-Tie-Breaker
  bevorzugt neuere Lots.
- Gold wird untereinander nach älterem Kaufdatum zuerst sortiert. Eine
  modellierte Steuerfreiheit entsteht nur durch das explizite Nutzerflag
  `goldSteuerfrei`, nicht automatisch aus der Haltedauer.
- Bonds/Anleihen verwenden kanonisch die Kategorie `bonds` mit Typ `anleihe`.
- Im defensiven Kontext können Gold/Bonds vor Aktien genutzt werden.

Die Sale-Engine gibt Rohaggregate (`sumRealizedGainSigned`, `sumTaxableAfterTqfSigned`) zurück. `tax-settlement.mjs` verrechnet diese Rohdaten mit Verlustvortrag und Sparer-Pauschbetrag und schreibt `taxState.lossCarry` in `newState` fort.

### B.4.7 3-Bucket-Jilge in der Engine

Der Strategie-Modus `3_bucket_jilge` ist in der Engine normalisiert und die gemeinsame Bond-Logik liegt in `transactions/three-bucket-logic.mjs`. Fachlich bedeutet das:

- Bonds/Anleihen-Tranchen werden über Typ oder Kategorie erkannt.
- In schlechten Aktienjahren unterhalb des konfigurierten Drawdown-Triggers kann die Logik geplante Aktienverkäufe durch Bond-Verkäufe ersetzen.
- In guten Jahren kann ein Bond-Zieltopf anhand `bondTargetFactor * jahresentnahmeTarget` wieder aufgefüllt werden.
- `bondRefillThreshold` verhindert Kleinstumschichtungen.
- Bond-Verkäufe liefern dieselben Steuer-Rohaggregate wie andere Verkäufe und gehen damit ins Jahres-Settlement ein.

Balance und Simulator nutzen die gleiche Erkennung für Bond-Tranchen. Der Simulator ergänzt nach dem Engine-Call eigene Bond-Refill-/Payout-Mechanik, aber die Klassifikation und Verkaufssystematik bleibt identisch.

---

## B.5 Test-Suite und Validierungsregeln

**Übersicht:** Die Test-Suite umfasst in Commit `6ea3e7a` **107 entdeckte `*.test.mjs`-Dateien**. Davon führt das Node-Standardgate 106 aus; `browser-smoke.test.mjs` bleibt ein separates Pflichtgate. Die Zahlen wurden am 2026-07-15 per Dateiinventar geprüft; die in `tests/README.md` dokumentierte Runner-Baseline wurde am 2026-07-14 mit `npm test` verifiziert. Assertions und Coverage sind Ergebnisse eines konkreten Laufs und werden deshalb nicht als dauerhafte Architekturkennzahl festgeschrieben. Die Node-Tests laufen ohne Jest/Mocha über native ESM-Module und eigene globale Assertions (`assert`, `assertEqual`, `assertClose`).

### B.5.1 Test-Inventar

| Kategorie | Repräsentative Dateien | Fokus |
|-----------|------------------------|-------|
| **Engine Core & Validation** | `core-engine.test.mjs`, `core-negative-contracts.test.mjs`, `engine-robustness.test.mjs`, `market-analyzer.test.mjs`, `regime-signals.test.mjs`, `historical-data-robustness.test.mjs` | EngineAPI-Erfolg/Fehler, strikte optionale Inputs, Fehlerrobustheit, Marktregime und historische Daten |
| **Spending, VPW und 3-Bucket** | `spending-planner.test.mjs`, `spending-quantization.test.mjs`, `vpw-dynamic-flex.test.mjs`, `dynamic-flex-horizon.test.mjs`, `3bucket-config.test.mjs`, `3bucket-refill.test.mjs` | Guardrails, Rundung, VPW-Horizonte, Dynamic-Flex-Safety, 3-Bucket-Parameter und Bond-Refill |
| **Transaktionen, Steuern, Tranchen** | `transaction-*.test.mjs`, `tax-settlement.test.mjs`, `core-tax-settlement.test.mjs`, `tranche-contract.test.mjs`, `tranche-reconciliation.test.mjs`, `depot-tranches.test.mjs`, `tranchen-manager-*.test.mjs` | Verkäufe, Rohaggregate, Jahres-Settlement, kanonischer Lot-Contract, Cost Basis und bestätigtes idempotentes Realbestands-Reconcile |
| **Balance-Jahresprozess** | `balance-annual-period.test.mjs`, `balance-annual-workflow-contract.test.mjs`, `balance-binder-snapshots.test.mjs`, `balance-annual-inflation.test.mjs`, `balance-annual-marketdata.test.mjs`, `balance-annual-cape.test.mjs` | Perioden-ID, Doppel-Commit-Sperre, Phasen, Snapshot-Read-back, Recovery sowie Stichtags-/Provenienzverträge |
| **Persistenz und Recovery** | `persistence.test.mjs`, `snapshot-archive.test.mjs`, `snapshot-key-policy.test.mjs`, `balance-storage-contract.test.mjs`, `profile-storage.test.mjs` | Adapterwahl, Cache/Flush, Migration, Live-Replace, Snapshot-Archiv, Import-/Profilgrenzen und Korruptionszustände |
| **Balance-App** | `balance-smoke.test.mjs`, `balance-reader.test.mjs`, `balance-diagnosis-*.test.mjs`, `balance-expenses.test.mjs`, `balance-renderer-*.test.mjs` | Initialisierung, DOM-Input, Diagnose, Ausgaben-Check und Rendering |
| **Simulator, Monte Carlo, Sweep, Optimierung** | `simulation.test.mjs`, `simulator-*.test.mjs`, `monte-carlo-*.test.mjs`, `auto-optimizer.test.mjs`, `auto-optimize-worker-contract.test.mjs`, `scenario-analyzer.test.mjs`, `scenarios.test.mjs`, `care-meta.test.mjs`, `health-bucket.test.mjs`, `portfolio.test.mjs` | Jahresloops, Backtest, MC-Sampling, Worker-Merge, Sweep, mehrphasige Auto-Optimize-Pipeline, Pflege, Pflegebucket, Szenarien, Portfolio |
| **Neue stochastische und VPW-Contracts** | `stationary-bootstrap-contract.test.mjs`, `stationary-bootstrap-sampler.test.mjs`, `tail-risk-contract.test.mjs`, `tail-risk-overlay.test.mjs`, `longevity-*.test.mjs`, `vpw-return-policy.test.mjs`, `regime-signals.test.mjs` | Parametergrenzen, deterministische Schedules/Sampler, Nicht-Mutation, Anti-Doppelpessimismus, Horizontpuffer, CAPE-Fallbacks und kontinuierliche Signale |
| **Profile und Profilverbund** | `profile-storage.test.mjs`, `profile-state.test.mjs`, `profile-navigation.test.mjs`, `profile-asset-values.test.mjs`, `profilverbund-balance.test.mjs`, `profilverbund-profile-gold-overrides.test.mjs`, `simulator-multiprofile-aggregation.test.mjs` | Profilregistry, Navigation/State, genau ein Haushaltslauf, Quellen-/Steuerattribution, Reconciliation, profilbezogene Tranchen und Simulatoraggregation |
| **Worker, Utilities und Formatierung** | `worker-parity.test.mjs`, `worker-pool.test.mjs`, `utils.test.mjs`, `formatting.test.mjs`, `feature-flags.test.mjs` | deterministische Worker-Parität, Pool-Lifecycle, RNG/Statistik, Formatter, Feature-Flags |

### B.5.2 Ausführung und Validierung

| Zweck | Kommando | Wann verwenden |
|-------|----------|----------------|
| Gesamtsuite | `npm test` | Default nach Codeänderungen und vor Release/EXE-Build |
| Direkter Runner | `node tests/run-tests.mjs` | Fallback, wenn `npm` lokal defekt ist |
| Einzeltest | `node tests/run-single.mjs <testfile>` | fokussierte Fehlersuche; im Ergebnis berichten, dass nicht die ganze Suite lief |
| Coverage-Baseline | `npm run test:coverage` | Review-/Transparenz-Gate fuer `app/`, `engine/`, `workers/` und `types/`; noch keine harte Mindestschwelle |
| Browser-Smokes | `npm run test:browser` | Playwright-Gate fuer HTML-Einstiege mit lokalem Testserver; getrennt von `npm test` |
| Engine-Bundle | `npm run build:engine` | zusätzlich nach Änderungen an `engine/` oder öffentlicher `EngineAPI` |
| Strict Engine-Build | `npm run build:engine:strict` | CI/Release, damit fehlendes `esbuild` nicht still auf Fallback geht |
| Tauri/Rust-Gate | `npm run tauri:build` | zusätzlich bei Änderungen an `src-tauri/` oder release-nahen Tauri-Pfaden |

Für reine Dokumentationsänderungen ist kein Testlauf erforderlich, sofern keine Code- oder Build-Artefakte geändert wurden. Wenn Dokumentation jedoch konkrete Assertion-Zahlen oder Testausgaben behauptet, müssen diese Zahlen aus einem aktuellen Runner-Lauf stammen oder ausdrücklich als nicht neu verifiziert gekennzeichnet werden.

`QUICK_TESTS=1` ist deprecated. Fuer schnelle Fehlersuche sollen gezielte `run-single`-Läufe oder die im jeweiligen Slice dokumentierten Fokusbefehle verwendet werden.

### B.5.3 Worker-Parity-Test

Validiert Determinismus zwischen Main-Thread und Worker:
```javascript
// Gleicher Seed → Gleiche Ergebnisse
const mainResult = runSimulation({ seed: 12345, runs: 100 });
const workerResult = await runInWorker({ seed: 12345, runs: 100 });
assertEqual(mainResult.successRate, workerResult.successRate);
```

Worker- und Optimizer-Pfade sind kritisch, weil Monte Carlo, Sweep und Auto-Optimize Ergebnisse chunkweise berechnen. `worker-parity.test.mjs` und `auto-optimize-worker-contract.test.mjs` sichern, dass Chunking, Worker-Merge und serielle Ausführung fachlich dieselben Aggregate liefern.

Der aktuelle Paritaetstest umfasst explizit auch Continuous-CAPE, Langlebigkeits-Horizonte, Stationary Bootstrap und Tail-Risk-Metriken. Die fachliche Aussage ist begrenzt: Paritaet beweist gleiche Berechnung in seriellen und gechunkten Pfaden, nicht die empirische Guete der Modellannahmen.

### B.5.4 Test-Prioritäten

| Priorität | Kategorie | Kritikalität |
|-----------|-----------|--------------|
| 1 | Finanz-Kern (Spending, Tax, Liquidity) | ⚠️ Kritisch |
| 2 | EngineAPI, Settlement, 3-Bucket, Dynamic Flex | ⚠️ Hoch |
| 3 | Algorithmen (MC, Market, Care, Sweep, Auto-Optimize) | Hoch |
| 4 | Profilverbund, Profile, Tranchen | Mittel |
| 5 | Balance-/Simulator-UI-Contracts und Persistenz | Mittel |
| 6 | Worker-Parity, Utilities, Formatter, Feature-Flags | Mittel |

---

# Fachkonzept und Rechenkonventionen

Dieser Teil beschreibt die fachliche Bedeutung der Eingaben und Ergebnisse.
Die technische Modulzuordnung steht in Teil B. Zur schnellen Orientierung:
[Glossar](#verbindliches-glossar),
[Jahreslauf](#rechnungs--und-ereigniszeitachse),
[Fachinvarianten](#zentrale-fachinvarianten),
[Nutzerentscheidungen und Automatik](#nutzerentscheidungen-und-automatische-policies),
[Floor/Flex](#c1-floor-flex-guardrail-system),
[Steuern](#c2-steuer-engine),
[Monte Carlo](#c3-monte-carlo-methodik),
[Pflege](#c4-pflegefall-modellierung),
[Liquidität](#c5-liquiditäts-targeting),
[Rente](#c7-rentensystem-gesetzliche-private-rente),
[Dynamic Flex](#c11-dynamic-flex-vpw-variable-percentage-withdrawal) und
[Modellgrenzen](#annahmen-modellgrenzen-und-validierung).

## Verbindliches Glossar

| Begriff | Bedeutung in der Suite | Wichtige Abgrenzung |
|---------|-------------------------|---------------------|
| **Bedarf** | Für das jeweilige Modelljahr eingegebener beziehungsweise fortgeschriebener nominaler Jahresbetrag. | Kein statistisch geschätzter Lebensbedarf und keine automatische Ist-Ausgabe. |
| **Floor** | Nicht verhandelbarer Jahresbedarf. Im Simulator kann der Pflegezusatz den Floor erhöhen. Nach Rentenverrechnung bezeichnet `inflatedBedarf.floor` trotz des historischen Feldnamens den aktuellen nominalen **Netto-Floor**. | Nicht mit freier Liquidität, Mindestreserve oder Gesamtentnahme gleichsetzen. |
| **Flex-Basis** | Verhandelbarer Jahresbedarf vor Anwendung der Flex-Rate. Bei Dynamic Flex kann VPW diese Basis ersetzen; ein Rentenüberschuss oberhalb des Floor reduziert sie. | Noch nicht der tatsächlich freigegebene Flex-Betrag. |
| **Effektiver Flex** | Flex-Basis multipliziert mit der nach Policies wirksamen Flex-Rate. | Mindest-Flex, Budgets und Glättung können den Policy-Wert anheben oder begrenzen. |
| **Nominal** | Geldbetrag in Preisen des betrachteten Modelljahres. | Die Engine erwartet den aktuellen Jahreswert; sie inflationsindexiert den Bedarf nicht nochmals intern. |
| **Real** | Auf ein Basisjahr deflationierter Betrag. | Im Simulator ist das erste Simulatorjahr das Basisjahr; der aktuelle kumulierte Inflationsfaktor wird auch während einer Ansparphase fortgeschrieben. |
| **Runway** | Frei verfügbare Liquidität geteilt durch den aktuellen jährlichen Netto-Bedarf aus Floor und effektivem Flex, ausgedrückt in Monaten. | Keine Überlebenswahrscheinlichkeit und keine garantierte Mindestreichweite des Gesamtvermögens. |
| **Reserve** | Sammelbegriff, der nur zusammen mit seinem Typ verwendet werden soll: freie Liquidität, Runway-Ziel, Gold-Floor oder Pflegebucket. | Die vier Größen haben unterschiedliche Verfügbarkeit und Rechenwirkung. |
| **Aktives Gesamtvermögen** | Aktien-, Gold- und freie Liquiditätsbestände, die der Entnahmeplanung zur Verfügung stehen; ein aktivierter Pflegebucket ist herausgerechnet. | Kein vollständiger Haushalts-Net-Worth und kein frei erweiterbares Multi-Asset-Portfolio. |
| **Erfolg** | Monte-Carlo-Lauf ohne `isRuin` bis zum fachlichen Laufende. Ein Lauf, der wegen Tod aller modellierten Personen endet, gilt ohne vorherigen Ruin als erfolgreich. | Keine Garantie für eine reale Ruhestandsplanung und keine Aussage, dass alle Wunschentnahmen vollständig erfüllt wurden. |
| **Ruin** | Im Simulator ein Zustand, in dem das aktive Gesamtvermögen nach den vorgesehenen Finanzierungswegen den jährlichen Netto-Floor nicht mehr deckt oder der Auszahlungs-Fallback den Netto-Floor nicht finanzieren kann. | Ein reiner Liquiditätsengpass ist noch kein Ruin, solange Floor-Deckung durch verwertbares aktives Vermögen möglich ist. Validierungsfehler werden im direkten Simulatorpfad ebenfalls als fehlgeschlagener Lauf gezählt. |
| **Pflegebucket** | Optional abgetrennter, cash-naher Haushalts-State zur Finanzierung definierter Pflegekosten ab einem konfigurierten Pflegegrad. | Außerhalb von VPW-, Runway- und normaler Entnahmebasis; keine Pflegeversicherung und keine automatische Wiederauffüllung. |
| **Steuerschätzung** | Parametrisiertes Jahres-Settlement aus realisierten, nach Teilfreistellung gewichteten Gewinnen/Verlusten, Verlustvortrag, Sparer-Pauschbetrag und pauschaler KESt/Soli/KiSt-Formel. | Keine vollständige deutsche Steuerveranlagung. |

## Rechnungs- und Ereigniszeitachse

### Simulator: ein Modelljahr

Der Simulator führt Markt-, Lebens- und Finanzereignisse in einer festen
Reihenfolge aus. Damit ist insbesondere festgelegt, ob ein Wert zum aktuellen
Jahr oder bereits zum Folgejahr gehört.

| Phase | Fachlicher Schritt | Zeitbezug und Grenze |
|-------|--------------------|----------------------|
| 1 | Jahresdatensatz und Zufallsströme bestimmen | Marktjahr, Pflege und Mortalität werden aus den konfigurierten Sampling-/RNG-Pfaden abgeleitet. |
| 2 | Pflegezustand fortschreiben, danach Mortalität ziehen | Pflege kann die Ansparphase beenden und die Mortalitätsannahme des aktuellen Jahres beeinflussen. Endet der Haushalt durch Tod aller Personen, endet der Lauf vor dem Finanzschritt. |
| 3 | Renditen auf Anfangsbestände anwenden | Aktien und Gold verwenden die gezogenen Jahresrenditen; der vereinfachte Bond-Bucket verwendet den Cash-Rate-Proxy. |
| 4 | Aktuellen nominalen Bedarf bilden | Pflegekosten erhöhen gegebenenfalls den Floor. Renten werden zuerst mit dem Floor und ein verbleibender Überschuss mit Flex verrechnet. |
| 5 | Engine-Planung ausführen | Marktregime, optionales VPW, Guardrails, Mindest-Flex, Liquiditätsziel, geplante Verkäufe und vorläufiges Jahres-Settlement werden ermittelt. |
| 6 | Plan auf Simulatorbestände anwenden | Geplante Verkäufe und Umschichtungen verändern die simulierten Bestände, nicht die operativen Bestände in Balance. |
| 7 | Auszahlung sicherstellen | Ein ausgelöster Pflegebucket wird vor erzwungenen Verkäufen eingesetzt; verbleibende Deckungslücken können Forced Sales auslösen. |
| 8 | Zins, Steuer und Endbestände finalisieren | Freie Liquidität und ein verbleibender Pflegebucket erhalten den Cash-Ertrag. Danach wird das Jahres-Settlement unter Einbezug zusätzlicher Verkäufe aus allen Rohaggregaten neu berechnet und eine Steuerdifferenz im Cash-State reconciliert. |
| 9 | Folgejahr vorbereiten | Floor, Flex, Mindest-Flex, Flex-Budgets und laufende Renten werden mit der Inflation beziehungsweise Rentenanpassung dieses Jahres für das **nächste** Modelljahr fortgeschrieben. |

Der Simulator-App-State besitzt dafür den kanonischen
`cumulativeInflationFactor`. Der Faktor zu Beginn eines Modelljahres gehört zu
den nominalen Größen dieses Jahres und deflationiert die effektive Entnahme.
Erst der Rückgabestate wird genau einmal mit `1 + inflation / 100` für das
Folgejahr fortgeschrieben. Der Engine-`lastState` erhält denselben Faktor als
Spiegel für Realvermögen und Real-Drawdown; Serial-, Monte-Carlo-, Sweep- und
Workerpfad transportieren denselben App-State. Auch Ansparjahre schreiben den
Faktor weiter, obwohl ihre Entnahme null ist.

Ein innerhalb des Jahres gezogener Tod wirkt sofort auf den weiteren
Haushaltslauf. Ein daraus entstehender Hinterbliebenenstatus wird jedoch aus
dem Status am Jahresanfang abgeleitet und aktiviert die Witwen-/Witwerrente
erst im folgenden Modelljahr. Pflegezustand und bis dahin ermittelte
Pflegekosten können deshalb noch dem Todesjahr zugeordnet sein.

### Balance: Jahresabschluss

Balance berechnet keine verdeckte Mehrjahresprojektion. Der Nutzer bestätigt
einen atomaren Jahresabschluss. Dabei werden die Ist-Werte des abgeschlossenen
Jahres übernommen und nominale Bedarfe mit der bestätigten Jahresinflation für
das Folgejahr fortgeschrieben. Die Engine erhält danach bereits die aktuellen
Jahreswerte. Der historische Feldname `inflatedBedarf` bedeutet daher nicht,
dass die Engine den Bedarf ein zweites Mal mit kumulierter Inflation
multipliziert.

### Rentenkonvention

Rentenwerte wirken als jährlicher Zufluss gegen den Bedarf: zuerst gegen
Floor, danach gegen Flex. Die optionale Steuerquote für Person 2 wird als
pauschaler Abschlag verwendet; für Person 1 existiert in diesem
Haushaltshelfer kein gleichartiger separater Pauschalabzug. Eingabewerte müssen
daher bereits zu der vom Nutzer beabsichtigten Netto-/Bruttokonvention passen.
Eine vollständige Rentenbesteuerung wird nicht modelliert.

## Zentrale Fachinvarianten

1. Jeder Bedarf wird pro Modelljahr genau einmal nominal fortgeschrieben. Die
   Engine arbeitet mit dem bereits aktuellen Jahreswert.
2. Pensionen decken zuerst Floor und erst danach Flex; ein Rentenüberschuss
   erzeugt keinen negativen Floor.
3. Floor hat Vorrang vor Flex. VPW verändert nur die Flex-Basis und macht den
   berechneten Rahmen nicht zur Konsumpflicht.
4. Guardrails und Alarm bestimmen zunächst die Flex-Rate. Mindest-Flex darf sie
   nur ohne Safety-Blocker anheben; Budget-Caps und finale Glättung bleiben
   nachgelagert wirksam. `minimumFlexAnnual` wird validiert und nicht still auf
   einen zulässigen Wert begrenzt.
5. Der Pflegebucket wird vor VPW-, Runway- und Entnahmeberechnung aus dem
   aktiven Vermögen entfernt und bei seiner Verwendung nicht nochmals als
   normaler Verkauf gezählt.
6. Die finale Jahressteuer entsteht einmal aus dem Gesamt-Settlement aller
   Verkaufsrohwerte. Zusätzliche Simulatorverkäufe führen zu einem Recompute,
   damit der Sparer-Pauschbetrag nicht doppelt verbraucht wird.
7. Eine Empfehlung, Simulation oder Optimierung verändert keine realen
   Tranchen. Erst bestätigte operative Schritte und Reconciliation aktualisieren
   Bestände.
8. Optionale Module müssen im deaktivierten Zustand fachlich neutral bleiben;
   ihre Diagnose darf keine versteckte Rechenwirkung erzeugen.

Der zentrale Wirkzusammenhang ist:

```text
aktueller nominaler Floor (+ Pflege) ─┐
                                      ├─ Rente zuerst gegen Floor, dann Flex
aktueller nominaler Flex ─────────────┘
                    │
                    ├─ optional: VPW ersetzt die Flex-Basis
                    │             (aktives Vermögen ohne Pflegebucket)
                    v
           Marktregime / Alarm / Guardrails
                    v
          Mindest-Flex / Budget / Glättung
                    v
       Netto-Floor + tatsächlich freigegebener Flex
                    v
        Liquiditätsziel / Verkäufe / Steuer-Settlement
```

## Nutzerentscheidungen und automatische Policies

| Bereich | Nutzer entscheidet | Suite automatisiert bei Aktivierung |
|---------|--------------------|--------------------------------------|
| Haushalt und Bedarf | Profile, Floor, Flex, Mindest-Flex, Renten, Laufzeit und Netto-/Bruttokonvention | Haushaltsaggregation und jährliche Fortschreibung gemäß Eingaben |
| Vermögen | Bestände, Einstandswerte, Asset-Klassifikation, Gold- und Bond-Nutzung | Bewertung, Ziel-Liquidität, regelbasierte Verkaufsvorschläge und Simulatortransaktionen |
| Risiko und Entnahme | Guardrail-, VPW-, Sampling-, Stress- und Langlebigkeitsparameter | Marktregime, Flex-Rate, VPW-Rahmen, Alarm- und Reentry-Policies |
| Steuer | Teilfreistellung je Tranche, Sparer-Pauschbetrag, Kirchensteuersatz und Ausgangs-Verlustvortrag | vereinfachtes Jahres-Settlement und steuerorientierte Verkaufsreihenfolge |
| Pflege | Aktivierung, Kosten, Grade, Übergänge, regionale Faktoren, Bucket und Mortalitätsfaktoren | Pflegeeintritt/-progression, Kostenpfad, Bucket-Einsatz und Mortalitätsziehung im Simulator |
| Umsetzung | Brokerorders, tatsächliche Gebühren, bestätigte Reconciliation und Übernahme eines Optimierergebnisses | keine autonome Brokeraktion und keine automatische Übernahme in reale Bestände |

## C.1 Floor-Flex-Guardrail-System

### C.1.1 Grundkonzept

Das Floor-Flex-Modell trennt den aktuellen nominalen Jahresbedarf in zwei
Komponenten:

| Komponente | Beschreibung | Beispiel |
|------------|--------------|----------|
| **Floor** | Nicht verhandelbarer Grundbedarf | Miete, Versicherungen, Lebensmittel |
| **Flex** | Optionaler Zusatzbedarf | Reisen, Hobbys, Luxus |

Die Verrechnung folgt konzeptionell diesem Vertrag; der Pflegezusatz ist im
Simulator bereits im aktuellen Brutto-Floor enthalten:

```javascript
const nettoFloor = Math.max(0, bruttoFloorAktuell - renteJahr);
const rentenUeberschuss = Math.max(0, renteJahr - bruttoFloorAktuell);
const flexBasis = Math.max(0, flexBedarfAktuell - rentenUeberschuss);

// Dynamic Flex kann flexBasis zuvor durch den VPW-abgeleiteten Wert ersetzen.
const actualFlex = flexBasis * (flexRate / 100);
const totalSpending = nettoFloor + actualFlex;
```

Die Namen `inflatedBedarf.floor` und `inflatedBedarf.flex` im Engine-Vertrag
sind historisch. Sie enthalten im laufenden Aufruf bereits aktuelle nominale,
nach Rente verrechnete Werte. Die Inflation des betrachteten Jahres wird erst
beim State-Roll für das Folgejahr angewandt.

### C.1.2 Flex-Rate-Bestimmung

**Marktregime-abhängige Basis-Flex-Rate:**

| Regime | Basis-Flex-Rate | Begründung |
|--------|-----------------|------------|
| `peak_hot` | 100% | Markt überhitzt, aber noch am ATH |
| `peak_stable` | 100% | Stabiles ATH |
| `recovery` | 85-95% | Erholung, aber noch vorsichtig |
| `side_long` | 80-90% | Seitwärtsmarkt |
| `corr_young` | 70-80% | Junge Korrektur |
| `bear_deep` | 50-70% | Tiefer Bärenmarkt |
| `recovery_in_bear` | 60-75% | Rally im Bärenmarkt (Vorsicht!) |

**Entnahmequoten-Anpassung** (konzeptionell, siehe `SpendingPlanner.mjs`):
```javascript
const withdrawalRate = totalSpending / depotValue;

if (withdrawalRate > 0.055) {
    // ALARM: Drastische Kürzung
    flexRate = Math.min(flexRate, 50);
} else if (withdrawalRate > 0.045) {
    // VORSICHT: Moderate Kürzung
    flexRate = Math.min(flexRate, 75);
}
```

### C.1.3 Glättungsalgorithmus

**Exponentielle Glättung** (siehe `config.mjs`):
```javascript
SPENDING_MODEL: {
    FLEX_RATE_SMOOTHING_ALPHA: 0.35,     // Glättungsfaktor
    RATE_CHANGE_MAX_UP_PP: 2.5,          // +2.5pp pro Jahr (konservativ)
    RATE_CHANGE_AGILE_UP_PP: 4.5,        // +4.5pp in Peak/Recovery (agiler)
    RATE_CHANGE_MAX_DOWN_PP: 3.5,        // -3.5pp pro Jahr (normal)
    RATE_CHANGE_MAX_DOWN_IN_BEAR_PP: 6.0,// -6pp im Bärenmarkt (geändert: war 10.0)
    RATE_CHANGE_RELAX_MAX_DOWN_PP: 20.0  // Relaxierung bei hohem Vermögen (neu)
}
```

**Warum diese Werte?**
- α = 0.35: Reagiert auf Marktänderungen, glättet aber Noise
- Max +2.5pp: Verhindert zu schnelles "Hochfahren" nach Krise
- Max -6pp im Bärenmarkt: Sanftere Reduktion (geändert von -10pp), kombiniert mit Flex-Budget-System
- Relaxierung +20pp: Bei niedriger Entnahmequote darf Down-Limit entspannt werden

### C.1.4 Recovery-Guardrail

**ATH-Gap-basierte Kürzung** (siehe `config.mjs`):
```javascript
RECOVERY_GUARDRAILS: {
    CURB_RULES: [
        { minGap: 25, maxGap: Infinity, curbPercent: 25 },  // >25% vom ATH: 25% Kürzung
        { minGap: 15, maxGap: 25, curbPercent: 20 },       // 15-25%: 20% Kürzung
        { minGap: 10, maxGap: 15, curbPercent: 15 },       // 10-15%: 15% Kürzung
        { minGap: 0, maxGap: 10, curbPercent: 10 }         // 0-10%: 10% Kürzung
    ]
}
```

### C.1.5 Alarm-Eskalation und Deeskalation

**Eskalations-Logik** (konzeptionell, siehe `SpendingPlanner.mjs`):
```javascript
function shouldActivateAlarm(context) {
    if (context.scenario !== 'bear_deep') return false;

    const quoteCritical = context.withdrawalRate > 0.055;  // >5.5%
    const runwayCritical = context.runwayMonths < 24;      // <2 Jahre
    const drawdownCritical = context.realDrawdown > 0.25;  // >25%

    return (quoteCritical && runwayCritical) || drawdownCritical;
}
```

**Deeskalations-Logik** (konzeptionell, siehe `SpendingPlanner.mjs`):
```javascript
function shouldDeactivateAlarm(context, alarmHistory) {
    if (context.scenario.startsWith('peak')) {
        return context.withdrawalRate <= 0.055 || context.realDrawdown <= 0.15;
    }

    if (context.scenario === 'recovery') {
        const runwayOk = context.runwayMonths >= context.minRunway + 6;
        const drawdownOk = context.realDrawdown <= 0.20;
        const noNewLows = !alarmHistory.hasNewYearlyLow;
        return runwayOk || (drawdownOk && noNewLows);
    }

    return false;
}
```

### C.1.6 Mindest-Flex p.a.

`Mindest-Flex p.a.` ist eine optionale Untergrenze für flexible Ausgaben in Jahren, in denen Safety-/Guardrail-Regeln den Flex-Anteil stark kürzen würden. Fachlich soll damit ein Mindestmaß an Lebensqualität modelliert werden, ohne den nicht verhandelbaren Floor zu erhöhen.

Eigenschaften:

- Der Wert wird in Balance und Simulator als Jahresbetrag gepflegt und gegen den jeweiligen Flex-Bedarf validiert (`minimumFlexAnnual <= flexBedarf` bzw. `<= startFlexBedarf`).
- Negative Werte werden abgelehnt; ungültige oder leere Werte fallen in Engine-Pfaden defensiv auf 0 zurück.
- Die Engine setzt den Mindest-Flex ratenbasiert um: `requiredRate = minimumFlexAnnual / inflatedBedarf.flex`.
- Der Bedarf selbst bleibt unverändert; Diagnose und Logs zeigen Status, erforderliche Rate, Blockiergrund und effektiven Flex vor/nach dem Policy-Schritt.
- Guardrail-Resets erkennen relevante Änderungen am Mindest-Flex, erhalten aber den steuerlichen Zustand (`lastState.taxState`).
- Profilverbund addiert profilbezogene Mindest-Flex-Werte für den Haushaltslauf und transportiert die Aufschlüsselung in `minimumFlexProfiles`.

Policy-Reihenfolge:

1. Alarm und Guardrails bestimmen zunächst die gekürzte Flex-Rate.
2. Mindest-Flex kann diese Rate anheben, wenn kein Notfallblocker greift.
3. Flex-Budget-Cap und finale Rate-Limits laufen danach weiter und können die Anhebung begrenzen.

Notfallblocker:

| Blocker | Wirkung |
|---------|---------|
| Aktiver Alarm | Mindest-Flex wird nicht angehoben |
| Gesamtvermögen deckt Floor + Mindest-Flex nicht | Blockierstatus `floor_minimum_flex_not_covered` |
| Mindest-Runway wäre nach Proxy nicht wiederherstellbar | Blockierstatus `minimum_runway_not_restorable` |

Backtest- und Monte-Carlo-Logs enthalten `MinFlex€` und `MinFSt`; im Detailmodus zusätzlich `MinFBlock` und `MinFEff`. Gold-bezogene Logspalten werden ausgeblendet, wenn das Goldmodul inaktiv ist.

---

## C.2 Steuer-Engine

### C.2.1 Implementierte Steuerparameter

Die Steuer-Engine bildet einen begrenzten Planungsfall ab. Sätze und
Freibeträge sind Parameter des Rechenlaufs; die Suite leitet weder den
persönlichen Rechtsstatus noch den jeweils geltenden gesetzlichen Betrag
automatisch ab.

| Modellbestandteil | Rechenvertrag | Grenze |
|-------------------|---------------|--------|
| **Kapitalertragsteuer-Basis** | 25% | pauschale Modellkonstante, keine persönliche Veranlagung |
| **Solidaritätszuschlag** | 5,5% auf die modellierte Kapitalertragsteuer | keine individuelle Freigrenzen-/Erstattungslogik |
| **Kirchensteuer** | `kirchensteuerSatz` als Nutzerparameter in der Effektivsatzformel | keine Bundesland- oder Religionsableitung |
| **Teilfreistellung** | `tranche.tqf` je Tranche | kein automatischer Fonds-/Bestandsnachweis |
| **Sparer-Pauschbetrag** | `sparerPauschbetrag` als Nutzerparameter | nicht fest auf 1.000/2.000 Euro codiert |
| **Verlustvortrag** | ein kombinierter `lossCarry` | keine getrennten Verlusttöpfe, insbesondere kein eigener Aktienverlusttopf |

Nicht enthalten sind insbesondere Dividenden und Ausschüttungen als eigene
Zahlungsströme, Vorabpauschale, Quellensteuer, Günstigerprüfung, persönliche
Einkommensteuer, Sozialabgaben und eine automatische Aktualisierung bei
Rechtsänderungen.

### C.2.2 Rohwerte je Verkauf und finales Settlement

Die Sale-Engine liefert pro Verkauf signierte Rohwerte. Erst das zentrale
Jahres-Settlement bestimmt die endgültige modellierte Steuer:

```javascript
gainQuoteSigned = (marketValue - costBasis) / marketValue;
realizedGainSigned = sellGross * gainQuoteSigned;
taxableAfterTqfSigned = realizedGainSigned * (1 - tranche.tqf);

effectiveTaxRate = 0.25 * (1 + 0.055 + kirchensteuerSatz);
```

Verluste behalten dabei ihr Vorzeichen. Für die Mengenplanung existiert
zusätzlich eine nichtnegative Gewinnquote; sie ist nicht mit dem signierten
Rohwert des Settlements gleichzusetzen.

**Illustratives Beispiel ohne Verlustvortrag und Kirchensteuer:**

| Schritt | Berechnung | Wert |
|---------|------------|------|
| Verkauf einer vollständig veräußerten Tranche | — | 10.000 € |
| Modellierter Einstandswert | — | 7.000 € |
| Signierter realisierter Gewinn | 10.000 − 7.000 | 3.000 € |
| Nach TQF 30% | 3.000 × 70% | 2.100 € |
| Nach Nutzer-SPB 1.000 € | 2.100 − 1.000 | 1.100 € |
| Steuer mit 26,375% | 1.100 × 26,375% | 290,13 € |
| **Modellierter Nettoerlös** | 10.000 − 290,13 | **9.709,87 €** |

Das Beispiel erklärt die Rechenmechanik, nicht die steuerliche Behandlung
eines konkreten Depots.

### C.2.3 Regelbasierte Verkaufsreihenfolge

Die Reihenfolge ist kontextabhängig und nicht generell FIFO:

- Aktien-Tranchen werden zuerst nach der modellierten Steuerbelastung, dann
  nach der nichtnegativen Gewinnquote, anschließend nach **neuerem**
  Kaufdatum und zuletzt stabil nach ID geordnet.
- Gold-Tranchen werden untereinander nach älterem Kaufdatum zuerst geordnet.
- Die Reihenfolge der Asset-Klassen hängt von Markt- und
  Allokationssituation ab. Der defensive Pfad priorisiert Gold, dann Bonds und
  Aktien; der normale Pfad priorisiert Bonds, danach steuerorientiert
  sortierte Aktien und zuletzt Gold. Ein Gold-Übergewicht besitzt einen
  eigenen Abbaupfad.

Diese Reihenfolge ist eine Planungs-Policy der Suite. Sie beweist nicht, dass
ein Broker genau diese Stücke steuerlich zuordnet. Operative Orderausführung,
Depot-FIFO und tatsächliche Abrechnung bleiben Nutzer- beziehungsweise
Brokerverantwortung.

### C.2.4 Explizite Modellflags statt automatische Rechtsprüfung

`goldSteuerfrei` und `tranche.tqf` sind Eingaben in den Modellvertrag. Die
Suite leitet eine Steuerbefreiung weder automatisch aus einer Gold-Haltedauer
noch aus einem Kaufdatum vor 2009 ab. Das Kaufdatum beeinflusst die
Verkaufsreihenfolge, ersetzt aber keinen steuerrechtlichen Nachweis. Wer
Altbestand, Fondsstatus oder eine Steuerfreiheit modelliert, muss den dazu
passenden Parameter bewusst setzen und fachlich selbst prüfen.

### C.2.5 Jahres-Settlement mit Verlustverrechnungstopf

Die finale Steuer eines Jahres wird nicht pro Einzelverkauf bestimmt, sondern durch ein zentrales **Jahres-Settlement** (`tax-settlement.mjs`). Die Sale-Engine liefert dafür nur noch Roh-Aggregate (`realizedGainSigned`, `taxableAfterTqfSigned`) pro Verkauf.

**Modellinterne Verrechnungsreihenfolge:**

1. **Rohsumme bilden:** Alle Gewinne und Verluste des Jahres nach TQF summieren (`sumTaxableAfterTqfSigned`)
2. **Verlustvortrag verrechnen:** Vorjahres-`lossCarry` von der Summe abziehen
3. **Sparer-Pauschbetrag anwenden:** Nur auf verbleibenden positiven Rest
4. **Steuer berechnen:** KESt + Soli + ggf. KiSt auf finalen Steuerbetrag
5. **Negativen Rest vortragen:** Wird als `lossCarry` ins nächste Jahr übernommen

```javascript
// tax-settlement.mjs (vereinfacht)
function settleTaxYear({ taxStatePrev, rawAggregate, sparerPauschbetrag, kirchensteuerSatz }) {
    const signedAfterCarry = rawAggregate.sumTaxableAfterTqfSigned - taxStatePrev.lossCarry;
    const positiveAfterCarry = Math.max(0, signedAfterCarry);
    const spbUsed = Math.min(sparerPauschbetrag, positiveAfterCarry);
    const taxBase = Math.max(0, positiveAfterCarry - spbUsed);
    const taxDue = taxBase * keSt;
    const lossCarryNext = Math.max(0, -signedAfterCarry);
    return { taxDue, taxStateNext: { lossCarry: lossCarryNext }, details: { ... } };
}
```

**Wichtige Designentscheidungen und Grenzen:**

- **TQF-Symmetrie im Modell:** Teilfreistellung wird rechnerisch symmetrisch auf Gewinne und Verluste angewandt. Eine Verlustposition mit TQF 30% erzeugt im Modell nur 70% anrechenbare Verluste.
- **Zwei Gewinnquoten:** `gainQuotePlan` (≥ 0, für Mengenplanung) und `gainQuoteSigned` (mit Vorzeichen, für Roh-Steuerdaten) in der Sale-Engine.
- **SPB nur im Settlement:** Der Sparer-Pauschbetrag wird offiziell nur im Jahres-Settlement verbraucht. Die Sale-Engine nutzt SPB weiterhin zur Mengenplanung, aber nicht als finale Steuerlogik.
- **Kein Feature-Toggle:** `lossCarry = 0` ist der natürliche No-Op-Default.
- **Ein kombinierter Topf:** Das Modell bildet keine gesetzlichen Trennregeln zwischen verschiedenen Verlustarten vollständig nach.

**State-Persistenz:**

- `lastState.taxState.lossCarry` wird in der Balance-App über `balance-storage.js` persistiert und überlebt Guardrail-Resets.
- Im Simulator wird `taxState` pro Run Jahr-für-Jahr fortgeschrieben. Bei Notfallverkäufen (Forced Sales) wird ein **Gesamt-Settlement-Recompute** durchgeführt, um SPB-Doppelverbrauch zu vermeiden.

**UI-Ausgabe:**

- `action.steuer` enthält die finale Settlement-Steuer (nicht die Plansteuer der Sale-Engine).
- `action.taxSettlement` liefert Details (taxBeforeLossCarry, taxAfterLossCarry, taxSavedByLossCarry, spbUsedThisYear).
- `action.taxRawAggregate` enthält die Roh-Aggregate für Diagnose und Simulator-Recompute.

---

## C.3 Monte-Carlo-Methodik

### C.3.1 Sampling-Strategien

**Strategie 1: Zufälliges Jahr (UNIFORM)**
```javascript
startYearIndex = Math.floor(rand() * annualData.length);
```

**Strategie 2: CAPE-Sampling**
```javascript
if (useCapeSampling && inputs.marketCapeRatio > 0) {
    const candidates = getStartYearCandidates(inputs.marketCapeRatio, annualData);
    if (candidates.length > 0) {
        const chosenYear = candidates[Math.floor(rand() * candidates.length)];
        startYearIndex = annualData.findIndex(d => d.jahr === chosenYear);
    }
}
```

**Strategie 3: Block-Bootstrap**
```javascript
function sampleNextYearData(state, method, blockSize, rand, stressCtx) {
    if (method === 'block_bootstrap') {
        if (state.blockRemaining > 0) {
            state.blockRemaining--;
            return annualData[(state.currentIndex + 1) % annualData.length];
        } else {
            state.currentIndex = Math.floor(rand() * annualData.length);
            state.blockRemaining = blockSize - 1;
            return annualData[state.currentIndex];
        }
    }
}
```

**Strategie 3a: Stationary Bootstrap**

Der Simulator bietet zusaetzlich `stationary` als Stationary Bootstrap nach Politis/Romano an. Das bestehende UI-Feld `mcBlockSize` wird dabei als erwartete Blocklaenge interpretiert. Pro Simulationsjahr wird deterministisch entschieden, ob ein neuer historischer Blockstart gezogen wird (`p = 1 / expectedBlockLength`) oder ob der aktuelle historische Block sequenziell fortgesetzt wird. Am Datenende wird ein neuer Blockstart erzwungen; ein Wrap-around vom letzten zum ersten historischen Jahr findet nicht statt.

Startjahrfilter, Recency-Gewichtung und CAPE-Sampling greifen nur bei neuen Blockstarts. Innerhalb eines laufenden Blocks wird das naechste historische Jahr ohne erneute Gewichtung genutzt, damit lokale Autokorrelation erhalten bleibt. Der Sampler-State wird pro Monte-Carlo-Run initialisiert und ist dadurch mit Worker-Chunks paritaetisch.

**Strategie 4: Regime-basiert**
```javascript
REGIME_TRANSITIONS = {
    BULL: { BULL: 0.65, BEAR: 0.10, SIDEWAYS: 0.20, STAGFLATION: 0.05 },
    BEAR: { BULL: 0.20, BEAR: 0.40, SIDEWAYS: 0.30, STAGFLATION: 0.10 },
    // ...
};
```

### C.3.1a Startjahr-Sampling-Modi

**Strategie 5: FILTER Mode** (monte-carlo-runner.js)
```javascript
// Beschränkt Sampling auf bestimmte Jahre (z.B. ab 1970)
if (samplingMode === 'FILTER') {
    const validIndices = annualData
        .map((d, i) => i)
        .filter(i => annualData[i].jahr >= filterStartYear);
    startYearIndex = validIndices[Math.floor(rand() * validIndices.length)];
}
```
*Anwendung:* Ausschluss des "Wirtschaftswunder"-Bias (1950-1960) für konservativere Simulationen.

**Strategie 6: RECENCY Mode mit Halbwertszeit** (monte-carlo-runner.js)
```javascript
// Exponentiell gewichtetes Sampling - jüngere Jahre bevorzugt
function buildCdfFromIndices(indices, halfLife) {
    const weights = indices.map((_, i) => Math.exp(-i * Math.LN2 / halfLife));
    const total = weights.reduce((a, b) => a + b, 0);
    let cumulative = 0;
    return weights.map(w => (cumulative += w / total));
}

function pickFromSampler(cdf, rand) {
    const r = rand();
    // Binäre Suche O(log n)
    let lo = 0, hi = cdf.length - 1;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (cdf[mid] < r) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}
```
*Anwendung:* Höhere Gewichtung für jüngere Marktdaten (z.B. Halbwertszeit = 20 Jahre).

**Vergleich der Sampling-Modi:**

| Modus | Gewichtung | Anwendungsfall |
|-------|------------|----------------|
| UNIFORM | Gleichverteilt | Standard, historisch neutral |
| CAPE | CAPE-Band-Match | Aktuelle Bewertung berücksichtigen |
| FILTER | Ausschluss Jahre | Konservativ ohne "Golden Age" |
| RECENCY | Exponentiell | Jüngere Marktstruktur bevorzugen |
| BLOCK_BOOTSTRAP | Sequenzielle Blöcke | Autokorrelation und Krisencluster erhalten |

Die Startjahr- und Folgejahrlogik liegt in `mc-year-sampling.js`, `mc-run-context.js` und `monte-carlo-runner.js`. Über `mcExcludeEstimatedHistory` kann die geschätzte Erweiterung 1925-1949 aus dem Monte-Carlo-Sampling ausgeschlossen werden; dann beginnt die gezogene Historie faktisch ab 1950.

### C.3.2 Stress-Presets

**9 vordefinierte Stress-Szenarien** (siehe `simulator-data.js`):

| Preset | Typ | Jahre | Parameter |
|--------|-----|-------|-----------|
| `STAGFLATION_70s` | conditional_bootstrap | 7 | Inflation ≥ 7%, Real-Rendite ≤ -2% |
| `DOUBLE_BEAR_00s` | conditional_bootstrap | 6 | Real-Rendite ≤ -8%, Min-Cluster 2 |
| `GREAT_DEPRESSION_29_33` | conditional_bootstrap | 5 | Jahre 1929-1933 |
| `WWII_40s` | conditional_bootstrap | 7 | Jahre 1939-1945 |
| `STAGFLATION_SUPER` | hybrid | 8 | 70er + künstlich -3% μ |
| `INFLATION_SPIKE_3Y` | parametric | 3 | μ = -5%, σ × 1.5, Inflation ≥ 7% |
| `FORCED_DRAWDOWN_3Y` | parametric_sequence | 3 | -25%, -20%, -15% |
| `LOST_DECADE_12Y` | parametric | 12 | μ = -6%, Gold capped bei +15% |
| `CORRELATION_CRASH_4Y` | parametric | 4 | Aktien -15%, Gold -5%, Inflation 5% |

**Neue historische Stress-Szenarien (ab 1925):**
- **Great Depression (1929-1933):** Bootstrapped aus den historischen Jahren der Weltwirtschaftskrise. Ermöglicht Tests für extreme Deflation und Vermögensvernichtung.
- **Zweiter Weltkrieg (1939-1945):** Bootstrapped aus der Kriegsperiode mit Kapitalverkehrskontrollen, Inflation und Wirtschaftsumstellung.

### C.3.3 Historische Daten

**Datenbasis und Provenienz** (siehe `simulator-data.js` und `DATA_SOURCES.md`):

| Feld | Dokumentierter Status | Zeitraum |
|------|-----------------------|----------|
| `msci_eur` | MSCI-World-EUR-ähnlicher Indexlevel; exakte Variante (`Price`, `Net TR`, `Gross TR`) ist noch nicht vollständig dokumentiert | 1925-2025 |
| `inflation_de` | deutsche Inflationsreihe bzw. Proxy | 1925-2025 |
| `zinssatz_de` | deutscher Kurz-/Zinsproxy | 1925-2025 |
| `lohn_de` | deutsche Lohnentwicklungsreihe bzw. Proxy | 1925-2025 |
| `gold_eur_perf` | Gold-EUR-Performance; frühe Jahre enthalten Null-Fallbacks und müssen quellenfachlich weiter geklärt werden | 1925-2025, belastbarer ab späterer Historie |
| `cape` | CAPE-/Shiller-Bewertungsproxy | 1925-2025 |

**Provenienz-Hinweis `msci_eur`:**
*   Die Reihe wird im Code als MSCI-World-EUR-ähnlicher Proxy behandelt; die genaue Indexvariante ist ausdrücklich noch nicht vollständig belegt.
*   Die Jahre 1925-1949 sind eine geschätzte Erweiterung und auf den 1950er-Basiswert normalisiert. Sie dienen vor allem der Abbildung extremer Sequenzrisiken.
*   Deshalb macht dieses Dokument keine harte Aussage mehr, dass Teilperioden exakt einem bestimmten MSCI-Net-Total-Return-Index entsprechen. Der Klärpunkt steht in `DATA_SOURCES.md`.
*   Für konservative Läufe kann die geschätzte Frühhistorie per Monte-Carlo-Option ausgeschlossen oder über Filter/Recency-Gewichtung schwächer gewichtet werden.

**Hinweis Balance-App:** In der Balance-App werden reale Depotstände und
ETF-Kurse verwendet; eine im veröffentlichten NAV bereits enthaltene TER darf
dort nicht nochmals pauschal abgezogen werden. Diese Aussage lässt sich nicht
auf die Simulatorreihe übertragen: Für `msci_eur` ist die genaue
Price-/Net-/Gross-Return-Variante ungeklärt. Engine und Simulator modellieren
TER, Spread, Slippage und Transaktionsgebühren nicht als eigene Cashflows.

**Erweiterte Datenbasis (1925-2025):**
*   **Erweiterung:** Die Daten wurden ab Januar 2026 von 1950 auf **1925** erweitert.
*   **Rekonstruktion 1925-1949:** MSCI-Levels wurden aus US-Marktdaten rekonstruiert und auf den 1950er-Basiswert normalisiert.
*   **Zweck:** Ermöglicht Stress-Tests mit historisch extremen Perioden (Große Depression, Zweiter Weltkrieg).

**Daten-Anomalie 1950-1960 ("Wirtschaftswunder"):**
*   **Beobachtung:** Die Jahre 1950-1960 weisen eine nominale CAGR von **~19.4%** (Real: ~17.4%) auf.
*   **Bewertung:** Dies ist ein historischer Sonderfall (Nachkriegs-Wiederaufbau), der sich so kaum wiederholen lässt.
*   **Risiko:** Da die Monte-Carlo-Simulation zufällige Blöcke aus der Historie zieht, besteht das Risiko, dass "Wirtschaftswunder"-Phasen eine zu optimistische Erwartungshaltung erzeugen.
*   **Empfehlung:** Für eine konservative Planung ("Stress-Test") kann die Datenbasis erst ab **1970** (Beginn Stagflation) oder **1978** (Präzisere Daten) genutzt werden. Die neuen Stress-Presets "Great Depression" und "WWII" bieten zusätzliche Extremszenarien.

**Verteilung der Regime (1925-2025):**

| Regime | Jahre | Anteil |
|--------|-------|--------|
| BULL | 28 | 28% |
| BEAR | 22 | 22% |
| SIDEWAYS | 38 | 38% |
| STAGFLATION | 12 | 12% |

*Hinweis: Die erweiterte Historie (1925-1949) enthält mehr Bärenmarkt- und Stagflationsjahre durch Große Depression und Weltkriege.*

### C.3.4 Determinismus

**Per-Run-Seeding** (siehe `simulator-utils.js`):
```javascript
export function makeRunSeed(baseSeed, comboIdx, runIdx) {
    const base = normalizeSeed(baseSeed);
    const combo = normalizeSeed(comboIdx);
    const run = normalizeSeed(runIdx);
    let h = mix32(base ^ mix32(combo + 0x9e3779b9));
    h = mix32(h ^ mix32(run + 0x85ebca6b));
    return h >>> 0;
}
```

### C.3.5 Erfolg, Ruin und Ergebnisgrenzen

Die Monte-Carlo-Erfolgsquote ist rein modellintern:

```text
Erfolgsquote = (Anzahl Läufe − failCount) / Anzahl Läufe
```

`failCount` steigt bei `isRuin`; ein Engine-Validierungsfehler wird im direkten
Simulatorpfad ebenfalls als fehlgeschlagener Lauf behandelt. Endet der Lauf,
weil alle modellierten Personen verstorben sind, ist er ohne vorherigen Ruin
erfolgreich. Die Quote misst daher die Floor-Deckung unter den gewählten
Parametern und gezogenen Pfaden, nicht die Wahrscheinlichkeit einer Garantie
in der realen Welt.

Die gleich benannte Optimierungsmetrik besitzt zwei Darstellungsgrenzen:
Sweep-Ergebnisse führen `successProbFloor` als Prozentwert von 0 bis 100,
während Auto-Optimize intern ein Verhältnis von 0 bis 1 verwendet. Übergaben
normalisieren diese Einheiten; Dokumentation und manuelle Auswertung dürfen
sie nicht ungeprüft mischen.

Weitere Ergebnisgrößen haben bewusst engere Basen:

- `depotErschoepfungsQuote` zählt einen fehlgeschlagenen Lauf oder einen
  Aktien-plus-Gold-Endbestand von höchstens 100 Euro. Freie Liquidität und
  Pflegebucket sind in dieser Depot-Teilgröße nicht enthalten. Dashboard und
  Handbuch benennen deshalb ausdrücklich „Ruin oder Aktien/Gold ≤ 100 €“ und
  grenzen die nicht erfassten Bestände ab.
- `finalOutcomes` verwendet Aktien, Gold und freie Liquidität. Ein verbleibender
  Pflegebucket wird separat berichtet und ist nicht im Endvermögen enthalten.
- `jahresentnahme_real` verwendet die effektive nominale Auszahlung und den
  kumulierten Faktor des aktuellen Modelljahres. Reale Entnahmestichproben und
  Consumption-at-Risk beziehen sich damit auf die Kaufkraft des ersten
  Simulatorjahres; sie bleiben dennoch modellinterne Ergebnisgrößen.

Erfolgsquote, Depoterschöpfung, Endvermögen, Kürzungsjahre, Pflegebucket und
Drawdown müssen daher gemeinsam gelesen werden. Keine einzelne Kennzahl ist
ein vollständiges Qualitätsurteil über einen Ruhestandsplan.

---

## C.4 Pflegefall-Modellierung

### C.4.1 Datengrundlage

`simulator-data.js` bezeichnet den BARMER Pflegereport 2024 als Ausgangspunkt.
Die im Code hinterlegten Werte sind jedoch keine direkt übernommenen
Jahresinzidenzen: dokumentiert ist eine interne Umrechnung von Prävalenzen
unter Annahme einer durchschnittlichen Pflegedauer von vier Jahren sowie eine
Glättung in Fünfjahres-Altersbuckets. Die Tabelle ist deshalb eine
**Modellkalibrierung**. Quellenbezug, Umrechnung und Progressionswerte müssen
getrennt von der rein technischen Implementierung empirisch validiert werden.

### C.4.2 Altersabhängige Eintrittswahrscheinlichkeiten

Der aktuelle Eintrittsalgorithmus zieht ausschließlich einen Neueintritt in
PG1 oder PG2. PG3 bis PG5 werden danach durch Progression erreicht. Daher ist
für die effektive Eintrittswahrscheinlichkeit nur die Summe aus PG1 und PG2
maßgeblich:

| Altersbucket | PG1-Parameter | PG2-Parameter | Effektiver Eintritt PG1/PG2 p.a. |
|--------------|---------------|---------------|----------------------------------|
| 65 | 1,2% | 0,6% | 1,8% |
| 70 | 2,0% | 1,0% | 3,0% |
| 75 | 3,5% | 1,8% | 5,3% |
| 80 | 5,5% | 3,2% | 8,7% |
| 85 | 8,5% | 5,5% | 14,0% |
| 90 | 12,0% | 8,0% | 20,0% |
| 95 | 14,0% | 9,0% | 23,0% |

Unter 65 wird kein Eintritt gezogen; oberhalb des letzten Buckets bleibt der
95er-Wert wirksam. `PFLEGE_GRADE_PROBABILITIES` enthält zwar zusätzlich
Spalten für PG3 bis PG5, `sampleCareGrade()` verwendet sie beim Neueintritt
derzeit nicht.

### C.4.3 Progressionsmodell

```javascript
PFLEGE_GRADE_PROGRESSION_PROBABILITIES = {
    1: 0.15,  // PG1 → PG2: 15% pro Jahr
    2: 0.12,  // PG2 → PG3: 12% pro Jahr
    3: 0.10,  // PG3 → PG4: 10% pro Jahr
    4: 0.08,  // PG4 → PG5: 8% pro Jahr
    5: 0.00   // PG5: Keine weitere Verschlechterung
};
```

Pro aktivem Pflegejahr ist höchstens ein Übergang in den direkt nächsten Grad
möglich. Im Eintrittsjahr wird noch keine zusätzliche Progression gezogen;
sie beginnt ab dem folgenden Pflegejahr. Im chronischen Modus bleibt Pflege
bis zum Lebensende aktiv. Im akuten Modus endet sie nach der innerhalb der
Nutzergrenzen gezogenen Dauer. Die Prozentwerte sind Modellparameter, keine
individuelle Prognose der Zeit bis PG5.

### C.4.4 Kosten-Modell

Kosten, Flex-Level und Mortalitätsfaktor sind je Pflegegrad
Nutzereinstellungen. Die UI startet mit folgenden Werten; Presets oder
manuelle Eingaben können sie ändern:

| Pflegegrad | Zusatzbedarf p.a. | verbleibendes Flex-Level | max. Mortalitätsfaktor |
|------------|-------------------|--------------------------|--------------------------|
| PG1 | 6.000 € | 75% | 0 (= keine Erhöhung) |
| PG2 | 12.000 € | 25% | 0 (= keine Erhöhung) |
| PG3 | 18.000 € | 10% | 3,0 |
| PG4 | 32.000 € | 0% | 5,0 |
| PG5 | 60.000 € | 0% | 5,0 |

Der Zusatzbedarf wird mit Jahresinflation, zusätzlicher Kosten-Drift und
regionalem Faktor fortgeschrieben. Der bei Eintritt gespeicherte Floor sowie
der konfigurierte maximale Pflege-Floor bilden einen dynamisch
inflationsangepassten Cap. Ein Ramp-up wird im aktuellen Code nur dann
angewandt, wenn der rohe Zielwert oberhalb dieses Caps liegt. Der aktuelle
Wert `zusatzFloorZiel` wird dem Haushalts-Floor zugerechnet;
`zusatzFloorDelta` hält davon getrennt nur die positive Veränderung gegenüber
dem bisherigen Pflege-Zielwert für Diagnose- und kumulative Pflegefelder fest.
Der Flex-Level wirkt separat auf den Haushalts-Flex.

**Behobener Produktmangel PD-02 / historisches Modellrisiko MR-10:** UI und
persistierte Profile behalten Prozentwerte wie `3,5`. `readCareInputs()` und
`buildSimulatorInputsFromProfileData()` verwenden denselben Normalisierer und
geben `0,035` an den Laufzeitpfad weiter. Negative Werte werden dort auf null
normalisiert; ungültige UI-Werte verwenden den UI-Default 3,5 %, ungültige
oder fehlende Profilwerte aus Kompatibilitätsgründen weiterhin 0 %. Runner und
Worker transportieren dieses Verhältnis unverändert; `updateCareMeta()`
verwendet es ohne eine weitere Division durch 100. Das persistierte
Profilformat wurde nicht geändert. Deterministische Pflegejahre sichern für
3,5 % die Faktoren 1,035 und 1,035² sowie den bestehenden Cap-/Ramp-up-Pfad.

### C.4.5 Dual-Care für Paare

Person 1 und Person 2 besitzen getrennte Pflege-States und personbezogene
Zufallsziehungen. Die Haushaltslogik kombiniert die Pflege-Flexfaktoren der
noch lebenden Personen und führt die Kosten beider Personen im Jahresergebnis
zusammen. Ein Pflegeereignis kann die Ansparphase vorzeitig beenden.

**Simultane Pflege-KPIs:**
- `bothCareYears`: Jahre mit gleichzeitiger Pflege beider Partner
- `maxAnnualCareSpend`: Maximale jährliche Pflegekosten
- `totalCareCosts`: Kumulative Pflegekosten über Lebensdauer

### C.4.6 Mortalitäts-Multiplikator

Der Faktor ist je Pflegegrad konfigurierbar und wird nicht aus einer festen
internen Tabelle 1,2× bis 3,0× abgeleitet. Ein Wert von 0 oder höchstens 1
bewirkt keine Erhöhung. Bei einem höheren Zielwert steigt der wirksame Faktor
über `pflegeRampUp` Jahre linear von 1 bis zum konfigurierten Maximum:

```text
wirksamer Faktor = 1 + (Ziel-Faktor - 1) × Ramp-Fortschritt
```

Dieser Faktor multipliziert die alters- und geschlechtsspezifische
Basismortalität des aktuellen Jahres. Er ist eine Nutzannahme und keine
individuelle medizinische Prognose.

### C.4.7 Pflegebucket als algorithmische Zweckbindung

Der Pflegebucket erweitert die Pflegefall-Modellierung um eine optionale Selbstversicherungsreserve. Er ist keine zusätzliche Renditestrategie und keine Pflegeversicherung, sondern ein separater Haushalts-State: ein Geldmarkt-/Cash-Betrag, der für die normale Entnahmeplanung gesperrt wird und erst bei schwerem Pflegefall in den Jahreslauf eingreifen darf.

**Fachlicher Zweck:**

- Pflegekosten entstehen sprunghaft und oft spät im Lebenspfad.
- Eine normale Liquiditätsreserve würde VPW, Runway und flexible Entnahmen erhöhen, obwohl der Betrag strategisch nicht konsumierbar ist.
- Die Zweckbindung reduziert die operative Entnahmebasis und senkt damit in normalen Jahren den Konsumspielraum leicht.
- In Pflegejahren kann die Reserve Notverkäufe aus Aktien/Gold vermeiden oder verringern.

**Datenmodell:**

```javascript
healthBucket: {
  enabled: boolean,
  initialAmount: number,
  assetSource: 'money_market_first_then_cash',
  triggerMinGrade: 4,
  triggerMode: 'OR' | 'AND',
  coverageMode: 'care_additional_floor_only' | 'floor_when_care_active',
  returnMode: 'cash_return',
  targetMode: 'inflation_indexed_diagnostic'
}
```

Die Definition liegt in der Profilpflege. Im Profilverbund gilt das Primary-Profil als Haushaltsdefinition; abweichende sekundäre Profildefinitionen werden gewarnt, aber nicht gemischt.

**Carve-Out-Algorithmus:**

1. Profile lesen und zum Haushalt aggregieren.
2. Startportfolio inklusive Detailtranchen initialisieren.
3. Pflegebucket aus cash-nahen Quellen ausgliedern:
   - Geldmarkt-Tranchen per FIFO nach Kaufdatum,
   - bei ungültigem Kaufdatum stabiler Fallback,
   - danach ungetranchter Geldmarkt,
   - danach Tagesgeld/Cash.
4. `healthBucketGeldmarkt`, `healthBucketTranches`, `healthBucketCashAmount` und `healthBucketMeta` setzen.
5. Operative Liquidität, Geldmarkt und Tagesgeld um den ausgegliederten Betrag reduzieren.

Aktien, Gold und Bonds werden in Version 1 nicht automatisch umgeschichtet. Reicht Geldmarkt/Cash nicht aus, wird der Bucket auf den verfügbaren Betrag gekappt und als Warnung in Log und UI transportiert.

**Engine-Air-Gap:**

Der Bucket wird nicht als `aktuelleLiquiditaet` an die Engine gegeben. Dadurch wirken VPW, Guardrails, Runway-Ziel, Ziel-Liquidität und Transaktionslogik nur auf frei verfügbares Vermögen. Fachlich entspricht das einem Liability-Matching-Baustein: Die Pflegeverpflichtung wird vom Konsumportfolio separiert.

**Trigger-Algorithmus:**

```javascript
function isHealthBucketTriggered({ careP1, careP2, minGrade, mode }) {
  const p1 = careP1?.active && careP1?.grade >= minGrade;
  const p2 = careP2?.active && careP2?.grade >= minGrade;
  return mode === 'AND' ? p1 && p2 : p1 || p2;
}
```

Die individuellen Pflege-Metadaten laufen über `householdContext.care.p1` und `.p2`, damit P1/P2-Trigger auch im Mehrpersonen-Haushalt korrekt funktionieren.

**Deckungsalgorithmus:**

Der Standard `care_additional_floor_only` begrenzt die Nutzung auf pflegebedingte Zusatzlücken. Damit wird verhindert, dass der Bucket normale Lebenshaltungskosten quersubventioniert. Der alternative Modus `floor_when_care_active` erlaubt bei aktivem Pflege-Trigger die Deckung des gesamten Floor-Shortfalls, wenn die praktische Trennung zwischen Basisbedarf und Pflegebedarf im Jahr zu grob ist.

Der Einbaupunkt liegt vor der Forced-Sale-Logik. Wenn der Trigger aktiv ist, erhöht der genutzte Bucket-Betrag die operative Liquidität und reduziert den Notverkaufsbedarf. Erst ein verbleibender Shortfall führt zu Verkäufen aus Risikoanlagen.

**Inflationsdiagnose:**

Der Zielbetrag kann inflationsindexiert ausgewiesen werden:

```javascript
targetInflationAdjusted = initialAmount * cumulativeInflationFactor;
realCoveragePct = bucketEnd / targetInflationAdjusted;
targetGap = max(0, targetInflationAdjusted - bucketEnd);
```

Dies ist bewusst eine Diagnose, kein automatisches Refill. Die Suite zeigt Kaufkraftlücke und reale Zieldeckung, schichtet aber nicht automatisch zurück in den Bucket.

**Steuerliche Modellgrenze:**

Version 1 behandelt den Bucket-Verbrauch cash-like. Die ausgegliederten Geldmarkt-Tranchen behalten Herkunft und Cost Basis für Transparenz, aber der Verbrauch erzeugt noch keine eigenen Tax-Aggregate. Das ist eine dokumentierte Vereinfachung; eine spätere Variante kann Bucket-Verkäufe in das bestehende Jahres-Settlement integrieren.

---

## C.5 Liquiditäts-Targeting

Runway beschreibt die Reichweite der **frei verfügbaren** aktuellen
Liquidität gegen den aktuellen Netto-Bedarf:

```text
Monatsbedarf = (Netto-Floor + effektiver Flex) / 12
Runway-Monate = freie Liquidität / Monatsbedarf
```

Ein aktivierter Pflegebucket zählt nicht zur freien Liquidität. Runway ist
damit eine operative Steuergröße für Verkäufe und Liquiditätsauffüllung, keine
Prognose, wie lange das Gesamtvermögen oder der Haushalt überlebt. Mindest- und
Ziel-Runway sind Policy-Schwellen; sie stellen keine separat garantierte
Reserve dar.

### C.5.1 Dynamisches Runway-Ziel

**Regime-abhängige Ziel-Runway** (siehe `config.mjs`):

| Regime | Ziel-Runway | Begründung |
|--------|-------------|------------|
| `peak` | 48 Monate | 4 Jahre Puffer am ATH |
| `hot_neutral` | 36 Monate | 3 Jahre Standard |
| `bear` | 60 Monate | 5 Jahre im Crash |
| `stagflation` | 60 Monate | 5 Jahre bei Stagflation |
| `recovery_in_bear` | 48 Monate | 4 Jahre in Rally |
| `recovery` | 48 Monate | 4 Jahre in Erholung |

Optional kann die TransactionEngine das Runway-Ziel zwischen `hot_neutral` und `bear` interpolieren. Der Default bleibt deaktiviert (`CONFIG.REGIME_SMOOTHING.TARGETS_ENABLED=false`), sodass bestehende Ergebnisse ohne explizite Aktivierung die diskreten Regime-Ziele verwenden. Bei aktivierter Glaettung gilt:

- Drawdown-Severity 0 verwendet das neutrale Ziel, Severity 1 das Stress-Ziel.
- Werte knapp um 10%, 20% und 30% Drawdown bewegen das Ziel monoton und ohne mehrmonatige Schwelle.
- Das geglaettete Ziel bleibt zwischen den Profil-Stuetzwerten und unterschreitet die harte Mindest-Runway nicht.
- Explizite Nutzerziele (`runwayTargetMonths`) umgehen die Zielwert-Glaettung.
- Diagnose und Logs weisen Rohziel, Effektivziel, Severity-Prozent, Stuetzziele, Fallback und harte Mindestgrenze aus.

### C.5.2 Refill-Trigger

**Drei Refill-Trigger:**

1. **Emergency Refill** (Runway < Min):
```javascript
if (runwayMonths < minRunwayMonths) {
    reason = 'emergency';
    targetRefill = (minRunwayMonths - runwayMonths) * monthlyNeed;
}
```

2. **Target Gap Refill** (Runway < 69% Ziel):
```javascript
if (runwayCoverage < 0.69) {
    reason = 'target_gap';
    targetRefill = (targetRunwayMonths * 0.75 - runwayMonths) * monthlyNeed;
}
```

3. **Opportunistic Refill** (Im Peak bei Überschuss):
```javascript
if (scenario.startsWith('peak') && equityOverweight > rebalBand) {
    reason = 'reinvest';
    targetRefill = Math.min(excessEquity, maxSkimAmount);
}
```

### C.5.3 Anti-Pseudo-Accuracy

**Quantisierung** (siehe `config.mjs`):

| Betrag | Rundung |
|--------|---------|
| < 10.000€ | auf 1.000€ |
| 10.000-50.000€ | auf 5.000€ |
| 50.000-200.000€ | auf 10.000€ |
| > 200.000€ | auf 25.000€ |

**Beispiele:**
- 12.341,52 € → 15.000 €
- 86.234,00 € → 90.000 €
- 238.234,00 € → 250.000 €

---

## C.6 Ansparphase (Accumulation)

### C.6.1 Grundkonzept

Die Simulator-Komponente unterstützt eine optionale **Ansparphase** vor dem Ruhestand. Dies ermöglicht die Modellierung des gesamten Lebenszyklus vom Sparbeginn bis zum Lebensende.

**Aktivierung:** Checkbox "Ansparphase aktivieren" im Simulator

### C.6.2 Konfigurationsparameter

| Parameter | Beschreibung | Beispielwert |
|-----------|--------------|--------------|
| `durationYears` | Dauer der Ansparphase in Jahren | 25 |
| `sparrate` | Monatliche Sparrate in € | 2.000 |
| `sparrateIndexing` | Dynamisierung der Sparrate | `inflation`, `wage`, `none` |

**Implementierung** (siehe `simulator-portfolio-inputs.js`):
```javascript
const accumulationPhase = {
    enabled: accumulationPhaseEnabled,
    durationYears: accumulationDurationYears,
    sparrate: accumulationSparrate,
    sparrateIndexing: sparrateIndexing
};
const transitionYear = accumulationPhaseEnabled ? accumulationDurationYears : 0;
```

### C.6.3 Simulationslogik

**Während der Ansparphase** (siehe `simulator-engine-direct.js`):
- Kein Mortalitätsrisiko (Person lebt noch)
- Keine Entnahmen aus dem Depot
- Jährliche Einzahlung = `sparrate × 12`
- Optional: Indexierung der Sparrate (Inflation/Lohn)
- Marktregime = `accumulation` (keine Guardrail-Logik)

**Transition zum Ruhestand:**
```javascript
const effectiveTransitionYear = inputs.transitionYear || 0;
const isAccumulationYear = yearIndex < effectiveTransitionYear;
```

### C.6.4 Sonderfälle

**Pflegeeintritt in Ansparphase:**
- Bei Pflegeeintritt während der Ansparphase wird sofort in den Ruhestand gewechselt
- Die verbleibende Ansparphase wird abgebrochen
- Entnahmelogik übernimmt ab diesem Jahr

```javascript
if (inputs.accumulationPhase?.enabled && simulationsJahr < effectiveTransitionYear) {
    // Sofortiger Wechsel bei Pflegeeintritt
    effectiveTransitionYear = simulationsJahr;
}
```

### C.6.5 Berechnungsbeispiel

| Jahr | Alter | Phase | Depot Anfang | Rendite | Einzahlung | Depot Ende |
|------|-------|-------|--------------|---------|------------|------------|
| 1 | 40 | Anspar | 0 € | — | 24.000 € | 24.000 € |
| 2 | 41 | Anspar | 24.000 € | +7% | 24.000 € | 49.680 € |
| ... | ... | ... | ... | ... | ... | ... |
| 25 | 65 | **Transition** | 950.000 € | +5% | — | 997.500 € |
| 26 | 66 | Ruhestand | 997.500 € | +3% | -48.000 € | 979.725 € |

---

## C.7 Rentensystem (Gesetzliche & Private Rente)

### C.7.1 Grundkonzept

Die Suite modelliert Renteneinkünfte für **1-2 Personen** mit unterschiedlichen Indexierungsarten und optionaler **Witwenrente**.

### C.7.2 Renten-Parameter pro Person

| Parameter | Beschreibung | Beispiel |
|-----------|--------------|----------|
| `renteMonatlich` | monatlicher Ausgangswert für Person 1 | 1.500 € |
| `rentAdjMode` | gemeinsame Indexierungsart | `fix`, `wage`, `cpi` |
| `rentAdjPct` | feste Anpassung bei `fix` | 2,0% |
| `renteStartOffsetJahre` | Startjahr der Rente von Person 1 relativ zum Lauf | 0 |
| `partner.monatsrente` | monatlicher Ausgangswert für Person 2 | 800 € |
| `partner.steuerquotePct` | optionaler pauschaler Abschlag nur auf die Eigenrente von Person 2 | 20% |

**Implementierung** (simulator-portfolio-pension.js):
```javascript
export function computePensionNext(prev, isFirstYear, base, adjPct) {
    if (isFirstYear) return Math.max(0, base);
    return Math.max(0, prev * (1 + adjPct / 100));
}

export function computeRentAdjRate(inputs, yearData) {
    if (inputs.rentAdjMode === 'wage') return yearData.lohn || 0;
    if (inputs.rentAdjMode === 'cpi') return yearData.inflation || 0;
    return inputs.rentAdjPct || 0;
}
```

### C.7.3 Paar-Modellierung (Rente1 + Rente2)

Jede Person besitzt eigenen Startzeitpunkt, Ausgangswert und Lebensstatus. Die
laufenden Renten werden jährlich mit derselben für das Modelljahr aufgelösten
Anpassungsrate fortgeschrieben. Die aktuelle Haushaltsaggregation lautet:

```javascript
const renteSum = rente1 + rente2;
const pensionSurplus = Math.max(0, renteSum - bruttoFloorAktuell);
const nettoFloor = Math.max(0, bruttoFloorAktuell - renteSum);
const flexNachRente = Math.max(0, flexAktuell - pensionSurplus);
```

Der Zufluss wird nicht zusätzlich zur Liquidität gebucht; er senkt den aus dem
Portfolio zu finanzierenden Bedarf. Eine zusätzliche Cash-Buchung würde ihn
doppelt zählen.

### C.7.4 Witwenrente

Nach dem Tod eines Partners kann der Überlebende einen Teil der Partnerrente erhalten.

**Konfiguration:**

- `widowOptions.mode`: `percent` aktiviert den prozentualen Modus; `stop`
  beendet die Eigenrente des Verstorbenen ohne Hinterbliebenenzahlung.
- `widowOptions.percent`: Anteil der Partnerrente als Verhältnis von 0 bis 1.
- `widowOptions.marriageOffsetYears`: modellierter Beginn der Ehe relativ zum
  Simulationsstart.
- `widowOptions.minMarriageYears`: erforderliche Mindestdauer der Ehe.

Die Berechtigung wird gegen den Lebensstatus am Jahresanfang geprüft. Stirbt
eine Person in der Mortalitätsziehung des aktuellen Modelljahres, beginnt die
Hinterbliebenenleistung deshalb erst im Folgejahr. Sie wird anschließend mit
der gemeinsamen Rentenanpassungsrate fortgeschrieben.

### C.7.5 Steuerbehandlung

Die Rentenlogik ist keine Rentensteuer-Engine. Person 1 wird ohne separaten
pauschalen Steuerabzug in den Haushaltszufluss übernommen. Nur die Eigenrente
von Person 2 kann über `partner.steuerquotePct` pauschal reduziert werden;
Hinterbliebenenleistungen erhalten in diesem Helper keinen eigenen
Steuerabzug. Ein Besteuerungsanteil nach Renteneintrittsjahr, Steuerprogression,
Grundfreibetrag, Kranken-/Pflegeversicherungsbeiträge, Hinzuverdienst und
Flexirente werden nicht berechnet. Eingaben müssen daher bewusst zur
gewünschten Netto-/Bruttokonvention passen.

---

## C.8 Historischer Backtest

### C.8.1 Grundkonzept

Neben der Monte-Carlo-Simulation bietet die Suite einen **deterministischen historischen Backtest**, der einen Ruhestandsplan über reale historische Zeiträume simuliert.

**Kernunterschied zu Monte Carlo:**

| Aspekt | Monte Carlo | Historischer Backtest |
|--------|-------------|----------------------|
| Datenquelle | Zufällige Stichproben aus Historie | Exakte historische Sequenz |
| Zeitraum | Simulationsdauer gemäß Eingabe; Sampling aus 1925-2025, optional ohne geschätzte Jahre <1950 | 1951-2025 |
| Ergebnis | Verteilung (Perzentile) | Ein deterministischer Pfad |
| Anwendung | Risikobewertung | Validierung ("Hätte mein Plan 2008 überlebt?") |

Die Abgrenzung ist absichtlich: Die Monte-Carlo-Datenbasis enthält auch die geschätzte Erweiterung 1925-1949. Der Backtest startet dagegen erst 1951, weil er für Renditen, ATH-/Trendkontext und historische Reihen Vorjahreswerte ab 1950 benötigt und einen nachvollziehbaren deterministischen Pfad über die belastbarere Basishistorie zeigen soll.

### C.8.2 Implementierung (siehe `simulator-backtest.js`)

**Hauptfunktion:**
```javascript
export function runBacktest() {
    const inputs = getCommonInputs();
    const startJahr = parseInt(document.getElementById('simStartJahr').value);
    const endJahr = parseInt(document.getElementById('simEndJahr').value);

    // Validierung: 1951-2025
    if (startJahr < 1951 || endJahr > 2025 || startJahr >= endJahr) {
        alert('Fehler: Bitte gültigen Zeitraum eingeben.');
        return;
    }

    // Historische Serien ab 1950 aufbauen; der Simulationspfad startet ab 1951.
    const backtestCtx = {
        series: {
            wageGrowth: histYears.map(y => HISTORICAL_DATA[y].lohn_de),
            inflationPct: histYears.map(y => HISTORICAL_DATA[y].inflation_de)
        }
    };

    // Jahr-für-Jahr-Simulation
    for (let jahr = startJahr; jahr <= endJahr; jahr++) {
        const jahresrenditeAktien = (HISTORICAL_DATA[jahr].msci_eur - dataVJ.msci_eur) / dataVJ.msci_eur;
        const result = simulateOneYear(simState, adjustedInputs, yearData, yearIndex);

        if (result.isRuin) {
            log += `${jahr}: RUIN`;
            if (BREAK_ON_RUIN) break;
        }
        simState = result.newState;
    }
}
```

### C.8.3 Backtest-Ausgabe

**Spalten im Detail-Modus:**

| Spalte | Beschreibung |
|--------|--------------|
| `Jahr` | Simulationsjahr (z.B. 2008) |
| `Entn.` | Jahresentnahme in € |
| `Floor` | Floor-Bedarf (inflationsbereinigt) |
| `Rente1/Rente2` | Renteneinkünfte pro Person |
| `Flex%` | Aktuelle Flex-Rate |
| `WQ%` | Entnahmequote vom Depot |
| `Status` | Marktregime + Aktion |
| `Quote%` | Entnahmequote Ende Jahr |
| `Runway%` | Liquiditäts-Deckungsgrad |
| `Pf.Akt%/Pf.Gld%` | Aktien-/Gold-Rendite |
| `Handl.A/Handl.G` | Netto-Handelsaktivität Aktien/Gold |
| `St.` | Gezahlte Steuern |

### C.8.4 Renten-Indexierung im Backtest

Der Backtest unterstützt dynamische Rentenanpassung basierend auf historischen Daten:

```javascript
export function computeAdjPctForYear(backtestCtx, yearIndex) {
    const { mode, pct } = backtestCtx.inputs.rentAdj;

    if (mode === 'wage') {
        return backtestCtx.series.wageGrowth[yearIndex] || 0;
    }
    if (mode === 'cpi') {
        return backtestCtx.series.inflationPct[yearIndex] || 0;
    }
    return pct || 0;  // Fixe Anpassung
}
```

### C.8.5 Export-Funktionen

| Format | Inhalt |
|--------|--------|
| **JSON** | Vollständige Rohdaten inkl. Metadaten |
| **CSV** | Tabellarisch für Excel/Google Sheets |

---

## C.9 Parameter Sweep (Sensitivitätsanalyse)

### C.9.1 Grundkonzept

Der **Parameter Sweep** ermöglicht die systematische Untersuchung, wie verschiedene Parameterkombinationen die Simulationsergebnisse beeinflussen.

**Anwendungsfälle:**
- Sensitivitätsanalyse: "Wie stark beeinflusst Runway-Min die Erfolgsquote?"
- Trade-off-Analyse: "Wo liegt das Optimum zwischen Erfolgsrate und Endvermögen?"
- Robustheits-Test: "Ist mein Plan sensitiv gegenüber einzelnen Parametern?"

### C.9.2 Sweep-Parameter

**Konfigurierbare Parameter** (siehe `simulator-sweep.js`):

| Parameter | Input-ID | Beschreibung | Beispiel-Range |
|-----------|----------|--------------|----------------|
| `runwayMin` | `sweepRunwayMin` | Minimale Liquiditäts-Monate | 18:6:36 |
| `runwayTarget` | `sweepRunwayTarget` | Ziel-Liquiditäts-Monate | 36:6:60 |
| `targetEq` | `sweepTargetEq` | Ziel-Aktienquote % | 50:5:70 |
| `rebalBand` | `sweepRebalBand` | Rebalancing-Band % | 3:1:7 |
| `maxSkimPct` | `sweepMaxSkimPct` | Max. Abschöpfung im Peak % | 15:5:35 |
| `maxBearRefillPct` | `sweepMaxBearRefillPct` | Max. Nachfüllung im Crash % | 30:10:60 |
| `goldTargetPct` | `sweepGoldTargetPct` | Gold-Zielallokation % | 0:2:10 |

**Range-Syntax:**
- `24` — Einzelwert
- `24,36,48` — Kommaliste
- `18:6:36` — Range (Start:Schritt:Ende)

### C.9.3 Whitelist/Blocklist-System

**Schutzmechanismus** (`simulator-sweep-utils.js`):

```javascript
export const SWEEP_ALLOWED_KEYS = new Set([
    'runwayMinMonths',
    'runwayTargetMonths',
    'targetEq',
    'rebalBand',
    'maxSkimPctOfEq',
    'maxBearRefillPctOfEq',
    'goldZielProzent',
    'goldAktiv'
]);

export function isBlockedKey(key) {
    // Partner-spezifische Keys sind geblockt
    const blocked = ['partnerRente', 'partnerAlter', 'partnerLebenserwartung'];
    return blocked.some(b => key.toLowerCase().includes(b.toLowerCase()));
}
```

**Zweck:** Verhindert versehentliche Variation von Partner-Parametern (Rente 2), die zwischen Profilen konstant bleiben sollten.

### C.9.4 Parallelisierung mit Workers

**Worker-Pool-Architektur:**

```javascript
async function runSweepWithWorkers({ baseInputs, paramCombinations, sweepConfig }) {
    const pool = new WorkerPool({
        workerUrl: new URL('./workers/mc-worker.js', import.meta.url),
        size: workerCount,  // Default: 8
        type: 'module'
    });

    // Broadcast: Initialisiere alle Worker mit Basisdaten
    await pool.broadcast({ type: 'sweep-init', baseInputs, paramCombinations });

    // Adaptive Chunk-Größe (Zeit-Budget: 500ms)
    let chunkSize = initialChunk;
    while (nextComboIdx < totalCombos) {
        const result = await Promise.race(pending);

        // Anpassung basierend auf tatsächlicher Laufzeit
        const targetSize = Math.round(count * (timeBudgetMs / elapsedMs));
        smoothedChunkSize = Math.round(smoothedChunkSize * 0.7 + targetSize * 0.3);
        chunkSize = smoothedChunkSize;
    }
}
```

### C.9.5 Sweep-Runner (`sweep-runner.js`)

**DOM-freie Ausführungslogik** (Worker-kompatibel):

```javascript
export function runSweepChunk({ baseInputs, paramCombinations, comboRange, sweepConfig }) {
    const { anzahlRuns, maxDauer, blockSize, baseSeed, methode } = sweepConfig;

    for (let offset = 0; offset < count; offset++) {
        const comboIdx = start + offset;
        const params = paramCombinations[comboIdx];
        const inputs = buildSweepInputs(baseInputs, params);

        // P2-Invarianz prüfen (Partner-Daten dürfen nicht variieren)
        const p2Invariants = extractP2Invariants(inputs);
        if (!areP2InvariantsEqual(p2Invariants, refP2Invariants)) {
            console.warn('[SWEEP] P2-Basis-Parameter variieren!');
        }

        // Monte-Carlo für diese Kombination
        const runOutcomes = [];
        for (let i = 0; i < anzahlRuns; i++) {
            const rand = rng(makeRunSeed(baseSeed, comboIdx, i));
            // ... Simulation ...
            runOutcomes.push({ finalVermoegen, maxDrawdown, minRunway, failed });
        }

        const metrics = aggregateSweepMetrics(runOutcomes);
        results.push({ comboIdx, params, metrics });
    }
    return { results, p2VarianceCount };
}
```

### C.9.6 Heatmap-Visualisierung

**SVG-basierte Heatmap** (`simulator-heatmap.js`):

```javascript
export function renderSweepHeatmapSVG(sweepResults, metricKey, xParam, yParam, xValues, yValues) {
    // Viridis-Farbpalette für Werte
    const getColor = (value) => {
        const t = (value - minVal) / range;
        return viridis(t);  // Perceptually uniform colormap
    };

    // Zellen mit Tooltip
    for (let yi = 0; yi < yValues.length; yi++) {
        for (let xi = 0; xi < xValues.length; xi++) {
            const value = heatmapData.get(`${xVal}_${yVal}`);
            const color = getColor(value);

            // Warn-Badge bei P2-Varianz
            if (result.metrics.warningR2Varies) {
                cellsHtml += `<text>⚠</text>`;  // Gelber Rand + Symbol
            }
        }
    }
}
```

**Metriken für Heatmap:**

| Metrik | Beschreibung | Optimierungsziel |
|--------|--------------|------------------|
| `successProbFloor` | Erfolgsrate (Floor gedeckt) | Maximieren |
| `medianEndWealth` | Median Endvermögen | Maximieren |
| `p10EndWealth` | 10%-Perzentil Endvermögen | Maximieren |
| `worst5Drawdown` | Schlimmste 5% Drawdowns | Minimieren |
| `minRunwayObserved` | Minimale beobachtete Runway | Maximieren |

---

## C.10 Auto-Optimize (Automatische Parameteroptimierung)

### C.10.1 Grundkonzept

**Auto-Optimize** ist ein **mehrphasiger Optimierungsalgorithmus**, der automatisch geeignete Parameterkombinationen ermittelt. Im Vergleich zu einem exhaustiven Sweep reduziert er die Anzahl zu prüfender Kombinationen durch LHS-Sampling, Quick-Filter, volle Evaluation, lokale Verfeinerung und separate Validierung.

**Architektur:**

```
┌─────────────────────────────────────────────────────────────────┐
│                      Auto-Optimize Pipeline                      │
├─────────────────────────────────────────────────────────────────┤
│  Kandidaten: Latin Hypercube Sampling (100 Samples)             │
│      ↓                                                          │
│  Phase 1:  Quick-Filter (200 Runs × 2 Seeds) → Top-50           │
│      ↓                                                          │
│  Phase 2:  Volle Evaluation (Top-50) → Constraint-Check         │
│      ↓                                                          │
│  Phase 3:  Lokale Verfeinerung (Nachbarschaft von Top-5)        │
│      ↓                                                          │
│  Phase 4:  Test-Validierung (Top-3 auf separaten Seeds)         │
│      ↓                                                          │
│  Output:   Champion-Konfiguration + Delta vs. Current           │
└─────────────────────────────────────────────────────────────────┘
```

### C.10.2 Latin Hypercube Sampling (`auto-optimize-sampling.js`)

**Algorithmus:**

```javascript
export function latinHypercubeSample(ranges, n, rand) {
    const params = Object.keys(ranges);
    const samples = [];

    // Permutationen für jede Dimension (Fisher-Yates Shuffle)
    const perms = params.map(() => {
        const perm = Array.from({ length: n }, (_, i) => i);
        for (let i = n - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [perm[i], perm[j]] = [perm[j], perm[i]];
        }
        return perm;
    });

    for (let i = 0; i < n; i++) {
        const sample = {};
        params.forEach((key, dim) => {
            const { min, max, step } = ranges[key];
            const bin = perms[dim][i];
            const binSize = (max - min) / n;
            const offset = rand() * binSize;  // Jitter innerhalb Bin
            const rawValue = min + bin * binSize + offset;
            sample[key] = Math.round(rawValue / step) * step;  // Snap to grid
        });
        samples.push(sample);
    }
    return samples;
}
```

**Vorteil gegenüber Grid-Sampling:** LHS garantiert gleichmäßige Abdeckung aller Dimensionen mit weniger Samples.

### C.10.3 Optimierungsziele und Constraints

**Konfigurierbare Objectives:**

| Objective | Metrik | Standard |
|-----------|--------|----------|
| Primär | `successProbFloor` | Maximieren |
| Sekundär | `medianEndWealth` | Maximieren |
| Risiko | `worst5Drawdown` | Minimieren |

**Beispiel-Constraints:**
```javascript
const constraints = [
    { metricKey: 'successProbFloor', operator: '>=', value: 95 },
    { metricKey: 'worst5Drawdown', operator: '<=', value: 40 }
];
```

### C.10.4 Lokale Verfeinerung

**Nachbarschafts-Generierung** (siehe `auto-optimize-sampling.js`):

```javascript
export function generateNeighborsReduced(candidate, ranges) {
    const neighbors = [];

    for (const [key, value] of Object.entries(candidate)) {
        const deltas = getParameterDeltas(key, true);  // z.B. [-2, +2]
        for (const delta of deltas) {
            const newVal = value + delta;
            if (newVal >= ranges[key].min && newVal <= ranges[key].max) {
                neighbors.push({ ...candidate, [key]: newVal });
            }
        }
    }
    return neighbors;
}

// Parameter-spezifische Deltas
function getParameterDeltas(key, reduced = false) {
    const deltaMap = {
        runwayMinM: reduced ? [-2, 2] : [-4, -2, 2, 4],
        goldTargetPct: reduced ? [-1, 1] : [-2, -1, 1, 2],
        targetEq: reduced ? [-2, 2] : [-5, -2, 2, 5]
    };
    return deltaMap[key] || [-1, 1];
}
```

### C.10.5 Train/Test-Validierung

**Separate Seeds für Validierung:**

```javascript
// Train-Seeds: Für Optimierung
const trainSeedArray = Array.from({ length: seedsTrain }, (_, i) => 42 + i);

// Test-Seeds: Für finale Validierung (disjunkt!)
const testSeedArray = Array.from({ length: seedsTest }, (_, i) => 420 + i);
```

**Stabilitäts-Metrik:**
```javascript
const stability = Math.min(1, champion.trainObjValue / (champion.testObjValue + 0.0001));
```

### C.10.6 Caching und Parallelisierung

**Kandidaten-Cache** (`auto-optimize-utils.js`):
```javascript
export class CandidateCache {
    constructor() { this.cache = new Map(); }

    has(candidate) {
        return this.cache.has(JSON.stringify(this._normalize(candidate)));
    }

    get(candidate) {
        return this.cache.get(JSON.stringify(this._normalize(candidate)));
    }

    set(candidate, results) {
        this.cache.set(JSON.stringify(this._normalize(candidate)), results);
    }
}
```

**Parallelisierung:**

Auto-Optimize nutzt zwei Ebenen:

1. `auto_optimize.js` bewertet Kandidaten in kleinen Batches per `Promise.all`, damit mehrere Kandidaten parallel laufen können.
2. Die eigentliche Monte-Carlo-Bewertung eines Kandidaten läuft über `auto-optimize-evaluate.js` in `runMonteCarloAutoOptimize()`. Dort nutzt `auto-optimize-worker.js` einen wiederverwendeten `WorkerPool` mit `workers/mc-worker.js`, adaptiver Chunk-Größe und den UI-Werten `mcWorkerCount`/`mcWorkerBudget`.

Wenn Web Worker nicht verfügbar sind oder der Worker-Pfad fehlschlägt, fällt Auto-Optimize auf serielle `runMonteCarloChunk()`-Ausführung zurück. Der Worker-Contract wird über `auto-optimize-worker-contract.test.mjs` abgesichert.

**Nicht optimierbare Sicherheitsparameter:** Longevity-Felder (`longevityMode`, `longevityQuantileShift`, `longevityRelativePct`, `longevityBufferYears`) sind in Version 1 keine Auto-Optimize-Parameter. Der Optimierer bewertet Kandidaten mit den Basisinputs des Nutzers, kann diese Sicherheitsannahmen aber weder über die Parameter-Auswahl noch über Champion-Apply verändern. Damit kann Auto-Optimize niedrigere VPW-Freigaben nicht dadurch "wegoptimieren", dass es den Langlebigkeitspuffer abschaltet.

**Kandidaten-Batches:**
```javascript
const BATCH_SIZE = 4;  // Parallel evaluation

for (let i = 0; i < validCandidates.length; i += BATCH_SIZE) {
    const batch = validCandidates.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
        batch.map(candidate => evaluate(candidate, baseInputs, runs, maxDauer, seeds))
    );
}
```

### C.10.7 Ergebnis-Ausgabe

**Champion-Konfiguration:**
```javascript
return {
    championCfg: champion.candidate,    // Optimale Parameter
    metricsTest: champion.testResults,  // Metriken auf Test-Seeds
    deltaVsCurrent: {                   // Verbesserung vs. aktuelle Einstellungen
        successRate: +2.3,              // +2.3 Prozentpunkte
        drawdownP90: -5.1,              // -5.1 Prozentpunkte (besser!)
        endWealthP50: +45000            // +45.000€ median
    },
    stability: 0.98                     // Train/Test-Konsistenz
};
```

### C.10.8 Optimierungs-Modi (`simulator-optimizer.js`)

**1. Single-Objective:**
```javascript
const best = findBestParameters(sweepResults, 'medianEndWealth', true);
```

**2. Multi-Objective (Weighted Sum):**
```javascript
const objectives = [
    { metricKey: 'medianEndWealth', weight: 0.6, maximize: true },
    { metricKey: 'successProbFloor', weight: 0.4, maximize: true }
];
const best = findBestParametersMultiObjective(sweepResults, objectives);
```

**3. Constraint-Based:**
```javascript
const constraints = [
    { metricKey: 'successProbFloor', operator: '>=', value: 95 }
];
const best = findBestParametersWithConstraints(
    sweepResults, 'medianEndWealth', true, constraints
);
```

### C.10.9 Performance-Vergleich

| Methode | Kombinationen | Evaluationen | Relative Zeit |
|---------|---------------|--------------|---------------|
| Exhaustiver Grid-Sweep (7×7×7) | 343 | 343 × 1000 | 100% |
| Auto-Optimize (LHS + Refine) | ~100 + ~50 | ~150 × 1000 | **~44%** |
| Auto-Optimize (mit Quick-Filter) | ~100 + ~30 | ~50 × 1000 + ~100 × 200 | **~12%** |

## C.11 Dynamic Flex (VPW — Variable Percentage Withdrawal)

### C.11.1 Grundkonzept

Dynamic Flex ersetzt den manuellen Flex-Betrag durch eine **VPW-basierte dynamische Berechnung** (Variable Percentage Withdrawal). Die Entnahme passt sich jährlich an die Restlebenserwartung, erwartete Rendite und Gesamtvermögen an.

**Zentrale Idee:** Statt eines fixen Flex-Betrags berechnet die Engine pro Jahr:
```
flexBedarf = max(0, Gesamtvermögen × VPW-Rate × GoGo-Multiplikator − Floor)
```

**Architekturentscheidung:** Die Horizont-Berechnung (Sterbetafeln) liegt in der App-Schicht (`simulator-engine-helpers.js` und `dynamic-flex-runner-horizon.js`). Die Engine erhält `horizonYears` als effektiven Wert und optionale `longevityHorizonDiagnostics`; sie bleibt damit demographik-agnostisch, kann aber Raw-/Effektivhorizont und Clamp-Gründe anzeigen.

### C.11.2 VPW-Formel (Engine)

Die VPW-Rate ist die PMT-Formel (Annuitätenfaktor) der Finanzmathematik:

```javascript
function _berechneEntnahmeRate(realReturn, horizonYears) {
    if (Math.abs(realReturn) < 0.001) return 1 / horizonYears;  // Fallback
    return realReturn / (1 - Math.pow(1 + realReturn, -horizonYears));
}
```

| Parameter | Beschreibung | Wertebereich |
|-----------|-------------|--------------|
| `realReturn` | Geglättete erwartete Realrendite | 0.00 – 0.05 (0% – 5%) |
| `horizonYears` | Erwartete Restlaufzeit | 1 – 60 Jahre |

**Ergebnis:** Bei `realReturn = 2%` und `horizonYears = 20` ergibt sich eine VPW-Rate von ~6.12%.

### C.11.3 Erwartete Realrendite (Engine)

Die erwartete Realrendite wird als **gewichteter Durchschnitt** der Asset-Klassen berechnet, per EMA geglättet und auf [0%, 5%] geclippt. Die Herleitung erfolgt ueber `engine/planners/vpw-return-policy.mjs`.

Im Default `legacy_step` wird die bisherige CAPE-Stufenlogik weiterverwendet:

```javascript
// 1. Renditekomponenten
const equityReturn = expectedReturnCape - inflation/100;  // CAPE-basiert
const goldReturn   = CONFIG.DYNAMIC_FLEX.GOLD_REAL_RETURN;     // 1.0%
const safeReturn   = CONFIG.DYNAMIC_FLEX.SAFE_ASSET_REAL_RETURN; // 0.5%

// 2. Gewichtung nach Allokation
const rawReturn = equityWeight * equityReturn
                + goldWeight * goldReturn
                + safeWeight * safeReturn;

// 3. EMA-Glättung (Smoothing)
const alpha = CONFIG.DYNAMIC_FLEX.SMOOTHING_ALPHA;  // 0.35
const smoothed = alpha * rawReturn + (1 - alpha) * lastSmoothedReturn;

// 4. Clamping
return clamp(smoothed, MIN_REAL_RETURN, MAX_REAL_RETURN);  // [0%, 5%]
```

**Legacy-CAPE-Rendite-Mapping (`MarketAnalyzer.mjs`):**

| CAPE-Bereich | Erwartete Nominalrendite |
|-------------|-------------------------|
| CAPE ≤ 15 | 8% |
| CAPE 15–20 | 6% |
| CAPE 20–30 | 5% |
| CAPE > 30 | 4% |

Im expliziten Modus `cape_continuous` wird statt der Stufen eine kontinuierliche CAPE-Funktion genutzt:

```javascript
earningsYield = 1 / capeRatioUsed;
rawEquityRealReturn = earningsYield + EQUITY_PREMIUM_ADJUSTMENT;
equityRealReturn = clamp(rawEquityRealReturn, MIN_EQUITY_REAL_RETURN, MAX_EQUITY_REAL_RETURN);
portfolioRealReturn = equityWeight * equityRealReturn
                    + goldWeight * goldRealReturn
                    + safeWeight * safeRealReturn;
expectedRealReturn = clamp(portfolioRealReturn, MIN_REAL_RETURN, MAX_REAL_RETURN);
```

Ungueltige, fehlende, nicht-endliche, negative oder zu hohe CAPE-Werte fallen nicht in einen guenstigen Clamp, sondern auf `DEFAULT_CAPE` zurueck und setzen `capeInputStatus`/`expectedReturnSource` entsprechend.

### C.11.4 Horizont-Berechnung (`simulator-engine-helpers.js`)

Der Horizont wird aus **deutschen Periodensterbetafeln** (`MORTALITY_TABLE` in `simulator-data.js`) berechnet.

**Zwei Methoden:**

| Methode | Funktion | Beschreibung |
|---------|----------|-------------|
| `mean` | `estimateRemainingLifeYears()` | Mittlere Restlebenserwartung |
| `survival_quantile` | `estimateSingleRemainingLifeYearsAtQuantile()` | Alter, bei dem nur noch q% der Kohorte lebt |

**Single-Life vs. Joint-Life:**
- **Single:** Horizont basiert auf Person 1 (oder Person 2, wenn allein)
- **Joint:** Horizont basiert auf dem längsten verbleibenden Leben beider Personen (max)

**Monte-Carlo-Integration:** Im MC-Lauf wird der Horizont **pro Simulationsjahr** neu berechnet:
- Alter steigt je Simulationsjahr
- Bei Tod einer Person: Fallback auf Single-Life-Horizont der überlebenden Person
- Implementierung: `computeDynamicFlexHorizonForYear()` in `monte-carlo-runner.js`, mit gemeinsamer Auflösung über `dynamic-flex-runner-horizon.js`

### C.11.4a Konservative Langlebigkeitsannahmen

Longevity-Adjustments werden nach der normalen Single-/Joint-Horizon-Ableitung angewandt. Bei Paaren gilt: erst finalen Haushalts-Horizont bestimmen, dann den Langlebigkeitsaufschlag genau einmal anwenden. Es gibt keine doppelte Pufferung pro Person.

| Feld | Bedeutung | V1-Grenze |
|------|-----------|-----------|
| `longevityMode` | `none`, `quantile_shift`, `relative_horizon_buffer`, `buffer_years` | Default `none` |
| `longevityQuantileShift` | Erhoeht das Survival-Quantil, z. B. 0,85 -> 0,90 | 0,00 bis 0,10, gekappt bei 0,95 |
| `longevityRelativePct` | Relativer Zuschlag auf den Raw-Horizont | 0,00 bis 0,20 |
| `longevityBufferYears` | Fester Vergleichs-/Expertenpuffer in Jahren | ganze Zahl 0 bis 10 |

`quantile_shift` ist der fachlich bevorzugte Modus, weil er alters- und kohortenabhängig über die Sterbetafel wirkt. `buffer_years` bleibt für Vergleichsrechnungen verfügbar, ist aber nicht der Default. Alle Modi respektieren den bestehenden Max-Horizon von 60 Jahren; wirkungslose Shifts am Quantil-Cap oder Max-Horizon-Clamps werden diagnostiziert.

Beim Monte-Carlo-Übergang von Joint- zu Single-Life kann der effektive Horizont stark fallen. Die Longevity-Pipeline nutzt dafür eine lineare Transition-Floor-Glättung: im ersten Übergangsjahr darf der Horizont nicht stärker als 3 Jahre fallen; der Floor läuft danach über maximal 3 Jahre aus. Die Diagnosefelder `longevityTransitionSmoothingApplied` und `longevityTransitionSmoothingFloor` machen diesen Eingriff sichtbar.

### C.11.5 Go-Go-Phase

Optional erhöhte Entnahme in den ersten Ruhestandsjahren ("Go-Go Years"):

```javascript
vpwTotal = gesamtwert * vpwRate * (goGoActive ? goGoMultiplier : 1.0);
```

| Parameter | Beschreibung | Wertebereich |
|-----------|-------------|--------------|
| `goGoActive` | Go-Go ein/aus | boolean |
| `goGoMultiplier` | Multiplikator | 1.0 – 1.5 |

**Validierung:** `goGoMultiplier > MAX_GO_GO_MULTIPLIER` (1.5) erzeugt einen `ValidationError` — keine stille Clampung.

### C.11.6 Konfiguration (Engine-Konfiguration)

```javascript
DYNAMIC_FLEX: {
    RETURN_POLICY: 'legacy_step',       // legacy_step | cape_continuous
    SAFE_ASSET_REAL_RETURN: 0.005,   // 0.5% p.a.
    GOLD_REAL_RETURN: 0.01,          // 1.0% p.a.
    MIN_HORIZON_YEARS: 1,
    MAX_HORIZON_YEARS: 60,
    FALLBACK_REAL_RETURN: 0.03,      // Ohne CAPE-Daten
    MIN_REAL_RETURN: 0.00,           // Untere Schranke
    MAX_REAL_RETURN: 0.05,           // Obere Schranke (5%)
    SMOOTHING_ALPHA: 0.35,           // EMA-Glättung (35% neuer Wert)
    MAX_GO_GO_MULTIPLIER: 1.5        // Go-Go-Obergrenze
}
```

Die Continuous-Parameter liegen separat unter `CONFIG.CAPE_CONTINUOUS`. Der Default-Wechsel auf `cape_continuous` ist nicht erfolgt; Backtest-Vergleiche zeigen sichtbare Entnahme-/Endvermoegens-Deltas und brauchen fachliche Freigabe.

Longevity-Grenzen werden in `dynamic-flex-longevity-contract.js` und `engine/validators/InputValidator.mjs` validiert. Ungueltige Werte erzeugen Validierungsfehler; insbesondere wird `longevityBufferYears` nicht still gerundet, sondern muss ganzzahlig sein.

### C.11.7 Integration in die Berechnungskette

Dynamic Flex greift **vor** dem SpendingPlanner ein:

```
Input → Validation → Market Analysis → [VPW: Flex-Override] → SpendingPlanner → Transactions
```

1. Die VPW-Berechnung überschreibt `inflatedBedarf.flex` mit dem dynamisch berechneten Wert
2. Der SpendingPlanner behandelt den Wert dann wie einen normalen Flex-Bedarf
3. Alle bestehenden Guardrails (FlexRate 0-100%, Alarm-Modus, Hard Caps) wirken weiterhin auf den VPW-abgeleiteten Flex

**Diagnostik:** Das Ergebnisobjekt enthält immer `ui.vpw` mit:
- `status`: `'active'` | `'disabled'` | `'contract_ready'` | `'safety_static_flex'`
- `vpwRate`, `expectedRealReturn`, `vpwTotal`, `dynamicFlex`, `gesamtwert`
- `horizonYears`, `horizonMethod`, `survivalQuantile`
- `horizonYearsRaw`, `longevityMode`, `longevityAppliedShift`, `longevityAppliedBufferYears`, `longevityRelativePct`, `longevityClampReason`, `survivalQuantileRaw`, `survivalQuantileAdjusted`, `longevityTransitionSmoothingApplied`, `longevityTransitionSmoothingFloor`
- `goGoActive`, `goGoMultiplier`
- `capeRatioUsed`, `expectedReturnCape`
- `returnPolicy`, `expectedReturnSource`, `capeInputStatus`
- `expectedRealReturnRaw`, `expectedRealReturnClamped`, `safeRealReturn`, `safeRealReturnSource`

### C.11.8 UI-Presets (`simulator-main-dynamic-flex.js`)

| Preset | Horizont-Methode | Quantil | Horizont | Go-Go |
|--------|-----------------|---------|----------|-------|
| **Aus** | — | — | — | — |
| **Konservativ** | survival_quantile | 0.90 | 35 J. | Aus |
| **Ausgewogen** | survival_quantile | 0.85 | 30 J. | 1.10 |
| **Offensiv** | mean | — | 25 J. | 1.20 |

Die Presets setzen Longevity bewusst auf `none`. Konservative Langlebigkeitsannahmen sind eine explizite Nutzereinstellung und werden nicht durch Preset-Wechsel heimlich aktiviert.

### C.11.9 Balance-App-Diagnose

Die Balance-App zeigt 8 VPW-Metriken im Diagnose-Panel (`balance-diagnosis-keyparams.js`):

| Metrik | Beschreibung | Warnschwelle |
|--------|-------------|-------------|
| Dynamic Flex (VPW) | Status + Methode | — |
| VPW-Rate | Entnahmesatz | ≥ 6% (erhöht), ≥ 8% (Warnung) |
| VPW-Horizont | Restlaufzeit in Jahren | ≤ 18 J. (kurz), ≤ 12 J. (Warnung) |
| ER(real) | Geglättete Realrendite | < 0% (Warnung) |
| ER(CAPE) | CAPE-basierte Nominalrendite | — |
| Go-Go-Phase | Status + Multiplikator | — |
| VPW-Basisvermögen | Gesamtvermögen für VPW-Formel | — |
| VPW-Rahmen | Vermögen × Rate × Go-Go; maximal freigegebener Rahmen, keine Konsumpflicht | — |
| Flex freigegeben | VPW-Rahmen minus netto Floor, nach Safety-/Reentry-Logik | — |
| Nicht genutzter Rahmen | VPW-Rahmen minus empfohlene Entnahme | — |

Zusaetzlich zeigt der Dynamic-Flex-Copytext bei aktivem Longevity-Modus Raw-Horizont, Effektivhorizont, Modus, angewandten Shift/Puffer, Clamp-Grund und ggf. Transition-Smoothing. Bei `quantile_shift` am Quantil-Cap wird ein wirkungsloser Shift erkennbar statt als Pufferwirkung dargestellt.

**Feature-Gate:** Dynamic Flex wird in der Balance-App nur aktiviert, wenn `capeRatio > 0` (CAPE-Daten müssen vorliegen).

### C.11.10 Sweep- und Optimizer-Integration

**Sweep-fähige Parameter:**
- `horizonYears` — Horizont-Variation
- `survivalQuantile` — Quantil-Variation
- `goGoMultiplier` — Go-Go-Variation

**Nicht sweep-fähig in V1:** `longevityMode`, `longevityQuantileShift`, `longevityRelativePct` und `longevityBufferYears`. Sweep-Kombinationen erben diese Werte aus den Basisinputs, duerfen sie aber nicht pro Zelle verändern. Dadurch bleibt der Langlebigkeitsaufschlag ein fixer Sicherheitsparameter, waehrend klassische VPW-Parameter weiterhin sensitiviert werden koennen.

**Auto-Optimize-Grenzen:**

| Parameter | Min | Max |
|-----------|-----|-----|
| `horizonYears` | 15 | 45 |
| `survivalQuantile` | 0.75 | 0.95 |
| `goGoMultiplier` | 1.0 | 1.35 |

Longevity-Felder sind auch hier nicht optimierbar und werden nicht per Champion-Konfiguration auf Formularfelder angewandt.

---

# Annahmen, Modellgrenzen und Validierung

Dieser Teil begrenzt die fachliche Aussagekraft der Suite. Eine technisch
korrekte Berechnung ist nur eine Wenn-dann-Aussage unter den gewählten Daten,
Parametern und Policies. Sie ist weder Anlage-, Steuer-, Rechts- oder
Versicherungsberatung noch eine Zusage künftiger Ergebnisse.

## Anwendungsrahmen und Zielgruppe

Die Suite richtet sich an deutschsprachige Einzelpersonen und Haushalte, die
eine EUR-basierte Ruhestandsplanung mit überwiegend liquiden, passiven
Portfolio-Bausteinen nachvollziehen und die Eingaben fachlich selbst prüfen
können. Geeignete Fragestellungen sind beispielsweise:

- Wie reagieren Floor und Flex auf unterschiedliche Marktsequenzen?
- Wie verändern Runway, VPW, Guardrails, Rente oder ein Pflegebucket die
  modellierten Entnahmen?
- Welche Bandbreiten entstehen in historischen, Monte-Carlo- und
  Stressläufen?
- Welche regelbasierten Verkäufe wären nach den modellierten Beständen und
  Steuerparametern plausibel?

Außerhalb des belastbaren Anwendungsrahmens liegen eine vollständige
Finanzplanung über alle Vermögensarten, rechtsverbindliche Steuerberechnung,
Fremdwährungsportfolios mit FX-Risiko, individuelle medizinische oder
aktuarielle Prognosen, Versicherungsersatz sowie autonome Broker- oder
Portfolioverwaltung.

## Unterstütztes Anlagenmodell

| Baustein | Modellierte Rolle | Wesentliche Grenze |
|----------|--------------------|--------------------|
| **Freie Liquidität** | Auszahlungen, Runway und Transaktionsfinanzierung; Tagesgeld-/Giro-nahe Beträge und Geldmarkt | ein gemeinsamer EUR-basierter Liquiditätsbegriff, keine Bankausfall-/Kontenlogik |
| **Breite Aktien-ETF-Tranchen** | primärer Rendite- und Verkaufsbaustein mit Einstandswert und Teilfreistellung | keine Einzeltitel-, Sektor-, Faktor- oder Fondsdetail-Simulation |
| **Gold-Tranchen** | optionaler Diversifikations- und Verkaufsbaustein | vereinfachte Rendite-/Steuerflags, keine Lager-, Spread- oder Produktkosten |
| **Bond-Bucket** | optionaler Zieltopf der 3-Bucket-Strategie | kein allgemeines Anleihenmodell; Rendite nutzt den historischen Cash-Rate-Proxy statt Laufzeit, Bonität und Zinskurve |
| **Pflegebucket** | separat zweckgebundener cash-naher State | kein frei konsumierbares Asset, keine Versicherung und keine automatische Wiederauffüllung |

Nicht modelliert werden insbesondere Immobilien, Kryptoassets, einzelne
Aktien, frei kombinierbare Sektor-/Faktorstrategien, Optionen und andere
Derivate, Hebel, Short-Positionen, vollständige Anleiheportfolios sowie
beliebige zusätzliche Asset-Klassen.

## Reserven sind nicht austauschbar

| Reservebegriff | Ist ein separater Bestand? | Verfügbarkeit und Rechenwirkung |
|----------------|----------------------------|---------------------------------|
| **Freie Liquidität** | ja | sofort verfügbar; zählt zu Runway, aktivem Vermögen und Auszahlung |
| **Mindest-/Ziel-Runway** | nein | Policy-Schwelle in Monaten; löst gegebenenfalls Refill aus |
| **Gold-Floor** | nein | regelbasierte Mindestallokations-/Schutzschwelle für Gold; kein Cash-Puffer |
| **Pflegebucket** | ja | aus dem aktiven Vermögen separiert; nur nach konfiguriertem Pflege-Trigger verwendbar |

## Annahmenregister

| ID | Annahme beziehungsweise Konvention | Wirkung im Modell | Behandlung und verbleibende Grenze |
|----|-----------------------------------|-------------------|------------------------------------|
| A-01 | Ein Jahr ist der kleinste Finanz- und Lebensereignisschritt. | Rendite, Inflation, Pflege, Tod, Rente, Entnahme und Steuer werden jahresweise geordnet. | Keine unterjährige Pfad-, Timing- oder Liquiditätssimulation. |
| A-02 | Floor, Flex und Mindest-Flex sind zu Jahresbeginn aktuelle nominale Beträge. | Die Engine verarbeitet sie ohne erneute interne Inflation; der State-Roll bereitet das Folgejahr vor. | Falsche Basisjahre oder doppelt inflationsbereinigte Nutzereingaben verzerren alle Entnahmen. |
| A-03 | Renten sind bedarfsmindernde Jahreszuflüsse. | Erst Floor, dann Flex werden verrechnet; keine zusätzliche Cash-Buchung. | Netto-/Bruttokonvention und nur für Person 2 verfügbarer Pauschalabzug müssen bewusst gewählt werden. |
| A-04 | Historische Jahresreihen dienen als Rendite-, Inflations-, Lohn-, Zins-, Gold- und CAPE-Proxys. | Sampling und Stresslogik erzeugen daraus Modellpfade. | Datenhistorie ist keine Verteilungsgarantie; Quellen- und Rekonstruktionsgrenzen bleiben wirksam. |
| A-05 | Alle Planungsbeträge und akzeptierten Quotes sind EUR-basiert. | Portfolio, Bedarf, Steuer und Ergebnisse verwenden eine gemeinsame Währung. | Nicht-EUR-Quotes werden abgelehnt; es gibt keine FX-Konvertierung oder Währungsrisikomodellierung. |
| A-06 | Engine und Simulator ziehen keine separaten Produkt- oder Transaktionskosten ab. | Modellierte Renditen und Verkäufe wirken ohne TER-, Spread-, Slippage- oder Gebühren-Cashflow. | Nur bestätigte Reconciliation kann eine tatsächlich eingegebene Ausführungsgebühr vom Realbestand abziehen. |
| A-07 | Steuerparameter repräsentieren den vom Nutzer gewählten Planungsfall. | Ein kombiniertes Jahres-Settlement schätzt Steuer und Verlustvortrag. | Kein automatischer Rechtsstatus, keine vollständigen Verlusttöpfe oder Veranlagung. |
| A-08 | Pflegeeintritt und -progression folgen den hinterlegten Altersbuckets und Übergangsraten. | Ereignisse erhöhen den Floor, senken Flex und können Mortalität sowie Ansparphase verändern. | Kalibrierung ist heuristisch; Kosten, Pflegeleistungen und familiäre Unterstützung sind nicht vollständig abgebildet. |
| A-09 | Mortalität folgt Periodensterbetafeln und optionalen Pflegefaktoren. | Läufe können personweise oder nach Tod aller Personen enden; VPW-Horizonte werden daraus abgeleitet. | Keine Kohortenprognose, individuelle Gesundheit oder medizinische Diagnose. |
| A-10 | Der Pflegebucket ist cash-nah, erhält den Cash-Ertrag und wird nicht automatisch aufgefüllt. | Er bleibt außerhalb der normalen Entnahmebasis und wird vor Forced Sales eingesetzt. | Steuerdetails seiner Nutzung und eine reale Versicherungsleistung werden nicht separat modelliert. |
| A-11 | Der optionale Bond-Bucket darf mit dem Cash-Rate-Proxy verzinst werden. | 3-Bucket-Pfade erhalten einen risikoarmen Zieltopf. | Duration, Kursreaktion, Bonität, Kupon und Zinskurve fehlen. |
| A-12 | Vorschläge und Simulationstransaktionen sind schreibfrei gegen reale Lots. | Reale Bestände ändern sich erst nach Brokerhandlung und bestätigtem Reconcile. | Abweichungen zwischen Vorschlag, Ausführung, Broker-FIFO und Gebühren bleiben operatives Nutzerrisiko. |
| A-13 | Gesetze, Produktbedingungen und Datenreihen bleiben unverändert, bis Code, Daten oder Nutzerparameter aktualisiert werden. | Reproduzierbare Läufe verwenden den implementierten Stand. | Es gibt keine automatische Rechts-, Tarif-, Steuer- oder Datenaktualisierung. |

## Modellrisikoregister

| ID | Risiko oder offener Befund | Mögliche Wirkung | Behandlung / Status |
|----|----------------------------|-----------------|---------------------|
| MR-01 | Die Jahre 1925–1949 sind geschätzt und auf den 1950er-Level normalisiert. | Extrem- und Sequenzrisiken können durch Rekonstruktion statt beobachteter homogener Reihe geprägt sein. | In `DATA_SOURCES.md` gekennzeichnet; per `mcExcludeEstimatedHistory` oder Startjahrfilter ausschließbar. Bekannte Datenmodellgrenze. |
| MR-02 | Die genaue Price-/Net-/Gross-Return-Variante von `msci_eur` ist ungeklärt. | Dividenden- und Kostenwirkung der Aktienhistorie ist nicht eindeutig interpretierbar. | Keine Behauptung, TER oder Ausschüttungen seien im Simulator konsistent enthalten. Offener Provenienzpunkt. |
| MR-03 | TER, Spread, Slippage und Transaktionsgebühren fehlen als Simulator-Cashflows. | Endvermögen und Entnahmefähigkeit können gegenüber realer Umsetzung zu hoch ausfallen. | Sensitivität über konservativere Renditeannahmen möglich, aber kein gleichwertiges Kostenmodell. Bekannte Modellgrenze. |
| MR-04 | Einwährungsmodell EUR ohne FX. | Fremdwährungsrendite, Hedgingkosten und Wechselkursschwankungen fehlen. | Nur EUR-Planungsfall; Nicht-EUR-Quotes werden abgelehnt. Bekannte Modellgrenze. |
| MR-05 | Steuer- und Rentensteuerlogik sind bewusst vereinfacht. | Nettoerlös und bedarfsmindernder Rentenzufluss können von realer Veranlagung abweichen. | Nutzerparameter und externe Prüfung erforderlich; keine Rechtsberatung. Bekannte Modellgrenze. |
| MR-06 | Asset-Universum und Bond-Modell sind eng begrenzt. | Diversifikation, Illiquidität, Duration und produktspezifische Risiken fehlen. | Aussagen nur für die unterstützten Bausteine verwenden. Bekannte Modellgrenze. |
| MR-07 | Pflege- und Mortalitätsparameter enthalten Kalibrierungs- und Nutzerannahmen. | Eintritt, Dauer, Kosten, Flexverlust und Lebensdauer können stark verschoben werden. | Szenarien und Sensitivitäten statt Einzelprognose; externe Evidenzprüfung erforderlich. Kalibrierungsrisiko. |
| MR-08 | Erfolg, Depoterschöpfung und Endvermögen verwenden unterschiedliche Nenner und Vermögensbasen. | Einzelne KPI-Labels können eine breitere Aussage nahelegen als berechnet. | Kennzahlen gemeinsam und gemäß Ergebnisregister lesen; das in Korrektur-Slice 8 präzisierte UI-Label nennt Ruin, Aktien/Gold-Schwelle und ausgeschlossene Bestände. |
| MR-09 | Historisch wurde `jahresentnahme_real` im Simulatorpfad nicht mit einem fortgeschriebenen kumulierten Inflationsfaktor deflationiert. | Nominale Entnahmen erschienen als reale Entnahmen; davon abgeleitete reale KPIs waren fehlbezeichnet. | In Korrektur-Slice 6 behoben: App-State führt den Faktor einschließlich Ansparjahren genau einmal fort; Headless-, Backtest-, MC-, Auto-Optimize- und Worker-Paritätsgates sichern Route A. |
| MR-10 | Historisch wurde die Pflegekosten-Drift zwischen Input-Reader und Pflegeberechnung doppelt durch 100 skaliert. | Ein UI-Wert von 3,5 % wirkte als 0,035 % p.a. | In Korrektur-Slice 7 behoben: Prozentwerte werden an DOM-/Profil-Grenzen genau einmal normalisiert; Care-, Profil-, Persistenz- und Worker-Paritätsgates sichern Faktor 1,035. Die fachliche Kalibrierung bleibt MR-07/FR-10. |
| MR-11 | Sampling-, Regime-, CAPE-, VPW- und Guardrail-Parameter sind Modellentscheidungen. | Gute Resultate können parameter- oder historienabhängig statt robust sein. | Mehrere Seeds, Methoden, Stresspfade und Sensitivitäten vergleichen. Modell- und Kalibrierungsrisiko. |
| MR-12 | Nutzereingaben und reale Ausführung liegen außerhalb der Rechenautomatik. | Falsche Einstandswerte, Netto-/Bruttowerte, Steuerflags oder abweichende Brokerorders übertragen sich direkt auf Ergebnisse. | Eingaben, Vorschläge und Reconciliation getrennt prüfen. Operatives Risiko. |

## Produktmängel aus dem Fachabgleich

| ID | Beobachteter Ist-Zustand | Dokumentarische Behandlung | Erforderliche Produktentscheidung |
|----|--------------------------|-----------------------------|----------------------------------|
| PD-01 | Historisch führte der Simulator den kumulierten Inflationsfaktor für `jahresentnahme_real` nicht über die Jahre fort. | Route A ist umgesetzt: effektive Entnahme geteilt durch den aktuellen Faktor; Basis ist das erste Simulatorjahr. | Behoben in Korrektur-Slice 6; Faktor-, Anspar-, Backtest-, MC-, Auto-Optimize- und Worker-Verträge sind lokal validiert. |
| PD-02 | Historisch wurde die Pflegekosten-Drift nach der Input-Normalisierung ein zweites Mal durch 100 geteilt. | UI/Profil bleiben Prozentwerte; beide Reader normalisieren über denselben In-memory-Vertrag genau einmal auf ein nicht negatives Verhältnis. | Behoben in Korrektur-Slice 7; 0/3,5/100 %, Invalidwerte, mehrjährige Pflegekosten, Cap/Ramp-up und Worker-Parität sind lokal validiert. |
| PD-03 | Historisch behauptete die KPI-Beschreibung eine vollständige Depotaufzehrung, obwohl `isRuin` oder Aktien plus Gold ≤ 100 € gezählt werden. | Dashboard und Handbuch nennen die beiden Auslöser sowie den Ausschluss freier Liquidität und des Pflegebuckets aus der 100-€-Schwelle. | Behoben in Korrektur-Slice 8 als reine Labelkorrektur; Aggregation, technischer Key, Worker- und Optimizervertrag bleiben unverändert. |

PD-01 bis PD-03 wurden nicht durch nachträgliche Soll-Erklärungen, sondern in
den separaten Korrektur-Slices 6 bis 8 mit Laufzeit- beziehungsweise
UI-Vertragsvalidierung behoben.

## Ergebnisregister und Interpretationsregeln

| Ergebnisgröße | Berechnungsbasis | Zulässige Aussage | Nicht daraus ableiten |
|---------------|-------------------|-------------------|----------------------|
| **Erfolgsquote** | Anteil der Läufe ohne `isRuin`/Validierungsfehler bis Laufende | Robustheit der Floor-Deckung unter genau diesem Szenario | Garantie, vollständige Flex-Erfüllung oder empirische Eintrittswahrscheinlichkeit |
| **Ruin** | aktive Vermögensdeckung beziehungsweise Auszahlungs-Fallback für Netto-Floor | modellierter Floor-Deckungsbruch | rechtliche Insolvenz oder vollständige Vermögenslosigkeit |
| **Endvermögen** | Aktien + Gold + freie Liquidität; fehlgeschlagene Läufe werden in Aggregaten mit 0 geführt | Verteilung des verbleibenden aktiven Vermögens | vollständiges Haushaltsvermögen einschließlich Pflegebucket und externer Assets |
| **Depoterschöpfung** | Fehler/Ruin oder Aktien + Gold ≤ 100 € | enge Risiko-Teilmetrik für das simulierte Depot | dass keinerlei freie Liquidität oder Pflegebucket mehr existiert |
| **Runway** | freie Liquidität / aktueller Netto-Monatsbedarf | operative Liquiditätsdeckung im aktuellen Modelljahr | Lebensdauer des Gesamtvermögens oder Erfolgswahrscheinlichkeit |
| **Reale Entnahme** | effektive nominale Entnahme / kumulierter Inflationsfaktor des aktuellen Jahres | Kaufkraft des ersten Simulatorjahres unter den gewählten Modellannahmen | individuelle Konsumqualität, Nutzen oder Garantie realer Kaufkraft außerhalb des Modells |
| **Pflegebucket-KPIs** | separater Start-, Nutzungs-, End- und Deckungs-State | Wirkung der Zweckbindung und Nutzung im Modell | Versicherungsleistung oder garantierte Pflegekostendeckung |
| **Optimizer-Champion** | Zielfunktion und Constraints über gewählte Train-/Test-Seeds | bester gefundener Kandidat im untersuchten Suchraum | globales Optimum oder automatisch zu übernehmende Empfehlung |

Für belastbare Nutzung gelten vier Regeln:

1. Nominale und reale Werte sowie Prozent- und Verhältnis-Einheiten nicht
   mischen.
2. Nie nur Erfolgsquote oder Median betrachten; Tail, Kürzungen, Drawdown,
   Endvermögen, Depoterschöpfung und Pflegewirkung mitlesen.
3. Ergebnisse über mehrere Seeds, Sampling-Methoden, Startjahrgrenzen und
   Stressannahmen vergleichen.
4. Optimierergebnisse erst nach fachlicher Plausibilisierung bewusst in
   Eingaben übernehmen; es gibt keine automatische Produktionsübernahme.

## Validierungsstufen

| Stufe | Frage | Geeignete Nachweise | Aussagegrenze |
|-------|-------|---------------------|----------------|
| **V1 Contract** | Sind Eingaben, Einheiten, Fehler- und Ergebnis-Shapes konsistent? | Validator-, Contract-, Negativ- und UI-Reader-Tests | beweist keine ökonomische Richtigkeit |
| **V2 Rechenregression** | Bleiben deterministische Formeln und bekannte Ergebnisse stabil? | Unit-Tests, numerische Fixtures, Backtest-/Snapshot-Vergleich | stabile Altsemantik kann fachlich trotzdem falsch sein |
| **V3 Pfadparität** | Rechnen Main Thread, Worker, Chunking und Optimizer gleich? | Worker-Paritäts- und Merge-Tests mit identischen Seeds | gleiche Implementierung ist noch keine externe Validierung |
| **V4 Historische Plausibilität** | Sind Daten, Zeitreihen, Stressphasen und Größenordnungen nachvollziehbar? | Provenienzprüfung, Teilperioden, Rekonstruktionskennzeichen, Sensitivität | historische Passung garantiert keine Zukunft |
| **V5 Kalibrierung** | Passen Pflege, Mortalität, Steuerannahmen, Regime und Policies zu externer Evidenz und Zielgruppe? | Quellenabgleich, Parameterstudien, Expertenprüfung, Out-of-sample-Vergleiche | bleibt populations- und annahmenabhängig |
| **V6 Entscheidungsvalidierung** | Ist der konkrete Haushaltsfall mit realen Unterlagen und Umsetzung konsistent? | Nutzerprüfung, Brokerabrechnung, Steuer-/Versicherungsfachprüfung, laufendes Reconcile | kann nicht durch Softwaretests ersetzt werden |

Ein grüner Testlauf belegt V1 bis V3 für die jeweils abgedeckten Pfade. Er ist
kein wissenschaftlicher Nachweis für Datenqualität, Kalibrierung,
Prognosefähigkeit oder die Eignung einer konkreten finanziellen Entscheidung.

---

# Marktvergleich

**Methodikstand und Vergleichsstichtag:** 2026-07-15. Die Erhebung verwendet
öffentlich zugängliche offizielle Quellen und die lokale Source of Truth der
Ruhestand-Suite. Produktstufen, Preise, Funktionsbefunde und Evidenzlücken sind
auf diesen Stichtag eingefroren.
Symbolwertungen, Reviewer-Zitate, Gesamtscores und unbeschränkte
Exklusivitätsaussagen werden nicht verwendet.

## D.1 Erkenntnisziel und Vergleichsgrenze

Der Vergleich fragt, wie die festgelegte Stufe den synthetischen deutschen
Referenzhaushalt modelliert und wie transparent, reproduzierbar und operativ
nutzbar ihre Annahmen, Rechenwege und Ergebnisse sind. Er bestimmt kein
allgemein „bestes“ Produkt.

Vergleichseinheit ist **Produkt, Stufe, Region/Sprache und Erhebungsdatum**.
Segmente werden in ihrem eigenen Zweck interpretiert; es gibt weder Scores
noch Rangliste. Eine Funktion anderer Stufen wird nicht übertragen. Auch
lokaler Suite-Code belegt keine externe Wirksamkeit.

## D.2 Recherchefenster und reproduzierbarer Stichtag

Die Erhebung endete am 2026-07-15. Eine Vollerhebung dauert höchstens 14 Tage;
am letzten Tag werden Stufe, Verfügbarkeit und Preis erneut geprüft. Records
führen Abruf- sowie erkennbaren Veröffentlichungs-/Änderungsstand. Längere
Erhebungen erfordern eine Neuprüfung; verlorene Quellen werden historisch oder
nicht erneut verifiziert. Kauf, Registrierung, Anbieteranfrage oder reale
Finanzdaten benötigen gesonderte Freigabe.

## D.3 Produktsegmente

Die fünf Segmente sind Consumer Planner, deutsche Vorsorge-/Entnahmewerkzeuge,
Beratersoftware, FIRE-Werkzeuge und Offline-/Tabellenlösungen. Vollplaner
werden nach Szenarien und Haushaltsbreite, schmale Werkzeuge nach ihrem
Rechen-/Informationszweck, Beraterprodukte nach Kollaboration und Auditierbarkeit
und lokale Werkzeuge auch nach Kontrolle und Laufzeitabhängigkeiten gelesen.
`Nicht anwendbar` schützt sachfremde Zwecke; Abdeckung ist nicht
Zweckerfüllung.

## D.4 Auswahlregeln und Stichprobe

### D.4.1 Auswahlverfahren

Die bewusste Maximum-Variation-Stichprobe ist nicht statistisch
repräsentativ. Sie kontrastiert Zielgruppen, Rechtsräume, Rechenansätze und
Betriebsmodelle; Marktanteils-, Häufigkeits- und universelle
Exklusivitätsaussagen sind unzulässig.

Aufgenommen werden erreichbare, stufenscharf benennbare Werkzeuge mit
Ruhestands-, Vorsorge- oder Entnahmezweck, eigenständigem Segmentnutzen und
prüfbaren offiziellen Quellen. Reine Portfolioanalyse, doppelte Stufen,
nicht erreichbare Produkte und nur sekundär belegte Werkzeuge bleiben
Kontext, nicht Kernstichprobe.

### D.4.2 Untersuchte Stichprobe

Die Tabelle fixiert Segment und untersuchte Stufe; Aufnahme allein belegt
keine Funktion.

| ID | Segment | Produkt und untersuchte Stufe | Auswahlgrund | Offizieller Einstieg, geprüft am 2026-07-15 |
| --- | --- | --- | --- | --- |
| RS-01 | Referenzprodukt | Ruhestand-Suite, lokale Arbeitskopie | Gegenstand des Vergleichs; deutschsprachiger DIY- und Jahresworkflow | lokale Source of Truth dieses Repositorys |
| CP-01 | Consumer Planner | ProjectionLab Premium | international ausgerichteter DIY-Planer; eine bezahlte Endkundenstufe verhindert den Vergleich einer Vollsuite mit einem absichtlich reduzierten Gratiszugang | [Pricing & Subscriptions](https://projectionlab.com/pricing) |
| CP-02 | Consumer Planner | Boldin PlannerPlus | ruhestandsspezifischer US-Endkundenplaner mit klar benannter bezahlter Stufe | [Boldin Pricing](https://www.boldin.com/retirement/pricing/) |
| DE-01 | Deutsches Werkzeug | BVI Entnahme-Rechner, öffentlicher Webzugang | institutioneller deutscher Basisfall für einen Fonds-Auszahlplan | [BVI-Rechner](https://www.bvi.de/service/rechner/) |
| DE-02 | Deutsches Werkzeug | Finanzfluss Entnahmeplan, öffentlicher Webzugang | verbreiteter deutschsprachiger Endkundenrechner als niedrige Komplexitätsstufe | [Entnahmeplan-Rechner](https://www.finanzfluss.de/rechner/entnahmeplan/) |
| DE-03 | Deutsches Werkzeug | Digitale Rentenübersicht, öffentlicher Portalzweck | Referenz für deutsche Vorsorgeanspruchs-Aggregation; ausdrücklich kein Vollplaner | [Digitale Rentenübersicht](https://www.rentenuebersicht.de/DE/01_startseite/home_node.html) |
| AD-01 | Beratersoftware | MoneyGuide, Produktstufe „MoneyGuide“ | zielbasierte Beraterplanung und Berater-Kunden-Workflow als eigener Markt | [MoneyGuide](https://www.moneyguidepro.com/) |
| AD-02 | Beratersoftware | eMoney Pro | cashflow-orientierte Beraterplanung als methodischer Gegenpol zur zielbasierten Plattform | [eMoney Pro](https://emoneyadvisor.com/products/emoney-pro/) |
| FIRE-01 | FIRE-Werkzeug | FI Calc, öffentlicher Webzugang | fokussiertes Entnahmewerkzeug mit öffentlich strukturierter Methodikdokumentation | [FI Calc Guide](https://guide.ficalc.app/) |
| FIRE-02 | FIRE-Werkzeug | FIRECalc 3.0, öffentlicher Webzugang | etablierter historischer Sequenzrechner als zweite FIRE-Methodik | [FIRECalc](https://firecalc.com/) |
| OT-01 | Offline-/Tabellenlösung | Pralana Gold | explizit herunterladbare Excel-Produktstufe und damit eigenständiger Offline-/Tabellenfall | [Pralana](https://pralanaretirementcalculator.com/) |

Die zehn externen Werkzeuge decken zwei Consumer Planner, drei deutsche
Werkzeuge, zwei Beraterprodukte, zwei FIRE-Werkzeuge und eine
Offline-/Tabellenlösung ab.

### D.4.3 Austausch- und Abbruchregeln

Ersatz erfolgt nur im selben Segment mit dokumentiertem Grund. Produkt- und
Stufenwechsel werden nicht vermischt; geschlossene Zugänge erzeugen neutrale
Dokumentationsbefunde. Mehr als zwei Ersetzungen oder der Wegfall eines
Segments erfordern eine neue Stichprobenentscheidung.

## D.5 Statuslexikon und Evidenzregeln

### D.5.1 Zellstatus

| Status | Verbindliche Bedeutung |
| --- | --- |
| **vorhanden** | offizielle Quelle oder Direktbefund bestätigt den gesamten Kriterienkern nativ |
| **teilweise** | Kernanteil vorhanden, aber Umfang, Region, Person, Zeit, Export oder Referenzfall ist eingeschränkt; beide Seiten werden benannt |
| **nicht öffentlich dokumentiert** | offizieller Suchpfad ohne belastbare Aussage; niemals Abwesenheitsbeleg |
| **nicht vorhanden** | ausdrückliche Negativaussage oder reproduzierter Direktbefund; nie aus Schweigen |
| **nicht anwendbar** | außerhalb von Produktzweck oder Zugriffsebene; keine negative Wertung |
| **nicht geprüft** | offen, blockiert oder nur über nicht freigegebenen Zugang prüfbar; Grund ist Pflicht |

Auf Kriterienebene gilt die konservativste verpflichtende Teilfrage:
`vorhanden` verlangt vollständige Kernabdeckung, gemischte Abdeckung ist
`teilweise`. Die Evidenzklassen P1 bis P4, S1 und I1 sowie ihre Grenzen sind
im [Evidenzregister](MARKTVERGLEICH_EVIDENZREGISTER.md#evidenzklassen-und-pflichtfelder)
definiert. Werbeaussagen bleiben Anbieteraussagen; Widersprüche werden über
Stufe, Datum und Kontext geklärt oder bleiben offen.

## D.6 Einheitlicher Kriterienkatalog

Alle Produktstufen werden mit denselben 18 Kriterien geprüft. Schmalere
Werkzeuge erhalten bei sachfremden Fragen `nicht anwendbar`, nicht automatisch
einen negativen Befund.

| ID | Prüffeld | ID | Prüffeld |
| --- | --- | --- | --- |
| K-01 | Fachmodell und Zeitlogik | K-10 | Optimierung und Suchgrenzen |
| K-02 | Steuerregion und -tiefe | K-11 | Datenschutz und Speicherung |
| K-03 | Renten je Person | K-12 | Offline-Fähigkeit und Netzreste |
| K-04 | Pflege, Eintritt und Reserve | K-13 | Export, Backup und Reimport |
| K-05 | Haushalt, Eigentum, Tod | K-14 | Auditierbarkeit und Reproduktion |
| K-06 | Datenbasis, Zeitraum, Quelle | K-15 | UX und Fehlerbehandlung |
| K-07 | Stochastik, Seed, Stress | K-16 | Barrierefreiheit und WCAG-Nachweis |
| K-08 | Formeln, Defaults, Grenzen | K-17 | Stufe, Währung und Preisperiode |
| K-09 | Szenarien und Vergleich | K-18 | Lizenz- und Weitergaberechte |

Preise bleiben in Originalwährung und -periode; UX und Barrierefreiheit
werden nur in zugänglichen Oberflächen bewertet. Marketing-Screenshots
ersetzen keinen Bedienbefund.

## D.7 Synthetischer Referenzhaushalt

### D.7.1 Zweck und Einheiten

Der vollständig synthetische Fall prüft Modellierbarkeit, nicht gleiche
Ergebniszahlen. Stichtag und Kaufkraftbasis sind 2027-01-01, der Horizont
reicht bis 2066-12-31. Ohne harmonisierte Daten, Ereignisreihenfolge,
Inflation, Steuer und Erfolgsdefinition werden keine Erfolgsquoten verglichen.
Die Steuersätze sind feste Testparameter, keine Rechts- oder Steuerberatung.

### D.7.2 Basisfall RH-01

| Gruppe | Festgelegter synthetischer Input |
| --- | --- |
| Personen | A: 63, Ruhestand 2027; B: 61, Ruhestand 2029; deutscher Paarhaushalt, 40 Jahre, im Basisfall kein vorgegebener Tod |
| Netto-Cashflows | B: 30.000 EUR Erwerbseinkommen 2027/2028; gesetzliche Rente A 22.800 EUR ab 2029 und B 17.400 EUR ab 2033, je 2 % indexiert; private Rente A 4.800 EUR ab 2032 nominal konstant |
| Bedarf | Floor 42.000 EUR real und Flex 12.000 EUR real, je 2 % Inflation; Gebäudemaßnahme 35.000 EUR real im Jahr 2035 |
| Vermögen | Aktien-ETF 550.000/350.000 EUR Marktwert/Kostenbasis; Anleihen 120.000 EUR; Liquidität 60.000 EUR; Gold 40.000/30.000 EUR; gesperrte Pflegevorsorge 80.000 EUR; nicht entnahmefreigegebene Immobilie 450.000 EUR |
| Rendite/Kosten | nominal Aktien 5,0 %, Anleihen 2,5 %, Liquidität/Pflegevorsorge 1,5 %, Gold 2,0 %; Kosten 0,25 % p.a. auf investiertes Finanzvermögen |
| Steuer/Priorität | 25 % Kapitalertragsteuer, 5,5 % Zuschlag darauf, keine Kirchensteuer, 30 % ETF-Teilfreistellung, 2.000 EUR gemeinsamer Freibetrag; Einkommen deckt Floor und Flex, Portfolio die Lücke, Pflegevorsorge bleibt bis RH-03 gesperrt |

Nicht sauber trennbare Brutto-/Nettoflüsse und fehlende Assetklassen werden
als Vereinfachung dokumentiert, nicht durch passend erscheinende Werte oder
stille Umschichtung ersetzt.

### D.7.3 Feste Modellierbarkeitsproben

| ID | Änderung gegenüber RH-01 | Prüffrage |
| --- | --- | --- |
| RH-02 Sequenzstress | Aktienrendite 2027: -25 %, 2028: -10 %; Inflation 2027: 6 %, 2028: 4 %; danach Rückkehr zu den Kontrollannahmen | Lassen sich zeitlich bestimmte Markt-/Inflationsschocks und die Entnahmewirkung transparent abbilden? |
| RH-03 Pflege | Person B erhält ab 2044-01-01 Pflegegrad 3; zusätzlicher Bedarf 24.000 EUR real p.a., 2 % indexiert; zweckgebundene Reserve wird zuerst genutzt | Sind Personenbezug, Pflegeereignis, Kostendynamik und Reservefreigabe nativ oder nur als allgemeine Ausgabe modellierbar? |
| RH-04 Hinterbliebene | Person A stirbt am 2048-12-31; eigene Renten A enden; ab 2049 erhält B 55 % der gesetzlichen Rente A; gemeinsamer Floor sinkt um 20 %, Flex um 30 % | Werden Tod, verzögerter Hinterbliebenenzufluss und veränderte Haushaltsausgaben konsistent verarbeitet? |

Für jedes Produkt wird je Input und Probe einer von vier
Modellierbarkeitsbefunden notiert: **nativ**, **mit dokumentiertem Workaround**,
**nur als grobe Näherung** oder **nicht modellierbar/nicht prüfbar**. Ein
Workaround darf die fachliche Bedeutung nicht verdecken. Ergebnisse werden
nur dann numerisch nebeneinandergestellt, wenn Einheit, Zeitpunkt,
Rendite-/Inflationspfad, Steuerbehandlung, Kosten und Erfolgsdefinition
tatsächlich harmonisiert sind.

## D.8 Quellen- und Erhebungsprotokoll

Der Suchpfad läuft von Produkt-/Stufen- und Preisseite über Handbuch und
Methodik zu Datenschutz, Export, Offline, Lizenz, Barrierefreiheit und
zugänglicher Oberfläche; Sekundärquellen dienen erst danach subjektiven
UX-Fragen. Suchmaschinen-Snippets sind nur Wegweiser. Ein erfolgloser
offizieller Suchweg wird als neutraler `99`-Record protokolliert.

Jeder Beleg hat die stabile Form `MKT-<PRODUKT>-<NN>` und führt Stufe,
Betreiber, Ziel, Klasse, Veröffentlichungs-/Abrufstand, Region, Kriterium,
Paraphrase, Fundstelle und Grenze. Der vollständige Feldvertrag und alle
Records stehen im [Evidenzregister](MARKTVERGLEICH_EVIDENZREGISTER.md#evidenzklassen-und-pflichtfelder).
Lange Kopien geschützter Quellentexte bleiben ausgeschlossen.

## D.9 Auswertung und zulässige Aussagen

Der Ergebnisblock folgt einer festen Reihenfolge:

1. Methoden- und Quellenstand;
2. Ergebnisse je Segment;
3. Modellierbarkeit RH-01 bis RH-04;
4. segmentübergreifende Stärken und Grenzen;
5. Positionierung und Nicht-Zielsegmente der Ruhestand-Suite;
6. Evidenzlücken und Aktualisierungsbedarf.

Konkurrenzstärken sind ebenso verpflichtend wie eigene Stärken. Ein
Differenzierungsmerkmal darf höchstens lauten, dass es **in der untersuchten
Stichprobe, Produktstufe und öffentlichen Dokumentation am Stichtag** nicht
gleichartig belegt wurde. `Nicht öffentlich dokumentiert` darf nie zu „kein
anderes Tool kann das“ verkürzt werden. Implementierungsdetails der
Ruhestand-Suite belegen außerdem keine bessere Prognosegüte oder bessere reale
Ruhestandsentscheidungen.

## D.10 Festgelegte Methodenbasis

Die abgeschlossene Methodenbasis umfasst:

- die zehn externen Produkte und jeweils festgelegten Stufen;
- die fünf Segmentgrenzen;
- den Kriterienkatalog K-01 bis K-18 samt Statuslexikon;
- Referenzhaushalt RH-01 und die drei festen Proben RH-02 bis RH-04;
- Recherchefenster, Quellenrecord und Verzicht auf Gesamtscore/Rangliste.

Erhebung und Auswertung in D.11 bis D.18 verwenden diese Basis unverändert.

## D.11 Erhebungsstand, Zugang, Preis und Lizenz

Die Vollerhebung und die abschließende Volatilitätsprüfung erfolgten am
2026-07-15. Es wurden weder Konten angelegt noch Testphasen, Käufe,
Demoanforderungen oder nicht öffentliche Beraterzugänge genutzt. Preise
stehen in Originalwährung und -periode; Steuern, Wechselkurse und nicht
ausgewiesene Gesamtkosten wurden nicht ergänzt.

| Untersuchte Stufe | Region/Zugang | Preisstand 2026-07-15 | Tragender Record |
| --- | --- | --- | --- |
| Ruhestand-Suite, lokale Arbeitskopie | DE/lokal | kein kommerzieller Tarif untersucht | [MKT-RS-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-01) |
| ProjectionLab Premium | international/Web | 129 USD pro Jahr | [MKT-PL-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-pl-01) |
| Boldin PlannerPlus | USA/Web | 12 USD monatlich, 144 USD jährlich abgerechnet | [MKT-BD-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-bd-01) |
| BVI Entnahme-Rechner | DE/öffentlich | kein gesonderter Tarif dokumentiert | [MKT-BVI-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-bvi-01) |
| Finanzfluss Entnahmeplan | DE/öffentlich | kein gesonderter Tarif dokumentiert | [MKT-FF-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-ff-01) |
| Digitale Rentenübersicht | DE/eID-Portal | freiwillig und kostenfrei | [MKT-DR-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-dr-01) |
| MoneyGuide | USA/Berater | 2.000 USD pro Berater und Jahr | [MKT-MG-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-mg-01) |
| eMoney Pro | USA/Berater | nicht öffentlich dokumentiert | [MKT-EM-99](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-em-99) |
| FI Calc | USA/öffentlich | kostenlos, freiwillige Unterstützung | [MKT-FI-05](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-fi-05) |
| FIRECalc 3.0 | USA/öffentlich | Unterstützerfunktionen; Betrag offen | [MKT-FC-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-fc-01) |
| Pralana Gold 2026 | USA/Excel-Download | 99 USD einmalig für Version 2026 | [MKT-PR-02](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-pr-02) |

Lizenz- und Nutzungsgrenzen stehen stufenscharf bei den Records. Für die Suite
nennen `LICENSE.md`, npm-Manifest, Root-Lockfile-Eintrag und Cargo-Manifest
seit Slice 5 einheitlich MIT. GAP-MKT-06 ist mit automatisiertem
Metadaten-Contract geschlossen; Abhängigkeiten behalten ihre eigenen
Lizenzangaben.

## D.12 Quellenrecords der Erhebung

Die vollständigen 69 MKT-Records mit Produktstufe, Region, Evidenzklasse,
Veröffentlichungs- beziehungsweise Änderungsstand, Quellenziel,
Belegparaphrase und Grenze stehen im normativen
[Marktvergleich-Evidenzregister](MARKTVERGLEICH_EVIDENZREGISTER.md). Jeder
Record besitzt dort einen stabilen Anker. Für externe Records gilt das
Abrufdatum 2026-07-15 in Europe/Berlin. Records mit der Endung `99` sind
neutrale Suchprotokolle und niemals Abwesenheitsbelege.

## D.13 Kriterienprofil K-01 bis K-18

Die [vollständige Kriterienmatrix](MARKTVERGLEICH_EVIDENZREGISTER.md#kriterienmatrix-k-01-bis-k-18)
steht beim Quellenregister. Sie verwendet ausschließlich das Statuslexikon
aus D.5; `teilweise` ist kein Punktabzug und `nicht öffentlich dokumentiert`
keine Funktionsverneinung. Die folgende Verdichtung zeigt die tragenden
Befunde ohne Rangliste oder Gewichtung:

| Segment | Belegte Stärke im untersuchten Zweck | Wesentliche Grenze |
| --- | --- | --- |
| Ruhestand-Suite | deutsche Kapitalertragsteuer auf Lot-/Eigentümerebene, Paar-/Pflegepfade, mehrere Simulationsarten, lokale Daten und Diagnose ([MKT-RS-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-01), [MKT-RS-02](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-02), [MKT-RS-03](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-03)) | keine vollständige Einkommensteuer, keine freie Ereignisliste, keine externe Wirksamkeits- oder formale WCAG-Prüfung ([MKT-RS-99](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-99)) |
| Consumer Planner | ProjectionLab und Boldin dokumentieren planzentrierte Varianten, Szenarien und Ergebnisdarstellung ([MKT-PL-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-pl-01), [MKT-PL-03](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-pl-03), [MKT-BD-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-bd-01), [MKT-BD-05](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-bd-05)) | deutsche Steuer-, Pflegegrad- und Hinterbliebenendetails sind nicht vollständig nativ belegt ([MKT-PL-04](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-pl-04), [MKT-BD-02](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-bd-02), [MKT-BD-06](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-bd-06)) |
| Deutsche Werkzeuge | BVI und Finanzfluss fokussieren Kapitalentnahme; die Digitale Rentenübersicht aggregiert autoritative Vorsorgeansprüche ([MKT-BVI-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-bvi-01), [MKT-FF-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-ff-01), [MKT-DR-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-dr-01)) | die schmalen Produktzwecke sind keine Gesamtplanung; fehlende öffentliche Angaben bleiben neutrale Lücken |
| Beratersoftware | MoneyGuide und eMoney stützen kollaborative, breite Beraterplanung ([MKT-MG-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-mg-01), [MKT-EM-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-em-01)) | US-Rechtsraum und nicht freigegebene Beraterzugänge begrenzen die stufenscharfe öffentliche Prüfung ([MKT-EM-99](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-em-99)) |
| FIRE/Offline | FI Calc und FIRECalc dokumentieren historische Entnahmeverfahren; Pralana verbindet lokale Tabellenplanung mit Szenarien und Optimierung ([MKT-FI-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-fi-01), [MKT-FC-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-fc-01), [MKT-PR-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-pr-01), [MKT-PR-04](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-pr-04)) | überwiegend US-Daten/-Steuern, enger Haushaltsumfang oder ohne Kauf ungeprüfte Workbook-UX |

## D.14 Segmentbefunde: Stärken und Grenzen

Die Segmente erfüllen verschiedene Zwecke. Consumer Planner sind bei
Planvarianten und Szenariovergleich stärker; Beratersoftware bei
Kollaboration und Datenaggregation; deutsche Einzelwerkzeuge bei fokussierter
Entnahme oder autoritativer Vorsorgeanspruchs-Aggregation; FIRE- und
Tabellenwerkzeuge bei transparenter historischer Methodik beziehungsweise
lokaler Modellbreite. Diese Stärken dürfen nicht als Mängel bewertet werden,
nur weil sie außerhalb des Suite-Schwerpunkts liegen.

Die Ruhestand-Suite bündelt dagegen deutsche Kapitalertragsteuer auf
Lot-/Eigentümerebene, Paar-, Witwen- und Pflegepfade, mehrere Simulationsarten
und einen lokalen Jahresworkflow. Ihre Grenzen bleiben persönliche
Einkommensteuer, frei definierbare Ereignisfolgen, planzentrierter
Szenariovergleich, autoritative Datenaggregation und formale UX-/WCAG- sowie
externe Wirksamkeitsnachweise. Die Belege und stufenscharfen Einschränkungen
stehen in D.13 und im Evidenzregister; die Positionierungsfolgen folgen in
D.16.

## D.15 Modellierbarkeit des Referenzhaushalts RH-01 bis RH-04

Der konservativste wesentliche Input bestimmt den Gesamtbefund. `Nativ`
verlangt die Probe ohne fachliche Umdeutung; ein allgemeines Ausgabenfeld ist
kein natives Pflegegradmodell. `N`, `W`, `G` und `O` bedeuten nativ,
dokumentierter Workaround, grobe Näherung und nicht modellierbar/nicht
prüfbar.

| Produktstufe | RH-01 | RH-02 | RH-03 | RH-04 | Entscheidende Grenze |
| --- | --- | --- | --- | --- | --- |
| Ruhestand-Suite | G | G | G | W | freie Ereignis-/Schockfolge und fixer Pflegeeintritt fehlen ([MKT-RS-99](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-99)) |
| ProjectionLab Premium | W | N | W | W | deutsche Steuer- und Pflegefachlichkeit nur angenähert ([MKT-PL-03](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-pl-03), [MKT-PL-04](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-pl-04)) |
| Boldin PlannerPlus | G | G | W | W | US-Steuer-, LTC- und Survivor-Vertrag ([MKT-BD-02](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-bd-02)) |
| BVI Entnahme-Rechner | G | O | O | O | fokussierter Kapitalentnahmezweck ([MKT-BVI-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-bvi-01)) |
| Finanzfluss Entnahmeplan | G | O | O | O | deterministischer Einzelrechner ([MKT-FF-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-ff-01)) |
| Digitale Rentenübersicht | G | O | O | O | Vorsorgeinput statt Gesamtplanung ([MKT-DR-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-dr-01)) |
| MoneyGuide | W | W | W | W | breite US-Beratermodellierung ([MKT-MG-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-mg-01)) |
| eMoney Pro | W | O | O | O | Proben ohne Beraterzugang nicht stufenscharf belegt ([MKT-EM-99](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-em-99)) |
| FI Calc | G | G | W | W | US-Historie, keine Steuer-/Personenlogik ([MKT-FI-05](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-fi-05)) |
| FIRECalc 3.0 | G | G | W | W | keine deutsche Steuer-/Pflege- oder freie Schockfolge ([MKT-FC-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-fc-01)) |
| Pralana Gold 2026 | W | W | W | W | US-Mapping; gekaufte Mappe nicht ausgeführt ([MKT-PR-99](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-pr-99)) |

Nur ProjectionLabs RH-02 ist nativ belegt; das ist keine Gesamtwertung. Es
werden keine Ergebnisbeträge oder Erfolgsquoten verglichen, weil Datenregion,
Inflation, Steuern, Reihenfolge, Kosten, Mortalität und Erfolgsdefinition
nicht harmonisiert sind.

## D.16 Positionierung der Ruhestand-Suite

### D.16.1 Zielgruppe und Nutzenversprechen

Die Ruhestand-Suite ist als lokal betriebene, deutschsprachige
DIY-Entnahme- und Jahressteuerungsumgebung für Einzelpersonen und
Paarhaushalte positioniert, die Annahmen selbst pflegen und Ergebnisse
fachlich hinterfragen. Ihr Kernnutzen ist die Verbindung aus:

- deutscher kapitalertragsteuerlicher Entnahmelogik auf Lot-/Eigentümerebene;
- Floor-/Flex-, Liquiditäts-, Guardrail- und Jahresabschlussworkflow;
- Paar-, Witwen-, Pflegegrad- und zweckgebundener Pflegevorsorgelogik;
- historischen, stochastischen, Stress-, Sensitivitäts- und
  Optimierungspfaden;
- lokaler Datenhaltung, Recovery, Export und Diagnose.

Das Produkt ist Planungs- und Lernsoftware, keine Anlage-, Steuer-,
Versicherungs- oder Pflegeberatung. Modellinterne Erfolgsquoten sind keine
Garantie.

### D.16.2 Begrenzt zulässige Differenzierung

Nur für die zehn ausgewählten Stufen und öffentlichen Quellen vom 2026-07-15
ist keine zweite Stufe belegt, die deutsche Lot-/Kapitalertragsteuer,
Pflegegrad mit gesperrter Reserve, Paar-/Witwenpfad, mehrere
Simulationsmethoden, Auto-Optimierung und lokalen Jahresworkflow kombiniert
([MKT-RS-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-01),
[MKT-RS-02](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-02)). Das ist keine
universelle Exklusivitäts-, Prognosegüte- oder Wirksamkeitsaussage.
Geschlossene Stufen bleiben unbekannt; Pralana ist ebenfalls lokal und FI
Calc hält Eingaben gerätelokal. Andere Produkte sind bei Planvarianten,
Kollaboration, Datenaggregation, Einfachheit oder Methodenführung breiter.

### D.16.3 Wettbewerberstärken, die nicht relativiert werden dürfen

Unverkürzt anzuerkennen sind planzentrierte Varianten bei ProjectionLab und
Boldin, Berater-Kunden-Kollaboration bei MoneyGuide und eMoney, autoritative
Vorsorgeansprüche der Digitalen Rentenübersicht, die fokussierte Einfachheit
von BVI und Finanzfluss, FI Calcs öffentliche Methodenführung sowie Pralanas
breite lokale Tabellenplanung. D.13 verbindet jeden Befund mit seinem Record.

### D.16.4 Eigene Grenzen und strategische Lücken

| ID | Lücke | Evidenz | Positionierungsfolge |
| --- | --- | --- | --- |
| GAP-MKT-01 | keine vollständige persönliche Einkommensteuer-/Sozialabgabenrechnung | K-02, [MKT-RS-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-01), [MKT-RS-02](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-02) | Netto-Cashflows und Kapitalertragsteuer klar trennen; keine „vollständige deutsche Steuerplanung“ bewerben |
| GAP-MKT-02 | keine frei definierbare, versionierte Ereignis- und Jahrespfadliste für Einmalbeträge, Rendite und Inflation | RH-01/RH-02, [MKT-RS-99](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-99) | feste Referenzschocks nur als Näherung ausweisen; ProjectionLab hat hier einen belegten Vorteil |
| GAP-MKT-03 | fixer Pflegeeintritt/Grad/Person nicht als deterministische Probe konfigurierbar | RH-03, [MKT-RS-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-01), [MKT-RS-99](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-99) | stochastische Pflegeanalyse nicht als exakter Pflegeplan darstellen |
| GAP-MKT-04 | allgemeines Speichern, Kopieren und Side-by-side-Vergleichen vollständiger Pläne fehlt | K-09, [MKT-RS-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-01), [MKT-RS-99](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-99) | Sweep/Backtest nicht mit vollwertigem Szenariomanagement gleichsetzen |
| GAP-MKT-05 | keine formale Usability-, Screenreader- oder WCAG-Prüfung | K-15/K-16, [MKT-RS-99](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-99) | Barrierefreiheit nur auf Ebene einzelner Hilfen beschreiben |
| GAP-MKT-06 | geschlossen am 2026-07-17: Projektlizenz in Lizenztext, npm- und Cargo-Metadaten einheitlich MIT | K-18, [MKT-RS-04](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-04), [MKT-RS-05](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-05) | Regressionstest trennt Root-Projektmetadaten von eigenen Lizenzangaben der Abhängigkeiten |
| GAP-MKT-07 | keine autoritative Rentenanspruchs- oder Kontenaggregation | [MKT-DR-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-dr-01), [MKT-EM-02](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-em-02) | manuelle Eingaben als Nutzerverantwortung kennzeichnen; Import wäre eine separate Produktentscheidung |
| GAP-MKT-08 | keine externe Prognose-, Kalibrierungs- oder Entscheidungsvalidierung | D.1, [MKT-RS-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-01), [MKT-RS-02](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-02) | Implementierung, Tests und Transparenz nicht als Wirksamkeitsbeleg formulieren |

### D.16.5 Nicht-Zielsegmente

Nicht-Ziele sind B2B-Berater- und staatliche Aggregationsplattformen,
internationale Gesamtsteuer-/Estateplanung, automatische Kontoaggregation,
Depotvollmacht, aktuarielle Pflege- oder medizinische Prognose, ein
detailfreier Ein-Feld-Rechner und jede Erfolgsgarantie. Eine Expansion wäre
ein eigener Produktauftrag mit Daten-, Sicherheits-, Rechts- und
UX-Verträgen.

## D.17 Evidenzlücken und Aktualisierungsroutine

### D.17.1 Offene Evidenzlücken

Offen bleiben bei der Suite externe Validierung und formale UX/WCAG-Prüfung;
bei Web- und Beraterprodukten insbesondere geschlossene Bedienpfade,
Accessibility, Offline-, Export-, Preis-, Lizenz- und Methodendetails. FI Calc
und FIRECalc sind nicht allein wegen freien Zugangs Open Source; Pralanas
Workbook wurde nicht gekauft oder ausgeführt.
Die stufenscharfen Lücken und Konsequenzen stehen in den `99`-Records und der
vollständigen Kriterienmatrix. Schweigen bleibt stets neutral.

### D.17.2 Pflege des Vergleichs

Der eingefrorene Stichtagsbefund bleibt als historische Version erhalten.
Eine Aktualisierung überschreibt ihn nicht still, sondern ergänzt Datum,
geänderte Quelle und Auswirkung auf Matrix beziehungsweise Positionierung.

Nächste turnusmäßige Prüfung ist spätestens 2026-10-15, zusätzlich vor
öffentlichen Markt-/Differenzierungsaussagen und Releases mit Marktbezug.
Tarif-, Stufen-, Dienst-, Lizenz-, Offline- oder wesentliche
Suite-Änderungen lösen eine Sofortprüfung aus: erst Identität/Stufe, dann
Preis, Terms, Methode, Datenschutz, Export, Offline und Accessibility.
Betroffene Records erhalten Abrufdatum und Änderungsnotiz; verlorene Quellen
werden historisch oder `nicht erneut verifiziert`, nicht gelöscht oder als
Funktionsfehlen gewertet. Statusänderungen brauchen einen Beleg; Änderungen
an Ereignis-, Steuer-, Pflege-, Haushalts- oder Szenariofunktionen erzwingen
eine neue RH- und Differenzierungsprüfung.

## D.18 Ergebnisstand des Marktvergleichs

Der dokumentierte Ergebnisstand umfasst:

- Erhebungsstichtag, Produktstufen, Preis-/Lizenzstand und Quellenrecords;
- die im Evidenzregister geführten K-01-bis-K-18-Matrizen ohne Score oder
  Rangliste;
- die Modellierbarkeitskarte RH-01 bis RH-04;
- Konkurrenzstärken, eigene Grenzen, strategische Lücken,
  Ziel-/Nicht-Zielsegmente und Aktualisierungsroutine;
- die Aussagegrenze, dass Differenzierung nur für Stichprobe, Stufe,
  öffentliche Evidenz und Stichtag gilt.

Die Aussagen bleiben auf Erhebungsstichtag, untersuchte Stufen und öffentlich
zugängliche Evidenz begrenzt. D.17 beschreibt die erforderliche
Aktualisierungsroutine.

---

# Wissenschaftlicher Rahmen, Quellenkorpus und Tiefeneinordnung

<a id="forschungsrahmen"></a>

**Forschungs- und Quellenstand:** 2026-07-15<br>
**Zweck dieses Blocks:** Evidenzvertrag, kompakter Mechanismusabgleich,
Ergebnisgrenzen und offene Prüfungen; keine Wirksamkeitsfreigabe der Suite<br>
**Normativer Beleganhang:**
[`FORSCHUNGSABGLEICH_EVIDENZREGISTER.md`](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md)

## E.1 Erkenntnisziel und Aussagegrenze

Der Forschungsrahmen ordnet ein, welche wissenschaftlichen,
institutionellen, amtlichen und methodischen Quellen für 17 Suite-Mechanismen
einschlägig sind. Er trennt Methodenursprung, empirischen Befund,
Kalibrierungsinput, Gegenbefund und Anwendungskontext. Die Einordnung gilt für
den dokumentierten Code-, Daten- und Quellenstand, nicht zeitlos für jede
Parametrisierung oder jeden Haushalt.

Eine Quelle im Korpus beweist weder, dass die Suite dieselbe Methode identisch
umsetzt, noch dass deren Literaturergebnis reproduziert wird. Eine
implementierte Formel ist kein Wirksamkeitsnachweis; ein grüner Test belegt
keine externe Kalibrierung; ein historischer oder simulierter Erfolgsanteil
ist keine Garantie. Zahlen aus anderen Rechts-, Daten- oder Währungsräumen
dürfen nicht ungeprüft auf deutsche Haushalte übertragen werden.

Das [Forschungs-Evidenzregister](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md)
besitzt die normative Detail-Ownership für 55 FOR-Records, Taxonomie,
Versionsstandard, Quellen-Mapping und die vollständigen MAP-Dossiers. Dieser
Hauptblock besitzt die normative Ownership für die kompakte Einordnung, das
Ergebnisbündel, FR-01 bis FR-12 und FQ-01 bis FQ-10. Beide Dokumente müssen bei
einer Neubewertung gemeinsam gepflegt werden. Der interne
[Forschungsvalidierungs-Backlog](../internal/FORSCHUNGSVALIDIERUNGS_BACKLOG.md)
operationalisiert die offenen FR-/FQ-Nachweise, ohne ihren Status oder den
Evidenzstatus der MAP-Dossiers anzuheben.

## E.2 Evidenz-, Übertragbarkeits- und Statusvertrag

Quellenklasse und Evidenzstufe beschreiben Herkunft und Belastbarkeit, nicht
automatisch die Übertragbarkeit. W1/W2 stehen für peer-reviewte Original- oder
Synthesearbeiten, I1/I2 für amtliche Standards beziehungsweise institutionelle
Forschung, P1/WP für Practitioner Research oder Working Papers und B1/C1 für
Fachbuch- beziehungsweise Community-Kontext. Stufe A darf einen klar
versionierten Methoden-, Theorie- oder Datenanker tragen, B nur eine begrenzte
Position und C nur Begriffe oder operative Herkunft. Keine Stufe allein
validiert die konkrete Suite-Policy.

| Code | Aussage im Mechanismusabgleich |
| --- | --- |
| T1 | Methodenbaustein und Zielgröße sind direkt prüfbar; verbleibende Implementierungsabweichungen müssen genannt werden. |
| T2 | Das Konzept ist strukturell relevant, aber Datenraum, Assetset, Horizont, Rechtsraum oder Zielfunktion weichen ab. |
| T3 | Die Quelle liefert Definition, Basisrate oder Szenariokontext, nicht die Wirkung einer Policy. |
| T4 | Die Quelle begründet eine Robustheits-, Bias-, Alternativmodell- oder Gegenbefundprüfung. |

Die Statusbezeichnung bewertet die konkrete Suite-Ausprägung: `etabliert`
bezeichnet einen im Wesentlichen anerkannten Methodenbaustein, `adaptiert`
eine für Suite-Ziele veränderte Methode, `heuristisch` eine transparente und
technisch reproduzierbare Regel ohne passende externe Kalibrierung und
`experimentell` einen Analyse-, Stress- oder Suchpfad ohne belastbare
Wahrscheinlichkeits- oder Empfehlungsaussage. Auch `etabliert` ist keine
Produktempfehlung.

Lokale Tests können V1 Contract, V2 Rechenregression und V3 Pfadparität
belegen. Offen bleiben je nach Mechanismus V4 historische Plausibilität, V5
externe Kalibrierung und V6 Eignung für den konkreten Haushaltsfall. Identische
Main-/Worker-Ergebnisse können auf allen Pfaden gleich verzerrt sein.

## E.3 Korpus und Pflegegrenze

Das Register führt 55 eindeutige Quellenrecords: FOR-ENT-01 bis FOR-ENT-10,
FOR-LCF-01 bis FOR-LCF-08, FOR-STO-01 bis FOR-STO-10, FOR-AST-01 bis
FOR-AST-07, FOR-PFL-01 bis FOR-PFL-03, FOR-VAL-01 bis FOR-VAL-10 und FOR-DE-01
bis FOR-DE-07. Das Korpus ist kuratiert und keine erschöpfende systematische
Literaturübersicht. Publikationsstand, Datenstand und Abrufdatum sind getrennt
zu führen; dynamische oder amtliche Quellen sind nach dem Pflegevertrag neu zu
erheben. Der hier dokumentierte Stand bleibt auf den 2026-07-15 eingefroren.

Konkrete Zahlen benötigen direkt an der Aussage Population, Zeitraum,
Portfolio, Horizont, Erfolgsdefinition und Modellart. Mehrere Fassungen
desselben Ergebnisses zählen nicht als unabhängige Evidenz. Marketing-, Blog-
und Community-Texte dürfen nur Praxisposition oder operative Herkunft tragen.

### E.3.1 Gemeinsame Aktualisierungsroutine

Eine Quellenänderung ist nicht mit dem Austausch eines Links erledigt. Zuerst
werden Publikations-, Daten- und Abrufstand des FOR-Records aktualisiert;
danach sind Quellenrolle, Evidenzstufe und T-Code zu prüfen. Anschließend
müssen alle betroffenen MAP-Dossiers und ihre Kurzzeilen auf geänderten
Befund, Suite-Abweichung und offene Prüfung bewertet werden. Erst zuletzt
werden FR-/FQ-Folgen und Aussagen außerhalb des Forschungsblocks angepasst.

Ist eine dynamische Quelle vorübergehend nicht erreichbar, bleibt der letzte
datierte Stand sichtbar und wird als nicht neu erhoben markiert; er darf nicht
still durch eine Sekundärdarstellung ersetzt werden. Widerlegt oder begrenzt
eine neue Quelle eine zentrale Aussage, wird der Gegenbefund dokumentiert und
die Aussage bis zur Neubewertung enger formuliert. Änderungen am Code allein
heben keinen Evidenzstatus an: Dafür ist ein neuer, zur beanspruchten
Validierungsstufe passender Nachweis erforderlich.

Die strukturelle Vollständigkeit dieses Vertrags wird in Slice 4 durch ein
Offline-Gate abgesichert. Live-HTTP-Prüfung bleibt ein separater, datierter
Erhebungsschritt und ist keine Voraussetzung für normale lokale Tests.

## E.4 Kompakter Mechanismusabgleich

Die vollständigen Dossiers im Register führen je Mechanismus
Implementierungsanker, Forschungsanker mit Rolle und T-Code, Suite-Umsetzung,
Abweichung, Evidenzstatus, lokale Validierung sowie Restrisiko. Die folgende
Einordnung hält die entscheidenden Grenzen im Hauptdokument sichtbar.

### E.4.1 Entnahme-, Konsum- und Asset-Policies

MAP-01 bis MAP-07 bilden keine voneinander unabhängigen Produktfunktionen.
Floor und Flex bestimmen zunächst, welcher Bedarf überhaupt finanziert werden
soll; Guardrails, `minimumFlexAnnual` und Dynamic Flex verändern anschließend
Höhe oder zeitliche Verteilung dieses Bedarfs. Runway, 3-Bucket-Logik und Gold
betreffen dagegen die Finanzierung und Vermögensstruktur. Eine Verbesserung
in einer Stufe darf daher nicht ohne unveränderte Folge- und Nebenbedingungen
der nächsten Stufen zugerechnet werden.

Besonders wichtig ist die Trennung zwischen Methodenursprung und konkreter
Policy. Historische Safe-Withdrawal-Arbeiten tragen die Fragestellung eines
real fortgeschriebenen Bedarfs, nicht automatisch Suite-Steuern, Renten,
Assetklassen oder Erfolgsdefinition. Guardrail-Arbeiten tragen regelbasierte
Anpassungen, aber nicht die konkrete Kombination aus Drawdown, CAPE, Runway,
Inflation und Recovery. Annuitätenrechnung trägt einen VPW-Kern, nicht die
zusätzlichen EMA-, Clamp-, Floor-/Flex- und Langlebigkeitsregeln. Diese
Abweichungen sind keine redaktionellen Fußnoten, sondern begrenzen jede
Ergebnisübertragung.

Bei Runway, Bonds, Gold und Pflegebucket muss außerdem zwischen
Verhaltensnutzen, operativer Liquidität und Portfoliowirkung unterschieden
werden. Ein zweckgebundener oder mental leichter verständlicher Topf kann
Nutzerverhalten strukturieren, ohne bei identischer Gesamtallokation Rendite
oder Floor-Erfolg zu erhöhen. Eine andere Verkaufsreihenfolge kann
Liquiditätsstress verschieben, zugleich aber Kosten, Steuer oder
Opportunitätsverlust erzeugen. Belastbare Aussagen benötigen deshalb
Ablationen mit identischem Anfangsvermögen, identischen Cashflows und
expliziter Gegenstrategie.

### E.4.2 Stochastik, CAPE und Validierungswerkzeuge

MAP-08 bis MAP-13 erzeugen keine zusätzliche historische Wahrheit. Bootstrap
ordnet vorhandene Jahresrecords neu, Regime-Signale beschriften oder glätten
Policyzustände, ein Tail-Overlay ergänzt konfigurierte Szenarien und CAPE
verändert erwartete Renditeannahmen. Backtest, Sweep und Auto-Optimize werten
diese Modellwelt aus. Wenn Datenraum, Rekonstruktion oder gemeinsame
Generatorannahme verzerrt sind, kann jeder nachgelagerte Pfad technisch
korrekt und dennoch fachlich irreführend sein.

Sampler- und Worker-Parität belegen Reproduzierbarkeit, nicht statistische
Eignung. IID-Sampling verwirft zeitliche Abhängigkeit; Blockverfahren setzen
vertretbare Stationarität und Blockwahl voraus; kein Verfahren erfindet einen
historisch nicht vorhandenen Extremtyp. Regimebegriffe dürfen nicht den
Eindruck eines geschätzten Markov- oder Volatilitätsmodells erwecken, wenn sie
aus festen Schwellen stammen. Tail-Häufigkeit und -Höhe sind ohne gemeinsame
Kalibrierung Szenarioparameter, keine geschätzten Eintrittswahrscheinlichkeiten.

CAPE-Zusammenhänge liegen typischerweise auf langen Horizonten und in einem
bestimmten Datenraum. Eine jährliche Suite-Policy mit Glättung, Grenzen und
Fallbacks ist deshalb separat gegen eine konstante Baseline zu prüfen.
Backtests bleiben auch bei sauberer Chronologie von Auswahl, Datenrevisionen
und Trialhistorie abhängig. Ein Optimizer-Train/Test-Split mit getrennten
Seeds bleibt innerhalb desselben historischen Korpus und Generators; häufige
Nutzerläufe können das angezeigte Testset zudem faktisch wieder in Entwicklung
verwandeln.

### E.4.3 Langlebigkeit, Rente und Pflege

MAP-14 bis MAP-17 verbinden Haushaltsinputs mit populationsbezogenen Daten.
Eine Periodensterbetafel beschreibt nicht automatisch die künftige Kohorte
oder eine konkrete Person. Joint-Life-Logik, Quantil und Puffer sind
Vorsichtsentscheidungen; zu kurze und zu lange Horizonte haben asymmetrische
Folgen für heutigen Konsum und spätere Deckung. Für V6 müssen Alter,
Partnerkonstellation, reale Unterlagen und gewählte Sicherheitsziele zum Fall
passen.

Renten- und Witwenbeträge sind Szenarioinputs. Amtliche Zeitreihen tragen den
Populations- und Rechtskontext, ersetzen aber weder individuellen Bescheid
noch aktuelle Prüfung von Beginn, Abschlägen, Besteuerung, Sozialabgaben oder
Hinterbliebenenanspruch. Ergebnisse müssen Brutto-/Nettoannahme und
Indexierung offenlegen.

Beim Pflegeprozess sind Bestand, Eintritt, Übergang, Dauer, Versorgungsform,
Kosten, Leistung und Mortalität getrennte Größen. Eine Bestandsstatistik darf
nicht still als jährliche individuelle Eintrittsrate verwendet werden. Der
Pflegebucket ändert daran nichts: Er steuert nur, wann ein separierter Betrag
verfügbar wird. Ohne gemeinsame Kalibrierung und Opportunitätskostenvergleich
ist er eine transparente Selbstversicherungs-Policy, keine Bedarfs- oder
Versicherungsprognose.

| Mechanismus und Status | Quellenbefund und Suite-Abweichung | Lokaler Nachweis und offene Prüfung |
| --- | --- | --- |
| [MAP-01](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-01) real konstanter Floor – **adaptiert** | Bengen ist Methodenursprung, internationale Daten und deutscher VPI sind T2/T4 beziehungsweise T3. Suite-Steuer, Rente, Gold, Liquidität und Erfolgsdefinition weichen ab; es entsteht keine universelle sichere Rate. | V1–V3 prüfen Jahrespfad und Aggregation. V4/V5 offen: Datenprovenienz, internationale Teilperioden, Kosten-/Steuersensitivität und Shortfalltiefe. |
| [MAP-02](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-02) Floor-Flex – **adaptiert** | Flexible Entnahme und Lifecycle-Forschung tragen nur das Strukturprinzip T2. Prioritäten, Flex-Kürzung, Alarmreihenfolge und deutsche Cashflows sind suiteeigene Policies; Literatur-Nutzenwerte werden nicht übertragen. | V1–V3 prüfen Budget und Pfadparität. V4/V5 offen: identische Daten-/Seed-Vergleiche, Konsumkürzungsverteilungen und externe Präferenzgewichte. |
| [MAP-03](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-03) Guardrails/Recovery – **adaptiert, Schwellen heuristisch** | Guyton/Klinger und institutionelle Vergleiche sind T2, aber Suite-Trigger kombinieren Entnahmequote, Inflation, Drawdown, CAPE, Runway und Recovery anders. Namensähnlichkeit ist keine Replikation. | V1–V3 prüfen Reihenfolge und Determinismus. V4/V5 offen: Reproduktionsbenchmark, Schwellenstabilität, Kosten und gehaltene Out-of-sample-Daten. |
| [MAP-04](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-04) `minimumFlexAnnual` – **heuristisch** | Konsum-, Floor-/Upside- und Mental-Accounting-Quellen sind T2/T3; keine Quelle begründet den konkreten Mindestbetrag. Der Wert ist eine Nutzerpräferenz unter Notbremsen, kein Sicherheitsfloor. | V1–V3 prüfen Validierung und Notbremsen. V5/V6 offen: Präferenzstudie, Kürzungsakzeptanz und Haushaltsunterlagen; niemals still begrenzen. |
| [MAP-05](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-05) Dynamic Flex/VPW – **adaptiert** | Annuitätenrechnung, US-RMD und Community-VPW haben verschiedene Rollen T1 bis T3. Suite-CAPE, EMA, Clamps, Floor/Flex und Langlebigkeitshorizont bilden eine eigene Policy; VPW ist nicht pauschal risikosenkend. | V1–V3 prüfen Formel und Runner-Parität. V4/V5 offen: Return-/Horizon-Sensitivität, internationale Holdouts und Konsum-/Nachlass-Trade-offs. |
| [MAP-06](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-06) Runway/3-Bucket – **heuristisch** | Sequenzrisiko und Asset-Allokation sind T2, Bucket-Forschung liefert auch T4-Gegenbefunde. Operative Liquiditätssteuerung und Bond-Verkaufsreihenfolge belegen keinen Rendite- oder Sicherheitsvorteil. | V1–V3 prüfen Refill und Transaktionen. V4/V5 offen: Ablation bei gleicher Gesamtallokation, Kosten, Rebalancing und Liquidität. |
| [MAP-07](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-07) Gold – **heuristisch** | Hedge-, Safe-Haven- und Diversifikationsbefunde sind zeit-, markt- und währungsabhängig T2/T4. Feste Goldquote, Floorquote und Stresspfad sind keine Literaturparameter. | V1–V3 prüfen Bestände und Parität. V4/V5 offen: EUR-Datenprovenienz, Teilperioden, gemeinsame Krisen und Ablation gegen Aktien/Bonds/Cash. |
| [MAP-08](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-08) IID-/Block-/Stationary-Bootstrap – **adaptiert** | Bootstrap-Methoden sind T1/T2; Stationarität, Blocklänge, Randbehandlung und enge Historie bleiben T4. Resampling erzeugt keine neuen historischen Extremtypen. | V1–V3 prüfen Seed und Worker-Parität. V4/V5 offen: Abhängigkeitsdiagnostik, Blocklängen-Sensitivität und breitere Daten. |
| [MAP-09](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-09) Regime-Signale – **heuristisch** | Markov-, ARCH-/GARCH- und stylized-facts-Quellen sind T4-Prüfmaßstab. Suite-Zustände und Severities sind Policylabels, kein statistisch geschätztes Regime- oder Volatilitätsmodell. | V1–V3 prüfen Signalgrenzen. V4/V5 offen: Schwellenstabilität, Persistenz, Fehlklassifikation und Vergleich mit einfacheren Baselines. |
| [MAP-10](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-10) Tail-Overlay – **experimentell** | Heavy-Tail-Befunde und Stress-Governance begründen T2/T4-Szenarien, nicht die konkrete Schockrate, Höhe oder Dauer. Skip-Regeln verhindern nur ausgewählte Doppelüberlagerungen. | V1–V3 prüfen Seed, Ereignisplan und Parität. V4/V5 offen: gemeinsame Asset-/Makroschocks, Kalibrierung, Doppelzählung und Challenge-Protokoll. |
| [MAP-11](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-11) CAPE-Policy – **heuristisch** | Langfristige Bewertungsrelationen sind T2; Out-of-sample-Gegenbefunde und US-Datenraum sind T4. Jährliche EMA-/Clamp-Returnwerte und Fallbacks sind suiteeigene Policies. | V1–V3 prüfen Kontinuität und Fallback. V4/V5 offen: internationale/zeitliche Holdouts, Horizontabgleich und konstante Baseline. |
| [MAP-12](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-12) Backtest – **etabliert als Diagnoseverfahren** | Chronologische Historienprüfung ist anerkannt, aber Data-Snooping, Survivorship, Easy-Data-Bias und Trialauswahl sind T4. Der Lauf bleibt In-sample und keine Zukunftsvalidierung. | V1–V3 prüfen Chronologie und Aggregation. V4 offen: Return-Manifest, Look-ahead-Audit, vollständiges Trial-Inventar und unangetastete Daten. |
| [MAP-13](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-13) Sweep/Auto-Optimize – **experimentell** | Suchverfahren ordnen Kandidaten innerhalb eines Nutzerraums; Mehrfachtests und Backtest-Overfitting sind T4. Getrennte Seeds aus demselben Generator bilden keinen unabhängigen Markt-Holdout. | V1–V3 prüfen Sampling, Constraints und Champion-Shape. V4/V5 offen: Trial-Logging, nested Holdouts, Stabilitätsintervalle und unveränderte Baseline. |
| [MAP-14](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-14) Single-/Joint-Life-Horizont – **adaptiert** | Lebensdauertheorie und Periodensterbetafel sind T2/T3; Kohortenunterschiede sind T4. Quantil, Joint-Konstruktion und Puffer sind keine individuelle Lebensdauerprognose. | V1–V3 prüfen Monotonie und Pfadweitergabe. V4/V5 offen: Kohorten-/Verbesserungsszenarien, Partnerabhängigkeit und asymmetrische Horizonfehler. |
| [MAP-15](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-15) Rente/Witwenanteil – **adaptiert** | Amtliche Populations- und Rentenreihen liefern T3/T4-Kontext, keine Individualleistung. Eingabebetrag, Indexierung und Witwenquote ersetzen weder Bescheid noch Rechts-, Steuer- oder Abgabenprüfung. | V1–V3 prüfen Cashflow und Todespfad. V5/V6 offen: aktuelle Unterlagen, Brutto/Netto-Vertrag und externe Anspruchsprüfung. |
| [MAP-16](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-16) Pflegeprozess – **heuristisch** | Deutsche Bestände und Leistungen sind T3/T4; Bestände sind keine individuellen Eintritts- oder Übergangsraten. Dauer, Progression, Kosten und Mortalität sind nicht gemeinsam extern kalibriert; der PD-02-Einheitenpfad ist korrigiert, aber nicht extern kalibriert. | V1–V3 prüfen Zustände, Einheiten und Aggregation. V4/V5 offen: getrennte Quellenketten, Übergänge, Dauer, Versorgung, Kosten, Leistungen und Tod auf dem korrigierten Einheitenvertrag. |
| [MAP-17](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-17) Pflegebucket – **experimentell** | Mental Accounting, Selbstversicherung und Pflegekontext sind T2 bis T4. Algorithmische Zweckbindung ist weder Versicherung noch vollständiges Liability Matching; Höhe und Trigger sind nicht extern validiert. | V1–V3 prüfen Carve-out, Trigger und KPIs. V4/V5 offen: gleiche Gesamtvermögen, Leistungen, Cash-Opportunitätskosten, Steuer und Alternativregeln. |

### E.4.4 Mechanismen gemeinsam bewerten

Ein Mechanismusvergleich muss vorab angeben, was unverändert bleibt und
welche Zielgröße entscheiden darf. Werden beispielsweise CAPE-Policy,
Guardrails und Bucket-Regel gleichzeitig geändert, ist ein Ergebnisdelta
keinem Einzelmechanismus zurechenbar. Für kausal engere Aussagen sind
Einzelfaktor-Ablationen, anschließend vorab definierte Interaktionen und
schließlich ein unveränderter Gesamtvergleich nötig. Negative oder instabile
Ergebnisse gehören zum Nachweis und dürfen nicht durch nachträgliche Auswahl
von Seeds, Startjahren oder Kennzahlen verschwinden.

Auch Statuswerte dürfen nicht über Mechanismen hinweg zu einem Gesamtscore
addiert werden. `adaptiert` kann für einen klaren Methodenursprung mit großer
Suite-Abweichung stehen; `heuristisch` kann technisch sehr gut getestet, aber
extern unkalibriert sein. Entscheidend sind konkrete offene Prüfungen und die
Frage, ob eine Aussage V1–V3, V4, V5 oder V6 beansprucht. Das vollständige
Dossier bleibt bei jeder Änderung der Kurzzeile maßgeblich.

Querwirkungen sind besonders bei gemeinsam genutzten Größen zu protokollieren:
Inflation beeinflusst Floor, Rente, reale Ergebniswerte und Pflegekosten;
Langlebigkeit verändert VPW und Pflegeexposition; Liquiditätsregeln verändern
Verkaufszeitpunkt und damit Steuern. Ein Test eines Einzelmoduls reicht für
solche Ketten nicht. Die behauptete Wirkung muss bis zu allen betroffenen
Ergebnissen und Runnerpfaden verfolgt werden, bevor eine Mechanismuszeile oder
ein Risikostatus geändert wird.

## E.5 Ergebnisinterpretation jenseits der Erfolgsquote

Die Erfolgsquote zeigt nur, ob der implementierte binäre Floor-Deckungsbruch
im Lauf ausblieb. Zwei Policies sind nur unter identischen Daten, Seeds,
Horizonten, Haushaltsinputs, Kosten- und Steuerannahmen vergleichbar. Ein
höherer Erfolgsanteil bei häufigeren Flex-Kürzungen ist ein Trade-off; höheres
Endvermögen kann aus zu niedriger Entnahme stammen.

| Dimension | Heute zulässige Aussage | Offene Mess- oder Vertragsgrenze |
| --- | --- | --- |
| Floor-Verletzung | `failCount`, Erfolgsquote und `isRuin` beschreiben den implementierten Deckungsbruch. | Vollständige Verteilung von Höhe, Dauer und kumulierter realer Lücke fehlt. |
| Konsumkürzung | Kürzungsjahre, maximale Flex-Kürzung, Jahre ohne Flex und der auf das erste Simulatorjahr deflationierte Consumption-at-Risk zeigen modellierte Einschränkungen. | Individuelle Akzeptanz- oder Nutzengewichte und eine vollständige reale Konsumlückenverteilung fehlen. |
| Stressdauer | Stress-Kürzungsjahre und `recoveryYears` gelten für das gewählte Preset. | Keine allgemeine Regime-Verweildauer oder vollständige Erholungsverteilung. |
| Nachlass/Restvermögen | P10/P50/P90 und Median erfolgreicher Läufe beschreiben modelliertes aktives Endvermögen. | Kein Nachlassziel und keine vollständigen externen Assets, Immobilien-, Versicherungs- oder Pflegebucketwerte. |
| Steuerlast | Median kumulierter Modellsteuern und Verlusttopf-Effekt gelten für den implementierten Settlement-Vertrag. | Keine vollständige Einkommensteuer-, Sozialabgaben-, Rechts- oder Kostenlogik. |
| Liquidität | Runway, Mindest-/Zielwerte und Logs zeigen operative Cash-Deckung. | Keine einheitliche Monte-Carlo-Verteilung von Tiefe und Dauer aller Unterschreitungen. |
| Pflegewirkung | Eintritt, Pflegejahre, Kosten, Shortfall- und Bucket-KPIs vergleichen Modellpfade. | Keine extern kalibrierte Wahrscheinlichkeit oder kausale Gegenfaktualität bei gemeinsamem Pfad. |

Für die Auswertung gilt eine feste Reihenfolge: zuerst Contract- und
Validierungsfehler ausschließen, danach Floor-Lücken und Liquidität prüfen,
anschließend Konsumkürzung, Steuer, Pflegewirkung und Restvermögen gemeinsam
lesen. Erst dann dürfen Policies verglichen werden. Ein Median ohne
Tailverteilung oder ein Endvermögen ohne konsumierte Leistungen genügt nicht.
Reale und nominale Größen sowie Prozent- und Verhältniswerte müssen dabei
vertragstreu getrennt bleiben. PD-01 ist durch den kumulierten Simulator-State
behoben; PD-02 durch die einmalige In-memory-Normalisierung an DOM- und
Profilgrenze. Aussagen zur Eignung von Pflegeparametern bleiben dennoch durch
MR-07 und FR-10 begrenzt.

## E.6 Forschungs- und Modellrisiken

`hoch` bedeutet: Ohne zusätzliche V5-Prüfung darf keine Wirksamkeits- oder
Parametereignung behauptet werden. Die IDs vertiefen MR-01 bis MR-12 und
bleiben bis zu einem dokumentierten Nachweis offen.

| ID | Priorität | Risiko und Fehlinterpretation | Erforderliche Behandlung |
| --- | --- | --- | --- |
| FR-01 | hoch | Verkürzter Safe-Withdrawal-Kontext macht Suite-Erfolg zur universellen Rate. | Horizont, Assetset, Daten, Kosten/Steuer und Erfolgsbegriff immer mitführen. |
| FR-02 | hoch | Enge oder rekonstruierte Historie erscheint marktübergreifend. | Datenprovenienz, geschätzte Jahre, Teilperioden und internationale Daten getrennt prüfen. |
| FR-03 | hoch | Unvollständige Kosten-, Steuer- und Rechtslogik überschätzt Entnahmefähigkeit. | Sensitivitäten und externe Rechtsprüfung; MR-03/MR-05 sichtbar halten. |
| FR-04 | mittel | Samplername wird mit passender Stationarität und Blockwahl verwechselt. | Abhängigkeit, Block-/Filter-Sensitivität und Alternativmodelle vergleichen. |
| FR-05 | mittel | Policyzustände klingen wie geschätzte Marktregime. | Labels als Heuristik führen und Schwellenstabilität vorab testen. |
| FR-06 | hoch | Tail-Eventrate wird zur Crashwahrscheinlichkeit und Schocks werden doppelt gezählt. | Nur Szenarioaussage; gemeinsame Schocks und Doppelzählung challengen. |
| FR-07 | hoch | CAPE-Horizont-, Datenraum- und Forecast-Mismatch wird übersehen. | Internationale/zeitliche Holdouts und konstante Baseline verwenden. |
| FR-08 | hoch | Unbekanntes Trial-Universum macht den Champion scheinbar robust oder optimal. | Alle Trials loggen, locked/nested Holdouts, Stabilitätsintervalle und Baseline. |
| FR-09 | hoch | Perioden-/Kohorten- und Joint-Life-Fehler wirken wie individuelle Prognose. | Verbesserungs-/Kohortenszenarien, Quantilsensitivität und Partnerabhängigkeit. |
| FR-10 | hoch | Unkalibrierte Pflegeübergänge, Kosten und Drift wirken individuell prognostisch. | Quellenketten je Parameter, Kalibrierung und Sensitivität auf dem korrigierten PD-02-Einheitenvertrag. |
| FR-11 | mittel | Bucket- oder Goldwirkung wird mit Allokationseffekt vermischt. | Ablation bei gleicher Allokation, Kosten, Rebalancing und Liquidität. |
| FR-12 | hoch | Erfolgsquote verdeckt Konsumkürzung, Liquiditätsstress oder Nachlasslücke. | Ergebnisbündel aus E.5 nutzen und Shortfalltiefe/-dauer entwickeln. |

## E.7 Priorisierte Forschungsfragen

Die zehn Fragen sind im
[Forschungsvalidierungs-Backlog](../internal/FORSCHUNGSVALIDIERUNGS_BACKLOG.md)
in getrennte Folgevorhaben mit Eingangsgates, Owner-Rollen, Mindestnachweisen,
Abbruchkriterien und Ergebnisartefakten zerlegt. Alle Pakete stehen auf FV0
und bleiben offen; ihre Planung ist kein Wirksamkeitsnachweis.

| ID | Priorität | Frage | Mindestnachweis für eine belastbarere Aussage |
| --- | --- | --- | --- |
| FQ-01 | 1 | Wie ändern definierte Return-Indizes, Kosten und internationale Daten die Entnahmeergebnisse? | Datenmanifest, Kostenvertrag und vorab definierte Länder-/Teilperiodenläufe. |
| FQ-02 | 1 | Welche Guardrail-/VPW-/CAPE-Verbesserungen halten auf unangetasteten Daten und Seeds? | Baseline, vollständiges Trial-Log und zeitlich/länderweise Holdouts. |
| FQ-03 | 1 | Wie oft, tief und lange werden Floor, Flex und Runway verletzt? | Verteilungen für Shortfall, Kürzung und Liquiditätslücke. |
| FQ-04 | 1 | Welche deutschen Quellen tragen Pflegeeintritt, Übergang, Dauer, Kosten, Leistungen und Mortalität? | Getrennte Parameterherkunft und Rekalibrierung auf dem korrigierten PD-02-Einheitenvertrag. |
| FQ-05 | 2 | Welche Bootstrap-Blocklänge und Filter passen zu den Jahresdaten? | Abhängigkeitsdiagnostik, Sensitivitätsband und Samplervergleich. |
| FQ-06 | 2 | Wie lässt sich Tail-Stress ohne inkonsistente oder doppelte Schocks formulieren? | Kalibrierte gemeinsame Szenarien, Challenge-Protokoll und Anti-Doppelpessimismus-Test. |
| FQ-07 | 2 | Verbessert die CAPE-Policy Ergebnisse außerhalb der Entwicklungsdaten? | Internationale/zeitliche Out-of-sample-Studie mit konstanter Baseline. |
| FQ-08 | 2 | Welchen eigenständigen Effekt haben Gold-, Runway-, Bond- und Pflegebucket-Regeln? | Ablation mit gleicher Gesamtallokation und Opportunitätskosten. |
| FQ-09 | 2 | Wie sensitiv ist Dynamic Flex auf Kohortenmortalität, Joint-Life und Quantil? | Perioden-/Kohorten-/Verbesserungsszenarien und asymmetrische Horizonfehler. |
| FQ-10 | 3 | Welche Konsum- und Nachlass-Trade-offs akzeptieren die tatsächlichen Nutzer? | Dokumentierte Präferenzen oder Nutzwertgewichte statt Portfolio-KPIs allein. |

## E.8 Mindeststandard und Ergebnisstand

Vor Aussagen wie „verbessert Robustheit“, „senkt Risiko“ oder „optimiert
Entnahmen“ müssen mindestens Baseline, Datenmanifest, Kosten- und
Steuervertrag, vollständiges Trial-Universum, Holdout-Regel, Seeds, das
Ergebnisbündel aus E.5 sowie negative und instabile Resultate dokumentiert
sein. Ohne diesen Nachweis sind Formulierungen auf „implementiert“, „technisch
getestet“, „im gewählten Szenario beobachtet“ oder „experimentell“ begrenzt.

Frühere konkrete Kitces-/Morningstar-Zahlen zu Einkommensrückgang, sicherer
Entnahmerate oder Risikoreduktion bleiben entfernt, solange kein
reproduzierbarer Suite-Lauf und kein vollständiger Quellenkontext vorliegen.
Floor-Flex wird nicht mit Guyton-Klinger gleichgesetzt; implementierter
Bootstrap, Regime-Signal, CAPE-Policy oder Tail-Overlay gelten nicht allein
wegen ihrer Existenz als extern kalibriert. Für einen Pflegebucket wird keine
normativ richtige Vermögenshöhe behauptet.

Der Forschungsrahmen enthält damit eine kompakte Einordnung von MAP-01 bis
MAP-17, die mehrdimensionale Ergebnisinterpretation, FR-01 bis FR-12 und
FQ-01 bis FQ-10. Alle offenen V4-/V5-Prüfungen bleiben bestehen. Vollständige
Quellen- und Dossierdetails stehen im
[normativen Forschungs-Evidenzregister](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md);
Priorität, Startgates und gesperrte Wirksamkeitsaussagen im
[internen Forschungsvalidierungs-Backlog](../internal/FORSCHUNGSVALIDIERUNGS_BACKLOG.md).

---

# Appendix: Modul-Inventar

*Hinweis: Dieser Appendix ist eine konzeptionelle Modulkarte und keine
vollständige Datei- oder LOC-Baseline. Seine Auswahl überschneidet sich mit den
spezialisierten Modul-READMEs; für aktuelle Dateizahlen und veränderliche
Detailinventare gelten ausschließlich die Komponenten- und B.1-Übersicht samt
Ermittlungsweg sowie die jeweils zuständige Spezialreferenz.*

## Engine-Module (Auswahl)

| Modul/Gruppe | Funktion |
|--------------|----------|
| `core.mjs` | Orchestrierung, EngineAPI, Input-Normalisierung, Dynamic-Flex/VPW, Steuer-Settlement-Anbindung |
| `config.mjs` | Zentrale Konfiguration für Schwellenwerte, Profile, Texte, Spending-Modell und Build-ID |
| `errors.mjs`, `index.mjs` | Fehlerklassen und Bundle-/ESM-Entry |
| `validators/InputValidator.mjs` | Plausibilisierung von Jahresinputs, Dynamic-Flex-Feldern und persistiertem Steuerzustand |
| `analyzers/MarketAnalyzer.mjs` | Marktregime, Drawdown, Stagflation und CAPE-Erwartungsrendite |
| `planners/SpendingPlanner.mjs` + Policy-Module | Entnahmeplanung aus State, Alarm, Flex-Rate, Guardrails, Flex-Budget, finalen Rate-Limits und Diagnose |
| `transactions/TransactionEngine.mjs` + `transaction-*` | Ziel-Liquidität, Runway-/Floor-Notfüllung, opportunistisches Rebalancing, Surplus-Investments |
| `transactions/sale-engine.mjs` | Steuerbewusste Verkäufe, Tranchenreihenfolge, Rohaggregate für Settlement |
| `transactions/three-bucket-logic.mjs` | 3-Bucket-Jilge: Bond-Erkennung, Bond-Verkauf in schlechten Jahren, Bond-Refill in guten Jahren |
| `tax-settlement.mjs` | Finale Jahressteuer mit Verlustvortrag, Sparer-Pauschbetrag und `taxState.lossCarry` |

## Simulator-Module (Cluster)

| Cluster | Zentrale Module | Funktion |
|---------|-----------------|----------|
| Bootstrap/UI-Fassade | `simulator-main.js`, `simulator-main-init.js`, `simulator-main-tabs.js`, `simulator-main-input-persist.js` | App-Start, Button-/Tab-Verdrahtung, Eingabepersistenz, Engine-Handshake |
| Fach-UI | `simulator-ui-pflege.js`, `simulator-ui-rente.js`, `simulator-main-accumulation.js`, `simulator-main-dynamic-flex.js`, `simulator-main-3bucket.js`, `simulator-main-stress.js` | Pflege-, Renten-, Anspar-, VPW-, 3-Bucket- und Stress-Konfiguration |
| Input-Mapping | `simulator-input-*.js`, `simulator-profile-inputs.js` | DOM-/Profildaten in strukturierte Simulator-Inputs übersetzen |
| Portfolio/Tranchen | `simulator-portfolio*.js`, `simulator-year-portfolio.js`, `simulator-portfolio-tranches.js` | Startportfolio, Detailtranchen, Aktien/Gold/Bonds, Renditefortschreibung und Verkäufe |
| Jahressimulation | `simulator-engine-direct.js`, `simulator-engine-wrapper.js`, `simulator-engine-input.js`, `simulator-household-pension.js`, `simulator-accumulation-year.js`, `simulator-health-bucket.js`, `simulator-year-result.js` | Engine-Aufruf je Jahr, Rente/Witwenlogik, Ansparphase, Pflegebucket, Ergebnis- und Logshape |
| Nachsteuerung | `simulator-forced-sale.js`, `simulator-tax-recompute.js`, `simulator-bond-refill.js` | Forced Sales, Steuer-Recompute nach Zusatzverkäufen, 3-Bucket-Bond-Refill |
| Monte Carlo | `simulator-monte-carlo.js`, `monte-carlo-runner.js`, `mc-*.js`, `monte-carlo-aggregates.js`, `scenario-analyzer.js` | Runs, Sampling, Life-State, Stressmetriken, Logs und Aggregation |
| Backtest/Sweep/Optimize | `simulator-backtest.js`, `simulator-sweep.js`, `sweep-runner.js`, `simulator-heatmap.js`, `auto_optimize*.js`, `simulator-visualization.js` | Historische Pfade, Sensitivitätsraster, Heatmaps, Optimierung, Pareto/Sensitivity |
| Ergebnisdarstellung | `simulator-results.js`, `results-metrics.js`, `results-renderers.js`, `results-formatting.js`, `simulator-main-helpers.js` | KPI-Karten, Szenario-/Backtest-Logs, CSV/JSON-Export, Tabellenformatierung |
| Daten/Utilities | `simulator-data.js`, `simulator-utils.js`, `cape-utils.js` | Historische Daten, Pflege-/Mortalitätsdaten, Stress-Presets, RNG/Statistik, CAPE-Auswahl |

## Worker-Module (3)

| Modul | Funktion |
|-------|----------|
| `worker-pool.js` | Worker-Lifecycle, Chunking |
| `mc-worker.js` | Monte-Carlo Worker-Thread |
| `auto-optimize-worker.js` | Optimizer-Worker |

## Balance-App Module (Auswahl)

| Modul | Funktion |
|-------|----------|
| `balance-main.js` | Orchestrierung, Update-Zyklus |
| `balance-reader.js` | DOM-Input-Lesung |
| `balance-health-bucket.js` | Pflegebucket-Diagnose, freie vs. gesperrte Liquidität, diagnostic-only Policy |
| `balance-storage.js` | PersistenceFacade-Anbindung, Snapshot-Archiv, Legacy-Migration |
| `balance-expenses.js` | Ausgaben-Check mit CSV-Import, Budget-Tracking |
| `balance-guardrail-reset.js` | Auto-Reset bei kritischen Änderungen |
| `balance-annual-*.js` | Jahresabschluss, Inflation, Marktdaten |
| `balance-diagnosis-*.js` | Chips, Entscheidungsbaum, Guardrails, VPW-Keyparams |

## Profil- und Tranchen-Module (Auswahl)

| Modul | Funktion |
|-------|----------|
| `profile-storage.js` | CRUD, Export/Import, Registry-Management |
| `profile-manager.js` | UI-Facade für Profilverwaltung |
| `profilverbund-balance.js` | Multi-Profil-Aggregation, Entnahme-Verteilung |
| `depot-tranchen-status.js` | Aggregation, UI-Sync, Status-Badge |
| `types/tranche-contract.js` | Kanonisches Schema, Klassifikation, Migration und Validierung |
| `tranche-reconciliation.js` | Vorschau und bestaetigte idempotente Realbestandsfortschreibung |
| `balance-main-profile-sync.js` | Cross-App-Synchronisation |

## Tauri Desktop-App (Kern-Dateien, Auswahl)

| Datei | Sprache | Funktion |
|-------|---------|----------|
| `src-tauri/src/main.rs` | Rust | Desktop-Eintragspunkt |
| `src-tauri/src/lib.rs` | Rust | Tauri-Bindings |
| `src-tauri/tauri.conf.json` | JSON | App-Konfiguration (Fenster, Permissions) |
| `src-tauri/Cargo.toml` | TOML | Rust-Abhängigkeiten |

**Output unter Windows:** `RuhestandSuite.exe`; Dateigröße und ausgelieferter
Buildstand sind releaseabhängig und keine Architekturkennzahl.

## Kernalgorithmen

1. **Floor-Flex-Guardrails** (`SpendingPlanner.mjs`)
2. **7-Regime-Klassifikation** (`MarketAnalyzer.mjs`)
3. **Per-Run-Seeding** (`simulator-utils.js:makeRunSeed`)
4. **Block-Bootstrap** (`monte-carlo-runner.js:sampleNextYearData`)
5. **Worker-Pool mit adaptivem Chunking** (`worker-pool.js`)
6. **Pflegegrad-Progression** (`simulator-data.js:PFLEGE_GRADE_PROGRESSION_PROBABILITIES`)
7. **Mehrphasige Auto-Optimize-Pipeline** (`auto_optimize.js`, `auto-optimize-sampling.js`)
8. **Steuerorientierte Verkaufsreihenfolge** (`sale-engine.mjs:getSellOrder`)
9. **Wealth-Adjusted Reduction** (`SpendingPlanner.mjs`)
10. **Flex-Budget-System** (`SpendingPlanner.mjs`)
11. **Flex-Share S-Curve** (`SpendingPlanner.mjs`)
12. **FILTER/RECENCY Sampling** (`monte-carlo-runner.js`)
13. **Ansparphase-Logik** (`simulator-engine-direct.js`, `simulator-main-accumulation.js`)
14. **Renten-Indexierung** (`simulator-portfolio-pension.js:computeRentAdjRate`)
15. **Witwenrente** (`monte-carlo-runner.js:widowBenefitActive`)
16. **Great Depression/WWII Stress-Presets** (`simulator-data.js`)
17. **Latin Hypercube Sampling** (`auto-optimize-sampling.js:latinHypercubeSample`)
18. **Historischer Backtest** (`simulator-backtest.js:runBacktest`)
19. **Profilverbund-Aggregation** (`profilverbund-balance.js:aggregateProfilverbundInputs`)
20. **Tranchen-FIFO-Selektion** (`profilverbund-balance.js:selectTranchesForSale`)
21. **Multi-Objective-Optimierung** (`simulator-optimizer.js:findBestParametersMultiObjective`)
22. **Constraint-Based-Optimierung** (`simulator-optimizer.js:findBestParametersWithConstraints`)
23. **Sweep-Heatmap-Rendering** (`simulator-heatmap.js:renderSweepHeatmapSVG`)
24. **Verlustverrechnungstopf** (`tax-settlement.mjs:settleTaxYear`) — Jahres-Settlement mit Verlustvortrag, SPB und Gesamt-Recompute
25. **P2-Invarianz-Prüfung** (`simulator-sweep-utils.js:areP2InvariantsEqual`)
26. **Ausgaben-Check CSV-Parser** (`balance-expenses-csv.js:parseCategoryCsv`)
27. **Median-basierte Hochrechnung** (`balance-expenses-metrics.js:computeYearStats`)
28. **VPW-Annuitätenformel** (`core.mjs:_berechneEntnahmeRate`)
29. **CAPE-basierte Realrendite mit EMA-Glättung** (`core.mjs:_calculateExpectedRealReturn`)
30. **Sterbetafel-Horizont (Single/Joint, Mean/Quantil)** (`simulator-engine-helpers.js`)
31. **Dynamischer MC-Horizont pro Simulationsjahr** (`monte-carlo-runner.js:computeDynamicFlexHorizonForYear`)
32. **Kontinuierliche Regime-Signale** (`regime-signals.mjs:buildRegimeSignalSnapshot`)
33. **Kontinuierliche CAPE-Rendite-Policy** (`vpw-return-policy.mjs:deriveVpwExpectedRealReturn`)
34. **Konservative Langlebigkeitsanpassung** (`dynamic-flex-longevity-horizon.js`)
35. **Stationary-Bootstrap-Sampler** (`stationary-bootstrap-sampler.js:nextYearSample`)
36. **Tail-Risk-Ereignisplan und Overlay** (`tail-risk-overlay.js:createTailRiskSchedule`, `applyTailRiskOverlay`)

---

## Quellen

### Produktquellen des Marktvergleichs

*Abruf jeweils 2026-07-15. Die vollständigen stufenscharfen Quellenrecords
einschließlich Evidenzklasse, Fundstelle und Einschränkung stehen in D.12;
die folgenden Links sind die Einstiegspunkte der Stichprobe.*

- [ProjectionLab: Pricing & Subscriptions](https://projectionlab.com/pricing)
- [Boldin: Pricing](https://www.boldin.com/retirement/pricing/)
- [BVI: Rechner](https://www.bvi.de/service/rechner/)
- [Finanzfluss: Entnahmeplan-Rechner](https://www.finanzfluss.de/rechner/entnahmeplan/)
- [Digitale Rentenübersicht](https://www.rentenuebersicht.de/DE/01_startseite/home_node.html)
- [MoneyGuide](https://www.moneyguidepro.com/)
- [eMoney Pro](https://emoneyadvisor.com/products/emoney-pro/)
- [FI Calc Guide](https://guide.ficalc.app/)
- [FIRECalc 3.0](https://firecalc.com/)
- [Pralana Retirement Calculator](https://pralanaretirementcalculator.com/)

### Forschung und deutsche Referenzdaten

Das vollständige wissenschaftliche Korpus steht mit Quellenklasse,
Evidenzstufe, dauerhaftem Link, Aussagebeitrag und Übertragbarkeitsgrenze in
E.4. Es umfasst 55 Records aus peer-reviewter Original- und
Übersichtsliteratur, amtlichen beziehungsweise institutionellen Quellen,
Practitioner Research, einem Fachbuch und einem Community-Kontext sowie
deutschen Referenzdaten. E.5 ordnet diese Quellen 17 Suite-Mechanismen als
Mapping-Grundlage zu; E.9 bis E.11 führen den Abgleich aus. Diese zentrale
Record-Liste ersetzt die frühere unspezifische Linksammlung.

---

*Technische Dokumentation der Ruhestand-Suite. Algorithmusbeschreibungen sind
konzeptionell; konkrete Implementierungsdetails stehen in den genannten
Modulen und Tests. Dokumentstand: 2026-07-15, redaktionell integrierter
Abschlussstand für Architektur, Fachkonzept, Modellgrenzen, Marktvergleich und
wissenschaftliche Tiefeneinordnung.*
