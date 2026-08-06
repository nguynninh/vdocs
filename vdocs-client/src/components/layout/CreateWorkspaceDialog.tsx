"use client";

import { Briefcase, MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_WORKSPACE_ICON_KEY,
  WORKSPACE_ICON_OPTIONS,
} from "@/src/components/layout/workspace-icons";
import { cn } from "@/lib/utils";

const NAME_MAX_LENGTH = 50;
const DESCRIPTION_MAX_LENGTH = 200;

export interface CreateWorkspaceValues {
  name: string;
  description: string;
  icon: string;
}

export interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate?: (values: CreateWorkspaceValues) => Promise<void> | void;
}

export default function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateWorkspaceDialogProps) {
  const t = useTranslations("sidebar");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<string>(DEFAULT_WORKSPACE_ICON_KEY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setName("");
      setDescription("");
      setIcon(DEFAULT_WORKSPACE_ICON_KEY);
      setError(null);
    }
    onOpenChange(next);
  }

  async function handleCreate() {
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onCreate?.({ name: name.trim(), description: description.trim(), icon });
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("createWorkspaceError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader className="flex-row items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#EEF1FE] text-[#4F6DF5]">
            <Briefcase className="size-4.5" strokeWidth={2.25} />
          </span>
          <div className="flex flex-col gap-0.5 pt-0.5">
            <DialogTitle>{t("createWorkspaceTitle")}</DialogTitle>
            <DialogDescription>{t("createWorkspaceDescription")}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="workspace-name">
              {t("workspaceName")}
            </label>
            <Input
              id="workspace-name"
              value={name}
              maxLength={NAME_MAX_LENGTH}
              placeholder={t("workspaceNamePlaceholder")}
              onChange={(event) => setName(event.target.value)}
            />
            <span className="self-end text-xs text-muted-foreground">
              {name.length}/{NAME_MAX_LENGTH}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="workspace-description">
              {t("workspaceDescription")}
            </label>
            <Textarea
              id="workspace-description"
              value={description}
              maxLength={DESCRIPTION_MAX_LENGTH}
              placeholder={t("workspaceDescriptionPlaceholder")}
              onChange={(event) => setDescription(event.target.value)}
            />
            <span className="self-end text-xs text-muted-foreground">
              {description.length}/{DESCRIPTION_MAX_LENGTH}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">{t("workspaceIcon")}</span>
            <div className="flex flex-wrap gap-2">
              {WORKSPACE_ICON_OPTIONS.map(({ key, icon: Icon, className }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIcon(key)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg outline-none ring-2 ring-transparent ring-offset-0 transition-all focus-visible:ring-[#4F6DF5]",
                    className,
                    icon === key && "ring-[#4F6DF5]"
                  )}
                >
                  <Icon className="size-4.5" strokeWidth={2.25} />
                </button>
              ))}
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-[#4F6DF5]"
              >
                <MoreHorizontal className="size-4.5" strokeWidth={2.25} />
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            {t("cancel")}
          </Button>
          <Button disabled={!name.trim() || isSubmitting} onClick={handleCreate}>
            {isSubmitting ? t("creatingWorkspace") : t("createWorkspace")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
