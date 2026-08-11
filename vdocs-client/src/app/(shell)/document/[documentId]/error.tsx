"use client";

export default function DocumentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
      <p>Đã xảy ra lỗi khi tải tài liệu.</p>
      <button
        type="button"
        onClick={reset}
        className="text-primary underline-offset-4 hover:underline"
      >
        Thử lại
      </button>
    </div>
  );
}
