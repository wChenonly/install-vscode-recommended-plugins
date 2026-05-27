import { exec } from 'node:child_process'
import { promises as fsPromises } from 'node:fs'
import { join } from 'node:path'
import { logger } from 'rslog'

const P = '[install-vscode-recommended-plugin]: '

const EDITOR_COMMANDS = [
  'code',

  // Cursor
  'cursor',

  // Trae
  'trae',
  'trae-cn',

  // Qoder
  'qoder',
  'qoder-cn'
]

const getPluginsFromJson = async () => {
  try {
    const filePath = join(process.cwd(), '.vscode', 'extensions.json')

    const data = await fsPromises.readFile(filePath, 'utf-8')

    const json = JSON.parse(data) as {
      recommendations?: string[]
    }

    return json.recommendations || []
  } catch (error) {
    logger.error(`${P} Error reading extensions.json:`, error)

    return []
  }
}

const installWithCommand = (command: string, plugin: string) => {
  return new Promise<void>((resolve, reject) => {
    exec(`${command} --install-extension ${plugin}`, (error, _stdout, stderr) => {
      if (error) {
        reject(stderr || error.message)
        return
      }

      resolve()
    })
  })
}

const installPlugin = async (plugin: string) => {
  for (const command of EDITOR_COMMANDS) {
    try {
      await installWithCommand(command, plugin)

      logger.success(`${P} Installed ${plugin} via ${command}`)

      return true
    } catch {}
  }

  return false
}

const installPlugins = async () => {
  const plugins = await getPluginsFromJson()

  if (plugins.length === 0) {
    return
  }

  const failedPlugins: string[] = []
  let successfulInstalls = 0
  let hasMissingEditorCli = false

  for (const plugin of plugins) {
    const installed = await installPlugin(plugin)

    if (installed) {
      successfulInstalls++
    } else {
      hasMissingEditorCli = true
      failedPlugins.push(plugin)
    }
  }

  if (successfulInstalls > 0) {
    logger.greet(`${P} Installed a total of ${successfulInstalls} plug-ins.`)
  }

  if (hasMissingEditorCli) {
    logger.error(`
${P} No supported editor CLI found.

Tried commands:
${EDITOR_COMMANDS.map(cmd => `- ${cmd}`).join('\n')}

Please open your editor and:

1. Press Ctrl + Shift + P
2. Search:
   Shell Command: Install '<editor>' command in PATH

If your editor is not supported yet, please create an issue:
https://github.com/wChenonly/install-vscode-recommended-plugins
`)
  }

  if (failedPlugins.length > 0) {
    logger.warn(`${P} Failed plugins: ${failedPlugins.join(', ')}`)
  }
}

installPlugins()
