# claude-plugins: pravila

Lični marketplace `moji-pluginsi`. Plan razvoja (3 talasa) je u STATUS.md.

- Dokumenti i poruke su na bosanskom (ijekavica). Kod i identifikatori su na engleskom.
- Hookovi su **Node skripte** (bez npm zavisnosti). Jedna ulazna skripta po pluginu prima sve događaje (npr. `guard.js`, da se Node pokrene samo jednom), a svako pravilo je svoj modul u `hooks/lib/`. Uz svako pravilo idu testovi (node:test).
- Hookovi su **fail-open**: greška se upiše u `~/.claude/pravila.log` i izađe se sa 0. Jedini izuzetak su blokade tajni.
- Hookovi moraju biti brzi (< 200 ms za UserPromptSubmit/PreToolUse) i ubacivati što manje teksta u kontekst.
- Skillovi imaju `model:` u frontmatteru: haiku za rutinu, sonnet za commit/pregled, a bez `model:` (glavni model) samo za odluke.
- Šabloni projekta su u `plugins/project-kickstart/skills/kickstart/templates/`. Svaka izmjena šablona podiže `verzija_sablona` u kickstart SKILL.md i dobija stavku u CHANGELOG-SABLONA.md, pa `node test/sablon-hash.js --upisi` (`npm test` pada dok se to ne uradi).
- Verzija plugina je u `plugin.json` i u `marketplace.json`. Test pazi da su iste.
- Podsjetnik je jedan izvor istine: `plugins/project-kickstart/skills/pomoc/PODSJETNIK.md`. Kad dodaš komandu ili hook, ažuriraj ga.
- Prije commita: `npm test` i `claude plugin validate .` moraju proći.
