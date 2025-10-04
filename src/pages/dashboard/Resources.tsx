import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Resource {
  id: string;
  name: string;
  type: string;
  integration: string;
  url: string | null;
  groups: string[];
  status?: string;
  last_synced_at?: string;
}

interface Integration {
  id: string;
  name: string;
  type: string;
  status: string;
}

export default function Resources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    integration_id: "",
    url: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!member) return;
      setOrganizationId(member.organization_id);

      // Load integrations
      const { data: integrationsData } = await supabase
        .from('integrations')
        .select('*')
        .eq('organization_id', member.organization_id)
        .eq('status', 'connected');

      setIntegrations(integrationsData || []);

      const { data: resourcesData, error } = await supabase
        .from('resources')
        .select('*')
        .eq('organization_id', member.organization_id);

      if (error) throw error;

      // Get resource permissions with group names
      const { data: permissions } = await supabase
        .from('resource_permissions')
        .select('resource_id, group_id, groups(name)')
        .in('resource_id', resourcesData?.map(r => r.id) || []);

      const resourcesWithGroups: Resource[] = (resourcesData || []).map(resource => ({
        ...resource,
        groups: permissions
          ?.filter(p => p.resource_id === resource.id)
          .map(p => (p.groups as any)?.name)
          .filter(Boolean) || []
      }));

      setResources(resourcesWithGroups);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Помилка завантаження даних");
    } finally {
      setLoading(false);
    }
  };

  const getResourceTypes = (integrationType: string): { value: string; label: string }[] => {
    const types: Record<string, { value: string; label: string }[]> = {
      jira: [
        { value: 'project', label: 'Проєкт' },
        { value: 'board', label: 'Дошка' },
      ],
      confluence: [
        { value: 'space', label: 'Простір' },
        { value: 'page', label: 'Сторінка' },
      ],
      notion: [
        { value: 'workspace', label: 'Робочий простір' },
        { value: 'database', label: 'База даних' },
      ],
      gdrive: [
        { value: 'folder', label: 'Папка' },
        { value: 'file', label: 'Файл' },
      ],
    };
    return types[integrationType.toLowerCase()] || [];
  };

  const handleCreateResource = async () => {
    if (!organizationId || !formData.integration_id) return;
    
    try {
      const selectedIntegration = integrations.find(i => i.id === formData.integration_id);
      if (!selectedIntegration) return;

      const { error } = await supabase
        .from('resources')
        .insert({
          organization_id: organizationId,
          integration_id: formData.integration_id,
          name: formData.name,
          type: formData.type,
          integration: selectedIntegration.name,
          url: formData.url,
        });

      if (error) throw error;

      toast.success("Ресурс створено");
      setIsDialogOpen(false);
      setFormData({ name: "", type: "", integration_id: "", url: "" });
      loadData();
    } catch (error) {
      console.error('Error creating resource:', error);
      toast.error("Помилка створення ресурсу");
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', resourceId);

      if (error) throw error;

      toast.success("Ресурс видалено");
      loadData();
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast.error("Помилка видалення ресурсу");
    }
  };

  const selectedIntegration = integrations.find(i => i.id === formData.integration_id);
  const availableResourceTypes = selectedIntegration ? getResourceTypes(selectedIntegration.type) : [];

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || resource.integration.toLowerCase() === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      jira_project: { label: "Jira Project", variant: "default" },
      confluence_space: { label: "Confluence", variant: "secondary" },
      atlassian_site: { label: "Atlassian Site", variant: "outline" },
      notionSpace: { label: "Notion", variant: "outline" },
      gdriveFolder: { label: "Google Drive", variant: "default" },
    };
    const badge = badges[type] || { label: type, variant: "outline" as const };
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  const getStatusBadge = (status?: string) => {
    if (!status || status === 'active') {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Активний</Badge>;
    }
    if (status === 'removed') {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Видалено</Badge>;
    }
    return <Badge variant="secondary">Невідомий</Badge>;
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="mb-2">Ресурси</h1>
          <p className="text-muted-foreground">
            Керуйте та переглядайте всі інтегровані ресурси
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Додати ресурс
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Додати новий ресурс</DialogTitle>
              <DialogDescription>
                {integrations.length === 0 
                  ? "Спочатку підключіть інтеграцію, щоб додати ресурси"
                  : "Виберіть інтеграцію та тип ресурсу"}
              </DialogDescription>
            </DialogHeader>
            {integrations.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Підключених інтеграцій не знайдено
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="integration">Інтеграція</Label>
                  <Select 
                    value={formData.integration_id} 
                    onValueChange={(value) => setFormData({ ...formData, integration_id: value, type: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Виберіть інтеграцію" />
                    </SelectTrigger>
                    <SelectContent>
                      {integrations.map((integration) => (
                        <SelectItem key={integration.id} value={integration.id}>
                          {integration.name} ({integration.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.integration_id && (
                  <>
                    <div>
                      <Label htmlFor="type">Тип ресурсу</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Виберіть тип" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableResourceTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="name">Назва</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Назва ресурсу"
                      />
                    </div>
                    <div>
                      <Label htmlFor="url">URL (необов'язково)</Label>
                      <Input
                        id="url"
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                  </>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Скасувати
              </Button>
              <Button 
                onClick={handleCreateResource} 
                disabled={!formData.name || !formData.type || !formData.integration_id || integrations.length === 0}
              >
                Додати
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Пошук ресурсів..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Фільтр за типом" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всі типи</SelectItem>
                <SelectItem value="jira">Jira</SelectItem>
                <SelectItem value="confluence">Confluence</SelectItem>
                <SelectItem value="notion">Notion</SelectItem>
                <SelectItem value="google drive">Google Drive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Завантаження...
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Ресурсів не знайдено
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Назва</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Інтеграція</TableHead>
                  <TableHead>Групи</TableHead>
                  <TableHead className="text-right">Дії</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResources.map((resource) => (
                  <TableRow key={resource.id}>
                    <TableCell className="font-medium">{resource.name}</TableCell>
                    <TableCell>{getTypeBadge(resource.type)}</TableCell>
                    <TableCell>{getStatusBadge(resource.status)}</TableCell>
                    <TableCell>{resource.integration}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {resource.groups.map((group, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {group}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        {resource.url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={resource.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteResource(resource.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
    </div>
  );
}
