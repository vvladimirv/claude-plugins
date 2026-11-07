---
name: docs-audit
description: "Pregled .md dokumenata: kontradikcije, zastarjeli planovi, duplikati, predugi STATUS; predlaže arhivu ili spajanje."
model: sonnet
allowed-tools: [Read, Glob, Grep, Bash]
---

# /docs-audit: red u dokumentima

**Prvo, projekat bez kickstarta:** ako projekat ima fajl `.claude/bez-kickstarta`, ovu komandu ovdje ne izvršavaj i ništa ne pravi (ni `STATUS.md`, ni `CHANGELOG.md`, ni `docs/*`, ni `.claude/kickstart.json`). Reci korisniku da projekat ima svoj sistem dokumenata i da pravila rada nađe u `AGENTS.md`/`CLAUDE.md` projekta. Ako ta pravila kažu kako se ovaj posao ovdje radi, navedi to u jednoj rečenici. Zatim stani.

*Zašto:* dokumenti se gomilaju (inhome je imao 24 .md fajla u korijenu), pa si počnu proturječiti. Agent tada čita pogrešan i radi po starom planu. Pravilo je jedna tema = jedan fajl, a završen plan ide u arhivu.

1. **Popis:** svi `*.md` fajlovi van `node_modules`, `.git` i `docs/arhiva/`, sa brojem linija i datumom zadnjeg commita (`git log -1 --format=%cs -- <fajl>`).
2. **Provjere** (svaka nađena stavka ide sa konkretnim fajlom i linijom):
   - **Korijen:** van `README`, `AGENTS`, `CLAUDE`, `STATUS` (i `CHANGELOG`/`LICENSE`), svaki .md u korijenu je sumnjiv.
   - **Veličina:** STATUS.md > 30 linija, AGENTS.md + CLAUDE.md > 80 linija.
   - **Dnevnik umjesto stanja:** datumi po stavkama, "danas smo…", završeni zadaci u STATUS.md ili CLAUDE.md.
   - **Kontradikcije:** različite komande za pokretanje ili testove, različit stack, portovi, putanje ili imena pojmova u različitim fajlovima (uporedi sa `docs/POJMOVI.md`).
   - **Duplikati:** dvije datoteke o istoj temi (npr. dva plana, dva opisa arhitekture).
   - **Zastarjelo:** plan čiji su svi checkboxi `[x]`, dokument koji spominje fajlove ili funkcije kojih više nema (provjeri Globom), i dokument koji se ne mijenja > 60 dana dok se kod mijenja.
   - **Pokvareni linkovi** na fajlove koji ne postoje.
3. **Izvještaj** u tabeli: fajl → problem → prijedlog (`arhiva`, `spoji u X`, `skrati`, `ispravi liniju N`, `obriši`).
4. **Čekaj OK** i tek onda primijeni. Arhiva ide sa `git mv <fajl> docs/arhiva/`, nikad kao brisanje bez pitanja. Commit: `docs: sređivanje dokumenata (docs-audit)`.
