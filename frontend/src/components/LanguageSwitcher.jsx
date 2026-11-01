import { useState, useRef, useEffect } from 'react';
import { useLanguage, LANGUAGES } from '../context/LanguageContext';
import { Globe, ChevronDown, Check } from 'lucide-react';

export default function LanguageSwitcher({ align = 'right' }) {
  const { language, setLanguage, currentLangObj, isVietnamese, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 text-[12px] font-medium text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-slate-50 hover:border-slate-300 transition-all select-none cursor-pointer"
        aria-label={t('common.selectLanguage', isVietnamese ? 'Chuyển đổi ngôn ngữ' : 'Switch language')}
        title={t('common.systemLanguage', 'System Language')}
      >
        <Globe className="size-3.5 text-blue-600" />
        <span className="text-[13px]">{currentLangObj.flag}</span>
        <span className="text-[12px] font-bold text-slate-800">{currentLangObj.shortLabel}</span>
        <ChevronDown
          className={`size-3 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute ${
            align === 'left' ? 'left-0' : 'right-0'
          } top-full mt-1.5 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/10 z-50 animate-fade-in`}
        >
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t('common.systemLanguage', isVietnamese ? 'Ngôn ngữ hệ thống' : 'System language')}
          </div>
          <div className="space-y-0.5 mt-0.5">
            {LANGUAGES.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-2.5 py-2 text-left text-xs rounded-lg transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{lang.flag}</span>
                    <span>{lang.label}</span>
                  </div>
                  {isSelected && <Check className="size-3.5 text-blue-600 stroke-[2.5]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
