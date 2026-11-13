import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { useAppStore } from './store/useAppStore';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const LoginPage        = lazy(() => import('./pages/LoginPage'));
const DaftarPage       = lazy(() => import('./pages/DaftarPage'));
const BerandaPage      = lazy(() => import('./pages/BerandaPage'));
const VideoPage        = lazy(() => import('./pages/VideoPage'));
const IpoPage          = lazy(() => import('./pages/IpoPage'));
const DekomposisiPage  = lazy(() => import('./pages/DekomposisiPage'));
const ParsonsPage      = lazy(() => import('./pages/ParsonsPage'));
const LabPage          = lazy(() => import('./pages/LabPage'));
const TestPage         = lazy(() => import('./pages/TestPage'));
const PilihKelompokPage = lazy(() => import('./pages/PilihKelompokPage'));
const GuruPage         = lazy(() => import('./pages/GuruPage'));
const GuruKelasPage    = lazy(() => import('./pages/guru/GuruKelasPage'));
const GuruKelompokPage = lazy(() => import('./pages/guru/GuruKelompokPage'));
const GuruKemajuanPage = lazy(() => import('./pages/guru/GuruKemajuanPage'));
const GuruCtPage       = lazy(() => import('./pages/guru/GuruCtPage'));
const GuruEksporPage        = lazy(() => import('./pages/guru/GuruEksporPage'));
const GuruMateriPreviewPage = lazy(() => import('./pages/guru/GuruMateriPreviewPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-32 text-[#464555] text-sm">
      Memuat halaman…
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user);
  if (!user) return <Navigate to="/masuk" replace />;
  return <>{children}</>;
}

function RoleRoute({
  allow,
  redirectTo,
  children,
}: {
  allow: 'siswa' | 'guru';
  redirectTo: string;
  children: React.ReactNode;
}) {
  const user = useAppStore((s) => s.user);
  if (!user) return <Navigate to="/masuk" replace />;
  if (user.peran !== allow) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}

export default function App() {
  const { setDemoMode } = useAppStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === '1') setDemoMode(true);
  }, [setDemoMode]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/masuk"  element={<LoginPage />} />
          <Route path="/daftar" element={<DaftarPage />} />

          {/* Protected routes — butuh login */}
          <Route
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <AppShell />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          >
            {/* Rute khusus siswa — guru dialihkan ke dasbor guru */}
            <Route
              path="/pilih-kelompok"
              element={
                <RoleRoute allow="siswa" redirectTo="/guru">
                  <PilihKelompokPage />
                </RoleRoute>
              }
            />
            <Route
              path="/beranda"
              element={
                <RoleRoute allow="siswa" redirectTo="/guru">
                  <BerandaPage />
                </RoleRoute>
              }
            />
            <Route
              path="/materi/:id/video"
              element={
                <RoleRoute allow="siswa" redirectTo="/guru/materi">
                  <VideoPage />
                </RoleRoute>
              }
            />
            <Route
              path="/materi/:id/ipo"
              element={
                <RoleRoute allow="siswa" redirectTo="/guru/materi">
                  <IpoPage />
                </RoleRoute>
              }
            />
            <Route
              path="/materi/:id/dekomposisi"
              element={
                <RoleRoute allow="siswa" redirectTo="/guru/materi">
                  <DekomposisiPage />
                </RoleRoute>
              }
            />
            <Route
              path="/materi/:id/parsons"
              element={
                <RoleRoute allow="siswa" redirectTo="/guru/materi">
                  <ParsonsPage />
                </RoleRoute>
              }
            />
            <Route
              path="/materi/:id/lab"
              element={
                <RoleRoute allow="siswa" redirectTo="/guru/materi">
                  <LabPage />
                </RoleRoute>
              }
            />

            {/* Pretest & Posttest — khusus siswa */}
            <Route
              path="/tes/awal"
              element={
                <RoleRoute allow="siswa" redirectTo="/guru/materi">
                  <TestPage />
                </RoleRoute>
              }
            />
            <Route
              path="/tes/akhir"
              element={
                <RoleRoute allow="siswa" redirectTo="/guru/materi">
                  <TestPage />
                </RoleRoute>
              }
            />

            {/* Guru routes */}
            <Route
              path="/guru"
              element={
                <RoleRoute allow="guru" redirectTo="/beranda">
                  <GuruPage />
                </RoleRoute>
              }
            />
            <Route
              path="/guru/kelas"
              element={
                <RoleRoute allow="guru" redirectTo="/beranda">
                  <GuruKelasPage />
                </RoleRoute>
              }
            />
            <Route
              path="/guru/kelompok"
              element={
                <RoleRoute allow="guru" redirectTo="/beranda">
                  <GuruKelompokPage />
                </RoleRoute>
              }
            />
            <Route
              path="/guru/kemajuan"
              element={
                <RoleRoute allow="guru" redirectTo="/beranda">
                  <GuruKemajuanPage />
                </RoleRoute>
              }
            />
            <Route
              path="/guru/ct"
              element={
                <RoleRoute allow="guru" redirectTo="/beranda">
                  <GuruCtPage />
                </RoleRoute>
              }
            />
            <Route
              path="/guru/ekspor"
              element={
                <RoleRoute allow="guru" redirectTo="/beranda">
                  <GuruEksporPage />
                </RoleRoute>
              }
            />
            <Route
              path="/guru/materi"
              element={
                <RoleRoute allow="guru" redirectTo="/beranda">
                  <GuruMateriPreviewPage />
                </RoleRoute>
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/masuk" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
