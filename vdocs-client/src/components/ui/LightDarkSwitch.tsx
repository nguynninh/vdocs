import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

const LightDarkSwitch = () => {
    const t = useTranslations("header");
    const [isDark, setIsDark] = useState(() => {
        if (typeof window === "undefined") return false;

        const stored = localStorage.getItem("theme");
        return stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    });

    useEffect(() => {
        document.documentElement.classList.toggle("dark", isDark);
    }, [isDark]);

    function toggleTheme() {
        setIsDark((prev) => {
            const next = !prev;
            document.documentElement.classList.toggle("dark", next);
            localStorage.setItem("theme", next ? "dark" : "light");
            return next;
        });
    }

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={isDark ? t("themeToLight") : t("themeToDark")}
            className="shrink-0 rounded-full text-muted-foreground"
        >
            {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
    )
}

export default LightDarkSwitch;