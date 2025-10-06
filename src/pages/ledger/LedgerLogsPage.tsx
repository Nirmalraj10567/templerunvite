import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language";
import LedgerLogView from "./LedgerLogView";
import { cn, formFieldStyles } from "@/styles/formStyles";

interface LedgerLogsPageProps {}

export default function LedgerLogsPage({}: LedgerLogsPageProps) {
  const { language } = useLanguage();
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader className={cn(formFieldStyles.tableHeader.container, formFieldStyles.card.header)}>
          <CardTitle className="text-lg font-bold">
            {t('Ledger Logs', 'பதிவேடு பதிவுகள்')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <LedgerLogView recentOnly={false} />
        </CardContent>
      </Card>
    </div>
  );
}
