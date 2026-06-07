"use client";

import { useEffect } from "react";
import Lenis from "lenis";

// Smooth native page scroll via Lenis. The site's main scroll surfaces
// (home column, detail gallery, about right column, menu list) all use
// custom JS-translated scroll with their own lerp inertia; Lenis here
// handles any native page scroll that bubbles up — primarily the mobile
// detail/about pages which use overflow-y:auto, and any future content
// that scrolls the body.
export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Skip wheel events that the custom JS scrolls have already handled
      // (they call preventDefault — Lenis respects that).
    });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
