import { Navigate, Route, Routes } from 'react-router-dom';
import NotFound from '@/components/NotFound';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoginRoute from '@/routes/login';
import ClaimsListingPage from '@/routes/claims';
import ClaimDetailsPage from '@/routes/claims/[id]';
import ProfilePage from '@/routes/profile';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/claims" replace />} />
        <Route path="/claims" element={<ClaimsListingPage />} />
        <Route path="/claims/:id" element={<ClaimDetailsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
