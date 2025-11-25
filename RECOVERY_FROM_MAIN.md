# Anleitung: Fehlplatzierte Änderungen aus `main` herauslösen

Wenn versehentlich ein Refactoring direkt auf `main` gelandet ist, kannst du den Stand sauber auf einen Feature-Branch verschieben und `main` zurücksetzen, ohne Arbeit zu verlieren. Die Schritte sind defensiv gehalten und dokumentieren alle Annahmen.

## 1) Ausgangspunkt prüfen
- Stelle sicher, dass dein lokaler Branch die unerwünschten Änderungen enthält (z. B. `work` oder `main`).
- Prüfe den letzten guten Commit-Stand (hier: `ebff01d` aus der Historie) und notiere die Commit-IDs:
  ```bash
  git log --oneline -5
  ```

## 2) Sicherungs-Branch für die Änderungen anlegen
- Erzeuge einen Feature-Branch, der die aktuellen (versehentlichen) Änderungen aufnimmt, damit nichts verloren geht:
  ```bash
  git switch -c feature/simulator-main-split
  ```
- Dieser Branch enthält nun die Refactoring-Commits und kann später als PR-Ziel dienen.

## 3) Zurück auf `main` wechseln und den Stand korrigieren
- Wechsle wieder auf `main` (oder den Branch, der sauber sein soll). Wenn es lokal keinen Branch `main` gibt, lege ihn anhand des letzten guten Commits an:
  ```bash
  # falls `main` existiert
  git switch main

  # falls `main` nicht existiert, neu aus gutem Commit anlegen
  git switch -c main ebff01d
  ```
- Setze `main` auf den letzten guten Commit zurück (Soft-Reset, um lokale Änderungen zu behalten, falls nötig):
  ```bash
  git reset --soft ebff01d
  ```
  Falls keine Arbeitskopieänderungen gewünscht sind, verwende `--hard` (Achtung: verwirft uncommittete Änderungen):
  ```bash
  git reset --hard ebff01d
  ```

## 4) Branch-Zustände verifizieren
- Prüfe den Status auf beiden Branches:
  ```bash
  git status
  git log --oneline -3
  ```
- Ergebnis: `feature/simulator-main-split` enthält das Refactoring, `main` ist auf den letzten stabilen Stand zurückgesetzt.

## 5) Weiteres Vorgehen
- Arbeite am Refactoring ausschließlich im Feature-Branch und öffne PRs gegen diesen Branch.
- Wenn alles getestet und abgenommen ist, merge den Feature-Branch per `--no-ff` nach `main`.
- Optional: `main` nach dem Merge taggen, um den stabilen Release-Stand zu markieren.

## Hinweis zu Remotes
- Wenn die falschen Änderungen bereits gepusht wurden, musst du den korrigierten Stand mit `git push --force-with-lease origin main` veröffentlichen (nur nach Rücksprache im Team).
- Den neuen Feature-Branch pusht du regulär: `git push origin feature/simulator-main-split`.

