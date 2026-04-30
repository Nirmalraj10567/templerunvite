import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language";
import { theme } from "@/styles/theme";
import TaxLogView from "./TaxLogView";

interface TaxLogsPageProps { }

export default function TaxLogsPage({ }: TaxLogsPageProps) {
  const { language } = useLanguage();
  const t = (en: string, ta: string) => (language === 'tamil' ? en : ta);

  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader className={theme.card.header}>
          <CardTitle className={theme.header.main}>
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
