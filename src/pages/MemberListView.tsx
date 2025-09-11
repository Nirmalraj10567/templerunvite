'use client';

import { Member } from '@/types/member';
import { useLanguage } from '@/lib/language';
import { Pagination } from '@/components/Pagination';

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
  
  // 👇 Reuse same translation helper as MoneyDonationEntry
  const t = (en: string, ta: string) => language === 'english' ? en : ta;

  return (
    <div className="space-y-4 text-xs">
      {/* Member Count */}
      <div className="text-gray-500">
        {totalMembers} {totalMembers === 1 ? t('member', 'உறுப்பினர்') : t('members', 'உறுப்பினர்கள்')} {t('found', 'கிடைத்தன')}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded shadow p-3 border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <input
            type="text"
            placeholder={t('Search...', 'தேடு...')}
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-xs flex-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            aria-label={t('Search members', 'உறுப்பினர்களைத் தேடவும்')}
          />
          <div className="flex gap-2">
            <select
              value={filterRole}
              onChange={(e) => onFilter(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              aria-label={t('Filter by role', 'பங்கு மூலம் வடிகட்டவும்')}
            >
              <option value="all">{t('All Roles', 'அனைத்து பங்குகள்')}</option>
              <option value="member">{t('Member', 'உறுப்பினர்')}</option>
              <option value="admin">{t('Admin', 'நிர்வாகி')}</option>
              <option value="superadmin">{t('Super Admin', 'முதன்மை நிர்வாகி')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded shadow overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider w-1/6">
                  {t('Name', 'பெயர்')}
                </th>
                <th scope="col" className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider w-1/6">
                  {t('Username', 'பயனர் பெயர்')}
                </th>
                <th scope="col" className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider w-1/6">
                  {t('Mobile', 'மொபைல்')}
                </th>
                <th scope="col" className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider w-1/6">
                  {t('Email', 'மின்னஞ்சல்')}
                </th>
                <th scope="col" className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider w-1/6">
                  {t('Role', 'பங்கு')}
                </th>
                <th scope="col" className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider w-1/6">
                  {t('Status', 'நிலை')}
                </th>
                {(canEditMembers || canDeleteMembers || canBlockMembers || canResetPasswords) && (
                  <th scope="col" className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider w-1/6">
                    {t('Actions', 'செயல்கள்')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={canEditMembers || canDeleteMembers || canBlockMembers || canResetPasswords ? 7 : 6} className="px-4 py-6 text-center text-gray-500">
                    {t('No members found', 'உறுப்பினர்கள் இல்லை')}
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900 w-1/6">
                      {member.fullName}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500 w-1/6">
                      {member.username || '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500 w-1/6">
                      {member.mobile}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500 w-1/6">
                      {member.email || '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap w-1/6">
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
                    <td className="px-3 py-2 whitespace-nowrap w-1/6">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        member.isBlocked 
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {member.isBlocked 
                          ? t('Blocked', 'தடுக்கப்பட்டது')
                          : t('Active', 'செயலில்')}
                      </span>
                    </td>
                    {(canEditMembers || canDeleteMembers || canBlockMembers || canResetPasswords) && (
                      <td className="px-3 py-2 whitespace-nowrap font-medium w-1/6">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {canEditMembers && (
                            <button
                              onClick={() => onEdit(member)}
                              className="text-indigo-600 hover:text-indigo-900 text-xs font-medium transition hover:underline"
                              aria-label={`${t('Edit', 'திருத்து')} ${member.fullName}`}
                            >
                              {t('Edit', 'திருத்து')}
                            </button>
                          )}
                          {canBlockMembers && member.id && (
                            <button
                              onClick={() => member.isBlocked ? onUnblock(member.id, member.userId!) : onBlock(member.id, member.userId!)}
                              className={`text-xs font-medium transition hover:underline ${
                                member.isBlocked 
                                  ? 'text-green-600 hover:text-green-900' 
                                  : 'text-yellow-600 hover:text-yellow-900'
                              }`}
                              aria-label={member.isBlocked ? t('Unblock', 'திற') : t('Block', 'தடு')}
                            >
                              {member.isBlocked ? t('Unblock', 'திற') : t('Block', 'தடு')}
                            </button>
                          )}
                          {canResetPasswords && member.id && (
                            <button
                              onClick={() => onResetPassword(member.id)}
                              className="text-blue-600 hover:text-blue-900 text-xs font-medium transition hover:underline"
                              aria-label={`${t('Reset PW', 'கடவுச்சொல் மீட்டமை')} for ${member.fullName}`}
                            >
                              {t('Reset PW', 'கடவுச்சொல் மீட்டமை')}
                            </button>
                          )}
                          {canDeleteMembers && member.id && (
                            <button
                              onClick={() => onDelete(member.id)}
                              className="text-red-600 hover:text-red-900 text-xs font-medium transition hover:underline"
                              aria-label={`${t('Delete', 'நீக்கு')} ${member.fullName}`}
                            >
                              {t('Delete', 'நீக்கு')}
                            </button>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-3 py-2 border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}