import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

const larkAppId = process.env.NEXT_PUBLIC_LARK_APP_ID;
const larkRedirectUri = process.env.NEXT_PUBLIC_LARK_REDIRECT_URI;
const larkScope = process.env.NEXT_PUBLIC_LARK_SCOPE ?? "contact:user.base:readonly";
const larkState = process.env.NEXT_PUBLIC_LARK_STATE ?? "lark_login";

const getLarkLoginUrl = () => {
  if (!larkAppId || !larkRedirectUri) {
    return null;
  }

  const url = new URL("https://open.larksuite.com/open-apis/authen/v1/authorize");
  url.searchParams.set("app_id", larkAppId);
  url.searchParams.set("redirect_uri", larkRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", larkScope);
  url.searchParams.set("state", larkState);
  return url.toString();
};

const LoginPage = async () => {
  const t = await getTranslations("auth");
  const loginUrl = getLarkLoginUrl();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8faff] px-6 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,102,255,0.14),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(56,102,255,0.12),_transparent_30%)]" />
      <div className="absolute -left-32 bottom-[-10%] h-80 w-80 rounded-full bg-white/65 blur-3xl" />
      <div className="absolute -right-28 top-[-2%] h-72 w-72 rounded-full bg-white/70 blur-3xl" />

      <section className="relative z-10 flex w-full max-w-[1120px] justify-center rounded-[34px] border border-white/80 bg-white/92 px-6 py-16 shadow-[0_30px_80px_rgba(112,136,190,0.22)] backdrop-blur-sm sm:px-10 sm:py-20">
        <div className="flex w-full max-w-[460px] flex-col items-center text-center">
          <div className="mb-10 flex items-center gap-4 sm:gap-5">
            <Image
              src="/icons/ic_lark.png"
              alt="Lark"
              width={84}
              height={64}
              className="h-14 w-auto sm:h-16"
              priority
            />
            <span className="text-[52px] font-semibold leading-none tracking-[-0.05em] text-[#111827] sm:text-[64px]">
              Lark
            </span>
          </div>

          <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[#111827] sm:text-[34px]">
            {t("login_title")}
          </h1>

          <p className="mt-5 max-w-[420px] text-lg leading-8 text-[#7c869d] sm:text-[19px]">
            {t("login_description")}
          </p>

          {loginUrl ? (
            <a
              href={loginUrl}
              className="mt-14 inline-flex min-h-18 w-full items-center justify-center gap-4 rounded-2xl border border-[#d5dcf0] bg-white px-6 py-5 text-[20px] font-semibold tracking-[-0.02em] text-[#111827] shadow-[0_10px_25px_rgba(133,150,191,0.08)] transition hover:border-[#c7d2eb] hover:shadow-[0_14px_30px_rgba(133,150,191,0.12)]"
            >
              <Image
                src="/icons/ic_lark.png"
                alt=""
                width={84}
                height={64}
                className="h-9 w-auto shrink-0"
                aria-hidden="true"
              />
              <span>{t("login_button")}</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="mt-14 inline-flex min-h-18 w-full cursor-not-allowed items-center justify-center gap-4 rounded-2xl border border-[#d5dcf0] bg-[#f6f8fd] px-6 py-5 text-[20px] font-semibold tracking-[-0.02em] text-[#99a2b8]"
            >
              <Image
                src="/icons/ic_lark.png"
                alt=""
                width={84}
                height={64}
                className="h-9 w-auto shrink-0 opacity-60"
                aria-hidden="true"
              />
              <span>{t("lark_missing_app_id")}</span>
            </button>
          )}

          <p className="mt-4 max-w-[420px] text-sm leading-6 text-[#8c95aa]">
            {t("lark_redirect_uri_label", {
              value: larkRedirectUri ?? t("lark_not_configured"),
            })}
          </p>

          {!loginUrl && (
            <p className="mt-2 max-w-[420px] text-sm leading-6 text-[#8c95aa]">
              {t("lark_env_hint")}
            </p>
          )}

          <div className="mt-16 flex items-center justify-center gap-3 text-base text-[#8c95aa] sm:text-lg">
            <ShieldCheck className="h-5 w-5 text-[#8c95aa]" strokeWidth={1.9} />
            <span>{t("security_badge")}</span>
          </div>
        </div>
      </section>
    </main>
  );
};

export default LoginPage;
