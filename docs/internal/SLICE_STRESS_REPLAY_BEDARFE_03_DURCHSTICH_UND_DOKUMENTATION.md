# Slice 3: Echter Replay-Durchstich und Dokumentationssync

## Zweck

Dieser Slice schließt den Bedarfsvarianten-Bugfix mit einem echten
Monte-Carlo-Capture, einem materialisierten 60-Jahres-Pfad und der realen
Jahresengine ab. Er ändert keine Engine-Semantik und keine Replay-Produktivlogik.

## Nachweisgrenzen

- Eine neue V2-Variante setzt Floor, Flex und Mindest-Flex gemeinsam und läuft
  auf demselben Pfad- und Herkunftsfingerprint wie die Baseline.
- Baselineinputs und Ursprungslog bleiben vor und nach dem Variantenlauf
  unverändert.
- Floor/Flex erzeugen ein beobachtbares Finanzdelta; Mindest-Flex erreicht die
  jährliche Engine-Diagnostik und den aggregierten Fehlbetrag.
- Der echte Contractfehler für Mindest-Flex oberhalb des effektiven
  Flex-Bedarfs wird mit beiden Beträgen deutsch formatiert.
- Explizite Nullwerte für Floor und Flex überleben Export, Import und erneuten
  Runnerlauf. Ein zur Baseline wirkungsgleiches Mindest-Flex-Nullblatt wird
  erst bei der Materialitätsprüfung als No-Op-Blatt entfernt.
- Die eingecheckte V1-Golden-Fixture bleibt importierbar. Zusätzlich wird ein
  V1-Workspace auf dem echten Pfad exportiert, importiert und erneut
  ausgeführt; fehlende V2-Bedarfsblätter übernehmen die Baselinewerte.

## Browser-Orakel

Der Browser-Smoke prüft die Fokusansicht, den nativen Experten-Toggle mit
ARIA-Synchronität, den Werterhalt beim Schließen und Öffnen sowie die
deutschsprachige Relationserroranzeige aus dem echten Contract im Live-DOM.

## Dokumentationssync

README und Handbuch beschreiben den Nutzerworkflow. Die technischen
Referenzen dokumentieren Whitelist-Dispatch, Nullvertrag, effektive Relation
und den nicht persistierten Expertenbereich. Die Testreferenz führt V1-Golden-
Import und V2-E2E-Orakel getrennt auf.

## Validierung

Fokussierte Entwicklerläufe:

```text
node tests/run-single.mjs tests/stress-replay-e2e.test.mjs
node tests/browser-smoke.test.mjs
git diff --check
```

Die vollständige Matrix `npm test` und `npm run test:browser` sowie die
fingerprintgebundene Attestierung gehören ausschließlich dem Orchestrator.

## Restrisiken

Die Performancefixture misst weiterhin nur Baseline plus eine Alternative.
Dadurch bleibt das historische Budget vergleichbar; die zusätzlichen
fachlichen Durchstiche sind keine neue Performancebaseline. Offene
Reviewerbeobachtungen aus früheren Slices bleiben im orchestrierten
Findings-Lebenszyklus und werden hier nicht eigenständig geschlossen.
