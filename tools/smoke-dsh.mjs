#!/usr/bin/env node
// Runtime smoke test for the Tianlight skin against a real DSH web build.
//
//   node tools/smoke-dsh.mjs --dsh <node_modules/@deepseek-ai> [--chrome <path>] [--port <n>] [--keep]
//
// The same command runs locally and in the `smoke` job of
// .github/workflows/dsh-canary.yml. It uses Node built-ins plus an installed Chrome
// or Edge; there is no npm dependency and the repository is never modified: every
// file it writes lives under a temporary directory (or under smoke-artifacts/ when a
// case fails).
//
// What it proves, in order:
//   1. pack the skin (`node tools/pack.mjs`) and install it into a THROWAWAY DSH home
//      with the shipped installer;
//   2. start `dsh web` on that home and drive a headless Chrome through CDP;
//   3. `body` carries the skin attribute (skin applied at all);
//   4. splash style "off"  -> the composer is visible within 10 s;
//   5. splash style "long" -> the film starts, ends within 25 s, and #root is visible;
//   6. no console error / page exception comes from this plugin.
//
// A failure keeps a screenshot plus the console dump under smoke-artifacts/<stamp>/
// and exits 1; success prints one PASS line per assertion and exits 0.
//
// Child processes are started with stdio redirected to FILES, not pipes: a confined
// host (the DSH sandbox) gives child processes no named pipes, so a piped spawn
// fails with EPERM there while the file form works everywhere.

import { spawn, spawnSync } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const SKIN_PACKAGE = 'dsh-client-ui-skin-tianlight'
const SKIN_ATTR = 'data-dsh-tianlight'
const SPLASH_STYLE_KEY = 'tianlight.splash.style'
const SPLASH_SEEN_KEY = 'tianlight.splash.seen.v1'
const COMPOSER_SELECTOR = '[data-tl-composer], [data-composer-card]'
const COMPOSER_BUDGET_MS = 10_000
const FILM_BUDGET_MS = 25_000
const FILM_START_BUDGET_MS = 10_000
const APPLY_BUDGET_MS = 20_000
const DSH_BOOT_BUDGET_MS = 120_000

const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

// ---- options ----------------------------------------------------------------
const argv = process.argv.slice(2)
const option = (name, fallback = null) => {
  const index = argv.indexOf(name)
  return index >= 0 && argv[index + 1] !== undefined && argv[index + 1].startsWith('--') === false ? argv[index + 1] : fallback
}
const keep = argv.includes('--keep')
const dshArg = option('--dsh', process.env.DSH_PKGS_ROOT ?? null)
const chromeArg = option('--chrome', null)
const portArg = option('--port', null)
const matrixDir = option('--matrix', null)

function fail(message) {
  console.error('smoke: ' + message)
  process.exit(2)
}

// ---- locate the harness -----------------------------------------------------
/** The dsh CLI entry (`lib/bin.js`) under a node_modules/@deepseek-ai tree. */
function resolveDshBin(root) {
  const candidates = [
    join(root, 'dsh', 'lib', 'bin.js'), // <node_modules>/@deepseek-ai
    join(root, 'lib', 'bin.js'), // the @deepseek-ai/dsh package itself
    join(root, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'), // an install prefix
  ]
  for (const candidate of candidates) if (existsSync(candidate)) return candidate
  return null
}

if (dshArg === null) fail('pass --dsh <node_modules/@deepseek-ai of a DSH install> (or set DSH_PKGS_ROOT)')
const dshBin = resolveDshBin(resolve(dshArg))
if (dshBin === null) fail('no dsh CLI found under ' + resolve(dshArg) + ' (expected dsh/lib/bin.js)')
const dshVersion = (() => {
  try {
    const manifest = JSON.parse(readFileSync(join(dirname(dshBin), '..', 'package.json'), 'utf8'))
    return manifest.version ?? '?'
  } catch {
    return '?'
  }
})()

// ---- locate a browser -------------------------------------------------------
/** First existing path: the explicit option, then env, then the platform's usual installs. */
function findChrome() {
  const fromEnv = [chromeArg, process.env.CHROME_PATH, process.env.CHROME_BIN].filter((value) => typeof value === 'string' && value !== '')
  const env = process.env
  const candidates =
    process.platform === 'win32'
      ? [
          `${env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)'}\\Microsoft\\Edge\\Application\\msedge.exe`,
          `${env.ProgramFiles ?? 'C:\\Program Files'}\\Microsoft\\Edge\\Application\\msedge.exe`,
          `${env.ProgramFiles ?? 'C:\\Program Files'}\\Google\\Chrome\\Application\\chrome.exe`,
          `${env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)'}\\Google\\Chrome\\Application\\chrome.exe`,
          `${env.LOCALAPPDATA ?? ''}\\Google\\Chrome\\Application\\chrome.exe`,
        ]
      : process.platform === 'darwin'
        ? [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
          ]
        : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium']
  for (const value of [...fromEnv, ...candidates]) if (existsSync(value)) return value
  return null
}

const chrome = findChrome()
if (chrome === null) fail('no Chrome/Edge found; pass --chrome <path> or set CHROME_PATH')

// ---- process helpers --------------------------------------------------------
/** A process tree kill that works without pipes (Windows uses taskkill /T). */
function killTree(child) {
  if (child === null || child === undefined || child.pid === undefined || child.exitCode !== null) return
  // TerminateProcess through the handle first: this needs no helper process, so a
  // confined host that cannot spawn arbitrary helpers still stops the child.
  try {
    child.kill('SIGKILL')
  } catch {
    // already gone
  }
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
    } else {
      process.kill(-child.pid, 'SIGKILL')
    }
  } catch {
    // a refused tree kill is fine: the direct child is already terminated
  }
}

/** Spawn with stdio redirected into `<dir>/<name>.log`; returns the log path. */
function spawnLogged(command, args, { cwd, env, logPath, detached = false }) {
  const fd = openSync(logPath, 'w')
  let child
  try {
    child = spawn(command, args, { cwd, env, stdio: ['ignore', fd, fd], detached, windowsHide: true })
  } finally {
    closeSync(fd)
  }
  return child
}

/** Poll a file until `test(text)` is true; returns the match or null on timeout. */
async function pollFile(file, test, timeoutMs, intervalMs = 200) {
  const started = Date.now()
  let last = ''
  while (Date.now() - started < timeoutMs) {
    try {
      last = readFileSync(file, 'utf8')
    } catch {
      last = ''
    }
    const found = test(last)
    if (found !== null && found !== undefined) return found
    await sleep(intervalMs)
  }
  return null
}

// ---- throwaway DSH home -----------------------------------------------------
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const work = join(tmpdir(), 'tl-smoke-' + stamp)
const home = join(work, 'home')
const distRoot = join(work, 'dist')
const logs = join(work, 'logs')
mkdirSync(logs, { recursive: true })

/** Start `dsh web` and resolve its launch URL (the token line on stdout). */
async function startDsh(port, tag) {
  const logPath = join(logs, tag + '.log')
  const child = spawnLogged(process.execPath, [dshBin, 'web', '--host', '127.0.0.1', '--port', String(port), '--no-open'], {
    cwd: work,
    env: { ...process.env, DSH_HOME: home, NO_COLOR: '1' },
    logPath,
    detached: process.platform !== 'win32',
  })
  const launch = await pollFile(
    logPath,
    (text) => {
      const match = /https?:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+/.exec(text)
      return match === null ? null : match[0]
    },
    DSH_BOOT_BUDGET_MS,
  )
  if (launch === null) {
    killTree(child)
    throw new Error('dsh web did not print a launch URL within ' + DSH_BOOT_BUDGET_MS + ' ms; see ' + logPath)
  }
  return { child, launch, logPath }
}

/** A free TCP port from the operating system. */
async function freePort() {
  const { createServer } = await import('node:net')
  return await new Promise((resolvePort, reject) => {
    const server = createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address !== null ? address.port : 0
      server.close(() => resolvePort(port))
    })
  })
}

/** true once nothing accepts a connection on 127.0.0.1:`port`. */
async function portFree(port) {
  const { connect } = await import('node:net')
  return await new Promise((ok) => {
    const socket = connect({ host: '127.0.0.1', port })
    socket.once('connect', () => {
      socket.destroy()
      ok(false)
    })
    socket.once('error', () => ok(true))
  })
}

/** Kill a dsh web process tree and wait until its port is released. */
async function stopDsh(instance, port, label) {
  const child = instance?.child ?? null
  if (child === null) return
  const exited = new Promise((ok) => {
    if (child.exitCode !== null) {
      ok()
      return
    }
    child.once('exit', () => ok())
    setTimeout(ok, 8_000)
  })
  killTree(child)
  await exited
  const started = Date.now()
  while (Date.now() - started < 15_000) {
    if (await portFree(port)) return
    await sleep(250)
  }
  throw new Error('the ' + label + ' dsh web process still listens on ' + port + ' after the kill')
}

const bootstrapPort = portArg === null ? await freePort() : Number(portArg)
if (!Number.isInteger(bootstrapPort) || bootstrapPort <= 0) fail('--port must be a positive integer')

// ---- minimal CDP client -----------------------------------------------------
class Cdp {
  constructor(webSocketUrl) {
    this.url = webSocketUrl
    this.socket = null
    this.seq = 0
    this.pending = new Map()
    this.consoleErrors = []
    this.exceptions = []
    this.consoleCount = 0
    this.seedId = null
  }

  async connect(timeoutMs = 20_000) {
    const socket = new WebSocket(this.url)
    this.socket = socket
    await new Promise((ok, bad) => {
      const timer = setTimeout(() => bad(new Error('CDP websocket open timeout')), timeoutMs)
      socket.onopen = () => {
        clearTimeout(timer)
        ok()
      }
      socket.onerror = () => {
        clearTimeout(timer)
        bad(new Error('CDP websocket error'))
      }
    })
    socket.onmessage = (event) => this.onMessage(JSON.parse(event.data))
    await this.send('Page.enable')
    await this.send('Runtime.enable')
    await this.send('Log.enable')
    return this
  }

  onMessage(message) {
    if (message.id !== undefined && this.pending.has(message.id)) {
      const { ok, bad } = this.pending.get(message.id)
      this.pending.delete(message.id)
      if (message.error !== undefined) bad(new Error('CDP ' + message.error.message))
      else ok(message.result)
      return
    }
    if (message.method === 'Runtime.consoleAPICalled') {
      this.consoleCount += 1
      if (message.params.type === 'error' || message.params.type === 'assert') {
        this.consoleErrors.push({
          kind: 'console',
          level: message.params.type,
          text: (message.params.args ?? []).map((arg) => String(arg.value ?? arg.description ?? arg.type)).join(' '),
          url: message.params.stackTrace?.callFrames?.[0]?.url ?? null,
        })
      }
    } else if (message.method === 'Runtime.exceptionThrown') {
      const detail = message.params.exceptionDetails ?? {}
      this.exceptions.push({
        kind: 'exception',
        text: detail.text ?? '',
        description: detail.exception?.description ?? '',
        url: detail.url ?? detail.stackTrace?.callFrames?.[0]?.url ?? null,
      })
    } else if (message.method === 'Log.entryAdded') {
      const entry = message.params.entry ?? {}
      if (entry.level === 'error') {
        this.consoleErrors.push({ kind: 'log', level: entry.level, text: entry.text ?? '', url: entry.url ?? null })
      }
    }
  }

  send(method, params = {}, timeoutMs = 30_000) {
    const id = ++this.seq
    return new Promise((ok, bad) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        bad(new Error('CDP timeout ' + method))
      }, timeoutMs)
      this.pending.set(id, {
        ok: (value) => {
          clearTimeout(timer)
          ok(value)
        },
        bad: (error) => {
          clearTimeout(timer)
          bad(error)
        },
      })
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }

  async eval(expression, timeoutMs = 30_000) {
    const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }, timeoutMs)
    if (result.exceptionDetails !== undefined) {
      const detail = result.exceptionDetails
      throw new Error('page JS error: ' + String(detail.exception?.description ?? detail.text))
    }
    return result.result?.value
  }

  /** Poll a JS expression until it is truthy; returns {ok, elapsedMs, last}. */
  async waitFor(expression, timeoutMs, intervalMs = 150) {
    const started = Date.now()
    let last = null
    while (Date.now() - started <= timeoutMs) {
      try {
        last = await this.eval('(() => { try { return (' + expression + ') } catch (error) { return "JS_ERROR: " + String(error) } })()')
      } catch (error) {
        last = 'CDP_ERROR: ' + error.message
      }
      if (last === true) return { ok: true, elapsedMs: Date.now() - started, last }
      await sleep(intervalMs)
    }
    return { ok: false, elapsedMs: Date.now() - started, last }
  }

  /** Replace the pre-load localStorage/sessionStorage seed (one script, replaced each case). */
  async seed(style) {
    if (this.seedId !== null) {
      await this.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: this.seedId })
      this.seedId = null
    }
    const source = `(() => {
      try {
        localStorage.setItem('tianlight.lowpower', 'off');
        localStorage.setItem('tianlight.splash.forceMotion', '1');
        localStorage.setItem(${JSON.stringify(SPLASH_STYLE_KEY)}, ${JSON.stringify(style)});
        sessionStorage.removeItem(${JSON.stringify(SPLASH_SEEN_KEY)});
      } catch (error) { /* storage can be blocked; the assertion then fails loudly */ }
    })()`
    const result = await this.send('Page.addScriptToEvaluateOnNewDocument', { source })
    this.seedId = result.identifier ?? null
  }

  async reload() {
    await this.send('Page.reload', { ignoreCache: false })
  }

  async screenshot(path) {
    const shot = await this.send('Page.captureScreenshot', { format: 'png', fromSurface: true })
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, Buffer.from(shot.data, 'base64'))
    return path
  }

  close() {
    try {
      this.socket?.close()
    } catch {
      // already closed
    }
  }
}

/** Attach to the page target whose URL is on `debugPort` and mentions `pagePort`. */
async function attach(debugPort, pagePort, timeoutMs = 30_000) {
  const started = Date.now()
  let last = null
  while (Date.now() - started <= timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`)
      const targets = await response.json()
      const target = targets.find((entry) => entry.type === 'page' && entry.url.includes(`127.0.0.1:${pagePort}`))
      if (target !== undefined && typeof target.webSocketDebuggerUrl === 'string') {
        return await new Cdp(target.webSocketDebuggerUrl).connect()
      }
      last = `no page target yet (${targets.length} target(s))`
    } catch (error) {
      last = error instanceof Error ? error.message : String(error)
    }
    await sleep(250)
  }
  throw new Error('could not attach to Chrome on :' + debugPort + ': ' + last)
}

// ---- assertions -------------------------------------------------------------
const results = []
const assert = (name, ok, detail) => {
  results.push({ name, ok, detail })
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}${detail === undefined ? '' : '  ->  ' + detail}`)
  return ok
}

const SKIN_ERROR_PATTERN = new RegExp(SKIN_PACKAGE + '|tianlight', 'i')
const pluginErrors = (cdp) => [...cdp.consoleErrors, ...cdp.exceptions].filter((entry) => SKIN_ERROR_PATTERN.test(String(entry.text) + ' ' + String(entry.url ?? '') + ' ' + String(entry.description ?? '')))

/** Save the failure evidence and return the directory. */
function saveEvidence(cdp, label) {
  const dir = join(ROOT, 'smoke-artifacts', stamp)
  mkdirSync(dir, { recursive: true })
  const evidence = { label, stamp, dshVersion, chrome, port: runPort, consoleErrors: cdp.consoleErrors, exceptions: cdp.exceptions, results }
  writeFileSync(join(dir, 'console.json'), JSON.stringify(evidence, null, 2) + '\n', 'utf8')
  return dir
}

// ---- v2.3.0 screenshot matrix (optional: --matrix <dir>) ---------------------
// Runs in the SAME lab instance as the smoke assertions: three synthetic wallpapers
// (bright / mid / dark, SVG so no encoder is needed) × two schemes × the scenes the
// release notes promise contract. Each shot is written as PNG; `matrix.json` lists the
// files so a reviewer (or tools/contrast-probe.mjs) can check them without a browser.
const MATRIX_WALLPAPERS = [
  { id: 'matrix-bright', luma: 'bright', svg: ['#a9d3f5', '#cfe6fa', '#eef6fd', '#fbf4e8'] },
  { id: 'matrix-mid', luma: 'mid', svg: ['#5b7fa6', '#7d9dbb', '#93b0c9', '#6f8ba6'] },
  { id: 'matrix-dark', luma: 'dark', svg: ['#0b1220', '#101a2b', '#16233a', '#0d1524'] },
]

/** Write one SVG wallpaper per luma and report its host-relative path. */
function ensureMatrixWallpapers(assetsDir) {
  const paths = {}
  for (const entry of MATRIX_WALLPAPERS) {
    const name = entry.id + '.svg'
    const [a, b, c, d] = entry.svg
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="900" viewBox="0 0 1280 900">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1">' +
      `<stop offset="0" stop-color="${a}"/><stop offset="0.38" stop-color="${b}"/>` +
      `<stop offset="0.7" stop-color="${c}"/><stop offset="1" stop-color="${d}"/>` +
      '</linearGradient></defs><rect width="1280" height="900" fill="url(#g)"/></svg>'
    writeFileSync(join(assetsDir, name), svg, 'utf8')
    paths[entry.luma] = '/skin-tianlight/' + name
  }
  return paths
}

/** v2.3.0: capture the appearance matrix into `dir`. */
async function captureMatrix(cdp, dir) {
  mkdirSync(dir, { recursive: true })
  // Locate the installed skin so its assets/ dir can receive the synthetic wallpapers.
  const profiles = join(home, 'profiles')
  const profileName = readdirSync(profiles).find((name) => existsSync(join(profiles, name, 'node_modules', SKIN_PACKAGE, 'assets')))
  if (profileName === undefined) throw new Error('installed skin assets not found under ' + profiles)
  const assetsDir = join(profiles, profileName, 'node_modules', SKIN_PACKAGE, 'assets')
  const wallpapers = ensureMatrixWallpapers(assetsDir)

  const shots = []
  const setStored = async (entries) => {
    const script =
      '(() => {' +
      Object.entries(entries)
        .map(([key, value]) => 'localStorage.setItem(' + JSON.stringify(key) + ',' + JSON.stringify(value) + ');')
        .join('') +
      'return true; })()'
    await cdp.eval(script, 10_000)
  }
  const shoot = async (name) => {
    const path = join(dir, name + '.png')
    await cdp.screenshot(path)
    shots.push({ name, path: relative(ROOT, path) })
    console.log('  [SHOT] ' + name)
  }
  const reloadAndSettle = async (scheme) => {
    await cdp.reload()
    const applied = await cdp.waitFor('document.body !== null && document.body.hasAttribute(' + JSON.stringify(SKIN_ATTR) + ')', 20_000)
    if (!applied.ok) throw new Error('skin did not apply for the matrix')
    const flipped = await cdp.waitFor(
      'document.body.hasAttribute(' + JSON.stringify('data-ds-dark-theme') + ') === ' + (scheme === 'dark' ? 'true' : 'false'),
      8_000,
    )
    if (!flipped.ok) {
      // A fixed stored mode whose scheme disagrees with DSH's own preference becomes
      // "follow" at boot (by design). A real user click would switch it, so the matrix
      // performs the same write through the public controller and settles again.
      await cdp.eval('(() => { try { globalThis.tianlightAppearance.apply({ mode: ' + JSON.stringify(scheme) + ', transition: "off" }); return true; } catch (error) { return String(error); } })()')
      const again = await cdp.waitFor(
        'document.body.hasAttribute(' + JSON.stringify('data-ds-dark-theme') + ') === ' + (scheme === 'dark' ? 'true' : 'false'),
        8_000,
      )
      if (!again.ok) {
        const diag = await cdp.eval('(() => { try { return __dshTianlightInstance.diag().appearance; } catch (error) { return String(error); } })()')
        throw new Error('scheme did not become ' + scheme + ' in this runtime; diag=' + JSON.stringify(diag))
      }
    }
    // The wallpaper scene needs a decoded frame; the veil/fog transition is 900 ms.
    await sleep(1_400)
    await dismissProductModals()
    // A late-mounting notice can appear after the first pass; give it one more beat.
    await sleep(600)
    await dismissProductModals()
    await sleep(300)
  }

  // Splash off so every shot is the real interface (the film would cover it).
  await cdp.seed('off')
  // Fixed 1280x900 viewport (window-size alone leaves the browser chrome out).
  try {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
  } catch (error) {
    console.log('  [NOTE] no viewport override: ' + (error instanceof Error ? error.message : String(error)))
  }
  /** Close the first-run / preview modals so the session surface is visible. */
  const dismissProductModals = async () => {
    const clickDismiss = () =>
      cdp.eval(
        '(() => {' +
          'const wanted = ["\u7ee7\u7eed", "Continue", "\u5173\u95ed", "Close", "\u2715", "\u00d7"];' +
          'const candidates = [...document.querySelectorAll("button, [role=button]")];' +
          'for (const button of candidates) {' +
          'const text = String(button.textContent ?? "").trim();' +
          'const label = String(button.getAttribute("aria-label") ?? "").trim();' +
          'if (wanted.includes(text) || /^(close|\u5173\u95ed)/i.test(label)) { button.click(); return true; }' +
          '}' +
          'return false; })()',
        5_000,
      )
    // The preview notice can mount a beat after the skin; retry a few times.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const clicked = await clickDismiss()
      if (clicked !== true) break
      await sleep(250)
    }
  }
  for (const [scheme, mode] of [
    ['light', 'light'],
    ['dark', 'dark'],
  ]) {
    for (const entry of MATRIX_WALLPAPERS) {
      await setStored({
        'tianlight.splash.style': 'off',
        'tianlight.wallpaper': JSON.stringify({ kind: 'image', url: wallpapers[entry.luma] }),
        'tianlight.appearance': JSON.stringify({
          v: 1,
          mode,
          sky: { source: 'auto', lightAt: '06:30', darkAt: '18:30' },
          transition: 'off',
          wallpapers: { light: null, dark: null },
        }),
      })
      await reloadAndSettle(scheme)
      await shoot(scheme + '-' + entry.luma + '-session')
      // Wallpaper panel (Alt+W equivalent): click the edge handle.
      const opened = await cdp.eval('(() => { const handle = document.querySelector("[data-tl-wall-handle]"); if (handle === null) return false; handle.click(); return true; })()')
      if (opened === true) {
        await sleep(700)
        await shoot(scheme + '-' + entry.luma + '-wallpaper-panel')
        await cdp.eval('(() => { const handle = document.querySelector("[data-tl-wall-handle]"); if (handle !== null) handle.click(); return true; })()')
        await sleep(400)
      }
    }
    // Low-power variant on the mid wallpaper: glass flattened, no live blur.
    await setStored({
      'tianlight.wallpaper': JSON.stringify({ kind: 'image', url: wallpapers.mid }),
      'tianlight.lowpower': 'on',
    })
    await reloadAndSettle(scheme)
    await shoot(scheme + '-lowpower-session')
    await setStored({ 'tianlight.lowpower': 'off' })
  }
  // One mid-transition frame of the circular reveal (light -> dark on the mid wallpaper).
  await setStored({
    'tianlight.wallpaper': JSON.stringify({ kind: 'image', url: wallpapers.mid }),
    'tianlight.lowpower': 'off',
    'tianlight.appearance': JSON.stringify({
      v: 1,
      mode: 'light',
      sky: { source: 'auto', lightAt: '06:30', darkAt: '18:30' },
      transition: 'reveal',
      wallpapers: { light: null, dark: null },
    }),
  })
  await reloadAndSettle('light')
  await cdp.eval('globalThis.tianlightAppearance.apply({ mode: "dark" })')
  await sleep(220)
  await shoot('reveal-mid-animation')
  // Acceptance #5: measure one click-to-settled switch (attribute flip + reveal end).
  const switchTiming = await cdp.eval(
    '(async () => {' +
      'const api = globalThis.tianlightAppearance;' +
      'const t0 = performance.now();' +
      'api.apply({ mode: "light", transition: "reveal" });' +
      'const flipMs = performance.now() - t0;' +
      'const settled = await new Promise((done) => {' +
      'const start = performance.now();' +
      'const poll = () => {' +
      'if (!document.body.hasAttribute("data-tl-theme-switching") || performance.now() - start > 1500) return done(performance.now() - t0);' +
      'requestAnimationFrame(poll);' +
      '};' +
      'poll();' +
      '});' +
      'return { flipMs: Math.round(flipMs), settledMs: Math.round(settled), scheme: document.body.hasAttribute("data-ds-dark-theme") ? "dark" : "light" };' +
      '})()',
    5_000,
  )
  console.log('  [SHOT] reveal timing ' + JSON.stringify(switchTiming))
  writeFileSync(join(dir, 'matrix.json'), JSON.stringify({ dshVersion, viewport: '1280x900', shots, switchTiming }, null, 2) + '\n', 'utf8')
  console.log('smoke: matrix ' + shots.length + ' shot(s) -> ' + dir)
}

// ---- run --------------------------------------------------------------------
let dsh = null
let bootstrap = null
let browser = null
let cdp = null
let runPort = null
let exitCode = 0

try {
  console.log('smoke: DSH ' + dshVersion + ' from ' + dirname(dshBin))
  console.log('smoke: browser ' + chrome)
  console.log('smoke: work dir ' + work)

  // 1. bootstrap the throwaway home (creates profiles/<name> with the base bundles).
  //    A second, freshly allocated port is used for the measured run, so a port the
  //    bootstrap process has not released yet can never turn into a false failure.
  bootstrap = await startDsh(bootstrapPort, 'bootstrap')
  await stopDsh(bootstrap, bootstrapPort, 'bootstrap')
  if (!existsSync(join(home, 'profiles'))) throw new Error('dsh web did not create ' + join(home, 'profiles'))

  // 2. pack the skin and install it into that home
  const packLog = join(logs, 'pack.log')
  const pack = spawnSync(process.execPath, [join(HERE, 'pack.mjs'), '--out', distRoot], { cwd: ROOT, stdio: 'ignore', windowsHide: true })
  if (pack.status !== 0) {
    writeFileSync(packLog, 'pack exited with ' + String(pack.status) + '\n')
    throw new Error('node tools/pack.mjs failed (status ' + String(pack.status) + ')')
  }
  const packed = join(distRoot, SKIN_PACKAGE + '-' + JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version)
  if (!existsSync(packed)) throw new Error('pack output missing: ' + packed)
  const installLog = join(logs, 'install.log')
  // --force: the guard only protects a live user profile; this home is throwaway.
  const install = spawnSync(process.execPath, [join(packed, 'bin', 'cli.mjs'), 'install', '--dsh-home', home, '--lang', 'en', '--force'], {
    cwd: work,
    stdio: 'ignore',
    windowsHide: true,
  })
  if (install.status !== 0) throw new Error('installer failed (status ' + String(install.status) + '); see ' + installLog)

  // 3. start the real instance and attach a headless browser
  runPort = await freePort()
  dsh = await startDsh(runPort, 'dsh')
  const chromeProfile = join(work, 'chrome')
  const devtoolsPortFile = join(chromeProfile, 'DevToolsActivePort')
  const chromeLog = join(logs, 'chrome.log')
  browser = spawnLogged(
    chrome,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      '--user-data-dir=' + chromeProfile,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--mute-audio',
      '--hide-scrollbars',
      '--window-size=1280,900',
      '--force-device-scale-factor=1',
      dsh.launch,
    ],
    { cwd: work, logPath: chromeLog, detached: process.platform !== 'win32' },
  )
  const devtoolsPort = await pollFile(
    devtoolsPortFile,
    (text) => {
      const first = text.split(/\r?\n/)[0]?.trim() ?? ''
      return /^\d+$/.test(first) ? Number(first) : null
    },
    30_000,
  )
  if (devtoolsPort === null) throw new Error('Chrome did not expose a DevTools port; see ' + chromeLog)
  cdp = await attach(devtoolsPort, runPort)

  // 4. skin applied at all
  const applied = await cdp.waitFor(`document.body !== null && document.body.hasAttribute(${JSON.stringify(SKIN_ATTR)})`, APPLY_BUDGET_MS)
  if (!assert('skin attribute on <body>', applied.ok, applied.ok ? applied.elapsedMs + ' ms' : 'last=' + JSON.stringify(applied.last))) throw new Error('the skin did not apply')
  const rootVisible = await cdp.eval('(() => { const el = document.querySelector("#root"); if (el === null) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; })()')
  if (!assert('#root rendered', rootVisible === true)) throw new Error('#root is not rendered')

  // 5. splash off -> composer within budget
  await cdp.seed('off')
  const reloadStarted = Date.now()
  await cdp.reload()
  const composer = await cdp.waitFor(
    `(() => { const el = document.querySelector(${JSON.stringify(COMPOSER_SELECTOR)}); if (el === null) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; })()`,
    COMPOSER_BUDGET_MS + 2_000,
  )
  const composerElapsed = Date.now() - reloadStarted
  if (!assert(`composer visible with splash off (<= ${COMPOSER_BUDGET_MS / 1000} s)`, composer.ok && composerElapsed <= COMPOSER_BUDGET_MS, composerElapsed + ' ms')) {
    throw new Error('composer did not appear with splash off')
  }

  // 5b. v2.2.4: a fresh profile (no `tianlight.glassDepth` key) must render the SHIPPED
  // default, `off`. The defect this pins: the fragment fallback said `soft` while the
  // default appearance JSON said `off`, so a first install and a cleared key disagreed.
  // `off` must also mean no live sampling (effective off), which is the energy promise.
  const glassDefault = await cdp.waitFor('document.body.getAttribute("data-tl-glass-depth") === "off"', 5_000)
  const glassState = await cdp.eval(
    '(() => ({ depth: document.body.getAttribute("data-tl-glass-depth"), effective: document.body.getAttribute("data-tl-glass-effective"), live: document.body.getAttribute("data-tl-glass-live") }))()',
  )
  if (!assert('glass defaults to off on a fresh profile', glassDefault.ok && glassState?.effective === 'off', JSON.stringify(glassState))) {
    throw new Error('glass did not default to the shipped off level')
  }

  // 5c. v2.3.0 appearance: the modes drive DSH's own preference, and follow stops writing.
  const appearanceApi = await cdp.eval(
    '(() => { const api = globalThis.tianlightAppearance; return api === undefined || api === null ? null : { service: api.service() === true, state: api.state() }; })()',
  )
  if (!assert('appearance controller exposed', appearanceApi !== null, JSON.stringify(appearanceApi))) {
    throw new Error('the appearance controller is not exposed')
  }
  if (appearanceApi.service === true) {
    await cdp.eval('globalThis.tianlightAppearance.apply({ mode: "light" })')
    const lightFlip = await cdp.waitFor('document.body.hasAttribute("data-ds-dark-theme") === false', 1500)
    assert('appearance light mode clears body[data-ds-dark-theme]', lightFlip.ok)
    await cdp.eval('globalThis.tianlightAppearance.apply({ mode: "dark" })')
    const darkFlip = await cdp.waitFor('document.body.hasAttribute("data-ds-dark-theme") === true', 1500)
    assert('appearance dark mode sets body[data-ds-dark-theme]', darkFlip.ok)
    const callsBefore = await cdp.eval('__dshTianlightInstance.diag().appearance.setThemeCalls')
    await cdp.eval('globalThis.tianlightAppearance.apply({ mode: "follow" })')
    await sleep(500)
    const callsAfter = await cdp.eval('__dshTianlightInstance.diag().appearance.setThemeCalls')
    assert(
      'appearance follow mode stops writing the DSH preference',
      Number(callsAfter) === Number(callsBefore),
      String(callsBefore) + ' -> ' + String(callsAfter),
    )
    const flipErrors = pluginErrors(cdp)
    assert('appearance switches log no plugin error', flipErrors.length === 0, flipErrors.length === 0 ? '' : flipErrors[0])
  } else {
    console.log('  [NOTE] this runtime exposes no theme service; appearance flips skipped')
    const diag = await cdp.eval('(() => { try { return __dshTianlightInstance.diag().appearance; } catch (error) { return String(error); } })()')
    console.log('  [NOTE] appearance diag: ' + JSON.stringify(diag))
  }

  // 6. splash long -> film starts, ends within budget, page usable
  await cdp.seed('long')
  const filmStarted = Date.now()
  await cdp.reload()
  const splashAppeared = await cdp.waitFor('document.querySelector("[data-tl-splash]") !== null', FILM_START_BUDGET_MS)
  if (!assert('long film starts', splashAppeared.ok, splashAppeared.ok ? splashAppeared.elapsedMs + ' ms' : 'last=' + JSON.stringify(splashAppeared.last))) {
    throw new Error('the long film never started with splash long')
  }
  const splashGone = await cdp.waitFor('document.querySelector("[data-tl-splash]") === null', FILM_BUDGET_MS)
  const filmElapsed = Date.now() - filmStarted
  if (!assert(`long film ends (<= ${FILM_BUDGET_MS / 1000} s)`, splashGone.ok && filmElapsed <= FILM_BUDGET_MS, filmElapsed + ' ms')) {
    throw new Error('the long film did not finish in time')
  }
  const rootAfterFilm = await cdp.waitFor('(() => { const el = document.querySelector("#root"); if (el === null) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; })()', 5_000)
  if (!assert('#root visible after the film', rootAfterFilm.ok)) throw new Error('#root is not visible after the film')

  // 7. no console error from this plugin (checked last so the whole session counts)
  const errors = pluginErrors(cdp)
  assert('no console error from this plugin', errors.length === 0, errors.length === 0 ? String(cdp.consoleCount) + ' console call(s) total' : errors.length + ' error(s)')
  if (errors.length > 0) throw new Error('this plugin logged errors')

  // 8. optional v2.3.0 appearance screenshot matrix (same lab instance).
  if (matrixDir !== null) await captureMatrix(cdp, resolve(matrixDir))

  // Optional pixel evidence: `--shot <file>` writes the final page for a visual review
  // (a CSS change can pass every assertion and still look wrong).
  const shotPath = option('--shot', null)
  if (shotPath !== null) {
    await cdp.screenshot(shotPath)
    console.log('smoke: screenshot ' + shotPath)
  }
} catch (error) {
  exitCode = 1
  console.error('smoke: FAILED: ' + (error instanceof Error ? error.message : String(error)))
  if (cdp !== null) {
    const dir = saveEvidence(cdp, 'failure')
    try {
      await cdp.screenshot(join(dir, 'page.png'))
    } catch {
      // a broken page cannot always be captured; console.json is the primary evidence
    }
    console.error('smoke: evidence in ' + dir)
  }
} finally {
  cdp?.close()
  killTree(browser)
  killTree(dsh?.child ?? null)
  killTree(bootstrap?.child ?? null)
  if (keep) {
    console.log('smoke: kept ' + work)
  } else {
    try {
      rmSync(work, { recursive: true, force: true })
    } catch (error) {
      console.error('smoke: could not remove ' + work + ' (' + (error instanceof Error ? error.message : String(error)) + ')')
    }
  }
}

if (exitCode === 0) {
  console.log('smoke: PASS')
} else {
  console.log('smoke: FAIL')
}
process.exit(exitCode)
