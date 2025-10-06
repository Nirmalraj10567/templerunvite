import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language";
import AnnadhanamLogView from "./AnnadhanamLogView";
import MoneyDonationLogView from "@/pages/donations/MoneyDonationLogView";
import DonationProductLogView from "@/pages/product/DonationProductLogView";
import HallLogsPage from "@/pages/hall/HallLogsPage";
import PoojaLogsPage from "@/pages/pooja/PoojaLogsPage";
import ReceiptLogsPage from "@/pages/Receipt/ReceiptLogsPage";
import LedgerLogsPage from "@/pages/ledger/LedgerLogsPage";
import TaxLogsPage from "@/pages/tax/TaxLogsPage";

interface AnnadhanamLogsPageProps {}

export default function AnnadhanamLogsPage({}: AnnadhanamLogsPageProps) {
  const { language } = useLanguage();
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 px-6">
          <CardTitle className="text-lg font-bold">
            {t('Annadhanam Logs', 'அன்னதானம் பதிவுகள்')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
            defaultValue="all"
          >
            {/* Custom Scrollable Tabs */}
            <div className="w-full overflow-x-auto custom-scrollbar mb-6">
              <TabsList className="inline-flex h-auto p-2 bg-muted rounded-md gap-1 min-w-full">
                <TabsTrigger
                  value="all"
                  className="flex-shrink-0 px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap rounded-sm min-h-[3rem] flex items-center justify-center"
                  style={{ 
                    minWidth: language === 'tamil' ? '140px' : '120px'
                  }}
                >
                  <span className="text-center leading-tight">
                    {t('Annadhanam Logs', 'அன்னதானம் பதிவுகள்')}
                  </span>
                </TabsTrigger>
                
                <TabsTrigger
                  value="money-all"
                  className="flex-shrink-0 px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap rounded-sm min-h-[3rem] flex items-center justify-center"
                  style={{ 
                    minWidth: language === 'tamil' ? '140px' : '120px'
                  }}
                >
                  <span className="text-center leading-tight">
                    {t('Money Donations', 'பண நன்கொடைகள்')}
                  </span>
                </TabsTrigger>
                
                <TabsTrigger
                  value="product-all"
                  className="flex-shrink-0 px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap rounded-sm min-h-[3rem] flex items-center justify-center"
                  style={{ 
                    minWidth: language === 'tamil' ? '140px' : '120px'
                  }}
                >
                  <span className="text-center leading-tight">
                    {t('Product Donations', 'பொருள் நன்கொடைகள்')}
                  </span>
                </TabsTrigger>
                
                <TabsTrigger
                  value="hall-all"
                  className="flex-shrink-0 px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap rounded-sm min-h-[3rem] flex items-center justify-center"
                  style={{ 
                    minWidth: language === 'tamil' ? '140px' : '120px'
                  }}
                >
                  <span className="text-center leading-tight">
                    {t('Hall Bookings', 'மண்டப பதிவுகள்')}
                  </span>
                </TabsTrigger>
                
                <TabsTrigger
                  value="pooja-all"
                  className="flex-shrink-0 px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap rounded-sm min-h-[3rem] flex items-center justify-center"
                  style={{ 
                    minWidth: language === 'tamil' ? '140px' : '120px'
                  }}
                >
                  <span className="text-center leading-tight">
                    {t('Pooja Logs', 'பூஜை பதிவுகள்')}
                  </span>
                </TabsTrigger>
                
                <TabsTrigger
                  value="receipt-all"
                  className="flex-shrink-0 px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap rounded-sm min-h-[3rem] flex items-center justify-center"
                  style={{ 
                    minWidth: language === 'tamil' ? '140px' : '120px'
                  }}
                >
                  <span className="text-center leading-tight">
                    {t('Receipt Logs', 'ரசீது பதிவுகள்')}
                  </span>
                </TabsTrigger>
                
                <TabsTrigger
                  value="ledger-all"
                  className="flex-shrink-0 px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap rounded-sm min-h-[3rem] flex items-center justify-center"
                  style={{ 
                    minWidth: language === 'tamil' ? '140px' : '120px'
                  }}
                >
                  <span className="text-center leading-tight">
                    {t('Ledger Logs', 'பதிவேடு பதிவுகள்')}
                  </span>
                </TabsTrigger>
                
                <TabsTrigger
                  value="tax-all"
                  className="flex-shrink-0 px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap rounded-sm min-h-[3rem] flex items-center justify-center"
                  style={{ 
                    minWidth: language === 'tamil' ? '140px' : '120px'
                  }}
                >
                  <span className="text-center leading-tight">
                    {t('Tax Logs', 'வரி பதிவுகள்')}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="all" className="mt-6">
              <AnnadhanamLogView recentOnly={false} />
            </TabsContent>
            
            <TabsContent value="money-all" className="mt-6">
              <MoneyDonationLogView recentOnly={false} />
            </TabsContent>
            
            <TabsContent value="product-all" className="mt-6">
              <DonationProductLogView recentOnly={false} />
            </TabsContent>
            
            <TabsContent value="hall-all" className="mt-6">
              <HallLogsPage />
            </TabsContent>
            
            <TabsContent value="pooja-all" className="mt-6">
              <PoojaLogsPage />
            </TabsContent>
            
            <TabsContent value="receipt-all" className="mt-6">
              <ReceiptLogsPage />
            </TabsContent>
            
            <TabsContent value="ledger-all" className="mt-6">
              <LedgerLogsPage />
            </TabsContent>
            
            <TabsContent value="tax-all" className="mt-6">
              <TaxLogsPage />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #9333ea #f1f5f9;
          scroll-behavior: smooth;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          height: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: linear-gradient(90deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%);
          border-radius: 12px;
          margin: 0 10px;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, #8b5cf6 0%, #9333ea 25%, #a855f7 50%, #c084fc 75%, #ddd6fe 100%);
          border-radius: 12px;
          border: 2px solid transparent;
          background-clip: content-box;
          box-shadow: 
            inset 0 1px 3px rgba(0, 0, 0, 0.1),
            0 2px 6px rgba(139, 92, 246, 0.3);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(45deg, #7c3aed 0%, #8b5cf6 25%, #9333ea 50%, #a855f7 75%, #c084fc 100%);
          transform: scaleY(1.2);
          box-shadow: 
            inset 0 1px 6px rgba(0, 0, 0, 0.15),
            0 4px 12px rgba(124, 58, 237, 0.4),
            0 0 0 2px rgba(139, 92, 246, 0.2);
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:active {
          background: linear-gradient(45deg, #6366f1 0%, #7c3aed 25%, #8b5cf6 50%, #9333ea 75%, #a855f7 100%);
          transform: scaleY(1.1);
          box-shadow: 
            inset 0 2px 8px rgba(0, 0, 0, 0.2),
            0 2px 8px rgba(99, 102, 241, 0.5);
        }
        
        /* Dark mode scrollbar */
        @media (prefers-color-scheme: dark) {
          .custom-scrollbar {
            scrollbar-color: #a855f7 #374151;
          }
          
          .custom-scrollbar::-webkit-scrollbar-track {
            background: linear-gradient(90deg, #1f2937 0%, #374151 50%, #4b5563 100%);
            box-shadow: inset 0 1px 3px rgba(255, 255, 255, 0.05);
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb {
            box-shadow: 
              inset 0 1px 3px rgba(0, 0, 0, 0.2),
              0 2px 6px rgba(168, 85, 247, 0.4);
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            box-shadow: 
              inset 0 1px 6px rgba(0, 0, 0, 0.25),
              0 4px 12px rgba(168, 85, 247, 0.5),
              0 0 0 2px rgba(168, 85, 247, 0.3);
          }
        }
        
        /* Smooth scrolling animation */
        .custom-scrollbar {
          scroll-behavior: smooth;
        }
        
        /* Custom scrollbar corners */
        .custom-scrollbar::-webkit-scrollbar-corner {
          background: transparent;
        }
      `}</style>
    </div>
  );
}
