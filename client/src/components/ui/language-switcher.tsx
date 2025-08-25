import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { changeLanguage, getAvailableLanguages, getCurrentLanguage } from '../../i18n';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const availableLanguages = getAvailableLanguages();
  
  const handleLanguageChange = async (languageCode: string) => {
    await changeLanguage(languageCode);
    setCurrentLang(languageCode);
  };
  
  const currentLanguage = availableLanguages.find(lang => lang.code === currentLang);
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 gap-1"
          data-testid="button-language-switcher"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline-block">
            {currentLanguage?.flag} {currentLanguage?.name}
          </span>
          <span className="sm:hidden">
            {currentLanguage?.flag}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {availableLanguages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`cursor-pointer ${
              language.code === currentLang 
                ? 'bg-accent text-accent-foreground font-medium' 
                : ''
            }`}
            data-testid={`language-option-${language.code}`}
          >
            <span className="mr-2">{language.flag}</span>
            {language.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LanguageSwitcher;