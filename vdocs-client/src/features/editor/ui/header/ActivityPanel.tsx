"use client";

import { useTranslations } from "next-intl";

export interface ActivityEntry {
  actorName: string;
  timeLabel: string;
}

export interface ActivityPanelProps {
  editedBy?: ActivityEntry;
  createdBy?: ActivityEntry;
}

export function ActivityPanel(props: ActivityPanelProps) {
  const { editedBy, createdBy } = props;
  const t = useTranslations("editorHeader.activity");

  return (
    <div className="w-64 p-3 text-sm">
      <div className="mb-2 text-xs font-medium text-muted-foreground">{t("title")}</div>

      <ul className="flex flex-col gap-2">
        {editedBy && (
          <ActivityRow label={t("editedBy")} entry={editedBy} />
        )}
        {createdBy && (
          <ActivityRow label={t("createdBy")} entry={createdBy} />
        )}
      </ul>
    </div>
  );
}

function ActivityRow({ label, entry }: { label: string; entry: ActivityEntry }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-foreground">
          {label} <span className="font-medium">{entry.actorName}</span>
        </span>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{entry.timeLabel}</span>
    </li>
  );
}
