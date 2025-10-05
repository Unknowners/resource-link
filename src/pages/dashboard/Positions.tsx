import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, FileText, Upload } from "lucide-react";

interface Position {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

interface Material {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

interface PositionEdge {
  parent_id: string;
  child_id: string;
}

export default function Positions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [allPositions, setAllPositions] = useState<Position[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [positionEdges, setPositionEdges] = useState<PositionEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string>("");
  const [isPositionDialogOpen, setIsPositionDialogOpen] = useState(false);
  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [selectedPositionMaterials, setSelectedPositionMaterials] = useState<Material[]>([]);
  const [selectedPositionChildren, setSelectedPositionChildren] = useState<Position[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [positionForm, setPositionForm] = useState({
    name: "",
    slug: "",
    description: "",
    parentId: "",
  });

  const [materialForm, setMaterialForm] = useState({
    title: "",
    description: "",
    positionId: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) return;
      setOrganizationId(profile.organization_id);

      await Promise.all([
        loadPositions(profile.organization_id),
        loadMaterials(profile.organization_id),
        loadPositionEdges(profile.organization_id)
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Помилка завантаження даних");
    } finally {
      setLoading(false);
    }
  };

  const loadPositions = async (orgId: string) => {
    const { data, error } = await supabase
      .from("positions")
      .select("*")
      .eq("organization_id", orgId)
      .order("name");

    if (error) throw error;
    setPositions(data || []);
    setAllPositions(data || []);
  };

  const loadMaterials = async (orgId: string) => {
    const { data, error } = await supabase
      .from("onboarding_materials")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setMaterials(data || []);
  };

  const loadPositionEdges = async (orgId: string) => {
    const { data, error } = await supabase
      .from("position_edges")
      .select("parent_id, child_id")
      .eq("organization_id", orgId);

    if (error) throw error;
    setPositionEdges(data || []);
  };

  const handlePositionClick = async (position: Position) => {
    setSelectedPosition(position);
    
    // Завантажити матеріали для цієї посади та її предків через ієрархію
    const { data: positionMaterialLinks, error: materialsError } = await supabase
      .from("position_materials")
      .select(`
        material_id,
        onboarding_materials (
          id,
          title,
          description,
          file_name,
          file_path,
          mime_type,
          size_bytes,
          created_at
        )
      `)
      .eq("organization_id", organizationId)
      .in("position_id", await getPositionAncestors(position.id));

    if (!materialsError && positionMaterialLinks) {
      const mats = positionMaterialLinks
        .map(link => link.onboarding_materials)
        .filter(Boolean) as Material[];
      setSelectedPositionMaterials(mats);
    }

    // Завантажити підпорядковані посади
    const childIds = positionEdges
      .filter(edge => edge.parent_id === position.id)
      .map(edge => edge.child_id);
    
    const children = allPositions.filter(pos => childIds.includes(pos.id));
    setSelectedPositionChildren(children);
  };

  const getPositionAncestors = async (positionId: string): Promise<string[]> => {
    // Отримати всіх предків через position_hierarchy
    const { data, error } = await supabase
      .from("position_hierarchy")
      .select("ancestor_id")
      .eq("organization_id", organizationId)
      .eq("descendant_id", positionId);

    if (error || !data) return [positionId];
    
    return [...new Set([positionId, ...data.map(h => h.ancestor_id)])];
  };

  const handleCreatePosition = () => {
    setEditingPosition(null);
    setPositionForm({ name: "", slug: "", description: "", parentId: "" });
    setIsPositionDialogOpen(true);
  };

  const handleEditPosition = (position: Position) => {
    setEditingPosition(position);
    setPositionForm({
      name: position.name,
      slug: position.slug,
      description: position.description || "",
      parentId: "",
    });
    setIsPositionDialogOpen(true);
  };

  const handleSavePosition = async () => {
    if (!positionForm.name || !positionForm.slug) {
      toast.error("Заповніть всі обов'язкові поля");
      return;
    }

    try {
      if (editingPosition) {
        const { error } = await supabase
          .from("positions")
          .update({
            name: positionForm.name,
            slug: positionForm.slug,
            description: positionForm.description,
          })
          .eq("id", editingPosition.id);

        if (error) throw error;
        toast.success("Посаду оновлено");
      } else {
        const { data: newPosition, error } = await supabase
          .from("positions")
          .insert({
            organization_id: organizationId,
            name: positionForm.name,
            slug: positionForm.slug,
            description: positionForm.description,
          })
          .select()
          .single();

        if (error) throw error;

        if (positionForm.parentId) {
          const { error: edgeError } = await supabase
            .from("position_edges")
            .insert({
              organization_id: organizationId,
              parent_id: positionForm.parentId,
              child_id: newPosition.id,
            });

          if (edgeError) throw edgeError;
        }

        toast.success("Посаду створено");
      }

      setIsPositionDialogOpen(false);
      loadPositions(organizationId);
    } catch (error: any) {
      console.error("Error saving position:", error);
      toast.error(error.message || "Помилка збереження посади");
    }
  };

  const handleDeletePosition = async (id: string) => {
    if (!confirm("Видалити цю посаду?")) return;

    try {
      const { error } = await supabase.from("positions").delete().eq("id", id);
      if (error) throw error;
      toast.success("Посаду видалено");
      loadPositions(organizationId);
    } catch (error: any) {
      toast.error(error.message || "Помилка видалення");
    }
  };

  const handleUploadMaterial = async () => {
    if (!materialForm.title || !materialForm.positionId || !selectedFile) {
      toast.error("Заповніть всі поля та оберіть файл");
      return;
    }

    try {
      const filePath = `${organizationId}/${materialForm.positionId}/${Date.now()}_${selectedFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("onboarding")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: material, error: materialError } = await supabase
        .from("onboarding_materials")
        .insert({
          organization_id: organizationId,
          title: materialForm.title,
          description: materialForm.description,
          file_path: filePath,
          file_name: selectedFile.name,
          mime_type: selectedFile.type,
          size_bytes: selectedFile.size,
        })
        .select()
        .single();

      if (materialError) throw materialError;

      const { error: linkError } = await supabase
        .from("position_materials")
        .insert({
          organization_id: organizationId,
          position_id: materialForm.positionId,
          material_id: material.id,
        });

      if (linkError) throw linkError;

      toast.success("Матеріал завантажено");
      setIsMaterialDialogOpen(false);
      setMaterialForm({ title: "", description: "", positionId: "" });
      setSelectedFile(null);
      loadMaterials(organizationId);
    } catch (error: any) {
      console.error("Error uploading material:", error);
      toast.error(error.message || "Помилка завантаження");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Завантаження...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Посади</h1>
          <p className="text-muted-foreground">Керуйте посадами та матеріалами для онбордингу</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isMaterialDialogOpen} onOpenChange={setIsMaterialDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Додати матеріал
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Завантажити матеріал</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Назва матеріалу</Label>
                  <Input
                    value={materialForm.title}
                    onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                    placeholder="Наприклад: Вступний гайд"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Опис (опційно)</Label>
                  <Textarea
                    value={materialForm.description}
                    onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                    placeholder="Короткий опис матеріалу"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Посада</Label>
                  <Select value={materialForm.positionId} onValueChange={(value) => setMaterialForm({ ...materialForm, positionId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть посаду" />
                    </SelectTrigger>
                    <SelectContent>
                      {allPositions.map((pos) => (
                        <SelectItem key={pos.id} value={pos.id}>
                          {pos.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Файл</Label>
                  <Input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUploadMaterial}>Завантажити</Button>
                  <Button variant="outline" onClick={() => setIsMaterialDialogOpen(false)}>Скасувати</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={handleCreatePosition}>
            <Plus className="mr-2 h-4 w-4" />
            Створити посаду
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Посади</CardTitle>
            <CardDescription>Оберіть посаду для перегляду деталей</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {positions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Немає посад</p>
              ) : (
                positions.map((position) => (
                  <div 
                    key={position.id} 
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                      selectedPosition?.id === position.id ? 'bg-accent border-primary' : ''
                    }`}
                    onClick={() => handlePositionClick(position)}
                  >
                    <div>
                      <p className="font-medium">{position.name}</p>
                      <p className="text-sm text-muted-foreground">{position.slug}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={(e) => {
                        e.stopPropagation();
                        handleEditPosition(position);
                      }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePosition(position.id);
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {selectedPosition ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Матеріали для {selectedPosition.name}</CardTitle>
                <CardDescription>Матеріали, які успадковуються через ієрархію</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedPositionMaterials.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Немає матеріалів</p>
                  ) : (
                    selectedPositionMaterials.map((material) => (
                      <div key={material.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{material.title}</p>
                          {material.description && (
                            <p className="text-sm text-muted-foreground">{material.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground truncate">{material.file_name}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Підпорядковані посади</CardTitle>
                <CardDescription>Посади, що звітують до {selectedPosition.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedPositionChildren.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Немає підпорядкованих</p>
                  ) : (
                    selectedPositionChildren.map((child) => (
                      <div 
                        key={child.id} 
                        className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => handlePositionClick(child)}
                      >
                        <p className="font-medium">{child.name}</p>
                        <p className="text-sm text-muted-foreground">{child.description || child.slug}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="lg:col-span-2">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center py-12">
                Оберіть посаду зліва, щоб побачити її матеріали та підпорядковані посади
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isPositionDialogOpen} onOpenChange={setIsPositionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPosition ? "Редагувати посаду" : "Створити посаду"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Назва посади</Label>
              <Input
                value={positionForm.name}
                onChange={(e) => setPositionForm({ ...positionForm, name: e.target.value })}
                placeholder="Наприклад: Розробник"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL-ідентифікатор)</Label>
              <Input
                value={positionForm.slug}
                onChange={(e) => setPositionForm({ ...positionForm, slug: e.target.value.toLowerCase() })}
                placeholder="developer"
              />
            </div>
            <div className="space-y-2">
              <Label>Опис (опційно)</Label>
              <Textarea
                value={positionForm.description}
                onChange={(e) => setPositionForm({ ...positionForm, description: e.target.value })}
                placeholder="Короткий опис посади"
              />
            </div>
            {!editingPosition && (
              <div className="space-y-2">
                <Label>Батьківська посада (опційно)</Label>
                <Select value={positionForm.parentId} onValueChange={(value) => setPositionForm({ ...positionForm, parentId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Без батьківської посади" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPositions.map((pos) => (
                      <SelectItem key={pos.id} value={pos.id}>
                        {pos.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleSavePosition}>Зберегти</Button>
              <Button variant="outline" onClick={() => setIsPositionDialogOpen(false)}>Скасувати</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
