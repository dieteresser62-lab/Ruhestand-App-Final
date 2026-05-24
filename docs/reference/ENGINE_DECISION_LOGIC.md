# Engine Decision Logic

Diese Datei beschreibt die fachliche Entscheidungslogik der Engine und der
nachgelagerten Balance-/Simulator-Pfade. Ziel ist eine lesbare Uebersicht fuer
fachliche Diskussionen, nicht eine vollstaendige Code-Dokumentation jeder
Hilfsfunktion.

## 1. Zweck der Jahresentscheidung

Die Engine beantwortet pro Jahr im Kern vier Fragen:

| Frage | Ergebnis |
|---|---|
| Wie hoch ist der geplante Bedarf? | `spendingResult` mit Floor/Flex/Guardrails |
| Wie hoch soll die Liquiditaet sein? | `zielLiquiditaet` auf Basis von Profil, Bedarf und Markt |
| Muss gehandelt werden? | `action.type`: `NONE` oder `TRANSACTION` |
| Wenn gehandelt wird: woher und wohin? | `quellen`, `verwendungen`, Steuerdaten und Diagnose |

Die fachliche Leitidee ist nicht "Liquiditaet immer auf Ziel auffuellen",
sondern "nur handeln, wenn die Regeln einen echten Bedarf oder eine guenstige
Rebalancing-Situation erkennen".

## 2. Jahresablauf

```mermaid
flowchart TD
    A["Jahresstart: Input + LastState"] --> B["Input normalisieren und validieren"]
    B --> C["Marktanalyse"]
    C --> D["Bedarf und Spending berechnen"]
    D --> E["Ziel-Liquiditaet berechnen"]
    E --> F["Transaktionsbedarf bestimmen"]
    F --> G{"Transaktion noetig?"}

    G -- "Nein" --> H{"Surplus-Rebalancing moeglich?"}
    H -- "Ja" --> I["Ueberschuss-Liquiditaet investieren"]
    H -- "Nein" --> J["Keine Aktion"]

    G -- "Ja" --> K["Sale Engine: Verkaufsquellen und Steuern"]
    K --> L{"3-Bucket aktiv?"}
    L -- "Ja" --> M["3-Bucket-Postprocessing"]
    L -- "Nein" --> N["Standard-Aktion"]

    I --> O["Jahresergebnis"]
    J --> O
    M --> O
    N --> O
```

Code-Mapping:

| Schritt | Modul |
|---|---|
| Jahresorchestrierung | `engine/core.mjs` |
| Marktanalyse | `engine/analyzers/MarketAnalyzer.mjs` |
| Spending | `engine/planners/SpendingPlanner.mjs` |
| Ziel-Liquiditaet | `engine/transactions/transaction-utils.mjs` |
| Transaktionsentscheidung | `engine/transactions/transaction-action.mjs` |
| Verkauf/Steuern | `engine/transactions/sale-engine.mjs` |
| 3-Bucket | `engine/transactions/three-bucket-logic.mjs` |

## 3. Liquiditaetsentscheidung

Die Ziel-Liquiditaet wird dynamisch berechnet. Unterhalb des ATH kann das Ziel
Richtung Mindest-Runway sinken; oberhalb des ATH kann der Puffer steigen. In
schwierigeren Marktregimen wird Flex-Bedarf nur teilweise in die Zielrechnung
einbezogen.

```mermaid
flowchart TD
    A["Aktuelle Liquiditaet und Ziel-Liquiditaet"] --> B{"Puffer/Runway kritisch?"}

    B -- "Ja, Baer oder Recovery" --> C["Runway-Notfuellung Baer"]
    B -- "Ja, neutral" --> D["Runway-Notfuellung neutral"]
    B -- "Nein" --> E{"Nicht-Baerenmarkt?"}

    E -- "Ja" --> F["Opportunistisches Rebalancing pruefen"]
    E -- "Nein" --> G["Keine regulare Auffuellung"]

    C --> H["Verkauf berechnen"]
    D --> H
    F --> I{"Bedarf oder Rebalancing ueber Schwelle?"}
    I -- "Ja" --> H
    I -- "Nein" --> J["Keine Aktion"]
    G --> J
```

Wichtige Zonen:

| Zone | Bedeutung | Typische Aktion |
|---|---|---|
| Komfortzone | Liquiditaet ausreichend | keine Aktion oder Surplus-Rebalancing |
| Toleranzzone | unter Ziel, aber nicht kritisch | haeufig keine Aktion, ggf. Opportunismus |
| Guardrail-Zone | Runway/Coverage unter Schwelle | begrenztes Auffuellen |
| Notfallzone | Zahlungsfaehigkeit/Floor gefaehrdet | Mindestschwellen werden gelockert |

## 4. Verkaufsquellen

Die Verkaufsreihenfolge haengt vom Kontext ab. Sie ist aktuell nicht als
gemeinsame Zielquoten-Logik fuer Gold und Bonds modelliert, sondern durch
Sonderregeln bestimmt.

| Kontext | Aktuelle Logik |
|---|---|
| Defensive Situation oder Emergency Sale | Gold, dann Bonds, dann Aktien |
| Gold ueber Obergrenze | Gold, dann Aktien |
| Standard-Sale-Engine | Bonds, dann Aktien, dann Gold |
| 3-Bucket Bad Year | Aktienverkaeufe werden durch Bond-Verkaeufe ersetzt |
| Simulator Forced Sale ohne 3-Bucket | Aktien, dann Gold |
| Simulator Forced Sale mit 3-Bucket Bad Year | Bonds only |

```mermaid
flowchart TD
    A["Sale Engine"] --> B{"Defensiver Kontext?"}
    B -- "Ja" --> C["Gold -> Bonds -> Aktien"]
    B -- "Nein" --> D{"Gold ueber Obergrenze?"}
    D -- "Ja" --> E["Gold -> Aktien"]
    D -- "Nein" --> F["Bonds -> Aktien -> Gold"]
```

Hinweis: Im Standardfall sagt der Code-Kommentar "Aktien zuerst", der Code
ordnet aber `bondKeys` vor Aktien ein. Das ist eine fachliche Pruefstelle.

## 5. Gold-Logik

Gold wird ueber Zielquote, Rebalancing-Band und Floor gesteuert.

| Regel | Wirkung |
|---|---|
| Gold unter Untergrenze | Gold-Kaufbedarf kann entstehen |
| Liquiditaet unter Ziel | Gold-Kauf wird blockiert bzw. auf Cash-Surplus begrenzt |
| Gold ueber Obergrenze | Gold-Verkaufsbedarf kann entstehen |
| Gold-Floor aktiv | normale Verkaeufe duerfen den Floor nicht unterschreiten |
| Emergency/Notfall | Gold-Floor kann ignoriert werden |

```mermaid
flowchart TD
    A["Gold aktiv?"] -->|Nein| Z["Keine Gold-Sonderlogik"]
    A -->|Ja| B["Zielwert und Band berechnen"]
    B --> C{"Gold unter Band?"}
    C -- "Ja" --> D["Gold-Kaufbedarf"]
    C -- "Nein" --> E{"Gold ueber Band?"}
    E -- "Ja" --> F["Gold-Verkaufsbedarf"]
    E -- "Nein" --> G["Gold neutral"]
    D --> H{"Liquiditaet unter Ziel?"}
    H -- "Ja" --> I["Gold-Kauf blockieren oder begrenzen"]
    H -- "Nein" --> J["Gold-Kauf aus Surplus/Transaktion moeglich"]
```

## 6. 3-Bucket-Jilge

Der 3-Bucket-Modus ist eine nachgelagerte Speziallogik. Die Engine erzeugt
zunaechst eine normale Aktion. Danach kann 3-Bucket diese Aktion veraendern.

```mermaid
flowchart TD
    A["Normale Engine-Aktion"] --> B{"3-Bucket aktiv?"}
    B -- "Nein" --> Z["Aktion bleibt unveraendert"]
    B -- "Ja" --> C{"Aktienrendite < Drawdown-Trigger?"}

    C -- "Ja" --> D["Bad Year"]
    D --> E["Geplante Aktienverkaeufe messen"]
    E --> F{"Bond-Tranchen vorhanden?"}
    F -- "Ja" --> G["Netto-Bedarf nur aus Bonds decken"]
    F -- "Nein" --> H["Unmet Liquidity erfassen"]

    C -- "Nein" --> I["Good/Normal Year"]
    I --> J{"Bondbucket unter Ziel?"}
    J -- "Ja" --> K["Aktien verkaufen und Bonds auffuellen"]
    J -- "Nein" --> Z
```

Wichtige Parameter:

| Parameter | Bedeutung |
|---|---|
| `decumulation.mode` | aktiviert `3_bucket_jilge` |
| `drawdownTrigger` | Schwelle fuer Bad Year |
| `bondTargetFactor` | Ziel: Faktor mal Jahresentnahme |
| `bondRefillThreshold` | Toleranz, ab wann Refill erfolgt |
| `bondNominalReturn` | feste Bond-Rendite im Simulator |

## 7. Simulator-Zusatzlogik

Der Simulator nutzt die Engine pro Jahr, fuehrt danach aber weitere
Jahresmechaniken aus: Portfolio mutieren, Entnahme auszahlen, Forced Sales und
Bond-Refill.

```mermaid
flowchart TD
    A["Engine simulateSingleYear"] --> B["3-Bucket Override anwenden"]
    B --> C["Transaktion auf Portfolio anwenden"]
    C --> D["Forced Shortfall vor Auszahlung berechnen"]
    D --> E{"Liquiditaetsluecke?"}
    E -- "Ja" --> F["Pflegebucket pruefen"]
    F --> G["Forced Sale zur Liquiditaetsdeckung"]
    E -- "Nein" --> H["Auszahlung aus Liquiditaet"]
    G --> H
    H --> I["Payout-Fallback pruefen"]
    I --> J["3-Bucket Bond-Refill Postprocessing"]
    J --> K["Cash-Zinsen und Jahresergebnis"]
```

Forced-Shortfall-Formel im Simulator:

```text
forcedShortfall =
    max(0, JahresentnahmeTarget + 1 Monat Netto-Floor - aktuelle Liquiditaet)
```

## 8. Balance-App-Zusatzlogik

Die Balance-App nutzt dieselbe Engine-Jahresentscheidung. Danach gibt es ein
Postprocessing fuer Profilverbund und 3-Bucket.

```mermaid
flowchart TD
    A["Balance liest Eingaben"] --> B["Engine simulateSingleYear"]
    B --> C{"Profilverbund aktiv?"}
    C -- "Ja" --> D["Aktionen je Profil mergen"]
    C -- "Nein" --> E["Single-Profil-Aktion"]
    D --> F{"3-Bucket aktiv?"}
    E --> F
    F -- "Ja" --> G["3-Bucket-Postprocessing und Diagnose"]
    F -- "Nein" --> H["Standard-Diagnose"]
```

## 9. Bekannte fachliche Spannungen

| Punkt | Aktueller Stand |
|---|---|
| Bonds vs. Gold | keine gemeinsame Reserve-Entscheidung nach relativer Ueber-/Untergewichtung |
| 3-Bucket Bad Year | Bonds verdraengen Aktienverkaeufe, Gold wird in dieser Speziallogik nicht gleichrangig betrachtet |
| Standard-Sale-Order | Code verkauft Bonds vor Aktien und Gold; Kommentar nennt Aktien zuerst |
| Simulator Forced Sale | hat eigene Fallback-Reihenfolge, die nicht identisch mit der normalen Sale Engine ist |
| Refill-Logik | Bond-Refill wird in guten Jahren separat aus Aktien finanziert |

Diese Punkte sind keine Fehlerbeschreibung, sondern markieren Stellen, an denen
fachliche Zielsetzung und technische Implementierung bewusst abgeglichen werden
sollten.

