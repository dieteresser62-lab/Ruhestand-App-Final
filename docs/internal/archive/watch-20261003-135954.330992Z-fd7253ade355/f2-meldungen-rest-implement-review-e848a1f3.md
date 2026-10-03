# Gesamtaudit – f2-meldungen-rest-implement

<!-- audit:meta:begin -->
Aufgabe: f2-meldungen-rest-implement · Zielbranch: `feature/meldungen-sichtbar` · Lauf: `watch-20261003-135954.330992Z-fd7253ade355` · Stand: abgeschlossen
Provider-Attempts:

| Slot | Rolle | Provider | Profil | Modell | Effort | Binary-Identität |
|---|---|---|---|---|---|---|
| implementer | implementer | codex | implementation | gpt-6.1-sol | high | verified: ~/.nvm/versions/node/v22.23.2/bin/codex (`b54337198672060af3d8dbf12f54c9b97b0b21a0f72252f03f7f32d63bbfe81d`) |
| reviewer | reviewer | claude | review | opus | high | verified: ~/.local/bin/claude (`88694734fe19206de74d00d345886f58f1223377d235266d22eaa50394a25214`) |
| implementer | implementer | codex | implementation | gpt-6.1-sol | high | verified: ~/.nvm/versions/node/v22.23.2/bin/codex (`b54337198672060af3d8dbf12f54c9b97b0b21a0f72252f03f7f32d63bbfe81d`) |
| reviewer | reviewer | claude | review | opus | high | verified: ~/.local/bin/claude (`88694734fe19206de74d00d345886f58f1223377d235266d22eaa50394a25214`) |
| implementer | implementer | codex | implementation | gpt-6.1-sol | high | verified: ~/.nvm/versions/node/v22.23.2/bin/codex (`b54337198672060af3d8dbf12f54c9b97b0b21a0f72252f03f7f32d63bbfe81d`) |
| reviewer | reviewer | claude | review | opus | high | verified: ~/.local/bin/claude (`88694734fe19206de74d00d345886f58f1223377d235266d22eaa50394a25214`) |
| implementer | implementer | codex | implementation | gpt-6.1-sol | high | verified: ~/.nvm/versions/node/v22.23.2/bin/codex (`b54337198672060af3d8dbf12f54c9b97b0b21a0f72252f03f7f32d63bbfe81d`) |
| reviewer | reviewer | claude | review | opus | high | verified: ~/.local/bin/claude (`88694734fe19206de74d00d345886f58f1223377d235266d22eaa50394a25214`) |
| implementer | implementer | codex | implementation | gpt-6.1-sol | high | verified: ~/.nvm/versions/node/v22.23.2/bin/codex (`b54337198672060af3d8dbf12f54c9b97b0b21a0f72252f03f7f32d63bbfe81d`) |
| reviewer | reviewer | claude | review | opus | high | verified: ~/.local/bin/claude (`88694734fe19206de74d00d345886f58f1223377d235266d22eaa50394a25214`) |
| implementer | implementer | codex | implementation | gpt-6.1-sol | high | verified: ~/.nvm/versions/node/v22.23.2/bin/codex (`b54337198672060af3d8dbf12f54c9b97b0b21a0f72252f03f7f32d63bbfe81d`) |
| reviewer | reviewer | claude | review | opus | high | verified: ~/.local/bin/claude (`88694734fe19206de74d00d345886f58f1223377d235266d22eaa50394a25214`) |
| final_reviewer | reviewer | claude | review | opus | high | verified: ~/.local/bin/claude (`88694734fe19206de74d00d345886f58f1223377d235266d22eaa50394a25214`) |
<!-- audit:meta:end -->

## Übersicht

<!-- audit:overview:begin -->
| Slice | Titel | Stand | Commit | Runden | Befunde |
|---:|---|---|---|---:|---:|
| 1 | Importfehler nach Wiederherstellung neu darstellen | freigegeben | 820315a3 | 1 | 0 |
| 2 | Hinweise korrekt kennzeichnen und interne Sperren erklären | freigegeben | 64fd109f | 1 | 0 |
| 3 | Snapshotfehler bei abgebrochener Ordnerwahl erhalten | freigegeben | 46ae1e26 | 1 | 0 |
| 4 | Fokus und kompakte kontrastreiche Meldungsdarstellung | freigegeben | 3b2b5e69 | 2 | 1 |
| 5 | Tatsächliche Bedienwege und Prüfnachweise dokumentieren | freigegeben | 4b02477e | 2 | 0 |
<!-- audit:overview:end -->

## Befunde

<!-- audit:findings:begin -->
| ID | Herkunft | Klasse | Stand | Titel |
|---|---|---|---|---|
| R-01 | Slice 4 | Befund | geschlossen | Balance.html setzt `tabindex="0"` und `aria-label="Aktionsfehler"` dauerhaft auf `#action-error-container` |
<!-- audit:findings:end -->

## Halte und Entscheidungen

<!-- audit:holds:begin -->
Keine.
<!-- audit:holds:end -->

## Abnahmereview

<!-- audit:acceptance-review:begin -->
Abnahmereview abgeschlossen.

Geprüft:
> Geprüft wurde der vollständige Branch-Diff gegen aadddd75: alle 16 Teile, beide Läufe einschließlich Archiv. Pfadgrenze: Jeder Diffpfad liegt in authorized_paths. Korrektheit Renderer: toast/handleError/handleActionError/clearActionError mit Timer-Revision und Containerprüfung. Ausgabe nur über textContent. syncActionErrorAccessibility setzt tabindex -1/0 und aria-label nur bei Einträgen, damit ist R-01 wirksam geschlossen. Die Fokusübergabe beim Schließen gilt nur für die aktuelle Eintragsidentität. Importpfade: previewRestoredInputs ruft clearError auf, wartet PREVIEW ab und schluckt Vorschaufehler. Erst danach folgt handleActionError, und das Dateifeld wird im finally geleert. Abgesichert ist das in balance-ui-orchestration (sequence.slice(-2)==='preview,error', writes===0, Fehlercodes inkl. rollback_failed) und in balance-smoke (Baselinevergleich vor dem Aktionsfehler, storageWrites unverändert). Ordnerknopf: Der Binder wartet connectFolder ab. clearActionError('snapshots') steht erst nach idb.set und Handle-Übernahme. Node-Tests prüfen jede offene Phase sowie abort/denied/storage-error/success. Hinweis-Typ: Alle in TECHNICAL genannten Aufrufe übergeben 'info', geprüft in den Annual-, Message- und Exporttests. Doku-Abgleich: README, Handbuch, TECHNICAL, BALANCE_MODULES_README und tests/README stimmen mit dem Code überein. Das gilt für 6000 ms, Bereichsschlüssel, Rücksetzgrenzen (No-op, nested, Reentranz, confirm), ARIA-Attribute, Fokusregeln, min(16rem, 30vh) und Druckausblendung. Die beschriebenen Assertions existieren im Diff. Validierung: npm test PASS auf Fingerprint [Hash ausgelassen]….

Größtes Restrisiko:
> Einige Aussagen lassen sich am Diff nicht entscheiden, weil nur Hunks vorliegen und der Lesevertrag auf Manifest, Request und Diff beschränkt ist. Erstens: Liegen btnUndoNachruecken bzw. ein manueller Nachrücken-Pfad sichtbar in Balance.html? Dann wäre die Aussage „Nutzerpfade für annual sind ausschließlich die beiden Jahresknöpfe“ unvollständig, denn handleNachruecken und handleUndoNachruecken bereinigen 'annual'. Zweitens: Die bereinigte Export- und Dependency-Liste in BALANCE_MODULES_README, etwa formatDiagnosisPayload, braucht den vollständigen Renderer zur Prüfung. Drittens: Alle neuen Browserfälle (message presentation, folder abort, import restoration, 1/3-s- und 2-s-Sichtbarkeit) wurden nicht ausgeführt. Sie laufen erst in der gesteuerten Sitzung vor dem Merge. Außerdem stehen die allgemeinen Meldungsregeln im Handbuch inhaltlich korrekt, aber unter der Überschrift „Jahres-Update“.

Bruchbedingung:
> Das Urteil kippt in folgenden Fällen: Balance.html bietet einen sichtbaren Undo- oder Nachrücken-Knopf, der handleUndoNachruecken bzw. handleNachruecken direkt auslöst; dann wäre die dokumentierte Annual-Nutzerpfadliste falsch. Der vollständige balance-renderer.js weicht von der dokumentierten Exportliste ab. Die PREVIEW-Vorschau im echten Main schreibt doch, etwa über Profil-Sync. Oder der Browser-Smoke scheitert vor dem Merge an Fokus-, Kontrast-, Layout-, Abbruch- oder Wiederherstellungsprüfungen.

Vorab-Risikoanalyse:
> Wahrscheinlichste spätere Fehlerursache: Der nur extern gefahrene Browser-Smoke scheitert an einem der neuen, umfangreichen Fälle. Möglich ist eine abweichende Tab-Reihenfolge zwischen #openDiagnosisBtn und der Fehlerliste, eine Kontrastberechnung bei abweichendem Computed Style oder die feste 3-s-Messung, falls ein späterer Toast die Abschlussmeldung ersetzt. Zweites Risiko: Die zusätzliche Wiederherstellungsvorschau läuft jetzt auch bei reinen Syntax-Rejects und kostet eine Engineberechnung. Bei rollback_failed rechnet sie mit wiederhergestellten Eingaben gegen einen ersetzten Speicherstand. Die Doku stellt ausdrücklich klar, dass das keine Reparatur ist, aber Nutzer könnten die frischen KPIs als Beleg missverstehen. Drittes Risiko: Ein fehlendes btnJahresUpdate würde inFlight im Orchestrator dauerhaft setzen, weil die Sperre vor dem try gesetzt wird. Mit der realen Balance.html ist das nicht zu erwarten. Keines davon ist im vorliegenden Snapshot als Defekt belegbar.
<!-- audit:acceptance-review:end -->
