"use client";

import * as React from "react";
import {
  DesktopIcon,
  DeviceMobileIcon,
  DeviceTabletIcon,
  TelevisionIcon,
  WarningIcon,
  ArrowsClockwiseIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import ButtonComponent from "@/components/common/ButtonComponent";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/time";
import type { DeviceSession, DeviceSessionsData } from "@/types/device";

interface DeviceLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DeviceSessionsData;
  onRefresh: () => void;
  onConfirm: (selectedDeviceIds: string[]) => void;
  refreshing?: boolean;
  submitting?: boolean;
}

function renderDeviceIcon(deviceName: string) {
  const name = deviceName.toLowerCase();

  if (name.includes("tv")) {
    return <TelevisionIcon size={20} />;
  }
  if (name.includes("ipad") || name.includes("tablet")) {
    return <DeviceTabletIcon size={20} />;
  }
  if (name.includes("iphone") || name.includes("android") || name.includes("mobile")) {
    return <DeviceMobileIcon size={20} />;
  }
  return <DesktopIcon size={20} />;
}

export default function DeviceLimitModal({
  open,
  onOpenChange,
  data,
  onRefresh,
  onConfirm,
  refreshing = false,
  submitting = false,
}: DeviceLimitModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DeviceLimitModalBody
        key={data.deviceLimitToken}
        data={data}
        onOpenChange={onOpenChange}
        onRefresh={onRefresh}
        onConfirm={onConfirm}
        refreshing={refreshing}
        submitting={submitting}
      />
    </Dialog>
  );
}

function DeviceLimitModalBody({
  data,
  onOpenChange,
  onRefresh,
  onConfirm,
  refreshing,
  submitting,
}: Omit<DeviceLimitModalProps, "open">) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const minRequired = Math.max(1, data.totalDevices - data.maxActiveDevices + 1);

  const toggleDevice = (deviceId: string) => {
    setSelectedIds((current) =>
      current.includes(deviceId)
        ? current.filter((id) => id !== deviceId)
        : [...current, deviceId]
    );
  };

  const canConfirm = selectedIds.length >= minRequired;

  return (
      <DialogContent className="max-w-md" showClose={false}>
        <DialogHeader>
          <div className="flex size-14 items-center justify-center rounded-full bg-[#FFF1E7]">
            <WarningIcon size={28} weight="fill" className="text-[#FF7A00]" />
          </div>
          <DialogTitle>Bạn đã đăng nhập quá số thiết bị cho phép</DialogTitle>
          <DialogDescription>
            Tài khoản của bạn hiện đang được sử dụng trên quá số thiết bị cho phép.
            Vui lòng đăng xuất khỏi một thiết bị để tiếp tục.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Thiết bị đang đăng nhập ({data.totalDevices}/{data.maxActiveDevices})
              </p>
              <p className="text-xs text-slate-500">
                Bạn cần đăng xuất tối thiểu {minRequired} thiết bị.
              </p>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-1 text-sm font-medium text-[#0065FF] outline-none hover:text-[#0057DB] disabled:opacity-50"
            >
              <ArrowsClockwiseIcon size={16} className={cn(refreshing && "animate-spin")} />
              Làm mới
            </button>
          </div>

          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {data.devices.map((device) => (
              <DeviceRow
                key={device.deviceId}
                device={device}
                checked={selectedIds.includes(device.deviceId)}
                onToggle={() => toggleDevice(device.deviceId)}
              />
            ))}
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3">
            <ShieldCheckIcon size={18} className="mt-0.5 shrink-0 text-[#0065FF]" />
            <p className="text-xs leading-5 text-slate-600">
              Vì lý do bảo mật, chúng tôi khuyến nghị bạn chỉ đăng nhập trên các thiết bị mà bạn tin tưởng.
            </p>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <ButtonComponent type="default" onClick={() => onOpenChange(false)} disabled={submitting}>
            Hủy
          </ButtonComponent>
          <ButtonComponent
            type="primary"
            disabled={!canConfirm}
            loading={submitting}
            onClick={() => onConfirm(selectedIds)}
          >
            Đăng xuất ({selectedIds.length}) thiết bị
          </ButtonComponent>
        </DialogFooter>
      </DialogContent>
  );
}

function DeviceRow({
  device,
  checked,
  onToggle,
}: {
  device: DeviceSession;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
        {renderDeviceIcon(device.deviceName)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{device.deviceName}</p>
        <p className="truncate text-xs text-slate-500">
          {device.currentDevice ? "Đang hoạt động" : formatRelativeTime(device.lastUsedAt)}
        </p>
      </div>

      {device.currentDevice ? (
        <span className="shrink-0 rounded-full bg-[#E7F7EE] px-2.5 py-1 text-xs font-medium text-[#12B76A]">
          Thiết bị hiện tại
        </span>
      ) : (
        <Checkbox checked={checked} onCheckedChange={onToggle} />
      )}
    </div>
  );
}
