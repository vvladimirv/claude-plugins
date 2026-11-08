---
name: trziste
description: "Istraživanje tržišta za ideju ili postojeću aplikaciju: kupci, konkurenti, cijene, signali potražnje, bodovanje niša i prijedlozi razvoja, sa izvorom za svaki broj. Rezultat ide u docs/TRZISTE.md. Za \"/trziste\", prije /kickstart ili kad se bira šta dalje razvijati."
argument-hint: "<ideja ili opis aplikacije> | (prazno u postojećem projektu)"
model: sonnet
---

# /trziste

*Zašto:* najskuplja greška je dobro napravljena aplikacija koju niko ne treba ili niko ne plaća. Ova komanda prije koda skupi ono što se o tržištu može provjeriti, a jasno pokaže šta je samo pretpostavka. Ne odlučuje da li se gradi: to radi `/isplativost`.

Zahtjev: `$ARGUMENTS`

## Pravila tačnosti (važe za cijeli izvještaj)
- Svaki broj, cijena i tvrdnja o konkurentu ima **izvor** (link i datum pristupa) ili oznaku **pretpostavka**. Bez izvora nema broja.
- Ne izmišljaj konkurente, cijene, ocjene ni statistike. Ako podatak nije nađen, napiši „nije nađeno“.
- Prednost imaju primarni izvori: cjenovnik na stranici konkurenta, prodavnica aplikacija, statistički zavod, godišnji izvještaj. Članak ili blog je slabiji izvor, pa to i napiši.
- Uz podatak stavi godinu na koju se odnosi. Stari podatak (stariji od 2 godine) označi.
- Ne piši kod i ne mijenjaj `VIZIJA.md` ni druge dokumente bez korisnikovog OK.

## 0. Kontekst (bez pitanja)
- Ako pravila projekta (`AGENTS.md`/`CLAUDE.md`) određuju drugo mjesto za dokumente, sačuvaj izvještaj tamo umjesto u `docs/TRZISTE.md`.
- Pročitaj šta postoji: `docs/TRZISTE.md` (prethodno istraživanje), `docs/VIZIJA.md`, `docs/INVENTAR-FUNKCIJA.md`, `STATUS.md`, `README.md`.
- **Režim:** argument je nova ideja → *nova ideja*. Argument je prazan, a projekat ima VIZIJA ili kod → *postojeći projekat* (cilj je i prijedlog šta dalje razvijati). Prazno i bez projekta → pitaj za ideju i stani.
- Ako `docs/TRZISTE.md` već postoji, ne počinji ispočetka: dopuni ga i na vrhu upiši datum osvježavanja.
- Bez alata za pretragu weba (WebSearch/WebFetch) reci to odmah: izvještaj tada sadrži samo pretpostavke i listu šta treba provjeriti.

## 1. Razjasni (najviše 3 pitanja, samo ono što fali)
Pitaj (AskUserQuestion ili jasno pitanje) samo ono što se ne vidi iz argumenta i dokumenata:
1. Ko plaća, a ko koristi (isto lice, firma, roditelj za dijete…)?
2. Tržište: država ili regija i jezik (npr. BiH i regija, EU, cijeli svijet na engleskom).
3. Namjena: lična aplikacija, mala grupa ili prodaja.

Za ličnu aplikaciju bez prodaje istraživanje skrati na tačke 2a i 4 (postoji li gotovo rješenje koje je jeftinije od pravljenja).

## 2. Istraživanje
**2a. Konkurenti i zamjene** (5–10): direktni konkurenti i ono čime ljudi danas rješavaju problem (Excel, papir, opšta aplikacija). Tabela:

| Konkurent | Link | Za koga | Model i cijena | Javni signal (ocjena, broj recenzija, preuzimanja) | Slabost iz recenzija | Izvor, datum |
|---|---|---|---|---|---|---|

**2b. Signali potražnje:** pritužbe na postojeća rješenja (recenzije s 1–3 zvjezdice, forumi, Reddit, grupe), pitanja „postoji li aplikacija za…“, trendovi pretrage ako su dostupni. Citiraj kratko i daj link. Ponovljena pritužba je prilika, a pojedinačna nije dokaz.

**2c. Veličina tržišta, odozdo prema gore:** broj potencijalnih kupaca × udio koji realno dosegneš × cijena. Svaki od tri ulaza ima izvor ili oznaku pretpostavke. Ne koristi gotove „TAM“ brojke iz izvještaja bez objašnjenja kako su dobijene.

## 3. Niše
Predloži 2–4 niše (uži kupac ili uža upotreba). Boduj 1–5, uz jednu rečenicu razloga za svaku ocjenu:

| Niša | Bol problema | Dostupnost kupaca (kanal do njih) | Slaba konkurencija | Spremnost na plaćanje | Uklapanje (jedan developer, održavanje) | Zbir |
|---|---|---|---|---|---|---|

Preporuči jednu nišu i reci koja je **najrizičnija pretpostavka** u njoj.

## 4. Prijedlozi razvoja
- *Nova ideja:* 3–7 funkcija za MVP koje rješavaju pritužbe iz 2b ili slabosti iz 2a, i bar 2 stvari koje svjesno ne treba praviti (konkurent to radi dobro ili niko ne traži).
- *Postojeći projekat:* uporedi `INVENTAR-FUNKCIJA.md` sa konkurentima. Tabela: prijedlog → vrijednost za kupca (izvor) → trud (mali/srednji/veliki) → redoslijed. Prijedlog van obima iz VIZIJA.md označi kao „proširenje obima“; ne dodaje se bez korisnikove odluke.

## 5. Zapis
Upiši ili dopuni `docs/TRZISTE.md`:

```markdown
# Tržište: <ideja>
**Ažurirano:** YYYY-MM-DD · režim: nova ideja | postojeći projekat · tržište: <država/jezik>

## Sažetak
(5 linija: kupac, preporučena niša, glavni konkurent, najjači signal potražnje, najrizičnija pretpostavka)

## Kupci
## Konkurenti i zamjene
## Signali potražnje
## Veličina tržišta
## Niše
## Prijedlozi razvoja
## Pretpostavke za provjeru
(lista: pretpostavka → kako je najjeftinije provjeriti)

## Izvori
(link · šta je preuzeto · datum pristupa)
```

Sekciju `## Isplativost` piše `/isplativost`. Ne briši je pri osvježavanju.

## 6. Kraj
Sažetak u odgovoru (do 8 linija), pa sljedeći korak: `/isplativost` za odluku da li se gradi.
