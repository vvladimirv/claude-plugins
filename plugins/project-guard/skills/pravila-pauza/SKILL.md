---
name: pravila-pauza
description: Privremeno isključuje blokirajuća pravila project-guard plugina (kapija, brava, limit fajlova, novi folderi), za sve projekte. Zaštita tajni ostaje uključena. Koristi kad korisnik kaže "/pravila-pauza", "pauziraj pravila", "hook me blokira greškom", ili "/pravila-pauza stop".
argument-hint: "[minuta, npr. 30] | stop"
model: haiku
allowed-tools: [Bash]
---

# /pravila-pauza

*Zašto:* ako hook ima grešku ili je pravilo u nekom slučaju pogrešno, rad ne smije stati. Pauza je sigurnosni ventil. Zaštita tajni se nikad ne pauzira.

Argument: `$ARGUMENTS`

- **`stop`, `kraj` ili `off`:** ukloni pauzu:
  ```bash
  node -e "const f=require('path').join(require('os').homedir(),'.claude','pravila-pauza.json');try{require('fs').unlinkSync(f)}catch{};console.log('pauza uklonjena')"
  ```
- **Broj (minute) ili prazno (60):** uključi pauzu:
  ```bash
  node -e "const m=Number(process.argv[1])||60,f=require('path').join(require('os').homedir(),'.claude','pravila-pauza.json');const d=new Date(Date.now()+m*60000);require('fs').writeFileSync(f,JSON.stringify({do:d.toISOString()}));console.log('pauza do '+d.toLocaleTimeString())" <MINUTA>
  ```

Zatim kratko javi:
- do kada traje pauza i da važi **za sve projekte**,
- da zaštita tajni radi i dalje,
- ako je razlog bio pogrešan hook: neka opiše šta ga je blokiralo, jer to je bug koji treba popraviti u `C:\dev\claude-plugins`. Greške hookova su u `~/.claude/pravila.log`.
