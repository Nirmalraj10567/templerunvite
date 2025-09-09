'use client';

import { Member } from '@/types/member';
import { useLanguage } from '@/lib/language'; // 👈 Added for language context

interface Props {
  members: Member[];
  searchTerm: string;
  filterRole: string;
  language: string; // Will be overridden for consistency
  canEditMembers: boolean;
  canDeleteMembers: boolean;
  canBlockMembers: boolean;
  canResetPasswords: boolean;
  onEdit: (member: Member) => void;
  onDelete: (id: number) => Promise<void>;
  onBlock: (id: number, userId: number) => Promise<void>;
  onUnblock: (id: number, userId: number) => Promise<void>;
  onResetPassword: (id: number) => Promise<void>;
  onSearch: (term: string) => void;
  onFilter: (role: string) => void;
}

export default function MemberListView({
  members,
  searchTerm,
  filterRole,
  language: passedLanguage, // Not used directly — overridden by hook
  canEditMembers,
  canDeleteMembers,
  canBlockMembers,
  canResetPasswords,
  onEdit,
  onDelete,
  onBlock,
  onUnblock,
  onResetPassword,
  onSearch,
  onFilter
}: Props) {
  // 👇 Use context language for consistency across app
  const { language: currentLanguage } = useLanguage();
  const lang = currentLanguage as 'english' | 'tamil';

  // Translation object
  const t = {
    english: {
      search: 'Search...',
      allRoles: 'அனைத்து பங்குகள்',
      name: 'பெயர்',
      username: 'பயனர் பெயர்',
      mobile: 'மொபைல்',
      email: 'மின்னஞ்சல்',
      role: 'பங்கு',
      status: 'நிலை',
      actions: 'செயல்கள்',
      noMembers: 'உறுப்பினர்கள் இல்லை',
      blocked: 'தடுக்கப்பட்டது',
      active: 'செயலில்',
      edit: 'திருத்து',
      unblock: 'திற',
      block: 'தடு',
      resetPW: 'கடவுச்சொல் மீட்டமை',
      delete: 'நீக்கு',
      roles: {
        member: 'உறுப்பினர்',
        admin: 'நிர்வாகி',
        superadmin: 'முதன்மை நிர்வாகி',
      }
    },
    tamil: {
      search: 'Search...',
      allRoles: 'All Roles',
      name: 'Name',
      username: 'Username',
      mobile: 'Mobile',
      email: 'Email',
      role: 'Role',
      status: 'Status',
      actions: 'Actions',
      noMembers: 'No members found',
      blocked: 'Blocked',
      active: 'Active',
      edit: 'Edit',
      unblock: 'Unblock',
      block: 'Block',
      resetPW: 'Reset PW',
      delete: 'Delete',
      roles: {
        member: 'Member',
        admin: 'Admin',
        superadmin: 'Super Admin',
      }
    }
  } as const;

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <input
            type="text"
            placeholder={t[lang].search}
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md flex-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label={t[lang].search}
          />
          <div className="flex gap-2">
            <select
              value={filterRole}
              onChange={(e) => onFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label={t[lang].allRoles}
            >
              <option value="all">{t[lang].allRoles}</option>
              <option value="member">{t[lang].roles.member}</option>
              <option value="admin">{t[lang].roles.admin}</option>
              <option value="superadmin">{t[lang].roles.superadmin}</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Members Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  {t[lang].name}
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  {t[lang].username}
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  {t[lang].mobile}
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  {t[lang].email}
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  {t[lang].role}
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  {t[lang].status}
                </th>
                {(canEditMembers || canDeleteMembers || canBlockMembers || canResetPasswords) && (
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    {t[lang].actions}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={canEditMembers || canDeleteMembers || canBlockMembers || canResetPasswords ? 7 : 6} className="px-6 py-8 text-center text-gray-500 text-sm">
                    {t[lang].noMembers}
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 w-1/6">
                      {member.fullName}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 w-1/6">
                      {member.username || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 w-1/6">
                      {member.mobile}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 w-1/6">
                      {member.email || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap w-1/6">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                        member.role === 'superadmin' 
                          ? 'bg-red-100 text-red-800'
                          : member.role === 'admin'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {t[lang].roles[member.role as keyof typeof t['tamil']['roles']] || member.role}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap w-1/6">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        member.isBlocked 
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {member.isBlocked 
                          ? t[lang].blocked
                          : t[lang].active}
                      </span>
                    </td>
                    {(canEditMembers || canDeleteMembers || canBlockMembers || canResetPasswords) && (
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium w-1/6">
                        <div className="flex flex-wrap gap-2 items-center">
                          {canEditMembers && (
                            <button
                              onClick={() => onEdit(member)}
                              className="text-indigo-600 hover:text-indigo-900 text-xs font-medium transition"
                              aria-label={`${t[lang].edit} ${member.fullName}`}
                            >
                              {t[lang].edit}
                            </button>
                          )}
                          {canBlockMembers && member.id && (
                            <button
                              onClick={() => member.isBlocked ? onUnblock(member.id!, member.userId!) : onBlock(member.id!, member.userId!)}
                              className={`text-xs font-medium transition ${
                                member.isBlocked 
                                  ? 'text-green-600 hover:text-green-900' 
                                  : 'text-yellow-600 hover:text-yellow-900'
                              }`}
                              aria-label={member.isBlocked ? t[lang].unblock : t[lang].block}
                            >
                              {member.isBlocked ? t[lang].unblock : t[lang].block}
                            </button>
                          )}
                          {canResetPasswords && member.id && (
                            <button
                              onClick={() => onResetPassword(member.id!)}
                              className="text-blue-600 hover:text-blue-900 text-xs font-medium transition"
                              aria-label={`${t[lang].resetPW} for ${member.fullName}`}
                            >
                              {t[lang].resetPW}
                            </button>
                          )}
                          {canDeleteMembers && member.id && (
                            <button
                              onClick={() => onDelete(member.id!)}
                              className="text-red-600 hover:text-red-900 text-xs font-medium transition"
                              aria-label={`${t[lang].delete} ${member.fullName}`}
                            >
                              {t[lang].delete}
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
      </div>
    </div>
  );
}