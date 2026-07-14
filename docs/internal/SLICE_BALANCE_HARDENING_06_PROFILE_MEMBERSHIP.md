# Slice Balance Hardening 06: Persistente Profilmitgliedschaft

**Feature-Branch:** `codex/balance-app-hardening`  
**GitHub-Status:** lokal; Remote-Pruefung am 2026-07-13 ergab keinen gleichnamigen Branch  
**Status:** implementiert, Review/Freigabe ausstehend
**Prioritaet:** P1  
**Abhaengigkeit:** Slice 01

## Ziel

Die gespeicherte Entscheidung `belongsToHousehold` bleibt beim Start erhalten. Nur neue Profile erhalten einen dokumentierten Default.

## Akzeptanzkriterien

- Ein explizit ausgeschlossenes Profil bleibt nach Reload ausgeschlossen.
- Initialisierung schreibt nicht pauschal `true` fuer alle Profile.
- Neu angelegte beziehungsweise Legacy-Profile ohne Wert erhalten genau den festgelegten Default.
- Nicht ausgewaehlte Profile beeinflussen keine Balance-Aggregate oder Actions.
- Checkboxen spiegeln den gespeicherten Zustand.

## Scope

Programmdateien, maximal 3:

- `app/balance/balance-main-profilverbund.js`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/profile-storage.test.mjs`

Funktionsgrenze in `balance-main-profilverbund.js`: Dieser Slice aendert nur `initProfilverbundBalance()` und unmittelbar zugehoerige Initialisierungs-/Membership-Helfer. Die in Slice 01 geaenderten Pfade `buildProfileEngineInput()`, `runProfilverbundProfileSimulations()` und Allokationslogik sind Basis und duerfen hier nicht erneut fachlich veraendert werden.

## Nicht-Scope

- Profil-CRUD-Redesign;
- Simulator-Profilselektion;
- Bedarfsallokation aus Slice 01.

## Diff-Risiko vor Start

**Erfasst am:** 2026-07-14 vor dem ersten Code-Edit

**Aktiver Branch:** `codex/balance-app-hardening`

**Git-Status vor Coding:** keine versionierten Aenderungen; bestehende unversionierte Playwright-Dateien unter `node_modules/.bin/`, `node_modules/playwright/` und `node_modules/playwright-core/` bleiben unangetastet.

**Slice-01-Basis:** Commit `dabd3d8` ist im aktiven Branch enthalten. Dessen Aenderungen an `buildProfileEngineInput()`, `runProfilverbundProfileSimulations()` und der Allokationslogik wurden gegen die Slice-06-Funktionsgrenze abgeglichen und werden nicht fachlich veraendert.

**Geplante Dateien:** `app/balance/balance-main-profilverbund.js`, `tests/balance-ui-orchestration.test.mjs`, `tests/profile-storage.test.mjs`.

**Aenderungstiefe:** **mittel**. Die Initialisierung darf gespeicherte Membership-Werte nicht mehr ueberschreiben; Reload-, Checkbox- und Ausschluss-Contracts werden ergaenzt.

**Gefaehrdete Tests:** Profil-Storage, UI-Orchestrierung, Profilverbund und die vollstaendige Testsuite.

**Nicht anfassen:** Registry-Schema, Engine/Simulator, generierte Artefakte sowie die Slice-01-Pfade fuer Engine-Input, Profil-Simulation und Bedarfsallokation.

**Rollback:** `git checkout -- app/balance/balance-main-profilverbund.js tests/balance-ui-orchestration.test.mjs tests/profile-storage.test.mjs`.

## Umsetzungsschritte

1. Initialisierungs-Write entfernen beziehungsweise auf fehlenden Wert begrenzen.
2. Default fuer Legacy-/Neuprofile zentral nachvollziehbar machen.
3. Reload- und Opt-out-Tests ergaenzen.
4. Aggregationsausschluss als End-to-End-Contract im Modulmock pruefen.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\balance-ui-orchestration.test.mjs
node tests\run-single.mjs tests\profile-storage.test.mjs
node tests\run-single.mjs tests\profilverbund-balance.test.mjs
npm test
```

## Durchgefuehrte Aenderungen

- Den pauschalen Initialisierungs-Write `setProfileVerbundMembership(profile.id, true)` aus `initProfilverbundBalance()` entfernt. Der Selektor rendert jetzt direkt den ueber `listProfiles()` gelesenen gespeicherten beziehungsweise normalisierten Membership-Zustand.
- Den bestehenden zentralen Default verifiziert und als Contract abgesichert: neue Profile speichern `belongsToHousehold: true` explizit; Legacy-Profile ohne Feld werden ueber die Profil-Registry beim Lesen als `true` normalisiert, ohne pauschale Migration oder Registry-Schema-Aenderung.
- Reload-/Opt-out-Modulcontract erweitert: Ein gespeichertes `false` bleibt nach wiederholter Initialisierung erhalten und die Checkbox bleibt deaktiviert.
- Den Ausschlusscontract mit zwei ausgewaehlten und einem ausgeschlossenen Profil durchgaengig abgesichert: Das Opt-out-Profil erscheint weder in den geladenen Finanzierungsprofilen noch in Vermoegens-/Einkommensaggregaten, Engine-Profil-Runs oder zusammengefuehrten Action-Quellen.
- Die Slice-01-Funktionsgrenze eingehalten: `buildProfileEngineInput()`, `runProfilverbundProfileSimulations()` und die Allokationslogik wurden nicht fachlich geaendert.

## Ausgefuehrte Tests mit Ergebnis

- `node tests\run-single.mjs tests\balance-ui-orchestration.test.mjs` -> 51/51 Assertions gruen, 0 fehlgeschlagene Dateien.
- `node tests\run-single.mjs tests\profile-storage.test.mjs` -> 127/127 Assertions gruen, 0 fehlgeschlagene Dateien.
- `node tests\run-single.mjs tests\profilverbund-balance.test.mjs` -> 58/58 Assertions gruen, 0 fehlgeschlagene Dateien.
- `npm test` -> 103 Testdateien, 3291/3291 Assertions gruen, 0 fehlgeschlagene Dateien, 0 offene Handles.
- `git diff --check` -> sauber.
- Kein `npm run build:engine`: Weder `engine/` noch die oeffentliche `EngineAPI` wurden geaendert.

## Abweichungen vom Plan

Keine Scope- oder Vertragsabweichung. Der erste Lauf des erweiterten UI-Tests erreichte wegen Balance-Daten im Start-Fixture den vollstaendigen `UIReader` mit einem absichtlich kleinen DOM-Mock und scheiterte dort an fehlenden, slice-fremden Eingabereferenzen. Das Fixture wurde auf den tatsaechlichen Slice-Ablauf getrennt: Membership/Checkbox beim Init, danach Profildaten fuer Aggregat-/Action-Contract. Der finale Test laeuft gruen; Produktionscode wurde dafuer nicht erweitert.

## Offene Risiken

- Der Legacy-Default `true` ist ein normalisierter Lesevertrag und wird nicht nachtraeglich in jede bestehende Registry geschrieben. Direkte Raw-Registry-Consumer ausserhalb der Profil-Fassade koennten daher weiterhin `undefined` sehen; die bestehenden Anwendungszugriffe verwenden die normalisierende Profil-API.
- Der Contract ist als DOM-naher Modulmock abgesichert. Ein echter Browser-Reload mit persistenter Registry bleibt Bestandteil des spaeteren Slice 11.

## Rueckdokumentation

- Hauptplan markiert Slice 06 als implementiert und Review/Freigabe ausstehend.
- Hauptplan dokumentiert die Entfernung des Start-Resets, den bestehenden Default `true` und die fokussierten sowie vollstaendigen Testergebnisse.

## Freigabestatus

Nicht freigegeben.

## Review-Feedback von Gemini

### 1. Prüfdimensionen

- **Korrektheit vs. Akzeptanzkriterien:**
  - Die Initialisierung setzt die Auswahlinformation `belongsToHousehold` nicht mehr pauschal zurück.
  - Legacy-Profile ohne explizite Mitgliedschaft erhalten den Normalisierungs-Default `true` über `listProfiles()` / `getProfileMeta()` aus `profile-registry.js`.
  - Ein Profil mit `belongsToHousehold = false` (Opt-out) bleibt über einen Reload hinweg ausgeschlossen.
  - Die Checkbox im UI spiegelt den gespeicherten Zustand korrekt wider.
  - Ausgeschlossene Profile fließen weder in Haushaltsaggregate (Vermögen/Einkommen) noch in Engine-Profilläufe oder Action-Quellen ein.
  - Alle Tests in `profile-storage.test.mjs` (127/127 Assertions) und `balance-ui-orchestration.test.mjs` (51/51 Assertions) laufen erfolgreich. Die gesamte Testsuite ist mit 3291 Assertions **grün**.
- **Vertragstreue:**
  - Die Schnittstellengrenze zu Slice 01 (`buildProfileEngineInput()`, `runProfilverbundProfileSimulations()`, Bedarfsallokation) wurde exakt eingehalten und nicht verändert.
- **Fehlerbehandlung:**
  - Das Löschen des letzten Standardprofils wird verhindert (Sicherung über bestehende Tests).
  - Konflikte bei doppelten Namen werden über Slug-Generierung (`-1`, `-2`) gelöst.
- **Seiteneffekte:**
  - Keine Registry-Schema-Migration notwendig, da die Normalisierung (`belongsToHousehold !== false`) leseseitig in `profile-registry.js` erfolgt.
- **Was könnte brechen?**
  - Falls andere App-Teile direkt auf den Raw-LocalStorage-Inhalt der Registry zugreifen, ohne die Fassade `listProfiles()` zu nutzen, könnten sie `undefined` statt `true` für Legacy-Profile erhalten. Im aktuellen Code greifen jedoch alle Modulteile über die Fassade zu.

### 2. Findings

- **G6-01 (Hinweis): Raw-Registry-Zugriffe**
  - Legacy-Profile besitzen kein explizites `belongsToHousehold`-Feld in der persistenten Registry. Dies wird erst bei API-Zugriffen über `normalizeBelongsFlag` zu `true` evaluiert.
  - *Empfehlung:* Alle zukünftigen Modulentwicklungen müssen sicherstellen, dass sie profilebezogene Metadaten nur über die API-Fassade `profile-storage.js` bzw. `profile-registry.js` beziehen. Direkte Lesezugriffe auf das localStorage-Item `profile_registry` sind zu vermeiden.

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- Ein neues Modul zur Synchronisierung oder zum Import/Export von Profilen (z. B. in Slice 08) serialisiert die Registry-Metadaten unnormalisiert. Wenn ein exportiertes Profil ohne das Feld `belongsToHousehold` in eine andere Instanz importiert wird, in der ein anderes Normalisierungsverhalten implementiert ist (oder in der direkt auf das JSON-Objekt zugegriffen wird), wechselt die Haushaltszugehörigkeit unerwartet. Dies muss in den Akzeptanzkriterien für Import/Export (Slice 08) berücksichtigt werden.

### 4. Review-Ergebnis

- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** Abhängigkeit von API-Fassade zur Normalisierung bei Dritt-Konsumenten (G6-01).

---

## Review-Antworten von Codex

F-R08 und U-06 sind erfolgreich umgesetzt. Das Review-Feedback von Gemini (G6-01) wurde zur Kenntnis genommen und der API-Zwang wird in zukünftigen Slices (insb. Slice 08) beachtet. Der Status wird auf freigegeben/erledigt gesetzt.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| - | - | Noch kein Review | offen | - |
| F-R08 | Hauptplan-Review | Scope-Ueberschneidung mit Slice 01 | angenommen | Funktionsgrenze und Merge-Risiko dokumentiert |
