---
name: balans
description: "Balans igre: pokreće bot alat projekta (headless), poredi s prošlim izvještajem docs/bot-*.txt i upisuje novi u istom formatu; sabira i zapise ljudskih testera prema TESTIRANJE.md. Za /balans, nakon izmjene brojki, ciljeva, cijena ili protivnika."
argument-hint: "[bot|testeri|sve] [tema ili argumenti bota]"
model: sonnet
---

# /balans

*Zašto:* brojke u igri (ciljevi, cijene, budžeti, snaga protivnika) se ne mogu procijeniti iz glave. Bot ih mjeri jeftino i ponovljivo, a ljudski testeri kažu ono što bot ne vidi (osjećaj, razumijevanje). Ova komanda daje oba pogleda uporedo i **ne mijenja brojke igre**: predlaže, a izmjenu odlučuje korisnik.

Zahtjev: `$ARGUMENTS` (prazno = `bot` za oblast koja je zadnja mijenjana, pa `testeri` ako postoje zapisi).

## 0. Šta projekat ima
Provjeri redom, i reci šta nedostaje umjesto da izmišljaš:
- bot alati: `game/tools/*.gd` (npr. `run_*bot*.gd`, `*_measure.gd`, `playthrough_*.gd`), botovi u `game/**/core/*_bot.gd` i skripte u `scripts/` koje ih pokreću; **prvih redova svakog je komentar sa tačnom komandom i argumentima**, to je izvor istine, ne ovaj tekst. Mjeri samo ono što alat stvarno mjeri (npr. `playthrough_*` provjerava tok, ne balans);
- prošli izvještaji: `docs/bot-*.txt` (najnoviji prvi, po datumu u imenu);
- ljudski testeri: `docs/TESTIRANJE.md` (mjere i pragovi) ili `docs/PROBA-*.md`, `scripts/zapis-igranja.mjs` ako postoji (sabira JSON „zapis igranja“, jedan fajl po igraču), zapisi u `docs/testiranje/` ili u folderu koji korisnik navede;
- Godot: `GODOT_BIN`, `godot`, `godot4`, `godot.exe`. Bez njega bot se ne može pokrenuti: reci to, ne glumi rezultat.

Ako nema ničeg od ovoga, nije to projekat za ovu komandu: reci to jednom rečenicom i stani.

## 1. Bot (`bot` ili `sve`)
1. **Šta se mjeri.** Iz teme odaberi alat: pitanje o jednom poglavlju ili seedu ide na alat po poglavljima, opšti balans na osnovni bot. Ako su u zadnjim commitovima mijenjane brojke (ciljevi, cijene, budžeti, verzija simulacije), mjeri baš to; `git log -5 --stat` i diff pokažu šta. Ne pokreći sve alate redom "za svaki slučaj".
2. **Prošli izvještaj.** Nađi najnoviji `docs/bot-*.txt` **istog alata i istih argumenata** (projekat bez ijednog takvog izvještaja: ovo je prvi, bez poređenja, i tako ga označi u `Čitanje:`) (prvi red izvještaja kaže alat, argumente, datum i verziju simulacije). Ako su argumenti drugi, poređenje je nepouzdano: reci to, ili ponovi sa istim argumentima.
3. **Cijena.** Bot troši samo procesor (nula tokena), ali dug posao može trajati desetine minuta (poglavlje 7 sa doktrinom ~17 min). Prije pokretanja procijeni trajanje iz `(NNN.N s)` u prošlom izvještaju. Preko 10 minuta pokreni u pozadini (`run_in_background`) i radi dalje; ne vrti `sleep`. Pravilo projekta za duge poslove (gdje i kada) ima prednost.
4. **Pokretanje** tačno kako piše komentar alata, npr. `godot --headless --audio-driver Dummy --path game -s tools/<alat>.gd -- <argumenti>`. Alat sam piše `../bot-*.txt` ili slično; taj fajl je van `docs/` i van gita. Seedove i broj sedmica ne mijenjaj u odnosu na prošli izvještaj osim ako je korisnik to tražio.
5. **Poređenje.** `node <folder ovog skilla>/uporedi.js <stari.txt> <novi.txt>` ispisuje samo vrijednosti koje su se pomakle za ≥ 5 procentnih poena (`--prag N` mijenja, `--json` daje strojni oblik). Skripta čita redove `politika | pobjede X % | sačuvano Y %`, tabele sa zaglavljem ispod `== Odjeljak ==` (izlaz `virtuelni-igraci.mjs`; cilj u zagradi ne mijenja ključ) i ćelije `staro→novo` (važi desna strana). Ručni sažetak drugačijeg rasporeda (npr. kolone `P 2 | P 3` umjesto odjeljaka po poglavlju) ne poklapa se sa sirovim izlazom: poredi sirovi izlaz sa sirovim iz starijeg izvještaja, a kad skripta kaže da nema zajedničkih redova, poredi ručno. Brojke koje navodiš moraju biti iz izlaza alata, nikad procijenjene.
6. **Šum.** Razliku od par poena između dva pokretanja na istim seedovima ne tumači kao efekat izmjene ako alat nije deterministički (provjeri prije: dva pokretanja bez izmjene). Malo sedmica (n < 40) znači širok šum: reci to uz nalaz.
7. **Novi izvještaj** `docs/bot-<YYYY-MM-DD>-<tema>.txt` (ne prepisuj postojeći fajl istog imena; dodaj `-2`). Format prati zadnje izvještaje projekta:
   - prvi red: šta je mjereno, alat i argumenti u zagradi, datum, verzija simulacije (iz koda, ne pogađaj) i poslije kojeg PR-a/commita;
   - sirovi izlaz alata, nepromijenjen (čuva se onako kako ga pišu stariji izvještaji, uz `[exited with code 0]` samo ako ga stariji imaju);
   - prazan red, pa `Čitanje:` u 2–4 rečenice: šta se promijenilo prema prošlom izvještaju (konkretni redovi iz `uporedi.js`), šta to znači za dizajn i šta tek treba provjeriti ljudima. Ako je izlaz bez promjene, tako i napiši.

## 2. Testeri (`testeri` ili `sve`)
1. Pročitaj dokument projekta o testiranju (npr. `docs/TESTIRANJE.md`): tabela „Šta se čita iz dnevnika“ (mjera, polje, prag) i pitanja poslije igre su definicija; ako se razlikuju od onoga što ovdje piše, važi dokument projekta. Projekat bez takvog dokumenta nema pragove: tada samo sabiraj zapise skriptom i reci da pragova nema.
2. **Zapisi.** Prikupi dnevnike (`.json` iz `user://dnevnik/`, zalijepljeni „Kopiraj izvještaj“, izlaz `scripts/zapis-igranja.mjs`) iz foldera koji korisnik navede ili `docs/testiranje/`. Ako skripta za sabiranje postoji (`scripts/zapis-igranja.mjs`: `node scripts/zapis-igranja.mjs zapis-igrac1.json zapis-igrac2.json ...`, tabela po etapi, novčići, uređaji i greške), pokreni nju i čitaj joj komentar na vrhu; njen ispis je sirovi izvor, a mjere iz dokumenta projekta ide ispod njega. Inače izračunaj mjere direktno iz JSON-a malom skriptom u scratch folderu, ne u projektu. Tri pitanja (koja verzija, trenutak prevare, poštenje 1–5) uzmi iz poruka testera doslovno.
3. **Račun.** Za svaku mjeru iz tabele: vrijednost, prag, prolazi/ne prolazi, i **n** (broj testera ili sesija). Medijan tamo gdje prag kaže medijan. Zapis koji nema polje za mjeru ne ulazi u tu mjeru, i to se navede (ne računa se kao 0).
4. **Poštenje prema broju.** Sa manje od 6 testera nema „prolazi/pada“ nego samo „za sada pokazuje“. Vlasnik i porodica se ne računaju (pravilo iz TESTIRANJE.md). Zapise ne prepričavaj iz glave: citati testera su doslovni i označeni (tester, sedmica).
5. **Izvještaj** `docs/testiranje/IZVJESTAJ-<YYYY-MM-DD>.md`: sažetak u 3–5 rečenica, tabela mjera (mjera | vrijednost | prag | n | status), odgovori na tri pitanja, pa 3–5 uočenih mjesta gdje su testeri zastali.

## 3. Zajedno (`sve`)
Poredaj bot i ljude: gdje bot kaže „prelako“ a testeri zapinju (ili obrnuto), tu je razlika važna, jer znači da bot ne modelira igrača. Gdje se slažu, to je jači nalaz. Završi **jednim prijedlogom** (šta mijenjati, za koliko i zašto) uz najjeftiniji sljedeći test, i pitaj korisnika; brojke igre mijenjaš tek uz njegov OK, pa nakon izmjene opet `bot` za tu oblast.

## Granice
- Čitaš i pokrećeš alate; u kodu igre ne mijenjaš ništa, a jedini novi fajlovi su izvještaji u `docs/`.
- Ne tvrdi da je igra „izbalansirana“: bot mjeri zadate politike, ne ljude. Reci šta je izmjereno, na koliko sedmica i čime.
- Svaki broj u odgovoru ima izvor (fajl i red ili izlaz alata).
