/**
 * EditorialField — one continuous, page-level ambient surface behind every
 * below-hero section so they read as a single editorial sheet (no dividers, no
 * boxes). Chosen + refined via design judge-panels.
 *
 * Layers (back → front), all static, token-driven, light+dark, free:
 *   1. Tonal wash + a single faint electric-blue ember (neutral value-depth).
 *   2. A colossal "WORK" masthead bleeding off the left gutter (type = the
 *      brand's hero asset; reuses the already-loaded display font).
 *   3. Structural "ink marks" that quote the brand's OWN geometry — a corner
 *      bracket (the 2px border blown up), an offset outline frame straddling the
 *      Featured gutters (the hard-offset shadow as margin furniture), and the
 *      literal hero underline path re-projected as a signature swoosh. Each mark
 *      is individually positioned by % so it stays put across breakpoints.
 *   4. Static SVG paper-grain on top (so type + marks pick up the same tooth).
 *
 * Alphas are deliberately low and LOCKED — do not "tune them up" (that tips it
 * into slop). Mount as the first child of a `relative isolate` wrapper.
 */

// Fine fractal-noise grain, tiled at 160px (spaces encoded for valid CSS data URI).
const GRAIN =
  `url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20256%20256'%3E%3Cfilter%20id='n'%3E%3CfeTurbulence%20type='fractalNoise'%20baseFrequency='0.8'%20numOctaves='2'%20stitchTiles='stitch'/%3E%3C/filter%3E%3Crect%20width='100%25'%20height='100%25'%20filter='url(%23n)'/%3E%3C/svg%3E")`

export function EditorialField() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_6%,black_94%,transparent)]"
    >
      {/* 1 — tonal wash (peaks over the Featured band) + faint primary ember */}
      <div
        className="absolute inset-0 bg-background"
        style={{
          backgroundImage: [
            'radial-gradient(60% 38% at 50% 74%, hsl(var(--primary) / 0.05), transparent 70%)',
            'linear-gradient(to bottom, hsl(var(--background)) 0%, hsl(var(--muted) / 0.55) 42%, hsl(var(--muted) / 0.7) 58%, hsl(var(--background)) 100%)',
          ].join(', '),
        }}
      />

      {/* 2 — colossal "WORK" masthead, bleeding off the left gutter */}
      <div className="absolute left-0 top-[23%] -translate-x-[11%] select-none font-display text-[clamp(7rem,30vw,15rem)] font-extrabold uppercase leading-[0.72] tracking-tightest text-foreground opacity-[0.04] dark:opacity-[0.06] md:text-[clamp(12rem,25vw,25rem)]">
        WORK
      </div>

      {/* 3a — top-left corner bracket (the 2px border, blown up) */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        className="absolute left-[2.5%] top-[8%] h-14 w-14 text-primary/[0.16] dark:text-primary/[0.22] sm:h-24 sm:w-24"
      >
        <path d="M8 100 V8 H100" stroke="currentColor" strokeWidth={9} strokeLinecap="square" />
      </svg>

      {/* 3b — offset outline frame straddling the Featured gutters, bleeding right
              (desktop only); the hard-offset shadow language as margin furniture */}
      <div className="absolute right-[-7%] top-[29%] hidden h-[31%] w-[46%] rounded-sm border-[12px] border-primary/[0.13] dark:border-primary/[0.2] md:block" />

      {/* 3c — the signature: the literal hero underline path, scaled up (uniform,
              height auto from the 200:12 aspect so the curve matches the hero) */}
      <svg
        viewBox="0 0 200 12"
        fill="none"
        className="absolute left-[5%] top-[71%] h-auto w-[44%] text-primary/[0.24] dark:text-primary/[0.32] sm:w-[34%]"
      >
        <path d="M2 8 C 50 3, 150 3, 198 7" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" />
      </svg>

      {/* 4 — static editorial grain, painted on top so type + marks share its tooth */}
      <div
        className="absolute inset-0 opacity-[0.025] mix-blend-multiply dark:opacity-[0.05] dark:mix-blend-screen"
        style={{ backgroundImage: GRAIN, backgroundSize: '160px 160px' }}
      />
    </div>
  )
}
