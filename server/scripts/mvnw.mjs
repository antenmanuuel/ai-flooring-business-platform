// Lets the npm scripts in package.json run the Maven wrapper on macOS, Linux or Windows:
//   node scripts/mvnw.mjs <maven arguments>
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const serverDir = fileURLToPath(new URL('..', import.meta.url))
const isWindows = process.platform === 'win32'

const child = spawn(isWindows ? 'mvnw.cmd' : './mvnw', process.argv.slice(2), {
  cwd: serverDir,
  stdio: 'inherit',
  shell: isWindows, // .cmd files need a shell on Windows
})

// Pass Ctrl+C on to Maven so the server shuts down too.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}

child.on('error', (err) => {
  console.error(`Could not start the Maven wrapper: ${err.message}`)
  process.exit(1)
})
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)))
