import { Routes, Route } from 'react-router-dom';

import ProtectedRoute from './components/protected-route/ProtectedRoute.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import Dashboard from './pages/dashboard/Dashboard.page.tsx';
import Login from './pages/login/Login.page.tsx';
import NotFound from './pages/not-found/NotFound.page.tsx';
import PanicDetail from './pages/panic-detail/PanicDetail.page.tsx';

export default function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/panics/:id" element={<ProtectedRoute><PanicDetail /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}
