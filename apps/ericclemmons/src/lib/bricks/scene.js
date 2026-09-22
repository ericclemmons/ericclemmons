import { createBrickAudio } from './audio.js'

// Loaded only when the homepage sculpture approaches the viewport.
export async function initBricks(root) {
const brickAudio = createBrickAudio(root.querySelector('[data-brick-sound]'))
const stage = root.querySelector('[data-brick-stage]')
const status = root.querySelector('[data-brick-status]')
let rebuilding = false
try {
  const [T, C, {default: assets}, {default: ldraw}] = await Promise.all([
    import('three'),
    import('./vendor/cannon-es.js'),
    import('./logos.json'),
    import('./ldraw.json'),
  ])
  await document.fonts.ready
  const groups = [], pieces = [], loose = [], batches = new Map()
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const palettes = {
    name: [0xffd500], cloudflare: [0xff8b00],
    testdriver: [0xb0ce31, 0x29302c, 0xf4f1e5], honor: [0xedb42e],
    stripe: [0x8b80cd], aws: [0x344650, 0xe8a035],
    starbucks: [0x16654e, 0xf0eee2], higher: [0xe54937, 0xbcb4ab],
    whitefence: [0x1682b0, 0x7b9d56],
  }
  const scene = new T.Scene()
  const camera = new T.OrthographicCamera(0, innerWidth, innerHeight, 0, .1, 3000)
  camera.position.z = 1200
  const viewSlope = .28
  function updateCamera(top = innerHeight, bottom = 0) {
    camera.right = innerWidth; camera.top = top; camera.bottom = bottom
    camera.updateProjectionMatrix()
    // Oblique view from above: depth is visible on each section's ground plane.
    camera.projectionMatrix.elements[9] = -viewSlope * camera.projectionMatrix.elements[5]
    camera.projectionMatrix.elements[13] += camera.projectionMatrix.elements[9] * camera.position.z
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
  }
  updateCamera()
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
  renderer.setSize(innerWidth, innerHeight)
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = false
  renderer.info.autoReset = false
  // One offscreen WebGL renderer feeds canvases anchored in the document.
  // Browser scrolling moves their last complete frames without waiting for JS.
  const stagePadding = 64
  const ambient = new T.AmbientLight(0xffffff, .7)
  scene.add(ambient)
  const sun = new T.DirectionalLight(0xffffff, 2.0)
  sun.castShadow = false
  scene.add(sun, sun.target)
  const fill = new T.DirectionalLight(0xffffff, 1.8)
  fill.position.set(innerWidth + 400, 300, 700)
  scene.add(fill)
  function lightStudio() {
    sun.position.set(innerWidth * .15 - 400, innerHeight + 500, -450)
    sun.target.position.set(innerWidth / 2, innerHeight / 2, 0)
    fill.position.set(innerWidth * .6, innerHeight * .8, 1100)

  }

  const world = new C.World({ gravity: new C.Vec3(0, 950, 0), allowSleep: true })
  world.broadphase = new C.SAPBroadphase(world)
  world.broadphase.axisIndex = 1
  world.solver.iterations = 5
  world.defaultContactMaterial.friction = .48
  world.defaultContactMaterial.restitution = .12
  let boundaries = [], frame = 0, last = 0, drag = null, layoutDirty = true, returning = 0
  const pointer = { x: innerWidth / 2, y: innerHeight / 2, active: false }
  function textLedges(group) {
    const lines = []
    const copy = group.section.querySelector('.role-copy, .hero-copy')
    if (!copy) return lines
    // Text-node ranges give actual wrapped lines, not the paragraph's full box.
    // This leaves whitespace and the spaces between lines open to falling tiles.
    const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT)
    const range = document.createRange()
    while (walker.nextNode()) {
      const node = walker.currentNode
      if (!node.textContent.trim()) continue
      const element = node.parentElement
      if (!element.closest('h1,h2,h3,h4,h5,h6,p,.date') || element.closest('[hidden],[aria-hidden="true"]')) continue
      const style = getComputedStyle(element)
      if (style.visibility === 'hidden' || style.display === 'none' || +style.opacity === 0) continue
      range.selectNodeContents(node)
      for (const rect of range.getClientRects()) {
        if (rect.width < 1 || rect.height < 1) continue
        const top = rect.top + scrollY + 2, bottom = rect.bottom + scrollY - 1
        const line = lines.find(line => Math.abs(line.top - top) < 2 && Math.abs(line.bottom - bottom) < 2 && rect.left <= line.right + 8 && rect.right >= line.left - 8)
        if (line) { line.left = Math.min(line.left, rect.left); line.right = Math.max(line.right, rect.right) }
        else lines.push({left: rect.left, right: rect.right, top, bottom})
      }
    }
    for (const element of group.section.querySelectorAll('[data-brick-obstacle]')) {
      const rect = element.getBoundingClientRect()
      if (rect.width && rect.height) lines.push({left:rect.left, right:rect.right, top:rect.top + scrollY, bottom:rect.bottom + scrollY})
    }
    return lines
  }
  function bounds() {
    for (const old of boundaries) world.removeBody(old)
    boundaries = []
    for (const g of groups) {
      const boundaryStart = boundaries.length
      const sectionRect = g.section.getBoundingClientRect()
      const r = { left: 0, right: innerWidth, width: innerWidth, height: sectionRect.height, bottom: sectionRect.bottom }, floor = r.bottom + scrollY - (g.key === "name" ? 18 : 44)
      const delta = g.floorDoc === undefined ? 0 : floor - g.floorDoc
      const old = g.boundsRect
      for (const p of loose) if (p.group === g) {
        p.body.position.y += delta
        if (old && (old.width !== r.width || old.left !== r.left)) {
          const mapX = x => r.left + (x - old.left) / old.width * r.width
          const margin = p.s * Math.max(p.nx, p.ny) / 2 + 2
          p.body.position.x = T.MathUtils.clamp(mapX(p.body.position.x), r.left + margin, r.right - margin)
        }
        p.body.aabbNeedsUpdate = true
      }
      g.boundsRect = { left: r.left, width: r.width }
      g.floorDoc = floor
      const mask = 1 << groups.indexOf(g)
      const options = { mass: 0, collisionFilterGroup: mask, collisionFilterMask: mask }
      g.textLedges = textLedges(g)
      for (const line of g.textLedges) {
        const height = Math.max(2, line.bottom - line.top)
        const body = new C.Body({ ...options,
          shape: new C.Box(new C.Vec3((line.right - line.left) / 2, height / (2 * Math.hypot(1, viewSlope)), 500)),
          position: new C.Vec3((line.left + line.right) / 2, (line.top + line.bottom) / 2, 0),
        })
        // Extrude along the viewing direction: the collider stays aligned with
        // the visible text even when a tumbling brick moves toward the camera.
        body.quaternion.setFromAxisAngle(new C.Vec3(1, 0, 0), Math.atan(viewSlope))
        body.textLedge = true
        boundaries.push(body)
      }
      g.el.dataset.textLedges = JSON.stringify(g.textLedges)
      const ground = new C.Body({ ...options, shape: new C.Box(new C.Vec3(r.width / 2, 12, 500)), position: new C.Vec3(r.left + r.width / 2, floor + 12, 0) })
      ground.sectionFloor = true
      boundaries.push(ground)
      // Follow the viewport top, including the oblique projection at every depth.
      const ceiling = new C.Body({ ...options, shape: new C.Plane(), position: new C.Vec3(0, scrollY, 0) })
      ceiling.quaternion.setFromAxisAngle(new C.Vec3(1, 0, 0), -Math.atan2(1, viewSlope))
      ceiling.sectionCeiling = true; g.ceiling = ceiling
      boundaries.push(ceiling)
      // Infinite side planes also cover the flight space above the row.
      for (const [x, angle] of [[r.left, Math.PI / 2], [r.right, -Math.PI / 2]]) {
        const wall = new C.Body({ ...options, shape: new C.Plane(), position: new C.Vec3(x, 0, 0) })
        wall.quaternion.setFromAxisAngle(new C.Vec3(0, 1, 0), angle)
        boundaries.push(wall)
      }
      for (let i = boundaryStart; i < boundaries.length; i++) boundaries[i].sectionGroup = g
    }
    for (const body of boundaries) if (body.sectionGroup.visible) world.addBody(body)
    stage.dataset.textColliders = String(boundaries.filter(body => body.textLedge).length)
  }
  function nearestColor(rgb, palette) {
    let best = palette[0], distance = Infinity
    for (const c of palette) {
      const d = ((rgb >> 16) - (c >> 16)) ** 2 + (((rgb >> 8) & 255) - ((c >> 8) & 255)) ** 2 + ((rgb & 255) - (c & 255)) ** 2
      if (d < distance) { best = c; distance = d }
    }
    return best
  }
  function trim(data) {
    const xs = data.cells.map(c => c[0]), ys = data.cells.map(c => c[1])
    const left = Math.min(...xs), top = Math.min(...ys)
    return { ...data, corners: (data.corners || []).map(c => ({...c,cx:c.cx-left,cy:c.cy-top})), w: Math.max(...xs) - left + 1, h: Math.max(...ys) - top + 1, cells: data.cells.map(([x, y, c]) => [x - left, y - top, c]) }
  }
  function nameGrid() {
    // Draw lettering on the stud grid itself. Straight runs and consistent
    // strokes let the tile inventory define the detail instead of a pixel font.
    const style = 'chamfered', stroke = 4, corners = []
    const glyphs = {
      E: {w:12, paths:[[[12,0],[0,0],[0,20],[12,20]],[[0,10],[10,10]]]},
      r: {w:10, paths:[[[0,20],[0,6],[10,6],[10,10]]]},
      i: {w:2, paths:[[[1,6],[1,20]],[[1,0],[1,1]]]},
      c: {w:10, paths:[[[10,6],[0,6],[0,20],[10,20]]]},
      C: {w:12, paths:[[[12,0],[0,0],[0,20],[12,20]]]},
      l: {w:2, paths:[[[1,0],[1,20]]]},
      e: {w:10, paths:[[[0,13],[10,13],[10,6],[0,6],[0,20],[10,20]]]},
      m: {w:18, paths:[[[0,20],[0,6],[18,6],[18,20]],[[9,6],[9,20]]]},
      o: {w:10, paths:[[[0,6],[10,6],[10,20],[0,20],[0,6]]]},
      n: {w:10, paths:[[[0,20],[0,6],[10,6],[10,20]]]},
      s: {w:10, paths:[[[10,6],[0,6],[0,13],[10,13],[10,20],[0,20]]]},
    }
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', {willReadFrequently:true})
    canvas.width = 180; canvas.height = 62
    ctx.strokeStyle = '#ffd500'; ctx.lineWidth = stroke
    ctx.lineCap = 'square'; ctx.lineJoin = 'miter'
    let glyphX=0,glyphY=0,roundGlyph=false
    function path(points) {
      const closed = points.length > 2 && points[0][0] === points.at(-1)[0] && points[0][1] === points.at(-1)[1]
      const vertices=closed?points.slice(0,-1):points
      const joints=vertices.map((p,i)=>{
        if(!roundGlyph||(!closed&&(i===0||i===vertices.length-1)))return {p,enter:p,exit:p}
        const prev=vertices[(i-1+vertices.length)%vertices.length],next=vertices[(i+1)%vertices.length]
        const a=Math.hypot(p[0]-prev[0],p[1]-prev[1]),b=Math.hypot(next[0]-p[0],next[1]-p[1])
        const u=[(p[0]-prev[0])/a,(p[1]-prev[1])/a],v=[(next[0]-p[0])/b,(next[1]-p[1])/b]
        if(Math.abs(u[0]*v[0]+u[1]*v[1])>.001||a<4||b<4)return {p,enter:p,exit:p}
        const enter=[p[0]-u[0]*2,p[1]-u[1]*2],exit=[p[0]+v[0]*2,p[1]+v[1]*2]
        const center=[enter[0]+v[0]*2,enter[1]+v[1]*2]
        corners.push({cx:glyphX+center[0],cy:glyphY+center[1],sx:Math.sign(p[0]-center[0]),sy:Math.sign(p[1]-center[1])})
        return {p,enter,exit,round:true}
      })
      ctx.beginPath();ctx.moveTo(...joints[0].enter)
      for(const joint of joints){ctx.lineTo(...joint.enter);if(joint.round)ctx.arcTo(...joint.p,...joint.exit,2)}
      if(closed)ctx.closePath();ctx.stroke()
    }
    for (const [row,word] of ['Eric','Clemmons'].entries()) {
      let x=4
      for (const letter of word) {
        const glyph=glyphs[letter]
        glyphX=x;glyphY=4+row*32;roundGlyph=style==='chamfered'&&letter!=='E'
        ctx.save();ctx.translate(glyphX,glyphY);glyph.paths.forEach(path);ctx.restore()
        x+=glyph.w+(stroke===4?7:6)
      }
    }
    const {data}=ctx.getImageData(0,0,canvas.width,canvas.height),cells=[]
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>150)cells.push([x,y,0xffd500])
    return trim({cells,corners})
  }
  assets.name = nameGrid()

  // A mixed inventory of studless tiles forms the continuous front surface.
  const faceInventory = [[4, 2], [2, 4], [3, 2], [2, 3], [2, 2], [4, 1], [1, 4], [3, 1], [1, 3], [2, 1], [1, 2], [1, 1]]
  const backingInventory = [[8, 2], [2, 8], [6, 2], [2, 6], [4, 2], [2, 4], [3, 2], [2, 3], [2, 2], [6, 1], [1, 6], [4, 1], [1, 4], [3, 1], [1, 3], [2, 1], [1, 2], [1, 1]]
  function addPiece(group,nx,ny,x,y,color,backing=false,curveRadius=0,curveAngle=0) {
      const p = { id: pieces.length, group, nx, ny, x, y, depth: 1.2, localZ: backing ? -.8 : 0, color, backing, curveRadius, curveAngle, body: null, s: 1, px: 0, py: 0, pz: 0 }
      pieces.push(p); group.ids.push(p.id)
      const key = group.key + (curveRadius ? '-curve'+curveRadius+'-'+curveAngle : '') + '-' + nx + 'x' + ny + (backing ? '-plate' : '-brick')
      if (!batches.has(key)) batches.set(key, { group, nx, ny, curveRadius, curveAngle, depth: p.depth, ids: [] })
      const batch = batches.get(key)
      p.slot = batch.ids.length; p.batch = batch; batch.ids.push(p.id)
  }
  function tile(group, backing) {
    const grid = new Map(group.data.cells.map(([x, y, c]) => [x + ',' + y, backing ? palettes[group.key][0] : c]))
    for(const corner of group.data.corners || []) {
      const {cx,cy,sx,sy}=corner
      const left=sx<0?cx-4:cx,top=sy<0?cy-4:cy
      for(let y=top;y<top+4;y++)for(let x=left;x<left+4;x++)grid.delete(x+','+y)
      const angle=sx>0?(sy<0?0:3): (sy<0?1:2)
      for(const radius of [4,3,2,1])addPiece(group,radius,radius,cx+sx*radius/2,cy+sy*radius/2,palettes[group.key][0],false,radius,angle)
    }
    const cells = [...group.data.cells].sort((a, b) => backing ? b[1] - a[1] || b[0] - a[0] : a[1] - b[1] || a[0] - b[0])
    const inventory = backing ? backingInventory : faceInventory
    for (const [x, y] of cells) {
      const color = grid.get(x + ',' + y)
      if (color === undefined) continue
      let chosen = [1, 1], best = -Infinity
      for (const [nx, ny] of inventory) {
        const x0 = backing ? x - nx + 1 : x, y0 = backing ? y - ny + 1 : y
        let fits = true
        for (let j = 0; j < ny && fits; j++) for (let i = 0; i < nx; i++) if (grid.get((x0 + i) + ',' + (y0 + j)) !== color) { fits = false; break }
        if (!fits) continue
        const stagger = (Math.floor(y0 / 2) % 2) * 2
        const score = nx * ny * 10 + ((x0 + nx - stagger) % 4 === 0 ? 3 : 0) + (nx > ny ? .5 : 0)
        if (score > best) { best = score; chosen = [nx, ny] }
      }
      const [nx, ny] = chosen, x0 = backing ? x - nx + 1 : x, y0 = backing ? y - ny + 1 : y
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) grid.delete((x0 + i) + ',' + (y0 + j))
      addPiece(group,nx,ny,x0+nx/2,y0+ny/2,color,backing)
    }
  }
  for (const el of document.querySelectorAll('[data-model]')) {
    const key = el.dataset.model, data = trim(assets[key])
    data.cells = data.cells.map(([x, y, c]) => [x, y, nearestColor(c, palettes[key])])
    const group = { key, el, data, ids: [], rect: null, scale: 1, q: new T.Quaternion(), facing: { x: 0, y: 0, tx: 0, ty: 0 }, section: el.closest(key === "name" ? ".hero" : ".role") }
    const canvas = document.createElement('canvas')
    canvas.className = 'row-stage'; canvas.setAttribute('aria-hidden', 'true')
    canvas.dataset.modelCanvas = key
    group.section.append(canvas)
    group.canvas = canvas; group.context = canvas.getContext('2d', { alpha: true })
    groups.push(group); tile(group, false)
  }

  // Official LDraw studless tiles, with 3× tile body depth for a more tangible rotating profile.
  // The embedded MPD contains every dependency: no runtime part-file requests.
  const { LDrawLoader } = await import('three/examples/jsm/loaders/LDrawLoader.js')
  const ldrawLoader = new LDrawLoader()
  const libraryText = Object.entries(ldraw.files).map(([name, text]) => '0 FILE ' + (name.startsWith('s/') ? 'parts/' + name : name.startsWith('48/') ? 'p/' + name : name) + '\n' + text + '\n').join('')
  const partNumbers = { '1x1': '3070b.dat', '2x1': '3069b.dat', '3x1': '63864.dat', '4x1': '2431.dat', '2x2': '3068b.dat', '3x2': '26603.dat', '4x2': '87079.dat', 'curve4':'27507.dat', 'curve3':'79393.dat', 'curve2':'27925.dat', 'curve1':'25269.dat' }
  const partGeometry = new Map()
  const ldrawTransform = new T.Matrix4().set(.05, 0, 0, 0, 0, 0, .05, 0, 0, -.15, 0, .6, 0, 0, 0, 1)
  for (const [size, file] of Object.entries(partNumbers)) {
    const mpd = '0 FILE model.ldr\n0 !LDRAW_ORG Model\n1 16 0 0 0 1 0 0 0 1 0 0 0 1 ' + file + '\n' + libraryText
    // This pinned loader's promise API propagates parsing errors to the fallback.
    const model = await ldrawLoader.partsCache.parseModel(mpd)
    model.updateMatrixWorld(true)
    const positions = [], normals = [], edges = []
    model.traverse(node => {
      if (!node.isMesh && (!node.isLineSegments || node.isConditionalLine)) return
      let geometry = node.geometry.clone()
      if (geometry.index) geometry = geometry.toNonIndexed()
      geometry.applyMatrix4(node.matrixWorld).applyMatrix4(ldrawTransform)
      const points = Array.from(geometry.attributes.position.array)
      if (node.isMesh) { positions.push(...points); normals.push(...geometry.attributes.normal.array) }
      else edges.push(...points)
      geometry.dispose()
    })
    const faces = new T.BufferGeometry()
    faces.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
    faces.setAttribute('normal', new T.Float32BufferAttribute(normals, 3))
    faces.computeBoundingBox()
    if (!positions.length || faces.boundingBox.max.z < .59 || faces.boundingBox.max.z > .61 || faces.boundingBox.min.z > -.59) throw new Error('Incomplete LDraw geometry: ' + file)
    const lines = new T.BufferGeometry()
    lines.setAttribute('position', new T.Float32BufferAttribute(edges, 3))
    if(size.startsWith('curve')) {
      const radius=+size.slice(5),box=faces.boundingBox
      const center=new T.Vector3();box.getCenter(center)
      faces.translate(-center.x,-center.y,0);lines.translate(-center.x,-center.y,0)
      // Normalize each official part to a +X/+Y quarter-circle. LDraw parts
      // use different local origins/orientations, so locate the arc center.
      const vertices=faces.attributes.position, candidates=[]
      for(const cx of [-radius/2,radius/2])for(const cy of [-radius/2,radius/2]) {
        let score=0
        for(let i=0;i<vertices.count;i++)if(vertices.getZ(i)>.59&&Math.abs(Math.hypot(vertices.getX(i)-cx,vertices.getY(i)-cy)-radius)<.035)score++
        candidates.push({cx,cy,score})
      }
      candidates.sort((a,b)=>b.score-a.score)
      const arc=candidates[0],angle=arc.cx<0?(arc.cy<0?0:Math.PI/2):(arc.cy<0?-Math.PI/2:Math.PI)
      faces.rotateZ(angle);lines.rotateZ(angle)
    }
    partGeometry.set(size, { faces, lines })
  }
  const edgeMaterial = new T.ShaderMaterial({
    vertexShader: `attribute mat4 instanceMatrix;
      void main() { gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.);
        gl_Position.z -= .000005 * gl_Position.w; }`,
    fragmentShader: `void main() { gl_FragColor = vec4(.22, .24, .23, .055); }`,
    transparent: true, depthWrite: false,
  })
  const edgeMeshes = []
  // One continuous recessed silhouette per sculpture, with no tile seams.
  // The shallow guide shares the sculpture pose, just behind the tile backs.
  for (const g of groups) {
    const resolution = 8, padding = 2
    const mask = document.createElement('canvas')
    mask.width = (g.data.w + padding * 2) * resolution
    mask.height = (g.data.h + padding * 2) * resolution
    const ctx = mask.getContext('2d')
    ctx.fillStyle = '#ffffff'
    for (const [x, y] of g.data.cells) ctx.fillRect((x + padding) * resolution, (y + padding) * resolution, resolution, resolution)
    for(const {cx,cy,sx,sy} of g.data.corners || []) {
      ctx.save();ctx.translate((cx+padding)*resolution,(cy+padding)*resolution);ctx.scale(sx*resolution,sy*resolution)
      ctx.clearRect(0,0,4,4);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(4,0);ctx.arc(0,0,4,0,Math.PI/2);ctx.closePath();ctx.fill();ctx.restore()
    }
    const texture = new T.CanvasTexture(mask)
    const insetMaterial = new T.ShaderMaterial({
      uniforms: { dark: { value: 1 }, mask: { value: texture }, edgeStep: { value: new T.Vector2() } },
      vertexShader: `varying vec2 maskUV;
        void main() { maskUV = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: `uniform float dark; uniform sampler2D mask; uniform vec2 edgeStep; varying vec2 maskUV;
        void main() {
          float coverage = texture2D(mask, maskUV).a;
          if (coverage < .001) discard;
          // Darken the whole socket by 5%, with a tight upper-left inner lip.
          float left = 1. - texture2D(mask, maskUV - vec2(edgeStep.x, 0.)).a;
          float right = 1. - texture2D(mask, maskUV + vec2(edgeStep.x, 0.)).a;
          float top = 1. - texture2D(mask, maskUV + vec2(0., edgeStep.y)).a;
          float bottom = 1. - texture2D(mask, maskUV - vec2(0., edgeStep.y)).a;
          float edge = max(max(left, right), max(top, bottom));
          vec2 inset = edgeStep * vec2(-1., 1.);
          float shade = (1. - texture2D(mask, maskUV + inset * .75).a) * .5
                      + (1. - texture2D(mask, maskUV + inset * 1.5).a) * .3
                      + (1. - texture2D(mask, maskUV + inset * 2.25).a) * .2;
          float shadowAlpha = .05 + shade * .18 + edge * .025;
          float highlightAlpha = max(right, bottom) * (1. - shade) * mix(.08, .018, dark);
          float alpha = highlightAlpha + shadowAlpha * (1. - highlightAlpha);
          // Composite the faint lower-right reflection over the black inset.
          gl_FragColor = vec4(vec3(highlightAlpha / alpha), coverage * alpha);
        }`,
      transparent: true, depthWrite: false,
    })
    g.recess = new T.Mesh(new T.PlaneGeometry(g.data.w + padding * 2, g.data.h + padding * 2), insetMaterial)
    g.recess.frustumCulled = false; g.recess.visible = false
    scene.add(g.recess)
  }
  // A studio reflection strip gives the plastic a readable highlight.
  const environmentCanvas = document.createElement('canvas')
  environmentCanvas.width = 512; environmentCanvas.height = 256
  const environmentContext = environmentCanvas.getContext('2d')
  environmentContext.fillStyle = '#777777'; environmentContext.fillRect(0, 0, 512, 256)
  const softbox = environmentContext.createLinearGradient(0, 0, 0, 256)
  softbox.addColorStop(0, '#dddddd'); softbox.addColorStop(.45, '#969696'); softbox.addColorStop(1, '#555555')
  environmentContext.fillStyle = softbox; environmentContext.fillRect(0, 0, 512, 256)
  environmentContext.fillStyle = '#ffffff'; environmentContext.fillRect(70, 25, 65, 90)
  environmentContext.fillStyle = '#e7e7e7'; environmentContext.fillRect(355, 35, 35, 115)
  const environmentTexture = new T.CanvasTexture(environmentCanvas)
  environmentTexture.mapping = T.EquirectangularReflectionMapping; environmentTexture.colorSpace = T.SRGBColorSpace
  const pmrem = new T.PMREMGenerator(renderer), environment = pmrem.fromEquirectangular(environmentTexture)
  scene.environment = environment.texture; environmentTexture.dispose(); pmrem.dispose()
  const material = new T.MeshPhysicalMaterial({ roughness: .17, metalness: 0, clearcoat: .85, clearcoatRoughness: .12, ior: 1.46, envMapIntensity: 1.05, toneMapped: false })
  // Rasterize the union of the real tile geometry, with opaque writes.
  // Overlapping LEGO parts therefore never multiply the shadow's opacity.
  const silhouetteScene = new T.Scene(), silhouetteMeshes = []
  const silhouetteVertex = `
    uniform float floorY;
    varying float heightAboveFloor;
    void main() {
      vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.);
      float height = max(0., world.y - floorY);
      heightAboveFloor = height;
      // Broad overhead softbox: keep the footprint centered below its source.
      world.z += height * .25;
      world.y = floorY;
      gl_Position = projectionMatrix * viewMatrix * world;
    }`;
  for (const g of groups) g.silhouetteMaterial = new T.ShaderMaterial({
    uniforms: { floorY: { value: 0 } },
    vertexShader: silhouetteVertex,
    fragmentShader: `varying float heightAboveFloor;
      void main() { gl_FragColor = vec4(clamp(heightAboveFloor / 700., 0., 1.), 0., 0., 1.); }`,
    blending: T.NoBlending, side: T.DoubleSide,
  })
  const maskTarget = new T.WebGLRenderTarget(1, 1, { depthBuffer: true }), blurTarget = new T.WebGLRenderTarget(1, 1, { depthBuffer: false })
  const postScene = new T.Scene(), postCamera = new T.Camera()
  const fullscreenVertex = `varying vec2 texUV; void main() { texUV = uv; gl_Position = vec4(position.xy, 0., 1.); }`
  const blurMaterial = new T.ShaderMaterial({
    uniforms: { source: { value: null }, pixel: { value: new T.Vector2() }, axis: { value: new T.Vector2(1, 0) } },
    vertexShader: fullscreenVertex,
    fragmentShader: `
      uniform sampler2D source;
      uniform vec2 pixel;
      uniform vec2 axis;
      varying vec2 texUV;
      void main() {
        // Extend the height field across the silhouette edge before filtering.
        // Even grounded bricks have a soft contact kernel; suspended ones diffuse further.
        float height = texture2D(source, texUV).r;
        for (int i = -2; i <= 2; i++) {
          height = max(height, texture2D(source, texUV + pixel * vec2(float(i) * 24., 0.)).r);
          height = max(height, texture2D(source, texUV + pixel * vec2(0., float(i) * 24.)).r);
        }
        float radius = 20.0 + height * 50.;
        float alpha = 0.;
        float total = 0.;
        for (int i = -12; i <= 12; i++) {
          float x = float(i);
          float weight = exp(-x * x / 49.5);
          alpha += texture2D(source, texUV + axis * pixel * x * radius / 12.).a * weight;
          total += weight;
        }
        gl_FragColor = vec4(height, 0., 0., alpha / total);
      }`,
    depthTest: false, depthWrite: false, blending: T.NoBlending,
  })
  // Give thin ground footprints a small contact penumbra before the blur.
  // This preserves a visible soft rim instead of averaging a narrow mask away.
  const contactMaterial = new T.ShaderMaterial({
    uniforms: { source: { value: maskTarget.texture }, pixel: blurMaterial.uniforms.pixel },
    vertexShader: fullscreenVertex,
    fragmentShader: `uniform sampler2D source; uniform vec2 pixel; varying vec2 texUV;
      void main() {
        float coverage = 0.; float height = 0.;
        for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) {
          vec4 sampleValue = texture2D(source, texUV + vec2(float(x), float(y)) * pixel * 2.4);
          coverage = max(coverage, sampleValue.a); height = max(height, sampleValue.r);
        }
        gl_FragColor = vec4(height, 0., 0., coverage);
      }`,
    depthTest: false, depthWrite: false, blending: T.NoBlending,
  })
  const compositeMaterial = new T.ShaderMaterial({
    uniforms: { source: { value: blurTarget.texture }, dark: { value: 1 } },
    vertexShader: fullscreenVertex,
    fragmentShader: `uniform sampler2D source; uniform float dark; varying vec2 texUV;
      void main() { float coverage = texture2D(source, texUV).a;
        gl_FragColor = vec4(mix(vec3(.32, .34, .32), vec3(.012, .016, .022), dark), coverage * mix(.28, .52, dark)); }`,
    depthTest: false, depthWrite: false, transparent: true,
  })
  const postQuad = new T.Mesh(new T.PlaneGeometry(2, 2), blurMaterial)
  postQuad.frustumCulled = false; postScene.add(postQuad)
  function sizeShadows(height = innerHeight) {
    const resolution = .75
    maskTarget.setSize(Math.ceil(innerWidth * resolution), Math.ceil(height * resolution))
    blurTarget.setSize(maskTarget.width, maskTarget.height)
    blurMaterial.uniforms.pixel.value.set(1 / innerWidth, 1 / height)
  }
  function renderRow(g) {
    const above = g.drawAbove || stagePadding
    const height = Math.ceil(g.box.height + above + stagePadding)
    renderer.setSize(innerWidth, height, false)
    sizeShadows(height)
    const top = innerHeight - g.box.top + above
    updateCamera(top, top - height)
    g.silhouetteMaterial.uniforms.floorY.value = innerHeight - g.floorDoc + scrollY
    for (const mesh of [...meshes, ...edgeMeshes, ...silhouetteMeshes]) mesh.visible = mesh.userData.group === g
    for (const other of groups) other.recess.visible = other === g && other.el.dataset.recess === 'visible' 
    renderer.setRenderTarget(maskTarget)
    renderer.render(silhouetteScene, camera)
    postQuad.material = contactMaterial
    renderer.setRenderTarget(blurTarget); renderer.render(postScene, postCamera)
    postQuad.material = blurMaterial
    blurMaterial.uniforms.source.value = blurTarget.texture
    blurMaterial.uniforms.axis.value.set(1, 0)
    renderer.setRenderTarget(maskTarget); renderer.render(postScene, postCamera)
    blurMaterial.uniforms.source.value = maskTarget.texture
    blurMaterial.uniforms.axis.value.set(0, 1)
    renderer.setRenderTarget(blurTarget); renderer.render(postScene, postCamera)
    renderer.setRenderTarget(null)
    postQuad.material = compositeMaterial
    renderer.render(postScene, postCamera)
    renderer.autoClear = false
    renderer.render(scene, camera)
    renderer.autoClear = true
    const canvas = g.canvas, source = renderer.domElement
    canvas.style.top = -above + 'px'
    if (canvas.width !== source.width || canvas.height !== source.height) {
      canvas.width = source.width; canvas.height = source.height
      canvas.style.height = height + 'px'
    }
    g.context.clearRect(0, 0, canvas.width, canvas.height)
    g.context.drawImage(source, 0, 0)
    canvas.dataset.frames = +(canvas.dataset.frames || 0) + 1
  }
  function drawScene(now) {
    renderer.info.reset()
    for (const g of groups) {
      if (!g.visible && g.renderKey) continue
      const moving = (drag?.group === g && !drag.moved && !reducedMotion.matches) || g.ids.some(id => pieces[id].returning || (pieces[id].body && pieces[id].body.sleepState !== C.Body.SLEEPING))
      // Expand only as far as airborne pieces need. Keep that extent during
      // flight to avoid reallocating a large canvas on every bounce, then trim.
      const rowTop = g.box.top + scrollY
      let needed = stagePadding
      for (const id of g.ids) {
        const p = pieces[id], body = p.body
        if (!body) continue
        const radius = p.s * Math.hypot(p.nx, p.ny, p.depth) / 2
        needed = Math.max(needed, rowTop - body.position.y - body.position.z * viewSlope + radius + stagePadding)
      }
      needed = Math.ceil(needed / 32) * 32
      g.drawAbove = moving ? Math.max(g.drawAbove || stagePadding, needed) : needed
      // Page position is deliberately absent: static artwork needs no repaint
      // during scroll. A moving/returning tile still refreshes its own row.
      const key = [innerWidth, g.box.height, g.drawAbove, g.scale, g.floorDoc, g.facing.x.toFixed(4), g.facing.y.toFixed(4),
        g.ids.filter(id => pieces[id].body || pieces[id].returning).length, moving ? now : 'rest'].join(':')
      if (g.renderKey === key) continue
      renderRow(g); g.renderKey = key
    }
  }
  sizeShadows()
  const color = new T.Color(), meshes = []
  for (const batch of batches.values()) {
    const size = Math.max(batch.nx, batch.ny) + 'x' + Math.min(batch.nx, batch.ny)
    const part = partGeometry.get(batch.curveRadius?'curve'+batch.curveRadius:size), geometry = part.faces.clone(), edges = part.lines.clone()
    for (const shape of [geometry, edges]) {
      if (batch.curveRadius) shape.rotateZ(batch.curveAngle*Math.PI/2)
      else if (batch.nx < batch.ny) shape.rotateZ(Math.PI / 2)
      shape.scale((batch.nx - .006) / batch.nx, (batch.ny - .006) / batch.ny, 1)
    }
    batch.bricks = new T.InstancedMesh(geometry, material, batch.ids.length)
    const mesh = batch.bricks
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage)
    mesh.frustumCulled = false; mesh.userData.group = batch.group
    scene.add(mesh); meshes.push(mesh)
    const silhouette = new T.InstancedMesh(mesh.geometry, batch.group.silhouetteMaterial, mesh.count)
    silhouette.instanceMatrix = mesh.instanceMatrix
    silhouette.frustumCulled = false; silhouette.userData.group = batch.group
    silhouetteScene.add(silhouette); silhouetteMeshes.push(silhouette)
    const edgeGeometry = new T.InstancedBufferGeometry()
    edgeGeometry.setAttribute('position', edges.attributes.position)
    edgeGeometry.setAttribute('instanceMatrix', mesh.instanceMatrix)
    edgeGeometry.instanceCount = batch.ids.length
    const lines = new T.LineSegments(edgeGeometry, edgeMaterial)
    lines.frustumCulled = false; lines.userData.group = batch.group
    scene.add(lines); edgeMeshes.push(lines)
    for (const id of batch.ids) {
      const p = pieces[id]
      color.setHex(p.color); batch.bricks.setColorAt(p.slot, color)
    }
  }
  const dummy = new T.Object3D(), q = new T.Quaternion(), v = new T.Vector3(), euler = new T.Euler()
  function layout() {
    for (const g of groups) {
      g.rect = g.el.getBoundingClientRect()
      g.box = g.section.getBoundingClientRect()
      g.hoverBox = (g.el.closest(".hero, .role") || g.section).getBoundingClientRect()
      g.visible = g.box.bottom > -100 && g.box.top < innerHeight + 100
      // Reserve room for the entire silhouette, including the mouse tilt.
      const maxW = g.data.w + g.data.h * .08 + 6, maxH = g.data.h + g.data.w * .07 + 6
      const pad = g.key === 'name' ? 10 : 16
      g.scale = Math.min((g.rect.width - pad * 2) / maxW, (g.rect.height - pad * 2) / maxH)
      g.cx = g.key === 'name' ? g.rect.left + g.data.w * g.scale / 2 + pad : g.rect.left + g.rect.width / 2
      g.cy = innerHeight - (g.rect.top + g.rect.height / 2)
    }
    const geometryKey = innerWidth + ":" + groups.map(g => [g.box.width, g.box.bottom + scrollY].join()).join(";")
    if (geometryKey !== stage.dataset.geometry) { bounds(); stage.dataset.geometry = geometryKey }
    for (const g of groups) {
      if (g.ceiling.position.y === scrollY) continue
      g.ceiling.position.y = scrollY
      g.ceiling.aabbNeedsUpdate = true
      world.broadphase.dirty = true
    }
    layoutDirty = false
  }
  function updateFacing() {
    if (layoutDirty) layout()
    // The hero and each career row are independent hover stages. Floors keep
    // their existing bounds; the title responds throughout its hero section.
    const hovered = pointer.active && !reducedMotion.matches
      ? groups.find(g => pointer.y >= g.hoverBox.top && pointer.y < g.hoverBox.bottom)
      : null
    stage.dataset.hoveredModel = hovered?.key || ''
    for (const g of groups) {
      const f = g.facing
      if (drag) {
        // Keep the exact pressed pose, including during a sweep across rows.
        f.tx = f.x; f.ty = f.y
      } else if (g === hovered && g.visible) {
        const distance = Math.max(420, Math.min(700, innerWidth * .7))
        // Keep the local center flat. Pitch only tips back toward the top of
        // the screen, capped at a subtle 12 degrees; yaw still follows freely.
        const dx = pointer.x - g.cx
        const dy = pointer.y - (innerHeight - g.cy)
        f.ty = Math.atan2(dx, distance)
        f.tx = Math.max(-Math.PI / 15, Math.min(0, Math.atan2(dy, distance)))
      } else { f.tx = 0; f.ty = 0 }
      f.x += (f.tx - f.x) * .14; f.y += (f.ty - f.y) * .14
      // DOM-backed state is useful when verifying the two-axis interaction.
      if (g.visible) g.el.dataset.facing = JSON.stringify({pitch: +f.x.toFixed(3), yaw: +f.y.toFixed(3)})
    }
  }
  function poseGroups() {
    for (const g of groups) {
      g.q.setFromEuler(euler.set(g.facing.x, g.facing.y, 0, "YXZ"))
      // Tilting a wide sculpture must not lower its corners through its floor.
      let lowest = -Infinity
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
        v.set(x * g.data.w * g.scale / 2, y * g.data.h * g.scale / 2, z * g.scale * .6).applyQuaternion(g.q)
        lowest = Math.max(lowest, innerHeight - g.cy - v.y + v.z * viewSlope)
      }
      const lift = Math.max(0, lowest - (g.floorDoc - scrollY - 8))
      g.lift = lift
      for (const id of g.ids) {
        const p = pieces[id]
        v.set((p.x - g.data.w / 2) * g.scale, (g.data.h / 2 - p.y) * g.scale, p.localZ * g.scale).applyQuaternion(g.q)
        p.homeX = g.cx + v.x; p.homeY = g.cy + lift + v.y; p.homeZ = v.z
        if (p.body) continue
        p.s = g.scale
        p.px = p.homeX; p.py = innerHeight - p.homeY; p.pz = p.homeZ
      }
    }
  }
  function paint(now = performance.now()) {
    if (layoutDirty) layout()
    poseGroups()
    const charge = chargeLevel(drag, now)
    stage.dataset.charge = charge.toFixed(3)
    stage.dataset.interaction = drag ? (drag.moved ? 'sweeping' : 'charging') : 'idle'
    for (const mesh of [...meshes, ...edgeMeshes]) mesh.visible = mesh.userData.group.visible
    for (const p of pieces) {
      if (!p.group.visible && p.group.renderKey && !p.returning) continue
      let x = p.px, y = innerHeight - p.py, z = p.pz
      if (p.body) {
        const b = p.body
        x = b.position.x; y = innerHeight - (b.position.y - scrollY); z = b.position.z
        q.set(-b.quaternion.x, b.quaternion.y, -b.quaternion.z, b.quaternion.w)
      } else {
        q.copy(p.group.q)
        if (p.returning) {
          const r = p.returning, u = T.MathUtils.clamp((now - r.start) / r.duration, 0, 1)
          // Travel directly from the current pile pose to the live home pose.
          // Row-relative origins keep the return attached during scroll/resize.
          const eased = u * u * u * u
          x = T.MathUtils.lerp(r.from.x * innerWidth, p.px, eased)
          const originY = p.group.floorDoc + r.from.y - scrollY
          y = innerHeight - T.MathUtils.lerp(originY, p.py, eased)
          z = T.MathUtils.lerp(r.from.z, p.pz, eased)
          q.copy(r.from.q).slerp(p.group.q, eased)
          p.s = T.MathUtils.lerp(r.scale, p.group.scale, eased)
          if (u === 1) {
            p.returning = null; returning--
          }
        }
      }
      if (charge > 0 && !reducedMotion.matches && !p.body && !p.returning && p.group === drag?.group) {
        const radius = blastRadius(p.s, charge)
        const distance = Math.hypot(p.px - drag.x, p.py + p.pz * viewSlope - drag.y)
        const amplitude = Math.max(0, 1 - distance / radius) * (.25 + charge * 2.6)
        // Visual vibration only: connections stay intact until release.
        x += Math.sin(now * .085 + p.id * 2.4) * amplitude
        y += Math.sin(now * .099 + p.id * 1.7) * amplitude
        z += Math.cos(now * .072 + p.id) * amplitude * .5
      }
      p.screenX = x; p.screenY = innerHeight - y + z * viewSlope
      dummy.position.set(x, y, z); dummy.quaternion.copy(q); dummy.scale.setScalar(p.s); dummy.updateMatrix()
      p.batch.bricks.setMatrixAt(p.slot, dummy.matrix)

    }
    for (const mesh of meshes) if (mesh.userData.group.visible || !mesh.userData.group.renderKey) mesh.instanceMatrix.needsUpdate = true
    for (const g of groups) {
      const revealed = g.ids.some(id => pieces[id].body || pieces[id].returning)
      g.recess.visible = g.visible && revealed
      v.set(0, 0, -g.scale * .64).applyQuaternion(g.q)
      g.recess.position.set(g.cx + v.x, g.cy + g.lift + v.y, v.z)
      g.recess.quaternion.copy(g.q)
      g.recess.scale.setScalar(g.scale)
      g.recess.material.uniforms.edgeStep.value.set(.65 / (g.scale * (g.data.w + 4)), .65 / (g.scale * (g.data.h + 4)))
      g.el.dataset.recess = revealed ? 'visible' : 'hidden'
    }
    stage.dataset.ghosts = pieces.filter(p => p.body || p.returning).length
    drawScene(now)
    if (!returning && rebuilding) {
      rebuilding = false
      status.textContent = loose.length ? 'Section rebuilt.' : 'All sculptures rebuilt.'
    }
  }
  let measurements = []
  function tick(now) {
    const measureStart = performance.now()
    frame = 0
    const dt = Math.min((now - last) / 1000 || 1 / 60, 1 / 30); last = now
    updateFacing()
    // Offscreen rows retain their poses but leave the solver entirely. They
    // resume only when visible; pointer motion in another row cannot wake them.
    for (const body of boundaries) syncPhysicsBody(body, body.sectionGroup.visible && (!body.sectionCeiling || body.sectionGroup.floorDoc > scrollY + stagePadding))
    for (const p of loose) syncPhysicsBody(p.body, p.group.visible)
    for (const p of loose) {
      if (!p.group.visible || p.settled) continue
      if (p.settleBudget === null) {
        const gravity = world.gravity.y
        const upward = Math.max(0, -p.body.velocity.y)
        const height = Math.max(0, p.group.floorDoc - p.body.position.y)
        const flight = (upward + Math.sqrt(upward * upward + 2 * gravity * height)) / gravity
        // Allow a full flight plus another for bounces, with a small cushion.
        p.settleBudget = Math.min(6, Math.max(2.5, flight * 2 + .8))
      }
      // Count visible simulation time, so scrolling away cannot freeze a
      // paused, airborne piece immediately upon returning to its section.
      p.settleElapsed += dt
      if (p.body.sleepState === C.Body.SLEEPING || p.settleElapsed >= p.settleBudget) stickPiece(p)
    }
    const needsPhysics = loose.some(p => p.group.visible && p.body.sleepState !== C.Body.SLEEPING)
    if (needsPhysics) {
      // Don't double the solver work to catch up after an already slow frame.
      world.step(1 / 60, dt, 1)
      // Support can be a floor, a line of text, or another tile in the pile.
      const supported = new Set()
      for (const contact of world.contacts) {
        if (contact.ni.y > .35 && contact.bi.brick) supported.add(contact.bi.brick)
        if (contact.ni.y < -.35 && contact.bj.brick) supported.add(contact.bj.brick)
      }
      for (const p of loose) {
        const body = p.body
        if (!p.group.visible || body.sleepState === C.Body.SLEEPING) continue
        const age = now - p.kickedAt
        const resting = supported.has(p)
        const slow = body.velocity.lengthSquared() < 500 && body.angularVelocity.lengthSquared() < 9
        p.quiet = resting && slow ? (p.quiet || 0) + dt : 0
        // Damp contact chatter, then put supported tiles to bed. A deliberate
        // sweep/blast starts a fresh settling window, even for sleeping piles.
        if (resting && age > 2000) {
          const damping = Math.exp(-dt * 5)
          body.velocity.scale(damping, body.velocity)
          body.angularVelocity.scale(damping, body.angularVelocity)
        }
        if (p.quiet > .45) stickPiece(p)
      }
    }
    brickAudio.flush()
    paint(now)
    measurements.push(performance.now() - measureStart)
    if (measurements.length === 30) { stage.dataset.performance = JSON.stringify({ cpuMs: +(measurements.reduce((a,b) => a+b,0) / 30).toFixed(2), bodies: loose.length, awake: loose.filter(p => p.group.visible && p.body.sleepState !== C.Body.SLEEPING).length, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }); measurements = [] }
    const awake = loose.filter(p => p.group.visible && p.body.sleepState !== C.Body.SLEEPING).length
    const active = returning || drag || groups.some(g => Math.abs(g.facing.tx - g.facing.x) + Math.abs(g.facing.ty - g.facing.y) > .0002) || awake
    if (active) frame = requestAnimationFrame(tick)
    else stage.dataset.performance = JSON.stringify({ cpuMs: +(performance.now() - measureStart).toFixed(2), bodies: loose.length, awake, idle: true, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles })
  }
  function requestDraw() { if (!frame && !document.hidden) { last = performance.now(); frame = requestAnimationFrame(tick) } }
  function syncPhysicsBody(body, visible) {
    if (visible && body.world !== world) world.addBody(body)
    else if (!visible && body.world === world) world.removeBody(body)
  }
  function wakePiece(p) {
    p.kickedAt = performance.now(); p.quiet = 0
    if (p.settled) {
      p.body.type = C.Body.DYNAMIC
      p.body.mass = .025 * p.nx * p.ny * p.depth
      p.body.updateMassProperties()
    }
    p.settled = false; p.settleElapsed = 0; p.settleBudget = null
    syncPhysicsBody(p.body, p.group.visible)
    p.body.wakeUp()
  }
  function stickPiece(p) {
    // Sleeping dynamic bodies can be woken by contact chatter. A static body
    // keeps its collision shape but stays put until an intentional gesture.
    const body = p.body
    body.sleep()
    body.type = C.Body.STATIC; body.mass = 0
    body.updateMassProperties()
    p.settled = true; p.quiet = 0
    p.group.renderKey = ''
  }
  function curvedCollider(p,body) {
    // Three convex wedges approximate each physical curved tile, leaving its
    // inner opening free instead of colliding with a solid bounding square.
    const r=p.curveRadius,inner=r-1,angle=p.curveAngle*Math.PI/2,s=p.s
    for(let segment=0;segment<3;segment++) {
      const a=segment*Math.PI/6,b=(segment+1)*Math.PI/6
      const outline=[[r*Math.cos(a),r*Math.sin(a)],[r*Math.cos(b),r*Math.sin(b)]]
      if(inner)outline.push([inner*Math.cos(b),inner*Math.sin(b)],[inner*Math.cos(a),inner*Math.sin(a)])
      else outline.push([0,0])
      const points=outline.map(([x,y])=>{x-=r/2;y-=r/2;return [(x*Math.cos(angle)-y*Math.sin(angle))*s,-(x*Math.sin(angle)+y*Math.cos(angle))*s]})
      points.reverse()
      const vertices=[],n=points.length
      const cx=points.reduce((sum,p)=>sum+p[0],0)/n,cy=points.reduce((sum,p)=>sum+p[1],0)/n
      for(const z of [-s*p.depth/2,s*p.depth/2])for(const [x,y] of points)vertices.push(new C.Vec3(x-cx,y-cy,z))
      const faces=[Array.from({length:n},(_,i)=>n-1-i),Array.from({length:n},(_,i)=>i+n)]
      for(let i=0;i<n;i++)faces.push([i,(i+1)%n,(i+1)%n+n,i+n])
      body.addShape(new C.ConvexPolyhedron({vertices,faces}),new C.Vec3(cx,cy,0))
    }
  }
  function detach(p, dx = 0, dy = 0) {
    if (p.body) { wakePiece(p); return }
    const s = p.s, mask = 1 << groups.indexOf(p.group), b = new C.Body({ collisionFilterGroup: mask, collisionFilterMask: mask, mass: .025 * p.nx * p.ny * p.depth, shape: p.curveRadius ? undefined : new C.Box(new C.Vec3(s * (p.nx - .008) / 2, s * (p.ny - .008) / 2, s * p.depth / 2)), position: new C.Vec3(p.px, p.py + scrollY, p.pz), linearDamping: .35, angularDamping: .6, sleepSpeedLimit: 15, sleepTimeLimit: .3 })
    if (p.curveRadius) curvedCollider(p,b)
    b.quaternion.set(-p.group.q.x, p.group.q.y, -p.group.q.z, p.group.q.w)
    b.velocity.set(dx, dy, (Math.random() - .5) * 20)
    b.angularVelocity.set((Math.random() - .5) * 3, (Math.random() - .5) * 3, (Math.random() - .5) * 5)
    b.addEventListener('collide', event => {
      if (!p.group.visible || (event.body.mass > 0 && b.id > event.body.id)) return
      const now = performance.now()
      if (event.body.textLedge) stage.dataset.textContacts = String(+(stage.dataset.textContacts || 0) + 1)
      if (!event.body.sectionFloor) return
      const speed = Math.abs(event.contact.getImpactVelocityAlongNormal())
      if (speed < 65 || now - (p.lastSound || -Infinity) < 90) return
      p.lastSound = now
      brickAudio.impact(speed, p.nx * p.ny, b.position.x / innerWidth)
    })
    b.brick = p; p.kickedAt = performance.now(); p.quiet = 0
    p.settled = false; p.settleElapsed = 0; p.settleBudget = null
    if (p.group.visible) world.addBody(b); p.body = b; p.group.zone.disabled = false; loose.push(p)
  }
  function burst(group, x, y, all = false) {
    if (returning) return
    if (layoutDirty) { layout(); poseGroups() }
    let n = 0
    for (const id of group.ids) {
      const p = pieces[id]
      if (p.body || (!all && Math.hypot(p.px - x, p.py - y) > Math.max(34, group.scale * 7))) continue
      detach(p, (p.px - x) * .6 + (Math.random() - .5) * 65, -55 - Math.random() * 70); n++
    }
    if (n) brickAudio.pop(0, x / innerWidth)
    status.textContent = n + ' bricks added to the playground.'
    requestDraw()
  }
  function chargeLevel(press, now = performance.now()) {
    return !press || press.moved ? 0 : Math.max(0, Math.min(1, (now - press.started - 120) / 1600))
  }
  function blastRadius(scale, charge = 0) {
    return Math.max(42, Math.min(62, scale * 10)) * (1 + charge * 2.8)
  }
  function blast(x, y, charge = 0, group = null) {
    if (returning) return
    if (layoutDirty) { layout(); poseGroups() }
    const emptyLogo = groups.find(g => g.ids.every(id => pieces[id].body)
      && x >= g.rect.left && x <= g.rect.right && y >= g.rect.top && y <= g.rect.bottom)
    if (emptyLogo) { reset(emptyLogo); return }
    const pile = groups.find(g => g.ids.every(id => pieces[id].body) && g.ids.some(id => {
      const p = pieces[id], pos = p.body.position
      return Math.hypot(pos.x - x, pos.y - scrollY + pos.z * viewSlope - y) < Math.max(36, p.s * Math.max(p.nx, p.ny))
    }))
    if (pile) { reset(pile); return }
    let count = 0, touched = false
    for (const p of pieces) {
      if (!p.group.visible || (group && p.group !== group)) continue
      const px = p.body ? p.body.position.x : p.px, py = p.body ? p.body.position.y - scrollY + p.body.position.z * viewSlope : p.py + p.pz * viewSlope
      const dx = px - x, dy = py - y, radius = blastRadius(p.s, charge)
      const distance = Math.hypot(dx, dy)
      if (distance > radius) continue
      touched = true
      const force = ((1 - distance / radius) * 220 + 65) * (1 + charge * 1.5)
      if (!p.body) { detach(p); count++ }
      wakePiece(p)
      p.body.velocity.x += dx / Math.max(distance, 1) * force
      p.body.velocity.y += dy / Math.max(distance, 1) * force - 110 * (1 + charge)
      p.body.velocity.z += 25 * (1 + charge)
      p.body.angularVelocity.z += dx / radius * 5
    }
    if (touched) brickAudio.pop(charge, x / innerWidth)
    stage.dataset.lastBlast = JSON.stringify({ charge: +charge.toFixed(3), count, group: group?.key || '' })
    if (count || loose.length) status.textContent = count ? count + ' bricks scattered into the playground.' : 'Loose bricks scattered.'
    requestDraw()
  }
  function reset(group = null) {
    if (returning || !loose.length) return
    brickAudio.stop()
    drag = null; document.body.classList.remove('grabbing')
    const now = performance.now()
    const selected = loose.filter(p => !group || p.group === group)
    if (!selected.length) return
    for (const p of selected) {
      if (!reducedMotion.matches) {
        const b = p.body
        p.returning = {
          from: { x: b.position.x / innerWidth, y: b.position.y - p.group.floorDoc, z: b.position.z,
            q: new T.Quaternion(-b.quaternion.x, b.quaternion.y, -b.quaternion.z, b.quaternion.w) },
          start: now + (p.id % 11) * 6, duration: 700, scale: p.s,
        }
        returning++
      }
      world.removeBody(p.body); p.body = null
    }
    for (let i = loose.length - 1; i >= 0; i--) if (!loose[i].body) loose.splice(i, 1)
    layoutDirty = true; rebuilding = true
    for (const g of groups) g.zone.disabled = !g.ids.some(id => pieces[id].body)
    status.textContent = 'Bricks are returning directly to their places.'
    requestDraw()
  }
  // Sweep the complete pointer segment so a fast gesture cannot skip bricks.
  // Influence fades toward its edge; the motion supplies the push direction.
  function sweep(ax, ay, bx, by, elapsed) {
    if (layoutDirty) { layout(); poseGroups() }
    const dx = bx - ax, dy = by - ay, lengthSquared = dx * dx + dy * dy
    if (lengthSquared < 1) return 0
    const dt = Math.max(8, Math.min(elapsed, 50)) / 1000
    const speed = Math.hypot(dx, dy) / dt
    const gain = Math.min(1, 650 / Math.max(speed, 1)) * .72 / dt
    const vx = dx * gain, vy = dy * gain
    let dislodged = 0
    for (const p of pieces) {
      if (!p.group.visible) continue
      const x = p.body ? p.body.position.x : p.px, y = p.body ? p.body.position.y - scrollY + p.body.position.z * viewSlope : p.py + p.pz * viewSlope
      const radius = Math.max(30, Math.min(44, p.s * 7))
      if (y < -radius || y > innerHeight + radius) continue
      const t = T.MathUtils.clamp(((x - ax) * dx + (y - ay) * dy) / lengthSquared, 0, 1)
      const cx = ax + t * dx, cy = ay + t * dy
      const distance = Math.hypot(Math.max(0, Math.abs(x - cx) - p.s * p.nx * .42), Math.max(0, Math.abs(y - cy) - p.s * p.ny * .42))
      if (distance >= radius) continue
      const falloff = 1 - distance / radius
      const weight = falloff * falloff * (3 - 2 * falloff)
      if (weight < .035) continue
      const influence = .2 + .8 * weight
      if (!p.body) { detach(p, vx * influence, vy * influence); dislodged++ }
      else {
        wakePiece(p)
        const blend = (1 - Math.exp(-dt * 18)) * influence
        p.body.velocity.x += (vx - p.body.velocity.x) * blend
        p.body.velocity.y += (vy - p.body.velocity.y) * blend
      }
      p.body.angularVelocity.z += T.MathUtils.clamp((dx * .015 - dy * .008) * weight, -.7, .7)
    }
    requestDraw()
    return dislodged
  }
  document.addEventListener('pointerdown', e => {
    if (returning || drag || e.isPrimary === false || e.target.closest('[data-safe]') || e.button !== 0) return
    if (e.pointerType !== 'mouse' && !e.target.closest('[data-model], .pile-zone')) return
    if (layoutDirty) layout()
    const group = groups.find(g => e.clientY >= g.hoverBox.top && e.clientY < g.hoverBox.bottom)
    if (!group) return
    brickAudio.unlock()
    drag = { group, started: performance.now(), x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, time: e.timeStamp, moved: false, dislodged: 0, target: e.target, pointerId: e.pointerId }
    e.target.setPointerCapture?.(e.pointerId)
    requestDraw()
  })
  const cursorShadow = document.createElement('div')
  cursorShadow.className = 'cursor-shadow'; cursorShadow.setAttribute('aria-hidden', 'true'); stage.append(cursorShadow)
  cursorShadow.innerHTML = '<svg viewBox="0 0 26 30" aria-hidden="true"><path fill="currentColor" d="M7 15V6a1.5 1.5 0 0 1 3 0v7V3.5a1.5 1.5 0 0 1 3 0V13 4.5a1.5 1.5 0 0 1 3 0V14 7a1.5 1.5 0 0 1 3 0v9l2-3a1.8 1.8 0 0 1 3 2l-4 8c-1 2-3 4-6 4h-2c-3 0-5-2-6-4l-4-7a1.8 1.8 0 0 1 3-2l2 2Z"/></svg>'
  document.addEventListener('pointermove', e => {
    const safe = !!e.target.closest('[data-safe]')
    const cursorGroup = groups.find(g => e.clientY >= g.box.top && e.clientY <= g.box.bottom)
    const cursorHeight = cursorGroup ? Math.max(0, cursorGroup.floorDoc - scrollY - e.clientY) : 0
    const cursorFloor = cursorGroup ? cursorGroup.floorDoc - scrollY : e.clientY
    cursorShadow.style.opacity = e.pointerType === 'mouse' && !safe && cursorGroup ? '1' : '0'
    cursorShadow.style.transform = `translate3d(${e.clientX}px, ${cursorFloor + cursorHeight * .25 * viewSlope}px, 0)`
    // Blur after flattening the hand so its vertical softness isn't compressed.
    cursorShadow.style.filter = `blur(${4 + cursorHeight * .008}px)`

    if (e.pointerType === 'mouse' && !reducedMotion.matches) { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; requestDraw() }
    if (!drag) return
    const d = drag
    if (e.pointerId !== d.pointerId) return
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) {
      d.moved = true; document.body.classList.add('grabbing')
    }
    if (d.moved) {
      e.preventDefault()
      d.dislodged += sweep(d.lastX, d.lastY, e.clientX, e.clientY, e.timeStamp - d.time)
      d.lastX = e.clientX; d.lastY = e.clientY; d.time = e.timeStamp
    }
  })
  function release(e) {
    if (!drag || e.pointerId !== drag.pointerId) return
    brickAudio.stop()
    const d = drag; drag = null; document.body.classList.remove('grabbing')
    if (d.moved) { status.textContent = d.dislodged ? d.dislodged + ' bricks swept into the playground.' : 'Bricks pushed along with your gesture.'; requestDraw() }
    else if (e.type === 'pointerup') blast(e.clientX, e.clientY, chargeLevel(d), d.group)
    requestDraw()
    if (d.target.hasPointerCapture?.(d.pointerId)) d.target.releasePointerCapture(d.pointerId)
  }
  document.addEventListener('pointerup', e => release(e))
  document.addEventListener('pointercancel', e => release(e))
  document.addEventListener('lostpointercapture', e => release(e))
  addEventListener('blur', () => { if (drag) release({ pointerId: drag.pointerId }) })
  document.documentElement.addEventListener('pointerleave', () => { cursorShadow.style.opacity = '0'; pointer.active = false; requestDraw() })
  for (const g of groups) g.el.addEventListener('click', e => { if (e.detail === 0) { brickAudio.unlock(); layout(); poseGroups(); if (g.ids.every(id => pieces[id].body)) reset(g); else burst(g, g.rect.left + g.rect.width / 2, g.rect.top + g.rect.height / 2, true) } })
  root.addEventListener('keydown', e => { if (e.key === 'Escape') { const g=groups.find(g=>g.el===document.activeElement||g.zone===document.activeElement); if(g)reset(g) } })
  document.querySelector('.brick-title')?.addEventListener('keydown', e => { if(e.key==='Escape')reset(groups.find(g=>g.key==='name')) })
  addEventListener('scroll', () => { layoutDirty = true; requestDraw() }, { passive: true })
  addEventListener('resize', () => {
    for (const g of groups) g.renderKey = ''
    bounds(); updateCamera(); sizeShadows()
    renderer.setSize(innerWidth, innerHeight); lightStudio(); layoutDirty = true; requestDraw()
  })
  const textLayoutObserver = new ResizeObserver(() => {
    stage.dataset.geometry = ''; layoutDirty = true; requestDraw()
  })
  for (const g of groups) {
    for (const element of g.section.querySelectorAll('.role-copy, .hero-copy, [data-brick-obstacle]')) textLayoutObserver.observe(element)
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && drag) release({ pointerId: drag.pointerId })
    if (!document.hidden) requestDraw()
  })
  renderer.domElement.addEventListener('webglcontextlost', e => {
    document.body.classList.add('bricks-unavailable')
    e.preventDefault(); document.body.classList.remove('bricks-ready'); stage.style.display = 'none'; for (const g of groups) g.canvas.style.display = 'none'
    status.textContent = '3D paused. Reload to play again.'
  })
  for (const g of groups) {
    const zone = document.createElement('button')
    zone.className = 'pile-zone'; zone.disabled = true; g.zone = zone; zone.setAttribute('aria-label', 'Rebuild ' + (g.key === 'name' ? 'Eric Clemmons' : g.key) + ' from its pile')
    zone.addEventListener('click', e => { if (e.detail === 0) reset(g) })
    g.section.append(zone)
  }
  function applyTheme() {
    const dark = document.documentElement.classList.contains('dark')
    ambient.intensity = dark ? .7 : .9
    fill.intensity = dark ? 1.4 : 1.8
    compositeMaterial.uniforms.dark.value = dark ? 1 : 0
    for (const g of groups) {
      g.recess.material.uniforms.dark.value = dark ? 1 : 0
      g.renderKey = ''
    }
    requestDraw()
  }
  let dark = document.documentElement.classList.contains('dark')
  new MutationObserver(() => {
    const next = document.documentElement.classList.contains('dark')
    if (next !== dark) { dark = next; applyTheme() }
  }).observe(document.documentElement, {attributes:true, attributeFilter:['class']})
  applyTheme()
  bounds(); lightStudio(); layout(); paint(); document.body.classList.add('bricks-ready'); for (const g of groups) g.el.disabled = false
  status.textContent = ''
} catch (error) {
  document.body.classList.add('bricks-unavailable')
  console.error(error)
  status.textContent = 'Interactive logos are unavailable. The full experience history is still available below.'
}

}
