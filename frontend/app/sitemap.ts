import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cmpdi-document-ai.vercel.app";
  const lastModified = new Date();

  const routes = [
    { path: "", priority: 1.0, changeFrequency: "daily" as const },
    { path: "/search", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/assistant", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/documents", priority: 0.8, changeFrequency: "daily" as const },
    { path: "/dashboard", priority: 0.8, changeFrequency: "daily" as const },
    { path: "/reports", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/cross-document", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/government-resources", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/validation", priority: 0.7, changeFrequency: "weekly" as const },
    { path: "/topics", priority: 0.7, changeFrequency: "weekly" as const },
    { path: "/audit", priority: 0.6, changeFrequency: "weekly" as const },
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
