import React from 'react';
import AdminPage from './AdminPage';
import { useAuth } from '../context/AuthContext';

interface AdminQuotesPageProps {
  onGoHome: () => void;
}

export const AdminQuotesPage: React.FC<AdminQuotesPageProps> = ({ onGoHome }) => {
  const { user } = useAuth();
  return <AdminPage user={user} onGoHome={onGoHome} />;
};

export default AdminQuotesPage;
