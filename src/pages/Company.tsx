import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Mail, Phone, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Company = () => {
  const { companyUser } = useAuth();

  const { data: company } = useQuery({
    queryKey: ['company', companyUser?.company_id],
    queryFn: async () => {
      if (!companyUser?.company_id) return null;
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyUser.company_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!companyUser?.company_id,
  });

  const { data: members } = useQuery({
    queryKey: ['company-members', companyUser?.company_id],
    queryFn: async () => {
      if (!companyUser?.company_id) return [];
      
      const { data, error } = await supabase
        .from('company_users')
        .select(`
          id,
          role,
          user:profiles!company_users_user_id_fkey(full_name, email)
        `)
        .eq('company_id', companyUser.company_id);

      if (error) throw error;
      return data;
    },
    enabled: !!companyUser?.company_id,
  });

  if (!company) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mon Entreprise</h1>
        <p className="text-muted-foreground">
          Informations de votre entreprise
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Company info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informations générales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Nom</p>
              <p className="font-medium">{company.name}</p>
            </div>
            
            {company.siret && (
              <div>
                <p className="text-sm text-muted-foreground">SIRET</p>
                <p className="font-medium">{company.siret}</p>
              </div>
            )}

            {(company.address || company.city || company.postal_code) && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Adresse
                </p>
                <p className="font-medium">
                  {company.address && <span>{company.address}<br /></span>}
                  {company.postal_code} {company.city}
                  {company.country && `, ${company.country}`}
                </p>
              </div>
            )}

            {company.contact_email && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email de contact
                </p>
                <p className="font-medium">{company.contact_email}</p>
              </div>
            )}

            {company.contact_phone && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Téléphone
                </p>
                <p className="font-medium">{company.contact_phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Membres
            </CardTitle>
            <CardDescription>
              Utilisateurs associés à cette entreprise
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">
                      {(member.user as { full_name?: string })?.full_name || 'Utilisateur'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(member.user as { email?: string })?.email}
                    </p>
                  </div>
                  <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                    {member.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                  </Badge>
                </div>
              ))}

              {(!members || members.length === 0) && (
                <p className="text-muted-foreground text-center py-4">
                  Aucun membre trouvé
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Company;
