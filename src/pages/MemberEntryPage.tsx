import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Member } from '@/types/member';
import MemberEntryView from './MemberEntryView';
import { toast } from '@/hooks/use-toast';

export default function MemberEntryPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, token } = useAuth();
  const { id } = useParams<{ id: string }>();

  const [newMember, setNewMember] = useState<Member>({
    id: 0,
    fullName: '',
    mobile: '',
    email: '',
    gotra: '',
    nakshatra: '',
    createLogin: false,
    password: '',
    role: 'member',
  } as unknown as Member);

  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newMember.fullName,
          username: (newMember as any).username,
          mobile: newMember.mobile,
          email: (newMember.email && newMember.email.trim() !== '') ? newMember.email.trim() : null,
          createLogin: newMember.createLogin === true,
          password: newMember.createLogin ? newMember.password : undefined,
          role: newMember.role,
          permissionLevel: (newMember as any).permissionLevel,
          customPermissions: (newMember as any).customPermissions,
        })
      });

      if (!response.ok) throw new Error('Failed to add member');

      const data = await response.json();
      toast({
        title: language === 'tamil' ? 'உறுப்பினர் உருவாக்கப்பட்டது' : 'Member created',
        description: `${language === 'tamil' ? 'செயல்பாடு பதிவு செய்யப்பட்டது.' : 'Activity logged.'} ` + (data.createdUserId ? (language === 'tamil' ? 'உள்நுழைவு உருவாக்கப்பட்டது.' : 'Login created.') : '')
      });

      // Reset form after create
      setNewMember({
        id: 0,
        fullName: '',
        mobile: '',
        email: '',
        gotra: '',
        nakshatra: '',
        createLogin: false,
        password: '',
        role: 'member'
      } as unknown as Member);

      // Optionally navigate back to members list
      navigate('/dashboard/members');
    } catch (err) {
      console.error('Error adding member:', err);
      toast({ title: language === 'tamil' ? 'பிழை' : 'Error', description: language === 'tamil' ? 'உறுப்பினரை உருவாக்க முடியவில்லை' : 'Failed to create member', variant: 'destructive' });
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      const response = await fetch(`/api/users/${editingMember.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: newMember.email,
          fullName: newMember.fullName,
          role: newMember.role,
          username: (newMember as any).username
        })
      });

      if (response.ok) {
        toast({ title: language === 'tamil' ? 'புதுப்பிக்கப்பட்டது' : 'Updated', description: language === 'tamil' ? 'உறுப்பினர் விவரங்கள் புதுப்பிக்கப்பட்டது' : 'Member details updated' });
        navigate('/dashboard/members');
      } else {
        throw new Error('Failed to update member');
      }
    } catch (error) {
      console.error('Error updating member:', error);
      toast({ title: language === 'tamil' ? 'பிழை' : 'Error', description: language === 'tamil' ? 'புதுப்பிக்க முடியவில்லை' : 'Failed to update member', variant: 'destructive' });
    }
  };

  return (
    <div className="p-4">
      <MemberEntryView
        newMember={newMember}
        setNewMember={setNewMember}
        editingMember={editingMember as Member}
        language={language}
        user={user}
        handleAddMember={handleAddMember}
        handleUpdateMember={handleUpdateMember}
        isEditing={!!id}
      />
    </div>
  );
}
