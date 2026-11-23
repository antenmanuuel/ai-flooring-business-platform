// Starts the server (server/, port 5050), the website (client/, port 5173) and the AI assistant
// (ai/, port 8000) together:
//   npm run dev   (from the repo root)
// Each output line is prefixed with [server], [client] or [ai]. Ctrl+C stops all of them, and if one
// exits (e.g. port 5050 is already in use) the others are stopped too.
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const isWindows = process.platform === 'win32'

// Each app runs `npm run dev` in its folder unless it gives its own command.
const apps = [
  { name: 'server', color: '\x1b[33m' }, // yellow
  { name: 'client', color: '\x1b[36m' }, // cyan
  { name: 'ai', color: '\x1b[35m', command: ['uv', 'run', 'uvicorn', 'app.main:app', '--port', '8000', '--reload'] }, // magenta
]

let stopping = false
const children = apps.map(({ name, color, command = ['npm', 'run', 'dev'] }) => {
  const child = spawn(command[0], command.slice(1), {
    cwd: `${root}${name}`,
    shell: isWindows, // npm is npm.cmd on Windows, which needs a shell
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' },
  })

  const prefix = `${color}[${name}]\x1b[0m `
  for (const stream of [child.stdout, child.stderr]) {
    let partial = ''
    stream.on('data', (chunk) => {
      const lines = (partial + chunk).split(/\r?\n/)
      partial = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('npm notice')) process.stdout.write(prefix + line + '\n')
      }
    })
  }

  child.on('error', (err) => {
    console.error(`${prefix}Could not start: ${err.message}`)
    stopAll(1)
  })
  child.on('exit', (code) => {
    if (!stopping) {
      console.error(`${prefix}exited with code ${code ?? 1}; stopping the others.`)
      stopAll(code || 1)
    }
  })
  return child
})

function stopAll(exitCode) {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (child.exitCode === null) child.kill('SIGINT')
  }
  // Give Maven and Vite a moment to shut down cleanly.
  setTimeout(() => process.exit(exitCode), 1500)
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => stopAll(0))
}
