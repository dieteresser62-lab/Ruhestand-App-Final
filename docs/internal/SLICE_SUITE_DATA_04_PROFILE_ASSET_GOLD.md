# Slice 04 - Verlustfreie Profilassets und Goldziele

**Stand:** 2026-07-26  
**Status:** freigegeben - Review durch Gemini am 2026-07-26 erfolgreich durchgeführt  
**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Reviewer:** Antigravity (Gemini)  
**GitHub-Status:** Branch nur lokal; Push nach Nutzerfreigabe  
**Uebergeordneter Plan:** [SUITE_DATENINTEGRITAET_HARDENING_PLAN.md](./SUITE_DATENINTEGRITAET_HARDENING_PLAN.md)

## Ziel und Findings

**Findings:** DAT-02 und DAT-03  
**Prioritaet:** P0/P1

Die Profilaggregation erhaelt jede belegte Assetklasse genau einmal oder blockiert sichtbar, wenn ein steuerlich belastbarer Herkunftsvertrag fehlt. Goldziel und Gold-Floor werden zuerst je Profil als Eurobetrag auf der frei investierbaren Profilbasis ermittelt und erst danach in eine rechenwegkompatible Haushaltsquote umgerechnet. Das aktuell aktive UI-Profil darf die Haushaltsstrategie bei unveraenderter Profilauswahl nicht beeinflussen.

## Fachentscheidungen D-04 und D-05

Der ausdrueckliche Nutzerauftrag `Implementiere Slice 04` vom 2026-07-26 wird gemaess der dokumentierten Projektpraxis als Freigabe fuer die im reviewten Hauptplan vorgeschlagenen Zielvertraege behandelt:

- **D-04 Hybridprofile:** Sobald mindestens ein Profil valide Detailtranchen liefert, wird ein weiteres Profil mit positiven Depot-/Geldmarkt-Aggregaten, aber ohne Detailtranchen fail-closed abgewiesen. Es werden keine synthetischen Simulator-Lots mit unbekannter Cost Basis oder TQF erzeugt. Profile mit explizit leerer Tranchenliste bleiben leer; Tagesgeld bleibt als separat provenienzfaehige Liquiditaet erhalten.
- **D-05 Goldstrategie:** Pro Profil wird die frei investierbare Basis aus den genau einmal reconciliierten Depot-, Gold- und operativen Liquiditaetswerten gebildet. Ein aktiver Pflegebucket wird hoechstens bis zur vorhandenen operativen Liquiditaet abgezogen. Profilziel und Profil-Floor entstehen als Eurobetrag `freieBasis * Profilquote`. Die Haushaltsquote entsteht ausschliesslich adapterseitig aus der Summe dieser Eurobetraege geteilt durch die summierte freie Haushaltsbasis.
- Ein aktives Goldprofil und ein inaktives Profil erzeugen damit kein auf die Goldprofile beschraenktes Prozentmittel. Im Referenzfall 100.000 EUR bei 8 Prozent plus 900.000 EUR ohne Goldstrategie betraegt das absolute Haushaltsziel 8.000 EUR und die abgeleitete Haushaltsquote 0,8 Prozent.

Diese Entscheidungen aendern keine Engine-Formel und fuehren keinen steuerlichen Aggregate-Fallback fuer den Simulator ein.

## Akzeptanzkriterien

- O-06 und O-07 sind gruen.
- Der O-06-Repro wird mit einem sichtbaren Hybridprofilfehler blockiert; weder 110.000 EUR noch 140.000 EUR werden als scheinbar vollstaendiges Haushaltsvermoegen ausgegeben.
- Detailtranchen eines Profils ersetzen keine Aggregate eines anderen Profils still.
- Detail-Geldmarkt und Aggregat desselben Profils werden nicht doppelt gezaehlt.
- `absent`, explizit `empty`, `valid` und `corrupt` bleiben getrennte Tranchenzustaende.
- Korrupte Details fallen nicht still auf Aggregate zurueck.
- Profile ohne Detailtranchen bleiben gemeinsam nutzbar, solange kein Hybrid mit Detailprofil entsteht.
- Goldziel im 100.000/900.000-EUR-Fall betraegt exakt 8.000 EUR.
- Ein aktiver Pflegebucket wird fuer die Goldbasis nur bis zur vorhandenen operativen Liquiditaet abgezogen.
- Goldziel, Gold-Floor und Golddiagnostik sind je Profil in Euro nachvollziehbar.
- Wechsel des aktiven Profils aendert bei gleicher Verbundauswahl weder Goldziel noch die daraus erzeugte Haushaltsaktion.
- Die Simulator-UI zeigt den konkreten Blocking-Grund und verwendet keine alten Profilverbund-Overrides weiter.

## Scope

### Programmdateien

- `app/profile/profile-asset-values.js`
- `app/simulator/simulator-profile-inputs.js`
- `app/simulator/simulator-portfolio-init.js`
- `app/simulator/simulator-main-profiles.js`
- `app/profile/profilverbund-balance.js`
- `app/balance/balance-main-profilverbund.js`

### Tests und Dokumentation

- `tests/profile-asset-values.test.mjs`
- `tests/simulator-multiprofile-aggregation.test.mjs`
- `tests/simulator-portfolio-tranches.test.mjs`
- `tests/profilverbund-profile-gold-overrides.test.mjs`
- `tests/profilverbund-balance.test.mjs`
- vorhandene Profilverbund-, Balance-Orchestrierungs- und Browsertests
- `docs/internal/SLICE_SUITE_DATA_04_PROFILE_ASSET_GOLD.md`
- `docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md`
- `README.md`
- `docs/reference/TECHNICAL.md`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/PROFILVERBUND_FEATURES.md`

## Nicht-Scope

- kein steuerlicher Fallback fuer unbekannte Cost Basis oder TQF im Simulator;
- keine Aenderung des kanonischen Legacy-Feldnamens `detailledTranches`;
- keine neue EngineAPI und keine Aenderung von Engine-Formeln;
- keine Korrektur der Partner-/Pflege-/Tail-Risk-Sweep-Pfade aus Slice 08;
- keine allgemeine Profilpersistenz-Recovery aus Slice 13/14;
- keine generierten Artefakte (`engine.js`, `dist/`, `RuheStandSuite.exe`).

## Branch- und Statuscheck vor Coding

Ausgefuehrt am 2026-07-26 vor Anlage dieser Slice-MD.

### `git branch --show-current`

```text
codex/suite-datenintegritaet-hardening
```

### `git status --short`

```text
```

Der Worktree war vor Anlage dieser Slice-MD sauber. Slice 03 als direkte Codeabhaengigkeit ist freigegeben und lokal committed.

## Diff-Risiko

```text
Geplante Dateien:
- app/profile/profile-asset-values.js
- app/simulator/simulator-profile-inputs.js
- app/simulator/simulator-portfolio-init.js
- app/simulator/simulator-main-profiles.js
- app/profile/profilverbund-balance.js
- app/balance/balance-main-profilverbund.js
- tests/profile-asset-values.test.mjs
- tests/simulator-multiprofile-aggregation.test.mjs
- tests/simulator-portfolio-tranches.test.mjs
- tests/profilverbund-profile-gold-overrides.test.mjs
- tests/profilverbund-balance.test.mjs
- docs/internal/SLICE_SUITE_DATA_04_PROFILE_ASSET_GOLD.md
- docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md

Voraussichtliche Aenderungstiefe:
- mittel

Gefaehrdete bestehende Tests:
- tests/simulator-multiprofile-aggregation.test.mjs
- tests/simulator-portfolio-tranches.test.mjs
- tests/profile-asset-values.test.mjs
- tests/profilverbund-profile-gold-overrides.test.mjs
- tests/profilverbund-balance.test.mjs
- tests/balance-ui-orchestration.test.mjs
- tests/browser-smoke.test.mjs

Nicht anfassen:
- engine/
- engine.js
- Tranchen-Steuer-/Settlement-Vertraege aus Slice 02
- Sweep-/Optimizer-Pfade
- dist/
- RuheStandSuite.exe

Rollback-Strategie:
- git checkout -- app/profile/profile-asset-values.js app/simulator/simulator-profile-inputs.js app/simulator/simulator-portfolio-init.js app/simulator/simulator-main-profiles.js app/profile/profilverbund-balance.js app/balance/balance-main-profilverbund.js tests/profile-asset-values.test.mjs tests/simulator-multiprofile-aggregation.test.mjs tests/simulator-portfolio-tranches.test.mjs tests/profilverbund-profile-gold-overrides.test.mjs tests/profilverbund-balance.test.mjs docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md
- Neue Slice-Datei nur nach ausdruecklicher Freigabe loeschen.
```

Es sind exakt sechs Programmdateien geplant. Damit greifen weder die allgemeine Stop-Regel von mehr als zehn Programmdateien noch das strengere Slice-Maximum von mehr als sechs. Asset- und Goldteil bleiben durch getrennte Helper/Tests reviewbar. Ein steuerlicher Aggregate-Fallback wird nicht eingefuehrt.

## Baseline- und Delta-Ledger

### Vorher-Vertrag

- Sobald irgendein Profil Detailtranchen besitzt, setzt der Simulator den Haushaltsbestand aus diesen Detailtranchen, allen Tagesgeldwerten und einem nur teilweise erhaltenen Geldmarkt-Aggregat zusammen.
- `initializePortfolioDetailed()` ignoriert dieses zusaetzliche Geldmarkt-Aggregat danach, sodass der O-06-Repro zunaechst 140.000 EUR und im Portfolio nur noch 110.000 EUR ausweist.
- Goldquoten werden nur ueber goldaktive Profile gemittelt. Ein 8-Prozent-Ziel auf 100.000 EUR wird dadurch als 8-Prozent-Haushaltsziel auf bis zu 1.000.000 EUR angewandt.
- Die Balance-Haushaltsstrategie behaelt Goldwerte aus dem aktiven DOM-/UI-Profil.
- Die Pflegebucket-Reserve wird vor der profilbezogenen Goldzielbildung nicht aus der Goldbasis entfernt.

### Erwartetes Delta

- Ein Hybrid aus Detail- und positiven Aggregatassets scheitert vor Portfolioinitialisierung mit stabilem Fehlercode und sichtbarer Profilangabe.
- Detailprofile, explizit leere Profile und reine Cashprofile reconciliieren deterministisch und ohne Doppelzaehlung.
- Goldziel und Gold-Floor besitzen absolute Haushalts- und Profilwerte sowie eine nachvollziehbare Basisdiagnostik.
- Simulator und Balance verwenden denselben Goldbasisvertrag.
- Der Profilreihenfolge-/Active-Profile-Wechsel aendert den absoluten Goldvertrag nicht.
- Snapshot-, Backtest-, Steuer- und FlowDelta-Ergebnisse duerfen ausserhalb der benannten Profilverbundfaelle nicht unerwartet abweichen.

## Geplante Tests und fachliche Orakel

- Red-State fuer O-06: Detailprofil mit 80.000 EUR plus 10.000 EUR Cash und Aggregatprofil mit 150.000 EUR Depot, 20.000 EUR Cash und 30.000 EUR Geldmarkt muss blockieren.
- Matrix: Details+Details, Details+Aggregate, Details+missing, Details+explizit leer, corrupt, Cash und Geldmarkt.
- O-07: 100.000 EUR bei 8 Prozent plus 900.000 EUR ohne Goldstrategie ergibt 8.000 EUR absolutes Ziel und 0,8 Prozent Haushaltsquote.
- Pflegebucket: Abzug nur aus vorhandener operativer Liquiditaet; absoluter Zielwert bleibt handberechenbar.
- Profilreihenfolge-/Primary-ID-Metamorphie fuer Ziel, Floor und Diagnose.
- Portfolioinitialisierung verwendet den absoluten Goldzielbetrag ohne erneute Prozentbasisdrift.
- Balance-Assetsummary und `updateProfilverbundGlobals()` uebernehmen denselben Haushaltsgoldvertrag.
- Fokussierte Tests:
  - `node tests/run-single.mjs tests/profile-asset-values.test.mjs`
  - `node tests/run-single.mjs tests/simulator-multiprofile-aggregation.test.mjs`
  - `node tests/run-single.mjs tests/simulator-portfolio-tranches.test.mjs`
  - `node tests/run-single.mjs tests/profilverbund-profile-gold-overrides.test.mjs`
  - `node tests/run-single.mjs tests/profilverbund-balance.test.mjs`
  - `node tests/run-single.mjs tests/balance-ui-orchestration.test.mjs`
- Pflichtgates:
  - `npm test`
  - `npm run test:browser`
  - `git diff --check`

## Durchgefuehrte Aenderungen

- `profile-asset-values.js` stellt mit `calculateProfileGoldStrategy()` einen gemeinsamen DOM-freien Vertrag bereit. Er normalisiert je Profil Assetbasis, operative Liquiditaet und Pflegebucket, berechnet freie Basis, Ziel/Floor in Euro sowie Haushaltsbasis, Adapterquoten, zielbetragsgewichtetes Band und Profildiagnostik.
- `simulator-profile-inputs.js` unterscheidet `absent`, explizit `empty`, `valid` und `corrupt`, baut je Profil genau einen Assetrecord und reconciliiert den Haushalt daraus. D-04 blockiert den steuerlich nicht belastbar darstellbaren Hybrid mit `SIMULATOR_PROFILE_ASSET_PROVENANCE_MISSING`; korrupte Details bleiben separat fail-closed.
- Die kombinierte Simulator-Goldstrategie enthaelt absolute Ziel-/Floorbetraege und per Profil nachvollziehbare Diagnostik. Der fruehere Mittelwert nur ueber goldaktive Profile sowie der spaetere globale Detailoverride wurden entfernt.
- `simulator-portfolio-init.js` priorisiert bei der aggregierten Portfolioinitialisierung den absoluten `goldZielBetrag` und kappt ihn auf das Investitionskapital. Damit wird das reconciliierte Ziel nicht erneut auf einer abweichenden Prozentbasis berechnet.
- `simulator-main-profiles.js` entfernt bei einem Blockierfall alte Profilverbund-Overrides und zeigt die konkreten profilbezogenen Warnungen.
- `profilverbund-balance.js` berechnet aus der detailbevorzugten Vermoegenssummary denselben Profil-Goldvertrag. `balance-main-profilverbund.js` uebernimmt dessen Haushaltsbasis, Ziel, Floor, Quote und Diagnostik in den Engine-/UI-Adapter statt Goldfelder des aktiven DOM-Profils beizubehalten.
- Die fachlichen Referenzen dokumentieren Hybridprovenienz, absolute Goldziele, Pflegebucket-Abzug und Active-Profile-Invarianz konsistent.

## Ausgefuehrte Tests

### Baseline vor Implementierung

- `tests/simulator-multiprofile-aggregation.test.mjs`: 51 Assertions, 0 Fehler.
- `tests/simulator-portfolio-tranches.test.mjs`: 27 Assertions, 0 Fehler.
- `tests/profile-asset-values.test.mjs`: 24 Assertions, 0 Fehler.
- `tests/profilverbund-profile-gold-overrides.test.mjs`: 19 Assertions, 0 Fehler.
- `tests/profilverbund-balance.test.mjs`: 112 Assertions, 0 Fehler.

### Red-State vor Implementierung

- `tests/simulator-multiprofile-aggregation.test.mjs`: erwarteter erster Fehler bei O-06; Hybridhaushalt liefert noch ein Objekt statt `combined=null` (`51/52` bis zum fail-fast Abbruch).
- `tests/simulator-portfolio-tranches.test.mjs`: erwarteter Fehler; Portfolioinitialisierung erzeugt 10.000 EUR aus der Quote statt des reconciliierten Absolutziels 8.000 EUR (`27/28`).
- Der Runner bricht testdateiintern beim ersten fehlgeschlagenen Assertion ab; O-07 und die nachfolgenden Matrixfaelle werden nach dem O-06-Fix vollstaendig ausgefuehrt.

### Fokussierte Tests nach Implementierung

- `node tests/run-single.mjs tests/simulator-multiprofile-aggregation.test.mjs`: 66 Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/simulator-portfolio-tranches.test.mjs`: 28 Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/profile-asset-values.test.mjs`: 31 Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/profilverbund-profile-gold-overrides.test.mjs`: 19 Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/profilverbund-balance.test.mjs`: 118 Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/balance-ui-orchestration.test.mjs`: 134 Assertions, 0 Fehler.

### Pflichtgates

- `npm test`: 132 Testdateien, 7.516 Assertions, 0 Fehler, 0 offene Handles.
- `npm run test:browser`: alle Browser-Smokes gruen, einschliesslich Profil-Handoff/Reload, Balance-Engine-Gate, Jahresprozess, Simulator, Monte Carlo, Tranchenmanager, Offline-/Recovery- und Importpfade.
- `node tests/run-single.mjs tests/architecture-evidence.test.mjs`: 19 Assertions, 0 Fehler nach Doku-Sync.
- `git diff --check`: gruen nach Doku-Sync.

## Abweichungen vom Plan

- Keine fachliche Scope-Abweichung. Der Slice blieb bei exakt sechs Programmdateien.
- Der bestehende Test `tests/balance-ui-orchestration.test.mjs` wurde fuer den schon geplanten Active-Profile-Adapterfall erweitert; dafuer war keine weitere Programmdatei erforderlich.
- `npm run build:engine` war nicht erforderlich, weil weder `engine/` noch die oeffentliche `EngineAPI` geaendert wurden.

## Offene Risiken

- Die Engine besitzt weiterhin nur eine Haushaltsquote. Der Slice belegt deshalb absolute Profilziele und die Adapterumrechnung; er fuehrt keine profilweise Engine-Goldpolicy ein.
- Aggregate-only Haushalte bleiben aus Kompatibilitaetsgruenden zulaessig. Nur der nicht verlustfrei/steuerlich eindeutig darstellbare Hybrid mit Detailprofil wird blockiert.
- Ein Pflegebucket kann nur aus der heute unterstuetzten operativen Liquiditaetsquelle Geldmarkt/Tagesgeld reserviert werden. Neue zweckgebundene Assetquellen benoetigen eine Erweiterung des gemeinsamen Goldbasisvertrags.

## Rueckdokumentation

Status, Ergebnis, Orakel und Gate-Nachweise sind in [SUITE_DATENINTEGRITAET_HARDENING_PLAN.md](./SUITE_DATENINTEGRITAET_HARDENING_PLAN.md) zurueckdokumentiert. README und die betroffenen technischen Profilverbund-, Simulator- und Balance-Referenzen wurden synchronisiert.

## Freigabestatus

Freigegeben durch Gemini am 2026-07-26 nach erfolgreichem adversarialen Review.

## Review-Feedback von Gemini

**Review-Datum:** 2026-07-26  
**Reviewer:** Antigravity (Gemini)  
**Methode:** Adversarielles Code- und Contract-Review gemäß `AGENTS.md` und `SLICE_EXECUTION_RULES.md`.

### Prüfdimensionen & Verifikation

1. **Korrektheit:**
   - **`D-04` Hybridprofil-Provenienz (`DAT-02`):** `combineSimulatorProfiles` in `simulator-profile-inputs.js` identifiziert unvollständige Profilhybride (Detailprofil + reine Aggregate-Profilwerte) und bricht fail-closed mit `SIMULATOR_PROFILE_ASSET_PROVENANCE_MISSING` ab. Erzeugung synthetischer Lots ohne Cost Basis/TQF ist verhindert. Repro O-06 wird sauber blockiert.
   - **`D-05` Absolute Goldzielbildung & Adapterquoten (`DAT-03`):** `calculateProfileGoldStrategy` in `profile-asset-values.js` ermittelt die Goldziele je Profil als absolute Eurobeträge auf der freien Profilbasis (`assetBase - min(healthBucket, operativeLiquidity)`). Summiertes Haushaltsziel im 100.000 € (8%) / 900.000 € (0%) Referenzfall beträgt exakt **8.000 €** (0.8% Haushaltsquote).
   - **Portfolioinitialisierung & Active Profile Invarianz:** `simulator-portfolio-init.js`, `profilverbund-balance.js` und `balance-main-profilverbund.js` nutzen das absolute Euro-Goldziel direkt. Ein Wechsel des aktiven DOM-Profils verändert das Haushaltsgoldziel nicht mehr.
2. **Vertragstreue:**
   - Keine Formeländerungen in `engine/`. `engine.js` und `EngineAPI` blieben unberührt.
3. **Fehlerbehandlung:**
   - Strukturiertes Fehlerobjekt mit sprechenden `warnings` und `errorCode` für das Simulator-UI.
4. **Seiteneffekte:**
   - Exakt 6 Programmdateien geändert (`balance-main-profilverbund.js`, `profile-asset-values.js`, `profilverbund-balance.js`, `simulator-main-profiles.js`, `simulator-portfolio-init.js`, `simulator-profile-inputs.js`). Max. Datei-Limit von 6 eingehalten!
   - Test-Suite (`npm test`, 7.516 Assertions) und Browser-Smokes (`npm run test:browser`, 16 E2E-Läufe) grün.

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  1. Reine Aggregate-only Haushalte (ohne jegliche Detailtranchen) bleiben aus Kompatibilitätsgründen erlaubt; erst das Mischen mit Detailprofilen wird fail-closed abgewiesen.
  2. Die Pflegebucket-Reservierung zieht operative Liquidität derzeit nur aus Tagesgeld und Geldmarkt-ETFs ab.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Ein Nutzer importiert ein zweites Profil ohne Tranchenliste, dessen Tagesgeld höher ist als das Gesamtvermögen, wodurch die freie Profilbasis negativ würde, wenn der Pflegebucket-Abzug die operative Liquidität im Vorzeichen nicht abfängt.
```

## Review-Feedback von Claude

Nicht angefordert.

## Review-Antworten von Codex

Review-Findings berücksichtigt; Implementierung vollständig grün.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| D-04 | Nutzerauftrag / Hauptplan | Hybridprofil ohne Detailprovenienz | angenommen | fail-closed, kein synthetischer Simulator-Steuerfallback |
| D-05 | Nutzerauftrag / Hauptplan | profilbezogene Goldbasis und absolute Ziele | angenommen | gemeinsame Basisdiagnostik; Haushaltsquote nur adapterseitig |
