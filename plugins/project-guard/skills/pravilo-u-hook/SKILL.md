---
name: pravilo-u-hook
description: Pretvara pravilo napisano rečenicom (iz AGENTS.md ili razgovora) u nešto što mašina provjerava, a to je test, pre-commit provjera, podešavanje ili hook. Za pravila koja agent zaboravlja.
argument-hint: <pravilo ili broj pravila iz AGENTS.md>
---

# /pravilo-u-hook

*Zašto:* ono što agent mora zapamtiti, zapamtiće nekad. Ono što mašina provjerava, radi uvijek.

Pravilo: `$ARGUMENTS` (ako je broj, uzmi to pravilo iz `AGENTS.md`).

1. **Razvrstaj** pravilo u najjeftiniji mehanizam koji ga pouzdano provodi:
   | Vrsta | Kad | Gdje |
   |---|---|---|
   | **Test ponašanja** | pravilo o tome šta aplikacija radi | test u folderu funkcije |
   | **Pre-commit provjera** | važi za svakog (Claude, Codex, čovjek): format, zabranjeni fajlovi, veličina | `.githooks/pre-commit.mjs` |
   | **Podešavanje projekta** | fajl koji agent ne smije dirati, drugačiji limit | `.claude/zasticeno.txt`, `.claude/granice.json`, `deny` u `.claude/settings.json` |
   | **Lint pravilo** | stil ili obrazac u kodu | konfiguracija lintera tog stacka |
   | **Hook u pluginu** | važi za sve projekte i tiče se ponašanja agenta | `C:\dev\claude-plugins` → project-guard (zaseban zadatak u tom repou) |
   | **Ostaje rečenica** | traži procjenu (npr. "piši jasno") | AGENTS.md, ali kraće i konkretnije |
2. **Prijedlog** (čekaj OK): izabrani mehanizam, tačan kod ili izmjena, i kako se provjerava da radi (jedan primjer koji mora pasti i jedan koji mora proći).
3. **Primijeni** i dokaži: pokreni provjeru na primjeru koji krši pravilo i pokaži da pada.
4. U `AGENTS.md` pravilo ostaje kao jedna linija, uz napomenu gdje se provjerava (npr. "(provjerava pre-commit)").
5. Commit: `chore: pravilo "<kratko>" provodi <mehanizam>`.
