import { expect, test } from 'claude-code/testing'

import {
  izaberiDugmad,
  jeWeb,
  komandePodsjetnika,
  kratko,
  opisFrontmattera,
  opisiPodsjetnika,
  projekti,
  statusDijelovi,
} from '../hooks/citaj'

const PANE = {
  plugin: 'radni-stol',
  component: 'Pane',
  requestId: 'radni-stol',
  props: {
    title: 'Radni stol',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

const KOMANDA = {
  command: 'radni-stol',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 80 },
} as const

const STATUS = `# STATUS

## Radi
- nešto radi

## Sljedeće
1. Napraviti ADR za radni stol
2. Probati panel na 1366x768

## Blokeri / otvorena pitanja
- čeka klijenta
`

const PODSJETNIK = `| Početak | otvori folder, pa \`nastavi\` |
| Kraj | \`/kraj-sesije\` · \`/napredak html\` · \`/ideja <opis>\` · \`/grane\` · \`/vrati\` · \`/pomoc\` |
| Igra | \`/balans\` · \`/provjera-izgleda\` · \`/stanje\` · \`/zdravlje\` · \`/pravila-pauza\` · \`/kickstart\` · \`/adr\` |
| Botovi | \`botovi korisnika\` (skill \`/botovi-korisnika\`) |
Putanja \`docs/TRZISTE.md\` i C:\\dev\\x nisu komande.
`

const PROJEKTI = `# Projekti

| Folder | GitHub repo | Tip | Stanje | Praćenje |
|---|---|---|---|---|
| \`lazni-projekat\` | v/lazni | web | M2 u toku (11-28) | aktivan |
| \`drugi\` | v/drugi | igra | **v2** gotov | parkiran · povratak: nije određen |
| — (nema lokalnog klona) | v/treci | APK | zadnji push | aktivan |

## Nisu projekti
`

type Svijet = {
  status?: string
  git?: boolean
  fajlovi?: string[]
  folderi?: Record<string, { name: string; kind: 'file' | 'dir' }[]>
  gh?: string | null
}

const upisano: string[] = []

// Engine putanje zna dati apsolutne i sa obrnutim kosim crtama, a na Linuxu `C:/...` stavi
// ispod svog foldera: poredi od `C:/dev/` nadalje.
const kraj = (putanja: string, rel: string) => putanja.replace(/\\/g, '/').endsWith(rel)
const uProjektu = (putanja: string) =>
  putanja
    .replace(/\\/g, '/')
    .replace(/^.*?(C:\/dev\/)/, '$1')
    .replace(/^C:\/dev\/lazni-projekat\//, '')

function svijet(on: any, o: Svijet = {}) {
  const fajlovi = new Set(o.fajlovi ?? [])
  on('command.register', () => ({ value: { command: 'radni-stol' } }))
  on('clock.every', () => ({ value: { id: 'sat' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: 'C:\\dev\\lazni-projekat' }))
  on('fs.read', (_: any, e: any) => {
    if (o.status !== undefined && uProjektu(e.path) === 'STATUS.md') return { value: o.status }
    if (/PODSJETNIK\.md$/.test(e.path)) return { value: PODSJETNIK }
    if (uProjektu(e.path) === 'package.json' && fajlovi.has('package.json'))
      return { value: JSON.stringify({ scripts: { start: 'node server.js' } }) }
    if (uProjektu(e.path) === '.claude/commands/zapisi.md')
      return { value: '---\ndescription: Upiši završenu izmjenu u dnevnik projekta\n---\n\nTekst.' }
    if (kraj(e.path, 'claude-licno/projekti.md')) return { value: PROJEKTI }
    return { deny: 'nema fajla' }
  })
  on('fs.exists', (_: any, e: any) => ({ value: fajlovi.has(uProjektu(e.path)) }))
  on('fs.list', (_: any, e: any) => {
    const f = o.folderi?.[uProjektu(e.path)]
    return f ? { value: f.map(x => ({ ...x, size: 0, mtimeMs: 0, isLink: false })) } : { deny: 'nema foldera' }
  })
  on('process.run', (_: any, e: any) => {
    const a = e.argv.join(' ')
    if (a.startsWith('gh ')) {
      if (o.gh === null) return { value: { exitCode: 1, stdout: '', stderr: 'no git remotes found' } }
      return { value: { exitCode: 0, stdout: o.gh ?? '[]', stderr: '' } }
    }
    if (o.git === false) return { value: { exitCode: 128, stdout: '', stderr: 'not a git repo' } }
    if (a === 'git branch --show-current') return { value: { exitCode: 0, stdout: 'feat/proba\n', stderr: '' } }
    if (a === 'git status --porcelain') return { value: { exitCode: 0, stdout: ' M a.md\n?? b.md\n', stderr: '' } }
    return { value: { exitCode: 1, stdout: '', stderr: '' } }
  })
  on('prompt.fill', (_: any, e: any) => {
    upisano.push(e.text)
    return { isFilled: true }
  })
  on('prompt.submit', () => {
    throw new Error('Radni stol nikad ne šalje poruku sam')
  })
}

async function pokreni($: any) {
  await $.session.start({ cwd: 'C:\\dev\\lazni-projekat', surface: 'desktop', isInteractive: true })
  await $.command.run(KOMANDA)
}

test('čitanje: STATUS dijelovi, komande podsjetnika i projekti.md', async () => {
  const s = statusDijelovi(STATUS)
  expect(s.sljedece).toEqual(['1. Napraviti ADR za radni stol', '2. Probati panel na 1366x768'])
  expect(s.blokeri).toEqual(['- čeka klijenta'])
  expect(s.radi).toEqual(['- nešto radi'])
  const k = komandePodsjetnika(PODSJETNIK)
  expect(k).toContain('kraj-sesije')
  expect(k).toContain('botovi-korisnika')
  expect(k.includes('TRZISTE.md') || k.includes('dev')).toBe(false)
  const p = projekti(PROJEKTI)
  expect(p.map(r => r.folder)).toEqual(['lazni-projekat', 'drugi', 'treci'])
  expect(p[1]?.pracenje).toBe('parkiran')
  expect(p[1]?.stanje).toBe('v2 gotov')
})

test('opisi: kolona Kad iz PODSJETNIKA, description iz frontmattera, skraćivanje', async () => {
  const o = opisiPodsjetnika(PODSJETNIK)
  expect(o['kraj-sesije']).toBe('Kraj')
  expect(o['stanje']).toBe('Igra')
  expect(opisFrontmattera('---\ndescription: "Kratko"\nmodel: haiku\n---\nx')).toBe('Kratko')
  expect(opisFrontmattera('bez frontmattera')).toBe('')
  const k = kratko('Ideja za aplikaciju: ima li kupaca i isplati li se (prije kickstarta)')
  expect(k.length <= 40).toBe(true)
  expect(k.endsWith('…')).toBe(true)
})

test('web: po pokretanju aplikacije, ne po samom package.json', async () => {
  const pj = (j: object) => JSON.stringify(j)
  expect(jeWeb({ packageJson: pj({ scripts: { test: 'node --test' } }), python: '', indexHtml: false })).toBe(false)
  expect(jeWeb({ packageJson: pj({ scripts: { dev: 'vite' } }), python: '', indexHtml: false })).toBe(true)
  expect(jeWeb({ packageJson: pj({ devDependencies: { vite: '5' } }), python: '', indexHtml: false })).toBe(true)
  expect(jeWeb({ packageJson: null, python: 'Flask==3.0', indexHtml: false })).toBe(true)
  expect(jeWeb({ packageJson: null, python: 'requests', indexHtml: true })).toBe(true)
  expect(jeWeb({ packageJson: 'nije json', python: '', indexHtml: false })).toBe(false)
})

test('izbor dugmadi: bez-kickstarta, igra, vlastite komande i Više', async () => {
  const baza = {
    podsjetnik: komandePodsjetnika(PODSJETNIK),
    git: true,
    blueprint: true,
    bezKickstarta: false,
    igra: false,
    web: false,
    lab: false,
    vlastiteKomande: [],
    agenti: [],
    opisi: {},
  }
  const obicno = izaberiDugmad(baza)
  expect(obicno.glavna.map(d => d.key)).toEqual(['nastavi', 'kraj', 'napredak', 'ideja', 'grane', 'vrati', 'pomoc', 'botovi'])
  expect(obicno.vise.some(d => d.key === 'v-pravila-pauza' || d.key === 'v-kickstart')).toBe(false)

  const bez = izaberiDugmad({ ...baza, bezKickstarta: true, git: false })
  expect(bez.glavna.map(d => d.key)).toEqual(['nastavi', 'kraj', 'ideja', 'pomoc', 'botovi'])
  expect(bez.vise.some(d => d.key === 'v-adr')).toBe(false)

  const igra = izaberiDugmad({ ...baza, igra: true, vlastiteKomande: ['stanje', 'popravka'], agenti: ['dizajner-igara'] })
  expect(igra.projekat.map(d => d.text)).toEqual(['/popravka ', '/balans'])
  expect(igra.vise[0]?.text).toBe('pusti agenta dizajner-igara')

  const bezPodsjetnika = izaberiDugmad({ ...baza, podsjetnik: null })
  expect(bezPodsjetnika.glavna.length).toBe(8)
})

test('panel: gdje sam stao, PR-ovi, dugme samo upiše tekst', async ($, on) => {
  svijet(on, {
    status: STATUS,
    fajlovi: ['package.json', 'C:/dev/Universal-AI-User-Lab/plugin/skills/kampanja/SKILL.md'],
    folderi: { '.claude/commands': [{ name: 'zapisi.md', kind: 'file' }] },
    gh: JSON.stringify([{ number: 7, title: 'Nova funkcija', url: 'https://github.com/v/lazni/pull/7' }]),
  })
  await pokreni($)

  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /ADR za radni stol/ }))?.text).toBe('1. Napraviti ADR za radni stol')
    expect(await ui.find({ type: 'Text', text: /čeka klijenta/ })).toBeDefined()
    expect((await ui.find({ type: 'Text', text: /^Grana/ }))?.text).toBe('Grana feat/proba · necommitovano 2')
    expect(await ui.find({ type: 'Link', text: /#7 Nova funkcija/ })).toBeDefined()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /^testovi, STATUS/ }))?.text).toBe('testovi, STATUS, commit, push')
  expect((await ui.find({ type: 'Text', text: /^Upiši završenu/ }))?.text).toBe('Upiši završenu izmjenu u dnevnik…')
  await ui.press({ key: 'kraj' })
  expect(upisano.at(-1)).toBe('/kraj-sesije')
  await ui.press({ key: 'botovi' })
  expect(upisano.at(-1)).toBe('pusti botove korisnika za ovu aplikaciju')
  await ui.press({ key: 'p-zapisi' })
  expect(upisano.at(-1)).toBe('/zapisi ')
  await ui.press({ key: 'p-provjera-izgleda' })
  expect(upisano.at(-1)).toBe('/provjera-izgleda')

  // Lab ima svoje mjesto, i uz dva projektna dugmeta je vidljiv bez „Više“.
  await ui.press({ key: 'lab' })
  expect(upisano.at(-1)).toBe('testiraj ovu aplikaciju Labom')
  expect(await ui.find({ key: 'v-stanje' })).toBeUndefined()
  await ui.press({ key: 'vise' })
  expect((await ui.find({ type: 'Text', text: /^Igra$/ }))?.text).toBe('Igra')
  await ui.press({ key: 'v-stanje' })
  expect(upisano.at(-1)).toBe('/stanje ')

  await ui.press({ key: 'projekti' })
  expect(await ui.find({ type: 'Text', text: /M2 u toku/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /1 parkiranih/ })).toBeDefined()
  await ui.unmount()
})

test('bez STATUS.md, gita i GitHuba panel to kaže', async ($, on) => {
  svijet(on, { git: false, gh: null })
  await pokreni($)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /Nema STATUS.md/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /nije git repo/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /nema GitHub remote/ })).toBeDefined()
  expect(await ui.find({ key: 'grane' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Lab/ })).toBeUndefined()
  await ui.unmount()
})
