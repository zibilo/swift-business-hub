
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck, Mail, Lock } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { adminLogin } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const success = await adminLogin(email, password);
    if (success) {
      navigate('/admin');
    } else {
      setError('Identifiants administrateur incorrects');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-white/10 rounded-xl mb-4 border border-white/20">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Administration Plateforme
          </h1>
          <p className="text-sm text-slate-400 mt-1">Espace de gestion restreint</p>
        </div>

        <Card className="border-none shadow-2xl bg-white">
          <CardHeader>
            <CardTitle>Connexion Admin</CardTitle>
            <CardDescription>Entrez vos identifiants pour accéder au panel</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-10"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authentification...
                  </>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
        <p className="text-center text-[10px] text-slate-500 mt-8 uppercase tracking-widest">
          Système de surveillance active - Accès tracé
        </p>
      </div>
    </div>
  );
}
