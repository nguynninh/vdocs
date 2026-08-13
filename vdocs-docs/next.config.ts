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
  async redirects() {
    return [
      {
        source: "/",
        destination: "/sdkgame/error_code_be",
        permanent: false,
      },
      {
        source: "/:lang(vi|en|zh)",
        destination: "/:lang/sdkgame/error_code_be",
        permanent: false,
      },
      {
        source: "/sdkgame",
        destination: "/sdkgame/error_code_be",
        permanent: false,
      },
      {
        source: "/:lang(vi|en|zh)/sdkgame",
        destination: "/:lang/sdkgame/error_code_be",
        permanent: false,
      },
    ];
  },
};

export default withNextra(nextConfig);
