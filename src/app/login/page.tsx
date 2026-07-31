"use client";

import CardComponent from "@/components/common/CardComponent";
import CheckboxComponent from "@/components/common/CheckboxComponent";
import ImageComponent from "@/components/common/ImageComponent";
import InputComponent from "@/components/common/InputComponent";
import ButtonComponent from "@/components/common/ButtonComponent";
import axiosClient from "@/apis/axiosClient";
import { getDeviceInfo, type DeviceInfo } from "@/lib/device";
import Image from "next/image";
import * as React from "react";

interface LoginResponse {
  code: number;
  message: string;
}

export default function LoginPage() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [messageError, setMessageError] = React.useState("");

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

      const deviceInfo = getDeviceInfo();

      const resLogin = await axiosClient.post<LoginResponse, LoginResponse>("/auth/token", {
        username,
        password,
        deviceId: deviceInfo.deviceId,
      });

      if (resLogin.code === 401) {
        setMessageError(resLogin.message);
        return;
      }

      const resProfile = await axiosClient.get("/users/profile");

      const resUpdateDevice = await axiosClient.post<DeviceInfo, DeviceInfo>("/devices", deviceInfo);

      console.log("Login success", resLogin);
      console.log("Profile", resProfile);
      console.log("Device updated", resUpdateDevice);
    } catch (error) {
      console.error("Login failed", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValidForm = (username: string, password: string) => {
    return username.trim() !== "" && password.trim() !== "";
  }

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
            Một tài khoản, mở khóa mọi trải nghiệm
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
            placeholder="Tên đăng nhập"
            prefix={
              <Image src="/icons/ic_user.svg" alt="Google" width={20} height={20} />
            }
            allowClear />
          <InputComponent
            id="password"
            name="password"
            style={{ marginTop: "16px" }}
            type="password"
            placeholder="Nhập mật khẩu"
            prefix={
              <Image src="/icons/ic_lock.svg" alt="Lock" width={20} height={20} />
            }
            allowClear />

          <div
            className="flex items-center justify-between gap-4"
            style={{ marginTop: "16px" }}>
            <CheckboxComponent
              textSize={14}
              width="auto"
              containerClassName="w-auto flex-none"
              labelClassName="font-normal text-[#232323]"
              label="Ghi nhớ tài khoản"
            />

            <p className="shrink-0 whitespace-nowrap text-sm font-medium text-[#0065FF]">
              Quên mật khẩu
            </p>
          </div>
          <ButtonComponent
            type="primary"
            htmlType="submit"
            block
            loading={isSubmitting}
            className="mt-5"
          >
            Đăng nhập
          </ButtonComponent>
        </form>
      </CardComponent>
    </div>
  );
}
