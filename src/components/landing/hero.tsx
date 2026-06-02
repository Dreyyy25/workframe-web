import { useEffect, useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const VIDEO_SRC = '/media/laptop3d.mp4'
const FALLBACK_DURATION = 6 // seconds — used until metadata reports the real length

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

function scrollToFeatured(e: React.FormEvent) {
  e.preventDefault()
  document.getElementById('featured')?.scrollIntoView({ behavior: 'smooth' })
}

export function Hero() {
  const reduce = useReducedMotion()
  return reduce ? <StaticHero /> : <ScrubHero />
}

/* -------------------------------------------------------------------------- */
/* Copy overlay — shared between scrub + static heroes                        */
/* -------------------------------------------------------------------------- */

function HeroCopy() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-2xl">
      <motion.p
        variants={item}
        className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground"
      >
        12,480 open roles · 900+ companies
      </motion.p>
      <motion.h1
        variants={item}
        className="mt-4 text-[clamp(2.75rem,7vw,5.25rem)] font-extrabold leading-[0.97] tracking-tightest"
      >
        Find work that{' '}
        <span className="relative whitespace-nowrap text-primary">
          works
          <svg
            className="absolute -bottom-1.5 left-0 h-3 w-full text-primary"
            viewBox="0 0 200 12"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M2 8 C 50 3, 150 3, 198 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </span>{' '}
        for you.
      </motion.h1>
      <motion.p variants={item} className="mt-6 max-w-xl text-lg text-muted-foreground">
        Search thousands of roles from companies hiring right now — then apply in one place and
        track every application.
      </motion.p>
      <motion.form
        variants={item}
        onSubmit={scrollToFeatured}
        className="mt-8 flex max-w-xl flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search jobs" placeholder="Search role, skill or company…" className="pl-10" />
        </div>
        <Button type="submit" className="sm:w-auto">
          Search jobs
        </Button>
      </motion.form>
    </motion.div>
  )
}

/* Theme-aware scrim that keeps the copy legible over the video. Flat wash on
   mobile (copy centered over a cropped laptop), left-weighted gradient on
   desktop so the laptop stays visible on the right while text reads on left. */
function Scrim() {
  return (
    <>
      <div aria-hidden className="absolute inset-0 bg-background/70 sm:bg-transparent" />
      <div
        aria-hidden
        className="absolute inset-0 hidden bg-gradient-to-r from-background via-background/85 to-background/10 sm:block"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background to-transparent"
      />
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Scroll-scrubbed pinned hero (default)                                      */
/* -------------------------------------------------------------------------- */

function ScrubHero() {
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // 0 → 1 as the tall section scrolls past while the stage is pinned.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  // Gentle parallax + late fade so the copy hands off to the next section.
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -32])
  const copyOpacity = useTransform(scrollYProgress, [0, 0.85, 1], [1, 1, 0.35])

  // Preload the whole clip so scrubbing never waits on the network.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.load()
  }, [])

  // Bind currentTime to scroll progress via rAF, easing toward the target so
  // fast scrolls scrub smoothly instead of snapping. Runs only while on screen.
  useEffect(() => {
    const section = sectionRef.current
    const video = videoRef.current
    if (!section || !video) return

    let raf = 0
    let running = false
    let currentTime = 0
    let lastSeek = -1

    const tick = () => {
      const duration =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : FALLBACK_DURATION
      const target = scrollYProgress.get() * duration
      currentTime += (target - currentTime) * 0.12
      if (Math.abs(target - currentTime) < 0.004) currentTime = target
      if (video.readyState >= 2 && Math.abs(currentTime - lastSeek) > 1 / 60) {
        try {
          video.currentTime = currentTime
          lastSeek = currentTime
        } catch {
          /* seek can throw mid-load; retry next frame */
        }
      }
      raf = requestAnimationFrame(tick)
    }
    const start = () => {
      if (running) return
      running = true
      raf = requestAnimationFrame(tick)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0 },
    )
    io.observe(section)
    return () => {
      io.disconnect()
      stop()
    }
  }, [scrollYProgress])

  return (
    <section ref={sectionRef} className="relative h-[300vh]">
      <div className="sticky top-0 flex h-dvh items-center overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full bg-background object-cover"
          src={VIDEO_SRC}
          preload="auto"
          muted
          playsInline
          aria-label="A laptop opening to reveal the Workframe dashboard"
        />
        <Scrim />

        <div className="relative z-10 mx-auto w-full max-w-content px-4 sm:px-6">
          <motion.div style={{ y: copyY, opacity: copyOpacity }}>
            <HeroCopy />
          </motion.div>
        </div>

        {/* scroll progress bar pinned to the stage */}
        <div className="absolute inset-x-0 bottom-0 z-20 h-1 bg-muted">
          <motion.div
            style={{ scaleX: scrollYProgress }}
            className="h-full w-full origin-left bg-primary"
          />
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Reduced-motion fallback — no pin/scrub, video parked on the open frame     */
/* -------------------------------------------------------------------------- */

function StaticHero() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onMeta = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        try {
          video.currentTime = video.duration - 0.05
        } catch {
          /* ignore */
        }
      }
    }
    video.addEventListener('loadedmetadata', onMeta)
    video.load()
    return () => video.removeEventListener('loadedmetadata', onMeta)
  }, [])

  return (
    <section className="relative flex min-h-[88vh] items-center overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full bg-background object-cover"
        src={VIDEO_SRC}
        preload="metadata"
        muted
        playsInline
        aria-label="The Workframe dashboard shown on an open laptop"
      />
      <Scrim />
      <div className="relative z-10 mx-auto w-full max-w-content px-4 py-20 sm:px-6">
        <HeroCopy />
      </div>
    </section>
  )
}
