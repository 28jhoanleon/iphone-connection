import type { MetadataRoute } from "next";
import { todasLasUnidades, modelos, familiasVisibles } from "@/lib/catalogo";

import { SITIO } from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const fijas = ["", "/nosotros", "/garantia", "/faq", "/contacto", "/privacidad"].map((r) => ({
    url: `${SITIO}${r}`,
    changeFrequency: "weekly" as const,
    priority: r === "" ? 1 : 0.6,
  }));

  return [
    ...fijas,
    ...familiasVisibles().map((f) => ({
      url: `${SITIO}/catalogo/${f.slug}`, changeFrequency: "daily" as const, priority: 0.9,
    })),
    ...modelos().map((m) => ({
      url: `${SITIO}/modelo/${m.slug}`, changeFrequency: "daily" as const, priority: 0.8,
    })),
    ...todasLasUnidades().map((u) => ({
      url: `${SITIO}/unidad/${u.ref}`, changeFrequency: "daily" as const, priority: 0.7,
    })),
  ];
}
