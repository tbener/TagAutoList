import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TagAutoList",
    short_name: "TagAutoList",
    description: "Tasks and lists, powered by tags.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf4e8",
    theme_color: "#2b50aa",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
