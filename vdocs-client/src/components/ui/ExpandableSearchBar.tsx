import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export interface ExpandableSearchBar {
    isExpanded?: boolean;
}

const ExpandableSearchBar = (props: ExpandableSearchBar) => {
    const { isExpanded = false } = props
    const t = useTranslations("header");
    const [isExpandedState, setIsExpandedState] = useState(isExpanded);
    const searchRef = useRef<HTMLInputElement>(null);
    const mobileSearchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
          const target = event.target as HTMLElement;
          const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
          if (event.key === "/" && !isTyping) {
            event.preventDefault();
            searchRef.current?.focus();
          }
        }
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
      }, []);

    function toggleMobileSearch() {
        setIsExpandedState((prev) => {
            const next = !prev;
            if (next) {
                requestAnimationFrame(() => mobileSearchRef.current?.focus());
            }
            return next;
        });
    }

    return (
        <>
            {isExpandedState && (
                <label className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-muted px-3 focus-within:border-ring md:hidden">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Input
                        ref={mobileSearchRef}
                        type="text"
                        placeholder={t("search")}
                        onBlur={() => setIsExpandedState(false)}
                        className="h-auto min-w-0 flex-1 rounded-none border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                    />
                </label>
            )}

            <label className="hidden h-8 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-muted px-3 focus-within:border-ring md:flex md:max-w-56">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                    ref={searchRef}
                    type="text"
                    placeholder={t("search")}
                    className="h-auto min-w-0 flex-1 rounded-none border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                />
                <kbd className="rounded border border-border px-1 text-xs text-muted-foreground">/</kbd>
            </label>

            {!isExpandedState && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={toggleMobileSearch}
                    aria-label={t("search")}
                    className="shrink-0 rounded-full text-muted-foreground md:hidden"
                >
                    <Search className="h-4 w-4" />
                </Button>
            )}
        </>
    )
}

export default ExpandableSearchBar;