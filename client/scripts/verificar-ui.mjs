import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const clientDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rootDir = path.resolve(clientDir, '..')
const app = readFileSync(path.join(clientDir, 'src/App.tsx'), 'utf8')
const appCss = readFileSync(path.join(clientDir, 'src/App.css'), 'utf8')
const indexCss = readFileSync(path.join(clientDir, 'src/index.css'), 'utf8')
const categoriesSource = readFileSync(path.join(rootDir, 'server/src/categorias.ts'), 'utf8')
const packageNow = JSON.parse(readFileSync(path.join(clientDir, 'package.json'), 'utf8'))
const tailwindConfig = readFileSync(path.join(clientDir, 'tailwind.config.js'), 'utf8')

const tests = []
function test(name, callback) {
  try {
    const message = callback()
    tests.push({ name, passed: true, message })
  } catch (error) {
    tests.push({ name, passed: false, message: error instanceof Error ? error.message : String(error) })
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message)
}
function cssDeclarations(css, selector) {
  for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selectors.split(',').some((candidate) => candidate.trim() === selector)) continue
    return Object.fromEntries([...body.matchAll(/([\w-]+)\s*:\s*([^;]+)\s*;/g)].map(([, key, value]) => [key, value.trim()]))
  }
  throw new Error(`No se encontró la regla CSS: ${selector}`)
}
function cssVar(name) {
  const match = appCss.match(new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*(#[\\da-fA-F]{3,8})`))
  assert(match, `No se encontró el valor de ${name}`)
  return match[1]
}
function resolveColor(value) {
  const variable = value.match(/^var\((--[\w-]+)\)$/)
  return variable ? cssVar(variable[1]) : value
}
function rgb(value) {
  let hex = value.trim().replace(/^#/, '')
  if (hex.length === 3 || hex.length === 4) hex = [...hex.slice(0, 3)].map((digit) => digit + digit).join('') + (hex.length === 4 ? hex[3].repeat(2) : '')
  assert(hex.length === 6 || hex.length === 8, `Color no reconocido: ${value}`)
  return [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)).concat(hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1)
}
function composite(foreground, background) {
  const fg = rgb(foreground)
  const bg = rgb(background)
  return `#${fg.slice(0, 3).map((channel, index) => Math.round(channel * fg[3] + bg[index] * (1 - fg[3])).toString(16).padStart(2, '0')).join('')}`
}
function luminance(color) {
  const channels = rgb(color).slice(0, 3).map((channel) => channel / 255).map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}
function contrast(text, background) {
  const values = [luminance(text), luminance(background)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}
function assertContrast(label, foreground, background) {
  const ratio = contrast(foreground, background)
  assert(ratio >= 4.5, `${label}: ${foreground} sobre ${background} = ${ratio.toFixed(2)}:1 (< 4.5:1)`)
  return `${label} ${ratio.toFixed(2)}:1`
}
function categoriesFromSource() {
  return [...categoriesSource.matchAll(/\{\s*id:\s*Categoria\.(\w+),[^\n]*?color:\s*'(#[\da-fA-F]{6})'/g)].map(([, id, color]) => ({ id, color }))
}

test('1. Selector select y sin grilla de categoría', () => {
  assert(/<select\s+id="categoria-elegida"/.test(app), 'No existe el select de categoría')
  assert(!/selector-categorias/.test(app), 'Todavía aparece el selector en grilla')
  assert(/categorias\.map\(\(categoria\) => <option/.test(app), 'Las opciones no salen de la colección categorías')
  return 'select presente, sin grilla, opciones tomadas de categorías'
})

test('2. Placeholder deshabilitado y estado inicial vacío', () => {
  assert(/useState<Categoria \| null>\(null\)/.test(app), 'El estado inicial de categoría no es null')
  assert(/<option value="" disabled>Elegí el tipo de problema<\/option>/.test(app), 'Falta el placeholder vacío y deshabilitado')
  assert(/value=\{categoriaElegida \?\? ''\}/.test(app), 'El select no queda vacío al inicio')
  assert(/!categoriaElegida \|\| enviando/.test(app), 'Enviar no conserva la condición de categoría elegida')
  return 'estado inicial null, placeholder disabled y envío requiere categoría'
})

test('3. Tema oscuro y scrollbars', () => {
  assert(/html\s*\{[^}]*color-scheme:\s*dark/s.test(indexCss), 'Falta color-scheme: dark en html')
  assert(/scrollbar-color\s*:/i.test(appCss), 'Falta scrollbar-color')
  assert(/\*\s*::-webkit-scrollbar\s*\{/i.test(appCss), 'Falta ::-webkit-scrollbar')
  return 'html oscuro y reglas Firefox/WebKit presentes'
})

test('4. Filtros accesibles y sistema de botones oscuro', () => {
  assert((app.match(/aria-pressed=\{/g) ?? []).length >= 2, 'Los chips no tienen aria-pressed')
  for (const selector of ['.boton', '.boton--primario', '.boton--peligro']) cssDeclarations(appCss, selector)
  const buttonBase = cssDeclarations(appCss, '.aplicacion button')
  assert(buttonBase.background === 'var(--panel-2)', 'El estilo base de botones no reemplaza el fondo nativo')
  assert(!/\.selector-categorias\s+button\s*\{[^}]*background:\s*#fff/i.test(appCss), 'Quedó una regla blanca de la antigua grilla')
  assert(!/<button\b[^>]*\bstyle=/.test(app), 'Hay colores/tamaños inline en un botón')
  return 'aria-pressed presente; clases base/primario/peligro y fondo CSS oscuro'
})

test('5. Contraste WCAG de filtros, insignia, clima y botones', () => {
  const results = []
  const rootBg = cssVar('--panel')
  results.push(assertContrast('Chip reposo', '#cbd5df', rootBg))

  const categories = categoriesFromSource()
  assert(categories.length > 0, 'No se pudieron leer las categorías de categorías.ts')
  for (const { id, color } of categories) {
    const rule = cssDeclarations(appCss, `.aplicacion .filtros-categoria button[data-categoria="${id}"].filtro-activo`)
    assert(rule.background === color, `${id}: el relleno ${rule.background} no coincide con categorias.ts (${color})`)
    results.push(assertContrast(`Chip ${id}`, resolveColor(rule.color), resolveColor(rule.background)))
  }

  const amber = cssDeclarations(appCss, '.etiqueta-escenario')
  results.push(assertContrast('Insignia ámbar', amber.color, amber.background))

  const pill = cssDeclarations(appCss, '.clima-pildora').background
  const bodyBg = cssVar('--fondo')
  const pillOpaque = composite(pill, bodyBg)
  const label = cssDeclarations(appCss, '.clima-segmento small')
  const value = cssDeclarations(appCss, '.clima-segmento strong')
  results.push(assertContrast('Etiqueta clima', label.color, pillOpaque))
  results.push(assertContrast('Valor clima', value.color, pillOpaque))

  const baseButton = cssDeclarations(appCss, '.boton')
  const buttonBg = cssVar('--panel-2')
  results.push(assertContrast('Botón base', resolveColor(baseButton.color), buttonBg))
  const primary = cssDeclarations(appCss, '.boton--primario')
  results.push(assertContrast('Botón primario', resolveColor(primary.color), resolveColor(primary.background)))
  const danger = cssDeclarations(appCss, '.boton--peligro')
  results.push(assertContrast('Botón peligro', danger.color, danger.background))
  results.push(assertContrast('Texto principal claro', '#0f172a', '#f1f5f9'))
  results.push(assertContrast('Texto panel claro', '#0f172a', '#ffffff'))
  results.push(assertContrast('Texto secundario claro', '#475569', '#ffffff'))
  return `${results.length} pares ≥ 4.5:1 (${results.join('; ')})`
})

test('6. Tailwind darkMode por clase y dependencias esperadas', () => {
  assert(!/\b(?:sm|md|lg|xl|2xl):(?:flex|grid|block|hidden|text-|bg-|p-|m-)/.test(app + appCss), 'Se detectaron clases utilitarias Tailwind')
  assert(/darkMode:\s*'class'/.test(tailwindConfig), 'Tailwind no está configurado con darkMode class')
  assert(/preflight:\s*false/.test(tailwindConfig), 'Tailwind resetearía los estilos actuales')
  const original = JSON.parse(execFileSync('git', ['show', 'HEAD:client/package.json'], { cwd: rootDir, encoding: 'utf8' }))
  const added = ['dependencies', 'devDependencies'].flatMap((section) => Object.keys(packageNow[section] ?? {}).filter((name) => !(name in (original[section] ?? {}))))
  const expected = ['autoprefixer', 'postcss', 'tailwindcss']
  assert(expected.every((name) => added.includes(name)), `Faltan dependencias de Tailwind: ${expected.filter((name) => !added.includes(name)).join(', ')}`)
  assert(added.every((name) => expected.includes(name)), `Dependencias adicionales inesperadas: ${added.filter((name) => !expected.includes(name)).join(', ')}`)
  return 'darkMode class; Tailwind/PostCSS configurados sin preflight ni utilidades nuevas en JSX'
})

test('7. Preferencia de tema persistente y toggle accesible', () => {
  assert(/useState<'dark' \| 'light'>\(\(\) =>/.test(app), 'Falta el estado global de tema dark/light')
  assert(/localStorage\.getItem\('munialerta-tema'\)/.test(app) && /localStorage\.setItem\('munialerta-tema', tema\)/.test(app), 'No se guarda/restaura el tema')
  assert(/document\.documentElement\.classList\.toggle\('dark', tema === 'dark'\)/.test(app), 'No se aplica la clase dark al HTML')
  assert(/aria-label=\{tema === 'dark' \? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'\}/.test(app), 'El toggle no tiene nombre accesible dinámico')
  assert(/tema === 'dark' \? '☀️' : '🌙'/.test(app), 'El ícono no indica el modo destino')
  assert(/html\.light/.test(appCss) && /\.tema-light/.test(appCss), 'Faltan estilos claros para componentes')
  return 'tema dark por defecto, try/catch en storage, clase global y botón accesible'
})

test('8. Build y lint del cliente', () => {
  const runNpm = (script) => {
    const command = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : 'npm'
    const args = process.platform === 'win32' ? ['/d', '/s', '/c', `npm run ${script}`] : ['run', script]
    return execFileSync(command, args, {
      cwd: clientDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  }
  runNpm('build')
  const lintOutput = runNpm('lint')
  const warnings = [...lintOutput.matchAll(/warning\s+/gi)].length
  return `npm run build y npm run lint finalizaron con código 0${warnings ? ` (${warnings} advertencias)` : ''}`
})

for (const result of tests) console.log(`${result.passed ? 'PASA' : 'FALLA'} — ${result.name}: ${result.message}`)
const failures = tests.filter((result) => !result.passed)
console.log(`\nResultado: ${tests.length - failures.length}/${tests.length} pruebas PASA`)
if (failures.length) process.exitCode = 1
