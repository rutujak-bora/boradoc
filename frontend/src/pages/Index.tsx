import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Landing from './Landing';

const Index = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Landing />;
};

export default Index;
