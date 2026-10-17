---
name: zdravlje
description: Provjera da li su plugini ispravno postavljeni na ovom računaru: Node, git, auto-update, greške i spori hookovi iz pravila.log, korijen projekata, lista ideja, git hookovi projekta. Za "/zdravlje", "rade li plugini", nov računar.
model: haiku
allowed-tools: [Bash, Read]
---

# /zdravlje

*Zašto:* plugini rade u pozadini, pa se kvar ne vidi dok nešto ne krene po zlu. Ova provjera samo čita i ništa ne mijenja.

Skripta je u folderu ovog plugina: `<folder ovog skilla>/../../hooks/zdravlje-cli.js`.

1. Pokreni `node "<skripta>" --root "<korijen projekta>"` (bez `--root` ako sesija nije u projektu) i prikaži izlaz **doslovno** u bloku koda.
2. Pokreni `claude plugin list` i pogledaj verzije `project-kickstart`, `project-memory` i `project-guard`. Ako neki od njih nije instaliran ili je isključen, dodaj liniju sa ⚠️.
3. Ispod dodaj najviše 3 kratke stavke, samo za ⚠️ linije: šta znači (pola rečenice) i šta korisnik kuca da to riješi. Za greške hookova predloži da ih popraviš u `C:\dev\claude-plugins` (to je bug u pluginu, ne u projektu). Za spore hookove samo reci koliko su spori, bez popravke.
4. Ako je sve ✅, reci jednom rečenicom da je sve u redu.
