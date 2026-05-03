import React from 'react';
import { Modal } from '@/components/ui/modal';
import { CheckCircle, Printer } from 'lucide-react';
import { useLanguage } from '@/lib/language';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint?: () => void;
  title?: string;
  message?: string;
}

export function SuccessModal({ isOpen, onClose, onPrint, title, message }: SuccessModalProps) {
  const { language } = useLanguage();
  const t = (ta: string, en: string) => language === 'tamil' ? en : ta;

  if (!isOpen) return null;

  const showPrint = !!onPrint;

  return (
    <Modal
      title={title || ''}
      onClose={onClose}
    >
      <div className="p-6">
        <div className="text-center mb-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
          <p className="text-gray-700 text-lg">
            {message || (showPrint 
              ? t('பதிவு சேமிக்கப்பட்டது! அச்சிடுவதற்கு PDF ரசீதைத் திறக்கவா?', 'Entry saved! Open PDF receipt for printing?')
              : t('பதிவு வெற்றிகரமாக சேமிக்கப்பட்டது!', 'Entry saved successfully!')
            )}
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <button
            className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={onClose}
          >
            {showPrint ? t('இப்போது வேண்டாம்', 'Not Now') : t('சரி', 'OK')}
          </button>
          {showPrint && (
            <button
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-orange-400 to-red-500 text-white hover:from-orange-500 hover:to-red-600 transition-all duration-200 shadow-md flex items-center gap-2"
              onClick={() => {
                onPrint?.();
                onClose();
              }}
            >
              <Printer className="w-4 h-4" />
              {t('ஆம், திற', 'Yes, Open')}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
