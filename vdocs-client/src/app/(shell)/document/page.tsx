"use client";

import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";

export default function DocumentIndexPage() {
  const t = useTranslations("sidebar");

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col items-center justify-center gap-3 text-center">
      <FileText strokeWidth={1.5} className="size-12 text-muted-foreground" />
      <div>
        <p className="text-lg font-medium">{t("emptyWelcomeTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("emptyWelcomeDescription")}</p>
      </div>
    </div>
  );
}
