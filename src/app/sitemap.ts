import type { MetadataRoute } from "next"
import { SITIO } from "@/config/sitio"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITIO.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITIO.url}/estado`, changeFrequency: "daily", priority: 0.3 },
  ]
}
