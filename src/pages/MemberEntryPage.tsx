import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Member } from '@/types/member';
import MemberEntryView from './MemberEntryView';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
    createLogin: true,
    password: '',
    role: 'member',
  } as unknown as Member);

  const [editingMember] = useState<Member | null>(null);
  const [error, setError] = useState<{ show: boolean; message: string }>({
    show: false,
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleAddMember = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('https://templeapi.agniplay.com/api/members', {
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

      const responseData = await response.json();
      
      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 400 || response.status === 409) {
          let errorMessage = responseData.message || responseData.details || responseData.error || 'Failed to add member';
          const field = responseData.field;
          
          // Use backend field property for specific error messages
          if (field === 'email' || errorMessage.toLowerCase().includes('email')) {
            errorMessage = language === 'tamil' 
              ? 'இந்த மின்னஞ்சல் ஏற்கனவே பயன்பாட்டில் உள்ளது' 
              : 'This email is already in use';
          } 
          else if (field === 'mobile' || errorMessage.toLowerCase().includes('mobile')) {
            errorMessage = language === 'tamil'
              ? 'இந்த மொபைல் எண் ஏற்கனவே பயன்பாட்டில் உள்ளது'
              : 'This mobile number is already in use';
          }
          else if (field === 'username' || errorMessage.toLowerCase().includes('username')) {
            errorMessage = language === 'tamil'
              ? 'இந்த பயனர் பெயர் ஏற்கனவே பயன்பாட்டில் உள்ளது'
              : 'Username already exists';
          }
          
          throw new Error(errorMessage);
        }
        throw new Error(responseData.message || 'Failed to add member');
      }

      toast({
        title: language === 'tamil' ? 'உறுப்பினர் உருவாக்கப்பட்டது' : 'Member created',
        description: `${language === 'tamil' ? 'செயல்பாடு பதிவு செய்யப்பட்டது.' : 'Activity logged.'} ` + 
          (responseData.createdUserId ? (language === 'tamil' ? 'உள்நுழைவு உருவாக்கப்பட்டது.' : 'Login created.') : '')
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
    } catch (err: any) {
      console.error('Error adding member:', err);
      setError({
        show: true,
        message: err.message || (language === 'tamil' ? 'உறுப்பினரை உருவாக்க முடியவில்லை' : 'Failed to create member'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting || !editingMember) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`https://templeapi.agniplay.com/api/users/${editingMember.id}`, {
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
    } catch (error: any) {
      console.error('Error updating member:', error);
      setError({
        show: true,
        message: error.message || (language === 'tamil' ? 'புதுப்பிக்க முடியவில்லை' : 'Failed to update member'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4">
      {/* Error Modal */}
      <Dialog open={error.show} onOpenChange={(open) => !open && setError({ show: false, message: '' })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogDescription className="text-gray-700 text-base">
              {error.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setError({ show: false, message: '' })}
            >
              {language === 'tamil' ? 'சரி' : 'OK'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MemberEntryView
        newMember={newMember}
        setNewMember={setNewMember}
        editingMember={editingMember as Member}
        _language={language}
        user={user}
        handleAddMember={handleAddMember}
        handleUpdateMember={handleUpdateMember}
        isEditing={!!id}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
