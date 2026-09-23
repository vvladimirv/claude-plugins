# claude-plugins: pravila

Lični marketplace `moji-pluginsi`. Plan razvoja (3 talasa) je u STATUS.md.

- Dokumenti i poruke su na bosanskom (ijekavica). Kod i identifikatori su na engleskom.
- Hookovi su **Node skripte** (bez npm zavisnosti), jedna skripta = jedan hook. Uz svaku ide `*.test.js` (node:test).
- Hookovi su **fail-open**: greška se upiše u `~/.claude/pravila.log` i izađe se sa 0. Jedini izuzetak su blokade tajni.
- Hookovi moraju biti brzi (< 200 ms za UserPromptSubmit/PreToolUse) i ubacivati što manje teksta u kontekst.
- Skillovi imaju `model:` u frontmatteru: haiku za rutinu, sonnet za commit/pregled, a bez `model:` (glavni model) samo za odluke.
- Šabloni projekta su u `plugins/project-kickstart/skills/kickstart/templates/`. Svaka izmjena šablona podiže `verzija_sablona` u kickstart SKILL.md.
- Podsjetnik je jedan izvor istine: `plugins/project-kickstart/skills/pomoc/PODSJETNIK.md`. Kad dodaš komandu ili hook, ažuriraj ga.
- Prije commita: `npm test` i `claude plugin validate .` moraju proći.
