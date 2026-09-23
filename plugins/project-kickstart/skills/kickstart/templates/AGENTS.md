# {{IME_PROJEKTA}}: pravila za agente

<!-- UPUTA: Zajednička pravila za sve agente (Claude, Codex). Samo pravila, bez dnevnika i bez stanja. Najviše ~60 linija. -->

{{JEDNA_RECENICA_STA_PROJEKAT_RADI}}

## Gdje je šta
- Obim i svrha: `docs/VIZIJA.md` (sekcije **Obim** i **Van obima**)
- Pojmovi domene: `docs/POJMOVI.md`
- Arhitektura i folderi: `docs/ARHITEKTURA.md`
- Pravila koda: `docs/PRAVILA-KODA.md`
- Funkcije (ugovor): `docs/INVENTAR-FUNKCIJA.md`
- Trenutno stanje: `STATUS.md` · Historija: `git log`
- Odluke: `docs/adr/`
<!-- UPUTA: ako ima UI, dodaj: - Dizajn sistem: `docs/DIZAJN-SISTEM.md` · Ekrani: `docs/EKRANI.md` -->

## Komande
- Pokretanje: `{{KOMANDA_POKRETANJE}}`
- Brzi testovi (< 5 min, tihi izlaz): `scripts/test` <!-- UPUTA: tačna komanda za ovaj OS/stack, npr. `node scripts/test.mjs` -->
- Puni testovi + E2E (CI): `{{KOMANDA_PUNI_TESTOVI}}`

## Pravila
1. **Obim**: zahtjev koji mijenja fajlove, a nije u `docs/VIZIJA.md` → Obim, ne izvršavaj odmah. Pitaj kakva je veza sa projektom. Ponudi: povezano je / proširujemo obim (prvo VIZIJA + ADR) / nova tema u novom projektu / samo zabilježi ideju.
2. **Pojmovi**: koristi imena iz `docs/POJMOVI.md`. Nov pojam prvo upiši tamo.
3. **Struktura**: nova funkcija ide u svoj folder po `docs/ARHITEKTURA.md` i dobija F-broj u inventaru. Ne dodaji kod u tuđi feature folder.
4. **Veličina**: fajl preko 300 linija → podijeli prije dodavanja novog koda. Preko 500 nije dozvoljeno.
5. **Testovi**: crveno znači stop. Ne nastavljaj i ne commituj dok brzi testovi ne prođu. Testiraj ponašanje, ne markup. Pokreći ih samo preko `scripts/test`: ispisuje sažetak, a pun log je u `test-log.txt`. Čitaj ga samo kad treba. E2E i screenshot testovi idu u CI, ne u svaki korak.
6. **Commit** poslije svakog zaokruženog koraka (Conventional Commits, poruka na bosanskom). Ne gomilaj necommitovan rad.
7. **Podaci**: stvarni podaci i tajne nikad u repo. `.env` i `data/` su van gita, a u repou su samo izmišljeni primjeri u `fixtures/`.
8. **Zavisnosti**: nova biblioteka traži kratak ADR u `docs/adr/` (zašto, koje su alternative).
9. **Dokumenti**: jedna tema = jedan fajl. Ne pravi nove .md fajlove u korijenu. Završen plan ide u `docs/arhiva/`.
10. **Paralelni rad**: jedan agent = jedan worktree = jedna grana. Ako u korijenu postoji `.agent-lock.json` sa `heartbeat` mlađim od 20 minuta, a nije tvoj, ne mijenjaj fajlove u ovom folderu. Radi u svom worktreeu (Codex: `../<projekat>-codex-<zadatak>`, grana `codex/<zadatak>`). Pre-commit odbija commit iz tuđe sesije.
<!-- UPUTA: ako ima UI, dodaj:
11. **UI**: boje, razmaci i fontovi samo iz fajla tokena. Ekrani se slažu od komponenti iz kataloga. UI izmjena prvo navede pogođene ekrane iz `docs/EKRANI.md`. -->
