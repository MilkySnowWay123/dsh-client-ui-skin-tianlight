		//#region splash
		/**
		 * 长片开机动画 B（19s 电影片头）。
		 *
		 * This is the approved v3.2 film, moved into a single fragment:
		 *  - WebGL2 sky / stars / aurora / dawn / beams / glass wordmark;
		 *  - Canvas 2D glyph mask + instanced overlay, DOM title copy;
		 *  - no screenshot, no image, no network request, no audio file;
		 *  - landing glass panes measure the real DSH panels at 13.8s;
		 *  - performance starts at 0.75x, drops to 0.5x, then falls back to a
		 *    1.7s simple mark; the caller owns style/daily/session decisions.
		 */
		const SPLASH_FILM_CSS = "#film {\n  --ink: #EAF2FF;\n  --cyan: #7FE2FF;\n  --gold: #FFD696;\n  --sans: \"Segoe UI Variable Text\", \"Segoe UI\", \"Microsoft YaHei UI\", \"Microsoft YaHei\", \"PingFang SC\", system-ui, sans-serif;\n  --serif: \"Source Han Serif SC Heavy\", \"Noto Serif SC\", \"STZhongsong\", \"SimSun\", serif;\n  position: fixed; inset: 0; overflow: hidden; background: #000;\n  color: var(--ink);\n  font-family: var(--sans);\n  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;\n  text-rendering: geometricPrecision;\n  user-select: none; -webkit-user-select: none;\n}\n#film * { box-sizing: border-box; }\n#film button { font: inherit; }\n#film .controls { display: none !important; }\n#film .debug-label { display: none !important; }\n#film .title-copy { transform-origin: 0 0; }\n#film { position: fixed; inset: 0; overflow: hidden; background: #000; }\n#film .canvas { position: absolute; inset: 0; z-index: 10; width: 100%; height: 100%; display: block; opacity: 0; transition: opacity 300ms linear; }\n#film .canvas.on { opacity: 1; }\n#film .subtitle { position: absolute; left: 8.5%; bottom: 30%; z-index: 22;\n  font-family: var(--serif); font-weight: 400; font-size: 22px; line-height: 1.4;\n  letter-spacing: .12em; color: rgba(255,255,255,.72);\n  text-shadow: 0 1px 22px rgba(0,0,0,.45); opacity: 0;\n  will-change: opacity; pointer-events: none; }\n#film .letterbox { position: absolute; inset: 0; z-index: 40; pointer-events: none; }\n#film .letterbox .bar { position: absolute; left: 0; right: 0; height: 0; background: #000; will-change: transform; }\n#film .letterbox .bar.top { top: 0; }\n#film .letterbox .bar.bottom { bottom: 0; }\n#film .letterbox .bar::after { content: \"\"; position: absolute; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent); }\n#film .letterbox .bar.top::after { bottom: 0; }\n#film .letterbox .bar.bottom::after { top: 0; }\n#film .controls { position: absolute; right: 26px; bottom: 24px; z-index: 60;\n  display: flex; align-items: center; gap: 8px; padding: 7px;\n  border-radius: 999px; border: 1px solid rgba(255,255,255,.13);\n  background: rgba(5,8,15,.38);\n  -webkit-backdrop-filter: blur(14px) saturate(1.15); backdrop-filter: blur(14px) saturate(1.15);\n  box-shadow: 0 10px 35px rgba(0,0,0,.2); opacity: .45; transition: opacity 220ms ease; }\n#film .controls:hover, #film .controls:focus-within { opacity: 1; }\n#film .controls .controls button:hover, #film .controls button:focus-visible { background: rgba(255,255,255,.1); color: #fff; outline: none; }\n#film .skip-hint { position: absolute; right: 30px; bottom: 74px; z-index: 59;\n  font-size: 11px; letter-spacing: .10em; color: rgba(255,255,255,.62);\n  text-shadow: 0 1px 10px rgba(0,0,0,.3); opacity: 0; pointer-events: none; will-change: opacity; }\n#film .skip-veil { position: absolute; inset: 0; z-index: 45; background: #03050B; opacity: 0; pointer-events: none; }\n#film .debug-label { position: absolute; left: 26px; top: 22px; z-index: 61; display: none; padding: 6px 9px; border-radius: 6px; background: rgba(0,0,0,.5); color: rgba(255,255,255,.7); font: 10px/1.4 ui-monospace, monospace; pointer-events: none; }\n#film .debug .debug-label { display: block; }\n#film .simple-veil { position: absolute; inset: 0; z-index: 50; display: none; background: #03050B; pointer-events: none; }\n#film[data-state=\"simple\"] .simple-veil { display: block; }\n#film .simple-mark { position: absolute; left: 50%; top: 50%; z-index: 51; transform: translate(-50%, -50%); font-family: var(--serif); font-size: clamp(64px,7vw,112px); letter-spacing: .20em; padding-left: .20em; color: #fff; opacity: 0; }\n#film .simple-sub { margin-top: 24px; font-family: var(--sans); font-size: 11px; letter-spacing: .45em; text-align: center; color: rgba(255,255,255,.55); }\n#film .title-copy { position: absolute; inset: 0; z-index: 25; pointer-events: none; opacity: 0; will-change: opacity; }\n#film .tc-brand { position: absolute; left: 50%; top: 660px; transform: translateX(-50%);\n  font-family: var(--sans); font-weight: 800; font-size: 40px; line-height: 40px;\n  letter-spacing: 14px; padding-left: 14px; color: #f5fdff; white-space: nowrap; }\n#film .tc-credit { position: absolute; left: 50%; top: 712px; transform: translateX(-50%);\n  font-family: var(--serif); font-weight: 400; font-size: 27px; line-height: 28px;\n  letter-spacing: 3.2px; color: #faf0dc; white-space: nowrap; }\n#film .tc-l0 { position: absolute; left: 50%; top: 18px; transform: translateX(-50%);\n  font-family: \"Cascadia Mono\", Consolas, monospace; font-size: 12px; line-height: 16px;\n  letter-spacing: 1.8px; color: rgba(209,247,255,.82); white-space: nowrap; }\n#film .tc-l1, #film .tc-l2 { position: absolute; top: 492px; transform: translateX(-50%);\n  font-family: \"Cascadia Mono\", Consolas, monospace; font-size: 12px; line-height: 16px;\n  letter-spacing: 1.8px; color: rgba(209,247,255,.82); white-space: nowrap; }\n#film .tc-l1 { left: 376px; }\n#film .tc-l2 { left: 1544px; }";
		const SPLASH_FILM_DOM = "<canvas class=\"canvas\" id=\"glCanvas\" aria-hidden=\"true\"></canvas>\n\n  <div class=\"subtitle\" id=\"sub1\" aria-hidden=\"true\">夜再长，</div>\n  <div class=\"subtitle\" id=\"sub2\" aria-hidden=\"true\">天总会亮。</div>\n\n  <div class=\"letterbox\" id=\"letterbox\" aria-hidden=\"true\">\n    <div class=\"bar top\" id=\"barTop\"></div>\n    <div class=\"bar bottom\" id=\"barBottom\"></div>\n  </div>\n\n  <div class=\"skip-hint\" id=\"skipHint\">点击任意处跳过</div>\n  <div class=\"skip-veil\" id=\"skipVeil\"></div>\n  <div class=\"controls\" aria-label=\"预览控制\">\n    <button type=\"button\" id=\"replayBtn\">重播</button>\n    <button type=\"button\" id=\"soundBtn\">声音：关</button>\n    <button type=\"button\" id=\"skipBtn\">跳过</button>\n  </div>\n  <div class=\"debug-label\" id=\"debugLabel\">t = 0 ms</div>\n\n  <div class=\"simple-veil\" id=\"simpleVeil\"></div>\n  <div class=\"simple-mark\" id=\"simpleMark\">\n    <div>天光</div>\n    <div class=\"simple-sub\">TIANLIGHT</div>\n  </div>\n  <div class=\"title-copy\" id=\"titleCopy\" aria-hidden=\"true\">\n    <div class=\"tc-brand\">TIANLIGHT</div>\n    <div class=\"tc-credit\">给 DeepSeek Harness 的一片天</div>\n    <div class=\"tc-l0\">TIANLIGHT 2.0.4</div>\n    <div class=\"tc-l1\">06:12</div>\n    <div class=\"tc-l2\">E 92°</div>\n  </div>";
		const SPLASH_FILM_SHADERS = {"scene-frag":{"type":"fragment","src":"#version 300 es\nprecision highp float;\nout vec4 fragColor;\n\nuniform vec2 uRes;\nuniform float uTime;\nuniform float uYaw;\nuniform float uPitch;\nuniform float uFov;\nuniform vec3 uSkyTop;\nuniform vec3 uSkyMid;\nuniform vec3 uSkyHor;\nuniform vec3 uSunDir;\nuniform vec3 uSunColor;\nuniform float uDawn;\nuniform float uStarFade;\nuniform float uMilky;\nuniform float uPrologue;\nuniform vec3 uHeroDir;\nuniform vec3 uHeroRight;\nuniform vec3 uHeroUp;\nuniform float uCometA;\nuniform vec2 uCometHead;\nuniform vec2 uCometDir;\nuniform float uCometLen;\nuniform float uMeteorA;\nuniform vec2 uMeteorHead;\nuniform vec2 uMeteorDir;\nuniform float uMeteorLen;\nuniform float uMeteor2A;\nuniform vec2 uMeteor2Head;\nuniform vec2 uMeteor2Dir;\nuniform float uMeteor2Len;\nuniform float uMeteor3A;\nuniform vec2 uMeteor3Head;\nuniform vec2 uMeteor3Dir;\nuniform float uMeteor3Len;\nuniform float uAurora;\nuniform float uAuroraPhase;\nuniform float uStarDebug;\nuniform float uStarBreath;\nuniform float uTitleGlow;\nuniform float uBeam;\nuniform vec2 uGap0;\nuniform vec2 uGap1;\nuniform vec2 uGap2;\nuniform vec2 uGap3;\nuniform vec2 uGap4;\nuniform vec2 uGap5;\nuniform vec2 uGap6;\nuniform vec2 uGap7;\nuniform sampler2D uNoise;\nuniform sampler2D uHorizonTex;\nuniform float uHorizonScale;\nuniform vec3 uRimColor;\nuniform float uRimStrength;\n\n#define PI 3.141592653589793\n#define MW_NORMAL normalize(vec3(0.38, 0.42, -0.82))\nconst vec3 A_CYAN = vec3(0.212, 0.753, 1.0);\nconst vec3 A_BLUE = vec3(0.050, 0.275, 0.745);\nconst vec3 A_VIOLET = vec3(0.144, 0.102, 0.611);\n\nfloat sat(float v) { return clamp(v, 0.0, 1.0); }\n\nfloat hash21(vec2 p) {\n  p = fract(p * vec2(123.34, 456.21));\n  p += dot(p, p + 45.32);\n  return fract(p.x * p.y);\n}\n\nvec3 starLayer(vec3 rd, vec2 lp, vec2 shift, float density, float seed, float size, float power, float flare) {\n  vec2 q = (lp + shift) * density + seed;\n  vec2 id = floor(q);\n  float h = hash21(id + seed * 1.7);\n  float h2 = hash21(id + seed * 2.9 + 8.2);\n  vec2 off = (vec2(h, h2) - 0.5) * 0.62;\n  vec2 starLP = (id + 0.5 + off - seed) / density - shift;\n  float lon = (starLP.x - 0.5) * 2.0 * PI;\n  float lat = (starLP.y - 0.5) * PI;\n  vec3 sd = vec3(cos(lon) * cos(lat), sin(lat), sin(lon) * cos(lat));\n  float mu = dot(rd, sd);\n  vec3 perp = rd - sd * mu;\n  float d = length(perp);\n  float rad = size * (0.30 + 0.70 * h2) * (1.0 + uStarDebug * 8.0);\n  float visible = mix(step(0.55, h2) * step(0.03, h), 1.0, uStarDebug);\n  float tw = 0.90 + 0.10 * sin(uTime * (0.25 + 0.25 * h) + h2 * 6.283 + id.x * 0.27);\n  float core = 1.0 - smoothstep(0.0, rad, d);\n  float halo = exp(-d / (rad * 1.8 + 0.0001)) * 0.10;\n  float spark = 0.0;\n  if (flare > 0.0) {\n    vec3 t1 = normalize(cross(sd, vec3(0.0, 1.0, 0.0)) + vec3(0.0001, 0.0, 0.0));\n    vec3 t2 = cross(sd, t1);\n    float dx = abs(dot(rd - sd, t1));\n    float dy = abs(dot(rd - sd, t2));\n    spark = (exp(-dx * 1200.0) * exp(-dy * 80.0) + exp(-dy * 1200.0) * exp(-dx * 80.0)) * flare;\n  }\n  vec3 tint = mix(vec3(0.70, 0.83, 1.0), vec3(1.0, 0.93, 0.78), smoothstep(0.72, 1.0, h));\n  float variation = 0.12 + 0.88 * pow(h, 2.4);\n  return tint * (core * 1.9 + halo + spark * visible * 0.30) * visible * power * tw * variation;\n}\n\nfloat celestialLon(vec3 rd) { return atan(rd.z, rd.x) / (2.0 * PI) + 0.5; }\nfloat celestialLat(vec3 rd) { return asin(clamp(rd.y, -1.0, 1.0)) / PI + 0.5; }\n\nvec3 heroStar(vec3 rd) {\n  float dx = dot(rd, uHeroRight);\n  float dy = dot(rd, uHeroUp);\n  float d = length(vec2(dx, dy));\n  float core = 1.0 - smoothstep(0.0015, 0.007, d);\n  float halo = exp(-d * 46.0) * 0.22 + exp(-d * 12.0) * 0.045;\n  float fx = exp(-abs(dx) * 95.0) * exp(-abs(dy) * 18.0);\n  float fy = exp(-abs(dy) * 95.0) * exp(-abs(dx) * 18.0);\n  float tw = 0.91 + 0.09 * sin(uTime * 0.55);\n  return vec3(0.90, 0.96, 1.0) * (core * 2.3 + halo + (fx + fy) * 0.20) * tw;\n}\n\nvec3 milkyWay(vec3 rd) {\n  float band = exp(-pow(dot(rd, MW_NORMAL) / 0.21, 2.0));\n  vec2 lp = vec2(celestialLon(rd), celestialLat(rd));\n  float n = texture(uNoise, lp * vec2(3.2, 2.4) + 0.31).r;\n  float n2 = texture(uNoise, lp * vec2(8.0, 6.0) + 2.7).g;\n  float dust = smoothstep(0.45, 0.72, n2);\n  vec3 deep = vec3(0.012, 0.018, 0.052);\n  vec3 blue = vec3(0.060, 0.095, 0.235);\n  vec3 violet = vec3(0.17, 0.13, 0.28);\n  vec3 c = mix(deep, blue, smoothstep(0.26, 0.72, n));\n  c = mix(c, violet, smoothstep(0.45, 0.88, n) * 0.55);\n  c *= band * (0.55 + 0.65 * n) * (1.0 - 0.45 * dust);\n  c += violet * band * 0.045;\n  return c * 1.20;\n}\n\nvec3 comet(vec2 p) {\n  vec2 q = p - uCometHead;\n  vec2 dir = normalize(uCometDir);\n  vec2 perp = vec2(-dir.y, dir.x);\n  float along = dot(q, dir);\n  float side = dot(q, perp);\n  float t = clamp(along / max(0.0001, uCometLen), 0.0, 1.0);\n  float window = smoothstep(-0.006, 0.010, along) * (1.0 - smoothstep(0.94, 1.08, t));\n  float fade = pow(max(0.0, 1.0 - t), 2.1);\n  float curve = 0.032 * t * t;\n  float w1 = 0.0022 + 0.017 * t;\n  float a = exp(-pow((side - 0.008 * t - curve) / w1, 2.0)) * fade;\n  float b = exp(-pow((side + 0.020 * t + curve * 0.35) / (w1 * 1.35), 2.0)) * pow(max(0.0, 1.0 - t), 2.8);\n  float n1 = texture(uNoise, vec2(along * 9.0, side * 5.0 + 0.3)).r;\n  float n2 = texture(uNoise, vec2(along * 3.2, side * 2.2 + 1.7)).g;\n  float fil = 0.62 + 0.62 * smoothstep(0.14, 0.86, n1) * (0.72 + 0.28 * n2);\n  float sparkle = smoothstep(0.90, 1.0, texture(uNoise, vec2(along * 120.0, side * 70.0)).b) * (1.0 - t);\n  vec3 c = A_CYAN * a * 0.88 + vec3(1.0, 0.80, 0.48) * b * 0.95;\n  c *= fil * window;\n  c += vec3(0.92, 0.98, 1.0) * sparkle * window * 0.22;\n  float head = exp(-length(q) * 320.0) * 6.5 + exp(-length(q) * 85.0) * 0.30;\n  c += vec3(0.86, 0.96, 1.0) * head;\n  float hx = exp(-abs(q.x) * 210.0) * exp(-abs(q.y) * 26.0);\n  float hy = exp(-abs(q.y) * 210.0) * exp(-abs(q.x) * 26.0);\n  c += vec3(0.72, 0.92, 1.0) * (hx + hy) * 0.22;\n  return c * uCometA;\n}\n\nvec3 meteorCore(vec2 p, float A, vec2 headPos, vec2 dirIn, float len) {\n  vec2 q = p - headPos;\n  vec2 dir = normalize(dirIn);\n  vec2 perp = vec2(-dir.y, dir.x);\n  float along = dot(q, dir);\n  float side = dot(q, perp);\n  float t = clamp(along / max(0.0001, len), 0.0, 1.0);\n  float window = smoothstep(-0.002, 0.004, along) * (1.0 - smoothstep(0.90, 1.06, t));\n  float trail = exp(-abs(side) / (0.0016 + 0.0034 * t)) * pow(1.0 - t, 2.2) * window;\n  float head = exp(-length(q) * 420.0) * 5.0 + exp(-length(q) * 120.0) * 0.35;\n  return vec3(0.86, 0.96, 1.0) * (trail * 0.75 + head) * A;\n}\nvec3 meteor(vec2 p) { return meteorCore(p, uMeteorA, uMeteorHead, uMeteorDir, uMeteorLen); }\nvec3 meteor2(vec2 p) { return meteorCore(p, uMeteor2A, uMeteor2Head, uMeteor2Dir, uMeteor2Len); }\nvec3 meteor3(vec2 p) { return meteorCore(p, uMeteor3A, uMeteor3Head, uMeteor3Dir, uMeteor3Len); }\n\nfloat angDiff(float a, float b) {\n  float d = abs(a - b);\n  return min(d, 2.0 * PI - d);\n}\n\nvec3 aurora(float az, float el) {\n  vec3 col = vec3(0.0);\n  for (int i = 0; i < 3; i++) {\n    float fi = float(i);\n    float baseCenter = -0.27 + fi * 0.27;\n    float center = baseCenter + 0.055 * sin(el * 3.2 + fi * 2.1 + uAuroraPhase * 0.12)\n                 + 0.025 * sin(az * 2.0 + fi * 1.3 + uAuroraPhase * 0.05);\n    float width = 0.070 + fi * 0.006;\n    float topN = texture(uNoise, vec2(az * 1.25 + fi * 0.31 + uAuroraPhase * 0.010, 0.21 + fi * 0.17)).g;\n    float foldN = texture(uNoise, vec2(az * 1.15 + fi * 0.40 + uAuroraPhase * 0.018, el * 0.32 + fi * 0.20)).r;\n    float top = 0.42 + fi * 0.020 + topN * 0.065;\n    float bot = 0.002 + 0.010 * (0.5 + 0.5 * sin(az * 4.5 + fi * 1.8 - uAuroraPhase * 0.05));\n    float vert = (1.0 - smoothstep(top - 0.11, top, el)) * smoothstep(bot - 0.004, bot + 0.004, el);\n    if (vert <= 0.001) continue;\n    float folds = 0.42 + 0.58 * smoothstep(0.18, 0.82, foldN);\n    float fine = 0.86 + 0.14 * sin(az * 23.0 + foldN * 7.0 + uAuroraPhase * 0.10 + fi * 1.7);\n    float base = exp(-max(el - bot, 0.0) / 0.040);\n    float glow = pow(max(0.0, 1.0 - el / max(top, 0.05)), 1.55);\n    float core = exp(-pow((az - center) / width, 2.0));\n    float halo = exp(-pow((az - center) / (width * 2.35), 2.0)) * 0.20;\n    float center2 = center + 0.022 * sin(el * 7.0 + fi * 1.9 + uAuroraPhase * 0.27);\n    float slice = exp(-pow((az - center2) / (width * 1.55), 2.0)) * 0.42;\n    float curtain = (core + halo + slice) * vert * glow * folds * fine;\n    curtain = max(curtain, core * vert * glow * 0.78);\n    vec3 c = mix(A_CYAN, A_BLUE, smoothstep(0.0, top * 0.45, el));\n    c = mix(c, A_VIOLET, smoothstep(top * 0.45, top * 1.05, el));\n    c = mix(c, mix(A_CYAN, vec3(0.82, 0.98, 1.0), 0.40), base * 0.62);\n    float middleBoost = (i == 1) ? 2.30 : 1.0;\n    col += c * curtain * (0.98 - fi * 0.045) * middleBoost;\n    col += mix(A_CYAN, vec3(0.82, 0.98, 1.0), 0.35) * (core + halo * 0.4) * base * 0.10;\n    if (i == 1) {\n      float travel = exp(-pow((az - (-0.44 + 0.88 * fract(uAuroraPhase * 0.075))) / 0.024, 2.0));\n      col += A_CYAN * travel * (core + halo) * vert * 0.36;\n    }\n  }\n  col += mix(A_CYAN, A_BLUE, 0.40) * exp(-el / 0.050) * 0.026;\n  return col * 1.05;\n}\n\nvoid main() {\n  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;\n  float tanF = tan(radians(uFov) * 0.5);\n  vec3 f = vec3(sin(uYaw) * cos(uPitch), sin(uPitch), cos(uYaw) * cos(uPitch));\n  vec3 r = vec3(cos(uYaw), 0.0, -sin(uYaw));\n  vec3 up = normalize(vec3(\n    f.y * r.z - f.z * r.y,\n    f.z * r.x - f.x * r.z,\n    f.x * r.y - f.y * r.x\n  ));\n  vec3 rd = normalize(f + r * (p.x * 2.0 * tanF) + up * (p.y * 2.0 * tanF));\n\n  float el = rd.y;\n  float az = atan(rd.x, rd.z);\n  float hNorm = texture(uHorizonTex, vec2(fract(az / (2.0 * PI) + 0.5), 0.5)).r;\n  float h = hNorm * uHorizonScale;\n  float sunAz = atan(uSunDir.x, uSunDir.z);\n  float dAz = angDiff(az, sunAz);\n  float dawn = clamp(uDawn, 0.0, 1.0);\n\n  vec3 sky = mix(uSkyHor, uSkyMid, smoothstep(-0.025, 0.20, el));\n  sky = mix(sky, uSkyTop, smoothstep(0.10, 0.66, el));\n\n  // The bright band behind the cloud line: strongest where the sun is hiding.\n  float goldBand = exp(-pow((el - h - 0.0040) / 0.013, 2.0)) * (0.35 + 1.25 * exp(-pow(dAz / 0.45, 2.0)));\n  sky += uSunColor * goldBand * dawn * 0.86;\n  sky += vec3(1.0, 0.34, 0.055) * goldBand * dawn * 0.22;\n  sky += vec3(0.75, 0.24, 0.32) * exp(-pow((el - h - 0.055) / 0.085, 2.0)) * dawn * 0.13 * (0.45 + 0.8 * exp(-pow(dAz / 0.6, 2.0)));\n  float broadGlow = exp(-max(el - h, 0.0) / 0.11) * (0.35 + 0.75 * exp(-pow(dAz / 0.60, 2.0)));\n  sky += uSunColor * broadGlow * dawn * 0.030;\n  float night = 1.0 - clamp(dawn, 0.0, 1.0);\n  sky += vec3(0.005, 0.011, 0.024) * exp(-max(el, 0.0) / 0.32) * night;\n  sky += vec3(0.0012, 0.0028, 0.0075) * night;\n\n  float mu = max(dot(rd, uSunDir), 0.0);\n  float above = smoothstep(-0.020, 0.012, uSunDir.y);\n  float ang = acos(clamp(mu, -1.0, 1.0));\n  sky += uSunColor * (exp(-ang * 220.0) * 0.55 + exp(-ang * 55.0) * 0.14\n                    + exp(-ang * 12.0) * 0.07) * above * dawn;\n  sky += uSunColor * exp(-ang * 2.6) * 0.090 * above * dawn;\n  sky += uSunColor * exp(-ang * 0.80) * 0.022 * above * dawn;\n  float disk = 1.0 - smoothstep(0.0145, 0.0180, ang);\n  float limb = 0.72 + 0.28 * (1.0 - smoothstep(0.0, 0.0180, ang));\n  float diskAmp = mix(6.0, 0.55, uTitleGlow);\n  float ringAmp = mix(1.4, 0.10, uTitleGlow);\n  sky += mix(uSunColor, vec3(1.0, 0.95, 0.82), 0.55) * disk * limb * diskAmp * above * dawn;\n  sky += uSunColor * exp(-abs(ang - 0.0140) * 320.0) * ringAmp * above * dawn;\n  sky += uSunColor * exp(-ang * 24.0) * 0.30 * uTitleGlow * above * dawn;\n\n  if (uStarFade > 0.001) {\n    vec2 lp = vec2(celestialLon(rd), celestialLat(rd));\n    vec3 stars = vec3(0.0);\n    stars += starLayer(rd, lp, vec2(0.07, -0.02), 330.0, 2.0, 0.0013, 0.55, 0.0);\n    stars += starLayer(rd, lp, vec2(-0.03, 0.04), 130.0, 5.3, 0.00085, 0.78, 0.0);\n    stars += starLayer(rd, lp, vec2(0.02, 0.01), 24.0, 9.1, 0.00055, 1.15, 0.28);\n    stars += starLayer(rd, lp, vec2(-0.11, 0.06), 430.0, 13.7, 0.00028, 0.30, 0.0);\n    sky += stars * uStarFade;\n  }\n  sky += milkyWay(rd) * uMilky;\n  if (uCometA > 0.001) sky += comet(p);\n  if (uMeteorA > 0.001) sky += meteor(p);\n  if (uMeteor2A > 0.001) sky += meteor2(p);\n  if (uMeteor3A > 0.001) sky += meteor3(p);\n\n  if (uAurora > 0.001) {\n    sky += aurora(az, el) * uAurora;\n  }\n\n  // a fan of shafts: every wedge starts at a low point of the cloud line and\n  // radiates away from the sun, widening as it climbs.\n  if (uBeam > 0.001 && el > h) {\n    vec2 gaps[8] = vec2[8](uGap0, uGap1, uGap2, uGap3, uGap4, uGap5, uGap6, uGap7);\n    float here = el - h;\n    float beams = 0.0;\n    for (int i = 0; i < 8; i++) {\n      if (gaps[i].y <= 0.001) continue;\n      float wN = fract(sin(float(i) * 17.13) * 43758.5);\n      float ga = gaps[i].x;\n      float gs = gaps[i].y;\n      float center = ga + (ga - sunAz) * here * 0.82;\n      float wobble = 0.009 * sin(here * 12.0 + float(i) * 1.7 + uTime * 0.15);\n      float spread = 0.006 + 0.100 * here + 0.008 * wN;\n      float d = angDiff(az, center + wobble);\n      float body = exp(-pow(d / spread, 2.0)) * exp(-here / 0.32) * gs;\n      float wide = exp(-pow(d / (spread * 2.6), 2.0)) * exp(-here / 0.38) * gs;\n      float core = exp(-pow(d / (spread * 0.24), 2.0)) * exp(-here / 0.42) * gs;\n      float baseGlow = exp(-here / 0.070) * gs;\n      float grain = texture(uNoise, vec2(az * 6.0 + ga * 4.0, here * 4.0 - uTime * 0.08)).r;\n      float grain2 = texture(uNoise, vec2(az * 17.0 + ga * 7.0, here * 9.0 + uTime * 0.03)).g;\n      body *= 0.58 + 0.52 * grain;\n      float soft = 0.72 + 0.28 * grain2;\n      float nearSun = exp(-abs(ga - sunAz) / 0.60);\n      beams += (body * 0.80 + wide * 0.26 + core * 1.30 + baseGlow * 0.12) * soft * (0.45 + 0.80 * nearSun);\n    }\n    beams += exp(-here / 0.050) * 0.08;\n    vec3 beamCol = mix(uSunColor, vec3(1.0, 0.62, 0.24), 0.46);\n    sky += beamCol * beams * uBeam * 0.17;\n  }\n\n  // distant cloud-sea silhouette: a single rolling line, no near cloud detail\n  float edge = 1.0 - smoothstep(-0.0012, 0.0012, el - h);\n  vec3 silTop = mix(vec3(0.010, 0.013, 0.032), vec3(0.045, 0.034, 0.082), dawn);\n  vec3 silBot = mix(vec3(0.002, 0.003, 0.008), vec3(0.016, 0.013, 0.038), dawn);\n  vec3 sil = mix(silBot, silTop, smoothstep(-0.07, h, el));\n  sil += vec3(0.010, 0.012, 0.030) * (0.55 + 0.45 * texture(uNoise, vec2(az * 0.63 + 0.2, 0.18)).r);\n  sky = mix(sky, sil, edge);\n\n  float rimD = el - h;\n  float rim = exp(-max(rimD, 0.0) * 620.0) * smoothstep(-0.0018, 0.0018, rimD);\n  float rimWide = exp(-max(rimD, 0.0) * 130.0) * smoothstep(-0.0022, 0.0022, rimD);\n  sky += uRimColor * (rim * 1.25 + rimWide * 0.42) * uRimStrength * (1.0 - edge);\n  sky += uSunColor * exp(-max(rimD, 0.0) / 0.050) * 0.048 * dawn * (1.0 - edge);\n\n  // Prologue: black at t=0, one star breathing, then the sky starts to exist.\n  float skyGate = smoothstep(1.30, 2.55, uTime);\n  sky *= skyGate;\n  sky += heroStar(rd) * uPrologue;\n  sky *= 1.0 + 0.045 * sin(uTime * 2.1) * uStarBreath;\n\n  fragColor = vec4(max(sky, vec3(0.0)), edge);\n}"},"god-frag":{"type":"fragment","src":"#version 300 es\nprecision highp float;\nout vec4 fragColor;\nuniform sampler2D uScene;\nuniform vec2 uRes;\nuniform vec2 uSunUV;\nuniform vec3 uSunColor;\nuniform float uStrength;\nvoid main() {\n  vec2 uv = gl_FragCoord.xy / uRes;\n  vec2 delta = (uv - uSunUV) / 48.0;\n  vec2 p = uSunUV;\n  float blockedLen = 0.0;\n  bool escaped = false;\n  for (int i = 0; i < 48; i++) {\n    p += delta;\n    float occ = texture(uScene, clamp(p, vec2(0.001), vec2(0.999))).a;\n    if (!escaped) {\n      if (occ > 0.5) blockedLen += 1.0;\n      else escaped = true;\n    } else if (occ > 0.5) {\n      blockedLen += 1.0;\n    }\n  }\n  float lit = exp(-blockedLen * 0.42);\n  float dist = length(uv - uSunUV);\n  float falloff = exp(-dist * 1.9) * smoothstep(0.0, 0.035, dist + 0.001);\n  vec3 c = uSunColor * lit * falloff * uStrength;\n  fragColor = vec4(c, 1.0);\n}"},"bright-frag":{"type":"fragment","src":"#version 300 es\nprecision highp float;\nout vec4 fragColor;\nuniform sampler2D uScene;\nuniform vec2 uRes;\nuniform float uThreshold;\nvoid main() {\n  vec2 uv = gl_FragCoord.xy / uRes;\n  vec3 c = texture(uScene, uv).rgb;\n  float l = max(c.r, max(c.g, c.b));\n  float b = smoothstep(uThreshold, uThreshold + 0.9, l);\n  fragColor = vec4(c * b, 1.0);\n}"},"blur-frag":{"type":"fragment","src":"#version 300 es\nprecision highp float;\nout vec4 fragColor;\nuniform sampler2D uTex;\nuniform vec2 uRes;\nuniform vec2 uDir;\nvoid main() {\n  vec2 uv = gl_FragCoord.xy / uRes;\n  float w0 = 0.227027, w1 = 0.1945946, w2 = 0.1216216, w3 = 0.054054, w4 = 0.016216;\n  vec2 o = uDir / uRes;\n  vec3 c = texture(uTex, uv).rgb * w0;\n  c += texture(uTex, uv + o * 1.0).rgb * w1;\n  c += texture(uTex, uv - o * 1.0).rgb * w1;\n  c += texture(uTex, uv + o * 2.0).rgb * w2;\n  c += texture(uTex, uv - o * 2.0).rgb * w2;\n  c += texture(uTex, uv + o * 3.0).rgb * w3;\n  c += texture(uTex, uv - o * 3.0).rgb * w3;\n  c += texture(uTex, uv + o * 4.0).rgb * w4;\n  c += texture(uTex, uv - o * 4.0).rgb * w4;\n  fragColor = vec4(c, 1.0);\n}"},"composite-frag":{"type":"fragment","src":"#version 300 es\nprecision highp float;\nout vec4 fragColor;\nuniform sampler2D uScene;\nuniform sampler2D uBloom;\nuniform sampler2D uRays;\nuniform sampler2D uUi;\nuniform vec2 uRes;\nuniform float uTime;\nuniform vec2 uSunUV;\nuniform vec3 uSunColor;\nuniform float uFlare;\nuniform float uRayStrength;\nuniform float uBloomStrength;\nuniform float uExposure;\nuniform float uDark;\nuniform float uUiMix;\nuniform float uRaw;\nuniform vec4 uUiRect;\n\nfloat hash21(vec2 p) {\n  p = fract(p * vec2(123.34, 456.21));\n  p += dot(p, p + 45.32);\n  return fract(p.x * p.y);\n}\nvec3 aces(vec3 x) {\n  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);\n}\nvec3 toSRGB(vec3 x) {\n  return mix(x * 12.92, 1.055 * pow(max(x, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, x));\n}\n\nvoid main() {\n  vec2 uv = gl_FragCoord.xy / uRes;\n  if (uRaw > 0.5) { fragColor = vec4(texture(uScene, uv).rgb, 1.0); return; }\n  vec2 d = uv - 0.5;\n\n  float ca = 0.0011 * (0.18 + dot(d, d) * 1.8);\n  vec3 color;\n  color.r = texture(uScene, uv + d * ca).r;\n  color.g = texture(uScene, uv).g;\n  color.b = texture(uScene, uv - d * ca).b;\n\n  if (uRayStrength > 0.001) {\n    vec3 rays = texture(uRays, uv).rgb;\n    color += rays * (1.0 - texture(uScene, uv).a);\n  }\n\n  color += texture(uBloom, uv).rgb * uBloomStrength * 1.35;\n\n  if (uFlare > 0.001) {\n    vec2 sp = uv - uSunUV;\n    float ax = abs(sp.x), ay = abs(sp.y);\n    float edgeFade = 1.0 - smoothstep(0.38, 0.52, ax);\n    float hEnv = exp(-pow(ax / 0.30, 2.0)) * edgeFade;\n    float core = exp(-ay * 210.0) * 1.10 + exp(-ay * 72.0) * 0.34;\n    float glow = exp(-ay * 24.0) * 0.10 + exp(-ay * 10.0) * 0.035;\n    float line = (core + glow) * hEnv;\n    vec3 warm = vec3(1.0, 0.84, 0.56);\n    vec3 cool = vec3(0.34, 0.86, 1.0);\n    vec3 flareCol = mix(warm, cool, smoothstep(0.015, 0.28, ax));\n    color += flareCol * line * uFlare * 0.62;\n    vec2 axis = vec2(0.5) - uSunUV;\n    color += vec3(0.22, 0.62, 0.94) * exp(-length(uv - (uSunUV + axis * 0.34)) * 64.0) * 0.060 * uFlare;\n    color += vec3(0.86, 0.68, 0.46) * exp(-length(uv - (uSunUV + axis * 0.66)) * 48.0) * 0.045 * uFlare;\n    color += vec3(0.42, 0.64, 0.86) * exp(-length(uv - (uSunUV + axis * 1.02)) * 38.0) * 0.038 * uFlare;\n  }\n\n  // soft radial dimming behind the wordmark; the glyphs themselves stay opaque\n  float dx = (uv.x - 0.500) / 0.345;\n  float dy = (uv.y - 0.537) / 0.225;\n  float dk = exp(-(dx * dx + dy * dy) * 1.55);\n  color *= 1.0 - 0.35 * uDark * dk;\n\n  color = max(color, vec3(0.0)) * uExposure;\n  color = aces(color);\n  float gradeLuma = dot(color, vec3(0.2126, 0.7152, 0.0722));\n  color = mix(vec3(gradeLuma), color, 1.15);\n  color = clamp(color, 0.0, 1.0);\n  color = mix(color, color * color * (3.0 - 2.0 * color), 0.11);\n  color = mix(vec3(dot(color, vec3(0.2126, 0.7152, 0.0722))), color, 1.04);\n\n  float vig = 1.0 - smoothstep(0.32, 1.18, length(d * vec2(1.02, 1.10)));\n  color *= mix(0.70, 1.0, vig);\n  color = toSRGB(color);\n\n  float postLuma = dot(color, vec3(0.2126, 0.7152, 0.0722));\n  color *= mix(vec3(0.965, 0.985, 1.020), vec3(1.035, 1.000, 0.965), smoothstep(0.30, 0.86, postLuma));\n  float grain = hash21(gl_FragCoord.xy * 0.86 + vec2(uTime * 173.1, uTime * 91.7)) - 0.5;\n  color += grain * (0.012 + 0.008 * smoothstep(0.2, 0.9, dot(color, vec3(0.333))));\n\n  if (uUiMix > 0.0001) {\n    vec2 uiUV = (uv - uUiRect.xy) / uUiRect.zw;\n    vec3 ui = texture(uUi, clamp(uiUV, vec2(0.0), vec2(1.0))).rgb;\n    color = mix(color, ui, smoothstep(0.0, 1.0, uUiMix));\n  }\n\n  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);\n}"},"overlay-vert":{"type":"vertex","src":"#version 300 es\nprecision highp float;\nlayout(location = 0) in vec2 aCorner;\nlayout(location = 1) in vec2 aCenter;\nlayout(location = 2) in vec2 aSize;\nlayout(location = 3) in float aRot;\nlayout(location = 4) in vec4 aUV;\nlayout(location = 5) in vec4 aColor;\nlayout(location = 6) in float aMode;\nlayout(location = 7) in float aAlpha;\nlayout(location = 8) in vec4 aParams;\n\nuniform vec2 uDesign;\nout vec2 vCorner;\nout vec2 vUV;\nout vec2 vSize;\nout vec4 vColor;\nout float vMode;\nout float vAlpha;\nout vec4 vParams;\n\nvoid main() {\n  vec2 local = (aCorner - 0.5) * aSize;\n  float c = cos(aRot);\n  float s = sin(aRot);\n  vec2 rot = vec2(local.x * c - local.y * s, local.x * s + local.y * c);\n  vec2 screen = aCenter + rot;\n  vec2 ndc = vec2(screen.x / uDesign.x * 2.0 - 1.0, 1.0 - screen.y / uDesign.y * 2.0);\n  gl_Position = vec4(ndc, 0.0, 1.0);\n  vCorner = aCorner;\n  vUV = mix(aUV.xy, aUV.zw, aCorner);\n  vSize = aSize;\n  vColor = aColor;\n  vMode = aMode;\n  vAlpha = aAlpha;\n  vParams = aParams;\n}"},"overlay-frag":{"type":"fragment","src":"#version 300 es\nprecision highp float;\nin vec2 vCorner;\nin vec2 vUV;\nin vec2 vSize;\nin vec4 vColor;\nin float vMode;\nin float vAlpha;\nin vec4 vParams;\nout vec4 fragColor;\n\nuniform sampler2D uMask;\nuniform sampler2D uAtlas;\nuniform sampler2D uScene;\nuniform vec2 uRes;\nuniform float uTime;\nuniform float uSheen;\nuniform float uLanding;\nuniform float uTitleBody;\n\nfloat sdRoundBox(vec2 p, vec2 b, float r) {\n  vec2 q = abs(p) - b + r;\n  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;\n}\nfloat hash21(vec2 p) {\n  p = fract(p * vec2(123.34, 456.21));\n  p += dot(p, p + 45.32);\n  return fract(p.x * p.y);\n}\n\nvoid main() {\n  vec2 uv = gl_FragCoord.xy / uRes;\n  if (vMode < 0.5) {\n    // glass wordmark tile (and, in the landing, a growing glass pane)\n    vec2 p = (vCorner - 0.5) * vSize;\n    float radius = vParams.x;\n    float sd = sdRoundBox(p, vSize * 0.5 - 1.0, radius);\n    float shape = 1.0 - smoothstep(-0.85, 0.85, sd);\n    if (shape <= 0.001) discard;\n\n    vec3 scene = texture(uScene, uv).rgb;\n    vec3 refl = pow(1.0 - exp(-max(scene, vec3(0.0)) * 1.15), vec3(0.4545));\n    float mask = 0.0;\n    if (vParams.z > 0.001) mask = texture(uMask, clamp(vUV, vec2(0.0), vec2(1.0))).r * vParams.z;\n\n    float gx = texture(uMask, clamp(vUV + vec2(1.5 / 1920.0, 0.0), vec2(0.0), vec2(1.0))).r\n             - texture(uMask, clamp(vUV - vec2(1.5 / 1920.0, 0.0), vec2(0.0), vec2(1.0))).r;\n    float gy = texture(uMask, clamp(vUV + vec2(0.0, 1.5 / 1080.0), vec2(0.0), vec2(1.0))).r\n             - texture(uMask, clamp(vUV - vec2(0.0, 1.5 / 1080.0), vec2(0.0), vec2(1.0))).r;\n    float edgeMask = smoothstep(0.035, 0.20, length(vec2(gx, gy)));\n\n    float edgePx = 1.0 - smoothstep(0.0, 2.0, abs(sd));\n    float sheen = exp(-pow((uv.x * 0.82 + (1.0 - uv.y) * 0.36 - uSheen) / 0.055, 2.0));\n\n    float border = 1.0 - smoothstep(0.15, 0.65, vParams.z);\n    vec3 blur = (texture(uScene, clamp(uv + vec2(2.0 / 1920.0, 0.0), vec2(0.0), vec2(1.0))).rgb\n               + texture(uScene, clamp(uv - vec2(2.0 / 1920.0, 0.0), vec2(0.0), vec2(1.0))).rgb\n               + texture(uScene, clamp(uv + vec2(0.0, 2.0 / 1080.0), vec2(0.0), vec2(1.0))).rgb\n               + texture(uScene, clamp(uv - vec2(0.0, 2.0 / 1080.0), vec2(0.0), vec2(1.0))).rgb) * 0.25;\n    vec3 skyTint = mix(vec3(0.30, 0.18, 0.50), vec3(1.0, 0.70, 0.36), 1.0 - uv.y);\n    vec3 glass = mix(skyTint, mix(refl, blur, 0.45), 0.38);\n    float edgeGrad = 0.55 + 0.45 * (1.0 - smoothstep(0.55, 0.95, uv.y));\n    glass += vec3(0.82, 0.96, 1.0) * edgePx * border * edgeGrad * (0.58 + vParams.w * 2.2);\n    glass += vec3(0.95, 0.99, 1.0) * sheen * 0.28;\n    glass *= vColor.rgb;\n\n    vec3 titleCol = mix(vec3(1.0, 0.99, 0.97), vec3(1.0, 0.80, 0.50), 1.0 - smoothstep(0.46, 0.62, uv.y));\n    titleCol = mix(titleCol, refl * vec3(0.92, 0.98, 1.0), 0.42);\n    titleCol += vec3(1.0) * edgeMask * mask * 0.48;\n    titleCol += vec3(1.0) * sheen * mask * 0.45;\n    float mr = texture(uMask, clamp(vUV + vec2(1.2 / 1920.0, 0.0), vec2(0.0), vec2(1.0))).r;\n    float mb = texture(uMask, clamp(vUV - vec2(1.2 / 1920.0, 0.0), vec2(0.0), vec2(1.0))).r;\n    titleCol.r += max(0.0, mr - mask) * 0.35;\n    titleCol.b += max(0.0, mb - mask) * 0.28;\n\n    vec3 col = mix(glass, titleCol, mask);\n    float glassA = vColor.a * shape * border * (0.22 + edgePx * edgeGrad * 0.24 + vParams.w * 0.30) * vAlpha;\n    float glyphA = mask * shape * vAlpha;\n    float alpha = max(glassA, glyphA);\n    if (alpha <= 0.001) discard;\n    fragColor = vec4(clamp(col, 0.0, 1.0), clamp(alpha, 0.0, 1.0));\n  } else if (vMode < 1.5) {\n    // ring segment: a thin instanced quad, 1.5 px wide\n    vec2 e = min(vCorner, 1.0 - vCorner) * vSize;\n    float edge = smoothstep(0.0, 0.9, min(e.x, e.y));\n    float a = vColor.a * vAlpha * edge;\n    if (a <= 0.001) discard;\n    fragColor = vec4(vColor.rgb, a);\n  } else if (vMode < 2.5) {\n    // tick\n    vec2 e = min(vCorner, 1.0 - vCorner) * vSize;\n    float edge = smoothstep(0.0, 0.8, min(e.x, e.y));\n    float a = vColor.a * vAlpha * edge;\n    if (a <= 0.001) discard;\n    fragColor = vec4(vColor.rgb, a);\n  } else if (vMode < 3.5) {\n    // atlas text line\n    vec4 t = texture(uAtlas, clamp(vUV, vec2(0.0), vec2(1.0)));\n    float a = t.a * vColor.a * vAlpha;\n    if (a <= 0.001) discard;\n    fragColor = vec4(vColor.rgb, a);\n  } else if (vMode < 4.5) {\n    // panel outline during the match cut\n    vec2 p = (vCorner - 0.5) * vSize;\n    vec2 b = vSize * 0.5 - 1.0;\n    vec2 q = abs(p) - b;\n    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);\n    float line = 1.0 - smoothstep(0.0, 1.4, abs(d));\n    float a = line * vColor.a * vAlpha;\n    if (a <= 0.001) discard;\n    fragColor = vec4(vColor.rgb, a);\n  } else if (vMode < 5.5) {\n    // soft round mote / landing spark\n    vec2 p = (vCorner - 0.5) * vSize;\n    float r = length(p) / max(0.5, vSize.x * 0.5);\n    float a = exp(-r * r * 5.0) * vColor.a * vAlpha;\n    if (a <= 0.001) discard;\n    fragColor = vec4(vColor.rgb, a);\n  } else {\n    // full-screen opaque wordmark body, drawn after the tiles to seal seams\n    vec2 muv = vec2(uv.x, 1.0 - uv.y);\n    float m0 = texture(uMask, muv).r;\n    float m1 = texture(uMask, muv + vec2(1.5 / 1920.0, 0.0)).r;\n    float m2 = texture(uMask, muv - vec2(1.5 / 1920.0, 0.0)).r;\n    float m3 = texture(uMask, muv + vec2(0.0, 1.5 / 1080.0)).r;\n    float m4 = texture(uMask, muv - vec2(0.0, 1.5 / 1080.0)).r;\n    float mask = max(max(max(m0, m1), max(m2, m3)), m4);\n    if (mask <= 0.004) discard;\n    float gx = m1 - m2;\n    float gy = m3 - m4;\n    float edgeMask = smoothstep(0.035, 0.20, length(vec2(gx, gy)));\n    float sheen = exp(-pow((uv.x * 0.82 + (1.0 - uv.y) * 0.36 - uSheen) / 0.055, 2.0));\n    vec3 titleCol = mix(vec3(1.0, 0.99, 0.97), vec3(1.0, 0.80, 0.50), 1.0 - smoothstep(0.46, 0.62, uv.y));\n    titleCol += vec3(1.0) * edgeMask * 0.14;\n    titleCol += vec3(1.0) * sheen * 0.20;\n    fragColor = vec4(clamp(titleCol * vColor.rgb, 0.0, 1.0), mask * vAlpha);\n  }\n}"}};

			function createSplashFilmRuntime(options) {
			  'use strict'
			  const opts = options || {}
			  const onDone = typeof opts.onDone === 'function' ? opts.onDone : null
			  const onFallback = typeof opts.onFallback === 'function' ? opts.onFallback : null
			  const soundEnabled = opts.sound === true

			  const DURATION = 18500
			  const W = 1920
			  const H = 1080
			  const clean = false
			  const debug = false
			  const bench = false
			  const hide = new Set()
			  const fixedTime = null
			  const captureMode = false
			  const forceScale = 0.75

			  const film = document.getElementById('film')
			  const canvas = document.getElementById('glCanvas')
			  const sub1 = document.getElementById('sub1')
			  const sub2 = document.getElementById('sub2')
			  const titleCopy = document.getElementById('titleCopy')
			  const letterbox = document.getElementById('letterbox')
			  const barTop = document.getElementById('barTop')
			  const barBottom = document.getElementById('barBottom')
			  const skipHint = document.getElementById('skipHint')
			  const skipVeil = document.getElementById('skipVeil')
			  const replayBtn = document.getElementById('replayBtn')
			  const skipBtn = document.getElementById('skipBtn')
			  const soundBtn = document.getElementById('soundBtn')
			  let soundOn = false
			  let audioCtx = null
			  let soundMaster = null
			  const simpleVeil = document.getElementById('simpleVeil')
			  const simpleMark = document.getElementById('simpleMark')
			  const debugLabel = document.getElementById('debugLabel')

			  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
			  const smooth = (a, b, x) => {
			    const t = clamp01((x - a) / (b - a || 1))
			    return t * t * (3 - 2 * t)
			  }
			  const mix = (a, b, t) => a + (b - a) * t
			  const pulse = (t, a, b, c) => smooth(a, b, t) * (1 - smooth(b, c, t))
			  const rad = (d) => (d * Math.PI) / 180
			  const setOpacity = (node, v) => {
			    const n = clamp01(v)
			    if (node.__op !== n) { node.__op = n; node.style.opacity = String(n) }
			  }

			  let seed = 0x9e3779b9
			  function rand() {
			    seed ^= seed << 13
			    seed ^= seed >>> 17
			    seed ^= seed << 5
			    return (seed >>> 0) / 4294967296
			  }

			  function hex(value) {
			    const n = parseInt(value.slice(1), 16)
			    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
			  }
			  function srgbToLinear(c) {
			    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
			  }
			  function hexLin(value) { return hex(value).map(srgbToLinear) }
			  function colorAt(t, stops) {
			    if (t <= stops[0][0]) return hexLin(stops[0][1])
			    if (t >= stops[stops.length - 1][0]) return hexLin(stops[stops.length - 1][1])
			    for (let i = 0; i < stops.length - 1; i += 1) {
			      const a = stops[i], b = stops[i + 1]
			      if (t >= a[0] && t <= b[0]) {
			        const p = smooth(a[0], b[0], t)
			        const ca = hexLin(a[1]), cb = hexLin(b[1])
			        return [mix(ca[0], cb[0], p), mix(ca[1], cb[1], p), mix(ca[2], cb[2], p)]
			      }
			    }
			    return hexLin(stops[stops.length - 1][1])
			  }

			  // One camera, one continuous world.
			  const CAM = {
			    x: [[0, 0], [6, 0], [10, 20], [14, 40], [18.5, 55]],
			    y: [[0, 2900], [6, 2820], [10, 2760], [14, 2700], [18.5, 2660]],
			    z: [[0, 0], [6, 60], [10, 120], [14, 180], [18.5, 230]],
			    yaw: [[0, -5], [1.5, -5], [3, -4], [6, -2], [8, 0], [10, 0], [12, 17], [14, 40], [16.5, 42], [18.5, 43]],
			    pitch: [[0, 30], [1.5, 29.5], [3, 28], [4.5, 26], [6, 21], [8, 17.5], [10, 15.0], [12, 14.2], [14, 13.5], [16.5, 13.0], [18.5, 12.8]],
			    fov: [[0, 52], [3, 50], [6, 48], [9, 48], [12, 47], [14, 47], [16.5, 48], [18.5, 48]],
			    day: [[0, 0], [6, 0], [8, 0.04], [9.2, 0.08], [10, 0.14], [11, 0.21], [12, 0.30], [13, 0.40], [14, 0.38], [15.2, 0.38], [16.5, 0.42], [18.5, 0.46]],
			  }
			  const SUN_EL = [[0, -5], [8, -4.5], [10, -3], [11, -1.6], [11.8, -0.4], [12.2, 0.35], [12.8, 1.3], [13.4, 6.2], [14, 7.6], [15.2, 8.8], [16.5, 9.2], [18.5, 9.5]]

			  function catmull(keys, t) {
			    if (t <= keys[0][0]) return keys[0][1]
			    if (t >= keys[keys.length - 1][0]) return keys[keys.length - 1][1]
			    let i = 0
			    while (i < keys.length - 2 && t > keys[i + 1][0]) i += 1
			    const p0 = keys[Math.max(0, i - 1)][1], p1 = keys[i][1], p2 = keys[i + 1][1], p3 = keys[Math.min(keys.length - 1, i + 2)][1]
			    const t0 = keys[i][0], t1 = keys[i + 1][0]
			    const u = (t - t0) / Math.max(1e-6, t1 - t0)
			    const u2 = u * u, u3 = u2 * u
			    return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3)
			  }

			  function cameraAt(t) {
			    const s = t / 1000
			    const drift = smooth(13.6, 15.0, s) * (1 - smooth(16.4, 18.2, s))
			    const starDrift = smooth(1.5, 2.0, s) * (1 - smooth(5.70, 6.05, s))
			    const yawDeg = catmull(CAM.yaw, s) + drift * 0.55 * Math.sin((s - 13.6) * 0.9)
			      + starDrift * 3.0 * Math.sin((s - 1.5) * 0.85) + starDrift * 0.55 * Math.sin((s - 1.5) * 1.9)
			    const pitchDeg = catmull(CAM.pitch, s) + drift * 0.22 * Math.sin((s - 13.6) * 0.7 + 1.1)
			      + starDrift * 1.7 * Math.sin((s - 1.5) * 0.63 + 0.6)
			      - 1.5 * smooth(6.0, 6.8, s) * (1 - smooth(7.9, 8.9, s))
			    const yaw = rad(yawDeg)
			    const pitch = rad(pitchDeg)
			    const fov = catmull(CAM.fov, s) + drift * 0.35 * Math.sin((s - 13.6) * 0.55)
			      + starDrift * 1.0 * Math.sin((s - 1.5) * 0.5 + 1.2)
			    const forward = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)]
			    const right = [Math.cos(yaw), 0, -Math.sin(yaw)]
			    const up = [
			      forward[1] * right[2] - forward[2] * right[1],
			      forward[2] * right[0] - forward[0] * right[2],
			      forward[0] * right[1] - forward[1] * right[0],
			    ]
			    return {
			      x: catmull(CAM.x, s), y: catmull(CAM.y, s), z: catmull(CAM.z, s),
			      yaw, pitch, yawDeg, pitchDeg, fov, forward, right, up,
			      dayPhase: catmull(CAM.day, s),
			    }
			  }

			  const SKY_STOPS = [
			    [0, '#05080F', '#070F1E', '#0B1A3A'],
			    [0.08, '#05080F', '#081226', '#0B1A3A'],
			    [0.16, '#06101F', '#0D1A38', '#252E66'],
			    [0.30, '#0B1530', '#3A2F66', '#D96A78'],
			    [0.42, '#15244E', '#6A4A80', '#FF9E6A'],
			    [0.52, '#24427E', '#A06E88', '#FFC080'],
			    [0.62, '#1E467F', '#6E8FB8', '#FFE0B0'],
			    [0.72, '#3F8FE0', '#8FD4FA', '#FFFFFF'],
			  ]
			  const SKY_TOP = SKY_STOPS.map((x) => [x[0], x[1]])
			  const SKY_MID = SKY_STOPS.map((x) => [x[0], x[2]])
			  const SKY_HOR = SKY_STOPS.map((x) => [x[0], x[3]])

			  const CHAPTERS = [
			    { key: 'prologue', name: '序 · 静', start: 0, end: 1500 },
			    { key: 'stars', name: '一 · 星海', start: 1500, end: 6000 },
			    { key: 'aurora', name: '二 · 极光', start: 6000, end: 10000 },
			    { key: 'dawn', name: '三 · 破晓', start: 10000, end: 14000 },
			    { key: 'title', name: '四 · 字标', start: 14000, end: 16500 },
			    { key: 'landing', name: '终 · 落定', start: 16500, end: 18500 },
			  ]
			  function chapterAt(t) {
			    for (let i = 0; i < CHAPTERS.length; i += 1) if (t >= CHAPTERS[i].start && t < CHAPTERS[i].end) return i
			    return CHAPTERS.length - 1
			  }

			  const HERO = cameraAt(0)
			  const HERO_DIR = HERO.forward
			  const HERO_RIGHT = HERO.right
			  const HERO_UP = HERO.up

			  // A distant, rolling cloud-sea line. Periodic so the texture has no seam.
			  const HORIZON_N = 1024
			  const HORIZON = new Float32Array(HORIZON_N)
			  const HORIZON_SCALE = 0.05
			  for (let i = 0; i < HORIZON_N; i += 1) {
			    const az = (i / HORIZON_N - 0.5) * Math.PI * 2
			    let h = 0.0100
			      + 0.0058 * Math.sin(az * 3.2 + 0.4)
			      + 0.0054 * Math.sin(az * 6.7 + 2.1)
			      + 0.0043 * Math.sin(az * 11.3 + 4.3)
			      + 0.0029 * Math.sin(az * 18.1 + 1.2)
			      + 0.0018 * Math.sin(az * 29.0 + 3.7)
			    h -= 0.0050 * Math.exp(-Math.pow((az - 0.66) / 0.12, 2))
			    h += 0.0030 * Math.exp(-Math.pow((az + 0.45) / 0.18, 2))
			    HORIZON[i] = Math.max(0.002, Math.min(0.036, h))
			  }
			  function horizonHeightAt(az) {
			    let u = az / (Math.PI * 2) + 0.5
			    u -= Math.floor(u)
			    const x = u * HORIZON_N
			    const i0 = Math.floor(x) % HORIZON_N
			    const i1 = (i0 + 1) % HORIZON_N
			    return mix(HORIZON[i0], HORIZON[i1], x - Math.floor(x))
			  }

			  function angDiff(a, b) {
			    const d = Math.abs(a - b) % (Math.PI * 2)
			    return Math.min(d, Math.PI * 2 - d)
			  }

			  const BEAM_GAPS = []
			  ;(() => {
			    const smoothH = new Float32Array(HORIZON_N)
			    const win = 42
			    for (let i = 0; i < HORIZON_N; i += 1) {
			      let sum = 0
			      for (let j = -win; j <= win; j += 1) sum += HORIZON[(i + j + HORIZON_N) % HORIZON_N]
			      smoothH[i] = sum / (win * 2 + 1)
			    }
			    const sunAz = Math.PI * 38 / 180
			    const cands = []
			    for (let i = 0; i < HORIZON_N; i += 1) {
			      const h = HORIZON[i]
			      const prev = HORIZON[(i - 1 + HORIZON_N) % HORIZON_N]
			      const next = HORIZON[(i + 1) % HORIZON_N]
			      if (!(h <= prev && h <= next)) continue
			      const depth = smoothH[i] - h
			      if (depth < 0.0007) continue
			      const az = (i / HORIZON_N - 0.5) * Math.PI * 2
			      const prox = Math.exp(-Math.pow(angDiff(az, sunAz) / 0.95, 2))
			      cands.push({ az, str: Math.min(1, depth * 380) * prox })
			    }
			    cands.sort((a, b) => b.str - a.str)
			    const picked = []
			    for (const c of cands) {
			      if (picked.length >= 8) break
			      if (picked.some((p) => angDiff(p.az, c.az) < 0.10)) continue
			      picked.push(c)
			    }
			    for (const c of cands) {
			      if (picked.length >= 8) break
			      if (!picked.includes(c)) picked.push(c)
			    }
			    // eight true silhouette gaps inside the camera's dawn view, not the
			    // globally strongest gaps (many of those sit outside the shot).
			    BEAM_GAPS.length = 0
			    const offsets = [-0.34, -0.24, -0.14, -0.05, 0.06, 0.15, 0.25, 0.34]
			    for (let i = 0; i < offsets.length; i += 1) {
			      const az = sunAz + offsets[i]
			      const h = horizonHeightAt(az)
			      const gapiness = Math.max(0, Math.min(1, (0.012 - h) * 42))
			      const str = 0.30 + 0.34 * gapiness + (i % 3) * 0.02
			      BEAM_GAPS.push({ az, str })
			    }
			  })()

			  // ---- text assets ---------------------------------------------------------
			  const FONT = '420px "Source Han Serif SC Heavy", "Noto Serif SC", "STZhongsong", "SimSun", serif'
			  let textMask = null
			  let maskCanvas = null
			  let titleBox = null

			  function buildTitleMask() {
			    const c = document.createElement('canvas')
			    c.width = W
			    c.height = H
			    const ctx = c.getContext('2d')
			    ctx.fillStyle = '#000'
			    ctx.fillRect(0, 0, W, H)
			    ctx.fillStyle = '#fff'
			    ctx.textAlign = 'center'
			    ctx.textBaseline = 'middle'
			    const chars = ['天', '光']
			    let fontPx = 320
			    let draw = null
			    for (let attempt = 0; attempt < 5; attempt += 1) {
			      ctx.clearRect(0, 0, W, H)
			      ctx.fillStyle = '#000'
			      ctx.fillRect(0, 0, W, H)
			      ctx.font = `${fontPx}px "Source Han Serif SC Heavy", "Noto Serif SC", "STZhongsong", "SimSun", serif`
			      ctx.fillStyle = '#fff'
			      const gap = Math.round(fontPx * 0.14)
			      const widths = chars.map((ch) => ctx.measureText(ch).width)
			      const total = widths[0] + widths[1] + gap
			      let x = W / 2 - total / 2
			      const draws = []
			      for (let i = 0; i < chars.length; i += 1) {
			        const cx = x + widths[i] / 2
			        draws.push([chars[i], cx])
			        x += widths[i] + gap
			      }
			      const cy = 500
			      for (const [ch, cx] of draws) ctx.fillText(ch, cx, cy)
			      const img = ctx.getImageData(0, 0, W, H).data
			      let minX = W, maxX = 0, minY = H, maxY = 0
			      for (let y = 0; y < H; y += 2) for (let px = 0; px < W; px += 2) {
			        if (img[(y * W + px) * 4] > 40) {
			          if (px < minX) minX = px
			          if (px > maxX) maxX = px
			          if (y < minY) minY = y
			          if (y > maxY) maxY = y
			        }
			      }
			      draw = { fontPx, draws, cy, minX, maxX, minY, maxY, total }
			      const bh = maxY - minY
			      if (bh >= 210) break
			      fontPx += 14
			    }
			    maskCanvas = c
			    textMask = c
			    titleBox = {
			      x0: draw.minX, x1: draw.maxX, y0: draw.minY, y1: draw.maxY,
			      w: draw.maxX - draw.minX, h: draw.maxY - draw.minY,
			      cx: (draw.minX + draw.maxX) / 2, cy: (draw.minY + draw.maxY) / 2, fontPx: draw.fontPx,
			    }
			  }

			  function measureSpaced(ctx, text, spacing) {
			    let w = 0
			    for (const ch of text) w += ctx.measureText(ch).width + spacing
			    return w - spacing
			  }
			  function drawSpaced(ctx, text, x, y, spacing) {
			    let cx = x
			    for (const ch of text) {
			      ctx.fillText(ch, cx, y)
			      cx += ctx.measureText(ch).width + spacing
			    }
			  }
			  let atlas = null
			  function buildAtlas() {
			    const c = document.createElement('canvas')
			    c.width = 1024
			    c.height = 512
			    const ctx = c.getContext('2d')
			    ctx.clearRect(0, 0, 1024, 512)
			    ctx.fillStyle = '#fff'
			    ctx.textAlign = 'left'
			    ctx.textBaseline = 'middle'
			    const entries = {}
			    const add = (key, text, font, spacing, x, baseY) => {
			      ctx.font = font
			      const w = Math.ceil(measureSpaced(ctx, text, spacing)) + 4
			      drawSpaced(ctx, text, x, baseY, spacing)
			      const size = parseInt(font.match(/(\d+)px/)[1], 10)
			      entries[key] = { x: x - 2, y: baseY - size * 1.2, w: w + 4, h: Math.ceil(size * 1.9) }
			    }
			    add('brand', 'TIANLIGHT', '800 40px "Segoe UI", "Microsoft YaHei UI", sans-serif', 14, 26, 72)
			    add('credit', '给 DeepSeek Harness 的一片天', '400 27px "Source Han Serif SC Heavy", "Noto Serif SC", "SimSun", serif', 3.2, 26, 152)
			    add('l0', 'TIANLIGHT 2.0.4', '400 12px "Cascadia Mono", Consolas, monospace', 1.8, 26, 220)
			    add('l1', '06:12', '400 12px "Cascadia Mono", Consolas, monospace', 1.8, 26, 252)
			    add('l2', 'E 92°', '400 12px "Cascadia Mono", Consolas, monospace', 1.8, 26, 284)
			    atlas = { canvas: c, entries }
			  }

			  // ---- world state ---------------------------------------------------------
			  const SHARED = {}
			  function stateAt(t) {
			    const s = t / 1000
			    const cam = cameraAt(t)
			    const day = cam.dayPhase
			    const top = colorAt(day, SKY_TOP)
			    const mid = colorAt(day, SKY_MID)
			    const hor = colorAt(day, SKY_HOR)
			    const titleLift = smooth(14.0, 14.7, s) * (1 - smooth(16.5, 16.8, s))
			    const sunEl = rad(mix(catmull(SUN_EL, s), 3.2, titleLift))
			    const sunAz = rad(mix(38, 41.5, titleLift))
			    const sunDir = [Math.sin(sunAz) * Math.cos(sunEl), Math.sin(sunEl), Math.cos(sunAz) * Math.cos(sunEl)]
			    const sunColor = colorAt(day, [[0, '#FFD696'], [0.42, '#FFD696'], [0.55, '#FFE0B0'], [0.7, '#FFF2DC'], [1, '#FFF6E0']])
			    const dawn = smooth(9.4, 12.2, s)
			    const hSun = horizonHeightAt(sunAz)
			    const sunAboveLine = sunEl - hSun
			    const sunDisk = smooth(-0.0012, 0.0035, sunAboveLine)
			    const flare = smooth(0.0, 0.0025, sunAboveLine) * (1 - smooth(0.055, 0.115, sunAboveLine))
			    const aurora = smooth(7.0, 8.0, s) * (1 - smooth(10.1, 11.7, s))
			    const starFade = smooth(1.25, 2.15, s) * (1 - smooth(9.0, 11.5, s))
			    const milky = smooth(1.7, 2.9, s) * (1 - smooth(9.0, 10.8, s)) * 1.60
			    const prologue = smooth(0.15, 0.80, s) * (1 - smooth(2.9, 4.4, s))
			    const cometA = smooth(2.9, 3.2, s) * (1 - smooth(5.35, 5.65, s))
			    const meteorA = smooth(4.10, 4.18, s) * (1 - smooth(4.45, 4.58, s))
			    let meteorHead = [0.0, 0.0], meteorDir = [0.9, 0.35], meteorLen = 0.17
			    if (meteorA > 0.001) {
			      const mp = smooth(4.10, 4.55, s)
			      const uvx = mix(0.80, 0.46, mp)
			      const uvy = mix(0.72, 0.55, mp)
			      meteorHead = [(uvx - 0.5) * (W / H), uvy - 0.5]
			      const ml = Math.hypot(0.9, 0.35)
			      meteorDir = [0.9 / ml, 0.35 / ml]
			      meteorLen = 0.17
			    }
			    const meteor2A = smooth(5.15, 5.22, s) * (1 - smooth(5.45, 5.58, s))
			    let meteor2Head = [0.0, 0.0], meteor2Dir = [-0.9, 0.35], meteor2Len = 0.16
			    if (meteor2A > 0.001) {
			      const mp = smooth(5.15, 5.58, s)
			      const uvx = mix(0.16, 0.60, mp)
			      const uvy = mix(0.82, 0.54, mp)
			      meteor2Head = [(uvx - 0.5) * (W / H), uvy - 0.5]
			      const ml2 = Math.hypot(0.9, 0.35)
			      meteor2Dir = [-0.9 / ml2, 0.35 / ml2]
			      meteor2Len = 0.16
			    }
			    const meteor3A = smooth(2.62, 2.68, s) * (1 - smooth(3.08, 3.22, s))
			    let meteor3Head = [0.0, 0.0], meteor3Dir = [0.9, 0.35], meteor3Len = 0.16
			    if (meteor3A > 0.001) {
			      const mp = smooth(2.62, 3.18, s)
			      const uvx = mix(0.78, 0.32, mp)
			      const uvy = mix(0.30, 0.50, mp)
			      meteor3Head = [(uvx - 0.5) * (W / H), uvy - 0.5]
			      const ml3 = Math.hypot(0.9, 0.35)
			      meteor3Dir = [0.9 / ml3, 0.35 / ml3]
			      meteor3Len = 0.16
			    }
			    let cometHead = [0.5, 0.5], cometDir = [0.9, 0.4], cometLen = 0.72
			    if (cometA > 0.001) {
			      const cp = smooth(3.0, 5.5, s)
			      const uvx = mix(0.66, 0.24, cp)
			      const uvy = mix(0.72, 0.58, cp) + 0.012 * Math.sin(cp * 3.1)
			      cometHead = [(uvx - 0.5) * (W / H), uvy - 0.5]
			      const dl = Math.hypot(0.90, 0.38)
			      cometDir = [0.90 / dl, 0.38 / dl]
			      cometLen = 0.72
			    }
			    const flareOn = flare * (0.45 + 0.55 * smooth(0.0, 0.004, sunAboveLine)) * (1 - 0.88 * titleLift) * smooth(12.55, 13.15, s)
			    const god = smooth(12.15, 12.95, s) * (1 - smooth(13.8, 14.6, s)) * smooth(-0.030, 0.002, sunAboveLine)
			    const uiMix = smooth(16.70, 17.85, s)
			    return {
			      s, cam, day, top, mid, hor, sunDir, sunEl, sunAz, hSun, sunColor, dawn,
			      titleLift, sunDisk, flare: flareOn, god, beam: god, gaps: BEAM_GAPS, aurora, starFade, milky, prologue,
			      cometA, cometHead, cometDir, cometLen,
			      meteorA, meteorHead, meteorDir, meteorLen,
			      meteor2A, meteor2Head, meteor2Dir, meteor2Len,
			      meteor3A, meteor3Head, meteor3Dir, meteor3Len,
			      starBreath: smooth(1.5, 2.2, s) * (1 - smooth(5.7, 6.1, s)), uiMix,
			      rim: [mix(0.30, 1.0, dawn), mix(0.80, 0.76, dawn), mix(1.0, 0.45, dawn)],
			    }
			  }

			  // ---- GL setup ------------------------------------------------------------
			  let gl = null
			  let canvas2d = null
			  let outW = 1440, outH = 810
			  let renderScale = forceScale
			  let programs = {}
			  let fbos = {}
			  let textures = {}
			  let quadBuf = null
			  let instBuf = null
			  let instData = null
			  let instCapacity = 0
			  let destroyed = false, simple = false, playing = false, rAF = 0
			  const cleanups = []
			  let hardTimer = 0
			  let startAt = 0, lastFrame = 0, currentT = 0, skipStart = 0
			  let measured = [], measuredFrames = 0, downgraded = false
			  let benchData = null
			  const frame = { renderMs: 0 }
			  let hdr = true
			  let bootTiming = {}

			  const VS = `#version 300 es
			  in vec2 aPosition;
			  void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`

			  const SCENE_U = ['uRes', 'uTime', 'uYaw', 'uPitch', 'uFov', 'uSkyTop', 'uSkyMid', 'uSkyHor', 'uSunDir', 'uSunColor', 'uDawn', 'uStarFade', 'uMilky', 'uPrologue', 'uHeroDir', 'uHeroRight', 'uHeroUp', 'uCometA', 'uCometHead', 'uCometDir', 'uCometLen', 'uMeteorA', 'uMeteorHead', 'uMeteorDir', 'uMeteorLen', 'uMeteor2A', 'uMeteor2Head', 'uMeteor2Dir', 'uMeteor2Len', 'uMeteor3A', 'uMeteor3Head', 'uMeteor3Dir', 'uMeteor3Len', 'uAurora', 'uAuroraPhase', 'uStarDebug', 'uStarBreath', 'uTitleGlow', 'uBeam', 'uGap0', 'uGap1', 'uGap2', 'uGap3', 'uGap4', 'uGap5', 'uGap6', 'uGap7', 'uNoise', 'uHorizonTex', 'uHorizonScale', 'uRimColor', 'uRimStrength']
			  const COMP_U = ['uScene', 'uBloom', 'uRays', 'uUi', 'uRes', 'uTime', 'uSunUV', 'uSunColor', 'uFlare', 'uRayStrength', 'uBloomStrength', 'uExposure', 'uDark', 'uUiMix', 'uRaw', 'uUiRect']
			  const OV_U = ['uDesign', 'uMask', 'uAtlas', 'uScene', 'uRes', 'uTime', 'uSheen', 'uLanding', 'uTitleBody']

			  function compile(type, src) {
			    const sh = gl.createShader(type)
			    gl.shaderSource(sh, src)
			    gl.compileShader(sh)
			    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
			      const log = gl.getShaderInfoLog(sh)
			      gl.deleteShader(sh)
			      throw new Error('shader: ' + log)
			    }
			    return sh
			  }
			  function link(vsSrc, fsSrc, names) {
			    const v = compile(gl.VERTEX_SHADER, vsSrc)
			    const f = compile(gl.FRAGMENT_SHADER, fsSrc)
			    const p = gl.createProgram()
			    gl.attachShader(p, v)
			    gl.attachShader(p, f)
			    gl.linkProgram(p)
			    gl.deleteShader(v)
			    gl.deleteShader(f)
			    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p))
			    const map = {}
			    for (const n of names) map[n] = gl.getUniformLocation(p, n)
			    return { p, map }
			  }

			  function makeTarget(w, h, float) {
			    const tex = gl.createTexture()
			    gl.bindTexture(gl.TEXTURE_2D, tex)
			    gl.texImage2D(gl.TEXTURE_2D, 0, float ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, float ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null)
			    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
			    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
			    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
			    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
			    const fb = gl.createFramebuffer()
			    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
			    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
			    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('FBO incomplete')
			    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
			    return { fb, tex, w, h }
			  }
			  function deleteTarget(t) {
			    if (!t) return
			    gl.deleteTexture(t.tex)
			    gl.deleteFramebuffer(t.fb)
			  }

			  function allocateTargets() {
			    for (const k of Object.keys(fbos)) { deleteTarget(fbos[k]) }
			    fbos = {}
			    const halfW = Math.max(4, Math.floor(outW / 2)), halfH = Math.max(4, Math.floor(outH / 2))
			    const quarterW = Math.max(4, Math.floor(outW / 4)), quarterH = Math.max(4, Math.floor(outH / 4))
			    fbos.scene = makeTarget(outW, outH, hdr)
			    fbos.ray = makeTarget(halfW, halfH, hdr)
			    fbos.rayA = makeTarget(halfW, halfH, hdr)
			    fbos.rayB = makeTarget(halfW, halfH, hdr)
			    fbos.bright = makeTarget(quarterW, quarterH, hdr)
			    fbos.bloomA = makeTarget(quarterW, quarterH, hdr)
			    fbos.bloomB = makeTarget(quarterW, quarterH, hdr)
			  }

			  function resize() {
			    const cssW = Math.max(1, innerWidth), cssH = Math.max(1, innerHeight)
			    const dpr = Math.min(devicePixelRatio || 1, 1.5)
			    outW = Math.max(480, Math.min(1920, Math.round(cssW * dpr * renderScale)))
			    outH = Math.max(270, Math.round(outW * cssH / cssW))
			    canvas.width = outW
			    canvas.height = outH
			    if (titleCopy) titleCopy.style.transform = `scale(${innerWidth / W}, ${innerHeight / H})`
			    layoutBars()
			    if (gl) allocateTargets()
			  }

			  function layoutBars() {
			    const h = Math.max(0, Math.round((innerHeight - innerWidth / 2.39) / 2))
			    barTop.style.height = h + 'px'
			    barBottom.style.height = h + 'px'
			  }

			  function texFromCanvas(c, flip) {
			    const t = gl.createTexture()
			    gl.bindTexture(gl.TEXTURE_2D, t)
			    if (flip) gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
			    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c)
			    if (flip) gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
			    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
			    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
			    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
			    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
			    return t
			  }

			  function makeNoiseTexture(size) {
			    const data = new Uint8Array(size * size * 4)
			    const hash = (x, y, s) => {
			      let h = (x * 374761393 + y * 668265263 + s * 1442695041) >>> 0
			      h = (h ^ (h >>> 13)) * 1274126177
			      return ((h ^ (h >>> 16)) >>> 0) / 4294967295
			    }
			    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10)
			    const pnoise = (x, y, period, s) => {
			      const xi = Math.floor(x), yi = Math.floor(y)
			      const xf = x - xi, yf = y - yi
			      const x0 = ((xi % period) + period) % period, y0 = ((yi % period) + period) % period
			      const x1 = (x0 + 1) % period, y1 = (y0 + 1) % period
			      const u = fade(xf), v = fade(yf)
			      const a = hash(x0, y0, s), b = hash(x1, y0, s), c = hash(x0, y1, s), d = hash(x1, y1, s)
			      return mix(mix(a, b, u), mix(c, d, u), v)
			    }
			    const fbm = (u, v, basePeriod, octaves, s) => {
			      let total = 0, amp = 0.5, period = basePeriod, norm = 0
			      for (let i = 0; i < octaves; i += 1) {
			        total += amp * pnoise(u * period, v * period, period, s + i * 37)
			        norm += amp; amp *= 0.5; period *= 2
			      }
			      return total / norm
			    }
			    for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
			      const u = x / size, v = y / size
			      const r = fbm(u, v, 4, 5, 11)
			      const g = fbm(u, v, 8, 4, 73)
			      const b = fbm(u, v, 16, 3, 131)
			      const i = (y * size + x) * 4
			      data[i] = Math.max(0, Math.min(255, Math.round(r * 255)))
			      data[i + 1] = Math.max(0, Math.min(255, Math.round(g * 255)))
			      data[i + 2] = Math.max(0, Math.min(255, Math.round(b * 255)))
			      data[i + 3] = 255
			    }
			    return data
			  }

			  function makeHorizonTexture() {
			    const data = new Uint8Array(HORIZON_N * 4)
			    for (let i = 0; i < HORIZON_N; i += 1) {
			      const v = Math.round(HORIZON[i] / HORIZON_SCALE * 255)
			      data[i * 4] = v; data[i * 4 + 1] = v; data[i * 4 + 2] = v; data[i * 4 + 3] = 255
			    }
			    const t = gl.createTexture()
			    gl.bindTexture(gl.TEXTURE_2D, t)
			    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, HORIZON_N, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
			    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
			    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
			    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
			    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
			    return t
			  }

			  function initGL() {
			    gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' })
			    if (!gl) return false
			    hdr = !!gl.getExtension('EXT_color_buffer_float')
			    const sceneFS = document.getElementById('scene-frag').textContent.trim()
			    const godFS = document.getElementById('god-frag').textContent.trim()
			    const brightFS = document.getElementById('bright-frag').textContent.trim()
			    const blurFS = document.getElementById('blur-frag').textContent.trim()
			    const compFS = document.getElementById('composite-frag').textContent.trim()
			    const ovVS = document.getElementById('overlay-vert').textContent.trim()
			    const ovFS = document.getElementById('overlay-frag').textContent.trim()
			    programs.scene = link(VS, sceneFS, SCENE_U)
			    programs.god = link(VS, godFS, ['uScene', 'uRes', 'uSunUV', 'uSunColor', 'uStrength'])
			    programs.bright = link(VS, brightFS, ['uScene', 'uRes', 'uThreshold'])
			    programs.blur = link(VS, blurFS, ['uTex', 'uRes', 'uDir'])
			    programs.composite = link(VS, compFS, COMP_U)
			    programs.overlay = link(ovVS, ovFS, OV_U)
			    quadBuf = gl.createBuffer()
			    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
			    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
			    const noise = makeNoiseTexture(256)
			    textures.noise = gl.createTexture()
			    gl.bindTexture(gl.TEXTURE_2D, textures.noise)
			    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, noise)
			    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
			    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
			    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
			    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
			    textures.horizon = makeHorizonTexture()
			    textures.mask = texFromCanvas(maskCanvas, false)
			    textures.atlas = texFromCanvas(atlas.canvas, false)
			    textures.ui = texFromCanvas(textures.uiImage, true)
			    instCapacity = 1800
			    instData = new Float32Array(instCapacity * 19)
			    instBuf = gl.createBuffer()
			    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf)
			    gl.bufferData(gl.ARRAY_BUFFER, instData.byteLength, gl.DYNAMIC_DRAW)
			    resize()
			    return true
			  }

			  function bindQuad(prog) {
			    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
			    const loc = gl.getAttribLocation(prog.p, 'aPosition')
			    gl.enableVertexAttribArray(loc)
			    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
			  }

			  // ---- overlay instances ---------------------------------------------------
			  let overlayCount = 0
			  const panelRects = []
			  const UI_W = 1406, UI_H = 803
			  const UI_SCALE = Math.max(W / UI_W, H / UI_H)
			  const UI_OX = (W - UI_W * UI_SCALE) / 2
			  const UI_OY = (H - UI_H * UI_SCALE) / 2
			  let panelsMeasured = false
			  function panelElement(selectors) {
			    for (const selector of selectors) {
			      let nodes = null
			      try { nodes = document.querySelectorAll(selector) } catch (e) { continue }
			      for (const node of nodes) {
			        if (!node || typeof node.getBoundingClientRect !== 'function') continue
			        const r = node.getBoundingClientRect()
			        if (r && r.width > 8 && r.height > 8) return { node, rect: r }
			      }
			    }
			    return null
			  }
			  function measurePanelRects() {
			    const vw = Math.max(1, (typeof innerWidth === 'number' ? innerWidth : W))
			    const vh = Math.max(1, (typeof innerHeight === 'number' ? innerHeight : H))
			    const sx = W / vw, sy = H / vh
			    const specs = [
			      { id: 'sidebar', src: [8, 80, 264, 700], selectors: ['[data-tl-sidebar]', 'aside', 'nav', '[class*="sidebar"]'] },
			      { id: 'composer', src: [466, 386, 722, 86], selectors: ['textarea', '[contenteditable="true"]'] },
			      { id: 'topbar', src: [0, 0, 1406, 42], selectors: ['header', '[role="banner"]', '[class*="topbar"]'] },
			      { id: 'weather', src: [1318, 56, 82, 36], selectors: ['[data-tl-weather]', '[class*="weather"]'] },
			    ]
			    panelRects.length = 0
			    for (const spec of specs) {
			      const found = panelElement(spec.selectors)
			      let rect = found ? found.rect : null
			      if (rect && spec.id === 'composer') {
			        const form = found.node.closest && found.node.closest('form')
			        if (form && typeof form.getBoundingClientRect === 'function') {
			          const r = form.getBoundingClientRect()
			          if (r && r.width > 8 && r.height > 8) rect = r
			        }
			      }
			      if (rect) {
			        const x = Math.max(0, Math.min(W - 2, rect.left * sx))
			        const y = Math.max(0, Math.min(H - 2, rect.top * sy))
			        panelRects.push({
			          x, y,
			          w: Math.max(2, Math.min(W - x, rect.width * sx)),
			          h: Math.max(2, Math.min(H - y, rect.height * sy)),
			        })
			      } else {
			        const [px, py, pw, ph] = spec.src
			        panelRects.push({
			          x: UI_OX + px * UI_SCALE, y: UI_OY + py * UI_SCALE,
			          w: pw * UI_SCALE, h: ph * UI_SCALE,
			        })
			      }
			    }
			  }
			  measurePanelRects()

			  const TITLE_TILES = []
			  const LANDING_PANES = []
			  const RING_SEGS = []
			  const TICKS = []
			  const LABELS = []
			  function buildOverlayLayout() {
			    TITLE_TILES.length = 0
			    // 6 x 6 glass tiles covering the exact wordmark bounding box.
			    const cols = 6, rows = 6
			    const x0 = titleBox.x0 - 2, x1 = titleBox.x1 + 2
			    const y0 = titleBox.y0 - 2, y1 = titleBox.y1 + 2
			    const cw = (x1 - x0) / cols, ch = (y1 - y0) / rows
			    for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) {
			      const cx = x0 + (c + 0.5) * cw, cy = y0 + (r + 0.5) * ch
			      const sx = cw + 2, sy = ch + 2
			      const u0 = (x0 + c * cw - 1) / W, u1 = (x0 + (c + 1) * cw + 1) / W
			      const v0 = (y0 + r * ch - 1) / H, v1 = (y0 + (r + 1) * ch + 1) / H
			      TITLE_TILES.push({
			        cx, cy, sx, sy, u0, v0, u1, v1,
			        startX: 0, startY: 0, startRot: 0, startScale: 1,
			        delay: rand() * 0.22,
			        seed: rand(),
			        panel: (r * cols + c) % 4,
			        slot: Math.floor((r * cols + c) / 4),
			      })
			    }
			    // four large glass panes: 2 x 2 quadrants of the wordmark, one per panel
			    LANDING_PANES.length = 0
			    const halfW = (titleBox.x1 - titleBox.x0) / 2
			    const halfH = (titleBox.y1 - titleBox.y0) / 2
			    for (let q = 0; q < 4; q += 1) {
			      const col = q % 2, row = Math.floor(q / 2)
			      const sx = (titleBox.x0 + col * halfW - 1) / W
			      const sy = (titleBox.y0 + row * halfH - 1) / H
			      const ex = (titleBox.x0 + (col + 1) * halfW + 1) / W
			      const ey = (titleBox.y0 + (row + 1) * halfH + 1) / H
			      LANDING_PANES.push({
			        q,
			        cx: titleBox.x0 + (col + 0.5) * halfW,
			        cy: titleBox.y0 + (row + 0.5) * halfH,
			        sx: halfW + 2, sy: halfH + 2,
			        u0: sx, v0: sy, u1: ex, v1: ey,
			      })
			    }
			    // 3 rings + ticks
			    RING_SEGS.length = 0
			    const rings = [
			      { r: 385, count: 180, width: 1.5, alpha: 0.70, dash: 0, speed: 0.055 },
			      { r: 450, count: 180, width: 1.5, alpha: 0.70, dash: 2, speed: -0.085 },
			      { r: 510, count: 180, width: 1.5, alpha: 0.70, dash: 3, speed: 0.12 },
			    ]
			    for (const ring of rings) {
			      for (let i = 0; i < ring.count; i += 1) {
			        if (ring.dash && i % ring.dash !== 0) continue
			        RING_SEGS.push({ ring, i })
			      }
			    }
			    TICKS.length = 0
			    for (let i = 0; i < 72; i += 1) TICKS.push(i)
			    LABELS.length = 0
			    for (const key of ['l0', 'l1', 'l2']) LABELS.push({ key, x: 150, y: key === 'l0' ? 300 : key === 'l1' ? 560 : 760 })
			  }

			  function putInstance(idx, center, size, rot, uv, color, mode, alpha, params) {
			    const o = idx * 19
			    instData[o] = center[0]; instData[o + 1] = center[1]
			    instData[o + 2] = size[0]; instData[o + 3] = size[1]
			    instData[o + 4] = rot
			    instData[o + 5] = uv[0]; instData[o + 6] = uv[1]; instData[o + 7] = uv[2]; instData[o + 8] = uv[3]
			    instData[o + 9] = color[0]; instData[o + 10] = color[1]; instData[o + 11] = color[2]; instData[o + 12] = color[3]
			    instData[o + 13] = mode
			    instData[o + 14] = alpha
			    instData[o + 15] = params[0]; instData[o + 16] = params[1]; instData[o + 17] = params[2]; instData[o + 18] = params[3]
			  }

			  function buildOverlay(t) {
			    const s = t / 1000
			    overlayCount = 0
			    const ringIn = smooth(14.15, 15.05, s) * (1 - smooth(16.45, 17.05, s))
			    const labelIn = smooth(14.55, 15.25, s) * (1 - smooth(16.55, 17.15, s))
			    const titleIn = smooth(14.20, 15.20, s)
			    const split = smooth(16.52, 16.72, s)
			    const landing = smooth(16.62, 17.78, s)

			    // rings and ticks
			    if (ringIn > 0.001) {
			      const cxc = W / 2, cyc = 500
			      const spin = s - 14.0
			      for (let k = 0; k < RING_SEGS.length; k += 1) {
			        const item = RING_SEGS[k]
			        const ring = item.ring
			        const a = (item.i / ring.count) * Math.PI * 2 + spin * ring.speed
			        const cx = cxc + Math.cos(a) * ring.r
			        const cy = cyc + Math.sin(a) * ring.r
			        const arcLen = (Math.PI * 2 * ring.r) / ring.count * 1.12
			        const reveal = smooth(14.15 + item.i * 0.0016, 14.95 + item.i * 0.0016, s)
			        const alpha = ring.alpha * ringIn * reveal
			        if (reveal > 0.001) {
			          putInstance(overlayCount++, [cx, cy], [arcLen, ring.width], a + Math.PI / 2, [0, 0, 1, 1], [0.80, 0.95, 1.0, 1], 1, alpha, [0, k, 0, 0])
			        }
			      }
			      for (let k = 0; k < TICKS.length; k += 1) {
			        const a = (k / TICKS.length) * Math.PI * 2 + spin * 0.12
			        const major = k % 9 === 0
			        const r1 = 510, r2 = r1 + (major ? 13 : 6)
			        const cx = cxc + Math.cos(a) * (r1 + (r2 - r1) / 2)
			        const cy = cyc + Math.sin(a) * (r1 + (r2 - r1) / 2)
			        const reveal = smooth(14.35 + k * 0.003, 15.15 + k * 0.003, s)
			        putInstance(overlayCount++, [cx, cy], [r2 - r1, 1.5], a + Math.PI / 2, [0, 0, 1, 1], [0.82, 0.96, 1.0, 1], 2, 0.70 * ringIn * reveal, [0, k, 0, 0])
			      }
			    }

			    // brand, credit and technical labels are crisp DOM text (#titleCopy),
			    // so they never inherit the glass-quad or atlas seams.

			    // wordmark tiles: assemble, hold, crack, fly to panels
			    for (let i = 0; i < TITLE_TILES.length && true; i += 1) {
			      const tile = TITLE_TILES[i]
			      let cx = tile.cx, cy = tile.cy, rot = 0, sx = tile.sx, sy = tile.sy
			      let alpha = 1, maskMix = 1
			      if (s < 13.55) {
			        alpha = 0
			      } else if (s < 15.20) {
			        const u = smooth(13.55 + tile.delay, 15.00 + tile.delay, s)
			        const startX = W * (0.05 + 0.9 * tile.seed)
			        const startY = H * (0.10 + 0.80 * ((tile.seed * 7.13) % 1))
			        const ctrlX = mix(startX, tile.cx, 0.5) + (tile.seed - 0.5) * 260
			        const ctrlY = mix(startY, tile.cy, 0.5) - 120
			        const v = 1 - u
			        cx = v * v * startX + 2 * v * u * ctrlX + u * u * tile.cx
			        cy = v * v * startY + 2 * v * u * ctrlY + u * u * tile.cy
			        rot = mix((tile.seed - 0.5) * 1.6, 0, u)
			        sx = mix(tile.sx * 1.15, tile.sx, u)
			        sy = mix(tile.sy * 1.15, tile.sy, u)
			        alpha = smooth(13.55 + tile.delay, 13.95 + tile.delay, s) * (0.30 + 0.42 * smooth(14.60 + tile.delay, 15.15 + tile.delay, s))
			        alpha *= 1 - smooth(14.90, 15.15, s)
			        maskMix = 0.85
			      } else if (s < 16.52) {
			        // the opaque body owns the hold; tiles are fully retired
			        alpha = 0
			        maskMix = 1
			      } else {
			        // the four large panes replace the tile grid at the split
			        alpha = 0
			      }
			      if (alpha > 0.001) {
			        putInstance(overlayCount++, [cx, cy], [sx, sy], rot, [tile.u0, tile.v0, tile.u1, tile.v1], [1.0, 0.98, 0.94, 1], 0, alpha, [3, tile.seed, maskMix, 0])
			      }
			    }

			    // opaque body seals the tile seams for the whole hold
			    const bodyA = smooth(14.90, 15.15, s) * (1 - smooth(16.52, 16.60, s))
			    if (bodyA > 0.001 && true) {
			      putInstance(overlayCount++, [W / 2, H / 2], [W, H], 0, [0, 0, 1, 1], [1, 1, 1, 1], 6, bodyA, [0, 0, 0, 0])
			    }

			    // four big glass panes fly out to the four real panel rectangles
			    for (let q = 0; q < LANDING_PANES.length; q += 1) {
			      const pane = LANDING_PANES[q]
			      const target = panelRects[q]
			      const t0 = 16.56 + q * 0.035
			      const u = smooth(t0, t0 + 0.78, s)
			      if (u <= 0.001) continue
			      const land = t0 + 0.78
			      const flash = Math.exp(-Math.pow((s - land) / 0.075, 2))
			      const fade = 1 - smooth(land + 0.03, land + 0.33, s)
			      if (fade <= 0.001) continue
			      const tx = target.x + target.w / 2
			      const ty = target.y + target.h / 2
			      const ctrlX = mix(pane.cx, tx, 0.5) + (q % 2 === 0 ? -1 : 1) * 120
			      const ctrlY = mix(pane.cy, ty, 0.5) - 130
			      const v = 1 - u
			      const cx = v * v * pane.cx + 2 * v * u * ctrlX + u * u * tx
			      const cy = v * v * pane.cy + 2 * v * u * ctrlY + u * u * ty
			      const sx = mix(pane.sx, target.w, u)
			      const sy = mix(pane.sy, target.h, u)
			      const maskMix = 1 - smooth(t0 + 0.06, t0 + 0.46, s)
			      putInstance(overlayCount++, [cx, cy], [sx, sy], 0, [pane.u0, pane.v0, pane.u1, pane.v1], [1.0, 0.98, 0.94, 1], 0, fade, [0, q, maskMix, flash])
			    }

			    // floating light motes around the wordmark
			    const dustA = smooth(15.0, 15.65, s) * (1 - smooth(16.30, 16.58, s))
			    if (dustA > 0.001) {
			      for (let i = 0; i < 18; i += 1) {
			        const a = i * 2.399
			        const rr = 130 + ((i * 53) % 220)
			        const x = 960 + Math.cos(a) * rr * 1.30 + Math.sin(s * 0.45 + i) * 7
			        const y = 500 + Math.sin(a) * rr * 0.58 + Math.cos(s * 0.37 + i * 1.3) * 5
			        if (y > 690) continue
			        const sz = 2.0 + (i % 4) * 0.75
			        const col = i % 3 === 0 ? [1.0, 0.86, 0.62] : [0.58, 0.92, 1.0]
			        putInstance(overlayCount++, [x, y], [sz, sz], 0, [0, 0, 1, 1], [col[0], col[1], col[2], 1], 5, 0.45 * dustA, [0, 0, 0, 0])
			      }
			    }

			    // (no panel guide outlines in the final frame)
			  }

			  function uploadOverlay() {
			    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf)
			    gl.bufferSubData(gl.ARRAY_BUFFER, 0, instData.subarray(0, overlayCount * 19))
			    const stride = 19 * 4
			    const attrs = [
			      [1, 2, 0], [2, 2, 2], [3, 1, 4], [4, 4, 5], [5, 4, 9], [6, 1, 13], [7, 1, 14], [8, 4, 15],
			    ]
			    for (const [loc, n, off] of attrs) {
			      gl.enableVertexAttribArray(loc)
			      gl.vertexAttribPointer(loc, n, gl.FLOAT, false, stride, off * 4)
			      gl.vertexAttribDivisor(loc, 1)
			    }
			  }

			  // ---- render --------------------------------------------------------------
			  function setUniformsScene(t, st) {
			    const cam = st.cam
			    gl.useProgram(programs.scene.p)
			    const u = programs.scene.map
			    gl.uniform2f(u.uRes, outW, outH)
			    gl.uniform1f(u.uTime, t / 1000)
			    gl.uniform1f(u.uYaw, cam.yaw)
			    gl.uniform1f(u.uPitch, cam.pitch)
			    gl.uniform1f(u.uFov, cam.fov)
			    gl.uniform3fv(u.uSkyTop, st.top)
			    gl.uniform3fv(u.uSkyMid, st.mid)
			    gl.uniform3fv(u.uSkyHor, st.hor)
			    gl.uniform3fv(u.uSunDir, st.sunDir)
			    gl.uniform3fv(u.uSunColor, st.sunColor)
			    gl.uniform1f(u.uDawn, st.dawn)
			    gl.uniform1f(u.uStarFade, st.starFade)
			    gl.uniform1f(u.uMilky, st.milky)
			    gl.uniform1f(u.uPrologue, st.prologue)
			    gl.uniform3fv(u.uHeroDir, HERO_DIR)
			    gl.uniform3fv(u.uHeroRight, HERO_RIGHT)
			    gl.uniform3fv(u.uHeroUp, HERO_UP)
			    gl.uniform1f(u.uCometA, st.cometA)
			    gl.uniform2fv(u.uCometHead, st.cometHead)
			    gl.uniform2fv(u.uCometDir, st.cometDir)
			    gl.uniform1f(u.uCometLen, st.cometLen)
			    gl.uniform1f(u.uMeteorA, st.meteorA)
			    gl.uniform2fv(u.uMeteorHead, st.meteorHead)
			    gl.uniform2fv(u.uMeteorDir, st.meteorDir)
			    gl.uniform1f(u.uMeteorLen, st.meteorLen)
			    gl.uniform1f(u.uMeteor2A, st.meteor2A)
			    gl.uniform2fv(u.uMeteor2Head, st.meteor2Head)
			    gl.uniform2fv(u.uMeteor2Dir, st.meteor2Dir)
			    gl.uniform1f(u.uMeteor2Len, st.meteor2Len)
			    gl.uniform1f(u.uMeteor3A, st.meteor3A)
			    gl.uniform2fv(u.uMeteor3Head, st.meteor3Head)
			    gl.uniform2fv(u.uMeteor3Dir, st.meteor3Dir)
			    gl.uniform1f(u.uMeteor3Len, st.meteor3Len)
			    gl.uniform1f(u.uAurora, st.aurora)
			    gl.uniform1f(u.uAuroraPhase, t / 1000)
			    gl.uniform1f(u.uStarDebug, 0)
			    gl.uniform1f(u.uStarBreath, st.starBreath)
			    gl.uniform1f(u.uTitleGlow, st.titleLift)
			    gl.uniform1f(u.uBeam, st.beam)
			    for (let i = 0; i < 8; i += 1) {
			      const g = BEAM_GAPS[i] || { az: 0, str: 0 }
			      gl.uniform2f(u['uGap' + i], g.az, g.str)
			    }
			    gl.uniform1f(u.uHorizonScale, HORIZON_SCALE)
			    gl.uniform3fv(u.uRimColor, st.rim)
			    gl.uniform1f(u.uRimStrength, 0.55 + 0.65 * st.dawn)
			    gl.activeTexture(gl.TEXTURE0)
			    gl.bindTexture(gl.TEXTURE_2D, textures.noise)
			    gl.uniform1i(u.uNoise, 0)
			    gl.activeTexture(gl.TEXTURE1)
			    gl.bindTexture(gl.TEXTURE_2D, textures.horizon)
			    gl.uniform1i(u.uHorizonTex, 1)
			  }

			  let uiRect = [0, 0, 1, 1]
			  function computeUiRect() {
			    const scale = Math.max(W / UI_W, H / UI_H)
			    const dw = (UI_W * scale) / W, dh = (UI_H * scale) / H
			    uiRect = [(1 - dw) / 2, (1 - dh) / 2, dw, dh]
			  }

			  function renderFrame(t, doFinish) {
			    const frameStart = performance.now()
			    const st = stateAt(t)
			    const aspect = outW / outH

			    gl.bindFramebuffer(gl.FRAMEBUFFER, fbos.scene.fb)
			    gl.viewport(0, 0, outW, outH)
			    setUniformsScene(t, st)
			    bindQuad(programs.scene)
			    gl.drawArrays(gl.TRIANGLES, 0, 3)

			    // screen-space god rays from the silhouette occlusion
			    let sunUV = [0.5, 0.5]
			    const sunProj = projectDir(st.sunDir, st.cam, aspect)
			    if (sunProj) sunUV = sunProj.uv
			    const ridgeDir = [Math.sin(st.sunAz) * Math.cos(st.hSun), Math.sin(st.hSun), Math.cos(st.sunAz) * Math.cos(st.hSun)]
			    const ridgeProj = projectDir(ridgeDir, st.cam, aspect)
			    const rayOrigin = ridgeProj ? [ridgeProj.uv[0], ridgeProj.uv[1] - 0.015] : [sunUV[0], sunUV[1] - 0.1]
			    const rayStrength = 0
			    if (rayStrength > 0.001) {
			      const rw = fbos.ray.w, rh = fbos.ray.h
			      gl.bindFramebuffer(gl.FRAMEBUFFER, fbos.ray.fb)
			      gl.viewport(0, 0, rw, rh)
			      gl.useProgram(programs.god.p)
			      const gu = programs.god.map
			      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fbos.scene.tex); gl.uniform1i(gu.uScene, 0)
			      gl.uniform2f(gu.uRes, rw, rh)
			      gl.uniform2f(gu.uSunUV, rayOrigin[0], rayOrigin[1])
			      gl.uniform3fv(gu.uSunColor, st.sunColor)
			      gl.uniform1f(gu.uStrength, rayStrength)
			      bindQuad(programs.god)
			      gl.drawArrays(gl.TRIANGLES, 0, 3)
			      // soft blur of the ray buffer
			      gl.useProgram(programs.blur.p)
			      const bu = programs.blur.map
			      gl.bindFramebuffer(gl.FRAMEBUFFER, fbos.rayA.fb)
			      gl.viewport(0, 0, rw, rh)
			      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fbos.ray.tex); gl.uniform1i(bu.uTex, 0)
			      gl.uniform2f(bu.uRes, rw, rh); gl.uniform2f(bu.uDir, 1.5, 0)
			      bindQuad(programs.blur); gl.drawArrays(gl.TRIANGLES, 0, 3)
			      gl.bindFramebuffer(gl.FRAMEBUFFER, fbos.rayB.fb)
			      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fbos.rayA.tex); gl.uniform1i(bu.uTex, 0)
			      gl.uniform2f(bu.uDir, 0, 1.5)
			      bindQuad(programs.blur); gl.drawArrays(gl.TRIANGLES, 0, 3)
			    }

			    // bloom
			    const bw = fbos.bright.w, bh = fbos.bright.h
			    gl.bindFramebuffer(gl.FRAMEBUFFER, fbos.bright.fb)
			    gl.viewport(0, 0, bw, bh)
			    gl.useProgram(programs.bright.p)
			    const bu = programs.bright.map
			    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fbos.scene.tex); gl.uniform1i(bu.uScene, 0)
			    gl.uniform2f(bu.uRes, bw, bh)
			    gl.uniform1f(bu.uThreshold, 1.8)
			    bindQuad(programs.bright); gl.drawArrays(gl.TRIANGLES, 0, 3)

			    gl.useProgram(programs.blur.p)
			    const blu = programs.blur.map
			    gl.bindFramebuffer(gl.FRAMEBUFFER, fbos.bloomA.fb)
			    gl.viewport(0, 0, bw, bh)
			    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fbos.bright.tex); gl.uniform1i(blu.uTex, 0)
			    gl.uniform2f(blu.uRes, bw, bh); gl.uniform2f(blu.uDir, 1.8, 0)
			    bindQuad(programs.blur); gl.drawArrays(gl.TRIANGLES, 0, 3)
			    gl.bindFramebuffer(gl.FRAMEBUFFER, fbos.bloomB.fb)
			    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fbos.bloomA.tex); gl.uniform1i(blu.uTex, 0)
			    gl.uniform2f(blu.uDir, 0, 1.8)
			    bindQuad(programs.blur); gl.drawArrays(gl.TRIANGLES, 0, 3)

			    // composite
			    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
			    gl.viewport(0, 0, outW, outH)
			    gl.useProgram(programs.composite.p)
			    const cu = programs.composite.map
			    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fbos.scene.tex); gl.uniform1i(cu.uScene, 0)
			    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, fbos.bloomB.tex); gl.uniform1i(cu.uBloom, 1)
			    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, fbos.rayB.tex); gl.uniform1i(cu.uRays, 2)
			    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, textures.ui); gl.uniform1i(cu.uUi, 3)
			    gl.uniform2f(cu.uRes, outW, outH)
			    gl.uniform1f(cu.uTime, t / 1000)
			    gl.uniform2f(cu.uSunUV, sunUV[0], sunUV[1])
			    gl.uniform3fv(cu.uSunColor, st.sunColor)
			    gl.uniform1f(cu.uFlare, st.flare)
			    gl.uniform1f(cu.uRayStrength, rayStrength)
			    gl.uniform1f(cu.uBloomStrength, 0.46)
			    gl.uniform1f(cu.uExposure, 0.84)
			    gl.uniform1f(cu.uDark, smooth(14.0, 14.9, t / 1000) * (1 - smooth(16.55, 17.1, t / 1000)))
			    gl.uniform1f(cu.uUiMix, st.uiMix)
			    gl.uniform1f(cu.uRaw, 0)
			    gl.uniform4fv(cu.uUiRect, uiRect)
			    bindQuad(programs.composite); gl.drawArrays(gl.TRIANGLES, 0, 3)

			    // instanced glass / rings / labels
			    buildOverlay(t)
			    if (overlayCount > 0) {
			      gl.enable(gl.BLEND)
			      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
			      gl.useProgram(programs.overlay.p)
			      const ou = programs.overlay.map
			      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, textures.mask); gl.uniform1i(ou.uMask, 0)
			      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, textures.atlas); gl.uniform1i(ou.uAtlas, 1)
			      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, fbos.scene.tex); gl.uniform1i(ou.uScene, 2)
			      gl.uniform2f(ou.uRes, outW, outH)
			      gl.uniform2f(ou.uDesign, W, H)
			      gl.uniform1f(ou.uTime, t / 1000)
			      gl.uniform1f(ou.uSheen, mix(-0.2, 1.35, smooth(15.15, 16.25, t / 1000)))
			      gl.uniform1f(ou.uLanding, smooth(16.62, 17.78, t / 1000))
			      gl.uniform1f(ou.uTitleBody, 1.0)
			      uploadOverlay()
			      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, overlayCount)
			      gl.disable(gl.BLEND)
			    }

			    if (doFinish) gl.finish()
			    frame.renderMs = performance.now() - frameStart
			  }

			  function updateDOM(t) {
			    const s = t / 1000
			    setOpacity(sub1, smooth(7.15, 7.55, s) * (1 - smooth(9.15, 9.55, s)))
			    setOpacity(sub2, smooth(12.15, 12.55, s) * (1 - smooth(12.95, 13.45, s)))
			    setOpacity(titleCopy, smooth(14.55, 15.25, s) * (1 - smooth(16.52, 17.05, s)))
			    const hint = smooth(1.5, 2.1, s) * (1 - smooth(5.6, 6.4, s)) * (1 - smooth(16.4, 17.0, s))
			    setOpacity(skipHint, clean ? 0 : hint)
			    const open = smooth(10.2, 14.6, s)
			    barTop.style.transform = `translateY(-${(open * 101).toFixed(2)}%)`
			    barBottom.style.transform = `translateY(${(open * 101).toFixed(2)}%)`
			    letterbox.style.display = open > 0.999 ? 'none' : ''
			    if (debugLabel) debugLabel.textContent = `t=${Math.round(t)} ${CHAPTERS[chapterAt(t)].name} ${renderScale}`
			    film.style.opacity = String(1 - smooth(16.9, 18.05, s))
			    film.dataset.time = String(Math.round(t))
			  }

			  function renderSplash(t) {
			    if (simple) return
			    currentT = t
			    renderFrame(t, false)
			    updateDOM(t)
			  }

			  function projectDir(dir, cam, aspect) {
			    const cz = dir[0] * cam.forward[0] + dir[1] * cam.forward[1] + dir[2] * cam.forward[2]
			    if (cz <= 1e-4) return null
			    const nx = (dir[0] * cam.right[0] + dir[1] * cam.right[1] + dir[2] * cam.right[2]) / cz
			    const ny = (dir[0] * cam.up[0] + dir[1] * cam.up[1] + dir[2] * cam.up[2]) / cz
			    const tanF = Math.tan(rad(cam.fov) * 0.5)
			    return { uv: [0.5 + nx / (2 * tanF * aspect), 0.5 + ny / (2 * tanF)] }
			  }

			  function stopSound() {
			    if (soundMaster) {
			      try { soundMaster.disconnect() } catch (e) {}
			      soundMaster = null
			    }
			    soundOn = false
			    if (soundBtn) soundBtn.textContent = '声音：关'
			  }

			  function startSound(fromSec) {
			    const from = Math.max(0, Math.min(18.4, fromSec || 0))
			    if (!audioCtx) {
			      const AC = window.AudioContext || window.webkitAudioContext
			      if (!AC) return false
			      audioCtx = new AC()
			    }
			    if (audioCtx.state === 'suspended') audioCtx.resume()
			    if (soundMaster) { try { soundMaster.disconnect() } catch (e) {} }
			    const master = audioCtx.createGain()
			    master.gain.value = 0.55
			    master.connect(audioCtx.destination)
			    soundMaster = master
			    const now = audioCtx.currentTime + 0.04
			    const at = (t) => now + Math.max(0, t - from)
			    const tone = (f, t0, dur, amp, pan, type) => {
			      if (t0 + dur <= from) return
			      const start = at(t0)
			      const osc = audioCtx.createOscillator()
			      const g = audioCtx.createGain()
			      const p = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null
			      osc.type = type || 'sine'
			      osc.frequency.value = f
			      g.gain.setValueAtTime(0.0001, start)
			      g.gain.linearRampToValueAtTime(amp, start + 0.18)
			      g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
			      osc.connect(g)
			      if (p) { p.pan.value = pan || 0; g.connect(p); p.connect(master) } else g.connect(master)
			      osc.start(start)
			      osc.stop(start + dur + 0.08)
			    }
			    const pad = (fs, t0, dur, amp, pan) => {
			      for (const f of fs) tone(f, t0, dur, amp / fs.length, pan, 'sine')
			    }
			    tone(73.42, 0, 18.4, 0.032, -0.1, 'sine')
			    tone(110.0, 0, 18.4, 0.018, 0.1, 'sine')
			    pad([146.83, 174.61, 220.0], 0.0, 6.2, 0.060, -0.1)
			    pad([146.83, 174.61, 220.0, 329.63], 1.8, 4.6, 0.052, 0.05)
			    pad([116.54, 146.83, 174.61, 220.0], 5.8, 4.4, 0.058, -0.05)
			    pad([146.83, 185.0, 220.0, 293.66], 9.8, 4.4, 0.062, 0.10)
			    pad([98.0, 116.54, 146.83, 196.0], 13.8, 2.9, 0.050, -0.05)
			    pad([146.83, 185.0, 220.0, 293.66], 16.2, 2.3, 0.062, 0.05)
			    const pings = [2.0, 3.35, 4.7, 6.3, 7.7, 9.1, 10.9, 12.3, 14.7, 16.1, 17.15]
			    const notes = [587.33, 880.0, 739.99, 659.25, 587.33, 880.0, 987.77, 739.99, 1174.66, 880.0, 739.99]
			    for (let i = 0; i < pings.length; i += 1) {
			      if (pings[i] < from - 0.1) continue
			      tone(notes[i], pings[i], 1.35, 0.020, -0.55 + (i % 5) * 0.27, 'sine')
			    }
			    tone(1174.66, 15.05, 1.7, 0.055, -0.25, 'triangle')
			    tone(880.0, 15.42, 1.5, 0.040, 0.25, 'sine')
			    if (from < 5.6) {
			      const len = Math.ceil(audioCtx.sampleRate * 2.8)
			      const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate)
			      const d = buf.getChannelData(0)
			      for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 1.1))
			      const src = audioCtx.createBufferSource()
			      const bp = audioCtx.createBiquadFilter()
			      const g = audioCtx.createGain()
			      const p = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null
			      src.buffer = buf
			      bp.type = 'bandpass'
			      bp.Q.value = 1.2
			      bp.frequency.setValueAtTime(420, at(2.9))
			      bp.frequency.exponentialRampToValueAtTime(2600, at(4.1))
			      bp.frequency.exponentialRampToValueAtTime(520, at(5.5))
			      g.gain.setValueAtTime(0.0001, at(2.9))
			      g.gain.linearRampToValueAtTime(0.020, at(3.5))
			      g.gain.exponentialRampToValueAtTime(0.0001, at(5.6))
			      src.connect(bp)
			      if (p) { p.pan.setValueAtTime(-0.7, at(2.9)); p.pan.linearRampToValueAtTime(0.7, at(5.4)); bp.connect(g); g.connect(p); p.connect(master) } else { bp.connect(g); g.connect(master) }
			      src.start(at(2.9)); src.stop(at(5.7))
			    }
			    master.gain.setValueAtTime(0.55, at(0))
			    master.gain.setValueAtTime(0.55, at(17.8))
			    master.gain.linearRampToValueAtTime(0.0001, at(18.45))
			    return true
			  }

			  function finish() {
			    playing = false
			    currentT = DURATION
			    stopSound()
			    if (rAF) cancelAnimationFrame(rAF)
			    rAF = 0
			    film.dataset.state = 'done'
			    if (onDone) onDone()
			  }

			  function enterSimple(reason) {
			    if (simple) return
			    simple = true
			    playing = false
			    if (rAF) cancelAnimationFrame(rAF)
			    rAF = 0
			    film.dataset.state = 'simple'
			    film.dataset.reason = reason || 'simple'
			    if (onFallback) onFallback(reason || 'simple')
			    canvas.style.opacity = '0'
			    const c = film.querySelector('.controls')
			    if (c) c.style.display = 'none'
			    simpleVeil.style.opacity = '1'
			    simpleMark.animate([{ opacity: 0 }, { opacity: 1, offset: .25 }, { opacity: 1, offset: .7 }, { opacity: 0 }], { duration: 1200, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }).finished.then(() => {
			      simpleVeil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' })
			    }).catch(() => {})
			  }


			  function loop(now) {
			    if (!playing) return
			    const t = skipStart ? Math.min(DURATION, 16650 + (now - skipStart) * 2.4) : Math.min(DURATION, now - startAt)
			    currentT = t
			    const dt = lastFrame ? now - lastFrame : 16.7
			    lastFrame = now
			    renderFrame(t, false)
			    updateDOM(t)
			    if (bench && benchData && !benchData.done) {
			      const ch = benchData.chapters[chapterAt(t)]
			      if (ch) { ch.frames += 1; ch.total += dt; ch.render += frame.renderMs; ch.max = Math.max(ch.max, dt) }
			    }
			    if (!captureMode && !bench) {
			      measured.push(dt); measuredFrames += 1
			      if (measuredFrames === 30) {
			        const avg = measured.reduce((a, b) => a + b, 0) / measured.length
			        if (!downgraded && renderScale > 0.5 && avg > 20) { renderScale = 0.5; downgraded = true; measured = []; measuredFrames = 0; resize() }
			        else if (renderScale > 0.45 && avg > 16.7) { renderScale = 0.4; downgraded = true; measured = []; measuredFrames = 0; resize() }
			        else if (renderScale <= 0.45 && avg > 33) { enterSimple('performance'); return }
			        else { measured = []; measuredFrames = 0 }
			      }
			    }
			    if (t >= DURATION) { if (bench && benchData) benchData.done = true; finish(); return }
			    rAF = requestAnimationFrame(loop)
			  }

			  function startPlayback() {
			    film.dataset.stage = 'play'
			    if (simple || destroyed) return
			    if (fixedTime !== null) { renderSplash(fixedTime); return }
			    playing = true
			    skipStart = 0
			    startAt = performance.now()
			    lastFrame = 0
			    measured = []; measuredFrames = 0
			    film.dataset.state = 'playing'
			    let warmFrames = 0
			    const warmStep = () => {
			      warmFrames += 1
			      if (warmFrames < 8) { rAF = requestAnimationFrame(warmStep); return }
			      rAF = requestAnimationFrame((now) => {
			        startAt = now
			        lastFrame = now
			        rAF = requestAnimationFrame(loop)
			      })
			    }
			    rAF = requestAnimationFrame(warmStep)
			  }

			  function skip() {
			    if (simple) return
			    if (!playing) { finish(); return }
			    const now = performance.now()
			    const current = skipStart ? 16650 + (now - skipStart) * 2.4 : now - startAt
			    if (current < 16650) {
			      skipStart = now
			      lastFrame = 0
			      currentT = 16650
			      updateDOM(16650)
			      skipVeil.animate([{ opacity: 0 }, { opacity: .75, offset: .2 }, { opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.4,0,1,1)' })
			    } else finish()
			  }

			  async function boot() {
			    const t0 = performance.now()
			    film.dataset.stage = 'compute'
			    bootTiming.scriptStart = 0
			    try {
			      computeUiRect()
			      layoutBars()
			      const fontWait = (promise) => Promise.race([promise.catch(() => {}), new Promise((resolve) => setTimeout(resolve, 220))])
			      await fontWait(document.fonts.load('420px "Source Han Serif SC Heavy"'))
			      await fontWait(document.fonts.load('800 40px "Segoe UI"'))
			      await fontWait(document.fonts.ready)
			      bootTiming.fonts = performance.now() - t0
			      film.dataset.stage = 'mask'
			      buildTitleMask()
			      buildAtlas()
			      bootTiming.assets = performance.now() - t0
			      film.dataset.stage = 'overlay'
			          // If no usable glyph was drawn, fall back to the sans font.
			      if (!titleBox || titleBox.h < 80) throw new Error('glyph mask empty')
			      buildOverlayLayout()
			          bootTiming.assets2 = performance.now() - t0
			      canvas.style.opacity = '0'
			      if (!initGL()) { enterSimple('no-webgl2'); return }
			      bootTiming.gl = performance.now() - t0
			      film.dataset.stage = 'warm'
			      canvas.classList.add('on')
			      canvas.style.opacity = '1'
			      // warm every program and FBO before the first visible frame
			      const warmStart = performance.now()
			      renderFrame(0, true)
			      buildOverlay(15600)
			      bootTiming.warm = performance.now() - warmStart
			      const firstStart = performance.now()
			      renderSplash(fixedTime === null ? 0 : fixedTime)
			      if (fixedTime !== null) gl.finish()
			      bootTiming.firstFrame = performance.now() - firstStart
			      if (fixedTime !== null || captureMode) { film.dataset.state = 'ready'; return }
			      if (bench) {
			        if (renderScale !== forceScale) { renderScale = forceScale; resize() }
			        benchData = {
			          scale: renderScale,
			          chapters: CHAPTERS.map((c) => ({ name: c.name, frames: 0, total: 0, render: 0, max: 0 })),
			          startedAt: performance.now(),
			        }
			        startPlayback()
			        return
			      }
			      if (soundEnabled) { try { if (startSound(0)) soundOn = true } catch (e) {} }
			      startPlayback()
			    } catch (e) {
			      film.dataset.stage = 'error'
			      film.dataset.error = String(e && e.stack || e)
			      console.error('[film-v3] init failed', e)
			      enterSimple('init-error')
			    }
			  }

			  replayBtn.addEventListener('click', () => { location.href = location.pathname + (clean ? '?clean=1' : '') })
			  skipBtn.addEventListener('click', skip)
			  if (soundBtn) {
			    soundBtn.addEventListener('click', () => {
			      if (!soundOn) {
			        if (startSound(currentT / 1000)) {
			          soundOn = true
			          soundBtn.textContent = '声音：开'
			        } else {
			          soundBtn.textContent = '声音：不可用'
			        }
			      } else {
			        stopSound()
			      }
			    })
			  }
			  const onPointerDown = (e) => {
			    if (!playing) return
			    if (e.button !== 0) return
			    if (e.target.closest('.controls')) return
			    skip()
			  }
			  film.addEventListener('pointerdown', onPointerDown, { capture: true })
			  cleanups.push(() => film.removeEventListener('pointerdown', onPointerDown, { capture: true }))
			  const onKeyDown = (e) => { if (e.key === 'Escape') { e.preventDefault(); finish() } }
			  document.addEventListener('keydown', onKeyDown, { capture: true })
			  cleanups.push(() => document.removeEventListener('keydown', onKeyDown, { capture: true }))
			  const onResize = () => { if (gl && !destroyed) { resize(); if (fixedTime !== null) renderSplash(currentT) } }
			  addEventListener('resize', onResize)
			  cleanups.push(() => removeEventListener('resize', onResize))
			  textures.uiImage = (() => { const c = document.createElement('canvas'); c.width = 1; c.height = 1; return c })()
			  boot()

			  function dispose() {
			    if (destroyed) return
			    destroyed = true
			    playing = false
			    simple = true
			    if (rAF) cancelAnimationFrame(rAF)
			    rAF = 0
			    if (hardTimer) clearTimeout(hardTimer)
			    stopSound()
			    if (audioCtx) { try { audioCtx.close() } catch (e) {} audioCtx = null }
			    for (const fn of cleanups.splice(0)) { try { fn() } catch (e) {} }
			    try {
			      if (gl) {
			        const lose = gl.getExtension("WEBGL_lose_context")
			        if (lose) lose.loseContext()
			      }
			    } catch (e) {}
			    if (film && film.parentNode) film.parentNode.removeChild(film)
			  }

			  return {
			    skip,
			    finish,
			    seek: (t) => {
			      if (simple) return
			      playing = false
			      if (rAF) cancelAnimationFrame(rAF)
			      rAF = 0
			      const tt = Math.max(0, Math.min(DURATION - 1, Number(t) || 0))
			      renderSplash(tt)
			      updateDOM(tt)
			    },
			    dispose,
			    debug: () => {
			      let maskPixels = 0
			      try {
			        const d = maskCanvas.getContext("2d").getImageData(0, 0, maskCanvas.width, maskCanvas.height).data
			        for (let i = 3; i < d.length; i += 4) if (d[i] > 8) maskPixels += 1
			      } catch (e) {}
			      return { titleBox, maskPixels, maskW: maskCanvas.width, maskH: maskCanvas.height, overlayCount, fallback: simple }
			    },
			    state: () => ({
			      time: currentT, playing, scale: renderScale, downgraded, fallback: simple,
			      state: film.dataset.state, reason: film.dataset.reason || "",
			    }),
			  }
			}


		function installSplashFilm(options) {
			const opts = options !== null && typeof options === "object" ? options : {};
			if (typeof document === "undefined" || document.body === null) return null;
			const existing = document.getElementById("film");
			if (existing && existing.hasAttribute("data-tl-splash")) existing.remove();
			const host = document.createElement("div");
			host.id = "film";
			host.setAttribute("data-tl-splash", "");
			host.setAttribute("data-state", "loading");
			host.setAttribute("aria-hidden", "true");
			host.innerHTML = SPLASH_FILM_DOM;
			const style = document.createElement("style");
			style.setAttribute("data-tl-splash-film-style", "");
			style.textContent = SPLASH_FILM_CSS;
			host.appendChild(style);
			for (const id of Object.keys(SPLASH_FILM_SHADERS)) {
				const entry = SPLASH_FILM_SHADERS[id];
				const tag = document.createElement("script");
				tag.id = id;
				tag.type = entry.type === "vertex" ? "x-shader/x-vertex" : "x-shader/x-fragment";
				tag.textContent = entry.src;
				host.appendChild(tag);
			}
			const skipHint = host.querySelector("#skipHint");
			if (skipHint && typeof opts.skipText === "string" && opts.skipText !== "") skipHint.textContent = opts.skipText;
			// The film is opaque: pause/hide the wallpaper video behind it to free the
			// GPU for the shader. Restore the exact prior state on every exit path.
			const scene = document.querySelector("[data-tl-scene]");
			const sceneVisibility = scene ? scene.style.visibility : "";
			const sceneVideos = scene ? [...scene.querySelectorAll("video")] : [];
			const scenePlaying = sceneVideos.map((video) => !video.paused);
			if (scene) scene.style.visibility = "hidden";
			for (const video of sceneVideos) { try { video.pause(); } catch {} }
			const restoreScene = () => {
				if (scene) scene.style.visibility = sceneVisibility;
				for (let i = 0; i < sceneVideos.length; i += 1) {
					if (scenePlaying[i]) { try { void sceneVideos[i].play().catch(() => {}); } catch {} }
				}
			};
			// Hide the whole DSH tree while the opaque film is playing; the app still
			// initialises, and the real panels are shown again just before the landing.
			const appRoot = document.getElementById("root");
			const rootVisibility = appRoot ? appRoot.style.visibility : "";
			if (appRoot) appRoot.style.visibility = "hidden";
			let rootTimer = 0;
			const restoreRoot = () => {
				if (rootTimer) { clearTimeout(rootTimer); rootTimer = 0; }
				if (appRoot) appRoot.style.visibility = rootVisibility;
				try { restoreScene(); } catch {}
			};
			rootTimer = setTimeout(restoreRoot, 16500);
			document.body.appendChild(host);
			let disposed = false;
			let hardTimer = 0;
			let api = null;
			const finishOnce = (reason) => {
				if (disposed) return;
				disposed = true;
				if (hardTimer) clearTimeout(hardTimer);
				try { if (api) api.dispose(); else if (host.parentNode) host.parentNode.removeChild(host); } catch {}
				try { restoreScene(); } catch {}
				try { restoreRoot(); } catch {}
				if (globalThis.__tlSplashFilm === api) globalThis.__tlSplashFilm = null;
				if (typeof opts.onDone === "function") opts.onDone(reason || "done");
			};
			try {
				api = createSplashFilmRuntime({
					sound: opts.sound === true,
					onDone: () => finishOnce("done"),
					onFallback: (reason) => {
						if (typeof opts.onFallback === "function") opts.onFallback(reason || "fallback");
						setTimeout(() => finishOnce("fallback"), 1800);
					},
				});
			} catch (error) {
				finishOnce("error");
				throw error;
			}
			try { globalThis.__tlSplashFilm = api; } catch {}
			hardTimer = setTimeout(() => finishOnce("timeout"), 23500);
			return {
				skip: () => { try { if (api) api.skip(); } catch {} },
				dispose: () => finishOnce("disposed"),
				status: () => (api ? api.state() : null),
			};
		}
		//#endregion
