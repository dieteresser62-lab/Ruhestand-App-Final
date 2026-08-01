# German gross-wage growth proxy

This directory pins the JST R6 and Destatis inputs used to generate
`GermanGrossWageGrowthChainV2`.

## Source and identity

| File | Series / role | SHA-256 |
| --- | --- | --- |
| `../global-equity-research-chain/originals/JSTdatasetR6.xlsx` | JST R6 `DEU.wage` nominal-wage levels; consecutive-level changes supply the 1925-1946 research proxy | `c1bb91fe56ea50d4f27af5c0fc897d481e89ae38ce41eaecab62134c9354981d` |
| `originals/destatis-bruttomonatsverdienst-index-2026-08-01.html` | Index of average gross monthly earnings without special payments; annual index levels and changes | `1f62492a2efe78fba3ec2ac81dfd90a1c4ccd6f8b68b7bcc6c53ae4d8cd51f1a` |

The source page was retrieved on 2026-08-01 and is published as of 2026-03-10.
It contains index levels from 1946 and published annual changes from 1947
through 2025. The source's stated German territorial definition and long-series
method changes remain part of the qualification.

## Runtime mapping and limitation

Run:

```text
npm run build:german-gross-wage-data
npm run verify:german-gross-wage-data
```

The published percentage for reporting year `t` is applied once in simulation
year `t` when `rentAdjMode=wage`. For 1925-1946, the generator derives the
same year-`t` percentage from consecutive JST R6 `DEU.wage` levels. This early
segment is a macrohistory research proxy, not an official Destatis observation.
The generated method contract records four discontinuities: 1925 is the
chain-start normalization, 1945 is an `estimated` wartime/post-war bridge for
which no market-wage observation exists, 1947 is the JST-to-Destatis source
seam, and 1948 retains the currency-reform context. The 1946 change remains
the last JST proxy observation before the source seam.
The official segment uses Destatis from 1947. It records the former federal
territory through 1990, the post-reunification territory from 1991, the 2007
coverage change to producing industry and services, and the earnings-survey
method introduced in 2022. The one-decimal index levels for 1947-1955 range
from 1.9 to 4.5; the 1947 change additionally uses the preceding 1946 level
1.8. Together these values imply a maximum documented half-unit relative
level effect of about 2.8 percent.

The generated series is a broad gross-earnings escalation proxy without special
payments. It is not the historical statutory German pension-adjustment series,
does not reproduce pension-formula factors or protection clauses, and is not a
substitute for an individual pension notice. The combined primary-input hash
is `cfd5c598a8bc846a96966fa8ff7388d80c30f3ada39edbfe90d39f234eef9d9b`;
the generated 101-value hash is
`e10e581f6994e07ed0a943b3716dd8fd5dea7b8b272d47a546466af8701a3057`.
