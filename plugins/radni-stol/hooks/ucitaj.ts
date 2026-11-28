// Čitanje stanja projekta preko $: fajlovi, git i gh, samo komande za čitanje (ADR 0001).
// Kad nešto ne može pročitati, vrati jednu rečenicu u `napomene` umjesto praznog dijela.

import type { EngineInterface } from 'claude-code'

import type { PRovi, Stanje } from '../types'
import {
  imeFoldera,
  izaberiDugmad,
  komandePodsjetnika,
  opisFrontmattera,
  opisiPodsjetnika,
  projekti,
  roditelj,
  statusDijelovi,
} from './citaj'

const PODSJETNIK = 'skills/pomoc/PODSJETNIK.md'
const LICNI_SLOJ = 'C:/dev/claude-licno/projekti.md'
const LAB = 'C:/dev/Universal-AI-User-Lab/plugin/skills/kampanja/SKILL.md'
const LOKALNI_PLUGINI = 'C:/dev/claude-plugins/plugins/project-kickstart'

async function procitaj($: EngineInterface, putanja: string): Promise<string | null> {
  try {
    return await $.fs.read(putanja)
  } catch {
    return null
  }
}

async function postoji($: EngineInterface, putanja: string): Promise<boolean> {
  try {
    return await $.fs.exists(putanja)
  } catch {
    return false
  }
}

async function imena($: EngineInterface, folder: string, vrsta: 'dir' | 'md'): Promise<string[]> {
  try {
    const lista = await $.fs.list(folder)
    return lista
      .filter(f => (vrsta === 'dir' ? f.kind === 'dir' : f.kind === 'file' && f.name.endsWith('.md')))
      .map(f => f.name.replace(/\.md$/, ''))
      .filter(n => !n.startsWith('.'))
      .sort()
  } catch {
    return []
  }
}

// PODSJETNIK iz instaliranog project-kickstarta (keš pluginova, ista verzija kao instalirana),
// pa iz susjednog foldera (izvor iz repoa), pa iz lokalnog klona claude-plugins.
export async function nadjiPodsjetnik($: EngineInterface): Promise<string | null> {
  const root = $.plugin.root.replace(/\\/g, '/')
  const kandidati: string[] = []
  const kes = `${roditelj(roditelj(root))}/project-kickstart`
  try {
    const verzije = (await $.fs.list(kes)).filter(f => f.kind === 'dir').map(f => f.name)
    verzije.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).reverse()
    for (const v of verzije) kandidati.push(`${kes}/${v}/${PODSJETNIK}`)
  } catch {
    // nije keš pluginova
  }
  kandidati.push(`${roditelj(root)}/project-kickstart/${PODSJETNIK}`, `${LOKALNI_PLUGINI}/${PODSJETNIK}`)
  for (const k of kandidati) {
    const t = await procitaj($, k)
    if (t !== null) return t
  }
  return null
}

// Apsolutno, sa kosim crtama: relativna putanja u $.fs ne prati uvijek folder sesije.
async function folderSesije($: EngineInterface): Promise<string> {
  return (await $.session.cwd()).replace(/\\/g, '/').replace(/\/+$/, '')
}

async function git($: EngineInterface, cwd: string) {
  try {
    const g = await $.process.run(['git', 'branch', '--show-current'], { cwd, timeoutMs: 10000 })
    if (g.exitCode !== 0) return { gitGreska: 'Ovaj folder nije git repo.', grana: '', necommitovano: null }
    const s = await $.process.run(['git', 'status', '--porcelain'], { cwd, timeoutMs: 10000 })
    return {
      gitGreska: '',
      grana: g.stdout.trim() || '(odvojen HEAD)',
      necommitovano: s.exitCode === 0 ? s.stdout.split(/\r?\n/).filter(l => l.trim()).length : null,
    }
  } catch {
    return { gitGreska: 'git se ne može pokrenuti.', grana: '', necommitovano: null }
  }
}

export async function ucitaj($: EngineInterface): Promise<Stanje> {
  const cwd = await folderSesije($)
  const u = (rel: string) => `${cwd}/${rel}`
  const napomene: string[] = []

  const statusMd = await procitaj($, u('STATUS.md'))
  const g = await git($, cwd)

  const podsjetnikMd = await nadjiPodsjetnik($)
  if (podsjetnikMd === null) napomene.push('PODSJETNIK.md nije nađen, pa su prikazana samo osnovna dugmad.')

  const [blueprint = false, bezKickstarta = false, igra = false, ...webFajlovi] = await Promise.all(
    ['docs/BLUEPRINT.md', '.claude/bez-kickstarta', 'project.godot', 'package.json', 'requirements.txt', 'pyproject.toml'].map(
      p => postoji($, u(p)),
    ),
  )
  const web = webFajlovi.some(Boolean)
  const lab = await postoji($, LAB)
  const skillovi = await imena($, u('.claude/skills'), 'dir')
  const komande = await imena($, u('.claude/commands'), 'md')
  const agenti = await imena($, u('.claude/agents'), 'md')

  // Kratki opisi uz dugmad: PODSJETNIK (kolona „Kad“), pa description vlastitih komandi projekta.
  const opisi: Record<string, string> = podsjetnikMd === null ? {} : opisiPodsjetnika(podsjetnikMd)
  const opisIz = async (ime: string, putanja: string) => {
    const t = await procitaj($, u(putanja))
    const o = t === null ? '' : opisFrontmattera(t)
    if (o !== '') opisi[ime] = o
  }
  await Promise.all([
    ...skillovi.map(s => opisIz(s, `.claude/skills/${s}/SKILL.md`)),
    ...komande.map(k => opisIz(k, `.claude/commands/${k}.md`)),
    ...agenti.map(a => opisIz(`agent-${a}`, `.claude/agents/${a}.md`)),
  ])

  const dugmad = izaberiDugmad({
    podsjetnik: podsjetnikMd === null ? null : komandePodsjetnika(podsjetnikMd),
    git: g.gitGreska === '',
    blueprint,
    bezKickstarta,
    igra,
    web,
    lab,
    vlastiteKomande: [...new Set([...skillovi, ...komande])],
    opisi,
    agenti,
  })
  if (web && !igra && !lab) {
    napomene.push('Lab nije nađen u C:/dev/Universal-AI-User-Lab, pa nema dugmeta za njega.')
  }

  let projektiMd = await procitaj($, `${roditelj(cwd)}/claude-licno/projekti.md`)
  if (projektiMd === null) projektiMd = await procitaj($, LICNI_SLOJ)

  return {
    projekat: imeFoldera(cwd),
    status: statusMd === null ? null : statusDijelovi(statusMd),
    ...g,
    dugmad,
    napomene,
    projekti: projektiMd === null ? null : projekti(projektiMd),
  }
}

// Otvoreni PR-ovi preko gh (samo čitanje). Sporije od gita, pa se zove rjeđe.
export async function ucitajPR($: EngineInterface): Promise<PRovi> {
  try {
    const cwd = await folderSesije($)
    const r = await $.process.run(
      ['gh', 'pr', 'list', '--state', 'open', '--limit', '5', '--json', 'number,title,url'],
      { cwd, timeoutMs: 20000 },
    )
    if (r.exitCode !== 0) {
      const nema = /no git remotes|not a git repository|none of the git remotes/i.test(r.stderr)
      return { greska: nema ? 'Repo nema GitHub remote.' : 'gh ne može pročitati PR-ove (prijava?).', lista: [] }
    }
    const lista = (JSON.parse(r.stdout || '[]') as { number: number; title: string; url: string }[]).map(p => ({
      broj: p.number,
      naslov: p.title,
      url: p.url,
    }))
    return { greska: '', lista }
  } catch {
    return { greska: 'gh se ne može pokrenuti.', lista: [] }
  }
}
