import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit } from 'lucide-react';

interface Property {
  id: string;
  propertyNo: string;
  propertyType: string;
  wardNo: string;
  ownerName: string;
  mobileNo: string;
  address: string;
  email: string;
  aadharNo: string;
  panNo: string;
  area: string;
  constructionYear: string;
  buildingType: string;
  usageType: string;
  floorCount: string;
  totalArea: string;
  propertyTaxNo: string;
  waterTaxNo: string;
  electricityNo: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

export function PropertyDetailView() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setIsLoading(true);
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/properties/${id}`);
        // const data = await response.json();
        
        // Mock data for now
        const mockProperty: Property = {
          id: id || '1',
          propertyNo: 'PROP-001',
          propertyType: 'Residential',
          wardNo: 'W-01',
          ownerName: 'John Doe',
          mobileNo: '9876543210',
          address: '123 Main St, City',
          email: 'john.doe@example.com',
          aadharNo: '1234 5678 9012',
          panNo: 'ABCDE1234F',
          area: '1500',
          constructionYear: '2010',
          buildingType: 'Pucca',
          usageType: 'Residential',
          floorCount: '2',
          totalArea: '3000',
          propertyTaxNo: 'PT-001',
          waterTaxNo: 'WT-001',
          electricityNo: 'EL-001',
          status: 'Active',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        };
        
        setProperty(mockProperty);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to fetch property details');
        setIsLoading(false);
        console.error('Error fetching property:', err);
      }
    };

    if (id) {
      fetchProperty();
    }
  }, [id]);

  if (isLoading) {
    return <div className="p-8">Loading property details...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  if (!property) {
    return <div className="p-8">Property not found</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/properties">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{property.propertyNo}</h1>
            <p className="text-sm text-muted-foreground">
              Property Details
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link to={`/dashboard/properties/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Property
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle>Property Information</CardTitle>
            <CardDescription>Basic details about the property</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Property Type</p>
              <p>{property.propertyType}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ward No</p>
              <p>{property.wardNo}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Address</p>
              <p>{property.address}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Area (sq.ft)</p>
              <p>{property.area}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Construction Year</p>
              <p>{property.constructionYear}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Building Type</p>
              <p>{property.buildingType}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Usage Type</p>
              <p>{property.usageType}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Number of Floors</p>
              <p>{property.floorCount}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Area (sq.ft)</p>
              <p>{property.totalArea}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={property.status === 'Active' ? 'default' : 'destructive'}>
                {property.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Owner Details */}
        <Card>
          <CardHeader>
            <CardTitle>Owner Information</CardTitle>
            <CardDescription>Details about the property owner</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Owner Name</p>
              <p>{property.ownerName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Mobile No</p>
              <p>{property.mobileNo}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p>{property.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Aadhar No</p>
              <p>{property.aadharNo}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">PAN No</p>
              <p>{property.panNo || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Tax Information */}
        <Card>
          <CardHeader>
            <CardTitle>Tax Information</CardTitle>
            <CardDescription>Tax-related details for the property</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Property Tax No</p>
              <p>{property.propertyTaxNo || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Water Tax No</p>
              <p>{property.waterTaxNo || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Electricity No</p>
              <p>{property.electricityNo || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end space-x-4">
        <Button variant="outline" asChild>
          <Link to="/dashboard/properties">Back to List</Link>
        </Button>
        <Button asChild>
          <Link to={`/dashboard/properties/${id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Property
          </Link>
        </Button>
      </div>
    </div>
  );
}
