import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import propertyService from '@/services/propertyService';
import { toast } from '@/components/ui/use-toast';

interface PropertyFormData {
  name: string;
  details: string;
  value: string;
}

export default function PropertyRegistrationForm() {
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit, reset } = useForm<PropertyFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      const fetchProperty = async () => {
        try {
          const mockProperty: PropertyFormData = {
            name: 'Sample Name',
            details: 'Sample Details',
            value: '1000'
          };
          // reset(mockProperty);
        } catch (error) {
          console.error('Error fetching property:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchProperty();
    }
  }, [id]);

  if (isLoading) {
    return <div className="p-8">Loading property data...</div>;
  }

  const onSubmit = async (data: PropertyFormData) => {
    try {
      setIsSubmitting(true);
      const payload = {
        name: data.name,
        details: data.details,
        value: data.value
      };

      if (id) {
        await propertyService.updateProperty(id, payload);
        toast({ title: 'Property updated successfully' });
      } else {
        await propertyService.createProperty(payload);
        toast({ title: 'Property created successfully' });
      }
      navigate('/dashboard/properties');
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit property form',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto text-sm">
      <CardHeader className="py-2">
        <CardTitle className="text-lg">Property Registration</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="text-base font-medium">Property Details</h3>
              
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input id="name" className="h-8 px-2 text-sm" {...register('name')} required />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="details">Details</Label>
                <Input id="details" className="h-8 px-2 text-sm" {...register('details')} required />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="value">Value</Label>
                <Input id="value" type="number" className="h-8 px-2 text-sm" {...register('value')} required />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" className="h-8 px-3 text-sm">
              Cancel
            </Button>
            <Button type="submit" className="h-8 px-4 text-sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Register Property'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
