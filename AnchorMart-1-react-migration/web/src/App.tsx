import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ModalProvider } from './context/ModalContext'
import { DrawerProvider } from './context/DrawerContext'
import { MenuProvider } from './context/MenuContext'
import { AppShell } from './components/layout/AppShell'
import { Login } from './pages/Login'
import { APP_ROUTES } from './routes'

function Shell() {
  const { authed } = useAuth()
  if (!authed) return <Login />
  return (
    <Routes>
      <Route element={<AppShell />}>
        {APP_ROUTES.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <ToastProvider>
          <ModalProvider>
            <DrawerProvider>
              <MenuProvider>
                <Shell />
              </MenuProvider>
            </DrawerProvider>
          </ModalProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
