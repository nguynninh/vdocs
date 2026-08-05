export type PageIcon =
  | { kind: "emoji"; value: string }
  | { kind: "icon"; name: string }
  | { kind: "upload"; src: string };
