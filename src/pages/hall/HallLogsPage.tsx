import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language";
import HallLogView from "./HallLogView";

interface HallLogsPageProps {}

export default function HallLogsPage({}: HallLogsPageProps) {
  const { language } = useLanguage();
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 px-6">
          <CardTitle className="text-lg font-bold">
            {t('Hall Booking Logs', 'மண்டப பதிவு பதிவுகள்')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <HallLogView recentOnly={false} />
        </CardContent>
      </Card>
    </div>
  );
}
