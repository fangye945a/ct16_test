import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Eye, EyeOff, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { login } from '@/api/auth';
import { clearSessionToken } from '@/api/client';
import { BrandLogo } from '@/components/BrandLogo';
import { CT16_APPEARANCE_EVENT, getCt16Appearance } from '@/lib/appearance';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState(() => localStorage.getItem('ct16:rememberedUser') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem('ct16:rememberedUser')));
  const [loading, setLoading] = useState(false);
  const [appearance, setAppearance] = useState(getCt16Appearance);

  useEffect(() => {
    const syncAppearance = () => setAppearance(getCt16Appearance());
    window.addEventListener(CT16_APPEARANCE_EVENT, syncAppearance);
    return () => window.removeEventListener(CT16_APPEARANCE_EVENT, syncAppearance);
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('请输入用户名和密码');
      return;
    }

    setLoading(true);

    try {
      await login(username.trim(), password, rememberMe);
      if (rememberMe) {
        localStorage.setItem('ct16:rememberedUser', username.trim());
      } else {
        localStorage.removeItem('ct16:rememberedUser');
      }
      // 清除旧版 localStorage 凭据（迁移清理）
      localStorage.removeItem('zaihong:credentials');
      localStorage.removeItem('zaihong:isAccountSetup');
      localStorage.removeItem('zaihong:isLoggedIn');
      toast.success('登录成功');
      navigate('/');
    } catch (err: unknown) {
      clearSessionToken();
      const msg = err instanceof Error ? err.message : '登录失败';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo + 标题 */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center size-16 rounded-2xl mb-4 ${appearance.logoType === 'custom' ? 'bg-transparent' : 'bg-primary/10'}`}>
            <BrandLogo logoType={appearance.logoType} logoImage={appearance.logoImage} className="size-8 text-primary" />
          </div>
          <h1 className="text-xl font-black text-foreground">{appearance.systemName}</h1>
          <p className="text-sm text-muted-foreground mt-1">CT16 · OpenHarmony</p>
        </div>

        <Card className="border-border/40 bg-card/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              管理员登录
            </CardTitle>
            <CardDescription>请输入管理员账号和密码</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm">用户名</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  className="h-10"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">密码</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="h-10 pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(v) => setRememberMe(v === true)}
                  className="border-2 border-slate-400 bg-background shadow-sm hover:border-primary dark:border-slate-500"
                />
                <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                  记住我
                </Label>
              </div>

              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    验证中...
                  </span>
                ) : (
                  <>
                    <LogIn className="size-4 mr-2" />
                    登录
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
