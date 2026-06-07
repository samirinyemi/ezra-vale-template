"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import gsap from "gsap";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  // useLayoutEffect runs synchronously after DOM mutations but before paint,
  // so the desktop-default → mobile-actual transition happens BEFORE the
  // browser paints the first frame on mobile. With plain useEffect we'd see
  // a visible flash of the desktop layout (full-size cards, no scaling, MENU
  // in wrong position) before flipping to mobile on first paint.
  const isoEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;
  isoEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

// useInView — returns [ref, inView]. Once `inView` flips true it stays
// true (the observer disconnects), so the fade-in animation runs once
// per element and doesn't replay on scroll back-and-forth. rootMargin
// defaults to -80px on the bottom edge so the fade triggers slightly
// BEFORE the element fully enters the viewport — feels less abrupt
// than waiting until it's already on screen.
function useInView<T extends HTMLElement>(
  rootMargin: string = "0px 0px -80px 0px",
) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.01, rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [inView, rootMargin]);

  return [ref, inView] as const;
}

// Magnetic button — element follows the cursor when within `radius`.
function useMagnetic<T extends HTMLElement>(
  opts: { radius?: number; strength?: number } = {},
) {
  const { radius = 180, strength = 0.4 } = opts;
  const cleanupRef = useRef<(() => void) | null>(null);

  return useCallback(
    (el: T | null) => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      if (!el) return;
      // Skip magnetic on touch / mobile viewports — no hover available.
      if (typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT) {
        return;
      }

      let rect = el.getBoundingClientRect();
      const updateRect = () => {
        rect = el.getBoundingClientRect();
      };

      const onMove = (e: MouseEvent) => {
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius) {
          gsap.to(el, {
            x: dx * strength,
            y: dy * strength,
            duration: 0.4,
            ease: "power2.out",
          });
        } else {
          gsap.to(el, { x: 0, y: 0, duration: 0.4, ease: "power2.out" });
        }
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("resize", updateRect);
      window.addEventListener("scroll", updateRect, true);

      cleanupRef.current = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("resize", updateRect);
        window.removeEventListener("scroll", updateRect, true);
        gsap.set(el, { x: 0, y: 0 });
      };
    },
    [radius, strength],
  );
}

const NAME = "EZRA VALE";
const SIDE_PADDING = 24;
const BASE_FONT_SIZE = 200;
const LETTER_STAGGER_MS = 60;
const IMAGE_DELAY_MS = 900;
const IMAGE_RISE_MS = 800;
const FLIP_INTERVAL_MS = 250;
const SAFETY_PX = 0;
// Sidebearings for "Ezra Vale" in NHG Display Medium, as fractions of em.
// Measured via Canvas measureText() and verified across viewport widths —
// stable because the string and font are fixed. LEFT covers the "E" left
// sidebearing; RIGHT covers the lowercase "e" right sidebearing.
const LEFT_SB_RATIO = 0.055;
const RIGHT_SB_RATIO = 0.019;
// Vertical inset from the h1's line-box top to the visible top of "E". For
// NHG Display Medium with lineHeight: 0.9, the font's cap-inset (0.103 of em)
// minus half the negative leading (0.05 of em) = 0.053 of em. Used so the
// visible top of "E" lands at SIDE_PADDING (mirroring left/right alignment).
const CAP_TOP_RATIO = 0.053;
// Visible cap height of "E" as a fraction of em, measured via Canvas
// (actualBoundingBoxAscent for "E" in NHG Display Medium). Used to position
// elements relative to the VISIBLE bottom of EZRA VALE rather than its
// line-box bottom (which sits ~18% of em lower with lineHeight: 0.9).
const CAP_HEIGHT_RATIO = 0.715;
const IMAGE_HEIGHT = 450;
const COLUMN_GAP = 16;
const IMAGE_WIDTH = (IMAGE_HEIGHT * 5) / 4; // 562.5 — desktop card width
const ANCHOR_INDEX = 3;
// Aspect ratio (height/width) used for the rising/flipping/mini-expand
// CARDS during the intro. 4:5 (1.25) is a standard portrait crop close to
// the AVERAGE natural aspect of the project covers (most are 1.24–1.5,
// Sundial is the outlier at 1.0). Using the anchor's specific aspect
// (Sundial = square) made every portrait peek look squashed compared to
// how it sits on the home page. With 4:5 each cover lands close to its
// natural framing — Asana (1.24) is near-perfect, the taller ones crop
// slightly top/bottom, only square Sundial crops sides. */
const INTRO_CARD_ASPECT = 1.25;
const INTRO_CARD_HEIGHT = Math.round(IMAGE_WIDTH * INTRO_CARD_ASPECT);
// 1024 is the iPad-portrait threshold. Below 1024 → "mobile" layout
// (native scroll cards, 16px MOBILE_GUTTER padding, sticky chrome bar
// instead of side text panels, mobile-style detail/about pages). At
// 1024+ → desktop layout (JS-driven infinite column, side text panels,
// 24px SIDE_PADDING gutter, GSAP fly transitions).
//
// Coverage:
//   iPhone (≤430 wide)                → mobile
//   iPad mini portrait (768)          → mobile
//   iPad portrait (810–834)           → mobile
//   iPad Pro 12.9" portrait (1024)    → desktop (right at the line)
//   iPad landscape (1024+)            → desktop
//   Laptops + monitors (1280+)        → desktop
const MOBILE_BREAKPOINT = 1024;
// On mobile we visually scale the entire image column down so the desktop
// scroll math can stay intact. Cards remain 562px in the layout computations;
// CSS shrinks the display to fit a phone screen — set to fill nearly the
// full viewport (overflow:hidden crops the small horizontal overshoot).
// Scale used during the desktop intro choreography (image-rising, flipping,
// mini-expand, spreading) when running on a phone. 0.45 keeps the entire
// 4-card peek cascade (anchor card 562px wide + 280px of peek displacement
// = ~842px) inside a 390px-wide viewport with breathing room — at the
// previous 0.65 the right-most peek cards were cut off. Once the spreading
// finishes and the phase enters "scrolling", the mobile native-scroll
// layout takes over with FULL-WIDTH cards — the visible scale jump from
// 0.45 → full width IS the "expand fully" moment the user described.
const MOBILE_INTRO_SCALE = 0.45;
// Desktop counterpart: shrinks the rising / flipping / mini-expand intro
// phases proportionally so they don't dominate smaller laptop viewports
// (a 562×703 card at 1.0× takes ~92% of a 1366×768 screen). 0.7 brings
// the full peek cascade (1003px tall unscaled → 702 at 0.7) inside the
// viewport on every common laptop while keeping the imagery prominent.
// The spreading + scrolling phases stay at 1.0 per user request.
const DESKTOP_INTRO_SCALE = 0.7;
// Side padding for the mobile native-scroll card list (full-width minus
// 32px total). 16px on each side reads as a "minimal but present" gutter.
const MOBILE_GUTTER = 16;
const FLIP_START_INDEX = 4;
const FLIP_SEQUENCE = [5, 6, 0, 1, 2, 3];
const SPREAD_MS = 1360; // 1100ms anim + up to ~260ms stagger
const SCROLL_DURATION_MS = 35000;
const SLOW_FACTOR = 0.25;
const TWEEN_MS = 700;
const MINI_EXPAND_MS = 1500;
const MINI_GAP_MS = 120; // brief settle at rest before the full spread fires
// 6 peek cards = every project EXCEPT the anchor. Cascade splits 3+3:
// three peeks fan to the lower-right (steps 1, 2, 3), three to the
// upper-left (steps 1, 2, 3). Together with the anchor, all 7 projects
// are represented in the mini-expand stack.
const PEEK_COUNT = 6;
// Diagonal cascade displacement per step (down + right at the same time)
const PEEK_STEP_X = 70;
const PEEK_STEP_Y = 50;
const RENDER_COPIES = 2;

// Detail layout — image takes ~60% of the viewport with SIDE_PADDING (24px)
// on the left and top, matching the gap between gallery images. The text panel
// takes the remaining 40% with the same 24px gap from the image and 24px from
// the right edge.
const DETAIL_TOP_BAR = 80; // image lands here during the open fly
const DETAIL_COLUMN_GAP = 24; // gap between image and text
const DETAIL_IMG_GAP = 24; // vertical gap between gallery images
const DETAIL_IMAGE_FRACTION = 0.6;

// Helper: compute image / text positions for a given viewport width.
// The image lives inside the left 60% slot with its own left padding (24)
// AND the 24px gap to the text both subtracted from the image width — that
// way the text side keeps its full 40% width.
function detailMetrics(viewportW: number) {
  const imageLeft = SIDE_PADDING;
  const imageW =
    viewportW * DETAIL_IMAGE_FRACTION - SIDE_PADDING - DETAIL_COLUMN_GAP;
  const rightLeft = imageLeft + imageW + DETAIL_COLUMN_GAP;
  const rightWidth = viewportW - rightLeft - SIDE_PADDING;
  return { imageW, imageLeft, rightLeft, rightWidth };
}

// Transition timing
const FLY_MOVE_MS = 650;
const FLY_SCALE_MS = 600;
const FLY_HEADLINE_MS = 1000;

// Menu overlay — height/font compute responsively from viewport
// Bumped to 21 (≈ 4× a desktop-visible page worth of items) so the modulo
// wrap point sits far below anything the user could fast-flick into view in
// one swipe — eliminates any chance of seeing rendered-list-end during the
// momentary lag between target jumping and the lerp catching up.
const MENU_RENDER_COPIES = 21;
const MENU_BG = "#131313";
// MUST match the item-height math in MenuOverlay below or the modulo wrap
// uses the wrong LOOP length and the rendered list runs out before wrap —
// causing visible "end of list" on mobile. (vp.h/4.2 was a desktop-only
// figure; mobile items are sized by character width, much smaller.)
const getMenuItemHeight = () => {
  if (typeof window === "undefined") return 220;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw < MOBILE_BREAKPOINT) {
    const widthCap = (vw - SIDE_PADDING * 2) / 6.2;
    const heightCap = vh / 10;
    const fontSize = Math.max(28, Math.floor(Math.min(widthCap, heightCap)));
    return Math.ceil(fontSize * 1.15);
  }
  return Math.max(140, Math.round(vh / 4.2));
};


const PHOTOGRAPHER = {
  name: "Ezra Vale",
  email: "hello@ezravale.com",
  phone: "+351 912 345 678",
  image: "/Images/c39323057d9c75229f9acee8d3715b3c.webp",
  imageNatW: 564,
  imageNatH: 705,
  image2: "/Images/asana/0a0dd548bc07974140d0dcbf61723d2d.webp",
  image2NatW: 967,
  image2NatH: 1200,
  bio: [
    "Ezra Vale (b. 1989, São Paulo) is a photographer working between Lisbon and São Paulo, making portraits caught in the slow light of early morning, when faces forget they are being watched.",
    "Editorial and brand work for Elle, Wallpaper, Aēsop, Casa Vogue, and the New York Times Magazine. Currently shooting Still Hours, an ongoing personal study in stillness, weather, and the people who pass through both.",
    "Trained at the École nationale supérieure des Beaux-Arts in Paris under Maja Daniels and Stefan Sagmeister. Previously assistant to Vincent Ferrané and Jeff Boudreau.",
    "Available for editorial commissions, brand campaigns, and personal projects worldwide. Represented by Volta Studio in Europe and Casa Sereia in Brazil.",
  ],
};

// Whole paragraphs (not line-broken). Browser wraps them naturally based
// on the panel's width, so the body text behaves correctly no matter how
// wide the panel is allowed to grow or shrink. The previous line-broken
// version forced a "double-break" effect when responsive widths narrowed
// the panel below the longest pre-baked line's natural width.
const ABOUT_PARAGRAPHS: string[] = [
  "Ezra Vale is a photographer working between Lisbon and São Paulo. Portraits caught in the slow light of early morning, when faces forget they are being watched.",
  "Editorial and brand work for Elle, Wallpaper, and Aēsop. Currently shooting Still Hours, an ongoing study in stillness, weather, and the people who pass through both.",
];

type GalleryItem = { src: string; natW: number; natH: number };

type Project = {
  label: string;
  color: string;
  cover: string;
  natW: number;
  natH: number;
  // Bottom-left project brief on the home page — one paragraph that
  // wraps naturally to the available width. Previously stored as a
  // pre-split array but that fought the responsive panel width.
  description: string;
  paragraphs: string[];
  gallery: GalleryItem[]; // gallery[0] is the cover
};

const PROJECTS: Project[] = [
  {
    label: "Solana",
    color: "#a37b48",
    cover: "/Images/solana/9a7dbadcc3f88f737ca35f1582f8448b.webp",
    natW: 735,
    natH: 1105,
    description:
      "Editorial campaign for a slow-fashion linen label, shot along the granite coast of southern Brazil.",
    paragraphs: [
      "Linen against linen, salt against skin. A coastal Brazil shoot built around the way late-afternoon light folds through tea-stained cotton.",
      "We chased mountains, beaches, and the long minute when a stranger forgets their shoulders are doing anything at all.",
      "Stylist Maria Cantal. Talent Adamou Ahmadou. Six days between Ilhabela and Praia do Rosa.",
    ],
    gallery: [
      { src: "/Images/solana/9a7dbadcc3f88f737ca35f1582f8448b.webp", natW: 735, natH: 1105 },
      { src: "/Images/solana/104b7b5f3b3d02950efd9211ce10294b.webp", natW: 736, natH: 1104 },
      { src: "/Images/solana/2bffb2dab7ea45d89c33da30f2aee64a.webp", natW: 736, natH: 1106 },
      { src: "/Images/solana/4e2a6fda0d30e49bddb7e3e1ef33f89f.webp", natW: 736, natH: 1106 },
      { src: "/Images/solana/572ab0573c5968717cde8926d9f69404.webp", natW: 735, natH: 1105 },
      { src: "/Images/solana/6349fb60c1a409668b07954de1a4590f.webp", natW: 630, natH: 1120 },
      { src: "/Images/solana/647cfe9a9d764868dd03c1488628caec.webp", natW: 735, natH: 1105 },
      { src: "/Images/solana/792577d8b9f6f8d28381196bce22d158.webp", natW: 736, natH: 1106 },
      { src: "/Images/solana/7ac7719051e117790692344dc6fe84d2.webp", natW: 735, natH: 1105 },
      { src: "/Images/solana/a2adc02066756ec063e25804082ee72b.webp", natW: 736, natH: 1106 },
    ],
  },
  {
    label: "Botanica",
    color: "#2f5d3a",
    cover: "/Images/botanica/c509e95a08717917b307a58bb92a8a03.webp",
    natW: 1000,
    natH: 1500,
    description:
      "Portrait series photographed inside Bali's botanical garden, set against the indifferent calm of leaves.",
    paragraphs: [
      "Shot inside Bali's Botanical Garden over four mornings, when fog still hangs in the heliconia and the light is the colour of green tea.",
      "The project was a study in scale: how a single body reads against the immense, unbothered architecture of leaves.",
      "Tropical wardrobe by O Atelier. Talent Naima Sotunde. Personal commission.",
    ],
    gallery: [
      { src: "/Images/botanica/c509e95a08717917b307a58bb92a8a03.webp", natW: 1000, natH: 1500 },
      { src: "/Images/botanica/05f8aa626e94b0ec3c3fc0d53ad18774.webp", natW: 1012, natH: 1234 },
      { src: "/Images/botanica/63d2c484fc6a0f03b6a5ac98e6f33456.webp", natW: 736, natH: 1318 },
      { src: "/Images/botanica/8e1d2dc53392f8a897d2887e04ea1b70.webp", natW: 922, natH: 1326 },
      { src: "/Images/botanica/a7cb49de44bee07f7108c3c79d965a2b.webp", natW: 827, natH: 1128 },
      { src: "/Images/botanica/cf58060fe32c4e207b057c55cc7bc4dd.webp", natW: 736, natH: 1104 },
      { src: "/Images/botanica/e18936342b0284397741376cf0330c85.webp", natW: 667, natH: 1000 },
      { src: "/Images/botanica/ec964871f9dce5c86c4c6b83f8e205f9.webp", natW: 667, natH: 1000 },
      { src: "/Images/botanica/f78d0a5061af34cd6a58cb1ce79ace5c.webp", natW: 736, natH: 1313 },
      { src: "/Images/botanica/fc60564328edca3dbbcdff832a676f85.webp", natW: 736, natH: 920 },
    ],
  },
  {
    label: "Citrine",
    color: "#d97442",
    cover: "/Images/citrine/bb58b64bfb381790d5ae1c262d50b6e5.webp",
    natW: 750,
    natH: 990,
    description:
      "Beauty editorial for Elle Mexico. Late afternoon sun reading through tulle and warm skin. Two days in CDMX.",
    paragraphs: [
      "Beauty editorial for Elle Mexico. Saturation against simplicity: citrus organza pulled across freckled cheekbones, lashes wet from the steam of the studio.",
      "Closed-eye portraits, mostly. The brief was 'a sun that has been somewhere warmer than yours.'",
      "Stylist Renata Vega. Makeup Lucia Páez. Shot over two days in Mexico City.",
    ],
    gallery: [
      { src: "/Images/citrine/bb58b64bfb381790d5ae1c262d50b6e5.webp", natW: 750, natH: 990 },
      { src: "/Images/citrine/04_AM_ELLE_MX_BEAUTY_0955.webp", natW: 1500, natH: 2250 },
      { src: "/Images/citrine/05_AM_ELLE_MX_BEAUTY_1108.webp", natW: 1500, natH: 2250 },
      { src: "/Images/citrine/05_AM_ELLE_MX_BEAUTY_1287.webp", natW: 1500, natH: 1000 },
      { src: "/Images/citrine/06_AM_ELLE_MX_BEAUTY_1521.webp", natW: 1500, natH: 1912 },
      { src: "/Images/citrine/07_AM_ELLE_MX_BEAUTY_1571.webp", natW: 1500, natH: 2250 },
      { src: "/Images/citrine/2ddf6150c426fe1f12c3cf568b3ae2df.webp", natW: 600, natH: 900 },
      { src: "/Images/citrine/74b810987c3c2ab72b8743bc686b27e1.webp", natW: 750, natH: 1125 },
      { src: "/Images/citrine/f6fbc6cea851eafa4dcc1036f52b3504.webp", natW: 1200, natH: 1800 },
    ],
  },
  {
    label: "Sundial",
    color: "#6f8aa1",
    cover: "/Images/sundial/68fdd99629cd4a4a387e1a3c22c284e4.webp",
    natW: 1024,
    natH: 1024,
    description:
      "A study in one day of light, photographed at the same window every hour from sunrise to sundown.",
    paragraphs: [
      "A portrait series chasing one minute of every hour, from sunrise to sundown, across a single August day in Lisbon.",
      "The same face, the same window, twelve different conversations with the sun. The frame never moved; only the light did.",
      "Personal project. Subject and collaborator Renata Aboubacar.",
    ],
    gallery: [
      { src: "/Images/sundial/68fdd99629cd4a4a387e1a3c22c284e4.webp", natW: 1024, natH: 1024 },
      { src: "/Images/sundial/27d73e0a2966b8bd505a8ce671521cd6.webp", natW: 736, natH: 1313 },
      { src: "/Images/sundial/285163c39d4a3f170eca15c3585ba5f4.webp", natW: 735, natH: 919 },
      { src: "/Images/sundial/37c0ae78cb2035fea41db2847fffa080.webp", natW: 736, natH: 1308 },
      { src: "/Images/sundial/3914d5910a87d9dde3199cfb3f3b87e2.webp", natW: 564, natH: 1002 },
      { src: "/Images/sundial/9d8b13a1a65453b8caa711bab925dad2.webp", natW: 736, natH: 1308 },
      { src: "/Images/sundial/a0f5a60684e11980437a435d786e1e63.webp", natW: 749, natH: 846 },
      { src: "/Images/sundial/a59773147786fd548ad7586461f4560c.webp", natW: 736, natH: 920 },
      { src: "/Images/sundial/db2d05e3a7c1a15144817a23058fc311.webp", natW: 736, natH: 1308 },
      { src: "/Images/sundial/dd566cf430e86fcd300939da20101d71.webp", natW: 1080, natH: 1349 },
      { src: "/Images/sundial/e15b4f7b13e97fed0052f3ae5eb4c589.webp", natW: 736, natH: 1308 },
    ],
  },
  {
    label: "Asana",
    color: "#8a9a82",
    cover: "/Images/asana/0a0dd548bc07974140d0dcbf61723d2d.webp",
    natW: 967,
    natH: 1200,
    description:
      "A wellness study in breath, stillness, and slow movement, shot across three afternoons in a garden pavilion.",
    paragraphs: [
      "Three afternoons in a garden pavilion, photographing the small respirations of a body returning to itself. The brief was simple: trust the slow part.",
      "We worked between palm shadow and pool reflection; half portrait series, half movement study, both built around the same quiet rhythm of breath in and breath out.",
      "Talent and collaborator Mira Aragão. Wellness direction by Casa Verde. Shot on Mamiya 7.",
    ],
    gallery: [
      { src: "/Images/asana/0a0dd548bc07974140d0dcbf61723d2d.webp", natW: 967, natH: 1200 },
      { src: "/Images/asana/4f2cd3abc38eb61ac16f51046816a167.webp", natW: 736, natH: 968 },
      { src: "/Images/asana/5b36605cc06a3e0d7f9aa280dfc63207.webp", natW: 742, natH: 1000 },
      { src: "/Images/asana/662058d732bae797c0e664a987986726.webp", natW: 673, natH: 1200 },
      { src: "/Images/asana/6684f301906a26eada053c3aab507c64.webp", natW: 1200, natH: 1800 },
      { src: "/Images/asana/8b4fe58e18d1d1df3477eeecb502fe68.webp", natW: 736, natH: 1104 },
      { src: "/Images/asana/95f43f2141b8e192d15ef482775e299b-1.webp", natW: 1200, natH: 2133 },
      { src: "/Images/asana/a1a5a5b8883cbefcd528796f8f3eee5d.webp", natW: 750, natH: 935 },
      { src: "/Images/asana/af3e3544e8ab075330a58801a3e0747b.webp", natW: 1067, natH: 1600 },
      { src: "/Images/asana/d2c2bccbbf7d438cb6419ef4c5053ae6.webp", natW: 736, natH: 920 },
      { src: "/Images/asana/f8aeedbdfb585bd6b03d0e4c0cbfeb0f.webp", natW: 667, natH: 1000 },
    ],
  },
  {
    label: "Dune",
    color: "#c4a484",
    cover: "/Images/dune/c2f8b4649b24d46eb3c790a32545b495.webp",
    natW: 736,
    natH: 977,
    description:
      "Linen and tulle photographed across the dunes of the Erg Chebbi, in the long minute after the sun leaves.",
    paragraphs: [
      "Linen and tulle in the Erg Chebbi dunes. Forty-three degrees in the shade and no shade.",
      "The clothes wanted to be on the floor; we wanted them in the wind. This is what we got.",
      "Talent Mahmoud Diallo. Wardrobe La Maison Sahara. Eight days, mostly walking.",
    ],
    gallery: [
      { src: "/Images/dune/c2f8b4649b24d46eb3c790a32545b495.webp", natW: 736, natH: 977 },
      { src: "/Images/dune/65c976f5de69f6132cd64b802562ffc1.webp", natW: 736, natH: 1313 },
      { src: "/Images/dune/970b2af2a4685a1edcac18a99781095e.webp", natW: 816, natH: 1456 },
      { src: "/Images/dune/a5a0d3085304ea2ea433e536c30295b6.webp", natW: 736, natH: 1104 },
      { src: "/Images/dune/b2fb68ccbd7183bdb5d4b4c6107b507b.webp", natW: 736, natH: 1308 },
      { src: "/Images/dune/b6ed89418aa67f71d82f97d6f33e3732.webp", natW: 673, natH: 1200 },
      { src: "/Images/dune/c1d53e0432b06ec86d5ea1cd875018bc.webp", natW: 736, natH: 1104 },
      { src: "/Images/dune/c5282cf40da909370ce2aef804e7f59a.webp", natW: 736, natH: 919 },
      { src: "/Images/dune/c63b04f70cd1695c7a8e19345111a405.webp", natW: 736, natH: 1104 },
      { src: "/Images/dune/c6f7dea202df64dfd31a6f775d67816f.webp", natW: 736, natH: 1104 },
      { src: "/Images/dune/d35fd632589a1c692ea39e0104209bd0.webp", natW: 750, natH: 1125 },
    ],
  },
  {
    label: "Lumen",
    color: "#c79b7a",
    cover: "/Images/lumen/15f5819c907b6415eb57758fde69ea5f.webp",
    natW: 736,
    natH: 981,
    description:
      "Brand launch for an indie skincare line: packaging, voice, web flagship, and the full launch campaign.",
    paragraphs: [
      "Brand launch for Lumen, an indie skincare line built around a single quiet ritual.",
      "Packaging, voice, web flagship, and the full shoot: three faces, six products, and a great deal of unscented cream.",
      "Creative direction with the founder. Studio days in Lisbon, packaging at Sun & Sons.",
    ],
    gallery: [
      { src: "/Images/lumen/15f5819c907b6415eb57758fde69ea5f.webp", natW: 736, natH: 981 },
      { src: "/Images/lumen/01747683f401fab00e8b61e880d22309.webp", natW: 1200, natH: 1500 },
      { src: "/Images/lumen/50730f399ced0f368bc154876c5261fd.webp", natW: 736, natH: 923 },
      { src: "/Images/lumen/5bd2029f8588becd678d759b67b2c87e.webp", natW: 736, natH: 1104 },
      { src: "/Images/lumen/807edd70fd5650f007476b46a551abd5.webp", natW: 1000, natH: 1500 },
      { src: "/Images/lumen/859f91eb11ca07afdd064c20c37e7264.webp", natW: 1080, natH: 1350 },
      { src: "/Images/lumen/8773f3826dea82e0ddf47a823934b6a2.webp", natW: 1080, natH: 1350 },
      { src: "/Images/lumen/896a51f0841f128ff60866dc012839b5.webp", natW: 1200, natH: 1601 },
      { src: "/Images/lumen/a395536bd6cf67ee1861d7c8848c1634.webp", natW: 736, natH: 1313 },
      { src: "/Images/lumen/cb39d4d73a49e29996ddb619845cd5d9.webp", natW: 736, natH: 916 },
      { src: "/Images/lumen/dfa8e25c3012c096b8a1c460ff029cba.webp", natW: 736, natH: 920 },
      { src: "/Images/lumen/e7f99c9a26de0d85e1ec5defe0faddf9.webp", natW: 736, natH: 1104 },
      { src: "/Images/lumen/ff3bb4e1b519925cfc28a318c677dfaf.webp", natW: 1080, natH: 1350 },
    ],
  },
];

// Per-card metrics derived from each image's true aspect ratio.
const HEIGHTS = PROJECTS.map((p) => (IMAGE_WIDTH * p.natH) / p.natW);
const SLOTS = HEIGHTS.map((h) => h + COLUMN_GAP);
const OFFSETS: number[] = (() => {
  const acc: number[] = [];
  let total = 0;
  for (let i = 0; i < SLOTS.length; i++) {
    acc.push(total);
    total += SLOTS[i];
  }
  return acc;
})();
const LOOP_HEIGHT = SLOTS.reduce((a, b) => a + b, 0);
const ANCHOR_CENTER = OFFSETS[ANCHOR_INDEX] + HEIGHTS[ANCHOR_INDEX] / 2;
const COLUMN_OFFSET_PX = ANCHOR_CENTER;
const CENTERS = OFFSETS.map((o, i) => o + HEIGHTS[i] / 2);

type Phase =
  | "init"
  | "image-rising"
  | "flipping"
  | "mini-expand"
  | "spreading"
  | "scrolling"
  | "detail-transitioning"
  | "detail"
  | "detail-closing"
  | "about"
  | "about-closing";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Rect = { x: number; y: number; w: number; h: number };

export default function Intro() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstLetterRef = useRef<HTMLSpanElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const cloneRef = useRef<HTMLDivElement>(null);
  const scrollYRef = useRef(0);
  const hoverRef = useRef(false);
  const multiplierRef = useRef(1);
  const modeRef = useRef<"auto" | "tween">("auto");
  const tweenRef = useRef<{ y: number; t: number; target: number }>({
    y: 0,
    t: 0,
    target: 0,
  });
  const dragMoveRef = useRef(0);
  const originRectRef = useRef<Rect | null>(null);
  const resumeScrollYRef = useRef<number | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const detailScrollYRef = useRef(0);
  const aboutScrollRef = useRef<HTMLDivElement>(null);
  const aboutScrollYRef = useRef(0);
  const menuListRef = useRef<HTMLDivElement>(null);
  // Mobile-only native scroll container. Used to track active project (which
  // card is closest to viewport center) so the right-side indicator dots and
  // any future analytics stay in sync.
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const menuScrollYRef = useRef(0);
  const menuOpenRef = useRef(false);
  // Phase is mirrored into a ref so the popstate listener (a stable callback
  // bound once on mount) reads the live value rather than a stale closure.
  const phaseRef = useRef<Phase>("init");
  // Marks any state change being driven BY a popstate event so the matching
  // close functions don't push another history entry (which would cause an
  // infinite back-button loop).
  const handlingPopstateRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // While true, the menu overlay runs its GSAP exit timeline and won't unmount
  // until that timeline calls back with handleMenuClosed.
  const [menuClosing, setMenuClosing] = useState(false);
  // True when the active detail page was opened from a card click (has a valid
  // origin rect for the GSAP fly). False when opened via the menu (no fly).
  const [openedFromCard, setOpenedFromCard] = useState(false);
  const homeMenuMagnetRef = useMagnetic<HTMLButtonElement>();
  const detailMenuMagnetRef = useMagnetic<HTMLButtonElement>();
  // Bumped every time we return to the home page so the about + brief
  // mask-reveals replay (just like the first load).
  const [homeRevealKey, setHomeRevealKey] = useState(0);
  // Mobile-specific: drives the cross-fade of the EZRA VALE headline
  // between the big centered intro and the small corner logo.
  // logoOpacity is set to 0 in the last ms of mini-expand (the headline
  // fades out while the cards return to rest), then back to 1 the same
  // moment phase enters "scrolling" — where logoRevealKey is bumped to
  // force the h1 to remount with the letter-rise animation replaying.
  const [logoOpacity, setLogoOpacity] = useState(1);
  const [logoRevealKey, setLogoRevealKey] = useState(0);
  // Tracks the pixel coordinate the menu should iris OUT from (and
  // collapse back to). Updated on every openMenu() call. The MenuOverlay
  // uses this for a clip-path circle animation, so the panel grows from
  // the MENU button position and shrinks back to it on close.
  const [menuOrigin, setMenuOrigin] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  // Mirrors window.innerWidth into state so layout that depends on it
  // (detailDims, the detail page right column / gallery sizing, the
  // home-page text panel responsive widths) recomputes when the user
  // resizes the browser. Without this the detail page renders at its
  // mount-time width forever — resizing the window doesn't reflow until
  // the page reloads.
  const [viewportW, setViewportW] = useState<number>(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const [fontSize, setFontSize] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("init");
  const [imageIndex, setImageIndex] = useState(FLIP_START_INDEX);
  const [activeProject, setActiveProject] = useState(ANCHOR_INDEX);
  const [textLeft, setTextLeft] = useState<number>(SIDE_PADDING);
  // Measured sidebearing of the "E" glyph. Applied as negative marginLeft
  // on the headline so its visible stroke aligns with SIDE_PADDING.
  const [headingShift, setHeadingShift] = useState<number>(0);
  const [detailIdx, setDetailIdx] = useState<number | null>(null);
  const isMobile = useIsMobile();

  const isDetailPhase =
    phase === "detail-transitioning" ||
    phase === "detail" ||
    phase === "detail-closing";
  const isAboutPhase = phase === "about" || phase === "about-closing";
  // The home UI (column, indicators, about, info) stays hidden through all
  // three detail phases AND the about phase. The column only fades back in
  // once we're fully back in "scrolling".
  const hideHomeUi =
    phase === "detail-transitioning" ||
    phase === "detail" ||
    phase === "detail-closing" ||
    isAboutPhase;

  useIsoLayoutEffect(() => {
    const fit = () => {
      const container = containerRef.current;
      const heading = headingRef.current;
      if (!container || !heading) return;
      // Fit the VISIBLE-stroke-to-VISIBLE-stroke width to the available area,
      // not the full glyph-box width. The headline carries marginLeft equal
      // to its left sidebearing so the visible "E" of "Ezra" lands at
      // SIDE_PADDING; the right edge of the final "e" in "Vale" should land
      // at viewport - SIDE_PADDING (flush with the menu word below). Visible
      // stretch = scrollWidth - leftSidebearing - rightSidebearing. For the
      // string "Ezra Vale" in NHG Display Medium the ratios are 5.5% (E) and
      // 1.9% (e) of em, measured via Canvas API.
      const TOTAL_SB_RATIO = LEFT_SB_RATIO + RIGHT_SB_RATIO;
      const available =
        container.clientWidth - SIDE_PADDING * 2 - SAFETY_PX;
      const current = parseFloat(getComputedStyle(heading).fontSize);
      const natural = heading.scrollWidth;
      const visibleNatural = natural - TOTAL_SB_RATIO * current;
      if (visibleNatural <= 0 || current === 0) return;
      const target = current * (available / visibleNatural);
      setFontSize((prev) =>
        prev !== null && Math.abs(prev - target) < 0.5 ? prev : target,
      );
    };

    fit();

    if (document.fonts?.ready) {
      document.fonts.ready.then(fit);
    }

    const ro = new ResizeObserver(fit);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Shift the headline LEFT by exactly its left sidebearing so the visible
  // "E" stroke lands at SIDE_PADDING. Combined with the visible-width fit
  // calculation above, this also puts the visible right stroke of the final
  // "e" in "Vale" at viewport - SIDE_PADDING.
  useIsoLayoutEffect(() => {
    const fs = fontSize ?? BASE_FONT_SIZE;
    const shift = fs * LEFT_SB_RATIO;
    setHeadingShift((prev) =>
      Math.abs(prev - shift) < 0.5 ? prev : shift,
    );
    setTextLeft((prev) =>
      Math.abs(prev - SIDE_PADDING) < 0.5 ? prev : SIDE_PADDING,
    );
  }, [fontSize]);

  useEffect(() => {
    if (fontSize !== null) {
      const id = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(id);
    }
  }, [fontSize]);

  useEffect(() => {
    if (!ready) return;
    // Same start on both: rising image after the headline reveal.
    const id = setTimeout(() => setPhase("image-rising"), IMAGE_DELAY_MS);
    return () => clearTimeout(id);
  }, [ready]);

  useEffect(() => {
    if (phase !== "image-rising") return;
    const id = setTimeout(() => setPhase("flipping"), IMAGE_RISE_MS);
    return () => clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "flipping") return;
    let step = 0;
    const id = setInterval(() => {
      if (step >= FLIP_SEQUENCE.length) {
        clearInterval(id);
        setPhase("mini-expand");
        return;
      }
      setImageIndex(FLIP_SEQUENCE[step]);
      step += 1;
    }, FLIP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "mini-expand") return;
    // On mobile, skip the spreading choreography entirely — mini-expand
    // collapses back to rest, then transitions DIRECTLY into the native
    // scroll layout via the mobile-scroll-expand animation. Desktop still
    // runs the spreading fan-out which works at its size.
    const nextPhase: Phase = isMobile ? "scrolling" : "spreading";
    // Mobile: start fading the BIG centered headline OUT 350ms before the
    // mini-expand keyframe ends, so the cards return to rest while the
    // headline dissolves at center. Then when phase flips to "scrolling",
    // the headline remounts at the corner (logo-mode) with the letter-
    // rise animation replaying — that's the "reappear as the logo at
    // the top, having the reveal animation" the user described.
    const fadeOutAt = MINI_EXPAND_MS - 350;
    const fadeTimer = isMobile
      ? setTimeout(() => setLogoOpacity(0), fadeOutAt)
      : null;
    const phaseTimer = setTimeout(() => {
      if (isMobile) {
        // Remount the h1 so letter-rise plays fresh, and restore opacity.
        setLogoRevealKey((k) => k + 1);
        setLogoOpacity(1);
      }
      setPhase(nextPhase);
    }, MINI_EXPAND_MS + MINI_GAP_MS);
    return () => {
      if (fadeTimer) clearTimeout(fadeTimer);
      clearTimeout(phaseTimer);
    };
  }, [phase, isMobile]);

  useEffect(() => {
    if (phase !== "spreading") return;
    const id = setTimeout(() => setPhase("scrolling"), SPREAD_MS);
    return () => clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "scrolling") {
      if (phase === "init" || phase === "image-rising" || phase === "flipping" || phase === "mini-expand" || phase === "spreading") {
        setActiveProject(ANCHOR_INDEX);
      }
      return;
    }
    // Resume preserved scroll position when returning from detail; otherwise start fresh.
    if (resumeScrollYRef.current !== null) {
      scrollYRef.current = resumeScrollYRef.current;
      resumeScrollYRef.current = null;
    } else {
      scrollYRef.current = 0;
    }
    multiplierRef.current = 1;
    modeRef.current = "auto";

    let raf = 0;
    let last = performance.now();
    let lastActive = activeProject;
    const LOOP = LOOP_HEIGHT;
    const NORMAL_SPEED = LOOP / SCROLL_DURATION_MS;
    // Positive-modulo so scrollY wraps cleanly in BOTH directions — without
    // this, scrolling up past 0 produces negative values that the JS `%`
    // operator leaves negative, which would feel like hitting a wall.
    const wrap = (v: number) => ((v % LOOP) + LOOP) % LOOP;

    const findActiveIdx = (scrollY: number): number => {
      const norm = ((scrollY % LOOP) + LOOP) % LOOP;
      const target = (((ANCHOR_CENTER + norm) % LOOP) + LOOP) % LOOP;
      let bestI = 0;
      let bestD = Infinity;
      for (let i = 0; i < PROJECTS.length; i++) {
        let d = Math.abs(CENTERS[i] - target);
        d = Math.min(d, LOOP - d);
        if (d < bestD) {
          bestD = d;
          bestI = i;
        }
      }
      return bestI;
    };

    const tick = (now: number) => {
      const dt = Math.min(now - last, 64);
      last = now;

      if (modeRef.current === "tween") {
        const tweenT = Math.min((now - tweenRef.current.t) / TWEEN_MS, 1);
        const eased = 1 - Math.pow(1 - tweenT, 3);
        scrollYRef.current =
          tweenRef.current.y +
          (tweenRef.current.target - tweenRef.current.y) * eased;
        if (tweenT >= 1) {
          scrollYRef.current =
            ((tweenRef.current.target % LOOP) + LOOP) % LOOP;
          modeRef.current = "auto";
        }
      } else {
        const targetMult = hoverRef.current ? SLOW_FACTOR : 1;
        multiplierRef.current += (targetMult - multiplierRef.current) * 0.08;
        const speed = NORMAL_SPEED * multiplierRef.current;
        scrollYRef.current = wrap(scrollYRef.current + dt * speed);
      }

      if (columnRef.current) {
        columnRef.current.style.transform = `translate3d(-50%, ${-scrollYRef.current}px, 0)`;
      }

      const activeIdx = findActiveIdx(scrollYRef.current);
      if (activeIdx !== lastActive) {
        lastActive = activeIdx;
        setActiveProject(activeIdx);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== "scrolling") return;
    const col = columnRef.current;
    if (!col) return;
    const LOOP = LOOP_HEIGHT;
    const wrap = (v: number) => ((v % LOOP) + LOOP) % LOOP;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      modeRef.current = "auto";
      scrollYRef.current = wrap(scrollYRef.current + e.deltaY);
    };
    col.addEventListener("wheel", onWheel, { passive: false });

    let dragging = false;
    let startClientX = 0;
    let startClientY = 0;
    let startScrollY = 0;
    let downTarget: Element | null = null;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      startClientX = e.clientX;
      startClientY = e.clientY;
      startScrollY = scrollYRef.current;
      dragMoveRef.current = 0;
      downTarget = e.target as Element | null;
      modeRef.current = "auto";
      try {
        col.setPointerCapture(e.pointerId);
      } catch {}
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startClientX;
      const dy = e.clientY - startClientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      dragMoveRef.current = Math.max(dragMoveRef.current, dist);
      scrollYRef.current = wrap(startScrollY + (startClientY - e.clientY));
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      try {
        col.releasePointerCapture(e.pointerId);
      } catch {}
      // Treat as click if pointer barely moved
      if (dragMoveRef.current < 5 && downTarget) {
        const cardEl = (downTarget as Element).closest?.(
          "[data-project-idx]",
        ) as Element | null;
        if (cardEl) {
          const idxAttr = cardEl.getAttribute("data-project-idx");
          const idx = idxAttr ? parseInt(idxAttr, 10) : -1;
          if (idx >= 0) {
            const rect = cardEl.getBoundingClientRect();
            openDetail(idx, rect);
          }
        }
      }
      downTarget = null;
    };

    col.style.cursor = "pointer";
    col.addEventListener("pointerdown", onPointerDown);
    col.addEventListener("pointermove", onPointerMove);
    col.addEventListener("pointerup", onPointerUp);
    col.addEventListener("pointercancel", onPointerUp);

    return () => {
      col.removeEventListener("wheel", onWheel);
      col.removeEventListener("pointerdown", onPointerDown);
      col.removeEventListener("pointermove", onPointerMove);
      col.removeEventListener("pointerup", onPointerUp);
      col.removeEventListener("pointercancel", onPointerUp);
      col.style.cursor = "";
    };
  }, [phase]);

  // ───── Detail open / close transitions (GSAP) ─────

  const openDetail = (idx: number, rect: DOMRect) => {
    pushOverlayHistory("detail");
    resumeScrollYRef.current = scrollYRef.current;
    setDetailIdx(idx);
    setActiveProject(idx);
    if (isMobile) {
      // Skip the GSAP fly on mobile — the detail page stacks vertically and
      // the desktop-sized target wouldn't match the mobile layout. Just
      // open detail and let the page fade in.
      originRectRef.current = null;
      setOpenedFromCard(false);
      setPhase("detail");
      return;
    }
    originRectRef.current = {
      x: rect.left,
      y: rect.top,
      w: rect.width,
      h: rect.height,
    };
    setOpenedFromCard(true);
    setPhase("detail-transitioning");
  };

  // Navigation from the menu: mount the destination IMMEDIATELY (under the
  // menu's z:50 overlay) and trigger the menu's clean fade-out on top. The
  // two crossfade naturally — destination becomes visible as the menu
  // fades to opacity 0.
  const openDetailFromMenu = (idx: number) => {
    pushOverlayHistory("detail");
    resumeScrollYRef.current = scrollYRef.current;
    originRectRef.current = null;
    setOpenedFromCard(false);
    setDetailIdx(idx);
    setActiveProject(idx);
    setPhase("detail");
    closeMenu();
  };

  // Click the EZRA VALE logo (in detail, menu, or about) to return home.
  // Does the close transitions directly AND pops N history entries so the
  // browser stack stays in sync. Suppresses the popstate handler during the
  // multi-pop (otherwise it would double-fire one of the closes).
  const goHome = () => {
    if (typeof window === "undefined") return;
    let depth = 0;
    if (menuOpen) {
      depth += 1;
      setMenuClosing(true);
    }
    if (
      phase === "detail" ||
      phase === "detail-transitioning" ||
      phase === "detail-closing"
    ) {
      depth += 1;
      if (cloneRef.current) gsap.killTweensOf(cloneRef.current);
      setPhase("detail-closing");
      setTimeout(() => {
        setDetailIdx(null);
        setOpenedFromCard(false);
        originRectRef.current = null;
        setPhase("scrolling");
        setHomeRevealKey((k) => k + 1);
      }, 280);
    } else if (phase === "about" || phase === "about-closing") {
      depth += 1;
      setPhase("about-closing");
      setTimeout(() => {
        setPhase("scrolling");
        setHomeRevealKey((k) => k + 1);
      }, 280);
    }
    if (depth > 0) {
      handlingPopstateRef.current = true;
      window.history.go(-depth);
      setTimeout(() => {
        handlingPopstateRef.current = false;
      }, 320);
    }
  };

  // No reverse fly — the detail content fades out, the column at the saved
  // scroll position reappears, and EZRA VALE CSS-grows back to full size.
  const closeDetail = () => {
    if (phase !== "detail") return;
    setPhase("detail-closing");
    setTimeout(() => {
      setDetailIdx(null);
      setOpenedFromCard(false);
      originRectRef.current = null;
      setPhase("scrolling");
      setHomeRevealKey((k) => k + 1);
    }, 280);
  };

  // ───── About page open / close ─────
  const openAbout = () => {
    pushOverlayHistory("about");
    // If a detail page is open, close it first (fade out), then open about.
    // If on home, go straight to about.
    if (menuOpen) setMenuClosing(true);
    resumeScrollYRef.current = scrollYRef.current;
    if (phase === "detail") {
      setPhase("detail-closing");
      setTimeout(() => {
        setDetailIdx(null);
        setOpenedFromCard(false);
        originRectRef.current = null;
        setPhase("about");
      }, 280);
      return;
    }
    setPhase("about");
  };

  const closeAbout = () => {
    if (phase !== "about") return;
    setPhase("about-closing");
    setTimeout(() => {
      setPhase("scrolling");
      setHomeRevealKey((k) => k + 1);
    }, 280);
  };

  // Open transition: position clone at originRect, slide to left, then scale up.
  useIsoLayoutEffect(() => {
    if (phase !== "detail-transitioning") return;
    if (detailIdx === null) return;
    const el = cloneRef.current;
    const origin = originRectRef.current;
    if (!el || !origin) return;

    const project = PROJECTS[detailIdx];
    const viewportW = window.innerWidth;
    const { imageW: detailW, imageLeft: detailLeft } = detailMetrics(viewportW);
    const aspect = project.natH / project.natW;
    const detailH = detailW * aspect;
    const detailTop = DETAIL_TOP_BAR;

    // Initial position matches the clicked card exactly.
    gsap.set(el, {
      position: "fixed",
      left: origin.x,
      top: origin.y,
      width: origin.w,
      height: origin.h,
      zIndex: 30,
    });

    const tl = gsap.timeline({
      onComplete: () => setPhase("detail"),
    });
    tl.to(el, {
      left: detailLeft,
      top: detailTop,
      duration: FLY_MOVE_MS / 1000,
      ease: "power3.inOut",
    });
    tl.to(
      el,
      {
        width: detailW,
        height: detailH,
        duration: FLY_SCALE_MS / 1000,
        ease: "power3.inOut",
      },
      ">-0.05",
    );

    return () => {
      tl.kill();
    };
  }, [phase, detailIdx]);

  // Close transition: scale back to original size at left, then slide back.
  useIsoLayoutEffect(() => {
    if (phase !== "detail-closing") return;
    if (detailIdx === null) return;
    const el = cloneRef.current;
    const origin = originRectRef.current;
    if (!el || !origin) return;

    // The clone has just re-mounted with no style — seed it at the cover's
    // current detail-page position before animating back to the origin.
    const project = PROJECTS[detailIdx];
    const viewportW = window.innerWidth;
    const { imageW: detailW, imageLeft: detailLeft } = detailMetrics(viewportW);
    const detailH = (detailW * project.natH) / project.natW;
    gsap.set(el, {
      position: "fixed",
      left: detailLeft,
      top: DETAIL_TOP_BAR,
      width: detailW,
      height: detailH,
      zIndex: 30,
    });

    const tl = gsap.timeline({
      onComplete: () => {
        setDetailIdx(null);
        originRectRef.current = null;
        setPhase("scrolling");
      },
    });
    tl.to(el, {
      width: origin.w,
      height: origin.h,
      duration: FLY_SCALE_MS / 1000,
      ease: "power3.inOut",
    });
    tl.to(
      el,
      {
        left: origin.x,
        top: origin.y,
        duration: FLY_MOVE_MS / 1000,
        ease: "power3.inOut",
      },
      ">-0.05",
    );

    return () => {
      tl.kill();
    };
  }, [phase, detailIdx]);

  // ───── Detail page: lerp-smoothed wheel/touch scroll for the LEFT gallery
  // (desktop only — mobile uses native overflow-y:auto scroll)
  useEffect(() => {
    if (phase !== "detail") return;
    if (detailIdx === null) return;
    // On mobile the detail page is a single overflow-y:auto container with
    // native scroll. The window-level wheel handlers below would hijack it,
    // calling preventDefault and blocking touch scrolling. Skip entirely.
    if (
      typeof window !== "undefined" &&
      window.innerWidth < MOBILE_BREAKPOINT
    ) {
      return;
    }
    detailScrollYRef.current = 0;
    if (galleryRef.current) {
      galleryRef.current.style.transform = "translate3d(0, 0, 0)";
    }

    // target = user's intent (set instantly on wheel/drag)
    // current (detailScrollYRef) = what's actually applied to the transform
    // RAF lerps current toward target for buttery smoothness.
    let target = 0;
    let maxScroll = 0;
    const computeMax = () => {
      const gallery = galleryRef.current;
      if (!gallery) return;
      const total = gallery.scrollHeight;
      const visibleH = window.innerHeight - SIDE_PADDING * 2;
      maxScroll = Math.max(0, total - visibleH);
      if (target > maxScroll) target = maxScroll;
      if (detailScrollYRef.current > maxScroll) {
        detailScrollYRef.current = maxScroll;
        apply();
      }
    };
    const apply = () => {
      if (galleryRef.current) {
        galleryRef.current.style.transform = `translate3d(0, ${-detailScrollYRef.current}px, 0)`;
      }
    };

    computeMax();
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => computeMax())
        : null;
    if (ro && galleryRef.current) ro.observe(galleryRef.current);
    window.addEventListener("resize", computeMax);
    const imgs = galleryRef.current?.querySelectorAll("img") ?? [];
    imgs.forEach((img) => {
      if (!(img as HTMLImageElement).complete) {
        img.addEventListener("load", computeMax, { once: true });
      }
    });

    const onWheel = (e: WheelEvent) => {
      if (menuOpenRef.current) return;
      e.preventDefault();
      target = Math.max(0, Math.min(maxScroll, target + e.deltaY));
    };

    let dragging = false;
    let startY = 0;
    let startScroll = 0;
    const onPointerDown = (e: PointerEvent) => {
      if (menuOpenRef.current) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("a, button")) return;
      dragging = true;
      startY = e.clientY;
      startScroll = target;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const next = startScroll + (startY - e.clientY);
      target = Math.max(0, Math.min(maxScroll, next));
      // For dragging, snap current directly so the gallery tracks the finger
      // without lag — lerp is for wheel inertia, not drag.
      detailScrollYRef.current = target;
      apply();
    };
    const onPointerUp = () => {
      dragging = false;
    };

    // Continuous RAF — lerp current toward target.
    let raf = 0;
    const tick = () => {
      const diff = target - detailScrollYRef.current;
      if (Math.abs(diff) > 0.1) {
        detailScrollYRef.current += diff * 0.12;
        apply();
      } else if (detailScrollYRef.current !== target) {
        detailScrollYRef.current = target;
        apply();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("resize", computeMax);
      if (ro) ro.disconnect();
    };
  }, [phase, detailIdx]);

  // On close, snap gallery scroll back to 0 so the clone's hand-off lines up.
  useIsoLayoutEffect(() => {
    if (phase !== "detail-closing") return;
    detailScrollYRef.current = 0;
    if (galleryRef.current) {
      galleryRef.current.style.transform = "translate3d(0, 0, 0)";
    }
  }, [phase]);

  // ───── About page: lerp-smoothed wheel/touch scroll for the RIGHT column
  // (desktop only — mobile uses native overflow-y:auto scroll)
  useEffect(() => {
    if (phase !== "about") return;
    // Mobile uses native overflow-y:auto scroll. Skip the desktop wheel/drag
    // hijacking which would block native touch scrolling.
    if (
      typeof window !== "undefined" &&
      window.innerWidth < MOBILE_BREAKPOINT
    ) {
      return;
    }
    aboutScrollYRef.current = 0;
    if (aboutScrollRef.current) {
      aboutScrollRef.current.style.transform = "translate3d(0, 0, 0)";
    }

    let target = 0;
    let maxScroll = 0;
    const apply = () => {
      if (aboutScrollRef.current) {
        aboutScrollRef.current.style.transform = `translate3d(0, ${-aboutScrollYRef.current}px, 0)`;
      }
    };
    const computeMax = () => {
      const el = aboutScrollRef.current;
      if (!el) return;
      const total = el.scrollHeight;
      const visibleH = window.innerHeight - SIDE_PADDING * 2;
      maxScroll = Math.max(0, total - visibleH);
      if (target > maxScroll) target = maxScroll;
      if (aboutScrollYRef.current > maxScroll) {
        aboutScrollYRef.current = maxScroll;
        apply();
      }
    };

    computeMax();
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => computeMax())
        : null;
    if (ro && aboutScrollRef.current) ro.observe(aboutScrollRef.current);
    window.addEventListener("resize", computeMax);

    const onWheel = (e: WheelEvent) => {
      if (menuOpenRef.current) return;
      e.preventDefault();
      target = Math.max(0, Math.min(maxScroll, target + e.deltaY));
    };

    let dragging = false;
    let startY = 0;
    let startScroll = 0;
    const onPointerDown = (e: PointerEvent) => {
      if (menuOpenRef.current) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("a, button")) return;
      dragging = true;
      startY = e.clientY;
      startScroll = target;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const next = startScroll + (startY - e.clientY);
      target = Math.max(0, Math.min(maxScroll, next));
      aboutScrollYRef.current = target;
      apply();
    };
    const onPointerUp = () => {
      dragging = false;
    };

    let raf = 0;
    const tick = () => {
      const diff = target - aboutScrollYRef.current;
      if (Math.abs(diff) > 0.1) {
        aboutScrollYRef.current += diff * 0.12;
        apply();
      } else if (aboutScrollYRef.current !== target) {
        aboutScrollYRef.current = target;
        apply();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("resize", computeMax);
      if (ro) ro.disconnect();
    };
  }, [phase]);

  // ───── Mobile card-step auto-advance ─────
  // Option B from the trade-off discussion: keep native iOS scroll +
  // scroll-snap, and have the page programmatically snap to the NEXT
  // card every STEP_INTERVAL_MS using scrollTo({behavior: 'smooth'}).
  // Continuous-drift fought scroll-snap-mandatory (snap kept pulling
  // scrollTop back to the nearest snap point each frame, so 0.27px
  // increments never went anywhere). Stepping to a SPECIFIC snap point
  // works with snap instead of against it.
  //
  // Loop: after the last card, instant-teleport back to top (cards 6 → 0
  // happens in a single frame; this IS the "brief snap-back" the user
  // accepted in Option B). Touching the screen pauses everything;
  // releasing schedules the next step RESUME_DELAY_MS later.
  useEffect(() => {
    if (!isMobile || phase !== "scrolling") return;
    const el = mobileScrollRef.current;
    if (!el) return;

    const STEP_INTERVAL_MS = 4000;
    const RESUME_DELAY_MS = 4000;
    // Wait for the 700ms expand-in to finish + a beat before stepping.
    const FIRST_STEP_DELAY_MS = 1200;

    let userTouching = false;
    let nextStepAt = performance.now() + FIRST_STEP_DELAY_MS;
    let raf = 0;

    const getCards = () =>
      Array.from(
        el.querySelectorAll("[data-mobile-project-idx]"),
      ) as HTMLElement[];

    const currentCardIndex = () => {
      const cards = getCards();
      if (cards.length === 0) return 0;
      const scrollTop = el.scrollTop;
      let closest = 0;
      let minDist = Infinity;
      for (let i = 0; i < cards.length; i++) {
        const dist = Math.abs(cards[i].offsetTop - scrollTop);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      }
      return closest;
    };

    const advanceToNext = () => {
      const cards = getCards();
      if (cards.length === 0) return;
      const next = (currentCardIndex() + 1) % cards.length;
      const target = cards[next];
      if (next === 0) {
        // Loop point: instant teleport back to top. Smooth-scrolling 6
        // cards backwards would be a long backward sweep that reads as
        // "going wrong direction" before resuming forward.
        el.scrollTo({ top: 0, behavior: "auto" });
      } else {
        el.scrollTo({ top: target.offsetTop, behavior: "smooth" });
      }
    };

    const tick = (t: number) => {
      if (!userTouching && t >= nextStepAt) {
        advanceToNext();
        nextStepAt = t + STEP_INTERVAL_MS;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onTouchStart = () => {
      userTouching = true;
    };
    const onTouchEnd = () => {
      userTouching = false;
      nextStepAt = performance.now() + RESUME_DELAY_MS;
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [isMobile, phase]);

  // ───── Menu overlay: open/close + infinite wheel scroll ─────
  useEffect(() => {
    menuOpenRef.current = menuOpen;
  }, [menuOpen]);

  // Keep phaseRef in lockstep so the popstate listener can read the current
  // phase without re-binding on every state change.
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // ───── Browser history integration ─────
  // Each overlay open pushes a synthetic history entry; the browser's Back
  // button (or a swipe-back gesture on mobile) fires popstate, which closes
  // whatever overlay is currently visible. This lets the system back button
  // act exactly like the in-page Back button, which mobile users expect.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPopstate = () => {
      handlingPopstateRef.current = true;
      // Close in z-order: menu sits on top, then detail/about underneath.
      if (menuOpenRef.current) {
        setMenuClosing(true);
      } else if (phaseRef.current === "detail") {
        setPhase("detail-closing");
        setTimeout(() => {
          setDetailIdx(null);
          setOpenedFromCard(false);
          originRectRef.current = null;
          setPhase("scrolling");
          setHomeRevealKey((k) => k + 1);
        }, 280);
      } else if (phaseRef.current === "about") {
        setPhase("about-closing");
        setTimeout(() => {
          setPhase("scrolling");
          setHomeRevealKey((k) => k + 1);
        }, 280);
      }
      // Allow subsequent opens to push again after the close settles.
      setTimeout(() => {
        handlingPopstateRef.current = false;
      }, 320);
    };
    window.addEventListener("popstate", onPopstate);
    return () => window.removeEventListener("popstate", onPopstate);
  }, []);

  // Helper used by all open* functions to consume a history slot. Skips the
  // push when we're already responding to a popstate (avoids loops) or in
  // SSR. The URL stays unchanged — we only need a history slot to consume
  // on back-navigation.
  const pushOverlayHistory = (kind: "detail" | "about" | "menu") => {
    if (typeof window === "undefined") return;
    if (handlingPopstateRef.current) return;
    window.history.pushState({ overlay: kind }, "");
  };

  const openMenu = (e?: React.MouseEvent | React.PointerEvent) => {
    pushOverlayHistory("menu");
    menuScrollYRef.current = 0;
    // Capture click position so the menu can iris OUT from where the
    // MENU button was tapped, and iris BACK to that point on close. Use
    // a sensible top-right default if the open is programmatic (e.g.
    // from a routing source that has no event).
    if (e && typeof e.clientX === "number") {
      setMenuOrigin({ x: e.clientX, y: e.clientY });
    } else if (typeof window !== "undefined") {
      setMenuOrigin({
        x: window.innerWidth - 40,
        y: 40,
      });
    }
    setMenuClosing(false);
    setMenuOpen(true);
  };
  // Triggers the GSAP exit timeline inside MenuOverlay — the overlay calls
  // handleMenuClosed when the timeline completes, which actually unmounts it.
  const closeMenu = () => {
    if (!menuOpen || menuClosing) return;
    setMenuClosing(true);
  };
  const handleMenuClosed = useCallback(() => {
    setMenuOpen(false);
    setMenuClosing(false);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    menuScrollYRef.current = 0;
    if (menuListRef.current) {
      menuListRef.current.style.transform = "translate3d(0, 0, 0)";
    }
    let itemHeight = getMenuItemHeight();
    let LOOP = PROJECTS.length * itemHeight;
    // Target accumulates user intent (can go unbounded, we normalize each
    // frame); current lerps toward target for buttery smoothness.
    let target = 0;
    const updateBounds = () => {
      const newItemHeight = getMenuItemHeight();
      if (newItemHeight === itemHeight) return;
      const ratio = newItemHeight / itemHeight;
      menuScrollYRef.current = menuScrollYRef.current * ratio;
      target = target * ratio;
      itemHeight = newItemHeight;
      LOOP = PROJECTS.length * itemHeight;
    };
    window.addEventListener("resize", updateBounds);

    const apply = () => {
      if (menuListRef.current) {
        const wrapped =
          ((menuScrollYRef.current % LOOP) + LOOP) % LOOP;
        menuListRef.current.style.transform = `translate3d(0, ${-wrapped}px, 0)`;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      target += e.deltaY;
    };

    let dragging = false;
    let startY = 0;
    let startScroll = 0;
    let pointerId: number | null = null;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("a, button")) return;
      dragging = true;
      startY = e.clientY;
      startScroll = target;
      pointerId = e.pointerId;
      // Capture so we still receive pointermove if the finger leaves the
      // list bounds during a fast swipe — without this, mobile drags drop
      // out as soon as the touch crosses an item boundary on iOS.
      const listEl = menuListRef.current?.parentElement;
      try {
        listEl?.setPointerCapture(e.pointerId);
      } catch {}
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      target = startScroll + (startY - e.clientY);
      menuScrollYRef.current = target;
      apply();
    };
    const onPointerUp = (e: PointerEvent) => {
      dragging = false;
      const listEl = menuListRef.current?.parentElement;
      if (pointerId !== null) {
        try {
          listEl?.releasePointerCapture(pointerId);
        } catch {}
      }
      pointerId = null;
      void e;
    };

    let raf = 0;
    const tick = () => {
      const diff = target - menuScrollYRef.current;
      if (Math.abs(diff) > 0.1) {
        menuScrollYRef.current += diff * 0.12;
        apply();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Bind to the scroll-area element (parent of menuListRef) rather than
    // window, so iOS doesn't compete with system gestures and the listeners
    // don't fire when interacting with the About panel below.
    const listScrollEl = menuListRef.current?.parentElement;
    listScrollEl?.addEventListener("wheel", onWheel, { passive: false });
    listScrollEl?.addEventListener("pointerdown", onPointerDown);
    listScrollEl?.addEventListener("pointermove", onPointerMove);
    listScrollEl?.addEventListener("pointerup", onPointerUp);
    listScrollEl?.addEventListener("pointercancel", onPointerUp);
    return () => {
      cancelAnimationFrame(raf);
      listScrollEl?.removeEventListener("wheel", onWheel);
      listScrollEl?.removeEventListener("pointerdown", onPointerDown);
      listScrollEl?.removeEventListener("pointermove", onPointerMove);
      listScrollEl?.removeEventListener("pointerup", onPointerUp);
      listScrollEl?.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("resize", updateBounds);
    };
  }, [menuOpen]);

  // ───── Indicator navigation ─────
  const navigateToProject = (projectIdx: number) => {
    if (phase !== "scrolling") return;
    const LOOP = LOOP_HEIGHT;
    const targetMod =
      (((CENTERS[projectIdx] - ANCHOR_CENTER) % LOOP) + LOOP) % LOOP;
    const currentY = scrollYRef.current;
    const currentMod = ((currentY % LOOP) + LOOP) % LOOP;
    let delta = targetMod - currentMod;
    if (delta > LOOP / 2) delta -= LOOP;
    else if (delta < -LOOP / 2) delta += LOOP;
    const target = currentY + delta;
    tweenRef.current = { y: currentY, t: performance.now(), target };
    modeRef.current = "tween";
  };

  // ───── Render helpers ─────
  const letters = NAME.split("");

  // Detail size for layout (right column placement, gallery sizing).
  // Recomputes when the project changes OR the viewport resizes — the
  // viewportW dependency is critical, without it the detail page locks
  // to its mount-time width and won't reflow when the user drags the
  // browser window edge.
  const detailDims = useMemo(() => {
    if (detailIdx === null) return null;
    const project = PROJECTS[detailIdx];
    const { imageW: detailW } = detailMetrics(viewportW);
    const aspect = project.natH / project.natW;
    const detailH = detailW * aspect;
    return { w: detailW, h: detailH };
  }, [detailIdx, viewportW]);

  return (
    <section
      ref={containerRef}
      className="relative flex w-screen items-center overflow-hidden"
      style={{
        // 16px (MOBILE_GUTTER) on mobile, 24px (SIDE_PADDING) on desktop —
        // matches the spec that all mobile padding should be 16. Affects
        // the desktop column inner padding and any descendant relying on
        // the section's content box.
        paddingLeft: isMobile ? MOBILE_GUTTER : SIDE_PADDING,
        paddingRight: isMobile ? MOBILE_GUTTER : SIDE_PADDING,
        // 100dvh adjusts when the mobile browser's collapsing toolbar (and
        // bottom nav on iOS Safari) shows/hides during scroll, so the layout
        // never gets clipped or has dead space. min-h-screen (100vh) was
        // measured against the LARGEST possible viewport, so when the bar
        // came in the bottom chrome got cut off.
        minHeight: "100dvh",
      }}
    >
      {/* Cold-cache image preloader — renders all 7 project covers as
          hidden `<Image priority>` elements on mount. Next.js Image with
          `priority` injects `<link rel="preload" as="image">` into the
          document head for each, so the browser starts fetching all
          covers in parallel as soon as the page parses. Without this,
          the intro flipping sequence runs the FLIP_INTERVAL_MS timer
          (250ms per swap) faster than first-visit /_next/image cold
          processing (~200ms per request), and visually the flip skips
          to mini-expand without showing the intermediate covers.
          With the preloader, by the time the EZRA VALE headline reveal
          finishes (IMAGE_DELAY_MS = 900ms) all 7 covers are already in
          browser + Vercel cache, so each flip is instant. */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: -9999,
          top: 0,
          width: 1,
          height: 1,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        {PROJECTS.map(
          (p) =>
            p.cover && (
              <Image
                key={`preload-${p.label}`}
                src={p.cover}
                alt=""
                width={IMAGE_WIDTH}
                height={INTRO_CARD_HEIGHT}
                priority
              />
            ),
        )}
      </div>

      <h1
        // Remounting via key forces the letters' rise animation to replay
        // when we re-enter the "scrolling" phase on mobile — the headline
        // appears at the corner with the same letter-by-letter reveal it
        // had on first load. Key is only bumped on mobile (logoRevealKey
        // useEffect above), so desktop renders are unaffected.
        key={logoRevealKey}
        ref={headingRef}
        aria-label={NAME}
        onClick={
          (isMobile && phase === "scrolling") ||
          isDetailPhase ||
          isAboutPhase ||
          menuOpen
            ? goHome
            : undefined
        }
        className={`font-display select-none whitespace-nowrap font-medium tracking-tight ${
          !isMobile &&
          (phase === "mini-expand" ||
            phase === "spreading" ||
            phase === "scrolling" ||
            isDetailPhase ||
            isAboutPhase)
            ? "h1-at-top"
            : ""
        } ${
          // Mobile during intro: h1 anchored at (top:16, left:16) but
          // transformed to viewport center via .mobile-h1-centered. When
          // phase enters "scrolling" the class drops, transform animates
          // back to translate(0,0), and the h1 settles at its corner
          // anchor — combined with logo-mode shrinking the font-size,
          // gives the smooth "shrink to logo" transition.
          isMobile &&
          phase !== "scrolling" &&
          !isDetailPhase &&
          !isAboutPhase
            ? "mobile-h1-centered"
            : ""
        } ${
          (isMobile && phase === "scrolling") || isDetailPhase || isAboutPhase
            ? "logo-mode"
            : ""
        } ${
          (isMobile && phase === "scrolling") ||
          isDetailPhase ||
          isAboutPhase ||
          menuOpen
            ? "cursor-pointer"
            : ""
        }`}
        style={{
          fontSize: fontSize ?? BASE_FONT_SIZE,
          lineHeight: 0.9,
          visibility: fontSize === null ? "hidden" : "visible",
          // Drives the mobile cross-fade: 1 → 0 during mini-expand's last
          // 350ms (BIG centered headline fades at center), back to 1 the
          // same frame phase flips to "scrolling" + h1 remounts (small
          // corner logo reveals letter-by-letter).
          opacity: logoOpacity,
          // Pull the headline LEFT by the measured sidebearing only at full
          // display size (skipped when in logo-mode where the 22px sidebearing
          // is trivial). Visible "E" stroke lands flush with SIDE_PADDING.
          marginLeft:
            !isMobile && !isDetailPhase && !isAboutPhase && headingShift > 0
              ? -headingShift
              : undefined,
          // Cap-top inset (consumed by .h1-at-top): shifts the headline up
          // when it sits at the top of the viewport so the visible top of "E"
          // lands at SIDE_PADDING, matching the gutter on left and right.
          ["--cap-top-inset" as string]:
            !isMobile && !isDetailPhase && !isAboutPhase
              ? `${(fontSize ?? BASE_FONT_SIZE) * CAP_TOP_RATIO}px`
              : undefined,
          // Sit on top of the detail/about image so the logo is visible once
          // the image has risen up.
          zIndex: isMobile || isDetailPhase || isAboutPhase ? 40 : undefined,
          position:
            isMobile || isDetailPhase || isAboutPhase ? "absolute" : undefined,
          // On mobile, align top + left both at MOBILE_GUTTER (16) so the
          // logo edge sits at the same x AND y as the card-area edges
          // below. SIDE_PADDING (24) is desktop only.
          top: isMobile ? MOBILE_GUTTER : undefined,
          left: isMobile ? MOBILE_GUTTER : undefined,
        }}
      >
        {letters.map((char, i) => (
          <span
            key={i}
            aria-hidden
            className="letter-mask"
            style={{ lineHeight: 0.9 }}
          >
            <span
              ref={i === 0 ? firstLetterRef : undefined}
              className={ready ? "letter-rise" : "inline-block"}
              style={{
                animationDelay: ready ? `${i * LETTER_STAGGER_MS}ms` : undefined,
                transform: ready ? undefined : "translate3d(0, 100%, 0)",
              }}
            >
              {char === " " ? " " : char}
            </span>
          </span>
        ))}
      </h1>

      {/* MENU top-right — appears in detail and about */}
      {(isDetailPhase || isAboutPhase) && (
        <button
          ref={detailMenuMagnetRef}
          onClick={(e) => openMenu(e)}
          className={`${phase === "detail-closing" || phase === "about-closing" ? "fade-out" : "fade-in"} ${isMobile ? "touch-target" : "p-0"} absolute z-30 cursor-pointer border-0 bg-transparent font-display text-[22px] font-medium tracking-tight`}
          style={{
            top: SIDE_PADDING,
            right: SIDE_PADDING,
            color: "var(--body)",
            willChange: "transform",
            // Align baseline/cap with EZRA VALE logo on the same row.
            lineHeight: 0.9,
          }}
          aria-label="Open menu"
        >
          MENU
        </button>
      )}

      {/* MENU on home — bottom-right on desktop, top-right on mobile */}
      {phase === "scrolling" && !isMobile && (
        <button
          ref={homeMenuMagnetRef}
          onClick={(e) => openMenu(e)}
          className="fade-in absolute z-30 cursor-pointer border-0 bg-transparent p-0 font-display text-[22px] font-medium tracking-tight"
          style={{
            bottom: SIDE_PADDING,
            right: SIDE_PADDING,
            color: "var(--body)",
            willChange: "transform",
          }}
          aria-label="Open menu"
        >
          MENU
        </button>
      )}
      {phase === "scrolling" && isMobile && (
        <button
          onClick={(e) => openMenu(e)}
          className="touch-target fade-in absolute z-30 cursor-pointer border-0 bg-transparent font-display text-[22px] font-medium tracking-tight"
          style={{
            top: MOBILE_GUTTER,
            right: MOBILE_GUTTER,
            color: "var(--body)",
            // Match h1 lineHeight so MENU's optical top aligns with EZRA
            // VALE's on the same row.
            lineHeight: 0.9,
          }}
          aria-label="Open menu"
        >
          MENU
        </button>
      )}

      {/* Contact Photographer button on mobile — the About bio panel (which
          contains this button on desktop) is hidden on mobile, so users need
          a dedicated entry point to the About page from home. */}
      {phase === "scrolling" && isMobile && (
        <button
          onClick={openAbout}
          className="group fade-in body-detail absolute z-30 inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0"
          style={{
            // env(safe-area-inset-bottom) lifts the button above the iPhone
            // home indicator and any persistent mobile browser bottom bar.
            // 16 matches MOBILE_GUTTER for consistent mobile padding.
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
            left: MOBILE_GUTTER,
          }}
          aria-label="About the photographer"
        >
          <span className="btn-underline">Contact Photographer</span>
          <span aria-hidden>↗</span>
        </button>
      )}

      {/* Rising / flipping image — scaled by a WRAPPER div on both mobile
          and desktop so the inner .image-rise element's translate-and-fade
          animation still runs. Putting scale() directly on .image-rise
          overrides its CSS transform (translate3d) and the rise becomes
          a pop-in. */}
      {(phase === "image-rising" || phase === "flipping") && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            style={{
              transform: `scale(${
                isMobile ? MOBILE_INTRO_SCALE : DESKTOP_INTRO_SCALE
              })`,
            }}
          >
            <div className="image-rise">
              <div
                className="relative flex items-center justify-center overflow-hidden"
                style={{
                  width: IMAGE_WIDTH,
                  // Fixed 4:5 portrait container (INTRO_CARD_HEIGHT) for
                  // every project shown during rising/flipping. Locks the
                  // silhouette so the container doesn't resize as we flip
                  // through different aspects, AND matches the dominant
                  // portrait aspect of the project covers — so each image
                  // crops close to its natural framing instead of being
                  // forced into Sundial's square (which made Asana etc.
                  // look squashed).
                  height: INTRO_CARD_HEIGHT,
                  backgroundColor: PROJECTS[imageIndex].color,
                }}
              >
                {PROJECTS[imageIndex].cover && (
                  <Image
                    src={PROJECTS[imageIndex].cover}
                    alt={PROJECTS[imageIndex].label}
                    fill
                    sizes={`${IMAGE_WIDTH}px`}
                    // The rising/flipping image IS the above-fold hero
                    // — preload so the intro animation doesn't wait.
                    priority
                    className="object-cover"
                    draggable={false}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mini-expand preview stack — scaled down on both mobile and desktop
          so the full 6-card peek cascade fits comfortably inside the
          viewport. Desktop scale is gentler (0.7) than mobile (0.45)
          because desktops have more room. */}
      {phase === "mini-expand" && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{
            transform: `scale(${
              isMobile ? MOBILE_INTRO_SCALE : DESKTOP_INTRO_SCALE
            })`,
          }}
        >
          <div
            className="relative"
            style={{ width: IMAGE_WIDTH, height: INTRO_CARD_HEIGHT }}
          >
            {Array.from({ length: PEEK_COUNT }).map((_, i) => {
              const projectIdx = (ANCHOR_INDEX + i + 1) % PROJECTS.length;
              const p = PROJECTS[projectIdx];
              const scale = 1;
              // Bidirectional cascade, 3+3 split: i=0,1,2 fan to the
              // LOWER-RIGHT at steps 1, 2, 3; i=3,4,5 fan to the
              // UPPER-LEFT at steps 1, 2, 3. The full 6-card cascade
              // shows every non-anchor project. Half-PEEK_COUNT controls
              // the per-direction count so this stays correct if
              // PEEK_COUNT changes again.
              const halfCount = PEEK_COUNT / 2;
              const direction = i < halfCount ? 1 : -1;
              const step = (i % halfCount) + 1;
              const peekX = step * PEEK_STEP_X * direction;
              const peekY = step * PEEK_STEP_Y * direction;
              return (
                <div
                  key={i}
                  className="mini-peek absolute left-0 top-0 overflow-hidden"
                  style={
                    {
                      "--peek-scale": scale,
                      "--peek-x": `${peekX}px`,
                      "--peek-y": `${peekY}px`,
                      width: IMAGE_WIDTH,
                      height: INTRO_CARD_HEIGHT,
                      backgroundColor: p.color,
                      // Cards closer to the anchor (lower i) sit on top — the
                      // cascade reveals deeper cards beyond the corner of each.
                      zIndex: PEEK_COUNT - i,
                    } as React.CSSProperties
                  }
                >
                  {p.cover && (
                    <Image
                      src={p.cover}
                      alt={p.label}
                      fill
                      sizes={`${IMAGE_WIDTH}px`}
                      className="object-cover"
                      draggable={false}
                    />
                  )}
                </div>
              );
            })}
            <div
              className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: PROJECTS[ANCHOR_INDEX].color }}
            >
              {PROJECTS[ANCHOR_INDEX].cover && (
                <Image
                  src={PROJECTS[ANCHOR_INDEX].cover}
                  alt={PROJECTS[ANCHOR_INDEX].label}
                  fill
                  sizes={`${IMAGE_WIDTH}px`}
                  priority
                  className="object-cover"
                  draggable={false}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop scrolling column — JS-driven infinite scroll. Used on
          DESKTOP during spreading/scrolling/detail (GSAP fly origin), and
          on MOBILE only during the spreading intro animation. Mobile uses
          a separate native-scroll layout for "scrolling", and skips the
          fly entirely when opening detail (so the column would just be
          dead weight flashing on screen during the transition). */}
      {((!isMobile &&
        (phase === "spreading" ||
          phase === "scrolling" ||
          isDetailPhase)) ||
        (isMobile && phase === "spreading")) && (
        <div
          className={`pointer-events-none absolute inset-0 overflow-hidden ${
            !isMobile && phase === "spreading" ? "spread-grow" : ""
          }`}
          style={{
            opacity: hideHomeUi ? 0 : 1,
            transition: "opacity 280ms cubic-bezier(0.4, 0, 0.2, 1)",
            // On mobile during the spreading transition we keep the scaled
            // desktop column visible briefly before swapping to native scroll.
            // Same MOBILE_INTRO_SCALE as mini-expand so the cards don't
            // suddenly jump size between the two phases — they spread out
            // at the SAME size, then the native scroll fade-in does the
            // "expand to full width" reveal. On DESKTOP during spreading
            // the .spread-grow CSS class drives a scale 0.7 → 1.0 animation
            // (in sync with the per-card .image-spread fan-out) — without
            // it the anchor card would visibly JUMP from mini-expand's
            // scaled-down size to the full scrolling size.
            transform: isMobile ? `scale(${MOBILE_INTRO_SCALE})` : undefined,
            transformOrigin: isMobile ? "50% 50vh" : undefined,
          }}
        >
          <div
            ref={columnRef}
            className={
              phase === "scrolling" ? "column-scroll" : "column-static"
            }
            style={{
              top: `calc(50vh - ${COLUMN_OFFSET_PX}px)`,
              pointerEvents: phase === "scrolling" ? "auto" : "none",
              // CRITICAL on mobile: without `touch-action: none`, iOS Safari
              // tries to interpret touchmove as native page scroll, never
              // fires our pointer events, and the column appears frozen.
              touchAction: phase === "scrolling" ? "none" : undefined,
            }}
            onMouseEnter={() => {
              hoverRef.current = true;
            }}
            onMouseLeave={() => {
              hoverRef.current = false;
            }}
          >
            {Array.from({ length: PROJECTS.length * RENDER_COPIES }).map(
              (_, i) => {
                const projectIdx = i % PROJECTS.length;
                const p = PROJECTS[projectIdx];
                const copy = Math.floor(i / PROJECTS.length);
                const naturalCenter =
                  CENTERS[projectIdx] + copy * LOOP_HEIGHT;
                const fromY = ANCHOR_CENTER - naturalCenter;
                // Cards nearest the anchor spread first, further cards delay
                // proportionally so the fan-out reads as a cascade from center.
                const stagger = Math.min(Math.abs(fromY) * 0.18, 260);
                return (
                  <div
                    key={i}
                    className="image-spread"
                    style={
                      {
                        "--from-y": `${fromY}px`,
                        animationDelay: `${stagger}ms`,
                        // At frame 0 of the spread, all cards have collapsed
                        // to the anchor's position (translate(0, fromY) where
                        // fromY = ANCHOR_CENTER - naturalCenter). In DOM
                        // order, the LAST card renders on top — so the user
                        // sees a different image than the anchor card they
                        // just saw in mini-expand. Setting the anchor's copy-0
                        // card to a high z-index keeps the visible image
                        // continuous between mini-expand and spread.
                        zIndex:
                          projectIdx === ANCHOR_INDEX && copy === 0
                            ? PROJECTS.length * RENDER_COPIES + 1
                            : PROJECTS.length * RENDER_COPIES - i,
                      } as React.CSSProperties
                    }
                  >
                    <div
                      data-project-idx={projectIdx}
                      role="button"
                      tabIndex={phase === "scrolling" ? 0 : -1}
                      aria-label={`Open project ${p.label}`}
                      onKeyDown={(e) => {
                        if (phase !== "scrolling") return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          const rect =
                            e.currentTarget.getBoundingClientRect();
                          openDetail(projectIdx, rect);
                        }
                      }}
                      className="relative flex items-center justify-center overflow-hidden focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
                      style={{
                        width: IMAGE_WIDTH,
                        height: HEIGHTS[projectIdx],
                        backgroundColor: p.color,
                        cursor: phase === "scrolling" ? "pointer" : "default",
                      }}
                    >
                      {p.cover && (
                        <Image
                          src={p.cover}
                          alt={p.label}
                          fill
                          sizes={`${IMAGE_WIDTH}px`}
                          priority={projectIdx === ANCHOR_INDEX}
                          className="object-cover"
                          draggable={false}
                        />
                      )}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}

      {/* Mobile native-scroll card list — replaces the JS-driven column on
          phones. Uses overflow-y:auto for native iOS momentum, scroll-snap
          for clean card-to-card stops, full-width cards with 16px gutters,
          and respects the dynamic viewport (browser chrome) + iPhone home
          indicator via dvh + env(safe-area-inset-*). */}
      {phase === "scrolling" && isMobile && (
        <div
          ref={mobileScrollRef}
          className="no-scrollbar mobile-scroll-expand absolute z-10 overflow-y-auto overflow-x-hidden"
          style={{
            opacity: hideHomeUi ? 0 : 1,
            transition: "opacity 280ms cubic-bezier(0.4, 0, 0.2, 1)",
            // PHYSICAL inset (not padding!) so cards literally cannot scroll
            // over the top EZRA VALE/MENU row or the bottom Contact
            // Photographer button. Padding-top would let scrolled content
            // pass behind the chrome; setting top/bottom on the absolutely-
            // positioned scroll container makes the chrome areas a clean
            // "no-image" zone matching the user's reference screenshots.
            // Top: 16 (MOBILE_GUTTER) + 22 (logo text) + 16 (breathing) = 54
            // Bottom: env(safe-area) + 16 (bottom inset) + 20 (CTA text) + 16
            top: 54,
            bottom:
              "calc(env(safe-area-inset-bottom, 0px) + 52px)",
            left: 0,
            right: 0,
            paddingLeft: MOBILE_GUTTER,
            paddingRight: MOBILE_GUTTER,
            scrollSnapType: "y mandatory",
            // iOS momentum scroll. `auto` is deprecated; `touch` enables the
            // smooth rubber-band physics we want.
            WebkitOverflowScrolling: "touch",
            // --expand-start is the scale at which the mobile-scroll-expand
            // keyframe BEGINS. We compute it so card visual width at the
            // start of the expand exactly equals the card visual width at
            // the END of the spread (IMAGE_WIDTH * MOBILE_INTRO_SCALE).
            // Without this, on a 390px viewport cards start at 161px (358 *
            // 0.45) instead of 253px (562 * 0.45) — they'd visibly shrink
            // first, which is the "jump to a smaller container" glitch.
            ["--expand-start" as string]:
              typeof window !== "undefined"
                ? `${(IMAGE_WIDTH * MOBILE_INTRO_SCALE) / Math.max(1, window.innerWidth - MOBILE_GUTTER * 2)}`
                : "0.7",
          }}
        >
          {PROJECTS.map((p, i) => (
            <div
              key={i}
              data-mobile-project-idx={i}
              role="button"
              tabIndex={0}
              aria-label={`Open project ${p.label}`}
              onClick={(e) => {
                const rect = (
                  e.currentTarget as HTMLElement
                ).getBoundingClientRect();
                openDetail(i, rect);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  const rect = (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect();
                  openDetail(i, rect);
                }
              }}
              className="relative cursor-pointer overflow-hidden focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
              style={{
                width: "100%",
                // 4:5 portrait, same INTRO_CARD_ASPECT as the rising / flipping
                // / mini-expand cards. Keeps the mask consistent all the way
                // through the expand transition — without this, native-scroll
                // cards used each project's natural aspect, so during the
                // mobile-scroll-expand keyframe the cards visibly morphed
                // from 4:5 → natural shape, breaking the silhouette continuity.
                aspectRatio: `1 / ${INTRO_CARD_ASPECT}`,
                marginBottom: i === PROJECTS.length - 1 ? 0 : 16,
                backgroundColor: p.color,
                scrollSnapAlign: "center",
              }}
            >
              {p.cover && (
                <Image
                  src={p.cover}
                  alt={p.label}
                  fill
                  // Mobile native-scroll card — full viewport width
                  // minus 32px gutter (16 each side).
                  sizes="calc(100vw - 32px)"
                  priority={i === ANCHOR_INDEX || i === 0}
                  className="object-cover"
                  draggable={false}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Right-side indicators — hidden during detail and on mobile */}
      {(phase === "spreading" || phase === "scrolling") && !isMobile && (
        <div
          className="absolute right-6 top-1/2 z-20 flex -translate-y-1/2 flex-col items-end gap-3"
          style={{
            opacity: hideHomeUi ? 0 : 1,
            transition: "opacity 280ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {Array.from({ length: PROJECTS.length }).map((_, i) => {
            const diff = Math.abs(i - activeProject);
            const dist = Math.min(diff, PROJECTS.length - diff);
            const isActive = dist === 0;
            const width = isActive ? 32 : 12;
            const opacity = Math.max(1 - dist * 0.22, 0.2);
            return (
              <button
                key={i}
                type="button"
                onClick={() => navigateToProject(i)}
                aria-label={`Go to ${PROJECTS[i].label}`}
                className="block cursor-pointer border-0 bg-foreground p-0 transition-all duration-300"
                style={{ width, height: 1, opacity }}
              />
            );
          })}
        </div>
      )}

      {/* About panel — fades out during detail. Re-keyed on every home
          return so the mask-reveals replay just like the first load. Hidden
          on mobile (no room next to the centered image column). */}
      {(phase === "spreading" ||
        phase === "scrolling" ||
        isDetailPhase) &&
        !isMobile && (
        <div
          key={`about-${homeRevealKey}`}
          className="pointer-events-none absolute z-20"
          style={{
            // 24 (gutter above headline) + visible cap height + 24 (gap below
            // headline's visible baseline). Uses CAP_HEIGHT_RATIO so the panel
            // sits 24px below the VISIBLE bottom of "EZRA VALE", not the
            // invisible line-box bottom. Contact Photographer keeps its mt-6
            // spacing from the body text below.
            top:
              SIDE_PADDING +
              (fontSize ?? BASE_FONT_SIZE) * CAP_HEIGHT_RATIO +
              24,
            left: textLeft,
            // Cap at 540px and shrink responsively so the text never
            // collides with the centered image column. With paragraphs
            // (not pre-broken lines) the browser wraps cleanly at any
            // width — no more "double-broken" lines at narrow viewports.
            maxWidth: `min(540px, calc(50vw - ${IMAGE_WIDTH / 2 + 40}px - ${textLeft}px))`,
            opacity: hideHomeUi ? 0 : 1,
            transition: "opacity 280ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {ABOUT_PARAGRAPHS.map((para, i) => (
            <div
              key={i}
              className={`overflow-hidden ${i > 0 ? "mt-4" : ""}`}
            >
              <div
                className="line-rise body-home"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                {para}
              </div>
            </div>
          ))}

          {/* Contact Photographer button below the about — opens the
              dedicated About page. Matches the detail page's contact link
              exactly: body-detail typography, split text + arrow masks with
              stagger, hover-drawn underline. */}
          <button
            onClick={openAbout}
            className="group body-detail pointer-events-auto mt-6 inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left"
            aria-label="About the photographer"
          >
            <span className="overflow-hidden">
              <span
                className="line-rise inline-block"
                style={{
                  animationDelay: `${ABOUT_PARAGRAPHS.length * 120 + 60}ms`,
                }}
              >
                <span className="btn-underline">Contact Photographer</span>
              </span>
            </span>
            <span className="overflow-hidden" aria-hidden>
              <span
                className="line-rise inline-block"
                style={{
                  animationDelay: `${ABOUT_PARAGRAPHS.length * 120 + 220}ms`,
                }}
              >
                ↗
              </span>
            </span>
          </button>
        </div>
      )}

      {/* Bottom-left project info — fades out during detail. Each line of the
          brief mask-reveals independently with a stagger so the text appears
          line by line rather than all at once. */}
      {(phase === "spreading" || phase === "scrolling" || isDetailPhase) &&
        !isMobile && (
        <div
          key={`brief-${activeProject}-${homeRevealKey}`}
          className="pointer-events-none absolute bottom-6 z-20"
          style={{
            left: textLeft,
            // Same responsive cap as the About panel — 540px max, shrinks
            // on narrower viewports to clear the image column. With the
            // description now a single paragraph (not pre-broken lines)
            // the browser handles wrapping cleanly at any width.
            maxWidth: `min(540px, calc(50vw - ${IMAGE_WIDTH / 2 + 40}px - ${textLeft}px))`,
            opacity: hideHomeUi ? 0 : 1,
            transition: "opacity 280ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div className="overflow-hidden">
            <h2
              className="line-rise font-display text-2xl font-medium tracking-tight"
              style={{ animationDelay: "0ms", color: "var(--body)" }}
            >
              {PROJECTS[activeProject].label}
            </h2>
          </div>
          <div className="mt-2 overflow-hidden">
            <p
              className="line-rise body-home"
              style={{ animationDelay: "120ms" }}
            >
              {PROJECTS[activeProject].description}
            </p>
          </div>
        </div>
      )}

      {/* Flying clone — only during the open fly (card → detail). Close is
          a straight fade, so no clone is rendered for detail-closing. */}
      {phase === "detail-transitioning" &&
        openedFromCard &&
        detailIdx !== null && (
          <div ref={cloneRef} className="overflow-hidden">
            <img
              src={PROJECTS[detailIdx].cover}
              alt={PROJECTS[detailIdx].label}
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>
        )}

      {/* Detail page content — scrollable left gallery + sticky right column */}
      {(phase === "detail" || phase === "detail-closing") &&
        detailIdx !== null &&
        detailDims && (
          <DetailContent
            project={PROJECTS[detailIdx]}
            detailW={detailDims.w}
            closing={phase === "detail-closing"}
            galleryRef={galleryRef}
            // Route Back through history.back() so the browser back button
            // and our in-page Back follow the SAME code path (the popstate
            // listener actually closes detail). This keeps URL/history in
            // sync no matter which button the user uses.
            onBack={() => window.history.back()}
            onContact={openAbout}
            isMobile={isMobile}
            // When opening from the menu (no card-fly), skip the detail
            // page's own entry animations — the menu's fade-out is the
            // only motion the user should see during that transition.
            instant={!openedFromCard}
          />
        )}

      {/* About page — sticky left image, scrollable right content */}
      {isAboutPhase && (
        <AboutPage
          closing={phase === "about-closing"}
          scrollRef={aboutScrollRef}
          onBack={() => window.history.back()}
          isMobile={isMobile}
        />
      )}

      {/* Menu overlay — opens on top of whatever's underneath */}
      {menuOpen && (
        <MenuOverlay
          listRef={menuListRef}
          closing={menuClosing}
          onClose={() => window.history.back()}
          onClosed={handleMenuClosed}
          onSelect={openDetailFromMenu}
          onHome={goHome}
          origin={menuOrigin}
        />
      )}
    </section>
  );
}

function MenuOverlay({
  listRef,
  closing,
  onClose,
  onClosed,
  onSelect,
  onHome,
  origin,
}: {
  listRef: React.RefObject<HTMLDivElement | null>;
  closing: boolean;
  onClose: () => void;
  onClosed: () => void;
  onSelect: (idx: number) => void;
  onHome: () => void;
  origin: { x: number; y: number };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeMagnetRef = useMagnetic<HTMLButtonElement>();
  const [vp, setVp] = useState(() =>
    typeof window !== "undefined"
      ? { h: window.innerHeight, w: window.innerWidth }
      : { h: 900, w: 1440 },
  );

  useEffect(() => {
    const update = () =>
      setVp({ h: window.innerHeight, w: window.innerWidth });
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const isMobile = vp.w < MOBILE_BREAKPOINT;
  // Mobile responsive sizing: cap font by BOTH width and height so the
  // longest project name ("1) Botanica" — 11 chars + space) fits without
  // overflowing the viewport horizontally, while keeping enough items
  // visible vertically between the header and the About Me section.
  let itemHeight: number;
  let fontSize: number;
  if (isMobile) {
    // ~6.2 char-widths gives breathing room for "1) Botanica" at 0.55em.
    const widthCap = (vp.w - SIDE_PADDING * 2) / 6.2;
    const heightCap = vp.h / 10;
    fontSize = Math.max(28, Math.floor(Math.min(widthCap, heightCap)));
    itemHeight = Math.ceil(fontSize * 1.15);
  } else {
    itemHeight = Math.max(140, Math.round(vp.h / 4.2));
    fontSize = Math.round(itemHeight * 0.88);
  }
  // No more bottom reservation — the About Me block was removed from
  // the menu, so the project list can fill the full height.
  const aboutReserve = 0;
  const totalRendered = PROJECTS.length * MENU_RENDER_COPIES;

  // GSAP reveal — clip-path circle expands from the MENU button position
  // (origin prop) outward to cover the viewport, with the inner row
  // reveals (mask-clipped translateY) playing concurrently on top.
  useIsoLayoutEffect(() => {
    // Diagonal distance from origin to the FARTHEST viewport corner —
    // ensures the circle covers the whole screen no matter where the
    // origin is. +20 fudge so the edge of the circle isn't visible at
    // the end of the animation.
    const maxR =
      Math.hypot(
        Math.max(origin.x, vp.w - origin.x),
        Math.max(origin.y, vp.h - origin.y),
      ) + 20;
    const ctx = gsap.context(() => {
      gsap.set(containerRef.current, {
        clipPath: `circle(0px at ${origin.x}px ${origin.y}px)`,
      });
      gsap.set(".menu-top-item", { yPercent: -110 });
      gsap.set(".menu-item-inner", { yPercent: 110 });

      const tl = gsap.timeline({
        defaults: { ease: "expo.out" },
        delay: 0.02,
      });
      // Iris OUT from the click position. ease "power3.out" lands soft
      // at the edges; duration tuned so most of the panel is visible by
      // the time the first row of content reveals.
      tl.to(
        containerRef.current,
        {
          clipPath: `circle(${maxR}px at ${origin.x}px ${origin.y}px)`,
          duration: 0.7,
          ease: "power3.out",
        },
        0,
      );
      tl.to(
        ".menu-top-item",
        {
          yPercent: 0,
          duration: 0.55,
          stagger: 0.04,
          // Once the reveal lands, drop the mask so the magnetic CLOSE
          // button can overshoot its container without being clipped.
          onComplete: () => {
            const masks =
              containerRef.current?.querySelectorAll(".menu-top-mask");
            masks?.forEach((m) => {
              (m as HTMLElement).style.overflow = "visible";
            });
          },
        },
        0.1,
      );
      tl.to(
        ".menu-item-inner",
        { yPercent: 0, duration: 0.85, stagger: 0.045 },
        0.08,
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  // Exit — clip-path circle collapses TO the close click position
  // (or, if onClose was fired programmatically by a browser-back gesture,
  // falls back to the open origin so the menu still implodes cleanly).
  // closeOriginRef is populated by the CLOSE button's onClick handler
  // below, just before it calls onClose().
  const closeOriginRef = useRef<{ x: number; y: number } | null>(null);
  useIsoLayoutEffect(() => {
    if (!closing) return;
    const closeTo = closeOriginRef.current ?? origin;
    const ctx = gsap.context(() => {
      gsap.killTweensOf([
        ".menu-top-item",
        ".menu-item-inner",
        containerRef.current,
      ]);

      gsap.to(containerRef.current, {
        clipPath: `circle(0px at ${closeTo.x}px ${closeTo.y}px)`,
        duration: 0.5,
        ease: "power3.in",
        onComplete: onClosed,
      });
    }, containerRef);
    return () => ctx.revert();
  }, [closing, onClosed, origin]);

  return (
    <div
      ref={containerRef}
      // No more .fade-in class — clip-path circle reveal in the GSAP
      // timeline above drives the visible entrance now. The .fade-in
      // class would race the clip-path opacity and produce a flash.
      className="fixed inset-0 z-50"
      style={{ backgroundColor: MENU_BG, color: "#fff" }}
    >
      {/* EZRA VALE top-left (mask + reveal + click → home) */}
      <div
        className="menu-top-mask absolute z-10 overflow-hidden"
        style={{
          top: isMobile ? MOBILE_GUTTER : SIDE_PADDING,
          left: isMobile ? MOBILE_GUTTER : SIDE_PADDING,
        }}
      >
        <button
          onClick={onHome}
          className="menu-top-item cursor-pointer border-0 bg-transparent p-0 font-display text-[22px] font-medium tracking-tight"
          style={{ color: "#fff", lineHeight: 0.9 }}
          aria-label="Back to home"
        >
          EZRA VALE
        </button>
      </div>

      {/* CLOSE top-right (mask + reveal + magnetic) */}
      <div
        className="menu-top-mask absolute z-10 overflow-hidden"
        style={{
          top: isMobile ? MOBILE_GUTTER : SIDE_PADDING,
          right: isMobile ? MOBILE_GUTTER : SIDE_PADDING,
        }}
      >
        <button
          ref={closeMagnetRef}
          onClick={(e) => {
            // Capture the click position so the close clip-path circle
            // collapses TO this point (not back to the open origin),
            // matching the user's "click on close → collapse there" ask.
            closeOriginRef.current = { x: e.clientX, y: e.clientY };
            onClose();
          }}
          className="menu-top-item cursor-pointer border-0 bg-transparent p-0 font-display text-[22px] font-medium tracking-tight"
          style={{ color: "#fff", willChange: "transform", lineHeight: 0.9 }}
          aria-label="Close menu"
        >
          CLOSE
        </button>
      </div>

      {/* Infinite-scroll project list — sentence case, clickable, mask-revealed.
          On mobile the bottom is bounded so items can't bleed behind the
          About Me section. */}
      <div
        className="absolute overflow-hidden"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: aboutReserve,
          paddingTop: (isMobile ? MOBILE_GUTTER : SIDE_PADDING) + 60,
          paddingLeft: isMobile ? MOBILE_GUTTER : SIDE_PADDING,
          // Capture touch gestures for the custom infinite scroll. Without
          // this, mobile browsers route touchmove to native page-scroll
          // (which goes nowhere because the menu is position:fixed),
          // making the list feel frozen and laggy.
          touchAction: "none",
        }}
      >
        <div
          ref={listRef}
          style={{
            willChange: "transform",
            transform: "translate3d(0, 0, 0)",
          }}
        >
          {Array.from({ length: totalRendered }).map((_, i) => {
            const idx = i % PROJECTS.length;
            const p = PROJECTS[idx];
            return (
              <div
                key={i}
                style={{ height: itemHeight, overflow: "hidden" }}
              >
                <button
                  onClick={() => onSelect(idx)}
                  className="menu-item-inner font-display font-medium tracking-tight select-none cursor-pointer border-0 bg-transparent p-0 text-left"
                  style={{
                    fontSize,
                    lineHeight: 1,
                    height: itemHeight,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    whiteSpace: "nowrap",
                  }}
                  aria-label={`Open ${p.label}`}
                >
                  {idx + 1}) {p.label}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ABOUT ME block removed per user request — the menu now shows
          only the EZRA VALE logo, CLOSE button, and the infinite-scroll
          project list. About info is available via the Contact
          Photographer link on the home page and the dedicated About
          page. */}
    </div>
  );
}

// GalleryImageView — a single image in the detail page gallery, with a
// scroll-triggered fade-rise as it enters the viewport. The cover (index 0)
// skips the trigger and appears immediately since it's already in view
// when the page opens. `variant` switches between mobile and desktop
// sizing — mobile uses aspect-ratio via padding-bottom, desktop uses
// explicit width/height in pixels driven by `detailW`.
function GalleryImageView({
  item,
  index,
  isCover,
  label,
  variant,
  detailW,
}: {
  item: GalleryItem;
  index: number;
  isCover: boolean;
  label: string;
  variant: "mobile" | "desktop";
  detailW: number;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const visible = isCover || inView;
  const aspect = item.natH / item.natW;

  // Fade + 16px rise. The cover skips the transform entirely so it's
  // not pinned at translateY(0) the first frame (no perceptible motion).
  const fadeStyle: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(16px)",
    transition:
      "opacity 700ms cubic-bezier(0.22, 1, 0.36, 1), transform 700ms cubic-bezier(0.22, 1, 0.36, 1)",
    willChange: visible ? "auto" : "opacity, transform",
  };

  if (variant === "mobile") {
    return (
      <div
        ref={ref}
        style={{
          ...fadeStyle,
          width: "100%",
          paddingBottom: `${aspect * 100}%`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Image
          src={item.src}
          alt={`${label} ${index + 1}`}
          fill
          sizes="calc(100vw - 32px)"
          priority={isCover}
          className="object-cover"
          draggable={false}
        />
      </div>
    );
  }

  const h = (detailW * item.natH) / item.natW;
  return (
    <div
      ref={ref}
      className="relative"
      style={{
        ...fadeStyle,
        width: detailW,
        height: h,
        marginTop: isCover ? 0 : DETAIL_IMG_GAP,
        overflow: "hidden",
      }}
    >
      <Image
        src={item.src}
        alt={`${label} ${index + 1}`}
        fill
        sizes={`${detailW}px`}
        priority={isCover}
        className="object-cover"
        draggable={false}
      />
    </div>
  );
}

function DetailContent({
  project,
  detailW,
  closing,
  galleryRef,
  onBack,
  onContact,
  isMobile,
  instant,
}: {
  project: Project;
  detailW: number;
  closing: boolean;
  galleryRef: React.RefObject<HTMLDivElement | null>;
  onBack: () => void;
  onContact: () => void;
  isMobile: boolean;
  instant: boolean;
}) {
  // Hooks must be called unconditionally at the top — React tracks hook
  // order per render and conditional returns before hooks break the fiber
  // tracking. The desktop branch consumes these; the mobile branch ignores
  // them but they still need to be called.
  const [imageAtTop, setImageAtTop] = useState(instant);
  useLayoutEffect(() => {
    if (closing || instant) return;
    const id = requestAnimationFrame(() => setImageAtTop(true));
    return () => cancelAnimationFrame(id);
  }, [closing, instant]);

  // ── Mobile branch — stacked, native page scroll. Back stays pinned to
  // the top so the user can leave at any scroll depth. The `fade-in` class
  // gives it a clean 600ms opacity 0 → 1 entrance over the page background
  // when a card is tapped, instead of a hard-cut. The inline opacity rule
  // takes over when `closing` flips true and runs the 280ms fade-out.
  if (isMobile) {
    return (
      <div
        className="fade-in absolute inset-0 z-20"
        style={{
          opacity: closing ? 0 : 1,
          transition: "opacity 280ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Back button removed on mobile per latest spec — browser back +
            swipe-back gesture handles return. The EZRA VALE logo at top-
            left still acts as a tap target to home. */}

        <div
          className="no-scrollbar absolute inset-0 overflow-y-auto"
          style={{
            background: "var(--background)",
            paddingLeft: MOBILE_GUTTER,
            paddingRight: MOBILE_GUTTER,
            // Reduced from MOBILE_GUTTER + 90 (cleared the Back button at
            // top: 48) to MOBILE_GUTTER + 32 — gives breathing room below
            // the EZRA VALE logo (~38px tall from top) without leaving
            // unused space.
            paddingTop: MOBILE_GUTTER + 32,
            paddingBottom: MOBILE_GUTTER,
          }}
        >
          <h2
          className="fade-in font-display mt-6 font-medium tracking-tight"
          style={{
            fontSize: 44,
            lineHeight: 1.0,
            animationDelay: "120ms",
            color: "var(--body)",
          }}
        >
          {project.label}
        </h2>

        <div className="mt-5 space-y-4">
          {project.paragraphs.map((para, i) => (
            <div key={i} className="overflow-hidden">
              <p
                className="line-rise body-detail"
                style={{ animationDelay: `${260 + i * 110}ms` }}
              >
                {para}
              </p>
            </div>
          ))}
        </div>

        {/* Contact Photographer + divider sit BETWEEN the description and
            the gallery per the latest spec — the CTA is the next thing the
            reader sees after the project blurb, before scrolling through
            the images. Was previously parked at the very bottom of the
            scroll where most readers never got to. */}
        <div className="mt-8">
          <div
            className="mb-4 w-full"
            style={{
              backgroundColor: "#131313",
              opacity: 0.2,
              height: 2,
            }}
          />
          <button
            onClick={onContact}
            className="body-detail flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0"
            aria-label="About the photographer"
          >
            <span>Contact Photographer</span>
            <span aria-hidden>↗</span>
          </button>
        </div>

        {/* Gallery stacked vertically below text. Each image scroll-fades
            in via GalleryImageView's IntersectionObserver — cover appears
            immediately, the rest rise + fade as you scroll past them. */}
        <div className="mt-8 space-y-6">
          {project.gallery.map((item, i) => (
            <GalleryImageView
              key={item.src}
              item={item}
              index={i}
              isCover={i === 0}
              label={project.label}
              variant="mobile"
              detailW={0}
            />
          ))}
        </div>
        </div>
      </div>
    );
  }

  // ── Desktop branch (unchanged) ─────────────────────────────────────────
  // rightLeft accounts for the image's left padding too — without it the
  // text panel butts directly up against the image with no visible gap.
  const rightLeft = SIDE_PADDING + detailW + DETAIL_COLUMN_GAP;
  const rightWidth = `calc(100vw - ${rightLeft + SIDE_PADDING}px)`;
  const wrapperStyle: React.CSSProperties = {
    opacity: closing ? 0 : 1,
    transition: "opacity 280ms cubic-bezier(0.4, 0, 0.2, 1)",
  };

  return (
    <div style={wrapperStyle}>
      {/* Scrollable left gallery — rises from the open-fly landing (top:80)
          to the resting position (top: SIDE_PADDING) so the EZRA VALE logo
          sits on top of it. Left padding stays at SIDE_PADDING throughout. */}
      <div
        className="pointer-events-none absolute z-20"
        style={{
          left: SIDE_PADDING,
          top: imageAtTop ? SIDE_PADDING : DETAIL_TOP_BAR,
          width: detailW,
          transition: "top 600ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div
          ref={galleryRef}
          style={{
            transform: "translate3d(0, 0, 0)",
            willChange: "transform",
          }}
        >
          {/* Desktop gallery — same scroll-fade as mobile, just sized by
              explicit detailW + natural aspect rather than CSS aspect-ratio. */}
          {project.gallery.map((item, i) => (
            <GalleryImageView
              key={item.src}
              item={item}
              index={i}
              isCover={i === 0}
              label={project.label}
              variant="desktop"
              detailW={detailW}
            />
          ))}
        </div>
      </div>

      {/* Right-side text column (sticky — never moves while gallery scrolls).
          16px bottom inset matches the project mobile spec. Back button
          removed on desktop — browser back / swipe-back handles return, so
          a duplicate in-page chrome adds visual noise. (Mobile keeps its
          Back button because the iOS home-indicator swipe is less obvious.) */}
      <div
        className="fixed z-20"
        style={{
          left: rightLeft,
          top: DETAIL_TOP_BAR,
          width: rightWidth,
          bottom: 16,
        }}
      >
        <h2
          className="fade-in font-display font-medium tracking-tight"
          style={{
            fontSize: 80,
            lineHeight: 1.0,
            animationDelay: "0ms",
            color: "var(--body)",
          }}
        >
          {project.label}
        </h2>

        <div className="mt-6 max-w-xl space-y-4">
          {project.paragraphs.map((para, i) => (
            <div key={i} className="overflow-hidden">
              <p
                className="line-rise body-detail"
                style={{ animationDelay: `${260 + i * 110}ms` }}
              >
                {para}
              </p>
            </div>
          ))}
        </div>

        {/* Contact at bottom of right column — text + arrow each mask-revealed
            with a stagger, divider is 2px, hover paints an underline. */}
        <div className="absolute bottom-0 left-0 right-0">
          <div
            className="fade-in mb-4 w-full"
            style={{
              backgroundColor: "#131313",
              opacity: 0.2,
              height: 2,
              animationDelay: "640ms",
            }}
          />
          <button
            onClick={onContact}
            className="group body-detail inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left"
            aria-label="About the photographer"
          >
            <span className="overflow-hidden">
              <span
                className="line-rise inline-block"
                style={{ animationDelay: "720ms" }}
              >
                <span className="btn-underline">Contact Photographer</span>
              </span>
            </span>
            <span className="overflow-hidden" aria-hidden>
              <span
                className="line-rise inline-block"
                style={{ animationDelay: "880ms" }}
              >
                ↗
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// AboutPage — dedicated page for the photographer. Layout mirrors the detail
// page: image on the left (sticky), text on the right (scrolls via wheel and
// drag, captured globally). The contact email + phone are large and copyable.
// ──────────────────────────────────────────────────────────────────────────
function AboutPage({
  closing,
  scrollRef,
  onBack,
  isMobile,
}: {
  closing: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onBack: () => void;
  isMobile: boolean;
}) {
  const [imageAtTop, setImageAtTop] = useState(false);
  const [copied, setCopied] = useState<"email" | "phone" | null>(null);
  // Track viewport so the photographer image + huge contact text scale
  // responsively with the window.
  const [viewport, setViewport] = useState(() => {
    if (typeof window === "undefined") return { w: 1440, h: 900 };
    return { w: window.innerWidth, h: window.innerHeight };
  });
  useEffect(() => {
    const update = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useLayoutEffect(() => {
    if (closing) return;
    const id = requestAnimationFrame(() => setImageAtTop(true));
    return () => cancelAnimationFrame(id);
  }, [closing]);

  const copy = async (text: string, kind: "email" | "phone") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Fallback: select-and-copy via temporary input
      const input = document.createElement("input");
      input.value = text;
      document.body.appendChild(input);
      input.select();
      try {
        document.execCommand("copy");
        setCopied(kind);
        setTimeout(() => setCopied(null), 1500);
      } catch {}
      document.body.removeChild(input);
    }
  };

  // ── Mobile branch — stacked, native page scroll. Back stays fixed.
  // Padding standardized to MOBILE_GUTTER (16) per project mobile spec.
  if (isMobile) {
    const aspect = PHOTOGRAPHER.imageNatH / PHOTOGRAPHER.imageNatW;
    return (
      <div
        className="fade-in absolute inset-0 z-20"
        style={{
          opacity: closing ? 0 : 1,
          transition: "opacity 280ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Fixed Back — outside the scroll container */}
        <button
          onClick={onBack}
          className="touch-target fade-in body-detail absolute z-30 flex cursor-pointer items-center gap-2 border-0 bg-transparent"
          style={{
            top: MOBILE_GUTTER + 32,
            left: MOBILE_GUTTER,
            animationDelay: "0ms",
          }}
          aria-label="Back"
        >
          <span aria-hidden>←</span>
          <span>Back</span>
        </button>

        <div
          className="no-scrollbar absolute inset-0 overflow-y-auto"
          style={{
            background: "var(--background)",
            paddingLeft: MOBILE_GUTTER,
            paddingRight: MOBILE_GUTTER,
            paddingTop: MOBILE_GUTTER + 90,
            paddingBottom: MOBILE_GUTTER,
          }}
        >
          {/* Smaller image — ~60% of viewport width, fits without scrolling */}
        <div
          // fade-rise: 800ms opacity 0→1 + 20px translateY rise, more
          // pronounced than the bare .fade-in (matches the gallery
          // scroll-fade family on the detail page).
          className="fade-rise mt-6 overflow-hidden"
          style={{
            width: "60%",
            paddingBottom: `${aspect * 60}%`,
            position: "relative",
            animationDelay: "100ms",
          }}
        >
          <Image
            src={PHOTOGRAPHER.image}
            alt={PHOTOGRAPHER.name}
            fill
            sizes="60vw"
            priority
            className="object-cover"
            draggable={false}
          />
        </div>

        {/* Bio at the top, after the image */}
        <div className="mt-6 space-y-4">
          {PHOTOGRAPHER.bio.map((para, i) => (
            <div key={i} className="overflow-hidden">
              <p
                className="line-rise body-detail"
                style={{ animationDelay: `${200 + i * 100}ms` }}
              >
                {para}
              </p>
            </div>
          ))}
        </div>

        {/* Email + phone at the bottom of the scroll */}
        <div className="mt-10 space-y-2">
          <button
            onClick={() => copy(PHOTOGRAPHER.email, "email")}
            className="fade-in font-display block w-full cursor-pointer border-0 bg-transparent p-0 text-left font-medium tracking-tight"
            style={{
              fontSize: 28,
              lineHeight: 1.05,
              color: "var(--body)",
              animationDelay: "620ms",
            }}
            aria-label={`Copy email ${PHOTOGRAPHER.email}`}
          >
            {copied === "email" ? "Copied!" : PHOTOGRAPHER.email}
          </button>
          <button
            onClick={() => copy(PHOTOGRAPHER.phone, "phone")}
            className="fade-in font-display block w-full cursor-pointer border-0 bg-transparent p-0 text-left font-medium tracking-tight"
            style={{
              fontSize: 28,
              lineHeight: 1.05,
              color: "var(--body)",
              animationDelay: "700ms",
            }}
            aria-label={`Copy phone ${PHOTOGRAPHER.phone}`}
          >
            {copied === "phone" ? "Copied!" : PHOTOGRAPHER.phone}
          </button>
        </div>
        </div>
      </div>
    );
  }

  // ── Desktop branch — three-column top row (big image | bio | small image)
  // with huge email + phone spanning the right portion at the bottom.
  const viewportW = viewport.w;
  const viewportH = viewport.h;

  // Big left image — runs from top (DETAIL_TOP_BAR, below logo) to bottom
  // (SIDE_PADDING from edge), full available height. Width derives from the
  // image's native aspect ratio so it stays uncropped.
  const aspect1 = PHOTOGRAPHER.imageNatH / PHOTOGRAPHER.imageNatW;
  const imageH = viewportH - DETAIL_TOP_BAR - SIDE_PADDING;
  let imageW = imageH / aspect1;
  // Safety cap so the image can't eat more than ~48% of viewport width on
  // very tall narrow viewports.
  const maxImageW = viewportW * 0.48 - SIDE_PADDING;
  if (imageW > maxImageW) imageW = maxImageW;

  // Small right image — narrow column, capped at 260px wide and ~55% of
  // viewport height tall so it never crowds the contact area below it.
  const aspect2 = PHOTOGRAPHER.image2NatH / PHOTOGRAPHER.image2NatW;
  const image2W = Math.min(viewportW * 0.18, 260);
  const maxImage2H = viewportH * 0.55;
  const heightFromMaxW2 = image2W * aspect2;
  const image2H = Math.min(heightFromMaxW2, maxImage2H);
  const image2WActual =
    heightFromMaxW2 > maxImage2H ? maxImage2H / aspect2 : image2W;

  // Bio sits between the two images.
  const bioLeft = SIDE_PADDING + imageW + DETAIL_COLUMN_GAP;
  const image2Left = viewportW - SIDE_PADDING - image2WActual;
  const bioWidth = image2Left - bioLeft - DETAIL_COLUMN_GAP;

  // Contact spans from bio's left edge all the way to the right edge.
  const contactWidth = viewportW - bioLeft - SIDE_PADDING;
  const contactFontSize = Math.min(
    Math.max(Math.floor(contactWidth / 11.5), 56),
    120,
  );

  return (
    <div
      style={{
        opacity: closing ? 0 : 1,
        transition: "opacity 280ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Big left photographer image */}
      <div
        className="pointer-events-none absolute z-20"
        style={{ left: SIDE_PADDING, top: DETAIL_TOP_BAR, width: imageW }}
      >
        <div
          className="fade-rise relative"
          style={{
            width: imageW,
            height: imageH,
            overflow: "hidden",
            animationDelay: "100ms",
          }}
        >
          <Image
            src={PHOTOGRAPHER.image}
            alt={PHOTOGRAPHER.name}
            fill
            sizes={`${imageW}px`}
            priority
            className="object-cover"
            draggable={false}
          />
        </div>
      </div>

      {/* Small right photographer image — top-right corner */}
      <div
        className="pointer-events-none absolute z-20"
        style={{
          left: image2Left,
          top: DETAIL_TOP_BAR,
          width: image2WActual,
        }}
      >
        <div
          className="fade-rise relative"
          style={{
            width: image2WActual,
            height: image2H,
            overflow: "hidden",
            animationDelay: "180ms",
          }}
        >
          <Image
            src={PHOTOGRAPHER.image2}
            alt={`${PHOTOGRAPHER.name} — second portrait`}
            fill
            sizes={`${image2WActual}px`}
            className="object-cover"
            draggable={false}
          />
        </div>
      </div>

      {/* Bio column — between the two images */}
      <div
        className="fixed z-20"
        style={{
          left: bioLeft,
          top: DETAIL_TOP_BAR,
          width: bioWidth,
          bottom: SIDE_PADDING,
        }}
      >
        <button
          onClick={onBack}
          className="fade-in body-detail flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0"
          style={{ animationDelay: "0ms" }}
          aria-label="Back"
        >
          <span aria-hidden>←</span>
          <span>Back</span>
        </button>

        <div
          ref={scrollRef}
          className="mt-8 space-y-4"
          style={{ maxWidth: 560 }}
        >
          {PHOTOGRAPHER.bio.map((para, i) => (
            <div key={i} className="overflow-hidden">
              <p
                className="line-rise body-detail"
                style={{ animationDelay: `${120 + i * 100}ms` }}
              >
                {para}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Huge email + phone spanning from bio left edge to right edge of
          viewport, pinned to the bottom. */}
      <div
        className="absolute z-20"
        style={{
          left: bioLeft,
          bottom: SIDE_PADDING,
          width: contactWidth,
        }}
      >
        <div className="overflow-hidden">
          <button
            onClick={() => copy(PHOTOGRAPHER.email, "email")}
            className="line-rise font-display block w-full cursor-pointer border-0 bg-transparent p-0 text-left font-medium tracking-tight"
            style={{
              fontSize: contactFontSize,
              lineHeight: 1.0,
              color: "var(--body)",
              animationDelay: "560ms",
            }}
            aria-label={`Copy email ${PHOTOGRAPHER.email}`}
          >
            {copied === "email" ? "Copied!" : PHOTOGRAPHER.email}
          </button>
        </div>
        <div className="mt-3 overflow-hidden">
          <button
            onClick={() => copy(PHOTOGRAPHER.phone, "phone")}
            className="line-rise font-display block w-full cursor-pointer border-0 bg-transparent p-0 text-left font-medium tracking-tight"
            style={{
              fontSize: contactFontSize,
              lineHeight: 1.0,
              color: "var(--body)",
              animationDelay: "640ms",
            }}
            aria-label={`Copy phone ${PHOTOGRAPHER.phone}`}
          >
            {copied === "phone" ? "Copied!" : PHOTOGRAPHER.phone}
          </button>
        </div>
      </div>
    </div>
  );
}
