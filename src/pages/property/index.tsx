import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PropertyListView from './PropertyListView';
import PropertyRegistrationForm from './PropertyRegistrationForm';

const PropertyRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<PropertyListView />} />
      <Route path="/new" element={<PropertyRegistrationForm />} />
    </Routes>
  );
};

export default PropertyRoutes;
