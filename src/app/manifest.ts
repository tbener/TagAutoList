import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TagAutoList",
    short_name: "TagAutoList",
    description: "Tasks and lists, powered by tags.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#090a1f",
    theme_color: "#6a5cf5",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
