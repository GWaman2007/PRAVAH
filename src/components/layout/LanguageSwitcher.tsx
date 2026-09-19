import React, { useState, useRef, useEffect } from 'react';
import { useTranslation, SITE_LANGUAGES, type LanguageOption } from '../../data/uiTranslations';
import type { LanguageId } from '../../types';
import { Globe, ChevronDown, Check } from 'lucide-react';

interface LanguageSwitcherProps {
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '' }) => {
  const { currentLanguage, setLanguage, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeOption =
    SITE_LANGUAGES.find((lang) => lang.id === currentLanguage) || SITE_LANGUAGES[0];

  // Close popover on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSelectLanguage = (langId: LanguageId) => {
    setLanguage(langId);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button: Touch target >= 44px on mobile, compact on desktop */}
      <button
        id="language-selector-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Current language: ${activeOption.name}. Tap to change regional language.`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-border bg-surface-subtle hover:bg-surface text-text-primary transition-colors btn-press cursor-pointer shrink-0 min-h-[40px] sm:min-h-[32px]"
      >
        <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
        {/* Desktop: Full Native Name */}
        <span className="hidden sm:inline font-semibold text-xs text-text-primary truncate max-w-[90px]">
          {activeOption.nativeName}
        </span>
        {/* Mobile: 2-Letter Code Badge */}
        <span className="sm:hidden font-bold text-[11px] text-text-primary tracking-wider">
          {activeOption.code}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-text-secondary shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label={t('switchLanguageTitle')}
          className="absolute right-0 top-full mt-1.5 w-64 sm:w-72 bg-surface border border-border rounded-lg shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="px-3 py-1.5 border-b border-border/70 flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-primary uppercase tracking-wider">
              {t('switchLanguageTitle')}
            </span>
            <span className="text-[10px] text-text-tertiary">
              NER Multilingual
            </span>
          </div>

          {/* Language Options List */}
          <div className="py-1 max-h-72 overflow-y-auto">
            {SITE_LANGUAGES.map((lang: LanguageOption) => {
              const isSelected = lang.id === currentLanguage;
              return (
                <button
                  key={lang.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectLanguage(lang.id)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-surface-subtle transition-colors cursor-pointer group ${
                    isSelected ? 'bg-primary/10 font-semibold' : ''
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors">
                        {lang.nativeName}
                      </span>
                      <span className="text-[10px] text-text-tertiary">
                        ({lang.name})
                      </span>
                    </div>
                    <span className="text-[10px] text-text-secondary truncate mt-0.5">
                      {lang.region}
                    </span>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-primary shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Note */}
          <div className="px-3 py-1.5 bg-surface-subtle border-t border-border/70 text-[9px] text-text-tertiary leading-tight">
            {t('languageNotice')}
          </div>
        </div>
      )}
    </div>
  );
};
