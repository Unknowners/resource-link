import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const InviteUserDialog = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [requiresOnboarding, setRequiresOnboarding] = useState(true);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Введіть коректну email адресу");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, organization_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.organization_id) {
        toast.error("Організація не знайдена");
        return;
      }

      const { data: organization } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", profile.organization_id)
        .maybeSingle();

      const inviterName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Колега';
      const organizationName = organization?.name || 'вашу організацію';

      const { data, error } = await supabase.functions.invoke("send-invitation", {
        body: {
          email,
          organizationName,
          inviterName,
        },
      });

      if (error) throw error;

      toast.success(`Запрошення надіслано на ${email}`);
      setEmail("");
      setOpen(false);
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast.error(error.message || "Помилка при відправці запрошення");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Запросити користувача
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Запросити нового користувача</DialogTitle>
          <DialogDescription>
            Введіть email адресу користувача. Ми надішлемо йому запрошення приєднатися до вашої організації.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email адреса</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="onboarding"
              checked={requiresOnboarding}
              onCheckedChange={(checked) => setRequiresOnboarding(checked as boolean)}
            />
            <Label htmlFor="onboarding" className="text-sm font-normal">
              Потребує онбордингу після реєстрації
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Скасувати
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Надсилаємо..." : "Надіслати запрошення"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
