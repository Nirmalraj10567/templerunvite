import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language";
import ReceiptLogView from "./ReceiptLogView";

interface ReceiptLogsPageProps {}

export default function ReceiptLogsPage({}: ReceiptLogsPageProps) {
  const { language } = useLanguage();
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-6">
          <CardTitle className="text-lg font-bold">
            {t('Receipt Logs', 'பதிவு பதிவுகள்')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ReceiptLogView recentOnly={false} />
        </CardContent>
      </Card>
    </div>
  );
}
