// Tiny, generated media fixtures for tools/test.mjs.
//
// R7: the test suite must not depend on the repository's (large, optionally
// absent) `assets/` media. Anything that genuinely needs media gets a throwaway
// directory with a few bytes in it instead, so a clean clone/CI run behaves the
// same as a developer machine with the shipped 4K videos.
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** A 1x1 PNG (valid signature; enough for sniffing/name logic). */
export const TINY_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c626001000000ffff03000006000557bfabd40000000049454e44ae426082',
  'hex',
)
/** Minimal MP4-ish box header: `ftyp` + 8 bytes. Not decodable; only path/name tests use it. */
export const TINY_MP4 = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x18]),
  Buffer.from('ftypisom', 'ascii'),
  Buffer.from([0x00, 0x00, 0x02, 0x00]),
  Buffer.from('isomiso2', 'ascii'),
])
/** Small BMP-ish junk that is still a "safe name" media file. */
export const TINY_GIF = Buffer.from('GIF89a\x01\x00\x01\x00\x00\x00\x00;', 'binary')

/**
 * Create a throwaway media tree:
 *   <dir>/assets/x.mp4        <dir>/assets/still.png
 *   <dir>/uploads/x.mp4       <dir>/uploads/clip.gif
 *   <dir>/derived/old.h264.mp4
 * Returns absolute dirs plus `cleanup()`.
 */
export function makeMediaFixture(prefix = 'tl-media-fixture-') {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  const assetsDir = join(dir, 'assets')
  const uploadsDir = join(dir, 'uploads')
  const derivedDir = join(dir, 'derived')
  mkdirSync(assetsDir, { recursive: true })
  mkdirSync(uploadsDir, { recursive: true })
  mkdirSync(derivedDir, { recursive: true })
  writeFileSync(join(assetsDir, 'x.mp4'), TINY_MP4)
  writeFileSync(join(assetsDir, 'still.png'), TINY_PNG)
  writeFileSync(join(uploadsDir, 'x.mp4'), TINY_MP4)
  writeFileSync(join(uploadsDir, 'clip.gif'), TINY_GIF)
  writeFileSync(join(derivedDir, 'old.h264.mp4'), TINY_MP4)
  return {
    dir,
    assetsDir,
    uploadsDir,
    derivedDir,
    cleanup: () => {
      try {
        rmSync(dir, { recursive: true, force: true })
      } catch {
        // best effort: a locked fixture file must not fail the suite
      }
    },
  }
}
