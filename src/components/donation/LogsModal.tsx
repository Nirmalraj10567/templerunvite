import React from 'react';
import { DonationProductLog } from '@/types/donation';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: DonationProductLog[];
  loading: boolean;
  t: (en: string, ta: string) => string;
}

export const LogsModal: React.FC<LogsModalProps> = ({
  isOpen,
  onClose,
  logs,
  loading,
  t,
}) => {
  if (!isOpen) return null;

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} title={t('Donation Logs', 'நன்கொடை பதிவுகள்')}>
      <div className="max-h-[70vh] overflow-y-auto">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2">{t('Loading logs...', 'பதிவுகள் ஏற்றப்படுகின்றன...')}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            {t('No logs available', 'பதிவுகள் எதுவும் இல்லை')}
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {t('Action', 'நடவடிக்கை')}: {log.action}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                  {log.receipt_number && (
                    <span className="px-2 py-1 bg-gray-100 text-xs rounded">
                      {t('Receipt', 'ரசீது')}: {log.receipt_number}
                    </span>
                  )}
                </div>
                {log.details && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                    <pre className="whitespace-pre-wrap text-xs">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={onClose}>
          {t('Close', 'மூடு')}
        </Button>
      </div>
    </Modal>
  );
};
