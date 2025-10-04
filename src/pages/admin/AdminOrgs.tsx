import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Ban, CheckCircle, BarChart3, Building2, Users as UsersIcon, Link2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Organization {
  id: string;
  name: string;
  domain: string | null;
  plan: string;
  status: string;
  created_at: string;
  member_count?: number;
  integration_count?: number;
  resource_count?: number;
}

interface Analytics {
  totalOrgs: number;
  activeOrgs: number;
  blockedOrgs: number;
  totalUsers: number;
  totalIntegrations: number;
  totalResources: number;
}

export default function AdminOrgs() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalOrgs: 0,
    activeOrgs: 0,
    blockedOrgs: 0,
    totalUsers: 0,
    totalIntegrations: 0,
    totalResources: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      
      const { data: organizations, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // Get member counts
      const { data: memberCounts, error: membersError } = await supabase
        .from('organization_members')
        .select('organization_id');

      if (membersError) throw membersError;

      // Get integration counts
      const { data: integrationCounts, error: intError } = await supabase
        .from('integrations')
        .select('organization_id');

      if (intError) throw intError;

      // Get resource counts
      const { data: resourceCounts, error: resError } = await supabase
        .from('resources')
        .select('organization_id');

      if (resError) throw resError;

      const orgsWithCounts = (organizations || []).map(org => ({
        ...org,
        member_count: memberCounts?.filter(m => m.organization_id === org.id).length || 0,
        integration_count: integrationCounts?.filter(i => i.organization_id === org.id).length || 0,
        resource_count: resourceCounts?.filter(r => r.organization_id === org.id).length || 0,
      }));

      setOrgs(orgsWithCounts);

      // Calculate analytics
      const activeOrgs = orgsWithCounts.filter(o => o.status === 'active').length;
      const blockedOrgs = orgsWithCounts.filter(o => o.status === 'suspended' || o.status === 'cancelled').length;
      const totalUsers = memberCounts?.length || 0;
      const totalIntegrations = integrationCounts?.length || 0;
      const totalResources = resourceCounts?.length || 0;

      setAnalytics({
        totalOrgs: orgsWithCounts.length,
        activeOrgs,
        blockedOrgs,
        totalUsers,
        totalIntegrations,
        totalResources,
      });
    } catch (error) {
      console.error('Error loading organizations:', error);
      toast.error("Помилка завантаження організацій");
    } finally {
      setLoading(false);
    }
  };

  const handleBlockOrg = async (org: Organization) => {
    setSelectedOrg(org);
    setBlockDialogOpen(true);
  };

  const confirmBlockOrg = async () => {
    if (!selectedOrg) return;

    try {
      const newStatus = selectedOrg.status === 'active' ? 'suspended' : 'active';
      
      const { error } = await supabase
        .from('organizations')
        .update({ status: newStatus })
        .eq('id', selectedOrg.id);

      if (error) throw error;

      toast.success(
        newStatus === 'suspended' 
          ? `Організацію "${selectedOrg.name}" заблоковано` 
          : `Організацію "${selectedOrg.name}" розблоковано`
      );
      
      loadOrganizations();
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error("Помилка оновлення статусу організації");
    } finally {
      setBlockDialogOpen(false);
      setSelectedOrg(null);
    }
  };

  const filteredOrgs = orgs.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.domain?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="font-display">Суперадмін панель</h1>
        <p className="text-muted-foreground text-lg mt-2">
          Управління всіма організаціями та аналітика системи
        </p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Всього організацій
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.totalOrgs}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 bg-green-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Активні
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">{analytics.activeOrgs}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-200 bg-red-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
              <Ban className="h-4 w-4" />
              Заблоковані
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">{analytics.blockedOrgs}</div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UsersIcon className="h-4 w-4" />
              Користувачів
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.totalUsers}</div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Інтеграцій
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.totalIntegrations}</div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Ресурсів
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.totalResources}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Пошук організацій за назвою або доменом..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Завантаження...
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="mb-4">Організацій не знайдено</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Назва</TableHead>
                  <TableHead>Домен</TableHead>
                  <TableHead>План</TableHead>
                  <TableHead>Користувачів</TableHead>
                  <TableHead>Інтеграцій</TableHead>
                  <TableHead>Ресурсів</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата створення</TableHead>
                  <TableHead className="text-right">Дії</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell className="text-muted-foreground">{org.domain || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={org.plan === 'enterprise' ? 'default' : 'secondary'}>
                        {org.plan === 'starter' ? 'Starter' : 
                         org.plan === 'professional' ? 'Pro' : 'Enterprise'}
                      </Badge>
                    </TableCell>
                    <TableCell>{org.member_count}</TableCell>
                    <TableCell>{org.integration_count}</TableCell>
                    <TableCell>{org.resource_count}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          org.status === 'active' 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-red-50 text-red-700 border-red-200'
                        }
                      >
                        {org.status === 'active' ? 'Активна' : org.status === 'suspended' ? 'Заблокована' : 'Скасована'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(org.created_at).toLocaleDateString('uk-UA')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button 
                          variant={org.status === 'active' ? 'destructive' : 'default'} 
                          size="sm"
                          onClick={() => handleBlockOrg(org)}
                        >
                          {org.status === 'active' ? (
                            <>
                              <Ban className="mr-2 h-4 w-4" />
                              Заблокувати
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Розблокувати
                            </>
                          )}
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/admin/orgs/${org.id}`}>Деталі</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Block/Unblock Confirmation Dialog */}
      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedOrg?.status === 'active' ? 'Заблокувати організацію?' : 'Розблокувати організацію?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedOrg?.status === 'active' ? (
                <>
                  Ви впевнені, що хочете заблокувати організацію <strong>{selectedOrg?.name}</strong>?
                  <br /><br />
                  Всі користувачі цієї організації втратять доступ до системи.
                </>
              ) : (
                <>
                  Ви впевнені, що хочете розблокувати організацію <strong>{selectedOrg?.name}</strong>?
                  <br /><br />
                  Користувачі зможуть знову отримати доступ до системи.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBlockOrg}>
              {selectedOrg?.status === 'active' ? 'Заблокувати' : 'Розблокувати'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
