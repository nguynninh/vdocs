import { Suspense } from "react";
import LarkCallbackContent, {
  LarkCallbackFallback,
} from "./LarkCallbackContent";
import { getTranslations } from "next-intl/server";

export default async function LarkCallbackPage() {
  const t = await getTranslations("auth");

  return (
    <Suspense
      fallback={
        <LarkCallbackFallback
          title={t("callback_processing_title")}
          message={t("callback_description")}
        />
      }
    >
      <LarkCallbackContent />
    </Suspense>
  );
}
