import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language";
import TaxLogView from "./TaxLogView";

interface TaxLogsPageProps {}

export default function TaxLogsPage({}: TaxLogsPageProps) {
  const { language } = useLanguage();
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 px-6">
          <CardTitle className="text-lg font-bold">
            {t('Tax Logs', 'வரி பதிவுகள்')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <TaxLogView recentOnly={false} />
        </CardContent>
      </Card>
    </div>
  );
}
