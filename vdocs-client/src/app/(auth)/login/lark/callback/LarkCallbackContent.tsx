"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, LoaderCircle, X } from "lucide-react";
import { AxiosError } from "axios";
import { callbackLark } from "@/src/features/auth/api";

type CallbackStatus = "processing" | "success" | "error";

const SUCCESS_REDIRECT_DELAY_SECONDS = 3;
const ERROR_REDIRECT_DELAY_SECONDS = 5;

function LarkCallbackResultView({
  title,
  message,
  tone,
  actionLabel,
  onAction,
  redirectLabel,
}: {
  title: string;
  message: string;
  tone: CallbackStatus;
  actionLabel?: string;
  onAction?: () => void;
  redirectLabel?: string;
}) {
  const isProcessing = tone === "processing";
  const isSuccess = tone === "success";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#171717] px-6 py-10 text-center">
      <section className="w-full max-w-3xl">
        <div
          className={[
            "mx-auto flex h-28 w-28 items-center justify-center rounded-full",
            isProcessing
              ? "bg-[#2b2b2b] text-white"
              : isSuccess
              ? "bg-[#22c55e] text-[#171717]"
              : "bg-[#e84a4a] text-[#171717]",
          ].join(" ")}
        >
          {isProcessing ? (
            <LoaderCircle className="h-14 w-14 animate-spin" strokeWidth={2.5} />
          ) : isSuccess ? (
            <Check className="h-14 w-14" strokeWidth={3} />
          ) : (
            <X className="h-14 w-14" strokeWidth={3} />
          )}
        </div>

        <h1 className="mt-10 text-4xl font-semibold tracking-[-0.03em] text-white sm:text-5xl">
          {title}
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#8f8f8f] sm:text-[22px]">
          {message}
        </p>

        {!isProcessing && redirectLabel && actionLabel && onAction && (
          <>
            <p className="mt-8 text-sm uppercase tracking-[0.24em] text-[#6f6f6f]">
              {redirectLabel}
            </p>

            <button
              type="button"
              onClick={onAction}
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full border border-white/12 px-6 py-3 text-sm font-medium text-white transition hover:border-white/25 hover:bg-white/5"
            >
              {actionLabel}
            </button>
          </>
        )}
      </section>
    </main>
  );
}

export function LarkCallbackFallback({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <LarkCallbackResultView
      title={title}
      message={message}
      tone="processing"
    />
  );
}

export default function LarkCallbackContent() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledCodeRef = useRef<string | null>(null);
  const [status, setStatus] = useState<CallbackStatus>("processing");
  const [message, setMessage] = useState<string>("");
  const [redirectPath, setRedirectPath] = useState("/dashboard");
  const [countdown, setCountdown] = useState<number | null>(null);

  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const redirectDelaySeconds =
    status === "error"
      ? ERROR_REDIRECT_DELAY_SECONDS
      : SUCCESS_REDIRECT_DELAY_SECONDS;

  useEffect(() => {
    async function handleCallback() {
      const applyResult = (
        nextStatus: Exclude<CallbackStatus, "processing">,
        nextMessage: string,
        nextRedirectPath: string,
        nextCountdown: number
      ) => {
        setStatus(nextStatus);
        setMessage(nextMessage);
        setRedirectPath(nextRedirectPath);
        setCountdown(nextCountdown);
      };

      const fail = (errorMessage: string) => {
        applyResult("error", errorMessage, "/login", ERROR_REDIRECT_DELAY_SECONDS);
      };

      if (error) {
        fail(errorDescription ?? error);
        return;
      }

      if (!code) {
        fail(t("callback_missing_code"));
        return;
      }

      if (handledCodeRef.current === code) {
        return;
      }

      handledCodeRef.current = code;

      try {
        const response = await callbackLark({ code });

        if (response.status !== 200) {
          throw new Error(t("callback_api_error"));
        }

        applyResult(
          "success",
          t("callback_success_result"),
          "/dashboard",
          SUCCESS_REDIRECT_DELAY_SECONDS
        );
      } catch (caughtError) {
        if (caughtError instanceof AxiosError) {
          fail(t("callback_failed_result"));
          return;
        }

        if (caughtError instanceof Error) {
          fail(t("callback_failed_result"));
          return;
        }

        fail(t("callback_failed_result"));
      }
    }

    void handleCallback();
  }, [code, error, errorDescription, t]);

  useEffect(() => {
    if (status === "processing" || countdown === null) {
      return;
    }

    const countdownId = window.setInterval(() => {
      setCountdown((current) => {
        if (current === null || current <= 1) {
          window.clearInterval(countdownId);
          return current;
        }

        return current - 1;
      });
    }, 1000);

    const redirectId = window.setTimeout(() => {
      router.replace(redirectPath);
    }, redirectDelaySeconds * 1000);

    return () => {
      window.clearInterval(countdownId);
      window.clearTimeout(redirectId);
    };
  }, [countdown, redirectDelaySeconds, redirectPath, router, status]);

  return (
    <LarkCallbackResultView
      title={
        status === "processing"
          ? t("callback_processing_title")
          : status === "success"
          ? t("callback_success_title")
          : t("callback_failed_title")
      }
      message={status === "processing" ? t("callback_description") : message}
      tone={status}
      redirectLabel={
        status === "processing"
          ? undefined
          : t("callback_redirecting", {
              seconds: countdown ?? redirectDelaySeconds,
              destination: redirectPath,
            })
      }
      actionLabel={
        status === "processing"
          ? undefined
          : status === "success"
          ? t("callback_go_dashboard")
          : t("callback_back_login")
      }
      onAction={
        status === "processing" ? undefined : () => router.replace(redirectPath)
      }
    />
  );
}
