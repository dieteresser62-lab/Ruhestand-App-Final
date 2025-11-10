# Feature-Branch-Workflow

Dieser Leitfaden beschreibt den empfohlenen Workflow für umfangreiche Features (z. B. Parameter-Sweep-Verbesserungen oder Pflegefall-Updates). Ziel ist es, Änderungen isoliert zu entwickeln und kontrolliert in `main` zu integrieren.

---

## 1. Branch-Strategie

1. Ausgehend von `main` einen dedizierten Feature-Branch erstellen:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/<kurze-beschreibung>
   ```
2. Teilaufgaben können auf Unter-Branches entstehen (`feature/...-teil-1`). Diese werden später in den Feature-Branch gemerged.
3. Der Feature-Branch bleibt solange bestehen, bis das Gesamtfeature abgeschlossen und getestet ist.

---

## 2. Pull-Requests

* PRs gegen den Feature-Branch stellen, nicht direkt gegen `main`.
* Kleine, thematisch fokussierte PRs erleichtern Reviews (z. B. „Heatmap-Warnungen“ oder „Storage-Refactor“).
* Beschreibungen sollten enthalten:
  - Zweck der Änderung
  - Relevante Tests/Smoketests (`sim-parity-smoketest.js`, manuelle Checks)
  - Hinweise auf UI-/Dokumentationsupdates

---

## 3. Synchronisation mit `main`

* Regelmäßig `main` in den Feature-Branch mergen, um Konflikte gering zu halten:
  ```bash
  git checkout feature/<kurze-beschreibung>
  git fetch origin
  git merge origin/main
  ```
* Alternativ kann `git rebase origin/main` genutzt werden, solange der Branch nur lokal verwendet wird.

---

## 4. Integration in `main`

1. Sicherstellen, dass alle Teilaufgaben abgeschlossen und dokumentiert sind.
2. Letzte Aktualisierung mit `main` durchführen.
3. Merge mittels `--no-ff`, um den Feature-Branch als eigenen Knoten zu erhalten:
   ```bash
   git checkout main
   git pull origin main
   git merge --no-ff feature/<kurze-beschreibung> -m "Add <Feature>"
   git push origin main
   ```
4. Anschließend kann der Feature-Branch entfernt werden (`git branch -d ...`).

---

## 5. Rollback-Strategie

* Der Merge-Commit dient als Rollback-Anker:
  ```bash
  git log --oneline --graph --first-parent main   # Merge-Commit identifizieren
  git revert -m 1 <merge-commit-hash>
  git push origin main
  ```
* Der Parameter `-m 1` stellt sicher, dass der Stand von `main` beibehalten wird.

---

## 6. Best Practices

* Tests/Smoketests vor jedem Merge in den Feature-Branch und vor dem finalen Merge in `main` ausführen.
* Dokumentation parallel pflegen (README, TECHNICAL.md, Modul-Readmes).
* Branch-Protection-Regeln für `main` und relevante Feature-Branches verwenden.
* Keine Squash-Merges für den finalen Merge nach `main`, damit ein vollständiger Rollback möglich bleibt.
* Commit-Nachrichten mit Kontext (z. B. „Guardrails: neues Regime“).

---

## 7. Checkliste

- [ ] Feature-Branch erstellt und gepusht
- [ ] Teil-Branches gemerged
- [ ] Tests/Smoketests durchgeführt
- [ ] Dokumentation aktualisiert
- [ ] Merge in `main` via `--no-ff`
- [ ] Optional: Branch entfernt

