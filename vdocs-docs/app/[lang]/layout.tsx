import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import { Layout, Navbar } from "nextra-theme-docs";
import { Banner, Head, Search } from "nextra/components";
import { getPageMap } from "nextra/page-map";

import { LanguageSwitch } from "./language-switch";
import { ThemeSwitch } from "./theme-switch";
import { VersionSwitch } from "./version-switch";

import "nextra-theme-docs/style.css";
import "../globals.css";

type Lang = "vi" | "en" | "zh";

const i18n = {
  vi: {
    title: "Giới thiệu - VDocs",
    description: "Tài liệu VDocs",
    bannerText: "VDocs 4.0 đã được phát hành.",
    bannerLink: "Đọc tài liệu.",
    editLink: "Chỉnh sửa trang này trên GitHub",
    feedback: "Bạn có câu hỏi? Hãy gửi phản hồi cho chúng tôi.",
    searchPlaceholder: "Tìm kiếm tài liệu...",
    tocTitle: "Trên trang này",
    dir: "ltr" as const,
  },
  en: {
    title: "Introduction - VDocs",
    description: "VDocs documentation",
    bannerText: "VDocs 4.0 has been released.",
    bannerLink: "Read the docs.",
    editLink: "Edit this page on GitHub",
    feedback: "Have a question? Send us feedback.",
    searchPlaceholder: "Search documentation...",
    tocTitle: "On this page",
    dir: "ltr" as const,
  },
  zh: {
    title: "简介 - VDocs",
    description: "VDocs 文档",
    bannerText: "VDocs 4.0 已经发布。",
    bannerLink: "阅读文档。",
    editLink: "在 GitHub 上编辑此页面",
    feedback: "有问题吗？请给我们反馈。",
    searchPlaceholder: "搜索文档...",
    tocTitle: "本页内容",
    dir: "ltr" as const,
  },
} satisfies Record<Lang, Record<string, string>>;

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  const t = i18n[lang as Lang] ?? i18n.vi;
  return {
    title: {
      default: t.title,
      template: "%s - VDocs",
    },
    description: t.description,
    icons: {
      icon: "/images/ic_logo_vlive_simple.png",
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = i18n[lang as Lang] ?? i18n.vi;
  const pageMap = await getPageMap(`/${lang}`);

  const banner = (
    <Banner storageKey="vdocs-4-release">
      {t.bannerText} <Link href={`/${lang}/sdkgame`}>{t.bannerLink}</Link>
    </Banner>
  );

  const navbar = (
    <Navbar
      logoLink={`/${lang}`}
      logo={
        <Image
          src="/images/ic_logo_vlive.png"
          alt="VDocs"
          width={116}
          height={44}
          priority
          style={{ width: 116, height: "auto" }}
        />
      }
    >
      <VersionSwitch />
      <LanguageSwitch />
      <ThemeSwitch />
    </Navbar>
  );

  return (
    <html lang={lang} dir={t.dir} suppressHydrationWarning>
      <Head />

      <body>
        <Layout
          banner={banner}
          navbar={navbar}
          pageMap={pageMap}
          darkMode={false}
          docsRepositoryBase="https://github.com/"
          editLink={t.editLink}
          feedback={{
            content: t.feedback,
          }}
          search={<Search placeholder={t.searchPlaceholder} />}
          sidebar={{
            defaultMenuCollapseLevel: 2,
            toggleButton: false,
          }}
          toc={{
            title: t.tocTitle,
          }}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
