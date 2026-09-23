# Arhitektura

<!-- UPUTA: Kako je sistem složen: moduli, tok podataka, folderi, granice. Odluke i njihovi razlozi idu u docs/adr/, a ovdje samo link. -->

**Stack:** {{STACK}} (vidi [ADR 0001](adr/0001-izbor-stacka.md))

## Moduli i tok podataka
```mermaid
{{MERMAID_DIJAGRAM}}
```

## Folderi
```
{{STABLO_FOLDERA}}
```
- `src/features/<funkcija>/`: jedna funkcija iz inventara (prikaz + logika + podaci + test).
- `src/shared/`: samo ono što koriste bar dvije funkcije.

## Slojevi u svakoj funkciji
| Sloj | Sadrži | Ne smije |
|---|---|---|
| Prikaz | komponente, ekrani | direktno zvati bazu/API |
| Logika | čiste funkcije, pravila domene | znati za UI |
| Podaci | API pozivi, baza, fajlovi | sadržavati pravila domene |

## Granice
- Tajne: `.env` (van gita). Primjer ključeva je u `.env.example`.
- Stvarni podaci: {{GDJE_ZIVE_STVARNI_PODACI}} (van repoa). U repou su samo `fixtures/`.
- Veličina fajla: upozorenje na 300 linija, podjela obavezna na 500 (detalji u [PRAVILA-KODA](PRAVILA-KODA.md)).

## Odluke
- [0001 Izbor stacka](adr/0001-izbor-stacka.md)
