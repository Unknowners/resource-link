import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  UserCog,
  Link2,
  FileText,
  Settings,
  LogOut,
  Sparkles,
  Menu,
  X,
  Shield,
  BookOpen,
} from "lucide-react";

const navigation = [
  { name: "Огляд", href: "/app", icon: LayoutDashboard },
  { name: "Ресурси", href: "/app/resources", icon: FolderOpen },
  { name: "Групи", href: "/app/groups", icon: Users },
  { name: "Команда", href: "/app/staff", icon: UserCog },
  { name: "Ролі", href: "/app/roles", icon: Shield },
  { name: "Інтеграції", href: "/app/integrations", icon: Link2 },
  { name: "Аудит-лог", href: "/app/audit", icon: FileText },
  { name: "Документація", href: "/app/docs", icon: BookOpen },
  { name: "Налаштування", href: "/app/settings", icon: Settings },
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || "");
      }
    });
  }, []);

  const isActive = (path: string) => {
    if (path === "/app") {
      return location.pathname === path || location.pathname === "/app/";
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Ви успішно вийшли");
      navigate("/");
    } catch (error) {
      toast.error("Помилка при виході");
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center space-x-2">
            <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-display font-bold">DocuMinds</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-card border-r shadow-xl">
            <div className="flex flex-col h-full">
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all",
                        isActive(item.href)
                          ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t">
                <Link 
                  to="/app/profile" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="block mb-3 px-4 py-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <p className="text-sm font-semibold truncate">Мій профіль</p>
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                </Link>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-base" 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  Вийти
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 border-r bg-card flex-col flex-shrink-0">
        <div className="p-4 lg:p-6 border-b">
          <Link to="/" className="flex items-center space-x-2 lg:space-x-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative h-8 w-8 lg:h-10 lg:w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
              </div>
            </div>
            <span className="text-lg lg:text-xl font-display font-bold">DocuMinds</span>
          </Link>
        </div>

        <nav className="flex-1 p-3 lg:p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl text-sm lg:text-base font-medium transition-all",
                  isActive(item.href)
                    ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 lg:p-4 border-t">
          <Link to="/app/profile" className="block mb-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors">
            <p className="text-sm font-semibold truncate">Мій профіль</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </Link>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sm lg:text-base" 
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />
            Вийти
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background">
        <Outlet />
      </main>
    </div>
  );
}
