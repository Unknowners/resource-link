import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VideoIcon, Save } from "lucide-react";

export default function OnboardingSettings() {
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [welcomeText, setWelcomeText] = useState("");
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!member) return;
      setOrganizationId(member.organization_id);

      // Завантажуємо активний шаблон онбордингу
      const { data: template } = await supabase
        .from('onboarding_templates')
        .select('*')
        .eq('organization_id', member.organization_id)
        .eq('is_active', true)
        .single();

      if (template) {
        setTemplateId(template.id);
        setWelcomeText(template.script_template || 
          "Вітаємо, {first_name}!\n\nРаді бачити вас в нашій команді на посаді {position}.\n\nДля початку роботи перегляньте це відео:");
        // Якщо є поле для URL відео в шаблоні, можна його також завантажити
      } else {
        // Дефолтний текст якщо немає шаблону
        setWelcomeText("Вітаємо, {first_name}!\n\nРаді бачити вас в нашій команді на посаді {position}.\n\nДля початку роботи перегляньте це відео:");
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error("Помилка завантаження налаштувань");
    }
  };

  const handleSave = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (templateId) {
        // Оновлюємо існуючий шаблон
        const { error } = await supabase
          .from('onboarding_templates')
          .update({
            script_template: welcomeText,
            updated_at: new Date().toISOString()
          })
          .eq('id', templateId);

        if (error) throw error;
      } else {
        // Створюємо новий шаблон
        const { data: newTemplate, error } = await supabase
          .from('onboarding_templates')
          .insert({
            organization_id: organizationId,
            title: 'Вітальний шаблон',
            script_template: welcomeText,
            is_active: true,
            created_by: user.id
          })
          .select()
          .single();

        if (error) throw error;
        if (newTemplate) setTemplateId(newTemplate.id);
      }

      toast.success("Налаштування онбордингу збережено");
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error("Помилка збереження налаштувань");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="mb-2">Налаштування онбордингу</h1>
        <p className="text-muted-foreground">
          Налаштуйте вітальне повідомлення та відео для нових співробітників
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Вітальне повідомлення</CardTitle>
          <CardDescription>
            Використовуйте змінні: {"{first_name}"} - ім'я користувача, {"{position}"} - посада
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="welcome-text">Текст привітання</Label>
            <Textarea
              id="welcome-text"
              placeholder="Введіть текст привітання..."
              value={welcomeText}
              onChange={(e) => setWelcomeText(e.target.value)}
              rows={8}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Приклад: "Вітаємо, {"{first_name}"}! Раді бачити вас на посаді {"{position}"}."
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VideoIcon className="h-5 w-5" />
            Онбординг відео
          </CardTitle>
          <CardDescription>
            Додайте посилання на YouTube або Vimeo відео для нових співробітників
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="video-url">URL відео</Label>
            <Input
              id="video-url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Підтримуються посилання YouTube та Vimeo
            </p>
          </div>

          {videoUrl && (
            <div className="mt-4">
              <Label>Попередній перегляд</Label>
              <div className="mt-2 aspect-video bg-muted rounded-lg flex items-center justify-center">
                <VideoIcon className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Збереження..." : "Зберегти налаштування"}
        </Button>
      </div>
    </div>
  );
}
