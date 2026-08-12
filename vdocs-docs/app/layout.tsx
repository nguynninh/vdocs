import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import { Footer, Layout, Navbar, ThemeSwitch } from "nextra-theme-docs";
import { Banner, Head, Search } from "nextra/components";
import { getPageMap } from "nextra/page-map";

import { LanguageSwitch } from "./language-switch";
import { VersionSwitch } from "./version-switch";

import "nextra-theme-docs/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Giới thiệu - VDocs",
    template: "%s - VDocs",
  },
  description: "Tài liệu VDocs",
  icons: {
    icon: "/images/ic_logo_vlive_simple.png",
  },
};

const banner = (
  <Banner storageKey="vdocs-4-release">
    VDocs 4.0 đã được phát hành.{" "}
    <Link href="/docs">Đọc tài liệu.</Link>
  </Banner>
);

const navbar = (
  <Navbar
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
    <ThemeSwitch lite />
  </Navbar>
);

const footer = (
  <Footer>
    © {new Date().getFullYear()} VDocs.
  </Footer>
);

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pageMap = await getPageMap();

  return (
    <html lang="vi" dir="ltr" suppressHydrationWarning>
      <Head />

      <body>
        <Layout
          banner={banner}
          navbar={navbar}
          pageMap={pageMap}
          darkMode={false}
          docsRepositoryBase="https://github.com/"
          editLink="Chỉnh sửa trang này trên GitHub"
          feedback={{
            content: "Bạn có câu hỏi? Hãy gửi phản hồi cho chúng tôi.",
          }}
          footer={footer}
          search={<Search placeholder="Tìm kiếm tài liệu..." />}
          sidebar={{
            defaultMenuCollapseLevel: 2,
            toggleButton: false,
          }}
          toc={{
            title: "Trên trang này",
          }}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
