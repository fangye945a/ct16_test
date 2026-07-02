import { Navigate, useLocation } from 'react-router-dom';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAccountSetup = localStorage.getItem('zaihong:isAccountSetup') === 'true';
  const isLoggedIn = localStorage.getItem('zaihong:isLoggedIn') === 'true';

  // 未设置账号 → 跳转设置密码页
  if (!isAccountSetup) {
    return <Navigate to="/setup" replace />;
  }

  // 已设置账号但未登录 → 跳转登录页
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
