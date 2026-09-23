---
name: ui-izmjena
description: Siguran tok izmjene izgleda: pogođeni ekrani, mockup i OK, izmjena uz tokene, screenshot testovi, ux-recenzent. Za redizajn i promjenu izgleda.
argument-hint: <šta treba promijeniti>
---

# /ui-izmjena

*Zašto:* kod redizajna funkcije tiho nestaju, jer novi izgled "zaboravi" dugme ili ekran. Ovaj tok radi izmjenu po ugovoru: inventar funkcija i lista ekrana moraju i poslije izmjene biti tačni.

Zahtjev: `$ARGUMENTS`

1. **Kontekst:** pročitaj `docs/DIZAJN-SISTEM.md`, `docs/EKRANI.md` i `docs/INVENTAR-FUNKCIJA.md`. Ako ih nema, predloži `/kickstart --postojeci` i stani.
2. **Obim izmjene:** tabela: pogođeni ekrani → komponente → F-funkcije na tim ekranima. Sve što nije u tabeli se ne dira.
3. **Mockup** (čekaj OK): prije koda pokaži kako će izgledati: ASCII skica rasporeda ili mali HTML prototip, uz listu tokena koje koristi. Ako treba nov token ili nova komponenta, naglasi to posebno, jer to ide u DIZAJN-SISTEM.md.
4. **Izmjena:**
   - mijenjaj samo komponente iz tabele,
   - boje, razmaci i fontovi samo iz fajla tokena. Nova vrijednost prvo ide u tokene,
   - nova komponenta se upisuje u katalog u DIZAJN-SISTEM.md.
5. **Provjera:**
   - pokreni testove ponašanja za sve F-funkcije iz tabele (`scripts/test`),
   - pokreni screenshot testove pogođenih ekrana. Promijenjene snimke pokaži korisniku, a nove referentne snimke (baseline) usvoji **tek uz njegov OK**,
   - svaka F-funkcija sa tih ekrana mora i dalje biti dostupna. Ako neka nestaje, to je odluka korisnika, i onda ide status `uklonjena` + ADR,
   - pokreni agenta **`ux-recenzent`** (Agent tool; agent iz plugina project-kickstart) nad izmjenom. Sve 🔴 stavke ispravi prije commita.
6. Ažuriraj `docs/EKRANI.md` ako se raspored promijenio, pa commit: `feat(ui): <šta>`.
