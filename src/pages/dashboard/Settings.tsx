import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Save, Building2, Globe, CreditCard, BookOpen, Users, Shield, Database, Plug, FileText, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function DashboardSettings() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgDomain, setOrgDomain] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
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

      const { data: org } = await supabase
        .from('organizations')
        .select('name, domain, slug')
        .eq('id', member.organization_id)
        .single();

      if (org) {
        setOrgName(org.name || "");
        setOrgDomain(org.domain || "");
        setOrgSlug(org.slug || "");
      }
    } catch (error) {
      console.error('Error loading organization:', error);
    }
  };

  const transliterateToSlug = (text: string): string => {
    const map: { [key: string]: string } = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'є': 'e',
      'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'i', 'й': 'y',
      'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p',
      'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h',
      'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'yu',
      'я': 'ya', 'ы': 'y', 'э': 'e', 'ё': 'yo', 'ъ': ''
    };

    return text
      .toLowerCase()
      .split('')
      .map(char => map[char] || char)
      .join('')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSaveOrganization = async () => {
    if (!organizationId) return;

    if (!orgName.trim()) {
      toast.error("Введіть назву організації");
      return;
    }

    if (!orgSlug.trim()) {
      toast.error("Введіть slug організації");
      return;
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(orgSlug)) {
      toast.error("Slug може містити тільки малі латинські літери, цифри та дефіси");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: orgName,
          domain: orgDomain,
          slug: orgSlug
        })
        .eq('id', organizationId);

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast.error("Цей slug вже використовується іншою організацією");
        } else {
          throw error;
        }
      } else {
        toast.success("Налаштування організації оновлено");
        loadOrganization();
      }
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toast.error(error.message || "Помилка оновлення організації");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display">Налаштування організації</h1>
        <p className="text-muted-foreground text-lg mt-2">
          Керуйте параметрами вашої організації
        </p>
      </div>

      {/* Organization Profile */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Профіль організації</CardTitle>
              <CardDescription>Загальна інформація про компанію</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Назва організації</Label>
            <Input 
              id="orgName" 
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Назва вашої організації"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="domain">Основний домен</Label>
            <Input 
              id="domain" 
              value={orgDomain}
              onChange={(e) => setOrgDomain(e.target.value)}
              placeholder="example.com"
              type="text" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">
              Slug організації
              <span className="text-xs text-muted-foreground ml-2">
                (використовується в URL)
              </span>
            </Label>
            <div className="flex gap-2">
              <Input 
                id="slug" 
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value.toLowerCase())}
                placeholder="my-organization"
                pattern="[a-z0-9-]+"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setOrgSlug(transliterateToSlug(orgName))}
                disabled={!orgName}
              >
                Згенерувати
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Тільки малі латинські літери, цифри та дефіси
            </p>
          </div>
          <Button onClick={handleSaveOrganization} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Збереження..." : "Зберегти зміни"}
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}
