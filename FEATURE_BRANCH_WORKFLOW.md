# Feature Branch Workflow: Zwei-Personen-Haushalt

## Branch-Informationen

- **Branch-Name:** `feature/zwei-personen-haushalt`
- **Erstellt am:** 2025-11-07
- **Base Branch:** `main` (Commit: 2182ad3)

## Zweck

Dieser langlebige Feature-Branch dient zur Entwicklung der Zwei-Personen-Haushalt-Funktionalität. Alle Teil-PRs sollten in diesen Branch gemerged werden, bevor das gesamte Feature in `main` integriert wird.

## Workflow

### 1. Entwicklung einzelner Features

```bash
# Neues Teil-Feature erstellen
git checkout feature/zwei-personen-haushalt
git checkout -b feature/zwei-personen-haushalt-teil-1

# Entwicklung...
git add .
git commit -m "Beschreibung"
git push -u origin feature/zwei-personen-haushalt-teil-1
```

### 2. Pull Requests erstellen

**Wichtig:** PRs sollten gegen `feature/zwei-personen-haushalt` erstellt werden, NICHT gegen `main`!

```bash
gh pr create --base feature/zwei-personen-haushalt --head feature/zwei-personen-haushalt-teil-1
```

### 3. Nach dem Merge eines Teil-PRs

```bash
# Feature Branch aktualisieren
git checkout feature/zwei-personen-haushalt
git pull origin feature/zwei-personen-haushalt
```

### 4. Integration in Main (erst wenn alles fertig ist)

```bash
# Sicherstellen dass feature/zwei-personen-haushalt aktuell ist
git checkout feature/zwei-personen-haushalt
git pull origin feature/zwei-personen-haushalt

# Main aktualisieren
git checkout main
git pull origin main

# Feature in Main mergen MIT Merge-Commit (wichtig für Rollback!)
git merge --no-ff feature/zwei-personen-haushalt -m "Add Zwei-Personen-Haushalt feature"
git push origin main
```

**WICHTIG:** Die `--no-ff` Flag ist essentiell! Sie erstellt einen Merge-Commit, der später mit einem einzigen Revert rückgängig gemacht werden kann.

## Rollback-Strategie

Falls das komplette Feature rückgängig gemacht werden muss:

```bash
# 1. Merge-Commit Hash finden
git log --oneline --graph --first-parent main

# 2. Merge rückgängig machen
git revert -m 1 <merge-commit-hash>

# 3. Pushen
git push origin main
```

Der Parameter `-m 1` sagt Git, dass die erste Parent (main) behalten werden soll.

## Vorteile dieser Strategie

✅ Isolierte Entwicklung ohne Main zu beeinflussen
✅ Mehrere PRs können unabhängig reviewed werden
✅ Einfacher Rollback des gesamten Features mit einem Befehl
✅ Klare History: Ein Merge-Commit für das gesamte Feature
✅ Kontinuierliche Integration innerhalb des Feature-Branches

## Best Practices

1. **Regelmäßig vom Main Branch mergen** um Konflikte zu vermeiden:
   ```bash
   git checkout feature/zwei-personen-haushalt
   git merge main
   ```

2. **Branch Protection** für `feature/zwei-personen-haushalt` einrichten (optional)

3. **Tests** sollten auf dem Feature-Branch laufen vor dem Main-Merge

4. **Dokumentation** sollte mit entwickelt werden

5. **Nie Squash-Merge verwenden** beim finalen Main-Merge (verhindert sauberen Rollback)

## Status-Tracking

- [ ] Feature-Branch erstellt
- [ ] Feature-Branch gepusht
- [ ] Teil-Feature 1: _Beschreibung_
- [ ] Teil-Feature 2: _Beschreibung_
- [ ] Tests komplett
- [ ] Dokumentation aktualisiert
- [ ] In Main gemerged (Datum: ___)
