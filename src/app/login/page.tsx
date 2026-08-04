"use client";

import CardComponent from "@/components/common/CardComponent";
import CheckboxComponent from "@/components/common/CheckboxComponent";
import ImageComponent from "@/components/common/ImageComponent";
import InputComponent from "@/components/common/InputComponent";
import ButtonComponent from "@/components/common/ButtonComponent";
import DeviceLimitModal from "@/components/common/DeviceLimitModal";
import axiosClient, { ApiError } from "@/apis/axiosClient";
import type { ApiResponse } from "@/apis/ApiResponse";
import { kickoutDevice } from "@/apis/devices";
import { getDeviceInfo, type DeviceInfo } from "@/lib/device";
import type { DeviceSessionsData } from "@/types/device";
import type { User } from "@/types/user";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useLocale } from "@/components/layout/locale-provider";
import { useAuth } from "@/components/layout/auth-provider";

interface InputError {
  username?: string;
  password?: string;
}

function resolveNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  );
}

function LoginForm() {
  const { t } = useLocale();
  const { setUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = resolveNextPath(searchParams.get("next"));
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [inputError, setInputError] = React.useState<InputError>({});
  const [messageError, setMessageError] = React.useState("");
  const [deviceLimitData, setDeviceLimitData] = React.useState<DeviceSessionsData | null>(null);
  const [refreshingDevices, setRefreshingDevices] = React.useState(false);
  const [kickingOut, setKickingOut] = React.useState(false);
  const pendingCredentials = React.useRef<{ username: string; password: string } | null>(null);

  const login = async (username: string, password: string) => {
    const deviceInfo = getDeviceInfo();

    await axiosClient.post("/auth/token", {
      username,
      password,
      deviceId: deviceInfo.deviceId,
    });
    const profile = await axiosClient.get<User, ApiResponse<User>>("/users/profile");
    await axiosClient.patch<DeviceInfo, DeviceInfo>("/devices", deviceInfo);
    setUser(profile.data);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");

    if (!isValidForm(username, password)) {
      return;
    }

    try {
      setIsSubmitting(true);
      setMessageError("");

      await login(username, password);
      router.push(nextPath);
    } catch (error) {
      if (error instanceof ApiError && error.code === 411) {
        pendingCredentials.current = { username, password };
        setDeviceLimitData(error.data as DeviceSessionsData);
        return;
      }

      setMessageError(error instanceof Error ? error.message : "Đăng nhập thất bại, vui lòng thử lại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefreshDevices = async () => {
    if (!pendingCredentials.current) {
      return;
    }

    try {
      setRefreshingDevices(true);
      const { username, password } = pendingCredentials.current;
      await login(username, password);

      setDeviceLimitData(null);
      pendingCredentials.current = null;
      router.push(nextPath);
    } catch (error) {
      if (error instanceof ApiError && error.code === 411) {
        setDeviceLimitData(error.data as DeviceSessionsData);
      }
    } finally {
      setRefreshingDevices(false);
    }
  };

  const handleConfirmKickout = async (selectedDeviceIds: string[]) => {
    if (!deviceLimitData || !pendingCredentials.current) {
      return;
    }

    try {
      setKickingOut(true);

      await Promise.all(
        selectedDeviceIds.map((deviceId) =>
          kickoutDevice(deviceId, deviceLimitData.deviceLimitToken)
        )
      );

      const { username, password } = pendingCredentials.current;
      await login(username, password);

      setDeviceLimitData(null);
      pendingCredentials.current = null;
      router.push(nextPath);
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : "Đăng xuất thiết bị thất bại, vui lòng thử lại");
    } finally {
      setKickingOut(false);
    }
  };

  const isValidForm = (username: string, password: string) => {
    const errors: InputError = {};

    if (username.trim() === "") {
      errors.username = "Tên đăng nhập không được để trống";
    }

    if (password.trim() === "") {
      errors.password = "Mật khẩu không được để trống";
    }

    setInputError(errors);

    return Object.keys(errors).length === 0;
  };

  const clearInputError = (field: keyof InputError) => {
    setInputError((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
    setMessageError("");
  };

  return (
    <div>
      <CardComponent
        width={440}
        className="mx-auto mt-10 rounded-lg shadow-md"
        style={{
          padding: "0px 24px",
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)"
        }}
      >
        <div className="flex flex-col items-center">
          <ImageComponent
            className="w-auto"
            src="/images/ic_logo_vlive.png"
            alt="Login"
            width={199}
            height={45}
            loading="eager"
          />
          <p className="text-center"
            style={{
              marginTop: "12px",
              fontSize: "12px",
              fontWeight: "700",
              color: "#232323",
            }}>
            {t("auth.txt_subtitle")}
          </p>
        </div>

        {messageError && (
          <div>
            <p className="text-center"
              style={{
                marginTop: "24px",
                fontSize: "12px",
                fontWeight: "400",
                color: "#FF3D00",
              }}>
              {messageError}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: "20px" }}>
          <InputComponent
            id="username"
            name="username"
            type="text"
            placeholder={t("auth.txt_hint_username")}
            prefix={
              <Image src="/icons/ic_user.svg" alt="Google" width={20} height={20} />
            }
            onChange={() => clearInputError("username")}
            messageError={inputError.username}
            allowClear />
          <InputComponent
            id="password"
            name="password"
            style={{ marginTop: "16px" }}
            type="password"
            placeholder={t("auth.txt_hint_password")}
            prefix={
              <Image src="/icons/ic_lock.svg" alt="Lock" width={20} height={20} />
            }
            onChange={() => clearInputError("password")}
            messageError={inputError.password}
            allowClear />

          <div
            className="flex items-center justify-between gap-4"
            style={{ marginTop: "16px" }}>
            <CheckboxComponent
              textSize={14}
              width="auto"
              containerClassName="w-auto flex-none"
              labelClassName="font-normal text-[#232323]"
              label={t("auth.txt_remember_account")}
            />

            <p className="shrink-0 whitespace-nowrap text-sm font-medium text-[#0065FF]">
              {t("auth.txt_forgot_password")}
            </p>
          </div>
          <ButtonComponent
            type="primary"
            htmlType="submit"
            block
            loading={isSubmitting}
            className="mt-5"
          >
            {t("auth.txt_login_button")}
          </ButtonComponent>
        </form>
      </CardComponent>

      {deviceLimitData && (
        <DeviceLimitModal
          open
          onOpenChange={(open) => {
            if (!open) {
              setDeviceLimitData(null);
              pendingCredentials.current = null;
            }
          }}
          data={deviceLimitData}
          onRefresh={handleRefreshDevices}
          onConfirm={handleConfirmKickout}
          refreshing={refreshingDevices}
          submitting={kickingOut}
        />
      )}
    </div>
  );
}
