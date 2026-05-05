import React from 'react';
import { Modal } from '@/components/ui/modal';
import { CheckCircle, Printer } from 'lucide-react';
import { useLanguage } from '@/lib/language';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint?: () => void;
  onDownload?: () => void;
  title?: string;
  message?: string;
}

export function SuccessModal({ isOpen, onClose, onPrint, onDownload, title, message }: SuccessModalProps) {
  const { language } = useLanguage();
  const t = (ta: string, en: string) => language === 'tamil' ? en : ta;

  if (!isOpen) return null;

  const showPrint = !!onPrint;
  const showDownload = !!onDownload;

  return (
    <Modal
      title={title || ''}
      onClose={onClose}
    >
      <div className="p-6">
        <div className="text-center mb-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
          <p className="text-gray-700 text-lg">
            {message || (showPrint || showDownload
              ? t('பதிவு சேமிக்கப்பட்டது! ரசீதை பதிவிறக்கம் செய்ய வேண்டுமா அல்லது அச்சிட வேண்டுமா?', 'Entry saved! Do you want to download or print the receipt?')
              : t('பதிவு வெற்றிகரமாக சேமிக்கப்பட்டது!', 'Entry saved successfully!')
            )}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors order-last sm:order-first"
            onClick={onClose}
          >
            {t('இப்போது வேண்டாம்', 'Not Now')}
          </button>
          
          {showDownload && (
            <button
              className="px-6 py-2 rounded-lg bg-white border border-orange-300 text-orange-600 hover:bg-orange-50 transition-all duration-200 shadow-sm flex items-center gap-2"
              onClick={() => {
                onDownload?.();
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              {t('பதிவிறக்கம்', 'Download')}
            </button>
          )}

          {showPrint && (
            <button
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-orange-400 to-red-500 text-white hover:from-orange-500 hover:to-red-600 transition-all duration-200 shadow-md flex items-center gap-2"
              onClick={() => {
                onPrint?.();
                onClose();
              }}
            >
              <Printer className="w-4 h-4" />
              {t('அச்சிடு', 'Print')}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
