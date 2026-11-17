import type { MetadataRoute } from "next";
import { BRAND } from "@letsvibe/domain";
import { baseDark } from "@letsvibe/ui-tokens";

/** Installable on phones (Add to Home Screen), which is also what lets iPhones receive call alerts. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.name,
    description: BRAND.description,
    start_url: "/",
    display: "standalone",
    background_color: baseDark.bg,
    theme_color: baseDark.bg,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
