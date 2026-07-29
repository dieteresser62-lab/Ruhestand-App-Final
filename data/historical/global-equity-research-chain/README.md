# Offene globale Aktien-Forschungsreihe

Dieses Verzeichnis enthaelt die gefilterten Eingaben fuer
`global_equity_research_index`. Die Reihe ist eine transparente
Forschungsproxykette und kein MSCI- oder anderer Anbieterindex.

## Quellenstand

Abruf und Filterung erfolgten am 2026-07-29.

| Eingabe | Offizielle Quelle | Original-SHA-256 | Gefilterte Datei | Gefilterter SHA-256 |
| --- | --- | --- | --- | --- |
| JST Macrohistory R6 | [JST-Datenbank](https://www.macrohistory.net/database/) | `c1bb91fe56ea50d4f27af5c0fc897d481e89ae38ce41eaecab62134c9354981d` | `jst-r6-equity-inputs.csv` | `435d630ee403039d656a447f3722311115d10de474004504c11496e2a13f74e6` |
| OECD Share Prices, `OECD.SDD.STES,DSD_STES@DF_FINMARK,4.0` | [OECD-Indikator](https://www.oecd.org/en/data/indicators/share-prices.html) | `9ea88f6d07d2d7382ae72ccc8101eed1bd46db5efee8f049352161f3448414e8` | `oecd-share-price-inputs.csv` | `2095c44138bec705457e981691fd983a5648a683c4def7c344c47a88526da75f` |
| EZB-Wechselkurse, Datenfluss `EXR` | [EZB-Daten-API](https://data.ecb.europa.eu/help/api/data) | `047cab457467d382a1933b0759e5b1b2fc8f68c88b2b4de5f21fece4d9ca624a` | `ecb-exr-inputs.csv` | `7c22d6f5c3684eac34cc14dab86d4c211ffd0454f7947d52c89e8fd46af21593` |

JST stellt die Daten unter `CC BY-NC-SA 4.0` bereit. Die OECD verwendet fuer
eigene Daten standardmaessig `CC BY 4.0`, sofern am Material nichts anderes
angegeben ist. Fuer EZB-Statistiken gilt die ESCB-Weiterverwendungsrichtlinie.
Die daraus folgende separate Lizenzabgrenzung steht in
[`LICENSE.md`](LICENSE.md).

## Filterung

- JST: Jahre 1924–2020, 16 Laender, Spalten
  `year, iso, pop, rgdpmad, xrusd, eq_tr, eq_capgain, eq_div_rtn`.
- OECD: Dezember 2020–2025, dieselben 16 Laender, Kursindexwerte und
  Beobachtungsstatus.
- EZB: Dezember 2020–2025 fuer `AUD, CAD, CHF, DKK, GBP, JPY, NOK, SEK, USD`.
  `CAD` bleibt als mitgepruefte Quelle enthalten, obwohl Kanada mangels
  JST-Aktienrendite nicht in das feste 16-Laender-Universum eingeht.

Die drei Originaldateien liegen unter `originals/`. Das Buildskript prueft
ihre SHA-256-Werte, rekonstruiert die drei Filterprojektionen im Speicher und
verlangt Bytegleichheit mit den versionierten CSV-Eingaben. Die Filterung ist
damit Teil des reproduzierbaren Builds und kein manueller Zwischenschritt.

Die gefilterten Zellen werden nicht fachlich korrigiert. Leere JST-Zellen
bleiben leer. Dokumentierte Luecken sind Deutschland 1945–1946 wegen des
fehlenden Wechselkursankers 1945 und Japan 1946–1947 wegen fehlender
Aktien-Total-Returns.

## Konstruktion

Das Skript
[`scripts/build-global-equity-research-chain.mjs`](../../../scripts/build-global-equity-research-chain.mjs)
prueft die Eingabehashes und erzeugt deterministisch
`app/simulator/global-equity-research-chain.js`.

```powershell
npm run build:global-equity-data
```

Die Gewichte verwenden das Vorjahresprodukt aus Bevoelkerung und realem BIP
je Einwohner. 1925–1950 werden die lokalen JST-Total-Returns in einen
USD-Proxy umgerechnet. Erst ab dem Returnjahr 1951 erfolgt die Umrechnung in
deutsche Anlegerwaehrung. Damit geht der rekonstruierte deutsche
Waehrungsfaktor 1949→1950 nicht als globale Marktrendite in die Kette ein.
2021–2025 kombiniert das Skript den
OECD-Dezember-Kursreturn mit dem je Land festgehaltenen
JST-Dividendenreturn 2020 und rechnet Nicht-Euro-Laender mit
EZB-Dezemberkursen in EUR um.

Fuer jedes Land prueft das Skript zusaetzlich, dass JST den Total Return 2020
innerhalb der Float32-Rundung additiv als `eq_capgain + eq_div_rtn` zerlegt.
Erst danach wird `eq_div_rtn` als offengelegter Dividendenbaustein fuer
2021–2025 verwendet.

Die vollstaendigen Formeln, Qualitaetssegmente und Stop-Regeln stehen im
[Slice-02-Vertrag](../../../docs/internal/SLICE_BACKTEST_DATENPRUEFUNG_02_GLOBALE_AKTIENREIHE.md).
