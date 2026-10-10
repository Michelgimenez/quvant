import type { MetadataRoute } from "next"
import { SITIO } from "@/config/sitio"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/estado"], disallow: ["/app", "/api", "/ingresar", "/inversores", "/demo", "/marca"] }],
    sitemap: `${SITIO.url}/sitemap.xml`,
  }
}
