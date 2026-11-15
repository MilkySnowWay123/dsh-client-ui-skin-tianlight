// Host route: Wallpaper Engine scene project files. Extracted from lib/index.js in
// v2.1.8.
import { basename } from 'node:path'
import { sendText, servePath } from '../http-media.js'
import { resolveSceneDir, sceneFilePath } from '../scene-project.js'
import { readRoots } from './wallpaper.js'

export const exact = {}

export const prefix = [
  [
    '_scene-project/',
    (ctx, req, res, rest) => {
      // Scene project files. Each path segment is validated again; only media/asset
      // extensions are served, and CORS is open because the adapter is opaque-origin.
      const parts = rest.split('/')
      const index = Number(parts[1])
      const dirName = parts[2]
      const projectDir = resolveSceneDir(readRoots(), index, dirName)
      const filePath = projectDir === null ? null : sceneFilePath(projectDir, parts.slice(3))
      if (filePath === null) {
        sendText(res, 404, 'not found')
        return
      }
      servePath(req, res, filePath, basename(filePath), {
        'access-control-allow-origin': '*',
        'cross-origin-resource-policy': 'cross-origin',
      })
    },
  ],
]
