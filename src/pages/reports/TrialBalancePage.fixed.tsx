import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getAuthToken } from '@/lib/auth';
import { Loader2, RefreshCw, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorBoundary } from 'react-error-boundary';

// Error boundary fallback component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div role="alert" className="p-4 bg-red-50 rounded-md m-4">
      <p className="text-red-700 font-medium">Something went wrong:</p>
      <pre className="text-red-600 text-sm mt-2 mb-4">{error.message}</pre>
      <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
        Try again
      </Button>
    </div>
  );
}

// Loading skeleton component
const LoadingSkeleton = ({ visibleColumns }: { visibleColumns: number }) => (
  <div className="space-y-2 p-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center space-x-2">
        <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
        {Array.from({ length: visibleColumns }).map((_, j) => (
          <div key={j} className="h-4 w-16 bg-gray-200 animate-pulse rounded ml-auto" />
        ))}
      </div>
    ))}
  </div>
);

interface TrialRow {
  account: string;
  category?: string;
  inflow: number;
  outflow: number;
  balance: number;
  debit: number;
  credit: number;
}

interface CategoryGroup {
  [key: string]: TrialRow[];
}

interface CategoryTotals {
  [key: string]: {
    debit: number;
    credit: number;
  };
}

// Main component with error boundary
export default function TrialBalancePage() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
      <TrialBalanceContent />
    </ErrorBoundary>
  );
}

function TrialBalanceContent() {
  // ... existing state and functions ...

  return (
    <div className="max-w-7xl mx-auto p-2">
      <Card className="shadow-lg">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-semibold">Trial Balance</CardTitle>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={exportCSV} disabled={!sortedRows.length}>
                CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={exportPDF} disabled={!sortedRows.length}>
                PDF
              </Button>
              <Button variant="secondary" size="sm" onClick={() => window.print()} disabled={!sortedRows.length}>
                Print
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          {/* Date range and filter controls */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-3 items-end">
            <div>
              <Label htmlFor="from" className="text-xs">From</Label>
              <Input 
                id="from" 
                type="date" 
                className="h-8 text-sm" 
                value={startDate} 
                onChange={(e) => onFilterChange('from', e.target.value)} 
              />
            </div>
            <div>
              <Label htmlFor="to" className="text-xs">To</Label>
              <Input 
                id="to" 
                type="date" 
                className="h-8 text-sm" 
                value={endDate} 
                onChange={(e) => onFilterChange('to', e.target.value)} 
              />
            </div>
            <div className="md:col-span-2">
              <Button size="sm" onClick={load} disabled={isLoading} className="flex items-center gap-1">
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                <span className="sr-only md:not-sr-only">Refresh</span>
              </Button>
            </div>
            <div>
              <Button variant="outline" size="sm" onClick={() => setRange('today')} className="w-full">
                Today
              </Button>
            </div>
            <div>
              <Button variant="outline" size="sm" onClick={() => setRange('thisMonth')} className="w-full">
                This Month
              </Button>
            </div>
          </div>

          {/* Search and filter controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="categorySearch" className="text-xs whitespace-nowrap">Category:</Label>
                <Input 
                  id="categorySearch" 
                  placeholder="Filter categories..." 
                  className="h-8 text-sm flex-1" 
                  value={categoryQuery} 
                  onChange={(e) => setCategoryQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="accountSearch" className="text-xs whitespace-nowrap">Account:</Label>
                <Input 
                  id="accountSearch" 
                  placeholder="Filter accounts..." 
                  className="h-8 text-sm flex-1" 
                  value={accountQuery} 
                  onChange={(e) => setAccountQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => toggleAllCategories(!hasExpandedCategories)}
                >
                  {hasExpandedCategories ? 'Collapse All' : 'Expand All'}
                </Button>
                <span className="text-gray-600">
                  {isLoading ? 'Loading...' : `${Object.keys(categories).length} categories, ${rows.length} accounts`}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-xs mt-2">
                {error && <span className="text-red-600">{error}</span>}
                <div className="ml-auto flex items-center gap-4">
                  <span className="font-medium">
                    Debit: <span className={totals.debit !== totals.credit ? 'text-red-600' : ''}>
                      {nf.format(totals.debit)}
                    </span>
                  </span>
                  <span className="font-medium">
                    Credit: <span className={totals.credit !== totals.debit ? 'text-red-600' : ''}>
                      {nf.format(totals.credit)}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Column visibility toggles */}
          <div className="flex flex-wrap items-center gap-3 mb-3 pb-2 border-b">
            <div className="flex items-center gap-1 text-xs">
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={visible.inflow} onChange={(e) => setVisible(v => ({...v, inflow: e.target.checked}))} className="h-4 w-4" />
                <span>Inflow</span>
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={visible.outflow} onChange={(e) => setVisible(v => ({...v, outflow: e.target.checked}))} className="h-4 w-4" />
                <span>Outflow</span>
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={visible.debit} onChange={(e) => setVisible(v => ({...v, debit: e.target.checked}))} className="h-4 w-4" />
                <span>Debit</span>
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={visible.credit} onChange={(e) => setVisible(v => ({...v, credit: e.target.checked}))} className="h-4 w-4" />
                <span>Credit</span>
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={visible.balance} onChange={(e) => setVisible(v => ({...v, balance: e.target.checked}))} className="h-4 w-4" />
                <span>Balance</span>
              </label>
            </div>
          </div>
          
          {/* Main table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th 
                    className="text-left px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors" 
                    onClick={() => onSort('account')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Account</span>
                      {sortKey === 'account' && (
                        <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  {visible.inflow && (
                    <th 
                      className="text-right px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => onSort('inflow')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {sortKey === 'inflow' && (
                          <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                        <span>Inflow</span>
                      </div>
                    </th>
                  )}
                  {visible.outflow && (
                    <th 
                      className="text-right px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => onSort('outflow')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {sortKey === 'outflow' && (
                          <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                        <span>Outflow</span>
                      </div>
                    </th>
                  )}
                  {visible.debit && (
                    <th 
                      className="text-right px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => onSort('debit')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {sortKey === 'debit' && (
                          <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                        <span>Debit</span>
                      </div>
                    </th>
                  )}
                  {visible.credit && (
                    <th 
                      className="text-right px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => onSort('credit')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {sortKey === 'credit' && (
                          <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                        <span>Credit</span>
                      </div>
                    </th>
                  )}
                  {visible.balance && (
                    <th 
                      className="text-right px-3 py-2 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => onSort('balance')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {sortKey === 'balance' && (
                          <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                        <span>Balance</span>
                      </div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={1 + visibleColumnsCount}>
                      <LoadingSkeleton visibleColumns={visibleColumnsCount} />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={1 + visibleColumnsCount} className="text-center py-4 text-red-600">
                      {error}
                    </td>
                  </tr>
                ) : (
                  <>
                    {Object.entries(filteredCategories).map(([category, categoryRows]) => {
                      const isExpanded = expandedCategories[category] ?? true;
                      const categoryTotal = categoryTotals[category] || { debit: 0, credit: 0 };
                      const isBalanced = Math.abs((categoryTotal.debit || 0) - (categoryTotal.credit || 0)) < 0.01;
                      
                      // Filter rows by account query
                      const filteredRows = categoryRows.filter(row => 
                        !accountQuery || row.account.toLowerCase().includes(accountQuery.toLowerCase())
                      );

                      if (filteredRows.length === 0) return null;

                      return (
                        <React.Fragment key={category}>
                          {/* Category Header */}
                          <tr 
                            className="bg-gray-50 cursor-pointer hover:bg-gray-100"
                            onClick={() => toggleCategory(category)}
                          >
                            <td className="px-3 py-2 font-medium" colSpan={1 + visibleColumnsCount}>
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <span>{category}</span>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="ml-auto h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    exportCategoryToCSV(category, filteredRows);
                                  }}
                                  title="Export category to CSV"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Category Rows */}
                          {isExpanded && filteredRows.map((row) => (
                            <tr key={row.account} className="hover:bg-gray-50 border-b">
                              <td className="px-8 py-1.5">
                                <button 
                                  className="text-blue-700 hover:underline text-xs text-left w-full" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(
                                      `/dashboard/reports/journal-log?account=${encodeURIComponent(row.account)}` +
                                      `&startDate=${encodeURIComponent(query.startDate)}` +
                                      `&endDate=${encodeURIComponent(query.endDate)}`
                                    );
                                  }}
                                >
                                  {row.account}
                                </button>
                              </td>
                              {visible.inflow && (
                                <td className="px-2 py-1.5 text-right">
                                  {row.inflow ? nf.format(row.inflow) : '-'}
                                </td>
                              )}
                              {visible.outflow && (
                                <td className="px-2 py-1.5 text-right">
                                  {row.outflow ? nf.format(row.outflow) : '-'}
                                </td>
                              )}
                              {visible.debit && (
                                <td className="px-2 py-1.5 text-right">
                                  {row.debit ? nf.format(row.debit) : '-'}
                                </td>
                              )}
                              {visible.credit && (
                                <td className="px-2 py-1.5 text-right">
                                  {row.credit ? nf.format(row.credit) : '-'}
                                </td>
                              )}
                              {visible.balance && (
                                <td className="px-2 py-1.5 text-right">
                                  <span className={row.balance < 0 ? 'text-red-600' : ''}>
                                    {row.balance ? nf.format(row.balance) : '0.00'}
                                  </span>
                                </td>
                              )}
                            </tr>
                          ))}
                          
                          {/* Category Summary */}
                          {isExpanded && (
                            <tr className={`${isBalanced ? 'bg-green-50' : 'bg-amber-50'} border-b`}>
                              <td className="px-6 py-1 text-right font-medium" colSpan={1}>
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-xs text-gray-500">{category} Total:</span>
                                  {!isBalanced && (
                                    <span className="text-xs text-amber-600">
                                      {categoryTotal.debit > categoryTotal.credit ? 'Debit > Credit' : 'Credit > Debit'}
                                    </span>
                                  )}
                                </div>
                              </td>
                              {visible.inflow && (
                                <td className="px-2 py-1 text-right font-medium">
                                  {nf.format(filteredRows.reduce((sum, r) => sum + (r.inflow || 0), 0))}
                                </td>
                              )}
                              {visible.outflow && (
                                <td className="px-2 py-1 text-right font-medium">
                                  {nf.format(filteredRows.reduce((sum, r) => sum + (r.outflow || 0), 0))}
                                </td>
                              )}
                              {visible.debit && (
                                <td className="px-2 py-1 text-right font-medium">
                                  <span className={!isBalanced ? 'text-amber-700' : ''}>
                                    {nf.format(categoryTotal.debit || 0)}
                                  </span>
                                </td>
                              )}
                              {visible.credit && (
                                <td className="px-2 py-1 text-right font-medium">
                                  <span className={!isBalanced ? 'text-amber-700' : ''}>
                                    {nf.format(categoryTotal.credit || 0)}
                                  </span>
                                </td>
                              )}
                              {visible.balance && (
                                <td className="px-2 py-1 text-right font-medium">
                                  <span className={filteredRows.reduce((sum, r) => sum + (r.balance || 0), 0) < 0 ? 'text-red-600' : ''}>
                                    {nf.format(filteredRows.reduce((sum, r) => sum + (r.balance || 0), 0))}
                                  </span>
                                </td>
                              )}
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    
                    {/* Grand Total */}
                    {rows.length > 0 && (
                      <tr className="bg-gray-100 font-medium border-t-2 border-gray-200">
                        <td className="px-3 py-2 font-semibold">
                          <div className="flex items-center justify-between">
                            <span>GRAND TOTAL</span>
                            {totals.debit !== totals.credit && (
                              <span className="text-xs text-red-600 font-normal">
                                {totals.debit > totals.credit ? 'Debit > Credit' : 'Credit > Debit'}
                              </span>
                            )}
                          </div>
                        </td>
                        {visible.inflow && (
                          <td className="px-2 py-2 text-right font-semibold">
                            {nf.format(rows.reduce((sum, r) => sum + (r.inflow || 0), 0))}
                          </td>
                        )}
                        {visible.outflow && (
                          <td className="px-2 py-2 text-right font-semibold">
                            {nf.format(rows.reduce((sum, r) => sum + (r.outflow || 0), 0))}
                          </td>
                        )}
                        {visible.debit && (
                          <td className="px-2 py-2 text-right font-semibold">
                            <span className={totals.debit !== totals.credit ? 'text-red-600' : ''}>
                              {nf.format(totals.debit)}
                            </span>
                          </td>
                        )}
                        {visible.credit && (
                          <td className="px-2 py-2 text-right font-semibold">
                            <span className={totals.credit !== totals.debit ? 'text-red-600' : ''}>
                              {nf.format(totals.credit)}
                            </span>
                          </td>
                        )}
                        {visible.balance && (
                          <td className="px-2 py-2 text-right font-semibold">
                            <span className={rows.reduce((sum, r) => sum + (r.balance || 0), 0) < 0 ? 'text-red-600' : ''}>
                              {nf.format(rows.reduce((sum, r) => sum + (r.balance || 0), 0))}
                            </span>
                          </td>
                        )}
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
