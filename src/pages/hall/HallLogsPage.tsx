import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language";
import HallLogView from "./HallLogView";
import { cn, formFieldStyles } from "@/styles/formStyles";
import { theme } from "@/styles/theme";

interface HallLogsPageProps { }

export default function HallLogsPage({ }: HallLogsPageProps) {
  const { language } = useLanguage();
  const t = (en: string, ta: string) => (language === 'tamil' ? en : ta);

  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader className={theme.card.header}>
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
