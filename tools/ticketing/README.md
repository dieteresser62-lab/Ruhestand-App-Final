# Ticketing Orchestrator

Dieser Ordner enthält den Orchestrator für den Ticket-Workflow.

## Standard

```bash
./bearbeite_aufgabe
```

- Verwendet standardmäßig `Aufgabe.md`
- Resume-first: setzt bestehenden Lauf fort, falls `.orchestrator/state.json` existiert und nicht auf `phase=done` steht
- Falls der vorhandene State bereits `phase=done` ist, startet `./bearbeite_aufgabe` automatisch einen neuen Lauf (mit State-Overwrite)
- Aktiviert automatischen Claude->Gemini Fallback bei Quota/Rate-Limit-Fehlern
- Nutzt Live-Stream im kompakten Modus
- Schreibt State, Logs und Run-Artefakte unter `.orchestrator/`
- Legt Zyklus-Checkpoints unter `.orchestrator/checkpoints/` an (Crash-Recovery)
- Zeigt nach erfolgreichem Lauf einen Summary-Report (Dauer, Zyklen, Findings)

## Eigene Aufgaben-Datei

```bash
./bearbeite_aufgabe MeineAufgabe.md
```

## Resume eines vorhandenen Laufs

```bash
python3 tools/ticketing/orchestrator.py --resume
```

## Recovery steuern

- Standard: Bei `--resume` wird ein laufender (abgebrochener) Zyklus automatisch auf den letzten Checkpoint zurueckgesetzt.
- Recovery deaktivieren:

```bash
python3 tools/ticketing/orchestrator.py --resume --no-recover
```

## Dry-Run (ohne echte Agent-Ausführung)

```bash
python3 tools/ticketing/orchestrator.py --dry-run --auto --task-file Aufgabe.md
```

## Claude Fallback auf Gemini (manuell)

```bash
python3 tools/ticketing/orchestrator.py --allow-fallback-to-gemini --task-file Aufgabe.md
```

## Troubleshooting

### `Task file not found`

- Stelle sicher, dass `Aufgabe.md` existiert
- Oder übergib explizit eine Datei:

```bash
./bearbeite_aufgabe MeineAufgabe.md
```

### DNS-Warnung im Preflight

- Meldungen wie `DNS resolution failed` sind Warnungen
- Der Lauf kann trotzdem starten (außer bei `--strict-preflight`)

### Vorhandener State blockiert neuen Lauf

- Standardverhalten von `./bearbeite_aufgabe`:
  - `phase != done`: Resume
  - `phase == done`: Neustart mit Overwrite

```bash
./bearbeite_aufgabe
```

- Weiterführen (direkt):

```bash
python3 tools/ticketing/orchestrator.py --resume
```

- Neu starten und State explizit überschreiben:

```bash
python3 tools/ticketing/orchestrator.py --force-overwrite-state --task-file Aufgabe.md
```
