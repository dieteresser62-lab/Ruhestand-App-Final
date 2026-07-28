# Slice 13 - Sichtbare Profilkorruption und sichere Recovery

**Arbeitsplan:** [SUITE_DATENINTEGRITAET_HARDENING_PLAN.md](./SUITE_DATENINTEGRITAET_HARDENING_PLAN.md)  
**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**GitHub-Status:** Feature-Branch vorhanden; Push erfolgt nur nach Nutzerfreigabe  
**Findings:** PER-01 bis PER-03 sowie DAT-05  
**Entscheidungen:** D-09 und D-17  
**Prioritaet:** P1  
**Status:** freigegeben - unabhaengiges Re-Review (Claude & Gemini) abgeschlossen  


## Ziel

Profilregistry, profilbezogener Pflegebucket und profilbezogener
Balance-State werden als typisierte Loadergebnisse gelesen. Korrupte Daten
werden weder durch Defaults ersetzt noch als fehlend oder deaktiviert
weiterverwendet. Der Rohinhalt bleibt bis zu einem erfolgreichen
Recovery-Export und einem danach bestaetigten Reset erhalten. Jedes Profil
behaelt sein eigenes Alter.

## Akzeptanzkriterien

- O-18 ist fuer Registry, Pflege und Profil-Balance gruen.
- Die Loader unterscheiden `valid`, `missing`, `empty`, `corrupt` und
  `unavailable`.
- Korrupte Registrydaten bleiben bytegleich erhalten; es gibt keinen
  automatischen Default-Write.
- `currentProfileId` und eine vorhandene aktive ID verweisen auf Registryprofile
  oder der Lauf befindet sich sichtbar im Recoveryzustand.
- Ein fehlgeschlagenes `loadProfileIntoLocalStorage()` wird nicht als
  erfolgreicher Load gemeldet und hinterlaesst keinen teilgeladenen Live-State.
- Ein korrupter aktivierter Pflegebucket wird weder deaktiviert noch als frei
  verfuegbarer Betrag verwendet.
- Ein korruptes ausgewaehltes Profil blockiert die gesamte
  Haushaltsaggregation; es entsteht kein Teilhaushalt.
- Recovery-Reset ist nur nach nachweislich erfolgreichem Rohdatenexport und
  einer gesonderten Nutzerbestaetigung moeglich. `unavailable` bietet keinen
  Resetpfad.
- Das gespeicherte per-profile Alter bleibt bei Profilwechsel und
  Profilverbund-Persistenz unveraendert.

## Scope

### Geplante Programmdateien

- `app/profile/profile-registry.js`
- `app/profile/profile-state.js`
- `app/profile/profile-storage.js`
- `app/profile/profile-live-storage.js`
- `app/profile/profilverbund-balance.js`
- `app/balance/balance-expenses.js`
- `app/balance/balance-main-profilverbund.js`
- `app/balance/balance-main-profile-sync.js`
- `app/profile/profile-manager.js`
- `app/simulator/simulator-main-profiles.js`

Die UI-Orchestratoren kommen gegenueber der ersten Schaetzung im Hauptplan
hinzu, weil ein nur geworfener Persistenzfehler weder auf der Profilstartseite
noch in Balance oder Simulator einen sichtbaren Bereichsfehler ergeben wuerde.
Der Ausgaben-Tab musste den Profilblocker gekapselt zurueckgeben, damit seine
Initialisierung die zentrale Balance-Recovery nicht vorzeitig abbricht. Das
Bootstrap-Ergebnis wird ueber das bereits geaenderte Storage-Modul an den
Profilmanager gereicht; `profile-navigation.js` blieb deshalb unveraendert.
Mit exakt zehn Programmdateien greift die Stop-Regel "mehr als 10" nicht;
weitere Programmdateien sind ausgeschlossen.

### Geplante Testdateien

- `tests/profile-state.test.mjs`
- `tests/profile-storage.test.mjs`
- `tests/profilverbund-balance.test.mjs`
- `tests/browser-smoke.test.mjs`

Bestehende, unveraenderte Tests fuer Navigation, Profil-UI, Balance- und
Simulator-Orchestrierung sowie Snapshot-Restore werden als fokussierte
Regressionsgates mit ausgefuehrt.

### Nicht-Scope

- Bundle- und Vollbackupvalidierung aus Slice 14
- allgemeines UI-Redesign
- Aenderungen unter `engine/`, `workers/`, `src-tauri/` oder an generierten
  Artefakten
- neue Engine-Semantik oder stilles Klemmen fachlicher Profilwerte

## Branch-/Statuscheck vor Coding

Ausgefuehrt am 2026-07-28 vor dem ersten Code-Edit:

```text
git branch --show-current
codex/suite-datenintegritaet-hardening

git status --short
(leer)
```

Der aktive Branch stimmt mit dem Arbeitsplan ueberein; der Arbeitsbaum war
sauber.

## Diff-Risiko vor Coding

```text
Geplante Dateien:
- app/profile/profile-registry.js
- app/profile/profile-state.js
- app/profile/profile-storage.js
- app/profile/profile-live-storage.js
- app/profile/profilverbund-balance.js
- app/balance/balance-expenses.js
- app/balance/balance-main-profilverbund.js
- app/balance/balance-main-profile-sync.js
- app/profile/profile-manager.js
- app/simulator/simulator-main-profiles.js
- die oben benannten fokussierten Testdateien
- docs/internal/SLICE_SUITE_DATA_13_PROFILE_RECOVERY.md
- docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md

Voraussichtliche Aenderungstiefe:
- riskant: Persistenz-, Recovery-, Profilwechsel- und Aggregationsvertrag
- kontrolliert: exakt zehn Programmdateien, keine Engine-/Worker-Aenderung

Gefaehrdete bestehende Tests:
- Profilregistry-CRUD und Default-Bootstrap
- Profilwechsel und Live-Storage-Isolation
- Profilverbund- und Simulatoraggregation
- Balance- und Simulator-Startorchestrierung
- Browser-Smokes fuer Index, Balance und Simulator

Nicht anfassen:
- engine/, engine.js, workers/, dist/, src-tauri/, RuheStandSuite.exe
- Bundle-/Vollbackup-Import aus Slice 14
- bestehende Engine-Semantik

Rollback-Strategie:
- gezielter Reverse-Patch ausschliesslich fuer die oben inventarisierten
  Programm-, Test- und Plandateien
- die neue Slice-Datei nur nach ausdruecklicher Freigabe loeschen
```

## Geplante Umsetzung

1. Typisierte, mutationsfreie Loader fuer Registry, Pflegebucket und
   Profil-Balance-State einfuehren.
2. Registryshape sowie Current-/Active-ID gemeinsam validieren.
3. Profil-Live-State erst nach vollstaendig erfolgreichem Preflight laden und
   bei Schreibfehlern wiederherstellen.
4. Korrupte ausgewaehlte Profile in Balance und Simulator als sichtbare,
   profilbezogene Blocker behandeln.
5. Recovery-Dokument und gegen TOCTOU geschuetzten Resetvertrag bereitstellen;
   Reset erst nach Exportnachweis und Nutzerbestaetigung.
6. Per-profile Alter in Loader und Persistenzpfad priorisieren.

## Geplante Tests und Gates

- fokussierte Tests der oben genannten Vertraege
- Browserfaelle fuer korrupte Registry, Pflege und Profil-Balance
- `npm test`
- `npm run test:browser`
- `git diff --check`

## Durchgefuehrte Aenderungen

- Registry-, Pflegebucket- und Profil-Balance-Loader liefern die expliziten
  Zustaende `valid`, `missing`, `empty`, `corrupt` und `unavailable`.
- Registrykorruption und ungueltige Current-/Active-IDs werden ohne
  Default-Write in einen typisierten Recoveryvertrag ueberfuehrt. Historische
  Registryeintraege ohne redundantes `meta.id` bleiben lesbar; die ID wird
  mutationsfrei aus dem kanonischen Map-Key abgeleitet.
- Zielprofil und aktueller Live-State werden vor Save/Load validiert.
  Profilbezogene Live-Writes sichern den vorherigen Zustand und rollen bei
  Teilfehlern zurueck; ein fehlgeschlagener Load meldet niemals Erfolg.
- Recovery-Dokumente enthalten den exakten Rohpayload. Reset erfordert ein
  passendes Dokument, eine gesonderte Bestaetigung und einen erneuten
  Raw-Vergleich gegen zwischenzeitliche Aenderungen. `unavailable` bleibt
  retry-only.
- Die Profilstartseite sperrt normale Profilaktionen im Recoveryzustand.
  Export schaltet den bestaetigten Reset erst danach frei.
- Balance, Ausgaben-Tab und Simulator zeigen profil- und bereichsbezogene
  Blocker. Ein fehlerhaftes ausgewaehltes Profil bricht die gesamte
  Haushaltsaggregation ab und leert abgeleitete Laufzeit-Overrides.
- Das Alter wird aus `profile_aktuelles_alter` des jeweiligen Profils gelesen
  und bei Wechseln nicht mit einem veralteten Haushaltswert ueberschrieben.

## Ausgefuehrte Tests

- Syntaxcheck aller zehn Programmdateien: gruen.
- `tests/profile-state.test.mjs`: 47/47 Assertions.
- `tests/profile-storage.test.mjs`: 211/211 Assertions.
- `tests/profilverbund-balance.test.mjs`: 125/125 Assertions.
- `tests/profile-ui-contract.test.mjs`: 18/18 Assertions.
- `tests/simulator-ui-orchestration.test.mjs`: 56/56 Assertions.
- `tests/simulator-multiprofile-aggregation.test.mjs`: 66/66 Assertions.
- `tests/balance-ui-orchestration.test.mjs`: 232/232 Assertions.
- `tests/balance-binder-snapshots.test.mjs`: 23/23 Assertions.
- `tests/balance-storage-contract.test.mjs`: 44/44 Assertions.
- `npm test`: 136 Testdateien, 8.536/8.536 Assertions, 0 offene Handles.
- `npm run test:browser`: 20/20 Browser-Smokes; enthalten sind korrupte
  Registry mit Raw-Export/Reset, korrupter Pflegebucket in Balance und
  korrupter Profil-Balance-State im Simulator.
- `git diff --check`: gruen.

## Abweichungen vom Plan

- `app/balance/balance-expenses.js` ersetzt
  `app/profile/profile-navigation.js` im Zehn-Dateien-Scope. Der reale
  Browserlauf zeigte, dass der Ausgaben-Tab den Profilfehler vor dem zentralen
  Balance-Blocker ungefangen warf. Das Bootstrap-Ergebnis wird ohne
  Navigation-Aenderung im Storage-Modul zwischengespeichert.
- Der erste Volltest deckte historische Snapshot-Registries ohne `meta.id`
  auf. Diese werden leseseitig normalisiert, waehrend widerspruechliche
  explizite IDs weiterhin als korrupt blockieren. Die beiden betroffenen
  Snapshot-Tests und die anschliessende Vollsuite sind gruen.

## Offene Risiken

- Der Slice validiert die im Plan benannten Profilbereiche. Die atomare
  Vollbackup-/Bundle-Wiederherstellung bleibt bewusst Slice 14.
- Ein technisch nicht lesbares Backend (`unavailable`) besitzt absichtlich
  keinen Resetpfad, weil kein unveraenderter Rohpayload nachgewiesen werden
  kann.

## Rueckdokumentation in den Arbeitsplan

Nach technischer Fertigstellung werden Status, Dateiscope und Gate-Ergebnisse
in `SUITE_DATENINTEGRITAET_HARDENING_PLAN.md` nachgetragen.

## Freigabestatus

- Technische Umsetzung: Blocker-Nachbesserungen T13-1, T13-2 und T13-3 abgeschlossen
- Selbstpruefung Codex: technisch abgeschlossen, keine Eigenfreigabe
- Re-Review Gemini/Claude/Nutzer: erfolgreich abgeschlossen; Slice 13 ist freigegeben
- Lokaler Commit: abgeschlossen

- Push: ausstehend; nur nach ausdruecklicher Nutzerfreigabe


## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| S13-1 | Claude | Verwaiste aktive Profil-ID nach gewoehnlichem Profil-Loeschen fuehrt zum Ueberschreiben eines gesunden Profils mit fremden Live-Daten | umsetzen | Datenverlust geschlossen (Re-Review); Restluecke siehe T13-1 |
| S13-2 | Claude | Recoveryzustand ist auf Balance und Simulator unsichtbar; das Bootstrap-Ergebnis wird dort verworfen | umsetzen | geschlossen (Re-Review) |
| S13-3 | Claude | Simulator-Blocker ist reine Statusanzeige; Laeufe bleiben startbar und der Fehlerzweig erzwingt Aggregatbetrieb | umsetzen | teilweise geschlossen (Re-Review); Restluecke siehe T13-2 |
| S13-4 | Claude | D-17: Profile ohne hinterlegtes Alter erhalten und persistieren `aktuellesAlter: 0` | gekoppelt umsetzen | geschlossen (Re-Review) |
| S13-5 | Claude | Ein einziger ungueltiger Registryeintrag macht die gesamte Registry `corrupt`; einziger Reset loescht alle Profile | offen | ausstehend |
| S13-6 | Claude | Neuere Registryversion wird als `corrupt` mit `canReset: true` behandelt | offen | ausstehend |
| S13-7 | Claude | `unavailable` ist ueber die reale Persistenz-Facade unerreichbar; ein nicht lesbares Backend erscheint als `missing` und loest einen Default-Write aus | offen | ausstehend |
| S13-8 | Claude | Vertragswiderspruch zu Slice 12: `lastState: null` ist dort erlaubt und wird hier als `corrupt` eingestuft | gekoppelt umsetzen | geschlossen (Re-Review) |
| S13-9 | Claude | Werfende Profil-Getter treffen den Tranchen-Manager ausserhalb des Slice-Scopes und erzeugen dort eine falsche Retry-Meldung | offen | ausstehend |
| S13-10 | Claude | Create-, Rename- und Delete-Handler der Profilseite haben keinen Recovery-Catch | offen | ausstehend; durch den neuen Wurf in `deleteProfile` verschaerft |
| S13-11 | Claude | Ausgaben-Tab meldet einen Profilfehler als Ausgabenkorruption; zwei Pfade bleiben ungeschuetzt | offen | ausstehend |
| S13-12 | Claude | Resetfreigabe haengt am Erzeugen des Dokuments, nicht an einem nachgewiesenen Export | offen | ausstehend |
| T13-1 | Claude/Gemini | Loeschen des letzten verbleibenden Profils setzt `rs_active_profile` nicht zurueck; erlaubte Loeschfolge blockiert Balance und Simulator vollstaendig | umsetzen | geschlossen (zweites Re-Review) |
| T13-2 | Claude/Gemini | `ao_run_btn` wird durch jede Auto-Optimize-Interaktion wieder freigeschaltet und besitzt kein Action-Gate | umsetzen | geschlossen (zweites Re-Review) |
| T13-3 | Claude/Gemini | `npm run test:browser` ist auf diesem Stand nicht verlaesslich gruen; `Balance CSV import roundtrip` faellt in zwei von drei Laeufen aus | umsetzen | geschlossen (zweites Re-Review) |
| T13-4 | Claude | Der Kontext-Preflight liest und parst die Registry pro Aggregationsaufruf sieben statt drei Mal | offen | ausstehend |
| U13-1 | Claude | Loeschen des letzten Profils leert den gesamten profilbezogenen Live-State; die Bestaetigungsfrage kuendigt das nicht an | offen | ausstehend |
| U13-2 | Claude | Im Kurzschlusszweig von `deleteProfile` liegt der Fallback-Load hinter dem Registry-Write; ein Fehlschlag meldet faelschlich "Loeschen fehlgeschlagen" | offen | ausstehend |
| U13-3 | Claude | Das Capture-Gate deckt nur `#ao_run_btn` und `#ao_apply_btn`; `btButton` haengt weiterhin allein am `disabled`-Zustand | offen | ausstehend |
| U13-4 | Claude | `window.__profileRecoveryBlockedActionCount` ist ein reiner Testhaken im Produktivpfad | offen | ausstehend |
| U13-5 | Claude | T13-3 wurde im Smoke behoben, nicht im Produkt; die Ursache des zwischenzeitlich sichtbaren leeren Fehlercontainers blieb unermittelt | offen | ausstehend |

## Review-Feedback von Claude

**Reviewdatum:** 2026-07-28  
**Pruefgegenstand:** Arbeitsbaumstand auf `codex/suite-datenintegritaet-hardening`
ueber `dbb9db4`; zehn Programmdateien, vier Testdateien.

### Verifikationsbasis

Alle Aussagen sind an den Produktivmodulen gemessen, nicht aus dem Diff
abgeleitet. Vergleichsmessungen laufen gegen eine unveraenderte Kopie des
Standes `dbb9db4` (`git archive HEAD app types engine`), damit Regressionen von
vorbestehenden Schwaechen unterscheidbar sind.

Unabhaengig nachgefahrene Gates:

| Gate | Ergebnis |
|---|---|
| `npm test` | 8.536/8.536 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles |
| `npm run test:browser` | 20/20 Smokes, Exit 0 |
| `git diff --check` | gruen |
| Dateiscope | exakt 10 Programmdateien, alle wie deklariert |
| Verbotene Bereiche | `engine/`, `engine.js`, `workers/`, `dist/`, `src-tauri/` unveraendert |

Die Zahlenangaben von Codex sind damit bestaetigt. Sie sagen nichts darueber
aus, ob die Vertraege fachlich tragen; genau das ist Gegenstand der folgenden
Findings.

### 1. Korrektheit

Der typisierte Loadervertrag existiert und trennt `valid`, `missing`, `empty`,
`corrupt` und `unavailable`. Die Rohbytes bleiben erhalten: der Browser-Smoke
und eigene Messungen zeigen, dass eine korrupte Registry vor dem Export
bytegleich in der Persistenz liegt. Die Blockersicht auf der Profilseite ist
funktionsfaehig, der Reset ist vor dem Export gesperrt.

Nicht abgedeckt sind die Zustandsuebergaenge, die den Recoveryzustand
*verlassen* oder ihn *umgehen*.

**S13-1 (Blocker) - gewoehnliches Profil-Loeschen fuehrt zu Datenverlust im
verbleibenden Profil.**

`deleteProfile` entfernt den Eintrag aus der Registry und korrigiert
`rs_current_profile`, laesst `rs_active_profile` aber unberuehrt. Gemessen:

```text
vor Loeschung  current/active: p2 / p2
deleteProfile("p2")          : true
nach Loeschung current/active: default / p2      <- verwaiste aktive ID
getActiveProfileId()         : wirft PROFILE_ACTIVE_GHOST
```

Damit steht jede weitere Sitzung im Recoveryzustand. Beide Wege aus diesem
Zustand verlieren Daten des gesunden Profils:

*Weg A - der in der Oberflaeche angebotene bestaetigte Reset.*
`resetProfileRecovery` im Scope `profile-context` setzt `current` und `active`
auf dasselbe Profil, laedt dessen Daten aber nicht in den Live-State. Der
naechste Bootstrap sieht `activeId === currentId` und speichert den weiterhin
fremden Live-State in das Zielprofil:

```text
Reset-Ergebnis             : {"ok":true,"action":"context_repaired","profileId":"default"}
Live-State nach Reset      : 20000 / 61          <- Daten des geloeschten Profils
zweiter Bootstrap          : saved
default.data vorher        : {"profile_tagesgeld":"50000","profile_aktuelles_alter":"67"}
default.data nachher       : {"profile_tagesgeld":"20000","profile_aktuelles_alter":"61"}
```

*Weg B - ohne jede Nutzerinteraktion.* Auf Balance und Simulator ruft
`initProfileSubpageLifecycle` denselben Bootstrap und verwirft dessen Ergebnis
(siehe S13-2). Der Lauf wird nicht geladen, der fremde Live-State bleibt stehen
und der `beforeunload`-Hook schreibt ihn in das aktuelle Profil:

| | vor Slice 13 | mit Slice 13 |
|---|---|---|
| Bootstrap-Aktion | `loaded` | `recovery` (`PROFILE_ACTIVE_GHOST`) |
| Live-Tagesgeld danach | `50000` | `20000` |
| `beforeunload`-Save | `ok=true` | `ok=true` |
| `default.data` danach | `{"profile_tagesgeld":"50000","profile_aktuelles_alter":"67"}` | `{"profile_tagesgeld":"20000","profile_aktuelles_alter":"61"}` |

Vor diesem Slice heilte die Situation sich selbst: Weil `activeId !== currentId`
galt, lud der Bootstrap das aktuelle Profil und stellte den korrekten
Live-State her. Slice 13 ersetzt diese Selbstheilung durch einen
Recoveryzustand, der auf den Rechenseiten weder sichtbar ist noch geheilt wird -
und dessen einziger angebotener Ausgang dieselben Daten ueberschreibt. Das
Recovery-Dokument enthaelt nur die verwaiste ID (`"raw": "p2"`), also gerade
nicht die ueberschriebenen Profildaten. Verletzt sind D-09
(fail-closed, Rohpayload erhalten), das Akzeptanzkriterium zur sichtbaren
Recovery und das Kriterium, dass ein nicht geladenes Profil keinen
teilgeladenen Live-State hinterlaesst.

**S13-2 (Blocker) - der Recoveryzustand ist auf beiden Rechenseiten unsichtbar.**

`getLastProfileBootstrapResult()` wird ausschliesslich in
`app/profile/profile-manager.js` gelesen. `profile-navigation.js` blieb
planmaessig unveraendert und verwirft den Rueckgabewert von
`bootstrapProfileContext()`. Fuer die gesamte Fehlerklasse `profile-context` -
`PROFILE_CURRENT_GHOST`, `PROFILE_ACTIVE_GHOST`, `PROFILE_CURRENT_LOAD_FAILED`,
`PROFILE_STORAGE_UNAVAILABLE` - zeigen Balance und Simulator nichts an. Die
dortigen Blocker greifen nur, wenn `loadProfilverbundProfiles()` oder
`listProfiles()` wirft, also bei Registry- oder Profilfeldkorruption. Eine
gueltige Registry mit verwaister ID passiert beide Seiten unbemerkt.

Das Akzeptanzkriterium *"`currentProfileId` und eine vorhandene aktive ID
verweisen auf Registryprofile oder der Lauf befindet sich sichtbar im
Recoveryzustand"* ist damit nur fuer die Profilstartseite erfuellt.

**S13-3 (Blocker) - der Simulator blockiert die Anzeige, nicht den Lauf.**

`applySelection` faengt den Profilfehler, leert die Profilliste und setzt eine
Statusmeldung. `mcButton`, `btButton`, `sweepButton` und `findBestButton` sind
per `onclick` an globale Funktionen gebunden und bleiben aktiv; ein Gate auf den
Profilstatus existiert nicht. Zusaetzlich setzt der Fehlerzweig aktiv
`window.__profilverbundPreferAggregates = true`. Wirkung, gemessen an
`readTrancheInputs`:

```text
ohne Profilverbund-Globals        : {"detailledTranches":[{"id":"t1", ... }]}
nach Profil-Recovery-Fehlerzweig  : {"detailledTranches":null,"simulationSourceProfileId":null}
```

Der Lauf verwirft also den realen Tranchenbestand und rechnet mit den
Aggregatfeldern der Oberflaeche - die im Fehlerfall entweder nie befuellt
wurden oder die zuletzt erfolgreiche Aggregation von *vor* der Korruption
enthalten. Beides ergibt einen plausibel aussehenden Haushaltslauf ohne die
betroffene Person. Das Kriterium "es entsteht kein Teilhaushalt" ist auf
Anzeigeebene erfuellt, auf Ergebnisebene nicht. Belegbasis: Codelesung und die
obige Messung des Global-Effekts; ein vollstaendiger Browserlauf des
Startknopfes wurde nicht durchgefuehrt.

### 2. Vertragstreue

**S13-8 (Restrisiko) - Widerspruch zum bereits ausgelieferten Importvertrag aus
Slice 12.**

Slice 12 erlaubt `lastState: null` ausdruecklich
(`balance-binder-imports.js:913`) und der Export erzeugt diesen Wert. Slice 13
stuft denselben Zustand als korrupt ein. Kette am Produktivcode gemessen:

```text
Export payload.lastState        : null
Import payload.lastState        : null   (akzeptiert)
Slice-13-Einstufung des Profils : corrupt | PROFILE_BALANCE_STATE_INVALID
                                  "... im Feld lastState kein gueltiges Objekt."
```

Ein so importierter Zustand blockiert nach dem Profil-Speichern die gesamte
Haushaltsaggregation in Balance und Simulator, und der angebotene Ausweg ist
das Loeschen des Balance-States dieses Profils. Die eigenen Schreibpfade der
App erzeugen `lastState: null` nach Messung nicht; erreichbar ist der Zustand
ueber ein Slice-12-konformes Importdokument. Die Klassifikationsgrenze
insgesamt:

| Nutzlast im Profil | Slice 13 | vor Slice 13 |
|---|---|---|
| `{"inputs":{...}}` | `valid` | Objekt |
| `{"inputs":{...},"lastState":null}` | **`corrupt`** | Objekt |
| `{"inputs":{},"profilverbundHouseholdLastState":null}` | **`corrupt`** | Objekt |
| `{"inputs":null}` | `corrupt` | Objekt |
| `{}` | `empty` | `{}` |
| `"null"` | `corrupt` | `null` |
| Pflegebucket `{"initialAmount":""}` | **`corrupt`** | Default 150000 |
| Pflegebucket `{"enabled":null}` | **`corrupt`** | Default |
| Pflegebucket `{"assetSource":null}` | **`corrupt`** | Default |
| Pflegebucket `{"triggerMinGrade":"3"}` | `valid` | Wert 3 |
| Pflegebucket mit unbekanntem Zusatzfeld | `valid` | Default |

Der einzige Schreibpfad des Pflegebuckets
(`profile-asset-values.js:341`) normalisiert vor dem Speichern, die
Pflegebucket-Zeilen sind daher nur fuer historische oder fremde Schreiber
relevant. Die beiden `null`-Zeilen des Balance-States sind es nicht.

**S13-6 (Restrisiko) - Vorwaertskompatibilitaet.** Eine Registry mit
`version: 2` wird als `PROFILE_REGISTRY_VERSION_UNSUPPORTED` mit
`canReset: true` gefuehrt. Eine neuere, moeglicherweise voellig intakte Datei
laesst sich damit ueber den bestaetigten Reset loeschen. Fuer eine
Versionsgrenze ist `unavailable`/retry-only die passendere Klasse.

**S13-9 (Restrisiko) - Seiteneffekt ausserhalb des Slice-Scopes.**
`getCurrentProfileId()` und `getActiveProfileId()` waren bisher wurffreie
Leser; beide werfen jetzt. `tranche-reconciliation.js:356` ruft sie ohne
Absicherung, und `tranchen-manager-page.js:517` faengt alles, was kein
`TrancheReconciliationError` ist, mit der Meldung *"Die Ausfuehrung konnte
nicht dauerhaft gespeichert werden. Retry ist moeglich."* ab. Fuer eine
Recovery-Klasse ist genau das falsch: Retry hilft nie. Zusaetzlich hat
`getActiveProfileId()` durch `getRegistryContextSnapshot()` jetzt einen
Schreib-Seiteneffekt (`ensureDefaultProfile`), den ein Getter vorher nicht
hatte.

### 3. Fehlerbehandlung

**S13-7 (Restrisiko) - `unavailable` ist praktisch unerreichbar, und der
Ersatzpfad schreibt.** Alle `unavailable`-Zweige der Loader haengen daran, dass
`storage.getItem` wirft. `PersistenceFacade.getItemSync` wirft nie: bei
`initialized` liefert er `memCache[key] ?? null`, sonst
`adapter.getItemSync?.(key) ?? null`. Ein nicht lesbares Backend erscheint
damit als `missing`, und `ensureDefaultProfile` fuehrt dafuer einen
automatischen Default-Write aus. Konkret betrifft das den Fall
`tauri-state-corrupt`: die Facade faengt ihn ab, setzt einen leeren `memCache`
und `initialized = true`. Die Profilseite prueft `migrationWarning` nicht - nur
Balance tut das (`balance-main.js:426`) - und legt eine frische
Default-Registry an. Der Tauri-Adapter quarantaeniert die beschaedigte Datei
zwar zuvor; scheitert auch die Quarantaene, wird derselbe Fehlercode ohne
`quarantinePath` geworfen und die Facade schluckt ihn identisch. Das ist genau
der im Stop-/Reviewpunkt benannte Fall: ein transienter beziehungsweise
technischer Lesefehler landet im selben Pfad wie ein normal leerer Zustand.

**S13-10 (Restrisiko).** In `profile-manager.js` sind nur `switchProfile` und
`saveCurrentProfileFromLocalStorage` in einen Recovery-Catch gefasst. Die
Handler fuer Anlegen (`createProfile` plus `switchProfile`), Umbenennen und
Loeschen sowie `refresh()` mit `getCurrentProfileId()` und `listProfiles()`
laufen ungeschuetzt. Eine erst zur Laufzeit entstehende Korruption fuehrt dort
zu einem stillen Abbruch des Klickhandlers statt zur Recoveryansicht.

**S13-11 (Restrisiko).** `balance-expenses.js:342` faengt einen Profilfehler aus
`renderTable()` und beantwortet ihn mit `renderCorruptExpensesState()` - der
Nutzer sieht eine Ausgaben-Korruption, obwohl die Ausgabendaten intakt sind.
`openDetails` (`getProfiles()`, Zeile 359) und `updateExpensesBudget`
(`renderTable()`, Zeile 516) bleiben ohne Schutz; letzteres faellt in den
Sammel-Catch von `runBalanceUpdate` und erscheint als generischer
"Update-Fehler".

**S13-12 (Restrisiko).** Der Reset wird freigeschaltet, sobald
`createProfileRecoveryDocument` erfolgreich war und `downloadJsonFile`
aufgerufen wurde. Ein tatsaechlich fehlgeschlagener Browser-Download ist nicht
feststellbar. Der Anspruch "nur nach nachweislich erfolgreichem
Rohdatenexport" ist damit faktisch "nach erfolgreichem Erzeugen des
Dokuments". Das entspricht dem Vorgehen frueherer Slices und ist hier nur
deshalb gewichtiger, weil der Blast-Radius die gesamte Profildatenbank ist
(S13-5).

### 4. Seiteneffekte

**S13-4 (Restrisiko) - D-17 loest DAT-05, erzeugt aber einen neuen stillen
Ersatzwert.** `normalizeBalanceInputs` fuehrt `aktuellesAlter` jetzt immer im
Ergebnis, wodurch `buildProfileEngineInput` das Profilalter uebernimmt statt
das Haushaltsalter stehen zu lassen. Das ist die korrekte Umsetzung von D-17.
Der Fallback ist jedoch `readNumber(inputs.aktuellesAlter, 0)`:

| Profil | Slice 13 | vor Slice 13 |
|---|---|---|
| eigener `profile_aktuelles_alter` 61 | 61 | (Feld fehlte, Haushaltsalter blieb stehen) |
| Balance-Alter 61, kein Override | 61 | dito |
| Override 61, Balance-Alter veraltet 70 | 61 | dito |
| Balance-Inputs ohne Alter, kein Override | **0** | dito |
| nur Overrides, kein Balance-State | **0** | dito |

`persistProfilverbundInputs` schreibt `run.persistedInput` zurueck in das
Profil. Ein Profil ohne hinterlegtes Alter bekommt nach einem einzigen
Haushaltslauf dauerhaft `aktuellesAlter: 0` in seine Balance-Inputs. Wird es
spaeter aktiviert, greift `balance-main.js:202` und die Seite endet stumm im
Zustand `initial_state`. Empfehlung: fehlendes Alter als `null` fuehren und den
Schluessel dann nicht in `buildProfileEngineInput` uebernehmen, oder das
Fehlen als sichtbaren profilbezogenen Blocker melden - aber nicht als 0.

**S13-5 (Restrisiko) - Blast-Radius der Registry-Recovery.** Ein einziger
ungueltiger Eintrag macht die gesamte Registry `corrupt`:

| Registryzustand | Status | Code | `canReset` |
|---|---|---|---|
| ein Eintrag ohne `data`, drei gesunde daneben | `corrupt` | `PROFILE_REGISTRY_ENTRY_INVALID` | `true` |
| ein Eintrag mit `data` als String | `corrupt` | `PROFILE_REGISTRY_ENTRY_INVALID` | `true` |
| `meta.id` widerspricht dem Map-Key | `corrupt` | `PROFILE_REGISTRY_ENTRY_INVALID` | `true` |
| `belongsToHousehold` als String | `corrupt` | `PROFILE_REGISTRY_ENTRY_INVALID` | `true` |
| Registry ohne `version` | `valid` | - | - |
| Registry mit `version: 2` | `corrupt` | `PROFILE_REGISTRY_VERSION_UNSUPPORTED` | `true` |

Der einzige angebotene Ausweg ist der Scope `registry`, und der entfernt die
komplette Registry:

```text
Bootstrap          : recovery | PROFILE_REGISTRY_ENTRY_INVALID | scope: registry
Reset              : {"ok":true,"action":"registry_reset","profileId":"default"}
Profile nach Reset : default        (vorher: default, p2, p3, kaputt)
```

Fuer einen defekten Einzeleintrag existiert kein granularer Reparaturpfad,
obwohl der Scope `profile-field` genau so ein Muster bereits bereitstellt.
Erschwerend: das Recovery-Dokument (`ruhestand-profile-recovery`) hat keinen
Leser - weder im Bundle-Import noch sonst im Repository. Es ist ein reines
Write-only-Artefakt, das der Nutzer von Hand in die Persistenz zurueckbringen
muesste.

Nicht beanstandet: der Rollback in `loadProfileIntoLocalStorage` und
`loadProfileDataIntoLocalStorage` ist vollstaendig - `captureProfileData`
umfasst den Balance-State-Schluessel, und der Rueckweg raeumt vor dem Schreiben
alle profilbezogenen Schluessel. Der Navigations-Handoff bricht bei korrupter
Registry korrekt ab, statt zu navigieren.

### 5. Was koennte brechen?

Am wenigsten durchdacht ist der *Ausgang* aus dem Recoveryzustand. Der Eingang
ist sorgfaeltig modelliert - fuenf Zustaende, getrennte Scopes, TOCTOU-Vergleich,
bestaetigungspflichtiger Reset. Der Ausgang setzt jedoch voraus, dass der
Live-State und die reparierte ID zusammenpassen, und genau diese Annahme
verifiziert `resetProfileRecovery` im Scope `profile-context` nicht: es setzt
`active = current`, ohne die Daten dieses Profils zu laden. Zusammen mit der
Tatsache, dass die Rechenseiten den Recoveryzustand ignorieren, entsteht aus
einer harmlosen Aufraeumaktion des Nutzers ein stiller Datenverlust.

Die zweite ungeprueft gebliebene Bedingung ist die Nebenlaeufigkeit ueber
mehrere Tabs: `lastProfileBootstrapResult` ist Modulzustand. Wird die Registry
in einem zweiten Tab repariert, arbeitet der erste Tab weiter mit einem
veralteten Recoveryobjekt. Der TOCTOU-Vergleich faengt den anschliessenden
Reset ab - der Nutzer bekommt dann aber nur "hat sich seit dem Recovery-Export
geaendert" und keinen Hinweis, dass der Zustand inzwischen gesund ist.

### Findings-Lifecycle

- Uebernommene offene Findings aus vorherigen Slices: keine; Slice 12 wurde mit
  `dbb9db4` committet, dessen Restrisiken U12-1 bis U12-3 sind dort verortet.
- Neu eingefuehrte Blocker: S13-1, S13-2, S13-3.
- Neu eingefuehrte Restrisiken: S13-4 bis S13-12.
- Geschlossene Findings dieses Slice: keine (Erstreview).

### Pre-Mortem

*Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - was ist die wahrscheinlichste Ursache?*

Ein Nutzer loescht ein nicht mehr benoetigtes Profil, arbeitet auf der
Balance-Seite weiter und stellt Wochen spaeter fest, dass sein Hauptprofil die
Vermoegens- und Altersangaben des geloeschten Profils enthaelt. Ursache ist die
verwaiste aktive Profil-ID: Slice 13 erkennt sie, zeigt sie auf den
Rechenseiten aber nicht an und heilt sie dort nicht, waehrend der
`beforeunload`-Hook den fremden Live-State in das aktuelle Profil schreibt.
Weil der Recovery-Export nur die verwaiste ID enthaelt, existiert kein
Artefakt, aus dem sich der verlorene Stand rekonstruieren liesse. Zweitgroesste
Wahrscheinlichkeit: eine als korrupt eingestufte Registry mit genau einem
defekten Eintrag, deren einziger angebotener Reset alle Profile entfernt.

## Review-Ergebnis

- **Status:** blockiert
- **Blocker:**
  - S13-1 - Verwaiste aktive Profil-ID nach gewoehnlichem Profil-Loeschen
    fuehrt sowohl ueber den bestaetigten Reset als auch ohne Nutzerinteraktion
    zum Ueberschreiben eines gesunden Profils mit fremden Live-Daten;
    Regression gegenueber `dbb9db4`, wo derselbe Zustand sich selbst heilte.
  - S13-2 - Der Recoveryzustand ist auf Balance und Simulator unsichtbar; das
    Bootstrap-Ergebnis wird dort verworfen. Das Akzeptanzkriterium zur
    sichtbaren Recovery ist nur fuer die Profilstartseite erfuellt.
  - S13-3 - Der Simulator-Blocker verhindert die Aggregation, nicht den Lauf;
    der Fehlerzweig erzwingt zusaetzlich Aggregatbetrieb und verwirft den
    realen Tranchenbestand.
- **Restrisiken:** S13-4 (Alter 0 statt fehlend), S13-5 (Blast-Radius der
  Registry-Recovery, Recovery-Dokument ohne Leser), S13-6
  (Vorwaertskompatibilitaet als `corrupt` mit Reset), S13-7 (`unavailable`
  unerreichbar, nicht lesbares Backend loest Default-Write aus), S13-8
  (Widerspruch zum Importvertrag aus Slice 12), S13-9 (werfende Getter treffen
  den Tranchen-Manager mit falscher Retry-Meldung), S13-10 (ungeschuetzte
  Profil-Handler), S13-11 (Fehlfaerbung im Ausgaben-Tab), S13-12
  (Exportnachweis ist nur ein Erzeugungsnachweis).
- **Pre-Mortem:** siehe oben - verwaiste aktive Profil-ID nach einem
  Profil-Loeschvorgang, die auf den Rechenseiten unsichtbar bleibt und deren
  Live-State beim naechsten Speichern das aktuelle Profil ueberschreibt.

## Review-Feedback von Gemini

**Review-Datum:** 2026-07-28  
**Reviewer:** Antigravity (Gemini 3.6 Flash)  
**Pruefgegenstand:** Implementierung von Codex auf `codex/suite-datenintegritaet-hardening` für Slice 13 (10 geänderte Programmdateien, 4 Testdateien) sowie das Erstreview von Claude.

### Evaluierung der Prüfdimensionen & Bestätigung der Blocker (S13-1 bis S13-3)

1. **S13-1 (Blocker - Verwaiste aktive Profil-ID führt zu Datenverlust bei gesunden Profilen): BESTÄTIGT.**
   - *Befund:* Nach dem Löschen eines Profils via `deleteProfile("p2")` bleibt `rs_active_profile` auf `"p2"` verwaist. In nachfolgenden Sitzungen wirft `getActiveProfileId()` den Fehler `PROFILE_ACTIVE_GHOST`. Sowohl der Recovery-Reset als auch der `beforeunload`-Hook überschreiben daraufhin den Datenstand des Zielprofils (z. B. `default`) mit den verbliebenen Live-Daten des gelöschten Profils `"p2"`. Dies stellt einen Datenverlust gesunder Profilbestände dar.

2. **S13-2 (Blocker - Recovery-Zustand auf Balance und Simulator unsichtbar): BESTÄTIGT.**
   - *Befund:* `profile-navigation.js` verwirft das Ergebnis von `bootstrapProfileContext()`. Auf den Berechnungsseiten Balance und Simulator wird für Kontext-Fehler (`PROFILE_ACTIVE_GHOST`, `PROFILE_CURRENT_GHOST` etc.) kein Recovery-Blocker gerendert. Das Akzeptanzkriterium der sichtbaren Recovery wird auf diesen Seiten verfehlt.

3. **S13-3 (Blocker - Simulator blockiert die Anzeige, erlaubt aber Simulationsläufe): BESTÄTIGT.**
   - *Befund:* Bei einem Profil-Recovery-Fehler setzt `applySelection` zwar eine Statusanzeige, sperrt jedoch nicht die Buttons für Monte-Carlo, Backtest oder Sweep. Zudem setzt der Fehlerzweig `__profilverbundPreferAggregates = true`, sodass Simulationsläufe mit verworfenen Tranchen und unvollständigen Aggregaten gestartet werden können.

4. **S13-4 bis S13-12 (Restrisiken): BESTÄTIGT.**
   - `aktuellesAlter: 0` als stiller Ersatzwert für Profile ohne hinterlegtes Alter (S13-4).
   - Registry-Recovery löscht bei einem einzelnen defekten Eintrag alle Profile (S13-5).
   - `lastState: null` (aus Slice 12) wird in Slice 13 fälschlicherweise als `corrupt` eingestuft (S13-8).

### Review-Ergebnis (Gemini)

```markdown
## Review-Ergebnis
- Status: blockiert
- Blocker: 
  1. S13-1 (Claude/Gemini): Verwaiste aktive Profil-ID nach Profil-Löschen führt über Reset und `beforeunload` zum Überschreiben gesunder Profile mit fremden Live-Daten.
  2. S13-2 (Claude/Gemini): Recoveryzustand für Kontext-Fehler ist auf Balance und Simulator unsichtbar (Ergebnis von `bootstrapProfileContext` wird verworfen).
  3. S13-3 (Claude/Gemini): Simulator-Blocker sperrt die Simulations-Buttons nicht; Läufe starten mit verworfenen Tranchen auf unvollständigen Aggregaten.
- Restrisiken: 
  1. S13-4 bis S13-12: Alter-0-Fallback, Blast-Radius bei Registry-Reset, Widerspruch zu Slice 12 `lastState: null`.
- Pre-Mortem: Ein Nutzer löscht ein Profil und arbeitet in der App weiter. Der verwaiste `rs_active_profile`-Key führt dazu, dass beim nächsten Speichern oder Reset das Hauptprofil ungefragt mit den alten Daten des gelöschten Profils überschrieben wird.
```

## Technische Blocker-Nachbesserung durch Codex

**Datum:** 2026-07-28

**Reviewerstatus:** unveraendert blockiert bis zum unabhaengigen Re-Review.

- **S13-1:** Das Loeschen des aktuellen beziehungsweise aktiven Profils laedt
  zuerst ein verbleibendes Registryprofil in den Live-State und gleicht danach
  `current` und `active` ab. Jeder Save prueft den Profilkontext frisch und
  weist Ghost- oder Mismatch-Zustaende vor dem Registry-Write ab. Der
  bestaetigte Kontext-Reset ersetzt profilbezogene Live-Daten atomar durch das
  gewaehlte Registryprofil und rollt Live-State sowie beide IDs bei Fehlern
  zurueck.
- **S13-2:** Balance und Simulator pruefen den aktuellen Kontext beim Laden des
  Profilverbunds erneut. Dadurch erreichen `PROFILE_CURRENT_GHOST`,
  `PROFILE_ACTIVE_GHOST` und `PROFILE_CONTEXT_MISMATCH` die vorhandenen
  sichtbaren Recoveryanzeigen auch dann, wenn der Lifecycle-Aufrufer das
  Bootstrap-Ergebnis nicht auswertet.
- **S13-3:** Im Simulator setzt ein Profilfehler einen zentralen
  `__profileRecoveryBlocker`, deaktiviert Monte Carlo, Backtest, Sweep,
  Sweep-Selbsttest, Ergebnisaktionen und Auto-Optimize und umschliesst die
  globalen Startfunktionen mit demselben Gate. Der Fehlerpfad setzt
  `__profilverbundPreferAggregates = false`, sodass er den realen
  Live-Tranchenbestand nicht aktiv verwirft.
- **S13-4:** Ein fehlendes Profilalter bleibt fehlend; `aktuellesAlter` wird nur
  materialisiert, wenn Override oder gespeicherter Balance-Input eine endliche
  Zahl enthalten.
- **S13-8:** `lastState` und `profilverbundHouseholdLastState` duerfen gemaess
  Slice-12-Vertrag `null` oder ein Objekt sein. `inputs` und
  `profilverbundHouseholdInputs` bleiben strikt nicht-null-Objekte.
- **Offen:** S13-5 bis S13-7 sowie S13-9 bis S13-12 wurden durch diese
  Blocker-Nachbesserung nicht vorweggenommen und bleiben Entscheidungen fuer
  das unabhaengige Re-Review beziehungsweise einen Folgeslice.

Technische Gates nach der Nachbesserung:

| Gate | Ergebnis |
|---|---|
| fokussierte Profil-/State-/Profilverbundtests | 397/397 Assertions |
| `npm test` | 8.550/8.550 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles |
| `node tests/browser-smoke.test.mjs` | 22/22 Smokes, Exit 0 |
| `git diff --check` | gruen |
| Dateiscope | weiterhin exakt 10 Programmdateien |
| Verbotene Bereiche | `engine/`, `engine.js`, `workers/`, `dist/`, `src-tauri/` unveraendert |

## Re-Review durch Claude nach der Blocker-Nachbesserung

**Reviewdatum:** 2026-07-28  
**Pruefgegenstand:** Arbeitsbaumstand auf `codex/suite-datenintegritaet-hardening`
ueber `dbb9db4` nach der Nachbesserung zu S13-1 bis S13-4 und S13-8.

### Unabhaengig nachgefahrene Gates

| Gate | Ergebnis |
|---|---|
| `npm test` | 8.550/8.550 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles |
| `npm run test:browser` | **nicht verlaesslich gruen** - Lauf 1 Exit 1 (20 bestanden), Lauf 2 Exit 0 (22/22), Lauf 3 Exit 1 (20 bestanden) |
| `git diff --check` | gruen |
| Dateiscope | weiterhin exakt 10 Programmdateien, alle wie deklariert |
| Verbotene Bereiche | `engine/`, `engine.js`, `workers/`, `dist/`, `src-tauri/` unveraendert |

Die Assertion-Zahl von `npm test` ist bestaetigt. Die Angabe "22/22 Smokes,
Exit 0" reproduziert bei mir in einem von drei Laeufen; siehe T13-3.

### S13-1 - Datenverlust geschlossen, eine Restluecke bleibt

`deleteProfile` laedt jetzt vor dem Registry-Write ein verbleibendes Profil in
den Live-State, `saveCurrentProfileFromLocalStorage` fuehrt einen frischen
Kontext-Preflight, und der Kontext-Reset ersetzt die profilbezogenen Live-Daten
durch das gewaehlte Registryprofil. Alle drei Ketten aus dem Erstreview sind
nachgemessen:

| Kette | Erstreview | jetzt |
|---|---|---|
| A) Loeschen des aktiven Profils | `current/active = default/p2`, Ghost | `default/default`, Live-Tagesgeld `50000` |
| B) Ghost-ID, Unterseite ohne Reset | `beforeunload`-Save schreibt `20000` in `default` | Save **wirft** `PROFILE_ACTIVE_GHOST`, `default.data` bleibt `50000`/`67` |
| C) bestaetigter Kontext-Reset | Live blieb `20000`, Folge-Save ueberschrieb `default` | Reset laedt `default` (Live `20000` nach `50000`), Folge-Save schreibt nichts Fremdes |

`p2.data` bleibt in Kette C unveraendert. Der im Erstreview belegte
Datenverlust ist damit an allen drei Stellen geschlossen.

**T13-1 (Blocker) - dieselbe Fehlerklasse besteht ueber den letzten
Loeschvorgang fort.** `deleteProfile` besitzt einen Kurzschluss:

```js
const remainingIds = Object.keys(registry.profiles).filter(profileId => profileId !== id);
if (!remainingIds.length) {
    return deleteProfileFromRegistry(id, { captureProfileData });
}
```

Dieser Zweig setzt `rs_active_profile` nicht zurueck. Die Loeschfolge ist
ueber die Oberflaeche erlaubt, weil der Delete-Handler nur den Sonderfall
"`default` und nur ein Profil vorhanden" abfaengt:

```text
Ausgangslage            : default + solo, current/active = default/default
deleteProfile("default"): true   -> current/active = solo / solo
deleteProfile("solo")   : true   -> current/active = default / solo
Kontextpruefung         : wirft PROFILE_ACTIVE_GHOST
loadProfilverbundProfiles(): wirft PROFILE_ACTIVE_GHOST
```

Ein Datenverlust entsteht nicht mehr. Stattdessen legt die erlaubte Aktion
Balance und Simulator vollstaendig still - weil die S13-2-Nachbesserung den
Kontext-Preflight genau dort verankert hat. Der Nutzer muss auf der
Profilstartseite eine Recovery-Datei herunterladen und einen als
"Betroffenen Profilbereich wirklich zuruecksetzen?" formulierten Reset
bestaetigen, um einen Buchhaltungsfehler der Anwendung aufzuloesen. Der Weg
funktioniert - gemessen `context_repaired`, danach `current/active =
default/default` und gruener Preflight -, ist fuer die Ursache aber
unverhaeltnismaessig. Der Fix ist trivial: der Kurzschlusszweig muss `active`
genauso behandeln wie der Hauptzweig.

### S13-2 - geschlossen

`loadProfilverbundProfiles()` ruft `assertProfileContextReady()` als erste
Anweisung. Damit erreichen `PROFILE_CURRENT_GHOST`, `PROFILE_ACTIVE_GHOST` und
der neue `PROFILE_CONTEXT_MISMATCH` die bestehenden sichtbaren Blocker in
`balance-main-profile-sync.js`, `balance-main-profilverbund.js`,
`balance-expenses.js` und - ueber `assertProfileContextReady()` in
`applySelectionUnchecked` - im Simulator, ohne dass `profile-navigation.js` das
Bootstrap-Ergebnis auswerten muss. Zwei neue Browser-Smokes (`Balance ghost
profile context`, `Simulator ghost profile context`) belegen das und bestehen
in allen drei meiner Laeufe.

`bootstrapProfileContext` verwendet den strengen Preflight bewusst nicht: bei
`activeId !== currentId` laedt es weiterhin das aktuelle Profil und heilt den
Zustand. Das ist konsistent und erhaelt die Selbstheilung, die im Erstreview
verlorengegangen war.

### S13-3 - teilweise geschlossen

Der Fehlerpfad setzt `__profilverbundPreferAggregates = false` statt `true`,
verwirft den realen Tranchenbestand also nicht mehr aktiv. Ein zentraler
`window.__profileRecoveryBlocker` sperrt acht Startknoepfe und umschliesst
sieben globale Startfunktionen mit einem Gate.

**T13-2 (Blocker) - Auto-Optimize entkommt beiden Schichten.** `ao_run_btn`
ist der einzige der acht gesperrten Knoepfe, der weder ein Action-Gate besitzt
noch gesperrt bleibt:

- `handleRunAutoOptimize` ist ueber `runBtn.addEventListener('click', ...)` an
  eine modul-lokale Funktion gebunden. `PROFILE_RECOVERY_GUARDED_ACTIONS`
  enthaelt nur `window`-Funktionen und erreicht sie nicht.
- `updateRunButtonState()` setzt `runBtn.disabled = !validateAutoOptimizeInputs()`
  und ist an jedes `input`- und `change`-Ereignis der Auto-Optimize-Felder sowie
  an `applyPreset()`, `addParameter()` und `removeParameter()` gebunden. Ein
  Klick auf einen Preset-Knopf genuegt, um die Sperre aufzuheben.
- `auto_optimize_ui.js` prueft `window.__profileRecoveryBlocker` nirgends
  (repository-weit nur drei Treffer, alle in `simulator-main-profiles.js`).

Auto-Optimize fuehrt vollstaendige Simulationslaeufe auf den
Oberflaechenfeldern aus und kann das Ergebnis per "Apply" in die Konfiguration
uebernehmen. Damit bleibt genau der Ergebnispfad offen, den die Nachbesserung
schliessen sollte. Bei `mcButton` und `sweepButton` existieren zwar ebenfalls
Re-Enable-Pfade (`monte-carlo-ui.js` `finishRun`/`enableStart`,
`simulator-sweep.js:396`), dort greift jedoch zusaetzlich das Gate auf
`window.runMonteCarlo` beziehungsweise `window.runParameterSweep`. `btButton`
wird von keiner Stelle wieder freigeschaltet.

Zwei bewusst nicht als Blocker gefuehrte Beobachtungen zum selben Mechanismus:
`installProfileRecoveryActionGuards` laeuft zur `window.onload`-Zeit, alle
sieben Funktionen sind dann bereits zugewiesen (`simulator-main.js:64-70`,
`simulator-sweep.js:409-444`) - die Reihenfolge traegt. Und wird der
Profilkontext erst *nach* einer erfolgreichen `applySelection` korrupt, bleibt
`__profileRecoveryBlocker` null; das ist ein Mehrtabfall und liegt ausserhalb
des Slice-Scopes.

### S13-4 - geschlossen

`normalizeBalanceInputs` fuehrt `aktuellesAlter` nur noch als Schluessel, wenn
Override oder gespeicherter Balance-Input eine endliche Zahl liefern:

| Profil | Schluessel vorhanden | Wert |
|---|---|---|
| Override 61, Balance-Alter 70 | ja | 61 |
| nur Balance-Alter 61 | ja | 61 |
| kein Alter, Balance-Inputs vorhanden | **nein** | - |
| kein Alter, nur Override-Keys | **nein** | - |
| Override leer `""` | **nein** | - |

`buildProfileEngineInput` uebernimmt den Schluessel nur bei `hasOwnProperty`;
ein fehlendes Profilalter faellt damit wieder auf den Haushaltswert zurueck
statt auf 0, und die Persistenz schreibt keine 0 mehr in das Profil. D-17
bleibt erfuellt, weil ein vorhandenes Profilalter das Haushaltsalter weiterhin
schlaegt (70 nach 61 gemessen).

### S13-8 - geschlossen

`lastState` und `profilverbundHouseholdLastState` duerfen `null` oder Objekt
sein, `inputs` und `profilverbundHouseholdInputs` bleiben strikt:

| Nutzlast | Einstufung |
|---|---|
| `{"inputs":{...}}` | `valid` |
| `{"inputs":{...},"lastState":null}` | `valid` |
| `{"lastState":null}` | `valid` |
| `{"inputs":{},"profilverbundHouseholdLastState":null}` | `valid` |
| `{"inputs":{},"profilverbundHouseholdInputs":null}` | `corrupt` |
| `{"inputs":null}` | `corrupt` |
| `{"inputs":{},"lastState":[]}` | `corrupt` |
| `{"inputs":{},"lastState":"x"}` | `corrupt` |
| `null` | `corrupt` |

Der Widerspruch zum Importvertrag aus Slice 12 ist damit aufgeloest, ohne die
Nichtobjekt-Faelle freizugeben.

### T13-3 (Blocker) - das Browsergate ist nicht verlaesslich gruen

Drei aufeinanderfolgende, unveraenderte Laeufe von `npm run test:browser`:

| Lauf | Exit | bestandene Smokes | Abbruch bei |
|---|---|---|---|
| 1 | 1 | 20 | `Balance CSV import roundtrip` |
| 2 | 0 | 22 | - |
| 3 | 1 | 20 | `Balance CSV import roundtrip` |

Die Fehlermeldung ist beide Male identisch: `CSV-Roundtrip muss erfolgreich
abschliessen; Status war:` - das `#error-container`-Element ist zum
Pruefzeitpunkt sichtbar, aber leer. Der Smoke selbst wurde in diesem Slice
nicht angefasst (kein Diff-Treffer in `runBalanceCsvImportRoundtrip`), und die
Smokes sind ueber `createPage` je Fall isoliert, sodass Zustandsverschleppung
aus den neuen Ghost-Smokes ausscheidet. Naheliegend, aber von mir nicht
bewiesen, ist ein Timing-Einfluss der Nachbesserung: die neuen Blocker
beschreiben denselben Container direkt (`container.className = 'error-warn'`),
waehrend `UIRenderer.clearError()` ihn wieder leert, und der Kontext-Preflight
verlaengert jeden Aggregationsdurchlauf (T13-4).

Unabhaengig von der Ursache gilt: ein Gate, das in zwei von drei Laeufen rot
ist, kann eine Blocker-Nachbesserung nicht absichern. Entweder ist die Ursache
ein realer Defekt im CSV-Importpfad, oder die Prueftechnik des Smokes
(`waitFor({state:'visible'})` auf einem Container, den mehrere Schreiber
belegen) ist nach dieser Aenderung nicht mehr tragfaehig. Beides muss vor einer
Freigabe geklaert sein.

### T13-4 (Restrisiko) - Kosten des Kontext-Preflights

Ein einziger `loadProfilverbundProfiles()`-Aufruf bei zwei Profilen, gemessen
ueber einen zaehlenden Storage-Mock:

| Zugriff | vor Slice 13 | mit Nachbesserung |
|---|---|---|
| Registry gelesen und geparst | 3 | 7 |
| `rs_current_profile` | 0 | 1 |
| `rs_active_profile` | 0 | 1 |
| Storage-Zugriffe gesamt | 3 | 9 |

`balance-main.js` ruft die Aggregation pro Update mehrfach auf (Zeile 188 ueber
`syncProfileDerivedInputs`, Zeile 198, im Commit-Pfad Zeile 339 und danach
Zeile 364 ueber `refreshProfilverbundBalance`). Pro debouncetem Tastendruck
entstehen damit rund zwei- bis dreimal so viele vollstaendige
Registry-Validierungen wie zuvor. Das ist fuer sich genommen tragbar, erhoeht
aber die Wahrscheinlichkeit genau der Timingeffekte aus T13-3.

### Unveraendert offene Restrisiken

S13-5 (Blast-Radius der Registry-Recovery, Recovery-Dokument ohne Leser),
S13-6 (neuere Registryversion als `corrupt` mit Reset loeschbar), S13-7
(`unavailable` ueber die Persistenz-Facade unerreichbar, Default-Write bei
nicht lesbarem Backend), S13-9 (werfende Getter treffen den Tranchen-Manager
mit falscher Retry-Meldung), S13-11 (Ausgaben-Tab faerbt einen Profilfehler als
Ausgabenkorruption), S13-12 (Exportnachweis ist nur ein Erzeugungsnachweis).

**S13-10 hat sich verschaerft.** `deleteProfile` wirft jetzt ueber
`assertProfileContextReady()`. Der zugehoerige Handler in
`profile-manager.js:286` ruft `deleteProfile(selectedId)` weiterhin ohne
`try`/`catch`; ein Recoveryfehler bricht den Klickhandler still ab, ohne
Meldung und ohne Recoveryansicht. Dieselbe Luecke besteht fuer den
Create-Handler (`createProfile` plus `switchProfile`) und `refresh()`.

### Findings-Lifecycle

- Geschlossen: S13-2, S13-4, S13-8.
- Teilweise geschlossen: S13-1 (Datenverlust beseitigt, Restluecke T13-1),
  S13-3 (Buttons und globale Aktionen gegated, Restluecke T13-2).
- Neu eingefuehrte Blocker: T13-1, T13-2, T13-3.
- Neu eingefuehrtes Restrisiko: T13-4.
- Unveraendert offen: S13-5, S13-6, S13-7, S13-9, S13-11, S13-12; S13-10 offen
  und verschaerft.

### Pre-Mortem

*Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - was ist die wahrscheinlichste Ursache?*

Ein Nutzer raeumt seine Profile auf und loescht das letzte verbliebene. Beim
naechsten Aufruf rechnen weder Balance noch Simulator: beide melden
"Profil-Recovery erforderlich", obwohl keine einzige Nutzerdatei beschaedigt
ist. Der Ausweg fuehrt ueber einen Download und eine als Datenverlust
formulierte Bestaetigung, was Nutzer erfahrungsgemaess eher zum Abbruch als zur
Reparatur bewegt. Ursache ist der Kurzschlusszweig in `deleteProfile`, der als
einziger Pfad die aktive Profil-ID nicht mitfuehrt - genau die Buchhaltung, die
diese Nachbesserung sonst ueberall nachgezogen hat. Zweitwahrscheinlich: ein
Auto-Optimize-Lauf, der waehrend eines aktiven Profil-Blockers gestartet wird,
weil ein Preset-Klick den Startknopf wieder freigeschaltet hat, und dessen
Ergebnis anschliessend per "Apply" in die Konfiguration uebernommen wird.

## Re-Review-Ergebnis (Claude)

- **Status:** blockiert
- **Blocker:**
  - T13-1 - `deleteProfile` setzt im Kurzschlusszweig fuer das letzte Profil
    `rs_active_profile` nicht zurueck; die ueber die Oberflaeche erlaubte
    Loeschfolge fuehrt zu `PROFILE_ACTIVE_GHOST` und blockiert Balance und
    Simulator vollstaendig.
  - T13-2 - `ao_run_btn` besitzt kein Action-Gate und wird durch jede
    Auto-Optimize-Interaktion wieder freigeschaltet; vollstaendige Laeufe
    bleiben trotz aktivem Profil-Blocker startbar.
  - T13-3 - `npm run test:browser` faellt in zwei von drei Laeufen bei
    `Balance CSV import roundtrip` aus; das Gate kann die Nachbesserung in
    diesem Zustand nicht absichern.
- **Restrisiken:** T13-4 (Registry-Parseaufwand pro Aggregationsaufruf), S13-5,
  S13-6, S13-7, S13-9, S13-10 (verschaerft), S13-11, S13-12.
- **Pre-Mortem:** siehe oben - Loeschen des letzten Profils erzeugt einen
  Ghost-Kontext, der beide Rechenseiten stilllegt und nur ueber Export plus
  bestaetigten Reset aufloesbar ist.

## Zweites Re-Review durch Gemini nach der Blocker-Nachbesserung

**Review-Datum:** 2026-07-28  
**Reviewer:** Antigravity (Gemini 3.6 Flash)  
**Pruefgegenstand:** Blocker-Nachbesserung von Codex auf `codex/suite-datenintegritaet-hardening` für Slice 13 (S13-1 bis S13-4, S13-8) sowie das zweite Re-Review von Claude.

### Evaluierung der Nachbesserung & Bestätigung der verbleibenden Blocker (T13-1 bis T13-3)

Codex hat das primäre Überschreiben von Profildaten (S13-1) und die Unsichtbarkeit auf Balance/Simulator (S13-2) wirksam behoben, jedoch **drei verbleibende Blocker** hinterlassen:

1. **T13-1 (Blocker - `deleteProfile` setzt `rs_active_profile` im Kurzschlusszweig nicht zurück): BESTÄTIGT.**
   - *Befund:* In `app/profile/profile-storage.js` (Zeile 342) springt `deleteProfile` bei `!remainingIds.length` direkt in `deleteProfileFromRegistry(id, ...)`. In `profile-registry.js` (Zeile 456) wird bei der Löschung zwar `CURRENT_PROFILE_KEY` angepasst, der Schlüssel `rs_active_profile` (`ACTIVE_PROFILE_KEY`) bleibt jedoch unberührt auf der gelöschten ID stehen.
   - *Folge:* Die Löschfolge führt beim nächsten Aufruf zu `PROFILE_ACTIVE_GHOST` und blockiert Balance und Simulator vollständig.

2. **T13-2 (Blocker - `ao_run_btn` im Simulator umgeht den Recovery-Blocker): BESTÄTIGT.**
   - *Befund:* `auto_optimize_ui.js` bindet `ao_run_btn` direkt und stellt den Button-Status über `updateRunButtonState()` bei jeder Feldänderung oder Preset-Interaktion wieder her (`runBtn.disabled = false`). Der Button ist nicht durch `installProfileRecoveryActionGuards` geschützt.
   - *Folge:* Bei aktivem Profil-Blocker bleibt der Auto-Optimizer ausführbar und kann unvollständige Simulationsergebnisse erzeugen und anwenden.

3. **T13-3 (Blocker - Instabiles Browsergate): BESTÄTIGT.**
   - *Befund:* `npm run test:browser` ist nicht verlässlich grün (wiederholte Timeouts/Failures bei `Balance CSV import roundtrip`).

### Re-Review-Ergebnis (Gemini)

```markdown
## Review-Ergebnis
- Status: blockiert
- Blocker: 
  1. T13-1 (Claude/Gemini): `deleteProfile` setzt im Kurzschlusszweig `rs_active_profile` nicht zurück; führt zu `PROFILE_ACTIVE_GHOST` und sperrt Balance/Simulator.
  2. T13-2 (Claude/Gemini): Auto-Optimizer-Button (`ao_run_btn`) besitzt kein Action-Gate und wird bei UI-Interaktion wieder freigeschaltet.
  3. T13-3 (Claude/Gemini): Browser-Smokes (`npm run test:browser`) sind flackerig und nicht durchgehend grün.
- Restrisiken: 
  1. T13-4, S13-5, S13-6, S13-7, S13-9, S13-10, S13-11, S13-12: Parse-Aufwand pro Aggregation, Blast-Radius bei Registry-Reset, ungeregelte Exceptions in Profil-Handlern.
- Pre-Mortem: Ein Nutzer löscht das letzte Profil über die Benutzeroberfläche. Wegen des verwaisten `rs_active_profile`-Schlüssels meldet die Anwendung beim nächsten Wechsel auf Balance oder Simulator einen harten Profilkontext-Fehler, der nur durch einen manuellen Reset behoben werden kann.
```

## Zweite technische Blocker-Nachbesserung durch Codex

**Datum:** 2026-07-28

**Reviewerstatus:** unveraendert blockiert bis zum unabhaengigen Re-Review.

- **T13-1:** Nach der Loeschung des letzten benutzerdefinierten Profils wird das
  durch die Registry neu erzeugte Default-Profil geladen. Damit zeigen
  `rs_current_profile`, `rs_active_profile` und der Live-State auf denselben
  frischen Fallback. Ein direkter Witness deckt die gesamte Folge
  `default -> letztes Benutzerprofil -> frisches default` ab.
- **T13-2:** Auto-Optimize ist nicht mehr nur ueber den Zustand des
  `ao_run_btn` abgesichert. Ein Capture-Phase-Gate faengt lokale Run- und
  Apply-Klicks vor den modul-lokalen Handlern ab. Ein `MutationObserver` stellt
  die Sperre wieder her, wenn Presets oder Parameteraenderungen den Run-Button
  freigeben. Der Browser-Witness klickt ein Preset, erzwingt danach einen
  lokalen Run-Klick und weist nach, dass weder `Starting...` noch ein Lauf
  erreicht wird.
- **T13-3:** Der CSV-Smoke wartet auf den fachlichen Abschlussstatus
  `CSV importiert` statt lediglich auf einen bereits sichtbaren, noch leeren
  Mehrzweck-Fehlercontainer. Drei unmittelbar aufeinanderfolgende komplette
  Browserlaeufe waren danach jeweils mit 22/22 Smokes gruen.
- **Unveraendert offen:** T13-4 sowie S13-5 bis S13-7 und S13-9 bis S13-12
  bleiben Restrisiken; diese Nachbesserung nimmt keine Reviewerentscheidung
  dazu vorweg.

Technische Gates:

| Gate | Ergebnis |
|---|---|
| direkter Profil-Loesch-Witness | 230/230 Assertions im Profil-Storage-Test |
| `npm test` | 8.558/8.558 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles |
| `npm run test:browser` | drei aufeinanderfolgende Laeufe mit jeweils 22/22 Smokes |
| `git diff --check` | gruen |
| Dateiscope | weiterhin exakt 10 Programmdateien |
| Verbotene Bereiche | `engine/`, `engine.js`, `workers/`, `dist/`, `src-tauri/` unveraendert |

## Zweites Re-Review durch Claude nach der T13-Nachbesserung

**Reviewdatum:** 2026-07-28  
**Pruefgegenstand:** Arbeitsbaumstand auf `codex/suite-datenintegritaet-hardening`
ueber `dbb9db4` nach der zweiten Nachbesserung zu T13-1 bis T13-3.

### Unabhaengig nachgefahrene Gates

| Gate | Ergebnis |
|---|---|
| `npm test` | 8.558/8.558 Assertions in drei von vier Laeufen; ein Lauf brach mit Exit 139 ab (siehe unten) |
| `npm run test:browser` | **vier von vier Laeufen gruen**, jeweils 22/22 Smokes, Exit 0 |
| `git diff --check` | gruen |
| Dateiscope | weiterhin exakt 10 Programmdateien, alle wie deklariert |
| Verbotene Bereiche | `engine/`, `engine.js`, `workers/`, `dist/`, `src-tauri/` unveraendert |

Zum abgebrochenen Lauf: `npm test` endete einmal mit Exit 139
(Segmentation Fault) waehrend
`tests/monte-carlo-measurement-contract.test.mjs`. Diese Datei ist in Slice 13
unveraendert, importiert keinen Profilbereich und arbeitet mit
`node:worker_threads`; der Abbruch trat in einer Kette unmittelbar vor vier
Playwright-Laeufen auf. Drei direkt anschliessende Wiederholungen waren
gruen (8.558/8.558, Exit 0). Ich fuehre das als Umgebungsflake, nicht als
Slice-Befund - halte es aber fest, weil es auf diesem Stand einmal aufgetreten
ist.

### T13-1 - geschlossen

Der Kurzschlusszweig in `deleteProfile` laedt jetzt nach dem Registry-Write das
von der Registry neu erzeugte Fallback-Profil. Die im letzten Re-Review
belegte Loeschfolge, gemessen:

```text
deleteProfile("default"): true -> current/active = solo / solo
deleteProfile("solo")   : true -> current/active = default / default
Kontextpruefung          : ok, currentId = default
Registry danach          : default
```

`PROFILE_ACTIVE_GHOST` entsteht nicht mehr; Balance und Simulator bleiben
rechenfaehig. Der Profil-Storage-Test deckt die Folge als
`Test 10b: Delete last custom profile reconciles fallback context` direkt ab.

**U13-1 (Restrisiko) - der Fix loescht Arbeitsdaten, ohne das anzukuendigen.**
Weil das neu erzeugte Default-Profil leer ist, raeumt der Fallback-Load alle
profilbezogenen Schluessel ab. Gemessen nach der Loeschfolge:

| Live-Schluessel | Wert danach |
|---|---|
| `profile_tagesgeld` | `null` |
| Balance-State (`CONFIG.STORAGE.LS_KEY`) | `null` |

Fachlich ist das konsistent - es existiert kein Profil mehr, zu dem dieser
Zustand gehoeren koennte -, und der Testfall schreibt es als Sollverhalten
fest. Die Bestaetigungsfrage der Oberflaeche lautet jedoch weiterhin nur
`Profil "X" wirklich loeschen? Dies kann nicht rueckgaengig gemacht werden.`
und erwaehnt nicht, dass damit auch die aktuell sichtbaren Balance-Eingaben
verschwinden. Empfehlung: den Bestaetigungstext fuer den Fall "letztes Profil"
um genau diesen Satz erweitern.

**U13-2 (Restrisiko) - Rueckgabewert im Kurzschlusszweig.** Anders als im
Hauptzweig steht der Fallback-Load hinter dem Registry-Write:

```js
const deleted = deleteProfileFromRegistry(id, { captureProfileData });
if (!deleted) return false;
const fallbackId = getCurrentProfileId();
if (!loadProfileIntoLocalStorage(fallbackId)) return false;
```

Schlaegt der Load fehl, ist das Profil bereits geloescht, der Aufrufer erhaelt
aber `false` und die Profilseite meldet "Loeschen fehlgeschlagen". Im
Normalfall nicht erreichbar (gemessene Rueckgabe `true`), aber die Aussage der
Meldung waere im Fehlerfall falsch.

### T13-2 - geschlossen

Auto-Optimize haengt nicht mehr allein am Buttonzustand. Zwei Schichten:

- Ein Capture-Phase-Listener auf `document` faengt Klicks auf `#ao_run_btn` und
  `#ao_apply_btn` bei aktivem `__profileRecoveryBlocker` ab und beendet die
  Ausbreitung mit `stopImmediatePropagation()`, bevor die modul-lokalen
  Handler in `auto_optimize_ui.js` erreicht werden.
- Ein `MutationObserver` auf dem `disabled`-Attribut von `ao_run_btn` stellt
  die Sperre wieder her, sobald `updateRunButtonState()` sie aufhebt.
- `ao_apply_btn` ist zusaetzlich in die Liste der gesperrten Bedienelemente
  aufgenommen worden.

Der Browser-Witness prueft die vollstaendige Kette: Preset-Klick, Warten bis
`ao_run_btn` wieder gesperrt ist, erzwungener Klick auf den Run-Button, Anstieg
des Blockzaehlers, danach `ao_run_btn` weiterhin gesperrt und `ao_progress`
nicht auf `Starting...`. Die Reihenfolge traegt auch fuer die sieben globalen
Aktionen, weil `simulator-main.js:64-70` und `simulator-sweep.js:409-444` ihre
`window`-Zuweisungen zur Modulauswertungszeit vornehmen und
`initSimulatorProfileSelection()` erst in `window.onload` laeuft.

**U13-3 (Restrisiko) - die zweite Schicht ist auf zwei Bedienelemente
begrenzt.** Der Capture-Selektor lautet `'#ao_run_btn, #ao_apply_btn'`.
`btButton` ist der einzige weitere Startknopf, der an eine modul-lokale
Funktion gebunden ist (`simulator-backtest.js:357`, Aufruf von `runBacktest()`
statt `window.runBacktest`), und faellt damit ausschliesslich unter die
`disabled`-Sperre. Heute traegt das, weil ihn kein Pfad wieder freischaltet -
`simulator-backtest.js:262` liegt im `finally` von `runBacktest` und wird ohne
vorherigen Start nicht erreicht. Es ist aber dieselbe Konstruktion, die bei
`ao_run_btn` gebrochen ist, nur ohne aktuellen Ausloeser.

**U13-4 (Restrisiko) - Testinstrumentierung im Produktivpfad.**
`window.__profileRecoveryBlockedActionCount` existiert ausschliesslich, damit
der Browser-Witness auf den Blockvorgang warten kann. Das Muster ist im
Repository nicht neu (`window.__profilverbund*`), erweitert aber die Menge
globaler Testhaken im Auslieferungspfad.

### T13-3 - geschlossen, mit einer Einschraenkung

Vier aufeinanderfolgende, unveraenderte Laeufe von `npm run test:browser`
waren gruen (22/22, Exit 0). Die im letzten Re-Review gemessene Quote von zwei
Fehlschlaegen in drei Laeufen ist damit beseitigt.

Die Korrektur liegt jedoch im Test, nicht im Produkt:

```js
const csvImportStatus = page.locator('#error-container')
    .filter({ hasText: 'CSV importiert' });
```

Statt auf die Sichtbarkeit eines Mehrzweckcontainers zu warten und danach
dessen Text zu lesen, wartet der Smoke jetzt auf den fachlichen
Abschlussstatus. Das ist die strengere und richtige Wartebedingung; die alte
Formulierung war ein Race.

**U13-5 (Restrisiko).** Die Ursache des Symptoms bleibt unermittelt. Damit der
alte Test scheiterte, musste `#error-container` zwischen `waitFor visible` und
`textContent()` von einem Inhalt auf leer wechseln - er hatte also kurz vorher
Inhalt. Ob dabei ein Profil-Recovery-Blocker oder eine andere Meldung
aufblitzte, laesst sich aus den Logs nicht entscheiden, und der praezisierte
Smoke kann ein solches Aufblitzen kuenftig nicht mehr aufdecken. Ich stufe das
als Restrisiko und nicht als Blocker ein, weil kein funktionaler Schaden
belegbar ist und die neue Assertion fachlich mehr prueft als die alte.

### Unveraendert offene Restrisiken

**T13-4** ist unveraendert; nachgemessen bleibt es bei sieben statt drei
Registry-Lesevorgaengen und neun statt drei Storage-Zugriffen je
`loadProfilverbundProfiles()`-Aufruf.

**S13-5** (Blast-Radius der Registry-Recovery, Recovery-Dokument ohne Leser),
**S13-6** (neuere Registryversion als `corrupt` mit Reset loeschbar),
**S13-7** (`unavailable` ueber die Persistenz-Facade unerreichbar,
Default-Write bei nicht lesbarem Backend), **S13-9** (werfende Getter treffen
den Tranchen-Manager mit falscher Retry-Meldung), **S13-10** (Create-, Rename-
und Delete-Handler ohne Recovery-Catch; `profile-manager.js:286` ruft
`deleteProfile(selectedId)` weiterhin ungeschuetzt, obwohl die Funktion jetzt
wirft), **S13-11** (Ausgaben-Tab faerbt einen Profilfehler als
Ausgabenkorruption) und **S13-12** (Exportnachweis ist nur ein
Erzeugungsnachweis) bestehen unveraendert.

### Findings-Lifecycle

- Geschlossen in diesem Durchgang: T13-1, T13-2, T13-3.
- Zuvor geschlossen: S13-2, S13-4, S13-8; S13-1 und S13-3 damit vollstaendig
  geschlossen.
- Neu eingefuehrte Restrisiken: U13-1 bis U13-5.
- Neu eingefuehrte Blocker: keine.
- Unveraendert offen: T13-4, S13-5, S13-6, S13-7, S13-9, S13-10, S13-11,
  S13-12.

### Pre-Mortem

*Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - was ist die wahrscheinlichste Ursache?*

Ein Nutzer loescht sein letztes Profil, weil er neu anfangen will, und
verliert damit unangekuendigt auch die aktuell eingetragenen Balance-Zahlen:
der Fallback-Load raeumt alle profilbezogenen Schluessel ab, waehrend die
Bestaetigungsfrage nur vom Profil spricht. Zweitwahrscheinlich: eine spaetere
Aenderung fuehrt einen Pfad ein, der `btButton` waehrend eines aktiven
Profil-Blockers wieder freischaltet - dort greift nur die `disabled`-Sperre,
weil das Capture-Gate ausschliesslich die beiden Auto-Optimize-Knoepfe kennt.
Drittens bleibt der groesste unangetastete Restposten S13-5: ein einzelner
defekter Registryeintrag laesst als einzige angebotene Reparatur das Loeschen
aller Profile zu, und das dabei erzeugte Recovery-Dokument besitzt im gesamten
Repository keinen Leser.

## Zweites Re-Review-Ergebnis (Claude)

- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** U13-1 (unangekuendigtes Leeren des Live-States beim Loeschen
  des letzten Profils), U13-2 (irrefuehrende Fehlermeldung im Kurzschlusszweig),
  U13-3 (Capture-Gate deckt `btButton` nicht ab), U13-4 (Testhaken im
  Produktivpfad), U13-5 (T13-3 im Test statt im Produkt behoben, Ursache
  unermittelt), T13-4 (Registry-Parseaufwand), S13-5, S13-6, S13-7, S13-9,
  S13-10, S13-11, S13-12.
- **Pre-Mortem:** siehe oben - unangekuendigter Verlust der Live-Balance-Daten
  beim Loeschen des letzten Profils.

Die Freigabe bezieht sich auf die Behebung der dokumentierten Blocker S13-1 bis
S13-4, S13-8 sowie T13-1 bis T13-3 und auf die Einhaltung des deklarierten
Scopes. Sie umfasst nicht die weiterhin offenen Restrisiken; deren Behandlung
ist eine Nutzer- beziehungsweise Planungsentscheidung, insbesondere fuer S13-5
und S13-7, die beide den Anspruch von D-09 nur teilweise erfuellen.
