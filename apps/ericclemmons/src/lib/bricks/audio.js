// Embedded Raycast/NuPhy ground impacts and cork pop. Charging is intentionally silent.
export function createBrickAudio(button) {
  let context, master, popBuffer, popReady, enabled = true
  let impacts = [], nextImpact = 0, voices = 0, samples = []
  const key = 'career-sound-enabled'
  try { enabled = localStorage.getItem(key) !== 'false' } catch {}
  function updateControl() {
    button.dataset.enabled = String(enabled)
    button.setAttribute('aria-pressed', String(enabled))
    button.setAttribute('aria-label', enabled ? 'Mute sound effects' : 'Enable sound effects')
    button.dataset.audioState = context?.state || 'locked'
  }
  function unlock() {
    if (!enabled || document.hidden) return
    try {
      if (!context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        if (!AudioContext) { enabled = false; updateControl(); return }
        context = new AudioContext()
        master = context.createGain(); master.gain.value = .38
        const limiter = context.createDynamicsCompressor()
        limiter.threshold.value = -16; limiter.knee.value = 12; limiter.ratio.value = 5
        limiter.attack.value = .003; limiter.release.value = .12
        master.connect(limiter); limiter.connect(context.destination)
        Promise.all([1,2,3].map(async index => {
          const response = await fetch(`/bricks/raycast-nuphy-hit-${index}.wav`)
          return context.decodeAudioData(await response.arrayBuffer())
        })).then(buffers => {
          // Level-match recordings without changing their natural envelopes.
          for (const buffer of buffers) {
            let peak = 0
            for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
              for (const value of buffer.getChannelData(channel)) peak = Math.max(peak, Math.abs(value))
            }
            const gain = peak ? .45 / peak : 1
            for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
              const data = buffer.getChannelData(channel)
              for (let i = 0; i < data.length; i++) data[i] *= gain
            }
          }
          samples = buffers; button.dataset.collisionReady = String(samples.length)
        }).catch(() => {})
        popReady = fetch('/bricks/cork-pop.mp3').then(response => response.arrayBuffer()).then(bytes => context.decodeAudioData(bytes)).then(buffer => {
          popBuffer = buffer; button.dataset.popReady = 'true'
        }).catch(() => {})
        context.onstatechange = updateControl
      }
      if (context.state === 'suspended') context.resume().catch(() => {})
      updateControl()
    } catch { enabled = false; updateControl() }
  }
  function playClack(level, size, x, kind) {
    if (!enabled || !context || context.state !== 'running' || document.hidden || voices >= 8 || !samples.length) return
    const source = context.createBufferSource(), gain = context.createGain(), pan = context.createStereoPanner()
    source.buffer = samples[size <= 4 ? 0 : size <= 6 ? 1 : 2]
    source.playbackRate.value = Math.max(.88, Math.min(1.08, 1.12 - Math.sqrt(size) * .06)) * (.98 + Math.random() * .04)
    gain.gain.value = level
    pan.pan.value = Math.max(-.75, Math.min(.75, (x - .5) * 1.5))
    source.connect(gain); gain.connect(pan); pan.connect(master)
    voices++
    source.onended = () => { voices--; source.disconnect(); gain.disconnect(); pan.disconnect() }
    source.start()
    button.dataset[kind] = String(+(button.dataset[kind] || 0) + 1)
  }
  function pop(amount = 0, x = .5) {
    const play = () => {
      if (!enabled || !popBuffer || context.state !== 'running' || document.hidden) return
      const source = context.createBufferSource(), gain = context.createGain(), pan = context.createStereoPanner()
      source.buffer = popBuffer; source.playbackRate.value = 1.08 - amount * .18
      gain.gain.value = .7 + amount * .25; pan.pan.value = Math.max(-.75, Math.min(.75, (x - .5) * 1.5))
      source.connect(gain); gain.connect(pan); pan.connect(master)
      source.onended = () => { source.disconnect(); gain.disconnect(); pan.disconnect() }
      source.start()
      button.dataset.pops = String(+(button.dataset.pops || 0) + 1)
    }
    if (popBuffer) play(); else popReady?.then(play)
  }
  function impact(speed, size, x) {
    if (!enabled || !context || context.state !== 'running' || document.hidden || speed < 65) return
    impacts.push({speed, size, x})
  }
  function flush() {
    if (!impacts.length) return
    if (!enabled || !context || context.state !== 'running' || document.hidden) { impacts = []; return }
    const now = context.currentTime
    if (now >= nextImpact && voices < 8) {
      // Select strong contacts and cap the mix: a pile cannot become a roar.
      impacts.sort((a,b) => b.speed - a.speed)
      for (const hit of impacts.slice(0, Math.min(1, 8 - voices))) {
        playClack(Math.min(.22, .04 + (hit.speed - 65) / 2400), hit.size, hit.x, 'impacts')
      }
      nextImpact = now + .045
    }
    impacts = []
  }
  function stop() { impacts = [] }
  button.addEventListener('click', () => {
    enabled = !enabled
    try { localStorage.setItem(key, String(enabled)) } catch {}
    if (context) master.gain.setTargetAtTime(enabled ? .38 : 0, context.currentTime, .015)
    if (enabled) unlock(); else stop()
    updateControl()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stop(); context?.suspend().catch(() => {}) }
    // Resume only on the next deliberate interaction.
  })
  addEventListener('blur', stop)
  updateControl()
  return { unlock, impact, flush, stop, pop }
}
