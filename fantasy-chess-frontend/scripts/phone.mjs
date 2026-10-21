import net from 'node:net'
import { build, preview } from 'vite'

const port = 5173

const reloadScript = `(function () {
  var last = ''
  function tick() {
    fetch('/phone-build-id.txt', { cache: 'no-store' })
      .then(function (res) { return res.ok ? res.text() : '' })
      .then(function (next) {
        next = (next || '').trim()
        if (!next) return
        if (last && next !== last) setTimeout(function () { location.reload() }, 400)
        last = next
      })
      .catch(function () {})
  }
  setInterval(tick, 1500)
})()
`

function portIsFree(targetPort) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen(targetPort, '0.0.0.0')
  })
}

if (!(await portIsFree(port))) {
  console.error(
    `Port ${port} is already in use. Stop the other server (npm run dev) and run npm run phone again.`,
  )
  process.exit(1)
}

let previewServer = null
let starting = null

async function ensurePreview() {
  if (previewServer) return
  if (starting) return starting
  starting = preview({
    preview: {
      host: true,
      port,
      strictPort: true,
    },
  }).then((server) => {
    previewServer = server
    server.printUrls()
    console.log('Phone bundle is ready. The page reloads itself after each save.')
  })
  return starting
}

const watcher = await build({
  clearScreen: false,
  build: {
    watch: {},
  },
  plugins: [
    {
      name: 'phone-reload',
      apply: 'build',
      transformIndexHtml() {
        return [
          {
            tag: 'script',
            injectTo: 'body',
            children: reloadScript,
          },
        ]
      },
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'phone-build-id.txt',
          source: String(Date.now()),
        })
      },
    },
  ],
})

watcher.on('event', (event) => {
  if (event.code === 'BUNDLE_END') event.result?.close()
  if (event.code === 'ERROR') console.error(event.error)
  if (event.code === 'END') {
    ensurePreview().catch((error) => {
      console.error(error)
      process.exit(1)
    })
  }
})
