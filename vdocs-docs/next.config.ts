import type { NextConfig } from "next";
import nextra from "nextra";
import { remarkMarkmap } from "./lib/remark-markmap.mjs";

const withNextra = nextra({
  unstable_shouldAddLocaleToLinks: true,
  mdxOptions: {
    remarkPlugins: [remarkMarkmap],
  },
});

const nextConfig: NextConfig = {
  i18n: {
    locales: ["vi", "en", "zh"],
    defaultLocale: "vi",
  },
};

export default withNextra(nextConfig);
