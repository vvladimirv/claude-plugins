---
name: ideja
description: Zapisuje ideju u globalnu listu ideja (C:\dev\ideje\IDEJE.md, poseban git repo), da se ne izgubi i da ne zagađuje trenutni projekat. Koristi kad korisnik kaže "/ideja", "zapamti ovu ideju", "samo zabilježi", ili izabere "samo zapamti" kod čuvara obima.
argument-hint: <ideja u jednoj ili dvije rečenice>
model: haiku
allowed-tools: [Read, Edit, Write, Bash]
---

# /ideja

*Zašto:* dobra ideja usred rada ne smije ni nestati ni ući u projekat u kojem joj nije mjesto. Lista ideja je u zasebnom git repou, pa je ista na desktopu i laptopu.

Ideja: `$ARGUMENTS` (ako je prazno, uzmi zadnji zahtjev koji je čuvar obima označio kao van obima).

1. **Putanja:** `<korijen>/ideje/IDEJE.md`. Korijen je prva linija iz `~/.claude/kickstart-korijeni.txt`, a ako fajl ne postoji, `C:\dev`.
   - Ako folder `ideje` ne postoji, reci to korisniku i stani. Postavlja se jednom (README repoa `claude-plugins`).
2. **Dodaj** na vrh sekcije `## Nove`: `- YYYY-MM-DD · <ideja> _(iz: <ime trenutnog projekta>)_`
3. **Snimi** (u repou ideja, ne u trenutnom projektu):
   ```bash
   git -C "<korijen>/ideje" add IDEJE.md && git -C "<korijen>/ideje" commit -qm "ideja: <kratko>"
   ```
   Ako repo ima `origin`, uradi i `git -C "<korijen>/ideje" push -q`.
4. Potvrdi u jednoj rečenici i nastavi sa trenutnim radom.
