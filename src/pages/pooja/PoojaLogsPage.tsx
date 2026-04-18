import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language";
import { theme } from "@/styles/theme";
import PoojaLogView from "./PoojaLogView";
import { cn } from "@/lib/utils";
import { formFieldStyles } from "@/styles/formStyles";

interface PoojaLogsPageProps {}

export default function PoojaLogsPage({}: PoojaLogsPageProps) {
  const { language } = useLanguage();
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader className={theme.card.header}>
          <CardTitle className="text-lg font-bold">
            {t('Pooja Logs', 'பூஜை பதிவுகள்')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <PoojaLogView recentOnly={false} />
        </CardContent>
      </Card>
    </div>
  );
}
