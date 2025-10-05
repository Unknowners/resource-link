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

      // Завантажуємо налаштування онбордингу з організації
      const { data: org } = await supabase
        .from('organizations')
        .select('onboarding_video_url, onboarding_welcome_text')
        .eq('id', member.organization_id)
        .single();

      if (org) {
        setVideoUrl(org.onboarding_video_url || "");
        setWelcomeText(org.onboarding_welcome_text || 
          "Вітаємо, {first_name}!\n\nРаді бачити вас в нашій команді на посаді {position}.\n\nДля початку роботи перегляньте це відео:");
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
      
      // Зберігаємо налаштування в базу даних
      const { error } = await supabase
        .from('organizations')
        .update({
          onboarding_video_url: videoUrl,
          onboarding_welcome_text: welcomeText
        })
        .eq('id', organizationId);

      if (error) throw error;

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
