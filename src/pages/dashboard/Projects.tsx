import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  created_at: string;
  organization_id: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
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

      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', member.organization_id)
        .order('created_at', { ascending: false });

      if (projectsData) {
        setProjects(projectsData);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error("Помилка завантаження проектів");
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleCreateProject = async () => {
    if (!organizationId || !formData.name.trim()) {
      toast.error("Назва проекту обов'язкова");
      return;
    }

    try {
      const slug = generateSlug(formData.name);

      const { error } = await supabase
        .from('projects')
        .insert({
          organization_id: organizationId,
          name: formData.name.trim(),
          slug: slug,
          description: formData.description.trim() || null,
          status: 'active',
        });

      if (error) throw error;

      toast.success("Проект створено");
      setIsCreateDialogOpen(false);
      setFormData({ name: "", description: "" });
      loadProjects();
    } catch (error: any) {
      console.error('Error creating project:', error);
      if (error.code === '23505') {
        toast.error("Проект з такою назвою вже існує");
      } else {
        toast.error("Помилка створення проекту");
      }
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !formData.name.trim()) {
      toast.error("Назва проекту обов'язкова");
      return;
    }

    try {
      const slug = generateSlug(formData.name);

      const { error } = await supabase
        .from('projects')
        .update({
          name: formData.name.trim(),
          slug: slug,
          description: formData.description.trim() || null,
        })
        .eq('id', editingProject.id);

      if (error) throw error;

      toast.success("Проект оновлено");
      setIsEditDialogOpen(false);
      setEditingProject(null);
      setFormData({ name: "", description: "" });
      loadProjects();
    } catch (error: any) {
      console.error('Error updating project:', error);
      if (error.code === '23505') {
        toast.error("Проект з такою назвою вже існує");
      } else {
        toast.error("Помилка оновлення проекту");
      }
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Ви впевнені, що хочете видалити цей проект?")) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      toast.success("Проект видалено");
      loadProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error("Помилка видалення проекту");
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        Активний
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
        Архівний
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Проекти</h1>
          <p className="text-muted-foreground">Керування проектами організації</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Додати проект
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Пошук проектів..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">Завантаження...</div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "Проектів не знайдено" : "Немає проектів. Створіть перший проект!"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Назва</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Опис</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Створено</TableHead>
                    <TableHead className="text-right">Дії</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{project.slug}</code>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {project.description || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>{getStatusBadge(project.status)}</TableCell>
                      <TableCell>{new Date(project.created_at).toLocaleDateString('uk-UA')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditProject(project)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteProject(project.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Створити проект</DialogTitle>
            <DialogDescription>
              Додайте новий проект до вашої організації
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Назва проекту *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Введіть назву проекту"
              />
              {formData.name && (
                <p className="text-xs text-muted-foreground mt-1">
                  Slug: <code>{generateSlug(formData.name)}</code>
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="description">Опис</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Опишіть проект"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleCreateProject}>Створити</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редагувати проект</DialogTitle>
            <DialogDescription>
              Оновіть інформацію про проект
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Назва проекту *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Введіть назву проекту"
              />
              {formData.name && (
                <p className="text-xs text-muted-foreground mt-1">
                  Slug: <code>{generateSlug(formData.name)}</code>
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-description">Опис</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Опишіть проект"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleUpdateProject}>Зберегти</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
