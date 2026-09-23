---
name: novi-projekat
description: Tema van obima postaje nov projekat: folder u C:\dev\<ime> sa IDEJA.md, a temelj postavlja /kickstart.
argument-hint: <tema ili ime projekta>
model: haiku
allowed-tools: [Read, Write, Bash, Glob, AskUserQuestion]
---

# /novi-projekat

*Zašto:* tema koja "usput" uđe u projekat donese svoje fajlove, dokumente i zavisnosti. Kasnije se ne zna šta čemu pripada. Nova tema dobija svoj folder i svoj temelj.

Tema: `$ARGUMENTS`

1. **Korijen projekata:** prva linija iz `~/.claude/kickstart-korijeni.txt`. Ako fajl ne postoji, koristi `C:\dev`.
2. **Ime:** predloži kratko ime foldera (mala slova, crtice, bez dijakritika, npr. `youtube-preuzimac`). Provjeri da folder ne postoji. Potvrdi ime sa korisnikom (AskUserQuestion, uz opciju da upiše svoje).
3. **Napravi** `<korijen>/<ime>/IDEJA.md`:
   ```markdown
   # <Tema>

   **Nastalo:** YYYY-MM-DD, iz projekta `<trenutni projekat>`

   ## Zahtjev
   <originalni zahtjev korisnika, doslovno>

   ## Kontekst
   <zašto je izdvojeno, šta se već zna, veze sa drugim projektom ako postoje>
   ```
   Ne pravi git, kod ni druge dokumente. To radi `/kickstart` u novom projektu.
4. **Zabilježi** u listu ideja, ako postoji (`<korijen>/ideje/IDEJE.md`): `- YYYY-MM-DD · <tema> → pokrenuto kao <korijen>/<ime>`.
5. **Poruka korisniku:** otvori novu sesiju u folderu `<korijen>/<ime>` (desktop app: nova sesija → izaberi folder; terminal: `cd <putanja>` pa `claude`) i pokreni `/kickstart`. Kapija će te tamo sama dočekati. Ovdje nastavljamo sa trenutnim projektom.
