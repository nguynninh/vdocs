"use client";

import * as React from "react";
import Image from "next/image";

export interface ImageComponentProps
  extends Omit<React.ComponentProps<typeof Image>, "src" | "width" | "height" | "alt"> {
  src?: string;
  link?: string;
  alt?: string;
  width?: number;
  height?: number;
}

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const ImageComponent = ({
  src,
  link,
  alt = "",
  width,
  height,
  style,
  unoptimized,
  ...props
}: ImageComponentProps) => {
  const imageSrc = src ?? link;

  if (!imageSrc) {
    return null;
  }

  const fallbackSize = width ?? height ?? 1;
  const resolvedWidth = width ?? fallbackSize;
  const resolvedHeight = height ?? fallbackSize;

  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={resolvedWidth}
      height={resolvedHeight}
      style={{
        width: width ?? "auto",
        height: height ?? "auto",
        ...style,
      }}
      unoptimized={unoptimized ?? isAbsoluteUrl(imageSrc)}
      {...props}
    />
  );
};

export default ImageComponent;
