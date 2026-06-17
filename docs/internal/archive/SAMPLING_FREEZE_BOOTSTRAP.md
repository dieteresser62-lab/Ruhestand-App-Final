# Sampling-Freeze: Bootstrap Pfadgenerierung

**Freeze-Datum:** 2026-06-17  
**Commit-Hash:** `b7d85b7`  
**Status:** freigegeben  
**Autor:** Gemini / Antigravity  

---

## 1. Zweck und Rahmen
Dieses Dokument fixiert das Verhalten der stochastischen Pfadgenerierung nach der Implementierung des **Stationary Bootstrap** (Schritt 4) und vor der Einführung des optionalen **Fat-Tail/Crash-Modell Overlays** (Schritt 5). Dies stellt sicher, dass die nackten Pfadgenerierungsalgorithmen deterministisch und paritätssicher eingefroren sind.

---

## 2. Parameter des Vergleichslaufs
* **Profil:** Paar-Profil (Startalter 65 m, Partner 62 w)
* **Entnahme-Einstellungen:** DYNAMIC-FLEX, kontinuierliches CAPE aktiv (Soll-Zustand, umgangen via globaler CONFIG-Mutation), Langlebigkeits-Quantilshift 0.05.
* **Simulations-Einstellungen:** Seed 42, 1000 MC-Läufe, max. 45 Jahre Dauer.
* **Vergleichsparameter:** Blockgröße / Erwartete Blocklänge = 5 Jahre.

---

## 3. Kennzahlen-Vergleich
| Pfad-Methode | MC-Erfolgsquote | Median Endvermögen | Consumption-at-Risk (p10) | Bemerkung / RNG-Fußabdruck |
|---|---|---|---|---|
| **Classical Bootstrap** (Blockgröße 5) | 98.5% | 1.701.861 € | 36.480 € | Fixe historische Blöcke. Verbraucht 1 Startjahr-Seed per Run. |
| **Stationary Bootstrap** (Erwartete Länge 5) | 98.6% | 1.622.713 € | 30.000 € | Geometrisch verteilte Längen. Verbraucht genau 1 RNG-Wurf pro Jahr. |

---

## 4. RNG-Zufallszahlen-Verbrauchspfad
Der Stationary Bootstrap Sampler wurde so designed, dass er:
1. Pro Simulationsjahr **genau ein** stochastisches Ereignis (Wurf mit Wahrscheinlichkeit $p = 1 / \text{expectedBlockLength}$) ausführt, um zu entscheiden, ob ein neuer historischer Block startet oder das Folgejahr sequentiell gezogen wird.
2. Bei Erreichen des historischen Datenendes (Jahr 2025) einen erzwungenen Block-Neustart (`data_end`) auslöst, wobei dennoch ein RNG-Wurf ausgeführt und verworfen wird. Dadurch bleibt der RNG-Footprint pro Simulationsjahr exakt konstant bei 1 Aufruf, was die Paritätstests (Multithreading/Singlethread) maximal robust hält.

---

## 5. Entscheidung für Standard-Bootstrap in Paket 5
Für die nachfolgende Stress- und Crashmodellierung (Paket 5) wird vereinbart:
* **Default-Methode:** Das Fat-Tail-Overlay wird primär auf Basis des **Classical Bootstrap** und des **Stationary Bootstrap** getestet.
* **Erwartete Blocklänge:** Als Standard-Vergleichsbasis für stochastische Läufe wird eine erwartete Blocklänge von **5 Jahren** festgelegt.

---

## 6. Freigabe-Entscheidung
* **Status:** Freigegeben für Paket 5. Blocker behoben und verifiziert.
* **Pre-Mortem:** Angenommen, das Zusammenspiel zwischen Stationary Bootstrap und Fat-Tail führt in 3 Monaten zu Fehlern: Die wahrscheinlichste Ursache ist eine asynchrone Handhabung des per-run Seeds bei Web-Worker-Chunking, wenn durch stochastische Crash-Injektionen die Anzahl der RNG-Abrufe zwischen den Pfadgeneratoren auseinanderdriftet.
