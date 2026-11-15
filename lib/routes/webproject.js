// Host route: Wallpaper Engine web projects (`_web-project/`). Extracted from
// lib/index.js in v2.1.8.
import { handleWebProject } from '../web-project.js'
import { readRoots } from './wallpaper.js'

export const exact = {}

export const prefix = [
  [
    '_web-project/',
    (ctx, req, res, rest) => {
      // Wallpaper Engine web projects (A3): an opaque-origin page plus its assets.
      // Segment validation happens inside the module again; discovery is not a gate.
      handleWebProject(req, res, rest, readRoots())
    },
  ],
]
