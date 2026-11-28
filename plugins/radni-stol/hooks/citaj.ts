// Čisto čitanje teksta (bez $): STATUS.md, PODSJETNIK.md, projekti.md i izbor dugmadi.
// Sve funkcije primaju tekst ili liste imena i vraćaju podatke, da se mogu testirati bez fajlova.

import type { Dugme, Projekat, StatusDijelovi } from '../types'

const NASLOV = /^#{1,6}\s/

// Redovi ispod prvog naslova koji odgovara `naslov`, do sljedećeg naslova (najviše `max`).
export function dio(md: string, naslov: RegExp, max = 6): string[] {
  const linije = md.split(/\r?\n/)
  const start = linije.findIndex(l => NASLOV.test(l) && naslov.test(l.replace(NASLOV, '')))
  if (start < 0) return []
  const out: string[] = []
  for (const l of linije.slice(start + 1)) {
    if (NASLOV.test(l)) break
    if (l.trim() !== '') out.push(l.trim())
  }
  return out.slice(0, max)
}

export function statusDijelovi(md: string): StatusDijelovi {
  return {
    radi: dio(md, /^Radi\b/i, 4),
    sljedece: dio(md, /^Sljede/i, 5),
    blokeri: dio(md, /^Bloker/i, 4),
  }
}

// Imena komandi (`/ime`) koje PODSJETNIK.md spominje, bez ponavljanja, redom pojavljivanja.
export function komandePodsjetnika(md: string): string[] {
  const out: string[] = []
  for (const m of md.matchAll(/(?:^|[\s`(|·])\/([a-z][a-z0-9-]*[a-z0-9])/g)) {
    const ime = m[1] ?? ''
    if (ime !== '' && !out.includes(ime)) out.push(ime)
  }
  return out
}

// Redovi tabele iz C:\dev\claude-licno\projekti.md: Folder | GitHub repo | Tip | Stanje | Praćenje.
export function projekti(md: string): Projekat[] {
  const out: Projekat[] = []
  let uTabeli = false
  for (const l of md.split(/\r?\n/)) {
    if (/^\|\s*Folder\s*\|/i.test(l)) {
      uTabeli = true
      continue
    }
    if (!uTabeli) continue
    if (!l.startsWith('|')) {
      if (out.length > 0) break
      continue
    }
    if (/^\|[\s|:-]+\|?$/.test(l)) continue
    const [prvi = '', repo = '', tip = '', st = '', pr = ''] = l.split('|').slice(1, -1).map(s => s.trim())
    if (pr === '') continue
    const folder = (prvi.match(/`([^`]+)`/)?.[1] ?? repo.replace(/^.*\//, '').replace(/\s.*$/, '')).trim()
    const pracenje = (pr.replace(/\*\*/g, '').split('·')[0] ?? '').trim()
    out.push({ folder, tip, stanje: st.replace(/\*\*/g, '').replace(/`/g, ''), pracenje })
  }
  return out
}

export type Okolina = {
  podsjetnik: string[] | null // komande iz PODSJETNIK.md; null kad fajl nije nađen
  git: boolean
  blueprint: boolean
  bezKickstarta: boolean
  igra: boolean
  web: boolean
  lab: boolean // postoji Lab (kampanja/SKILL.md) na ovom računaru
  vlastiteKomande: string[] // .claude/skills/* i .claude/commands/*.md projekta
  opisi: Record<string, string> // ime komande ili `agent-<ime>` → kratak opis
  agenti: string[] // .claude/agents/*.md projekta
}

// Komande koje u projektu sa `.claude/bez-kickstarta` staju (PODSJETNIK, „Gdje je šta“).
export const STAJU_BEZ_KICKSTARTA = ['kickstart', 'nova-funkcija', 'ui-izmjena', 'adr', 'docs-audit', 'napredak', 'objavi', 'izdanje']
// Rijetke i servisne: ostaju samo u /pomoc.
const SAMO_U_POMOCI = ['radni-stol', 'pravila-pauza', 'preuzmi-lock', 'codex-worktree', 'pravilo-u-hook', 'kickstart']

type Glavno = Dugme & { opis: string; komanda: string; uslov?: (o: Okolina) => boolean }

const GLAVNA: Glavno[] = [
  { key: 'nastavi', label: 'Nastavi', text: 'nastavi', komanda: 'nastavi', opis: 'nastavlja od Sljedeće u STATUS.md' },
  { key: 'kraj', label: 'Završi rad', text: '/kraj-sesije', komanda: 'kraj-sesije', opis: 'testovi, STATUS, commit, push' },
  {
    key: 'napredak',
    label: 'Napredak',
    text: '/napredak html',
    komanda: 'napredak',
    opis: 'rokovi i funkcije po planu',
    uslov: o => o.blueprint && !o.bezKickstarta,
  },
  { key: 'ideja', label: 'Zapiši ideju', text: '/ideja ', komanda: 'ideja', opis: 'ideja van obima ide u listu ideja' },
  { key: 'grane', label: 'Grane', text: '/grane', komanda: 'grane', opis: 'koja grana je gotova, šta čeka', uslov: o => o.git },
  { key: 'vrati', label: 'Vrati kako je radilo', text: '/vrati', komanda: 'vrati', opis: 'nazad na zadnje stanje koje je radilo', uslov: o => o.git },
  { key: 'pomoc', label: 'Pomoć', text: '/pomoc', komanda: 'pomoc', opis: 'podsjetnik: koja komanda kad' },
  {
    key: 'botovi',
    label: 'Botovi korisnika',
    text: 'pusti botove korisnika za ovu aplikaciju',
    komanda: 'botovi-korisnika',
    opis: 'simulirani korisnici mjesecima koriste app',
  },
]

export type Izbor = { glavna: Dugme[]; projekat: Dugme[]; vise: Dugme[] }

export function izaberiDugmad(o: Okolina): Izbor {
  // Bez PODSJETNIKA ne znamo šta postoji: glavna dugmad se ipak pokažu (panel kaže zašto).
  const ima = (k: string) => o.podsjetnik === null || o.podsjetnik.includes(k) || k === 'nastavi'
  const glavna = GLAVNA.filter(g => ima(g.komanda) && (!g.uslov || g.uslov(o))).map(
    ({ key, label, text, opis }) => ({ key, label, text, opis }),
  )
  const zauzeto = new Set(GLAVNA.map(g => g.komanda))

  const projektna: Dugme[] = []
  const dodaj = (ime: string, text: string, label = text.trim(), opis = o.opisi[ime]) => {
    if (zauzeto.has(ime)) return
    zauzeto.add(ime)
    projektna.push({ key: `p-${ime}`, label, text, ...(opis ? { opis } : {}) })
  }
  // Kopije plugin skillova (npr. KL za cloud) nisu vlastite komande projekta.
  for (const k of o.vlastiteKomande) if (!o.podsjetnik?.includes(k)) dodaj(k, `/${k} `)
  if (o.igra && ima('balans')) dodaj('balans', '/balans')
  if (o.web && !o.igra && ima('provjera-izgleda')) dodaj('provjera-izgleda', '/provjera-izgleda')
  // Lab radi iz svakog projekta preko putanje (PODSJETNIK); trošak i „da“ traži Claude u chatu.
  if (o.web && !o.igra && o.lab) dodaj('lab', 'testiraj ovu aplikaciju Labom', 'Testiraj Labom', 'AI testeri probaju aplikaciju')
  for (const a of o.agenti) dodaj(`agent-${a}`, `pusti agenta ${a}`, `Agent ${a}`)

  const vise: Dugme[] = projektna.slice(2)
  for (const k of o.podsjetnik ?? []) {
    if (zauzeto.has(k) || SAMO_U_POMOCI.includes(k)) continue
    if (o.bezKickstarta && STAJU_BEZ_KICKSTARTA.includes(k)) continue
    zauzeto.add(k)
    const opis = o.opisi[k]
    vise.push({ key: `v-${k}`, label: `/${k}`, text: `/${k} `, ...(opis ? { opis } : {}) })
  }
  return { glavna, projekat: projektna.slice(0, 2), vise }
}

// Kratko: najviše `max` znakova, rez na razmaku, sa „…“.
export function kratko(s: string, max = 40): string {
  const t = s.replace(/\*\*|`/g, '').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const rez = t.slice(0, max - 1)
  const sp = rez.lastIndexOf(' ')
  return `${(sp > max / 2 ? rez.slice(0, sp) : rez).replace(/[\s,.;:·(]+$/, '')}…`
}

// Opis komande iz kolone „Kad“ u tabelama PODSJETNIKA (prvi red koji je spominje u koloni „Kucaš“).
export function opisiPodsjetnika(md: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const l of md.split(/\r?\n/)) {
    if (!l.startsWith('|') || /^\|[\s|:-]+\|?$/.test(l)) continue
    const [kad = '', kucas = ''] = l.split('|').slice(1, -1).map(s => s.trim())
    if (kad === '' || /^Kad$/i.test(kad)) continue
    for (const k of komandePodsjetnika(kucas)) if (!(k in out)) out[k] = kratko(kad)
  }
  return out
}

// `description:` iz frontmattera SKILL.md, komande ili agenta.
export function opisFrontmattera(md: string): string {
  const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? ''
  const d = fm.match(/^description:\s*(.+)$/m)?.[1] ?? ''
  return kratko(d.replace(/^["']|["']$/g, ''))
}

// Ime foldera iz putanje (Windows ili POSIX).
export function imeFoldera(putanja: string): string {
  return putanja.split(/[\\/]/).filter(Boolean).pop() ?? putanja
}

// Roditeljski folder putanje, sa kosim crtama.
export function roditelj(putanja: string): string {
  const d = putanja.replace(/\\/g, '/').replace(/\/+$/, '')
  return d.slice(0, d.lastIndexOf('/'))
}
