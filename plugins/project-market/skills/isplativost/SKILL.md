---
name: isplativost
description: "Isplativost aplikacije: troškovi razvoja i rada, model naplate, marža po korisniku, prag isplativosti i povrat ulaganja u tri scenarija, pa presuda i najjeftiniji test najrizičnije pretpostavke. Čita i dopunjava docs/TRZISTE.md. Za \"/isplativost\", poslije /trziste ili prije promjene cijene."
argument-hint: "[cijena ili model naplate, npr. \"5 KM mjesečno\"]"
---

# /isplativost

*Zašto:* mjeseci rada na aplikaciji su ulaganje. Ova komanda pretvara procjene u računicu koja se može provjeriti i daje jasnu odluku: gradi, gradi uz uslov ili ne gradi u ovom obliku. Presuda je savjet; odluku donosi korisnik.

Zahtjev: `$ARGUMENTS`

## Pravila tačnosti
- Cijene platformi (hosting, prodavnice aplikacija, procesori plaćanja, AI API) mijenjaju se. Uzmi ih sa **službenog cjenovnika** uz link i datum pristupa, ne napamet. Bez pretrage weba označi ih kao pretpostavku.
- Svaki ulaz u računicu je **podatak** (izvor) ili **pretpostavka** (zašto baš taj broj). Stope konverzije i odliva su skoro uvijek pretpostavke, pa to i piše.
- Računaj skriptom (npr. `node -e "…"`), ne napamet, i pokaži formulu.
- Porezi i PDV: samo napomena da utiču na neto prihod i da ih treba provjeriti sa knjigovođom. Ovo nije pravni ni poreski savjet.

## 0. Ulaz
- Ako pravila projekta (`AGENTS.md`/`CLAUDE.md`) određuju drugo mjesto za dokumente, čitaj i piši tamo umjesto u `docs/TRZISTE.md`.
- Pročitaj `docs/TRZISTE.md` (cijene konkurenata, niša, veličina tržišta), `docs/VIZIJA.md` → `## Gdje se koristi`, i `docs/adr/0001-*` ako postoji (stack određuje hosting).
- Nema `docs/TRZISTE.md`: predloži prvo `/trziste`. Ako korisnik hoće odmah, pitaj samo za ulaze koji fale.
- **Lična aplikacija bez prodaje:** računica je kraća. Sati razvoja i održavanja naspram uštede (vrijeme ili novac mjesečno) i naspram najjeftinijeg gotovog rješenja iz TRZISTE.md. Preskoči 2 i 3, pa idi na 4.

## 1. Ulazi koje pitaš (najviše 4, samo ono što fali)
1. Tvoja satnica ili vrijednost sata (za trošak razvoja).
2. Procjena sati do MVP-a i sati održavanja mjesečno. Ako BLUEPRINT.md postoji, uzmi procjenu iz njega.
3. Model naplate: jednokratno, pretplata, freemium, oglasi, B2B licenca. Ako je dat u argumentu, ne pitaj.
4. Cilj: dodatni prihod, zamjena posla ili samo da pokrije troškove.

## 2. Model
**Troškovi**
- Jednokratni: razvoj (sati × satnica), nalozi developera u prodavnicama, dizajn, pravni dokumenti (uslovi korištenja, privatnost).
- Fiksni mjesečni: hosting, baza, domena, email, alati, održavanje (sati × satnica).
- Varijabilni po korisniku mjesečno: AI/API pozivi, skladište, slanje poruka, podrška.

**Prihodi:** cijena (uporedi sa konkurentima iz TRZISTE.md), provizija prodavnice ili procesora plaćanja, povrati.

**Pokazatelji**
- Marža po plaćajućem korisniku = neto cijena − varijabilni trošak.
- Prag isplativosti = fiksni mjesečni troškovi / marža (broj plaćajućih korisnika).
- Povrat ulaganja = jednokratni troškovi / (mjesečna marža × korisnici − fiksni troškovi), u mjesecima. Ako je nazivnik 0 ili manji, povrata nema.
- Potrebni korisnici ukupno = plaćajući / stopa konverzije (za freemium i probni period).

## 3. Tri scenarija i osjetljivost
Tabela: pesimistički, realni, optimistički, sa istom strukturom i drugim pretpostavkama (cijena, konverzija, odliv, broj korisnika poslije 12 mjeseci). Zatim **osjetljivost**: koja jedna pretpostavka najviše mijenja rezultat (npr. „konverzija sa 2 % na 1 % pomjera prag sa 150 na 300 korisnika“). Uporedi potrebni broj korisnika sa veličinom tržišta iz TRZISTE.md: traži li plan nerealan udio tržišta?

## 4. Presuda
Jedna od tri, sa razlogom u 2–3 rečenice:
- **Gradi:** realni scenario prelazi prag uz udio tržišta koji je dostižan.
- **Gradi uz uslov:** zavisi od jedne pretpostavke. Napiši tačan uslov (npr. „ako 20 od 100 ljudi sa liste ostavi email“).
- **Ne gradi u ovom obliku:** i optimistički scenario je ispod praga, ili postoji jeftino gotovo rješenje. Predloži šta bi promijenilo računicu (druga niša, drugi model naplate, manji MVP).

Uz svaku presudu: **najjeftiniji test najrizičnije pretpostavke** prije pisanja koda (stranica sa prijavom, pred-prodaja, 10 razgovora sa kupcima, ručno pružena usluga), sa brojem koji znači uspjeh.

## 5. Zapis
U `docs/TRZISTE.md` dopiši ili zamijeni sekciju:

```markdown
## Isplativost
**Ažurirano:** YYYY-MM-DD · model: <naplata> · presuda: Gradi | Gradi uz uslov | Ne gradi u ovom obliku

(tabela ulaza sa oznakom podatak/pretpostavka i izvorom · tabela tri scenarija · osjetljivost · presuda · test pretpostavke)
```

Izvore dodaj u `## Izvori`.

## 6. Kraj
Sažetak u odgovoru (presuda, prag, najrizičnija pretpostavka i njen test). Sljedeći korak:
- nema `.claude/kickstart.json` i presuda nije „Ne gradi“: `/kickstart <tema>` (kickstart čita TRZISTE.md),
- postojeći projekat i presuda mijenja obim ili cijenu: predloži izmjenu `docs/VIZIJA.md` i čekaj OK.
