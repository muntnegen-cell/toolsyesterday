import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Only public marketing pages; reports and accounts are private and noindex.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/login`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
