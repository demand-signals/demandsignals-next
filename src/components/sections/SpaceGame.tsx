'use client'

import { useRef, useEffect, useCallback, useState } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────

const ENEMY_NAMES = [
  'Ransomware', 'Phishing Bot', 'Zero-Day', 'SQL Injector', 'DDoS Wave',
  'Malware', 'Trojan', 'Spyware', 'Rootkit', 'Botnet', 'Keylogger', 'Cryptojacker',
  'Worm', 'Adware', 'Backdoor', 'Exploit Kit', 'Stealer', 'RAT', 'Dropper', 'Loader',
]

const ENEMY_COLORS = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
  '#feca57', '#ff9ff3', '#54a0ff',
]

const BG_COLOR = '#080e1f'
const TEAL = '#52C9A0'
const ORANGE = '#FF6B2B'
const BULLET_COLOR = '#00ff88'
const BULLET_ENEMY_COLOR = '#ff3366'
const SHIELD_COLOR = '#00aaff'
const RAPID_COLOR = '#ffaa00'
const STAR_COUNT = 200
const MAX_SHIELD = 5
const LEADERBOARD_KEY = 'dsig_space_leaderboard'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Star {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
}

interface Player {
  x: number
  y: number
  width: number
  height: number
  fireRate: number
  maxFireRate: number
}

interface Enemy {
  x: number
  y: number
  width: number
  height: number
  speed: number
  health: number
  rotation: number
  rotationSpeed: number
  name: string
  points: number
  color: string
}

interface Bullet {
  x: number
  y: number
  speed: number
  isPlayer: boolean
  width: number
  height: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

interface PowerUp {
  x: number
  y: number
  width: number
  height: number
  speed: number
  rotation: number
  type: 'shield' | 'rapid'
  color: string
}

interface LeaderboardEntry {
  name: string
  score: number
  date: string
}

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

function loadLeaderboard(): LeaderboardEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY)
    return raw ? (JSON.parse(raw) as LeaderboardEntry[]) : []
  } catch {
    return []
  }
}

function saveLeaderboard(entries: LeaderboardEntry[]): void {
  if (typeof window === 'undefined') return
  const top10 = entries.sort((a, b) => b.score - a.score).slice(0, 10)
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(top10))
}

function addLeaderboardEntry(name: string, score: number): LeaderboardEntry[] {
  const entries = loadLeaderboard()
  entries.push({ name, score, date: new Date().toLocaleDateString() })
  saveLeaderboard(entries)
  return loadLeaderboard()
}

// ─── Rect collision ───────────────────────────────────────────────────────────

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

// ─── Game Canvas ──────────────────────────────────────────────────────────────

interface GameCanvasProps {
  onGameOver: (score: number) => void
  gameKey: number
}

function GameCanvas({ onGameOver, gameKey }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const onGameOverRef = useRef(onGameOver)
  useEffect(() => { onGameOverRef.current = onGameOver }, [onGameOver])

  useEffect(() => {
    const canvasOrNull = canvasRef.current
    if (!canvasOrNull) return
    const canvas: HTMLCanvasElement = canvasOrNull
    const ctxOrNull = canvas.getContext('2d')
    if (!ctxOrNull) return
    const ctx: CanvasRenderingContext2D = ctxOrNull

    // Size canvas to viewport
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const W = canvas.width
    const H = canvas.height

    // ── Game state ────────────────────────────────────────────────────────
    let score = 0
    let level = 1
    let health = 100
    let shields = 3
    let gameStarted = false
    let gameRunning = false
    let animFrame = 0

    // Input state
    const keys: Record<string, boolean> = {}
    let mouseX = W / 2
    let mouseY = H / 2
    let mouseDown = false

    // Timers
    let enemyTimer = 0
    let enemySpawnDelay = 120
    let powerUpTimer = 300

    // Arrays
    const stars: Star[] = []
    const enemies: Enemy[] = []
    const bullets: Bullet[] = []
    const particles: Particle[] = []
    const powerUps: PowerUp[] = []

    // Player
    const player: Player = {
      x: W / 2,
      y: H - 100,
      width: 50,
      height: 50,
      fireRate: 0,
      maxFireRate: 10,
    }

    // ── Build stars ───────────────────────────────────────────────────────
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 3 + 1,
        opacity: Math.random() * 0.8 + 0.2,
      })
    }

    // ── Spawn helpers ─────────────────────────────────────────────────────
    function spawnEnemy() {
      enemies.push({
        x: Math.random() * W,
        y: -50,
        width: 20 + Math.random() * 40,
        height: 20 + Math.random() * 40,
        speed: 2 + Math.random() * 4,
        health: 1 + Math.floor(level / 3),
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        name: ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)],
        points: 0, // set after width/height known
        color: ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)],
      })
      const e = enemies[enemies.length - 1]
      e.points = Math.floor((e.width + e.height) / 4) * 10
      enemyTimer = 0
      enemySpawnDelay = Math.max(30, 120 - level * 2)
    }

    function spawnPowerUp() {
      const type: 'shield' | 'rapid' = Math.random() < 0.5 ? 'shield' : 'rapid'
      powerUps.push({
        x: Math.random() * W,
        y: -30,
        width: 25,
        height: 25,
        speed: 3,
        rotation: 0,
        type,
        color: type === 'shield' ? SHIELD_COLOR : RAPID_COLOR,
      })
      powerUpTimer = 300 + Math.random() * 200
    }

    function fireBullet() {
      if (player.fireRate <= 0) {
        bullets.push({
          x: player.x,
          y: player.y - 30,
          speed: -15,
          isPlayer: true,
          width: 4,
          height: 12,
        })
        player.fireRate = player.maxFireRate
      }
    }

    function explode(x: number, y: number, color: string) {
      for (let i = 0; i < 15; i++) {
        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          life: 30,
          maxLife: 30,
          size: Math.random() * 4 + 2,
          color,
        })
      }
    }

    // ── Draw helpers ──────────────────────────────────────────────────────

    function drawStar(s: Star) {
      ctx.fillStyle = `rgba(255,255,255,${s.opacity})`
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
      ctx.fill()
    }

    function drawPlayer() {
      ctx.save()
      ctx.translate(player.x, player.y)
      // Main teal triangle
      ctx.fillStyle = TEAL
      ctx.beginPath()
      ctx.moveTo(0, -25)
      ctx.lineTo(20, 20)
      ctx.lineTo(-20, 20)
      ctx.closePath()
      ctx.fill()
      // Orange thruster flame
      ctx.fillStyle = ORANGE
      ctx.beginPath()
      ctx.moveTo(0, 20)
      ctx.lineTo(10, 30)
      ctx.lineTo(-10, 30)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    function drawEnemy(e: Enemy) {
      ctx.save()
      ctx.translate(e.x, e.y)
      ctx.rotate(e.rotation)
      ctx.fillStyle = e.color
      ctx.shadowColor = e.color
      ctx.shadowBlur = 10
      ctx.fillRect(-e.width / 2, -e.height / 2, e.width, e.height)
      ctx.shadowBlur = 0
      // Label
      ctx.rotate(-e.rotation)
      ctx.fillStyle = '#ffffff'
      ctx.font = '9px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(e.name, 0, e.height / 2 + 12)
      ctx.restore()
    }

    function drawBullet(b: Bullet) {
      ctx.fillStyle = b.isPlayer ? BULLET_COLOR : BULLET_ENEMY_COLOR
      ctx.shadowColor = b.isPlayer ? BULLET_COLOR : BULLET_ENEMY_COLOR
      ctx.shadowBlur = 8
      ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height)
      ctx.shadowBlur = 0
    }

    function drawParticle(p: Particle) {
      const alpha = p.life / p.maxLife
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    function drawPowerUp(pu: PowerUp) {
      ctx.save()
      ctx.translate(pu.x, pu.y)
      ctx.rotate(pu.rotation)
      ctx.strokeStyle = pu.color
      ctx.fillStyle = pu.color
      ctx.shadowColor = pu.color
      ctx.shadowBlur = 15
      ctx.lineWidth = 2

      if (pu.type === 'shield') {
        // Hexagon
        ctx.beginPath()
        ctx.moveTo(0, -12)
        ctx.lineTo(10, -6)
        ctx.lineTo(10, 6)
        ctx.lineTo(0, 12)
        ctx.lineTo(-10, 6)
        ctx.lineTo(-10, -6)
        ctx.closePath()
        ctx.stroke()
        ctx.globalAlpha = 0.3
        ctx.fill()
      } else {
        // Lightning bolt
        ctx.beginPath()
        ctx.moveTo(-4, -12)
        ctx.lineTo(4, -4)
        ctx.lineTo(-2, -4)
        ctx.lineTo(4, 12)
        ctx.lineTo(-4, 4)
        ctx.lineTo(2, 4)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
    }

    function drawHUD() {
      // Semi-transparent header bar
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.fillRect(0, 0, W, 80)

      // Score & Level
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 22px "Inter", sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`Score: ${score}`, 20, 32)
      ctx.fillText(`Level: ${level}`, 200, 32)

      // Health bar (200px wide)
      ctx.fillStyle = '#333'
      ctx.fillRect(20, 46, 200, 18)
      const hPct = Math.max(0, health) / 100
      ctx.fillStyle = health > 30 ? '#00ff00' : '#ff3333'
      ctx.fillRect(20, 46, hPct * 200, 18)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1
      ctx.strokeRect(20, 46, 200, 18)

      // Health label
      ctx.fillStyle = '#ffffff'
      ctx.font = '11px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`HP ${Math.max(0, health)}%`, 120, 59)

      // Shield dots
      ctx.fillStyle = SHIELD_COLOR
      for (let i = 0; i < shields; i++) {
        ctx.beginPath()
        ctx.arc(250 + i * 28, 56, 7, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // ── Splash / title screen ─────────────────────────────────────────────
    function drawSplash() {
      // Stars background
      stars.forEach(s => {
        ctx.fillStyle = `rgba(255,255,255,${s.opacity})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fill()
      })

      // Dark overlay
      ctx.fillStyle = 'rgba(0,0,0,0.72)'
      ctx.fillRect(0, 0, W, H)

      // Title
      ctx.fillStyle = TEAL
      ctx.font = 'bold 72px "Inter", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('DIGITAL DEFENSE', W / 2, H / 2 - 80)

      ctx.fillStyle = ORANGE
      ctx.font = 'bold 52px "Inter", sans-serif'
      ctx.fillText('SQUADRON', W / 2, H / 2 - 10)

      ctx.fillStyle = '#ffffff'
      ctx.font = '22px "Inter", sans-serif'
      ctx.fillText('Defend the digital realm from cyber threats!', W / 2, H / 2 + 50)

      // Pulsing "Click to Start"
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.005)
      ctx.fillStyle = `rgba(82, 201, 160, ${pulse})`
      ctx.font = 'bold 26px "Inter", sans-serif'
      ctx.fillText('Click or Press SPACE to Start', W / 2, H / 2 + 110)

      // Cursor indicator
      ctx.fillStyle = `rgba(82, 201, 160, ${pulse * 0.8})`
      ctx.beginPath()
      ctx.arc(mouseX, mouseY, 16, 0, Math.PI * 2)
      ctx.fill()
    }

    // ── Main game loop ────────────────────────────────────────────────────
    function loop() {
      if (!gameRunning) return
      animFrame = requestAnimationFrame(loop)

      // Trail-fade background
      ctx.globalAlpha = 1
      ctx.fillStyle = `${BG_COLOR}33` // ~20% opacity
      ctx.fillRect(0, 0, W, H)

      // Scrolling stars
      stars.forEach(s => {
        s.y += s.speed
        if (s.y > H) {
          s.y = -10
          s.x = Math.random() * W
        }
        drawStar(s)
      })

      // Player lerp toward mouse
      player.x += (mouseX - player.x) * 0.1
      player.y += (mouseY - player.y) * 0.1
      player.x = Math.max(player.width / 2, Math.min(W - player.width / 2, player.x))
      player.y = Math.max(player.height / 2, Math.min(H - player.height / 2, player.y))
      player.fireRate = Math.max(0, player.fireRate - 1)

      drawPlayer()

      // Auto-fire on Space / mouseDown
      if (keys['Space'] || keys['ControlLeft'] || mouseDown) {
        fireBullet()
      }

      // Spawn enemies
      enemyTimer++
      if (enemyTimer >= enemySpawnDelay) spawnEnemy()

      // Spawn power-ups
      powerUpTimer--
      if (powerUpTimer <= 0) spawnPowerUp()

      // Update & draw enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i]
        e.y += e.speed
        e.rotation += e.rotationSpeed
        drawEnemy(e)

        // Fell off screen — damage player
        if (e.y > H + 60) {
          enemies.splice(i, 1)
          health -= 5
        }
      }

      // Update & draw bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]
        b.y += b.speed
        drawBullet(b)
        if (b.y < -30 || b.y > H + 30) {
          bullets.splice(i, 1)
        }
      }

      // Update & draw power-ups
      for (let i = powerUps.length - 1; i >= 0; i--) {
        const pu = powerUps[i]
        pu.y += pu.speed
        pu.rotation += 0.1
        drawPowerUp(pu)

        // Collect
        const px = player.x - player.width / 2
        const py = player.y - player.height / 2
        const pux = pu.x - pu.width / 2
        const puy = pu.y - pu.height / 2
        if (rectsOverlap(px, py, player.width, player.height, pux, puy, pu.width, pu.height)) {
          powerUps.splice(i, 1)
          if (pu.type === 'shield') {
            shields = Math.min(MAX_SHIELD, shields + 1)
          } else {
            player.maxFireRate = Math.max(3, player.maxFireRate - 2)
          }
          explode(pu.x, pu.y, pu.color)
          continue
        }

        if (pu.y > H + 60) powerUps.splice(i, 1)
      }

      // Bullet ↔ enemy collisions
      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi]
        if (!b.isPlayer) continue
        for (let ei = enemies.length - 1; ei >= 0; ei--) {
          const e = enemies[ei]
          const bx = b.x - b.width / 2
          const by = b.y - b.height / 2
          const ex = e.x - e.width / 2
          const ey = e.y - e.height / 2
          if (rectsOverlap(bx, by, b.width, b.height, ex, ey, e.width, e.height)) {
            bullets.splice(bi, 1)
            e.health--
            if (e.health <= 0) {
              score += e.points
              explode(e.x, e.y, e.color)
              enemies.splice(ei, 1)
            }
            break
          }
        }
      }

      // Enemy ↔ player collisions
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i]
        const px = player.x - player.width / 2
        const py = player.y - player.height / 2
        const ex = e.x - e.width / 2
        const ey = e.y - e.height / 2
        if (rectsOverlap(px, py, player.width, player.height, ex, ey, e.width, e.height)) {
          enemies.splice(i, 1)
          if (shields > 0) {
            shields--
            explode(e.x, e.y, SHIELD_COLOR)
          } else {
            health -= 20
            explode(player.x, player.y, '#ff3366')
          }
        }
      }

      // Update & draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.life--
        drawParticle(p)
        if (p.life <= 0) particles.splice(i, 1)
      }

      // Level up check
      if (score >= level * 500) {
        level++
      }

      // Health check
      if (health <= 0) {
        gameRunning = false
        cancelAnimationFrame(animFrame)
        onGameOverRef.current(score)
        return
      }

      drawHUD()
    }

    // ── Splash animation (before game starts) ─────────────────────────────
    let splashFrame = 0
    function splashLoop() {
      if (gameStarted) return
      splashFrame = requestAnimationFrame(splashLoop)

      ctx.fillStyle = BG_COLOR
      ctx.fillRect(0, 0, W, H)

      // Slowly drift stars on splash
      stars.forEach(s => {
        s.y += s.speed * 0.4
        if (s.y > H) { s.y = -10; s.x = Math.random() * W }
      })

      drawSplash()
    }

    splashLoop()

    // ── Event handlers ────────────────────────────────────────────────────
    function startGame() {
      if (gameStarted) return
      gameStarted = true
      gameRunning = true
      cancelAnimationFrame(splashFrame)

      // Full clear before game starts
      ctx.fillStyle = BG_COLOR
      ctx.fillRect(0, 0, W, H)

      loop()
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!gameStarted) {
        if (e.code === 'Space') { e.preventDefault(); startGame() }
        return
      }
      if (gameRunning) {
        keys[e.code] = true
        if (e.code === 'Space') e.preventDefault()
      }
    }

    function onKeyUp(e: KeyboardEvent) { keys[e.code] = false }

    function onMouseMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect()
      mouseX = e.clientX - rect.left
      mouseY = e.clientY - rect.top
    }

    function onMouseDown(e: MouseEvent) {
      if (!gameStarted) { startGame(); return }
      if (gameRunning) mouseDown = true
      void e
    }

    function onMouseUp() { mouseDown = false }

    function onResize() {
      // Resize canvas but keep positions proportional enough
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mouseup', onMouseUp)
    window.addEventListener('resize', onResize)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(animFrame)
      cancelAnimationFrame(splashFrame)
    }
  }, [gameKey]) // re-run when gameKey changes (restart)

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        inset: 0,
        cursor: 'none',
        display: 'block',
        background: BG_COLOR,
      }}
    />
  )
}

// ─── Game Over overlay ────────────────────────────────────────────────────────

interface GameOverProps {
  score: number
  onPlayAgain: () => void
}

function GameOver({ score, onPlayAgain }: GameOverProps) {
  const [name, setName] = useState('')
  const [saved, setSaved] = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(loadLeaderboard)

  const handleSave = useCallback(() => {
    if (!name.trim()) return
    const updated = addLeaderboardEntry(name.trim(), score)
    setLeaderboard(updated)
    setSaved(true)
  }, [name, score])

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSave() },
    [handleSave],
  )

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(8,14,31,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        fontFamily: '"Inter", sans-serif',
      }}
    >
      <div
        style={{
          background: '#0f1a35',
          border: `2px solid ${TEAL}`,
          borderRadius: 16,
          padding: '2.5rem',
          maxWidth: 420,
          width: '90%',
          color: '#fff',
          boxShadow: `0 0 40px ${TEAL}44`,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 8 }}>🛸</div>
          <h2 style={{ color: TEAL, fontSize: 24, fontWeight: 700, margin: 0 }}>
            Mission Complete
          </h2>
          <div style={{ fontSize: 48, fontWeight: 800, color: ORANGE, margin: '12px 0' }}>
            {score.toLocaleString()}
          </div>
          <p style={{ color: '#9ca3af', margin: 0 }}>Digital threats neutralized</p>
        </div>

        {/* Save score */}
        {!saved ? (
          <div style={{ marginBottom: '1.25rem' }}>
            <input
              type="text"
              placeholder="Enter pilot name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKey}
              autoFocus
              maxLength={20}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#1a2540',
                border: '1px solid #334155',
                borderRadius: 8,
                color: '#fff',
                fontSize: 16,
                boxSizing: 'border-box',
                marginBottom: 10,
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleSave}
                disabled={!name.trim()}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: name.trim() ? TEAL : '#334155',
                  border: 'none',
                  borderRadius: 8,
                  color: name.trim() ? '#080e1f' : '#6b7280',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: name.trim() ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s',
                }}
              >
                Save Score
              </button>
              <button
                onClick={onPlayAgain}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: 'transparent',
                  border: `1px solid ${ORANGE}`,
                  borderRadius: 8,
                  color: ORANGE,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                Play Again
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
            <p style={{ color: TEAL, fontWeight: 600, marginBottom: 12 }}>
              Score saved to the Galactic Leaderboard!
            </p>
            <button
              onClick={onPlayAgain}
              style={{
                padding: '10px 32px',
                background: ORANGE,
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              Play Again
            </button>
          </div>
        )}

        {/* Leaderboard */}
        <div>
          <h3
            style={{
              color: TEAL,
              fontSize: 16,
              fontWeight: 600,
              textAlign: 'center',
              marginBottom: 10,
            }}
          >
            Top Pilots
          </h3>
          {leaderboard.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', fontSize: 13 }}>
              No scores yet — be the first!
            </p>
          ) : (
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {leaderboard.map((entry, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 10px',
                    borderRadius: 6,
                    background: idx % 2 === 0 ? '#1a2540' : 'transparent',
                    fontSize: 14,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: ORANGE, fontWeight: 700, width: 24 }}>
                      #{idx + 1}
                    </span>
                    <span>{entry.name}</span>
                  </span>
                  <span style={{ color: TEAL, fontWeight: 600 }}>
                    {entry.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controls reminder */}
        <div
          style={{
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid #1e3a5f',
            fontSize: 12,
            color: '#6b7280',
            textAlign: 'center',
          }}
        >
          Mouse to move • Click / Space to fire • Collect power-ups
        </div>
      </div>
    </div>
  )
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function SpaceGame() {
  const [gameKey, setGameKey] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [finalScore, setFinalScore] = useState(0)

  // Hide OS cursor while playing
  useEffect(() => {
    document.body.style.cursor = 'none'
    return () => { document.body.style.cursor = 'default' }
  }, [])

  const handleGameOver = useCallback((score: number) => {
    setFinalScore(score)
    setGameOver(true)
  }, [])

  const handlePlayAgain = useCallback(() => {
    setGameOver(false)
    setGameKey(k => k + 1)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: BG_COLOR }}>
      <GameCanvas onGameOver={handleGameOver} gameKey={gameKey} />

      {gameOver && (
        <GameOver score={finalScore} onPlayAgain={handlePlayAgain} />
      )}

      {/* Controls hint (only while not game over) */}
      {!gameOver && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 16,
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: 12,
            lineHeight: 1.7,
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4, color: ORANGE }}>Controls</div>
          <div>🖱️ Mouse — Move ship</div>
          <div>Click / Space — Fire</div>
          <div style={{ color: SHIELD_COLOR }}>◆ Blue — Shield</div>
          <div style={{ color: RAPID_COLOR }}>⚡ Orange — Rapid fire</div>
        </div>
      )}
    </div>
  )
}
