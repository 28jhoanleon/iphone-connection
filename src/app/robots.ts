import type { MetadataRoute } from "next";

import { SITIO } from "@/lib/seo";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
    sitemap: `${SITIO}/sitemap.xml`,
  };
}
