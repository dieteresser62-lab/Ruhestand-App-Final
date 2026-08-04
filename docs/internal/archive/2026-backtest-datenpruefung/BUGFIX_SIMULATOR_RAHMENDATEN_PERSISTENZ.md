# Bugfix: Simulator-Rahmendaten bleiben nach Neuaufruf erhalten

**Stand:** 2026-08-04  
**Branch:** `codex/suite-datenintegritaet-hardening`  
**GitHub-Status:** bestehender Feature-Branch; Veröffentlichung dieses Bugfixes ausstehend  
**Status:** Claude-Runde-4 technisch nachgebessert; erneute externe Prüfung ausstehend

## Fehlerbild

Die editierbaren Rahmendaten `Floor-Bedarf p.a.`, `Flex-Bedarf p.a.` und
`Mindest-Flex p.a.` erschienen nach einem Neuaufruf nicht zuverlässig mit den
zuletzt eingegebenen Werten. Stattdessen setzte die Profilverbund-Initialisierung
erneut aus den aktiven Profilen aggregierte Werte in die Felder ein.

## Ursache

Die zentrale Eingabepersistenz stellte die drei Werte zunächst korrekt wieder
her. Später im selben Initialisierungslauf rief der Simulator jedoch die
Profilverbund-Aggregation auf. `applyCombinedInputsToUI()` überschrieb die bereits
wiederhergestellten DOM-Werte bedingungslos mit den Profil-Summen.

Die bisherigen Schlüssel `sim_startFloorBedarf`, `sim_startFlexBedarf` und
`sim_minimumFlexAnnual` gehören außerdem zum profilbezogenen Speicherbereich.
Eine manuelle Änderung am aggregierten Haushaltswert konnte dadurch beim
Speichern dem aktuellen Einzelprofil zugeschlagen und bei einem späteren
Profilverbund-Aufbau nochmals addiert werden.

## Ziel und Akzeptanzkriterien

1. Eine manuelle Änderung an allen drei Feldern erscheint nach einem echten
   Seiten-Neuaufruf numerisch exakt wieder; zulässige alternative Schreibweisen
   werden verlustfrei in die kanonische Dezimaldarstellung überführt.
2. Die Profilverbund-Initialisierung überschreibt einen vorhandenen manuellen
   Haushaltswert nicht.
3. Ohne manuellen Haushaltswert bleiben die bestehenden additiven Profil-Summen
   der Default.
4. Die drei manuellen Werte werden nicht mehr als Daten eines Einzelprofils
   gespeichert.
5. Der Simulator-Reset deaktiviert den Haushalts-Override dauerhaft und stellt
   nach abgeschlossenem Persistenz-Flush die aktuellen Profil-Summen wieder her.
6. Ein beschädigter Override führt kontrolliert zum bestehenden Profil-Default
   und nicht zu einem Startabbruch.
7. Im Einprofil-Haushalt werden vollständige und gültige `sim_`-Altwerte beim
   ersten Start nur dann einmalig als Haushalts-Override übernommen, wenn sie von
   den aktuellen Profildefaults abweichen. Im Mehrprofil-Haushalt findet keine
   automatische Migration statt.
8. Leere, negative, nichtnumerische oder inkonsistente Werte werden nicht
   persistiert; eine unbekannte Schemaversion wird sichtbar gemeldet.
9. Ein Override gilt nur für tatsächlich bearbeitete Felder. Ein reiner
   Floor-Override verwirft daher nicht die Mindest-Flex-Profilaufschlüsselung.
10. Leere Balance-Felder löschen keinen vorhandenen positiven Profilfallback.
11. Eine gültige Feldänderung wird unabhängig von ungültigen Nachbarfeldern
    gespeichert; das tatsächlich ungültige Feld erzeugt eine sichtbare Meldung.
12. Legacy-Auswahl, Schadensheilung und Reset-Fehlerpfad sind deterministisch und
    sichtbar, ohne von dem gerade geöffneten Einzelprofil abzuhängen.
13. Einzelprofilwerte werden in einem Mehrprofil-Haushalt niemals automatisch
    zum Haushaltsbedarf erklärt; die aggregierte Profilbasis bleibt erhalten.
14. Die wirksame Mindest-Flex-/Flex-Invariante gilt auch bei Teil-Overrides,
    Präzisionsverlust wird sichtbar abgewiesen und Eingabefehler erscheinen
    direkt am betroffenen Feld.
15. Eine gültige Flex-/Mindest-Flex-Änderung wird bei einem vorübergehend leeren
    Nachbarfeld gegen dessen letzten wirksamen Wert geprüft und sofort gespeichert.
16. Unbekannte zukünftige Datensätze bleiben auch bei einem Eingabeversuch
    bytegleich erhalten; eine Änderung erfordert einen bewussten Reset.

## Scope und Nicht-Scope

Geplante Programmdateien:

- `app/simulator/simulator-household-needs-persistence.js`
- `app/simulator/simulator-main-input-persist.js`
- `app/simulator/simulator-main-profiles.js`
- `app/simulator/simulator-main-reset.js`
- `app/simulator/simulator-profile-inputs.js`
- `app/shared/persistence-key-policy.js`

Geplante Tests:

- `tests/simulator-ui-orchestration.test.mjs`
- `tests/simulator-household-needs-persistence.test.mjs`
- `tests/simulator-multiprofile-aggregation.test.mjs`
- `tests/browser-smoke.test.mjs`
- `tests/snapshot-key-policy.test.mjs`
- `tests/profile-storage.test.mjs`

Nicht im Scope:

- fachliche Änderung von Floor-, Flex- oder Mindest-Flex-Berechnung;
- Änderung der Engine-Semantik;
- automatische Verteilung eines manuellen Haushaltswerts auf Einzelprofile;
- Änderung anderer Simulator-Rahmendaten.

## Preflight und Diff-Risiko

Vor Coding geprüft:

- aktiver Branch: `codex/suite-datenintegritaet-hardening`;
- `git status --short`: ausschließlich die bereits vorhandene, nicht zum
  Bugfix gehörende Benutzeränderung `RuheStandSuite.exe`;
- Branch passt zum laufenden Simulator-/Datenintegritäts-Hardening;
- sechs Programmdateien liegen unter der Stop-Grenze von zehn;
- Engine-Contracts werden nicht verändert.

Voraussichtliche Änderungstiefe: klein bis mittel.  
Gefährdete Tests: Simulator-UI-Orchestrierung, Profilverbund-Aufbau,
Persistenz-Backup/Restore, Browser-Smoke.  
Nicht anfassen: `engine.js`, `dist/`, `RuheStandSuite.exe`, Engine-Fachlogik.  
Rollback: gezieltes Zurücksetzen der oben genannten Programm- und Testdateien;
die neue MD nur nach ausdrücklicher Freigabe entfernen.

## Geplante Lösung

Die drei Werte erhalten einen versionierten Haushalts-Override außerhalb des
profilbezogenen `sim_`-/`sim.`-Namensraums. Der Datensatz unterscheidet zwischen
`profile_default` und `override` und führt in `overriddenFields` die tatsächlich
bearbeiteten Felder. Beim Start gilt folgende Präzedenz:

1. gültiger manueller Haushalts-Override;
2. andernfalls bestehende Summe der aktiven Profile.

Existiert der neue Datensatz noch nicht, legt die Eingabepersistenz zunächst den
Zustand `migration_pending` an. Nur im Einprofil-Haushalt wird anschließend ein
vollständiges und gültiges historisches `sim_`-Trio einmalig übernommen und
sichtbar gemeldet. Im Mehrprofil-Haushalt wird grundsätzlich nicht geraten;
die aggregierte Profilbasis bleibt wirksam. Danach verhindert ein persistierter
`profile_default`-Marker jede erneute Legacy-Migration. Profildefaults stammen
vorrangig aus positiven aktuellen Balance-Werten; historische `sim_`-Werte sind
Lesefallback für fehlende oder als `0` gespeicherte Balance-Werte.

Der Datensatz wird in Backups aufgenommen. Der Simulator-Reset schreibt den
`profile_default`-Marker, wartet auf den IndexedDB-Flush und lädt erst danach neu.
Nur bei einem ausdrücklich überschriebenen Mindest-Flex wird keine erfundene
Verteilung auf Einzelprofile ausgewiesen.

## Durchführung und Testergebnisse

Umgesetzt wurde der versionierte globale Schlüssel
`household_simulator_needs_v1`. Ein Override enthält ausschließlich die
tatsächlich bearbeiteten Eingaben als kanonische Dezimalstrings und zusätzlich
die feldbezogene Provenienz in `overriddenFields`. Frühere V1-Datensätze mit
vollständigem Snapshot bleiben lesbar. Der Override wird deshalb nicht vom
Profilwechsel erfasst oder in ein Einzelprofil zurückgeschrieben.

- `initInputPersistence()` erstellt unabhängig vom Profilpfad früh den globalen
  `migration_pending`-Vertrag. Die Profilverbund-Initialisierung übernimmt einen
  Legacy-Kandidaten nur im sicher zuordenbaren Einprofil-Haushalt; bei mehreren
  Profilen bleibt die Summe maßgeblich und die Nichtübernahme wird einmalig
  sichtbar erklärt.
- Jede bearbeitete Eingabe wird unabhängig normalisiert. Leerzeichen, deutsches
  Dezimalkomma, führende Dezimalpunkte und wissenschaftliche Schreibweise werden
  in einen nichtnegativen Dezimalstring kanonisiert. Nicht exakt als JavaScript-
  Zahl darstellbare Großwerte werden statt stiller Rundung sichtbar abgewiesen.
  Ein ungültiges bearbeitetes Feld wird nicht gespeichert und über die native
  Browservalidierung direkt am Feld gemeldet; es blockiert
  keine gültige Änderung an einem anderen Feld.
- Bei Änderungen an Flex oder Mindest-Flex wird die Invariante gegen beide
  aktuell wirksamen Werte geprüft. Ist das Nachbarfeld während der Bearbeitung
  leer, dient sein von der Profilinitialisierung gesetzter letzter wirksamer Wert
  als Prüfbasis. Eine für sich gültige Änderung wird dadurch sofort gespeichert
  und nach Korrektur des Nachbarfelds nicht verloren. Ein Flex unter dem
  wirksamen Mindest-Flex kann weiterhin nicht persistiert werden.
- `applyCombinedInputsToUI()` verwendet den Override mit Vorrang vor der
  Profil-Summe. Fehlt er, ist sein Vertrag beschädigt oder seine Version
  unbekannt, bleibt die Profilaggregation der Default; Schäden und unbekannte
  Versionen erscheinen im Profilstatus.
- Die Profilaggregation verwendet positive Balance-Bedarfswerte vor historischen
  `sim_`-Werten. Als `0` gespeicherte Leerfelder erhalten dagegen den positiven
  Legacy-Fallback, insbesondere beim optionalen Mindest-Flex.
- Nur bei manuell überschriebenem Mindest-Flex wird
  `__profilverbundMinimumFlexProfiles` auf `null` gesetzt. Der Simulator erfindet
  keine fachlich nicht belegte Verteilung auf Dieter und Karin; reine Floor- oder
  Flex-Overrides behalten die Aufschlüsselung.
- Der Schlüssel ist fachlich-global und wird von Standard- und Vollbackups
  erfasst. Der Reset deaktiviert ihn mit einem `profile_default`-Marker und
  wartet vor dem Reload auf den Persistenz-Flush. Ein Flush-Fehler verhindert
  den Reload, reaktiviert den Button und erscheint sichtbar im Profilstatus.
- Beschädigte V1-Daten und alte dauerhafte `legacy_invalid`-Marker werden beim
  Start nach einer einmaligen sichtbaren Warnung auf einen sauberen
  `profile_default`-Marker geheilt. Unbekannte zukünftige Versionen werden nicht
  verändert.
- Für eine unbekannte zukünftige Version bleibt der Datensatz bytegleich
  erhalten. Ein separater globaler Warnungsmarker quittiert die Meldung nach der
  ersten Anzeige, ohne den unbekannten Datensatz umzuschreiben. Auch manuelle
  Schreibversuche werden mit sichtbarer Reset-Anweisung abgewiesen.
- `setCustomValidity()` hält die Meldung direkt am Feld; `reportValidity()` wird
  erst beim abschließenden `change`-Ereignis aufgerufen, nicht bei jedem
  Tastendruck im laufenden `input`-Ereignis.

Ausgeführte Nachweise:

| Nachweis | Ergebnis |
|---|---:|
| `tests/simulator-household-needs-persistence.test.mjs` | 73/73 Assertions |
| `tests/simulator-ui-orchestration.test.mjs` | 83/83 Assertions |
| `tests/snapshot-key-policy.test.mjs` | 32/32 Assertions |
| `tests/profile-storage.test.mjs` | 255/255 Assertions |
| `tests/persistence.test.mjs` | 315/315 Assertions |
| `tests/simulator-multiprofile-aggregation.test.mjs` | 85/85 Assertions |
| `npm run test:browser` | 29/29 Browser-Smokes, einschließlich echtem Zwei-Profil-Reload |
| `npm test` | zweimal isoliert: jeweils 167 Dateien, 18.943/18.943 Assertions, 0 Fehler, 0 offene Handles |

Der Browser-Regressionsfall startet mit historischen Werten in zwei Profilen und
weist nach, dass sie nicht als einzelner Haushaltswert übernommen werden: Es
erscheinen die aggregierten 24.000 / 60.000 / 30.000 EUR samt sichtbarem Hinweis.
Nach manueller Eingabe von
25.000 / 140.000 / 55.000 EUR erscheinen exakt diese Werte nach dem Reload,
ohne Dieters Einzelprofildaten umzuschreiben. Der Reset wartet auf die
Persistenz und stellt 24.000 / 60.000 / 30.000 EUR aus den aktuellen
Balance-Werten her. Danach belegt ein reiner Floor-Override, dass Flex,
Mindest-Flex und dessen Profilaufschlüsselung unverändert bleiben. Auch der
sichtbare Fallback einer unbekannten V2 sowie der bytegleiche Erhalt dieses
Datensatzes bei einem anschließenden Eingabeversuch werden im Browser geprüft.

## Abweichungen und offene Risiken

Die Persistenzlogik liegt im kleinen DOM-freien Modul
`simulator-household-needs-persistence.js`. Die zusätzlich notwendige Korrektur
der Profilpräzedenz betrifft `simulator-profile-inputs.js`; damit sind sechs
Programmdateien betroffen. Die Stop-Grenze bleibt eingehalten.

Bestehende profilbezogene Altwerte werden nicht gelöscht. Nur ein gültiger
Kandidat aus einem Einprofil-Haushalt wird einmalig in den neuen Vertrag
übernommen. Mehrprofil-Kandidaten führen unabhängig von Gleichheit oder
Reihenfolge kontrolliert zum aggregierten Profil-Default und zu einer einmaligen
Warnung; unvollständige alte Einzelwerte, die durch die frühere
Profilaggregation ohnehin nie wirksam waren, erzeugen keine Dauerwarnung. Nach
Reset wird nicht erneut migriert.

Der Override gehört zum Haushalt und bleibt daher auch bestehen, wenn die
Profilverbund-Auswahl geändert wird. Eine automatische Neuverteilung auf
Einzelprofile wäre ohne zusätzliche Nutzerentscheidung fachlich nicht
begründbar und ist bewusst nicht Bestandteil dieses Bugfixes.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| U-01 | Nutzer | Floor/Flex/Mindest-Flex erscheinen nach Neuaufruf nicht wie zuvor | angenommen | Haushalts-Override, Reset-, Backup- und Reload-Regression umgesetzt; externe Freigabe ausstehend |
| CB-1 | Claude (Runde 1) | Blocker: bestehende `sim_`-Altwerte werden ab dem Update ignoriert, ohne Einmal-Uebernahme | technisch behoben | Einmalmigration mit vollständiger Validierung und Browser-/Unit-Nachweis |
| CB-2 | Claude (Runde 1) | Blocker: die drei profilbezogenen `sim_`-Werte haben keinen Schreiber mehr und frieren fuer Bestandsprofile ein | technisch behoben | positive Balance-Werte sind autoritativ; `sim_` bleibt Null-/Fehlwert-Fallback |
| CB-3 | Claude (Runde 1) | Blocker: ein leerer Override wird dauerhaft festgeschrieben und leert das Bedarfsfeld | technisch behoben | nur das bearbeitete gültige Feld wird gespeichert; leere Eingaben werden sichtbar abgewiesen |
| CB-4 | Claude (Runde 1) | Blocker: Modulreferenz nicht aktualisiert (Dokumentations-Sync in `AGENTS.md`) | technisch behoben | Simulator-Modulreferenz und Architekturkonzept synchronisiert |
| CB-5 | Claude (Runde 1) | Restrisiko: `minimumFlexProfiles` wird auch bei reiner Floor-Aenderung verworfen | technisch behoben | feldbezogene `overriddenFields`; Browsernachweis für reinen Floor-Override |
| CB-6 | Claude (Runde 1) | Restrisiko: semantisch beschaedigter Override passiert den Schemacontract | technisch behoben | striktes Dezimalformat, Endlichkeit, Nichtnegativität und Mindest-Flex-Relation |
| CB-7 | Claude (Runde 1) | Restrisiko: die Kernpraezedenz ist ausschliesslich im Browser-Gate abgesichert | technisch behoben | neuer DOM-freier Standardtest mit Migrations-, Schreib- und Präzedenzfällen |
| CB-8 | Claude (Runde 1) | Restrisiko: Schemaversion-Pruefung ist tolerant, ein kuenftiges v2 verliert die Werte still | technisch behoben | exakter numerischer V1-Vertrag; unbekannte Version bleibt unangetastet und wird sichtbar gemeldet |
| CB-28 | Claude (Runde 5) | Restrisiko: der Fallback auf den letzten wirksamen Nachbarwert ist ausschliesslich im Browser-Gate abgesichert | offen | ausstehend |
| CB-29 | Claude (Runde 5) | Restrisiko: nach einem angenommenen Schreibvorgang bleibt das geleerte Nachbarfeld leer; die Simulation rechnet in derselben Sitzung mit 0 | offen | ausstehend |
| CB-30 | Claude (Runde 5) | Restrisiko: ein Zukunftsdatensatz sperrt jede Aenderung der drei Felder und verweist auf den vollstaendigen Simulator-Reset | offen | ausstehend |
| CB-31 | Claude (Runde 5) | Hinweis: die Aktualisierung von `householdNeedLastValidValue` nach erfolgreichem Schreiben ist ohne beobachtbare Wirkung | offen | ausstehend |
| CB-22 | Claude (Runde 4) | Blocker: eine wegen eines ungueltigen Nachbarfelds abgelehnte Eingabe bleibt sichtbar stehen, wird nicht nachgeholt und ist nach dem Neuaufruf verloren | technisch behoben | gültige Änderung wird gegen den letzten wirksamen Nachbarwert sofort gespeichert; Unit-, UI- und echter Reload-Test bilden die exakte Eingabefolge ab |
| CB-23 | Claude (Runde 4) | Restrisiko: ein unbekannter V2-Datensatz wird beim ersten gueltigen Schreibvorgang ueberschrieben | technisch behoben | `unsupported` blockiert jeden V1-Schreibversuch sichtbar und erhält den Rohdatensatz |
| CB-24 | Claude (Runde 4) | Restrisiko: der Einprofil-Zweig migriert auch ein Trio, das den Profil-Defaults entspricht, und friert die Felder ein | technisch behoben | Einprofil-Migration setzt jetzt `differsFromDefaults` voraus |
| CB-25 | Claude (Runde 4) | Restrisiko: AK7 widerspricht AK13 und der Umsetzung; im Mehrprofil-Haushalt wird nie migriert | technisch behoben | AK7 ausdrücklich auf abweichende Einprofil-Altwerte begrenzt |
| CB-26 | Claude (Runde 4) | Restrisiko: `reportValidity()` bei jedem Eingabeereignis zieht den Fokus und kann die laufende Eingabe unterbrechen | technisch behoben | Custom Validity bei `input`, Report erst bei `change`; Fokusunterbrechung ist ausgeschlossen und getestet |
| CB-27 | Claude (Runde 4) | Hinweis: ein `npm test`-Lauf brach mit Exitcode 5 ohne Testfehler ab; der Wiederholungslauf war gruen | geklärt | zwei aufeinanderfolgende isolierte Gesamtläufe mit jeweils 18.943/18.943 und Exitcode 0 |
| CB-16 | Claude (Runde 3) | Blocker: die Legacy-Auswahl kann einen Einzelprofilwert zum Haushaltswert erklaeren und den Bedarf halbieren; die Uebernahme wird nicht gemeldet | technisch behoben | automatische Migration nur bei einem Profil; Mehrprofil-Gleichwerte und -Abweichungen werden nie übernommen und sind getestet |
| CB-17 | Claude (Runde 3) | Restrisiko: die Mindest-Flex-Invariante greift nur zwischen zwei Overrides und erzeugt eine Bediensackgasse | technisch behoben | Flex-/Mindest-Flex-Schreibvorgänge prüfen beide aktuell wirksamen Feldwerte |
| CB-18 | Claude (Runde 3) | Restrisiko: die Kanonisierung sehr grosser Zahlen aendert den Wert still | technisch behoben | exakte textuelle Exponentenexpansion plus Roundtrip-Prüfung; Präzisionsverlust wird sichtbar abgewiesen |
| CB-19 | Claude (Runde 3) | Restrisiko: eine unbekannte Zukunftsversion warnt dauerhaft und nicht quittierbar | technisch behoben | separater globaler Acknowledgement-Key unter Erhalt des unbekannten Rohdatensatzes |
| CB-20 | Claude (Runde 3) | Restrisiko: die Erstmigration haengt jetzt am Profilverbund-Pfad | technisch behoben | `migration_pending` entsteht vor dem Profilpfad; fehlender Profilverbund blockiert Simulationen sichtbar statt mit leeren Bedarfsfeldern weiterzulaufen |
| CB-21 | Claude (Runde 3) | Hinweis: die Profilstatuszeile wird als Fehlerkanal der Eingabepersistenz mitbenutzt | technisch behoben | native `setCustomValidity`-/`reportValidity`-Meldung am betroffenen Feld; kein Statuszeilen-Restore mehr |
| CB-10 | Claude (Runde 2) | Blocker: der CB-2-Fix laesst den Profil-Default auf 0 fallen, sobald ein Balance-Bedarfsfeld leer ist | technisch behoben | nur positive Balance-Werte sind autoritativ; Null-/Teilfälle besitzen Standardtests |
| CB-11 | Claude (Runde 2) | Blocker: ein abgelehnter Schreibvorgang verwirft eine gueltige Nutzeraenderung ohne jedes Signal | technisch behoben | feldunabhängige Normalisierung und sichtbarer Fehlerstatus; gültige Nachbaränderung bleibt speicherbar |
| CB-12 | Claude (Runde 2) | Restrisiko: Legacy- und Schadenswarnungen bleiben dauerhaft und heilen nicht selbst | technisch behoben | beschädigte V1- und alte Legacy-Marker heilen nach einmaliger Warnung zum sauberen Default |
| CB-13 | Claude (Runde 2) | Restrisiko: der async Reset-Handler hat keinen Fehlerpfad fuer einen fehlgeschlagenen Flush | technisch behoben | Catch-Pfad mit sichtbarer Meldung, ohne Reload und mit erneut aktivem Reset |
| CB-14 | Claude (Runde 2) | Restrisiko: die einmalige Migration liest das gerade aktive Profil | technisch behoben | deterministische Auswahl über alle aktiven Haushaltsprofile; Reihenfolge ist getestet |
| CB-15 | Claude (Runde 2) | Hinweis: `readHouseholdSimulatorNeeds` hat keinen Produktivkonsumenten mehr | technisch behoben | ungenutzte Wrapper-API entfernt |
| CB-9 | Claude (Runde 1) | Hinweis: `applyCombinedInputsToUI` wurde ohne Konsument exportiert | technisch behoben | unnötigen Export entfernt; reine Resolver-Funktion ist der getestete Vertrag |

## Review-Feedback von Claude (Runde 5)

### Pruefgegenstand und Verifikationsbasis

Geprueft wurde der Arbeitsstand nach der vierten Nachbesserung: sechs
Programmdateien, sechs Test- und drei Dokumentationsdateien, zusammen 551
Einfuegungen und 33 Loeschungen ausserhalb der Binaerdatei. Alle Proben und
Mutationen liefen in einem Wegwerf-Klon des Arbeitsbaums unter `%TEMP%`; keine
Projektdatei wurde dafuer veraendert. Der in Runde 4 beanstandete Ablauf wurde im
echten Browser gegen `Simulator.html` nachgestellt.

### Eigene Gate-Messungen

| Gate | eigene Messung | Angabe im Dokument |
|---|---|---|
| `npm test` | 18.943/18.943 Assertions, 0 Fehler, 0 offene Handles, Exitcode 0 | 18.943/18.943 |
| `npm run test:browser` | 29 bestanden, 0 fehlgeschlagen | 29/29 |
| `tests/simulator-household-needs-persistence.test.mjs` | 73/73 | 73/73 |
| `tests/simulator-ui-orchestration.test.mjs` | 83/83 | 83/83 |
| `tests/simulator-multiprofile-aggregation.test.mjs` | 85/85 | 85/85 |
| `npm run docs:evidence` | bestanden, 69 MKT / 55 FOR / 17 MAP | nicht ausgewiesen |
| `git diff --check` | Exitcode 0 | nicht ausgewiesen |

Der in CB-27 gemeldete Abbruch trat nicht erneut auf; der Lauf dieser Runde
endete regulaer mit Exitcode 0.

### Mutationsgegenproben

Ohne Mutation liefern die drei Dateien 73/83/85 Assertions ohne Fehler.

| Mutation | Neutralisierter Fix | Ergebnis |
|---|---|---|
| Q1 | Fallback auf den letzten wirksamen Nachbarwert entfernt | `simulator-household-needs-persistence` FAIL nach 28, `simulator-ui-orchestration` FAIL nach 34 |
| Q2 | Schreibsperre bei `unsupported` entfernt | `simulator-household-needs-persistence` FAIL nach 47 |
| Q3 | `differsFromDefaults` im Einprofil-Zweig entfernt | FAIL nach 11 |
| Q4 | `reportValidity()` wieder bei jedem Eingabeereignis | `simulator-ui-orchestration` FAIL nach 31 |
| Q5 | `applyCombinedInputsToUI()` setzt `householdNeedLastValidValue` nicht mehr | Standardsuite bleibt gruen; Browser-Gate FAIL: "Gueltiger Flex wird waehrend eines leeren Mindest-Flex-Zwischenstands gespeichert" |
| Q6 | Aktualisierung von `householdNeedLastValidValue` nach erfolgreichem Schreiben entfernt | Standardsuite und Browser-Gate bleiben gruen |

### Proben

**Probe 1 - der Ablauf aus CB-22 im echten Browser**, auf einem frisch geleerten
Vertrag, zwei Profile mit den Summen 24.000 / 60.000 / 30.000:

```
Ausgangslage  floor=24000 flex=60000 min=30000
              dsFlex=60000 dsMin=30000   (householdNeedLastValidValue)
Mindest-Flex leeren, danach Flex auf 70000
              Meldung am Flex-Feld: ""   (kein Fehler)
              Datensatz: overriddenFields=["startFlexBedarf"], values={"startFlexBedarf":"70000"}
Neuaufruf     flex=70000  min=30000
```

Die in Runde 4 verlorene Eingabe wird jetzt sofort gespeichert und ueberlebt den
Neuaufruf.

**Probe 2 - Sicht der Engine waehrend desselben Zwischenstands.** Unmittelbar
nach dem angenommenen Schreibvorgang, solange das Mindest-Flex-Feld leer ist:

```
readNumber('startFlexBedarf', 0, document)   = 70000
readNumber('minimumFlexAnnual', 0, document) = 0
readNumber('startFloorBedarf', 0, document)  = 24000
validateSimulatorInputs(...)                 = keine Fehler
```

**Probe 3 - Auswahl und Zukunftsdatensatz** (aus der Standardsuite und dem
Browser-Gate gegengeprueft): Der Einprofil-Zweig verlangt jetzt zusaetzlich
`differsFromDefaults`; ein Schreibversuch auf einem Datensatz mit
`schemaVersion: 2` wird mit "Die gespeicherten Haushaltswerte stammen aus einer
neueren Version" am Feld abgewiesen, und der Browser-Fall belegt, dass der
Zukunftsdatensatz fachlich unveraendert bleibt.

### Findings

**CB-28 (Restrisiko, Testabdeckung) - der Fallback haengt an einer einzigen
Browser-Assertion.** `householdNeedLastValidValue` wird an zwei Stellen befuellt:
in `applyCombinedInputsToUI()` fuer alle drei Felder und nach jedem erfolgreichen
Schreibvorgang. Mutation Q5 entfernt die erste Stelle - damit fehlt der
Fallback fuer jedes Feld, das noch nie ueberschrieben wurde, und CB-22 kehrt
zurueck. Die Standardsuite bleibt dabei vollstaendig gruen; nur der Browser-Fall
"Gueltiger Flex wird waehrend eines leeren Mindest-Flex-Zwischenstands
gespeichert" faellt. Die 4.500 Zeilen Browser-Smoke laufen nicht in `npm test`.

**CB-29 (Restrisiko, Korrektheit) - der angenommene Schreibvorgang laesst einen
Zustand zurueck, in dem die Simulation anders rechnet als der Vertrag geprueft
hat.** Der Vertrag genehmigt die Flex-Aenderung, indem er den letzten wirksamen
Mindest-Flex von 30.000 unterstellt. Das Eingabefeld bleibt jedoch leer, und der
Simulator liest daraus in derselben Sitzung 0 (Probe 2);
`validateSimulatorInputs()` behandelt einen leeren Mindest-Flex als 0 und meldet
keinen Fehler (`simulator-input-validation.js:21`). Wer in diesem Moment eine
Simulation startet, rechnet ohne Flex-Untergrenze, waehrend die Persistenz
30.000 zugrunde gelegt hat. Erst der naechste Seitenaufbau stellt das Feld auf
30.000 zurueck. Das Feld traegt zwar eine Custom Validity, aber der
Simulationsstart wertet sie nicht aus.

**CB-30 (Restrisiko, Fehlerbehandlung) - ein Zukunftsdatensatz sperrt die drei
Felder vollstaendig.** `writeHouseholdSimulatorNeedOverride()` weist bei
`status === 'unsupported'` jede Aenderung ab und verweist auf den Reset. Der
Simulator-Reset entfernt jedoch saemtliche `sim_`-Schluessel, also alle
Simulator-Einstellungen. Wer nach einem Versionswechsel nur den Floor korrigieren
moechte, verliert dabei den gesamten uebrigen Simulatorzustand. Ein gezieltes
Verwerfen nur des Haushaltsdatensatzes gibt es nicht.

**CB-31 (Hinweis, Vertragstreue) - die Aktualisierung von
`householdNeedLastValidValue` nach erfolgreichem Schreiben ist ohne beobachtbare
Wirkung.** Mutation Q6 entfernt sie; weder die Standardsuite noch das Browser-Gate
bemerken das. Die Analyse deckt sich damit: Weicht der Fallback vom wirksamen
Wert ab, liegt das Nachbarfeld bereits im Override, und die nachgelagerte
Pruefung ueber `values` faengt den Fall ab. Entweder fehlt der Testfall, der die
Notwendigkeit der Zeile zeigt, oder sie ist redundant.

### Findings-Lifecycle

- Geschlossen und gegengemessen: CB-22 (Q1 und Q5, Probe 1), CB-23 (Q2,
  Probe 3), CB-24 (Q3), CB-25 (AK7 nennt jetzt den Einprofil-Geltungsbereich und
  schliesst die Mehrprofil-Migration ausdruecklich aus), CB-26 (Q4;
  `reportValidity()` laeuft nur noch bei `change`), CB-27 (Lauf dieser Runde mit
  Exitcode 0, im Dokument zweimal isoliert ausgewiesen).
- Aus den Runden 1 bis 3 weiterhin geschlossen: CB-1 bis CB-21.
- Neu eingefuehrte Restrisiken: CB-28, CB-29, CB-30.
- Neu eingefuehrte Hinweise: CB-31.
- Widerlegte Hypothesen: Ich hatte erwartet, dass der Fallback fuer Felder fehlt,
  die noch nie ueberschrieben wurden - `applyCombinedInputsToUI()` setzt
  `householdNeedLastValidValue` auch fuer die reinen Profil-Summen, und Probe 1
  belegt den vollstaendigen Ablauf. Ebenfalls widerlegt: die Annahme, die
  Schreibsperre bei `unsupported` lasse sich durch einen zweiten Schreibvorgang
  umgehen; der Browser-Fall zeigt den Datensatz danach fachlich unveraendert.

## Review-Ergebnis (Claude, Runde 5)

- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - CB-28: der Fallback auf den letzten wirksamen Nachbarwert faellt nur im
    Browser-Gate; `npm test` bleibt bei entfernter Quelle vollstaendig gruen.
  - CB-29: nach einem angenommenen Schreibvorgang bleibt das geleerte Nachbarfeld
    leer, und eine in derselben Sitzung gestartete Simulation rechnet dort mit 0,
    waehrend der Vertrag den letzten wirksamen Wert unterstellt hat.
  - CB-30: ein Zukunftsdatensatz sperrt die drei Felder und verweist auf den
    Reset, der alle Simulator-Einstellungen entfernt.
  - CB-31: die Aktualisierung von `householdNeedLastValidValue` nach
    erfolgreichem Schreiben ist ohne beobachtbare Wirkung.
- Pre-Mortem: In drei Monaten faellt auf, dass ein Simulationslauf ohne
  Flex-Untergrenze gerechnet hat. Wahrscheinlichste Ursache: Der Nutzer hat das
  Mindest-Flex-Feld geleert, um es neu zu setzen, dabei zuerst den Flex-Bedarf
  angepasst - der wurde dank des Fallbacks angenommen und gespeichert, ohne
  Fehlermeldung - und danach die Simulation gestartet, bevor er das leere Feld
  wieder gefuellt hat. Der Simulator liest aus dem leeren Feld 0, die
  Eingabepruefung meldet nichts, und nach dem naechsten Seitenaufbau steht dort
  wieder 30.000, sodass der Zustand nicht mehr nachvollziehbar ist.

## Review-Feedback von Claude (Runde 4)

### Pruefgegenstand und Verifikationsbasis

Geprueft wurde der Arbeitsstand, den Codex als fertig meldet: sechs
Programmdateien, sechs Test- und drei Dokumentationsdateien, zusammen 477
Einfuegungen und 32 Loeschungen ausserhalb der Binaerdatei. Alle Proben und
Mutationen liefen in einem Wegwerf-Klon des Arbeitsbaums unter `%TEMP%`; keine
Projektdatei wurde dafuer veraendert. Zusaetzlich zu den DOM-freien Proben lief
eine Messung im echten Browser gegen `Simulator.html`.

### Eigene Gate-Messungen

| Gate | eigene Messung | Angabe im Dokument |
|---|---|---|
| `npm test` | 18.922/18.922 Assertions, 0 Fehler, 0 offene Handles | 18.922/18.922 |
| `npm run test:browser` | 29 bestandene Smokes, 0 Fehler | 29/29 |
| `tests/simulator-household-needs-persistence.test.mjs` | 56/56 | 56/56 |
| `tests/simulator-ui-orchestration.test.mjs` | 79/79 | 79/79 |
| `tests/simulator-multiprofile-aggregation.test.mjs` | 85/85 | 85/85 |
| `npm run docs:evidence` | bestanden, 69 MKT / 55 FOR / 17 MAP | nicht ausgewiesen |
| `git diff --check` | Exitcode 0 | nicht ausgewiesen |
| Zeilenenden | neue Programm- und Testdatei 0 CRLF | nicht ausgewiesen |

Ein erster `npm test`-Lauf brach mit Exitcode 5 ohne ausgewiesenen Testfehler ab;
der Wiederholungslauf lieferte das oben genannte Ergebnis (siehe CB-27).

### Mutationsgegenproben zu den geschlossenen Findings

Ohne Mutation liefern die drei Dateien 56/79/85 Assertions ohne Fehler. Alle
sieben Nachbesserungen fallen in der Standardsuite.

| Mutation | Neutralisierter Fix | Ergebnis |
|---|---|---|
| P1 | Mehrprofil-Migration wieder zugelassen | `simulator-household-needs-persistence` FAIL nach 3 Assertions |
| P2 | Meldung der Legacy-Uebernahme entfernt | FAIL nach 8 Assertions |
| P3 | wirksame Flex-/Mindest-Flex-Invariante entfernt | FAIL nach 23 Assertions |
| P4 | Praezisions-Roundtrip in `normalizeUserValue` entfernt | FAIL nach 25 Assertions |
| P5 | Quittierung der V2-Warnung entfernt | FAIL nach 41 Assertions |
| P6 | `migration_pending` nicht mehr angelegt | `simulator-ui-orchestration` FAIL nach 21 Assertions |
| P7 | feldbezogene Fehlermeldung entfernt | `simulator-ui-orchestration` FAIL nach 30 Assertions |

### Proben

**Probe 1 - Legacy-Auswahl nach der Einschraenkung.**

```
ein Profil, Trio weicht ab                   candidate  24002/150000/60000
ein Profil, Trio = Profil-Default            candidate  12000/30000/15000
zwei Profile, identische abweichende Werte   ambiguous  -
zwei Profile, nur eines weicht ab            ambiguous  -
zwei Profile, keines weicht ab               none       -
Meldung bei Uebernahme: "Fruehere Simulator-Haushaltswerte wurden einmalig
uebernommen: Floor 24002, Flex 150000, Mindest-Flex 60000."
```

**Probe 2 - AK11 gegen die neue Flex-/Mindest-Flex-Kopplung.**

```
Flex-Aenderung bei leerem Mindest-Flex    ok=false  reason=invalid_related_value
Floor-Aenderung bei leerem Mindest-Flex   ok=true
Flex 10000 unter wirksamem Mindest-Flex   ok=false  reason=minimum_flex_exceeds_flex
```

**Probe 3 - Kanonisierung und Praezisionsschutz.**

```
"30000" -> 30000        "30000,50" -> 30000.5     " 30000 " -> 30000
".5"    -> 0.5          "1e9"      -> 1000000000  "3e4"     -> 30000
"030000"-> 30000        "+7"       -> 7           "1e-7"    -> 0.0000001
"0.30000000000000004" -> unveraendert uebernommen
"99999999999999999999" abgelehnt   "9007199254740993" abgelehnt
"1e1000" abgelehnt   "1e-1000" abgelehnt   "" abgelehnt   "-1" abgelehnt
```

**Probe 4 - Quittierung der V2-Warnung.** Erststart `unsupported` mit Warnung,
Zweitstart `unsupported` ohne Warnung, Ack-Key gesetzt, `values` bleibt `null`.

**Probe 5 - `migration_pending`.** Nach dem Start `migration_pending`/`values=null`,
beim zweiten Start unveraendert, eine spaetere Migration fuehrt zu `valid` mit dem
uebernommenen Trio, nach Reset `profile_default`.

**Probe 6 - Schreibvorgang auf einem V2-Datensatz.**

```
Ausgangslage  schemaVersion 2, Werte 99999/99999/0
Schreibvorgang startFloorBedarf=31000   ok=true
Ergebnis      status=valid  values={"startFloorBedarf":"31000"}  (V2-Inhalt fort)
```

**Probe 7 - Messung im echten Browser** (`Simulator.html`, zwei Profile, Profil-Summen
Floor 24.000 / Flex 60.000 / Mindest-Flex 30.000):

```
Mindest-Flex leeren
  wert=""  meldung="Der geaenderte Haushaltsbedarf ist keine gueltige
  nicht-negative Zahl und wurde nicht gespeichert."  flag=true  reportValidity=1
  Fokus nach dem Leeren: minimumFlexAnnual
Flex auf 70000 setzen
  wert="70000"  flag=true  reportValidity=3
  meldung="Flex-Bedarf und Mindest-Flex muessen beide gueltig sein, bevor diese
  Aenderung gespeichert wird."
Mindest-Flex wieder auf 30000 setzen
  Datensatz: overriddenFields=["minimumFlexAnnual"], values={"minimumFlexAnnual":"30000"}
Neuaufruf der Seite
  flex="60000"   min="30000"
```

Mit simulierter Tastatureingabe (`Control+A`, dann `70000` tippen) kam der Wert im
Flex-Feld ueberhaupt nicht an - das Feld blieb auf 60.000. Erst ein direktes
`fill()` setzte den sichtbaren Wert.

### Findings

**CB-22 (Blocker, Korrektheit) - eine abgelehnte Eingabe bleibt sichtbar stehen
und ist nach dem Neuaufruf verloren.** Der neue Zweig `invalid_related_value` in
`writeHouseholdSimulatorNeedOverride()` weist eine fuer sich gueltige Aenderung an
`startFlexBedarf` oder `minimumFlexAnnual` ab, solange das jeweils andere Feld
ungueltig ist. Gemessen im Browser (Probe 7): Nach dem Leeren des Mindest-Flex
zeigt das Flex-Feld den eingegebenen Wert 70.000, gespeichert wird er nicht.
Korrigiert der Nutzer anschliessend den Mindest-Flex, wird nur dieses Feld in den
Override aufgenommen; die Flex-Eingabe wird nicht nachgeholt und die Feldmeldung
verschwindet aus dem Blick. Nach dem Neuaufruf steht dort wieder 60.000. Das ist
das Fehlerbild aus U-01: Ein Wert, den der Nutzer eingegeben hat und auf dem
Bildschirm sieht, erscheint nach dem Neuaufruf nicht wieder. Zusaetzlich
widerspricht der Zweig AK11 ("Eine gueltige Feldaenderung wird unabhaengig von
ungueltigen Nachbarfeldern gespeichert"), das in Runde 3 fuer CB-11 aufgenommen
wurde. Der Zweig ist ungetestet: Eine Volltextsuche ueber `tests/` findet weder
`invalid_related_value` noch seine Meldung noch das gesetzte
`householdNeedPersistenceError`-Flag; die vorhandene Assertionsgruppe deckt nur
den Floor bei leerem Flex und die reine Feldmeldung ab.

**CB-23 (Restrisiko, Vertragstreue) - ein unbekannter V2-Datensatz wird beim
ersten gueltigen Schreibvorgang ueberschrieben.** Das Dokument sichert zu:
"Unbekannte zukuenftige Versionen werden nicht veraendert." `writeHouseholdSimulatorNeedOverride()`
prueft den aktuellen Status jedoch nur auf `valid` und schreibt andernfalls einen
frischen V1-Datensatz. Gemessen in Probe 6 und im Browser (Probe 7, letzter
Abschnitt): Der V2-Datensatz mit 99.999er-Werten wird durch einen V1-Override
ersetzt, sobald der Nutzer ein Feld anfasst. Der Downgrade-Schutz haelt also nur,
solange niemand tippt.

**CB-24 (Restrisiko, Seiteneffekte) - der Einprofil-Zweig migriert auch ein Trio,
das den Profil-Defaults entspricht.** `selectLegacyHouseholdSimulatorNeeds()`
liefert bei `entries.length === 1` einen Kandidaten, ohne `differsFromDefaults`
auszuwerten - der Pruefwert existiert, wird hier aber nicht benutzt. Gemessen
(Probe 1): Ein Trio, das exakt den aktuellen Profil-Defaults entspricht, wird als
vollstaendiger Drei-Feld-Override festgeschrieben. Danach wirkt keine Pflege der
Balance-Bedarfe mehr auf die Simulator-Felder; das ist genau das Einfrieren, das
CB-2 beanstandet hat, nur jetzt durch die Migration erzeugt.

**CB-25 (Restrisiko, Vertragstreue) - AK7 widerspricht AK13 und der Umsetzung.**
AK7 verspricht die einmalige Uebernahme vorhandener gueltiger `sim_`-Altwerte ohne
Einschraenkung; AK13 und der Loesungstext schliessen sie fuer Mehrprofil-Haushalte
aus. Gemessen (Probe 1): Auch der eindeutige Fall - genau ein Profil weicht von
seinen Balance-Defaults ab - endet im Zwei-Profil-Haushalt mit `ambiguous`. Fuer
einen Zwei-Personen-Haushalt findet damit keine Migration statt; die alten Werte
muessen einmal neu eingegeben werden. Das ist vertretbar, aber AK7 sollte den
Geltungsbereich nennen.

**CB-26 (Restrisiko, Seiteneffekte) - `reportValidity()` laeuft bei jedem
Eingabeereignis.** `renderHouseholdNeedWriteResult()` ruft es bei jeder abgelehnten
Eingabe auf, also auch bei jedem Tastendruck waehrend eines ungueltigen
Zwischenstands. Gemessen (Probe 7): Nach dem Leeren steht der Fokus auf dem
ungueltigen Feld, und eine simulierte Tastatureingabe im Nachbarfeld kam nicht an -
der Wert blieb auf 60.000. Zusaetzlich bleibt die gesetzte Custom Validity am Feld
bestehen, bis ein erfolgreicher Schreibvorgang sie loescht; das Feld gilt bis
dahin als formularungueltig.

**CB-27 (Hinweis, Verifikation) - ein `npm test`-Lauf brach mit Exitcode 5 ab,**
ohne dass die Ausgabe einen Testfehler auswies; der Wiederholungslauf lieferte
18.922/18.922. Der Abbruch fiel mit einem parallel laufenden `git clone` desselben
Verzeichnisses zusammen und ist dem Bugfix nicht zuzuordnen, wird aber
festgehalten.

### Findings-Lifecycle

- Geschlossen und gegengemessen: CB-16 (P1 und P2, Probe 1), CB-17 (P3,
  Probe 2), CB-18 (P4, Probe 3), CB-19 (P5, Probe 4), CB-20 (P6, Probe 5),
  CB-21 (P7, Probe 7).
- Aus den Runden 1 und 2 weiterhin geschlossen: CB-1 bis CB-15; die zugehoerigen
  Absicherungen liefen in dieser Runde unveraendert mit.
- Neu eingefuehrte Blocker: CB-22.
- Neu eingefuehrte Restrisiken: CB-23, CB-24, CB-25, CB-26.
- Neu eingefuehrte Hinweise: CB-27.
- Widerlegte Hypothesen: Ich hatte erwartet, dass die feldbezogene Rueckmeldung
  ins Leere laeuft, weil der DOM-Mock der Standardsuite `setCustomValidity()`
  nicht kennt; der Mock wurde erweitert, und P7 faellt nach 30 Assertions.
  Ebenfalls widerlegt: die Annahme, der Praezisionsschutz koenne uebliche
  Eurobetraege abweisen - alle in Probe 3 geprueften realistischen Schreibweisen
  werden angenommen, abgelehnt werden nur Werte jenseits der exakten
  Double-Darstellung.

## Review-Ergebnis (Claude, Runde 4)

- Status: blockiert
- Blocker:
  - CB-22: eine wegen eines ungueltigen Nachbarfelds abgelehnte Eingabe bleibt
    sichtbar im Feld stehen, wird beim Gueltigwerden des Nachbarfelds nicht
    nachgeholt und ist nach dem Neuaufruf verloren - im Browser gemessen 70.000
    auf dem Bildschirm gegen 60.000 nach dem Reload; der Zweig widerspricht AK11
    und ist ungetestet.
- Restrisiken:
  - CB-23: ein unbekannter V2-Datensatz wird beim ersten gueltigen
    Schreibvorgang ueberschrieben, entgegen der eigenen Zusicherung.
  - CB-24: der Einprofil-Zweig migriert auch ein Trio, das den Profil-Defaults
    entspricht, und friert die drei Felder gegen kuenftige Balance-Pflege ein.
  - CB-25: AK7 widerspricht AK13 und der Umsetzung; im Mehrprofil-Haushalt wird
    nie migriert.
  - CB-26: `reportValidity()` bei jedem Eingabeereignis zieht den Fokus und kann
    die laufende Eingabe unterbrechen.
  - CB-27: ein `npm test`-Lauf brach ohne ausgewiesenen Testfehler ab.
- Pre-Mortem: In drei Monaten meldet der Nutzer erneut, ein eingegebener Wert sei
  nach dem Neuaufruf verschwunden. Wahrscheinlichste Ursache: Er hat beim
  Anpassen der Rahmendaten das Mindest-Flex-Feld geleert, danach den Flex-Bedarf
  neu gesetzt und zuletzt den Mindest-Flex wieder gefuellt. Die Flex-Eingabe wurde
  waehrend des ungueltigen Zwischenstands abgewiesen, stand aber weiter im Feld;
  die Korrektur des Nachbarfelds hat sie nicht nachgeholt. Er hat die Seite mit
  einem Bildschirm verlassen, der den gewuenschten Wert zeigte, und findet beim
  naechsten Aufruf die alte Profil-Summe vor - waehrend alle Gates gruen bleiben,
  weil genau dieser Ablauf in keinem Test steht.

## Review-Feedback von Claude (Runde 3)

### Pruefgegenstand und Verifikationsbasis

Geprueft wurde der Arbeitsbaumstand nach der zweiten Nachbesserung: sechs
Programmdateien, sechs Test- und drei Dokumentationsdateien, zusammen 416
Einfuegungen und 31 Loeschungen ausserhalb der Binaerdatei. Alle Proben und
Mutationen liefen in einem Wegwerf-Klon des Arbeitsbaums unter `%TEMP%`; keine
Projektdatei wurde dafuer veraendert.

### Eigene Gate-Messungen

| Gate | eigene Messung | Angabe im Dokument |
|---|---|---|
| `npm test` | 18.900/18.900 Assertions, 0 Fehler, 0 offene Handles | 18.900/18.900 |
| `npm run test:browser` | 29 bestandene Smokes, 0 Fehler | 29/29 |
| `tests/simulator-household-needs-persistence.test.mjs` | 44/44 | 44/44 |
| `tests/simulator-ui-orchestration.test.mjs` | 74/74 | 74/74 |
| `tests/simulator-multiprofile-aggregation.test.mjs` | 85/85 | 85/85 |
| `npm run docs:evidence` | bestanden, 69 MKT / 55 FOR / 17 MAP | nicht ausgewiesen |
| `git diff --check` | Exitcode 0 | nicht ausgewiesen |
| Zeilenenden | neue Programm- und Testdatei 0 CRLF | nicht ausgewiesen |

### Mutationsgegenproben zu den geschlossenen Findings

Ohne Mutation liefern die drei Dateien 44/74/85 Assertions ohne Fehler. Alle
sechs Nachbesserungen fallen jetzt in der Standardsuite, keine haengt mehr allein
am Browser-Gate.

| Mutation | Neutralisierter Fix | Ergebnis |
|---|---|---|
| N1 | Determinismus der Legacy-Auswahl (erster Kandidat statt Abweichungsanalyse) | `simulator-household-needs-persistence` FAIL nach 2 Assertions |
| N2 | `normalizeUserValue` durch die strikte Speicherpruefung ersetzt | FAIL nach 14 Assertions |
| N3 | sichtbare Meldung des abgelehnten Schreibvorgangs entfernt | `simulator-ui-orchestration` FAIL nach 30 Assertions |
| N4 | Heilung beschaedigter und `legacy_invalid`-Datensaetze entfernt | `simulator-household-needs-persistence` FAIL nach 27 Assertions |
| N5 | Reaktivierung des Reset-Buttons im Flush-Fehlerpfad entfernt | `simulator-ui-orchestration` FAIL nach 17 Assertions |
| N6 | `readPositiveBalanceNeed` wieder auf `>= 0` | `simulator-multiprofile-aggregation` FAIL nach 19 Assertions |

### Proben

**Probe 1 - Legacy-Auswahl im Zwei-Profil-Haushalt.**

```
ein Profil, Trio weicht ab                        candidate  24002/150000/60000  (Summe der Profil-Floors 24002)
zwei Profile, nur eines weicht ab                 candidate  24002/150000/60000  (Summe der Profil-Floors 36002)
zwei Profile, identische abweichende Einzelwerte  candidate  12000/30000/15000   (Summe der Profil-Floors 24000)
zwei Profile ohne Balance-Pflege, identisch       candidate  12000/30000/15000   (Summe der Profil-Floors 24000)
zwei Profile, unterschiedliche Abweichungen       ambiguous  -
zwei Profile, keines weicht ab                    none       -
```

**Probe 2 - Mindest-Flex-Invariante bei nur einem Override.** Profil-Summe des
Mindest-Flex 30.000, der Nutzer setzt nur den Flex-Override:

```
nur Flex-Override                       ok=true   gespeichert={"startFlexBedarf":"10000"}
wirksamer UI-Zustand                    Flex=10000, Mindest-Flex=30000 (Profil-Summe)
danach Mindest-Flex 30000 explizit      ok=false  reason=minimum_flex_exceeds_flex
```

**Probe 3 - Kanonisierung realer Eingaben.**

```
"30000"                 ok=true   -> 30000
"30000,50"              ok=true   -> 30000.5
" 30000 "               ok=true   -> 30000
".5"                    ok=true   -> 0.5
"1e9"                   ok=true   -> 1000000000
"3e4"                   ok=true   -> 30000
"030000"                ok=true   -> 30000
"1e-7"                  ok=true   -> 0.0000001
"99999999999999999999"  ok=true   -> 100000000000000000000
""                      ok=false
"-1"                    ok=false
```

**Probe 4 - Heilung der Warnungen.**

```
defekt      erststart status=profile_default warnung=vorhanden   zweitstart warnung=""
ambiguous   erststart warnung=vorhanden                          zweitstart warnung=""
V2          erststart status=unsupported                         zweitstart warnung=weiterhin vorhanden
```

**Probe 5 - Profilaggregation mit Null- und Teilwerten in Balance**
(`sim_`-Trio 12.000 / 30.000 / 15.000):

```
Balance alles 0             floor=12000 flex=30000 min=15000
Balance nur Floor gepflegt  floor=20000 flex=30000 min=15000
Balance gepflegt            floor=20000 flex=40000 min=10000
Balance Floor bewusst 0     floor=12000 flex=40000 min=10000
```

**Probe 6 - Reset-Marker.** Nach Migration stehen 24.002 / 150.000 / 60.000; nach
`clearHouseholdSimulatorNeeds()` und erneutem Start bleibt es bei
`status=profile_default`, `values=null`.

### Findings

**CB-16 (Blocker, Korrektheit) - die Legacy-Auswahl kann einen Einzelprofilwert
zum Haushaltswert erklaeren und meldet die Uebernahme nicht.** Der Zweig
`changedCandidates.length > 1` uebernimmt bei identischen Kandidaten deren Wert
als Haushalts-Override. Gemessen (Probe 1): Zwei Profile mit je 12.000 / 30.000 /
15.000, die von ihren Balance-Defaults abweichen, ergeben einen Override von
12.000 / 30.000 / 15.000 - der Haushalt braucht 24.000 / 60.000 / 30.000. Der
Fall ist von der beabsichtigten Konstellation (derselbe Haushaltswert wurde durch
den alten Fehler in beide Profile geschrieben) nicht unterscheidbar; der
Kommentar im Modul nennt ihn ausdruecklich "safe". Er ist im Test nicht abgedeckt:
Test 1 prueft nur "genau ein abweichendes Profil" und "widerspruechliche
Kandidaten". Dieselbe Annahme traegt auch der abgedeckte Pfad - im gemessenen
Zwei-Profil-Fall summieren sich die Profil-Floors auf 36.002, uebernommen werden
24.002. Erschwerend: Die Uebernahme laeuft ohne jede Rueckmeldung, waehrend der
Fall `ambiguous` gewarnt wird, und der Marker verhindert jede Korrektur durch
einen zweiten Startversuch. Wirkung: Der Simulator rechnet dauerhaft mit einem zu
niedrigen Bedarf; die Ruinwahrscheinlichkeit sinkt scheinbar. Minimalabhilfe ist
eine sichtbare Meldung im Profilstatus, die den uebernommenen Wert und seine
Herkunft nennt - der Kanal dafuer existiert bereits.

**CB-17 (Restrisiko, Vertragstreue) - die Mindest-Flex-Invariante greift nur
zwischen zwei Overrides.** Die Pruefung in `writeHouseholdSimulatorNeedOverride()`
und in `readHouseholdSimulatorNeedsState()` setzt voraus, dass beide Felder im
Override liegen. Gemessen (Probe 2): Ein reiner Flex-Override von 10.000 wird
akzeptiert, obwohl der wirksame Mindest-Flex aus der Profil-Summe 30.000 betraegt
- der Vertrag laesst also genau den Zustand zu, den er zwischen zwei Overrides
verbietet. Anschliessend wird eine ausdrueckliche Eingabe von 30.000 im
Mindest-Flex-Feld mit "Mindest-Flex darf den Flex-Bedarf nicht ueberschreiten"
abgewiesen, obwohl dieser Wert bereits im Feld steht und wirksam ist. Der Nutzer
muss erst den Flex erhoehen, um den unveraenderten Mindest-Flex bestaetigen zu
koennen.

**CB-18 (Restrisiko, Korrektheit) - die Kanonisierung sehr grosser Zahlen aendert
den Wert still.** `normalizeUserValue()` fuehrt jede Eingabe ueber `Number`.
Gemessen (Probe 3): `'99999999999999999999'` wird als
`'100000000000000000000'` gespeichert. Ebenso wird `'30000,50'` zu `'30000.5'` -
wertgleich, aber AK1 spricht von "bytegleich".

**CB-19 (Restrisiko, Fehlerbehandlung) - eine unbekannte Zukunftsversion warnt
dauerhaft.** Beschaedigte Datensaetze und alte `legacy_invalid`-Marker heilen
jetzt nach einer einmaligen Warnung (Probe 4). Der `unsupported`-Zustand bleibt
dagegen absichtlich erhalten, damit ein Downgrade den V2-Datensatz nicht
zerstoert. Damit steht bei jedem Start eine nicht quittierbare Fehlermeldung im
Profilstatus und verdraengt dort den Text "Aktive Profile: n.".

**CB-20 (Restrisiko, Seiteneffekte) - die Erstmigration haengt jetzt am
Profilverbund-Pfad.** `initializeHouseholdSimulatorNeeds()` wird nur noch in
`applySelectionUnchecked()` gerufen. Bricht dieser Pfad vorher ab (fehlender
`#simProfileList`, Profil-Recovery-Blocker, Fehler beim Aufbau), entsteht kein
Vertrag; `initInputPersistence()` findet mangels Datensatz nichts vor und belegt
die drei Felder nicht. Der Nutzer sieht in diesem Fall leere Bedarfsfelder. In
Runde 2 lag die Initialisierung noch in `initInputPersistence()` und war davon
unabhaengig.

**CB-21 (Hinweis, Seiteneffekte) - die Profilstatuszeile wird als Fehlerkanal der
Eingabepersistenz mitbenutzt.** `renderHouseholdNeedWriteResult()` sichert den
vorherigen Text in `dataset` und stellt ihn beim naechsten erfolgreichen
Schreibvorgang wieder her. Aktualisiert `applySelection()` den Status waehrend
eines bestehenden Fehlerzustands, wird spaeter ein veralteter Text
wiederhergestellt. Zudem erscheint die Meldung im Profilverbund-Block, also weit
entfernt vom bearbeiteten Eingabefeld.

### Findings-Lifecycle

- Geschlossen und gegengemessen: CB-10 (N6, Probe 5), CB-11 (N2 und N3,
  Probe 3), CB-12 (N4, Probe 4), CB-13 (N5), CB-14 (N1, Probe 1),
  CB-15 (Wrapper entfernt).
- Aus Runde 1 weiterhin geschlossen: CB-1 bis CB-9; die zugehoerigen
  Absicherungen liefen in dieser Runde unveraendert mit.
- Neu eingefuehrte Blocker: CB-16.
- Neu eingefuehrte Restrisiken: CB-17, CB-18, CB-19, CB-20.
- Neu eingefuehrte Hinweise: CB-21.
- Widerlegte Hypothesen: Ich hatte erwartet, dass die neue Migration ueber alle
  Profile den in Runde 2 gemeldeten Zufall des aktiven Profils nur verschiebt;
  Probe 1 zeigt, dass die Auswahl reihenfolgeunabhaengig ist und
  widerspruechliche Kandidaten kontrolliert ablehnt. Ebenfalls widerlegt: die
  Annahme, die neue nutzerfreundliche Normalisierung koenne negative oder leere
  Eingaben durchlassen - beide werden weiterhin abgewiesen, und der abgelehnte
  Schreibvorgang traegt jetzt eine sichtbare Meldung.

## Review-Ergebnis (Claude, Runde 3)

- Status: blockiert
- Blocker:
  - CB-16: die Legacy-Auswahl uebernimmt bei mehreren identischen Kandidaten
    einen Einzelprofilwert als Haushaltswert - gemessen 12.000 statt 24.000 - und
    meldet die Uebernahme nicht; der Pfad ist ungetestet und durch den Marker
    einmalig.
- Restrisiken:
  - CB-17: die Mindest-Flex-Invariante greift nur zwischen zwei Overrides und
    erzeugt eine Bediensackgasse.
  - CB-18: die Kanonisierung sehr grosser Zahlen aendert den Wert still.
  - CB-19: eine unbekannte Zukunftsversion warnt dauerhaft und nicht quittierbar.
  - CB-20: die Erstmigration haengt jetzt am Profilverbund-Pfad.
  - CB-21: die Profilstatuszeile wird als Fehlerkanal der Eingabepersistenz
    mitbenutzt.
- Pre-Mortem: In drei Monaten faellt auf, dass die Simulation seit dem Update
  deutlich guenstiger ausfaellt als frueher. Wahrscheinlichste Ursache: Beide
  Haushaltsprofile trugen dieselben historischen Bedarfszahlen, die von den
  gepflegten Balance-Werten abwichen. Die einmalige Migration hat diesen
  Einzelwert stillschweigend als Haushaltsbedarf uebernommen, der Haushalt rechnet
  seither mit der Haelfte, und weil der Wert als ausdruecklicher Override gilt,
  ueberschreibt ihn keine Profilaggregation mehr. Der `profile_default`-Marker
  verhindert eine Wiederholung der Migration, sodass auch ein Neustart den Fehler
  nicht zeigt - und alle Gates bleiben gruen.

## Review-Feedback von Claude (Runde 2)

### Pruefgegenstand und Verifikationsbasis

Geprueft wurde der Arbeitsbaumstand nach der Nachbesserung: sechs Programmdateien
(neu `simulator-household-needs-persistence.js`, dazu
`simulator-main-input-persist.js`, `simulator-main-profiles.js`,
`simulator-main-reset.js`, `simulator-profile-inputs.js`,
`persistence-key-policy.js`), sechs Test- und drei Dokumentationsdateien,
zusammen 291 Einfuegungen und 30 Loeschungen ausserhalb der Binaerdatei. Alle
Proben und Mutationen liefen in einem Wegwerf-Klon des Arbeitsbaums unter
`%TEMP%`; keine Projektdatei wurde dafuer veraendert.

### Eigene Gate-Messungen

| Gate | eigene Messung | Angabe im Dokument |
|---|---|---|
| `npm test` | 18.874/18.874 Assertions, 0 Fehler, 0 offene Handles | 18.874/18.874 |
| `npm run test:browser` | 29 bestandene Smokes, 0 Fehler | 29/29 |
| `tests/simulator-household-needs-persistence.test.mjs` | 29/29 | 29/29 |
| `tests/simulator-ui-orchestration.test.mjs` | 69/69 | 69/69 |
| `tests/simulator-multiprofile-aggregation.test.mjs` | 79/79 | 79/79 |
| `npm run docs:evidence` | bestanden, 69 MKT / 55 FOR / 17 MAP | nicht ausgewiesen |
| `git diff --check` | Exitcode 0 | nicht ausgewiesen |
| Zeilenenden | neue Programm- und Testdatei 0 CRLF | nicht ausgewiesen |

### Mutationsgegenproben zu den geschlossenen Findings

Jede Nachbesserung wurde einzeln neutralisiert. Gemessen wurde, welche Datei
danach ausfaellt; ohne Mutation liefern die drei Dateien 29/69/79 Assertions
ohne Fehler.

| Mutation | Neutralisierter Fix | Ergebnis |
|---|---|---|
| M1 | `resolveHouseholdSimulatorNeed` gibt immer den Profilwert | `simulator-household-needs-persistence` FAIL nach 14 Assertions |
| M2 | Legacy-Migration abgeschaltet | `simulator-household-needs-persistence` FAIL nach 1, `simulator-ui-orchestration` FAIL nach 18 |
| M3 | alte `<= 0`-Praezedenz der Balance-Werte | `simulator-multiprofile-aggregation` FAIL nach 13 |
| M4 | Wertvalidierung in `normalizeStoredValue` entfernt | `simulator-household-needs-persistence` FAIL nach 7 |
| M5 | `await PersistenceFacade.flush()` im Reset entfernt | Standardsuite bleibt gruen; Browser-Gate FAIL: "Reset stellt die aktuelle aggregierte Balance-Floor-Summe wieder her (ist: 25000)" |
| M6 | `minimumFlexProfiles` wieder bedingungslos verworfen | Standardsuite bleibt gruen; Browser-Gate FAIL: "Ein reiner Floor-Override behaelt die Mindest-Flex-Profilaufschluesselung" |

M5 belegt zugleich, dass der Flush sachlich notwendig ist: Ohne ihn ueberlebt der
alte Override den Reset und das Feld zeigt wieder 25.000 EUR. Aus Runde 1 bleibt
damit nur die Beobachtung bestehen, dass zwei Zusicherungen ausschliesslich im
Browser-Gate haengen; die Kernpraezedenz selbst faellt jetzt in der Standardsuite
(M1), womit CB-7 erfuellt ist.

### Proben

**Probe 1 - Profilaggregation nach der Praezedenzumkehr.**
`buildSimulatorInputsFromProfileData()` mit `sim_`-Trio 12.000 / 30.000 / 15.000
und verschiedenen Balance-Zustaenden:

```
Balance mit Nullwerten        floor=0     flex=0     min=0
Balance mit Leerstrings       floor=12000 flex=30000 min=15000
Balance ohne die Schluessel   floor=12000 flex=30000 min=15000
Balance gepflegt              floor=20000 flex=40000 min=10000
Balance nur Floor gepflegt    floor=20000 flex=0     min=0
```

**Probe 2 - Schreibversuch bei ungueltigem Nachbarfeld.** Gueltiger Override
24.002 / 150.000 / 60.000; der Nutzer leert das Flex-Feld und aendert danach den
Floor auf 30.000:

```
ok=false reason=invalid_snapshot warnung=""
gespeicherter Floor nach der Aenderung: 24002
```

**Probe 3 - Eingabeformen, die ein `type=number`-Feld liefern kann.**

```
"30000"     geschrieben=true
"30000.5"   geschrieben=true
"030000"    geschrieben=true
"30000,50"  geschrieben=false  invalid_snapshot
""          geschrieben=false  invalid_snapshot
".5"        geschrieben=false  invalid_snapshot
" 30000"    geschrieben=false  invalid_snapshot
"1e9"       geschrieben=false  invalid_snapshot
"3e4"       geschrieben=false  invalid_snapshot
```

**Probe 4 - Dauer der Warnungen.**

```
erststart        status=profile_default warnung="Fruehere Simulator-Bedarfswerte waren unvollstaendig ..."
zweitstart       status=profile_default warnung="Fruehere Simulator-Bedarfswerte waren unvollstaendig ..."
defekt erststart status=invalid
defekt zweitstart status=invalid warnung="Gespeicherte Simulator-Haushaltswerte sind beschaedigt ..."
```

### Findings

**CB-10 (Blocker, Seiteneffekte) - der CB-2-Fix laesst den Profil-Default auf 0
fallen.** `readNonNegativeBalanceNeed()` behandelt 0 als gueltigen Balance-Wert
und macht ihn autoritativ. `readAllInputs()` in `balance-reader.js:196` liest
Bedarfsfelder ueber `num()`, das fuer ein leeres Feld 0 liefert; jeder
gespeicherte Balance-Zustand enthaelt die drei Schluessel also immer, notfalls mit
dem Wert 0. Gemessen (Probe 1): Ein Profil mit `sim_`-Werten 12.000 / 30.000 /
15.000 und einem Balance-Zustand aus lauter Nullen liefert jetzt 0 / 0 / 0; ein
Profil mit nur gepflegtem Floor liefert 20.000 / 0 / 0. Genau das hat die
fruehere `<= 0`-Bedingung verhindert. Besonders betroffen ist der Mindest-Flex,
der in Balance ein optionales Feld ist. Wirkung: Der Profil-Default nach einem
Reset, die Summe im Profilverbund und die Aufschluesselung in
`minimumFlexProfiles` fallen auf 0, die Flex-Untergrenze entfaellt in der
Simulation. Weder Test noch Dokument erwaehnen den Nullfall; der Browser-Fall
arbeitet ausschliesslich mit gepflegten Balance-Werten.

**CB-11 (Blocker, Fehlerbehandlung) - ein abgelehnter Schreibvorgang verwirft
eine gueltige Nutzeraenderung ohne Signal.** `writeHouseholdSimulatorNeedOverride()`
liefert `{ ok: false, reason: 'invalid_snapshot' }`; der Aufrufer in
`simulator-main-input-persist.js:73` wertet den Rueckgabewert nicht aus, und der
Zustand traegt in diesem Fall auch keine Warnung. Gemessen (Probe 2): Bei leerem
Flex-Feld wird eine gueltige Floor-Aenderung auf 30.000 verworfen, gespeichert
bleibt 24.002, `warning` ist leer. Probe 3 zeigt die Breite des Pfads: Auch
`'30000,50'` (deutsche Dezimaleingabe), `' 30000'` (eingefuegter Wert mit
Leerzeichen), `'.5'`, `'1e9'` und `'3e4'` werden still verworfen - alles
Zeichenketten, die ein `type=number`-Feld liefern kann, das bei ungueltiger
Eingabe zusaetzlich `''` zurueckgibt. Der Nutzer erhaelt keine Rueckmeldung und
findet nach dem Neuaufruf den alten Wert vor. Das ist das Fehlerbild aus U-01 in
neuer Form, nur seltener ausgeloest. Die Formulierung im Dokument ("Leere
Zwischenzustaende erhalten den letzten gueltigen Stand") beschreibt nur die
Haelfte des Verhaltens; die verworfene Nachbaraenderung fehlt.

**CB-12 (Restrisiko, Fehlerbehandlung) - Warnungen sind dauerhaft und heilen
nicht selbst.** `initializeHouseholdSimulatorNeeds()` steigt bei
`status !== 'absent'` sofort aus. Ein beschaedigter Datensatz wird deshalb nie
repariert und meldet sich bei jedem Start erneut (Probe 4); dasselbe gilt fuer
den `legacy_invalid`-Marker, der dauerhaft im Datensatz stehen bleibt. Die
Meldung geht mit `kind='error'` in den Profilstatus und verdraengt dort dauerhaft
den normalen Text "Aktive Profile: n.". Betroffen ist auch, wer vor dem Update
nur eines der drei Felder je angefasst hat - der alte Pfad schrieb feldweise, ein
unvollstaendiges Trio ist also der Regelfall, und die Werte haben nie gewirkt,
weil die Profilaggregation sie ohnehin ueberschrieben hat.

**CB-13 (Restrisiko, Fehlerbehandlung) - der Reset-Handler hat keinen
Fehlerpfad.** `initResetButton()` ist jetzt ein `async`-Listener mit
`await PersistenceFacade.flush()` ohne `try`/`catch`. `flush()` wirft nachweislich
weiter (`persistence-facade.js:654`). Schlaegt der Flush fehl, unterbleibt der
Reload, es erscheint keine Meldung, und der Nutzer sieht eine Seite mit den alten
Werten, waehrend die `sim_`-Keys im Cache bereits entfernt sind. M5 zeigt die
Gegenrichtung: Ohne den Flush ist der Reset wirkungslos. Gerade weil der Schritt
unverzichtbar ist, braucht sein Fehlerfall eine sichtbare Behandlung.

**CB-14 (Restrisiko, Korrektheit) - die einmalige Migration liest das gerade
aktive Profil.** `initInputPersistence()` liest die `sim_`-Altwerte ueber
`persistenceStorage.getItem('sim_' + fieldId)` aus dem Live-Speicher, der beim
Profilwechsel mit den Daten des aktiven Profils gefuellt wird. Oeffnet der
Nutzer nach dem Update zuerst ein anderes Profil und danach den Simulator, wird
dessen Trio zum Haushalts-Override. Die Migration ist einmalig und wird durch den
persistierten Marker nicht wiederholt.

**CB-15 (Hinweis, Vertragstreue) - `readHouseholdSimulatorNeeds()`
(`simulator-household-needs-persistence.js:113`) hat keinen Produktivkonsumenten
mehr;** die App nutzt durchgaengig `readHouseholdSimulatorNeedsState()`.

### Findings-Lifecycle

- Geschlossen und gegengemessen: CB-1 (M2), CB-2 (M3), CB-3 und CB-6 (M4),
  CB-5 (M6), CB-7 (M1 faellt jetzt in der Standardsuite), CB-8 (Schemafaelle in
  der neuen Testdatei und im Browser-Gate), CB-9 (Export zurueckgenommen).
- CB-4 geschlossen: `SIMULATOR_MODULES_README.md` und
  `ARCHITEKTUR_UND_FACHKONZEPT.md:927` fuehren das neue Modul, Zeile 1668
  beschreibt die geaenderte Mindest-Flex-Herkunft.
- Neu eingefuehrte Blocker: CB-10, CB-11.
- Neu eingefuehrte Restrisiken: CB-12, CB-13, CB-14.
- Neu eingefuehrte Hinweise: CB-15.
- Widerlegte Hypothesen: Ich hatte erwartet, dass der Reset-Datensatz
  (`mode: 'profile_default'`) eine erneute Legacy-Migration nur zufaellig
  verhindert; Test 5 der neuen Datei und der Codepfad zeigen, dass der Marker
  genau dafuer gesetzt wird. Ebenfalls widerlegt: Die Annahme, eine reine
  Floor-Aenderung verwerfe weiterhin die Mindest-Flex-Aufschluesselung - durch
  `overriddenFields` ist `minimumFlexOverridden` jetzt feldgenau, und M6 belegt
  die Absicherung.

## Review-Ergebnis (Claude, Runde 2)

- Status: blockiert
- Blocker:
  - CB-10: der Fix fuer CB-2 macht einen leeren Balance-Bedarf autoritativ; der
    Profil-Default faellt auf 0, besonders beim optionalen Mindest-Flex.
  - CB-11: ein abgelehnter Schreibvorgang verwirft eine gueltige Aenderung am
    Nachbarfeld ohne Rueckmeldung; betroffen sind auch deutsche Dezimaleingaben
    und eingefuegte Werte mit Leerzeichen.
- Restrisiken:
  - CB-12: Legacy- und Schadenswarnungen bleiben dauerhaft und heilen nicht
    selbst.
  - CB-13: der async Reset-Handler hat keinen Fehlerpfad fuer einen
    fehlgeschlagenen Flush.
  - CB-14: die einmalige Migration liest das gerade aktive Profil.
  - CB-15: `readHouseholdSimulatorNeeds()` hat keinen Produktivkonsumenten mehr.
- Pre-Mortem: In drei Monaten faellt in einer Auswertung auf, dass der Simulator
  den Flex in Krisenjahren bis auf null kuerzt, obwohl eine Untergrenze gepflegt
  schien. Wahrscheinlichste Ursache: Der Mindest-Flex steht in Balance fuer eines
  der Profile leer, weil er dort optional ist und bisher nur im Simulator
  gefuehrt wurde. Seit der Praezedenzumkehr ist dieser leere Wert als 0
  autoritativ; der Haushalts-Override deckt ihn nur so lange zu, wie das Feld
  ausdruecklich ueberschrieben ist. Nach einem Reset - oder wenn der Nutzer nur
  Floor und Flex angefasst hat - steht die Untergrenze auf 0, ohne dass eine
  Meldung darauf hinweist, und alle Gates bleiben gruen.

## Review-Feedback von Claude (Runde 1)

### Pruefgegenstand und Verifikationsbasis

Geprueft wurde der Arbeitsbaumstand auf `codex/suite-datenintegritaet-hardening`:
fuenf Programmdateien (`app/simulator/simulator-household-needs-persistence.js`
neu, `simulator-main-input-persist.js`, `simulator-main-profiles.js`,
`simulator-main-reset.js`, `app/shared/persistence-key-policy.js`) und vier
Testdateien, zusammen 154 Einfuegungen und 11 Loeschungen ausserhalb der
Binaerdatei. Alle Proben liefen in einem Wegwerf-Klon des Arbeitsbaums unter
`%TEMP%`; keine Projektdatei wurde dafuer veraendert.

### Eigene Gate-Messungen

| Gate | eigene Messung | Angabe im Dokument |
|---|---|---|
| `npm test` | 18.837/18.837 Assertions, 0 Fehler, 0 offene Handles | 18.837/18.837 |
| `npm run test:browser` | 29 bestandene Smokes, 0 Fehler | 29/29 |
| `tests/simulator-ui-orchestration.test.mjs` | 67/67 | 67/67 |
| `npm run docs:evidence` | bestanden, 69 MKT / 55 FOR / 17 MAP | nicht ausgewiesen |
| `git diff --check` | Exitcode 0 | nicht ausgewiesen |
| Zeilenenden | `i/lf w/lf attr/text eol=lf`, neue Datei 0 CRLF | nicht ausgewiesen |

Die dokumentierten Zahlen sind reproduziert. Die gruenen Gates tragen keine
Aussage ueber die folgenden Findings; sechs der neun Punkte liegen ausserhalb
dessen, was die vorhandenen Tests pruefen.

### Proben

**Probe 1 - Bestandsdaten beim ersten Start nach dem Update.** Storage mit
`sim_startFloorBedarf='24002'`, `sim_startFlexBedarf='150000'`,
`sim_minimumFlexAnnual='60000'` und ohne Haushalts-Override; die drei Felder auf
einen Markerwert gesetzt, danach `initInputPersistence()`:

```
PROBE_A floor=UNBERUEHRT flex=UNBERUEHRT min=UNBERUEHRT
```

Kein Feld wird belegt. Der bisher gespeicherte manuelle Wert ist ab dem Update
wirkungslos.

**Probe 2 - leerer Override im Init-Pfad.**

```
PROBE_B read={"startFloorBedarf":"","startFlexBedarf":"150000","minimumFlexAnnual":"60000"}
PROBE_B initFloor=HTML_DEFAULT_5000
```

`readHouseholdSimulatorNeeds()` liefert den leeren String, `initInputPersistence()`
verwirft ihn wegen `storedVal !== ""`.

**Probe 3 - derselbe Zustand im Profilverbund-Pfad.** Aufruf von
`applyCombinedInputsToUI({startFloorBedarf:24000,...}, 2, {startFloorBedarf:'', ...})`:

```
PROBE_C applyFloor= applyFlex=150000
```

Derselbe gespeicherte Zustand fuehrt in den beiden Pfaden zu zwei verschiedenen
Feldinhalten; im Profilverbund gewinnt der leere Override gegen die Profil-Summe
von 24.000 EUR.

**Probe 4 - reine Floor-Aenderung.** Override geloescht, Felder auf
24.002 / 60.000 / 30.000, dann ein `input`-Event nur auf `startFloorBedarf`:

```
PROBE_D override={"startFloorBedarf":"24002","startFlexBedarf":"60000","minimumFlexAnnual":"30000"}
PROBE_D minimumFlexOverridden=true
```

**Probe 5 - Wertschaeden und Schemaversion.**

```
PROBE_E read={"startFloorBedarf":"abc","startFlexBedarf":"-5000","minimumFlexAnnual":"1e9"}
PROBE_E floor=abc flex=-5000 min=1e9
PROBE_F_SCHEMA string 1.0 -> akzeptiert:99999
PROBE_F_SCHEMA boolean true -> akzeptiert:99999
PROBE_F_SCHEMA zukuenftige v2 -> verworfen
PROBE_F_SCHEMA string 01 -> akzeptiert:99999
```

**Probe 6 - Praezedenz in der Profilaggregation.** `buildSimulatorInputsFromProfileData()`
mit einem Bestandsprofil (`sim_`-Altwerte plus gepflegter Balance-Zustand) gegen
ein neues Profil (nur Balance-Zustand):

```
PROBE_F bestand floor=12000 flex=30000 min=15000
PROBE_F neu     floor=20000 flex=40000 min=10000
PROBE_F balance floor=20000 flex=40000 min=10000 (Pflegewert aus der Balance-Seite)
```

**Probe 7 - Mutationsgegenprobe M1.** `resolveHouseholdNeed` in
`applyCombinedInputsToUI()` auf `(id, fallback) => fallback` reduziert, also der
Kern des Bugfixes vollstaendig neutralisiert:

```
npm test            18.837/18.837 Assertions, 0 Fehler   (unveraendert gruen)
npm run test:browser Browser smoke failed: Simulator household needs reload
                     browser-smoke.test.mjs:1209
```

### Findings

**CB-1 (Blocker, Korrektheit) - der gemeldete Fehler tritt beim Uebergang ein
letztes Mal auf, und der bisherige Wert verschwindet dabei.**
`initInputPersistence()` liest fuer die drei Felder ausschliesslich den neuen
Haushalts-Override; der bisher genutzte `sim_`-Wert wird nicht mehr gelesen und
nicht einmalig uebernommen (Probe 1). Fuer jeden Bestand, der heute einen manuell
eingetragenen Wert traegt, zeigt der erste Start nach dem Deployment wieder die
aggregierte Profil-Summe - exakt das Fehlerbild aus U-01. Wer das nicht bemerkt,
rechnet ab diesem Start mit einer anderen Bedarfsbasis. Das Dokument haelt unter
"Abweichungen und offene Risiken" nur fest, dass Altwerte "nicht destruktiv
migriert oder geloescht" werden; dass sie ab sofort wirkungslos sind und der
sichtbare Wert wechselt, steht dort nicht. Eine Einmal-Uebernahme
(`sim_`-Trio in den Override, solange kein Override existiert) ist ohne
Fachaenderung moeglich.

**CB-2 (Blocker, Seiteneffekte) - die drei profilbezogenen Werte haben keinen
Schreiber mehr.** `initInputPersistence()` war der einzige Produktivpfad, der
`sim_startFloorBedarf`, `sim_startFlexBedarf` und `sim_minimumFlexAnnual`
geschrieben hat; eine Suche ueber `app/` findet nach der Aenderung keinen
`setItem` mehr auf diese Schluessel, waehrend `simulator-profile-inputs.js:268`
sie unveraendert liest. Der Balance-Fallback greift laut
`simulator-profile-inputs.js:361` nur bei einem Wert `<= 0`. Gemessen in Probe 6:
Ein Bestandsprofil liefert dauerhaft 12.000 / 30.000 / 15.000, obwohl die
Balance-Seite 20.000 / 40.000 / 10.000 pflegt; ein neues Profil folgt der Balance.
Damit ist die Profil-Summe, die AK3 ausdruecklich als Default zusichert, fuer
Bestandsprofile eingefroren und ueber keine Oberflaeche mehr korrigierbar. Der
Browser-Smoke prueft mit `registry.profiles.dieter.data.sim_startFloorBedarf ===
'12000'` genau diese Unveraenderlichkeit und schreibt sie als gewuenscht fest.

**CB-3 (Blocker, Fehlerbehandlung) - ein leeres Bedarfsfeld wird zum
dauerhaften Zustand.** Jedes `input`-Ereignis persistiert den aktuellen
Feldinhalt; das Leeren eines Feldes ist der uebliche erste Schritt beim Aendern
einer Zahl und speichert `''`. Danach behandeln die beiden Pfade denselben
Zustand unterschiedlich (Proben 2 und 3): Der Init-Pfad ignoriert den leeren
Wert, der Profilverbund-Pfad setzt das Feld auf leer und schlaegt damit die
Profil-Summe. Vor dem Bugfix war dieser Endzustand unmoeglich, weil
`applyCombinedInputsToUI()` bedingungslos die Summe eingetragen hat. Ein leerer
Floor liefert ueber `readNumber('startFloorBedarf', 0)` den Wert 0;
`validateSimulatorInputs()` prueft `minimumFlexAnnual` und den Runway, aber
keinen Floor - die Simulation laeuft ohne Grundsicherungsbedarf und ohne Hinweis
weiter.

**CB-4 (Blocker, Vertragstreue) - Dokumentations-Sync nicht erfuellt.**
`AGENTS.md` verlangt bei geaendertem Modulzuschnitt die Aktualisierung der
relevanten Modul-READMEs. `docs/reference/SIMULATOR_MODULES_README.md:26-38`
fuehrt die Helper-Module des Simulators einzeln auf; das neue Modul
`simulator-household-needs-persistence.js` fehlt dort ebenso wie in der
Modultabelle `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md:927`, die die
"Persistenz gemeinsamer Eingaben" weiterhin allein
`simulator-main-input-persist.js` zuschreibt. Der neue globale Schluessel ist
damit ausserhalb dieses Bugfix-Dokuments nirgends beschrieben.

**CB-5 (Restrisiko, Seiteneffekte) - die Mindest-Flex-Aufschluesselung faellt
auch dann weg, wenn nur der Floor geaendert wurde.** Der Schreibpfad uebernimmt
bei jeder Aenderung alle drei sichtbaren Werte, also enthaelt der Override
praktisch immer `minimumFlexAnnual` (Probe 4). Damit ist `minimumFlexOverridden`
dauerhaft wahr und `window.__profilverbundMinimumFlexProfiles` wird auf `null`
gesetzt, auch wenn der Mindest-Flex unveraendert der Profil-Summe entspricht.
Wirkung: `simulator-portfolio-inputs.js:84` haengt die Aufteilung nicht mehr an
die Inputs, `simulator-backtest.js:234` liefert `minimumFlexProfiles: []`. Die
Engine rechnet unveraendert - die Kette ist reine Transparenz -, aber die in
`ARCHITEKTUR_UND_FACHKONZEPT.md:1668` zugesicherte Profilaufschluesselung
verschwindet aus dem Backtest-Ergebnis, ohne dass der Nutzer den Mindest-Flex
angefasst hat.

**CB-6 (Restrisiko, Fehlerbehandlung) - der Schemacontract prueft Typen, nicht
Werte.** `normalizeStoredValue()` akzeptiert jeden String. Ein Override mit
`'abc'`, `'-5000'` oder `'1e9'` passiert die Pruefung und wird in die Felder
geschrieben (Probe 5). AK6 ist damit fuer JSON- und Schemaschaeden erfuellt, fuer
Wertschaeden nicht: Solche Werte fuehren nicht zum Profil-Default, sondern in ein
ungueltiges Feld. Vor dem Bugfix hat der Profilverbund jeden solchen Wert wieder
ueberschrieben; jetzt gewinnt er.

**CB-7 (Restrisiko, Testabdeckung) - die Kernpraezedenz haengt an genau einer
Browser-Assertion.** Mit vollstaendig neutralisiertem `resolveHouseholdNeed`
bleibt `npm test` bei 18.837/18.837 gruen; nur `npm run test:browser` faellt aus,
in `browser-smoke.test.mjs:1209` (Probe 7). Die 4.400 Zeilen Browser-Smoke
laufen nicht in der Standard-Suite. Faellt dieser Fall aus oder wird er
flaky-bedingt uebersprungen, ist der eigentliche Bugfix unbewacht.

**CB-8 (Restrisiko, Vertragstreue) - die Versionspruefung ist in beide
Richtungen unscharf.** `Number(parsed.schemaVersion) !== SCHEMA_VERSION`
akzeptiert `'1.0'`, `'01'` und `true` als v1 (Probe 5) und verwirft ein
kuenftiges v2 kommentarlos, also ohne Migration und ohne Signal an den Nutzer.
Wer die App nach einer spaeteren Schemaerhoehung einmal in einer aelteren
Version oeffnet, verliert die Werte still auf die Profil-Summe.

**CB-9 (Hinweis, Vertragstreue) - `applyCombinedInputsToUI` wurde exportiert,
ohne dass ein Konsument existiert.** Der Export dient allein dem Default-Parameter
`householdNeedOverrides = readHouseholdSimulatorNeeds()`. Die Modul-API waechst
damit um eine Funktion, die bei jedem Aufruf ohne drittes Argument selbst auf den
Storage zugreift.

### Findings-Lifecycle

- Aus frueheren Runden uebernommen: keine (erste Reviewrunde zu diesem Bugfix).
- Neu eingefuehrte Blocker: CB-1, CB-2, CB-3, CB-4.
- Neu eingefuehrte Restrisiken: CB-5, CB-6, CB-7, CB-8.
- Neu eingefuehrte Hinweise: CB-9.
- Widerlegte Hypothesen: Ich hatte angenommen, dass ein Restore aus einem
  Backup ohne den neuen Schluessel den aktuellen Override stehen laesst. Die
  Loeschliste in `balance-storage.js:197-200` filtert
  `getPersistenceKeys()` gegen die Snapshot-Schluessel und laesst den Key durch;
  ein altes Backup entfernt den Override also korrekt. Ebenfalls widerlegt: Ich
  hatte vermutet, `minimumFlexProfiles` gehe in die Engine-Rechnung ein; eine
  Suche ueber `engine/` findet keinen Treffer, die Kette endet in
  `globalBacktestData`.

## Review-Ergebnis (Claude, Runde 1)

- Status: blockiert
- Blocker:
  - CB-1: bestehende `sim_`-Werte werden ab dem Update ignoriert; der erste Start
    nach dem Deployment zeigt wieder das gemeldete Fehlerbild und wechselt still
    die Bedarfsbasis.
  - CB-2: die drei profilbezogenen Schluessel haben keinen Schreiber mehr; die
    Profil-Summe aus AK3 ist fuer Bestandsprofile eingefroren und ignoriert die
    in der Balance gepflegten Werte.
  - CB-3: ein leerer Override wird dauerhaft festgeschrieben und leert das
    Bedarfsfeld; ein Floor von 0 laeuft ohne Validierung durch.
  - CB-4: Modulreferenz und Architekturtabelle kennen das neue Modul und den
    neuen globalen Schluessel nicht (Dokumentations-Sync aus `AGENTS.md`).
- Restrisiken:
  - CB-5: die Mindest-Flex-Aufschluesselung faellt auch bei reiner Floor-Aenderung
    weg (Transparenz, keine Rechenaenderung).
  - CB-6: semantisch beschaedigte Werte passieren den Schemacontract.
  - CB-7: die Kernpraezedenz ist ausschliesslich im Browser-Gate abgesichert.
  - CB-8: die Versionspruefung ist tolerant nach unten und still nach oben.
  - CB-9: `applyCombinedInputsToUI` ist ohne Konsument exportiert.
- Pre-Mortem: In drei Monaten meldet der Nutzer erneut, die Rahmendaten stimmten
  nicht. Wahrscheinlichste Ursache: Er hat nach dem Update einmal den Floor
  korrigiert; dabei wurden Flex und Mindest-Flex in dem Zustand eingefroren, in
  dem sie zufaellig gerade standen - naemlich in der Profil-Summe aus
  `sim_`-Altwerten, die seit dem Update kein Schreiber mehr pflegt und die den
  inzwischen in der Balance gefuehrten Bedarf nicht mehr abbildet. Der Simulator
  zeigt seither eine Kombination, die weder der Balance noch einer bewussten
  Eingabe entspricht, und ein Reset hilft nicht dauerhaft, weil der
  wiederhergestellte Profil-Default selbst veraltet ist.

## Freigabestatus

Codex implementiert und validiert den Bugfix, erteilt aber keine Eigenfreigabe.
Review und Commit durch Claude/Gemini bzw. den Nutzer stehen aus.
