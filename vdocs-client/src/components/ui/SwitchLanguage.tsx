import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/src/i18n/hooks/useLocale";
import { ChevronDown, Globe } from "lucide-react";
import { useTranslations } from "next-intl";

const SwitchLanguage = () => {
    const t = useTranslations("header");
    const { locale, locales, setLocale } = useLocale();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="hidden shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-muted-foreground outline-none hover:text-foreground data-popup-open:text-foreground [&[data-popup-open]_svg]:rotate-180 md:flex">
                <Globe className="h-4 w-4" />
                {t(`languageNames.${locale}`)}
                <ChevronDown className="h-4 w-4 transition-transform" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                {locales.map((code) => (
                    <DropdownMenuItem key={code} onClick={() => setLocale(code)}>
                        {t(`languageNames.${code}`)}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default SwitchLanguage;