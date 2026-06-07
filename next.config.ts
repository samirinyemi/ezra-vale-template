import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide Next.js dev-mode overlay entirely (the lightning-bolt "N" badge in
  // the corner during development). In 15.5+ passing `false` is the
  // supported way to disable; the old sub-flags (appIsrStatus, buildActivity)
  // are deprecated and no longer have any effect.
  devIndicators: false,
  images: {
    // Tell Vercel's image optimizer to negotiate AVIF first, then WebP.
    // AVIF is ~20-30% smaller than WebP for typical photos at the same
    // visual quality. Older Safari versions don't support AVIF — they'll
    // automatically get the WebP fallback.
    formats: ["image/avif", "image/webp"],
    // Generated sizes the optimizer should produce — covers small phones
    // through high-DPR laptops. Browsers pick the smallest one matching
    // the rendered display width via the `sizes` attribute on each Image.
    deviceSizes: [360, 414, 640, 750, 828, 1080, 1200, 1440, 1920],
    imageSizes: [16, 32, 64, 96, 128, 256, 384, 562, 720],
  },
};

export default nextConfig;
