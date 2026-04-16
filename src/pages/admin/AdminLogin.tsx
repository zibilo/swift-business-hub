import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { BrandLogo } from '@/components/BrandLogo';
import { BrandIcon } from '@/components/BrandIcons';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { adminLogin } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await adminLogin(email, password);
      if (success) {
        toast({
          title: "Connexion réussie",
          description: "Bienvenue dans l'interface d'administration MUCODEC",
        });
        navigate('/admin/dashboard');
      } else {
        toast({
          variant: "destructive",
          title: "Erreur d'authentification",
          description: "Identifiants incorrects",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la connexion",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md border-t-4 border-t-[#004080] shadow-xl">
        <CardHeader className="space-y-4 flex flex-col items-center">
          <BrandLogo className="h-12 w-auto mb-2" />
          <div className="text-center">
            <CardTitle className="text-2xl font-bold text-[#004080] flex items-center justify-center gap-2">
              <BrandIcon name="security" className="h-6 w-6" />
              Espace Admin
            </CardTitle>
            <CardDescription>
              Connectez-vous pour gérer la plateforme
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <BrandIcon name="email" size={16} />
                Email
              </label>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="focus-visible:ring-[#004080]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <BrandIcon name="lock" size={16} />
                Mot de passe
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="focus-visible:ring-[#004080]"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#004080] hover:bg-[#003060] transition-colors"
              disabled={isLoading}
            >
              {isLoading ? (
                <BrandIcon name="info" className="animate-spin mr-2" />
              ) : (
                <BrandIcon name="security" className="mr-2" />
              )}
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-700 font-medium mb-1 flex items-center gap-1">
              <BrandIcon name="info" size={12} />
              Accès démo :
            </p>
            <p className="text-[10px] text-blue-600">
              Email : admin@example.com<br />
              Pass : admin123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
