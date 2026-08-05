import { ICON_OPTIONS_BY_NAME } from "./icon.data";
import type { PageIcon } from "./PageIcon";

export interface PageIconGlyphProps {
  icon: PageIcon;
  emojiClassName?: string;
  iconClassName?: string;
  imageClassName?: string;
}

export function PageIconGlyph({ icon, emojiClassName, iconClassName, imageClassName }: PageIconGlyphProps) {
  if (icon.kind === "emoji") {
    return <span className={emojiClassName}>{icon.value}</span>;
  }

  if (icon.kind === "icon") {
    const Icon = ICON_OPTIONS_BY_NAME[icon.name];
    if (!Icon) return null;
    return <Icon className={iconClassName} />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={icon.src} alt="" className={imageClassName} />;
}
