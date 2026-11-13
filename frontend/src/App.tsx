import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/primitives';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { BatchesPage } from '@/features/batches/pages/BatchesPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { UploadPage } from '@/features/upload/pages/UploadPage';
import { useAuth } from '@/providers/auth-provider';

function ProtectedRoute(): JSX.Element {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/batches" replace />} />
          <Route path="batches" element={<BatchesPage />} />
          <Route path="batches/:batchId" element={<DashboardPage />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="*" element={<Navigate to="/batches" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
