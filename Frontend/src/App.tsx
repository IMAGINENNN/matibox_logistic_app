import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { DriverDashboard } from './pages/DriverDashboard';
import { MatiboxLogo } from './components/MatiboxLogo';

const AppRouter: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="liquid-glass-strong rounded-3xl px-8 py-6 flex flex-col items-center gap-3">
          <MatiboxLogo size="lg" subtitle="Warm Meal Logistics & Dispatch" />
          <div className="text-xs font-bold tracking-wider uppercase text-[#276EF1] animate-pulse mt-1">
            Loading Spatial Workspace...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return user.role === 'Admin' || user.role === 'Dispatcher' ? (
    <AdminDashboard />
  ) : (
    <DriverDashboard />
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
