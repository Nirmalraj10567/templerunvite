'use client';

import { Member } from '@/types/member';

interface Props {
  members: Member[];
  searchTerm: string;
  filterRole: string;
  language: string;
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
  language,
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
  return (
    <div>
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <input
            type="text"
            placeholder={language === 'tamil' ? 'தேடல்...' : 'Search...'}
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md flex-1"
          />
          <div className="flex gap-2">
            <select
              value={filterRole}
              onChange={(e) => onFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">{language === 'tamil' ? 'அனைத்து பங்குகள்' : 'All Roles'}</option>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Members Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  {language === 'tamil' ? 'பெயர்' : 'Name'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  {language === 'tamil' ? 'பயனர் பெயர்' : 'Username'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  {language === 'tamil' ? 'மொபைல்' : 'Mobile'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  {language === 'tamil' ? 'மின்னஞ்சல்' : 'Email'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  {language === 'tamil' ? 'பங்கு' : 'Role'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  {language === 'tamil' ? 'நிலை' : 'Status'}
                </th>
                {(canEditMembers || canDeleteMembers || canBlockMembers || canResetPasswords) && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    {language === 'tamil' ? 'செயல்கள்' : 'Actions'}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={canEditMembers || canDeleteMembers || canBlockMembers || canResetPasswords ? 7 : 6} className="px-6 py-4 text-center text-gray-500">
                    {language === 'tamil' ? 'உறுப்பினர்கள் இல்லை' : 'No members found'}
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
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
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        member.role === 'superadmin' 
                          ? 'bg-red-100 text-red-800'
                          : member.role === 'admin'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap w-1/6">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        member.isBlocked 
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {member.isBlocked 
                          ? (language === 'tamil' ? 'தடுக்கப்பட்டது' : 'Blocked')
                          : (language === 'tamil' ? 'செயலில்' : 'Active')}
                      </span>
                    </td>
                    {(canEditMembers || canDeleteMembers || canBlockMembers || canResetPasswords) && (
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium w-1/6">
                        <div className="flex space-x-2">
                          {canEditMembers && (
                            <button
                              onClick={() => onEdit(member)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              {language === 'tamil' ? 'திருத்து' : 'Edit'}
                            </button>
                          )}
                          {canBlockMembers && member.id && (
                            <button
                              onClick={() => member.isBlocked ? onUnblock(member.id!, member.userId!) : onBlock(member.id!, member.userId!)}
                              className={member.isBlocked ? "text-green-600 hover:text-green-900" : "text-yellow-600 hover:text-yellow-900"}
                            >
                              {member.isBlocked ? (language === 'tamil' ? 'திற' : 'Unblock') : (language === 'tamil' ? 'தடு' : 'Block')}
                            </button>
                          )}
                          {canResetPasswords && member.id && (
                            <button
                              onClick={() => onResetPassword(member.id!)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              {language === 'tamil' ? 'கடவுச்சொல் மீட்டமை' : 'Reset PW'}
                            </button>
                          )}
                          {canDeleteMembers && member.id && (
                            <button
                              onClick={() => onDelete(member.id!)}
                              className="text-red-600 hover:text-red-900"
                            >
                              {language === 'tamil' ? 'நீக்கு' : 'Delete'}
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
