'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Member } from '@/types/member';
import { useLanguage } from '@/lib/language';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { FileDown } from 'lucide-react';

interface Props {
  members: Member[];
  searchTerm: string;
  filterRole: string;
  canEditMembers: boolean;
  canDeleteMembers: boolean;
  canBlockMembers: boolean;
  canResetPasswords: boolean;
  currentPage: number;
  totalPages: number;
  totalMembers: number;
  onEdit: (member: Member) => void;
  onDelete: (id: number) => Promise<void>;
  onBlock: (id: number, userId: number) => Promise<void>;
  onUnblock: (id: number, userId: number) => Promise<void>;
  onResetPassword: (id: number) => Promise<void>;
  onSearch: (term: string) => void;
  onFilter: (role: string) => void;
  onPageChange: (page: number) => void;
}

// Column Keys
type ColKey = 'name' | 'username' | 'mobile' | 'email' | 'role' | 'status' | 'actions';

export default function MemberListView({
  members,
  searchTerm,
  filterRole,
  canEditMembers,
  canDeleteMembers,
  canBlockMembers,
  canResetPasswords,
  currentPage,
  totalPages,
  totalMembers,
  onEdit,
  onDelete,
  onBlock,
  onUnblock,
  onResetPassword,
  onSearch,
  onFilter,
  onPageChange
}: Props) {
  const { language } = useLanguage();
  const t = (en: string, ta: string) => language === 'english' ? ta : en;

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' | 'center' }> = [
    { key: 'name', label: t('Name', 'பெயர்') },
    { key: 'username', label: t('Username', 'பயனர் பெயர்') },
    { key: 'mobile', label: t('Mobile', 'மொபைல்') },
    { key: 'email', label: t('Email', 'மின்னஞ்சல்') },
    { key: 'role', label: t('Role', 'பங்கு'), align: 'center' },
    { key: 'status', label: t('Status', 'நிலை'), align: 'center' },
    { key: 'actions', label: t('Actions', 'செயல்கள்'), align: 'center' },
  ];

  const STORAGE_KEY = 'member_list_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    name: true,
    username: true,
    mobile: true,
    email: true,
    role: true,
    status: true,
    actions: canEditMembers || canDeleteMembers || canBlockMembers || canResetPasswords,
  };

  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultVisible, ...JSON.parse(saved) } : defaultVisible;
    } catch {
      return defaultVisible;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols));
    } catch {}
  }, [visibleCols]);

  // Context Menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const visibleColCount = useMemo(() => Object.values(visibleCols).filter(Boolean).length, [visibleCols]);

  const handleExportPdf = async () => {
    // Add your PDF export logic here
    console.log('Exporting members to PDF...');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-2 px-1">
        <div className="text-sm text-gray-500">
          {totalMembers} {totalMembers === 1 ? t('member', 'உறுப்பினர்') : t('members', 'உறுப்பினர்கள்')} {t('found', 'கிடைத்தன')}
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-3">
        <CardContent className="p-2">
          <div className="flex flex-col md:flex-row gap-2 items-center">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearch(e.target.value)}
                placeholder={t('Search by name/username/mobile/email', 'பெயர்/பயனர் பெயர்/மொபைல்/மின்னஞ்சல் மூலம் தேடுக')}
                className="pl-8 text-sm py-1"
              />
            </div>

            {/* Role Filter */}
            <select
              value={filterRole}
              onChange={(e) => onFilter(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('All Roles', 'அனைத்து பங்குகள்')}</option>
              <option value="member">{t('Member', 'உறுப்பினர்')}</option>
              <option value="admin">{t('Admin', 'நிர்வாகி')}</option>
              <option value="superadmin">{t('Super Admin', 'முதன்மை நிர்வாகி')}</option>
            </select>

            {/* Actions */}
            <div className="flex flex-wrap gap-1 w-full md:w-auto">
              <Button variant="outline" onClick={() => onSearch('')} className="text-xs py-1 px-2">
                {t('Clear', 'அழி')}
              </Button>
              <Button variant="outline" onClick={handleExportPdf} className="text-xs py-1 px-2">
                <FileDown className="h-3 w-3 mr-1" />
                {t('Export PDF', 'PDF ஏற்றுமதி')}
              </Button>
              <Button variant="outline" onClick={handlePrint} className="text-xs py-1 px-2">
                <FileDown className="h-3 w-3 mr-1" />
                {t('Print', 'அச்சிடு')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div
        className="bg-white rounded border border-gray-200 overflow-hidden"
        onContextMenu={onContextMenu}
      >
        <div className="overflow-x-auto text-xs max-h-[50vh]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {allColumns.map(
                  (col) =>
                    visibleCols[col.key] && (
                      <th
                        key={col.key}
                        className={`px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {col.label}
                      </th>
                    )
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColCount}
                    className="px-2 py-2 text-center text-xs text-gray-500"
                  >
                    {t('No members found', 'உறுப்பினர்கள் இல்லை')}
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    {visibleCols.name && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs">
                        <div className="font-medium text-gray-900">{member.fullName}</div>
                        {member.username && <div className="text-xs text-gray-500">@{member.username}</div>}
                      </td>
                    )}
                    {visibleCols.username && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {member.username || '-'}
                      </td>
                    )}
                    {visibleCols.mobile && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {member.mobile}
                      </td>
                    )}
                    {visibleCols.email && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {member.email || '-'}
                      </td>
                    )}
                    {visibleCols.role && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-center">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${
                          member.role === 'superadmin' 
                            ? 'bg-red-100 text-red-800'
                            : member.role === 'admin'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {member.role === 'superadmin' ? t('Super Admin', 'முதன்மை நிர்வாகி') :
                           member.role === 'admin' ? t('Admin', 'நிர்வாகி') :
                           t('Member', 'உறுப்பினர்')}
                        </span>
                      </td>
                    )}
                    {visibleCols.status && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-center">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          member.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {member.isBlocked ? t('Blocked', 'தடுக்கப்பட்டது') : t('Active', 'செயலில்')}
                        </span>
                      </td>
                    )}
                    {visibleCols.actions && (canEditMembers || canDeleteMembers || canBlockMembers || canResetPasswords) && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs font-medium text-center">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {canEditMembers && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEdit(member)}
                              className="text-xs py-0.5 px-1.5 h-auto"
                            >
                              {t('Edit', 'திருத்து')}
                            </Button>
                          )}
                          {canBlockMembers && member.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => member.isBlocked ? onUnblock(member.id, member.userId!) : onBlock(member.id, member.userId!)}
                              className={`text-xs py-0.5 px-1.5 h-auto ${
                                member.isBlocked 
                                  ? 'text-green-600 hover:text-green-700 border-green-200' 
                                  : 'text-yellow-600 hover:text-yellow-700 border-yellow-200'
                              }`}
                            >
                              {member.isBlocked ? t('Unblock', 'திற') : t('Block', 'தடு')}
                            </Button>
                          )}
                          {canResetPasswords && member.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onResetPassword(member.id)}
                              className="text-xs py-0.5 px-1.5 h-auto text-blue-600 hover:text-blue-700 border-blue-200"
                            >
                              {t('Reset PW', 'கடவுச்சொல் மீட்டமை')}
                            </Button>
                          )}
                          {canDeleteMembers && member.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDelete(member.id)}
                              className="text-xs py-0.5 px-1.5 h-auto text-red-600 hover:text-red-700 border-red-200"
                            >
                              {t('Delete', 'நீக்கு')}
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-2 py-1 flex items-center justify-between border-t border-gray-200 text-xs">
          <div className="text-gray-700">
            {t('Showing', 'காட்டப்படுகிறது')}{' '}
            <span className="font-medium">{(currentPage - 1) * 20 + 1}</span> {t('to', 'இலிருந்து')}{' '}
            <span className="font-medium">{Math.min(currentPage * 20, totalMembers)}</span> {t('of', 'மொத்தம்')}{' '}
            <span className="font-medium">{totalMembers}</span> {t('results', 'முடிவுகள்')}
          </div>
          <div className="text-gray-700">
            {t('Total', 'மொத்தம்')}: <span className="font-medium">{totalMembers}</span>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 mt-2 text-xs">
          <Button
            variant="outline"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="text-xs py-1 px-2"
          >
            {t('Previous', 'முந்தைய')}
          </Button>
          <span className="text-xs">
            {t('Page', 'பக்கம்')} {currentPage} {t('of', 'இல்')} {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="text-xs py-1 px-2"
          >
            {t('Next', 'அடுத்தது')}
          </Button>
        </div>
      )}

      {/* Context Menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white rounded shadow border border-gray-200 w-48 text-xs"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          <div className="px-3 py-2 border-b border-gray-200">
            <h3 className="text-xs font-medium text-gray-900">{t('Columns', 'நெடுவரிசைகள்')}</h3>
            <p className="text-xs text-gray-500">
              {t('Visible', 'காட்டப்படும்')} {Object.values(visibleCols).filter(Boolean).length}/{allColumns.length}
            </p>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {allColumns.map((col) => (
              <label
                key={col.key}
                className="flex items-center px-2 py-1 rounded hover:bg-gray-50 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={!!visibleCols[col.key]}
                  onChange={() =>
                    setVisibleCols((prev) => ({ ...prev, [col.key]: !prev[col.key] }))
                  }
                  className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-xs text-gray-700">{col.label}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 p-1 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              className="text-xs py-0.5 px-1.5 h-auto"
              onClick={() =>
                setVisibleCols(
                  Object.fromEntries(allColumns.map((c) => [c.key, true])) as Record<ColKey, boolean>
                )
              }
            >
              {t('Select all', 'அனைத்தையும் தேர்ந்தெடு')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs py-0.5 px-1.5 h-auto"
              onClick={() =>
                setVisibleCols(
                  Object.fromEntries(allColumns.map((c) => [c.key, false])) as Record<ColKey, boolean>
                )
              }
            >
              {t('Clear all', 'அனைத்தையும் அழி')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs py-0.5 px-1.5 h-auto"
              onClick={() => setVisibleCols({ ...defaultVisible })}
            >
              {t('Reset', 'மீட்டமை')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs py-0.5 px-1.5 h-auto ml-auto"
              onClick={() => setMenuOpen(false)}
            >
              {t('Close', 'மூடு')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
