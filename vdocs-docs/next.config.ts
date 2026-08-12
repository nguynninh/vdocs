import type { NextConfig } from "next";
import nextra from "nextra";

const withNextra = nextra({
  unstable_shouldAddLocaleToLinks: true,
});

const nextConfig: NextConfig = {
  i18n: {
    locales: ["vi", "en", "zh"],
    defaultLocale: "vi",
  },
};

export default withNextra(nextConfig);
