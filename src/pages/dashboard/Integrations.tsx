import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, RefreshCw, Plus, Trash2, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OAuthPresets, OAuthPreset } from "@/components/dashboard/OAuthPresets";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Integration {
  id: string;
  name: string;
  type: string;
  status: string;
  last_sync_at: string | null;
  error_message: string | null;
  resource_count?: number;
  oauth_client_id?: string;
  oauth_authorize_url?: string;
  oauth_scopes?: string;
  auth_type?: string;
}

interface IntegrationCredential {
  id: string;
  integration_id: string;
  user_id: string;
  token_expires_at: string | null;
  connection_status: string;
  validation_error: string | null;
  granted_scopes: string | null;
  last_validated_at: string | null;
}

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [userCredentials, setUserCredentials] = useState<Map<string, IntegrationCredential>>(new Map());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    oauth_client_id: "",
    oauth_client_secret: "",
    oauth_authorize_url: "",
    oauth_token_url: "",
    oauth_scopes: "",
  });
  const [selectedPreset, setSelectedPreset] = useState<OAuthPreset | null>(null);


  useEffect(() => {
    loadIntegrations();
    
    // Обробляємо OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      toast.error(`OAuth помилка: ${error}`);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (code && state) {
      const savedState = sessionStorage.getItem('oauth_state');
      const integrationId = sessionStorage.getItem('oauth_integration_id');

      if (state !== savedState) {
        toast.error('Невалідний OAuth state');
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      handleOAuthCallback(code, integrationId!);
      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('oauth_integration_id');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [currentPage]);

  const loadIntegrations = async () => {
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

      // Get total count
      const { count } = await supabase
        .from('integrations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', member.organization_id);

      setTotalCount(count || 0);

      // Get paginated data
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data: integrationsData, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('organization_id', member.organization_id)
        .range(from, to);

      if (error) throw error;

      // Get resource counts per integration
      const { data: resources } = await supabase
        .from('resources')
        .select('integration')
        .eq('organization_id', member.organization_id);

      const integrationsWithCounts = (integrationsData || []).map(integration => ({
        ...integration,
        resource_count: resources?.filter(r => r.integration === integration.name).length || 0
      }));

      setIntegrations(integrationsWithCounts);

      // Завантажуємо credentials користувача
      const { data: credentialsData } = await supabase
        .from('integration_credentials')
        .select('*')
        .eq('user_id', user.id);

      const credMap = new Map<string, IntegrationCredential>();
      (credentialsData || []).forEach(cred => {
        credMap.set(cred.integration_id, cred);
      });
      setUserCredentials(credMap);
    } catch (error) {
      console.error('Error loading integrations:', error);
      toast.error("Помилка завантаження інтеграцій");
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSelect = (preset: OAuthPreset) => {
    setSelectedPreset(preset);
    setFormData({
      name: preset.name,
      type: preset.type,
      oauth_client_id: "",
      oauth_client_secret: "",
      oauth_authorize_url: preset.oauth_authorize_url || "",
      oauth_token_url: preset.oauth_token_url || "",
      oauth_scopes: preset.oauth_scopes || "",
    });
  };

  const handleCreateIntegration = async () => {
    if (!organizationId) return;
    
    // Валідація обов'язкових полів
    if (!formData.name || !formData.type) {
      toast.error("Заповніть назву та тип інтеграції");
      return;
    }

    if (selectedPreset?.auth_type === 'api_token') {
      if (selectedPreset.type === 'notion') {
        // Для Notion потрібен тільки Integration Secret
        if (!formData.oauth_client_secret) {
          toast.error("Вкажіть Integration Secret");
          return;
        }
      } else {
        // Для Atlassian потрібні всі поля
        if (!formData.oauth_authorize_url) {
          toast.error("Вкажіть Atlassian Site URL");
          return;
        }
        if (!formData.oauth_client_id) {
          toast.error("Вкажіть email акаунту");
          return;
        }
        if (!formData.oauth_client_secret) {
          toast.error("Вкажіть API Token");
          return;
        }
      }

      // Для API Token - спочатку валідуємо, потім створюємо
      try {
        console.log('=== VALIDATING API TOKEN ===');
        console.log('Site URL:', formData.oauth_authorize_url);
        console.log('Email:', formData.oauth_client_id);
        console.log('Token length:', formData.oauth_client_secret?.length);
        
        const loadingToast = toast.loading('Перевірка підключення...');
        
        const { data, error } = await supabase.functions.invoke('validate-api-token', {
          body: {
            integration_id: null, // тимчасово null, бо ще не створена
            email: formData.oauth_client_id,
            api_token: formData.oauth_client_secret,
            site_url: formData.oauth_authorize_url,
            integration_type: formData.type,
          },
        });

        console.log('Validation response:', { data, error });

        toast.dismiss(loadingToast);

        if (error || !data?.success) {
          toast.error(data?.message || data?.error || 'Помилка перевірки підключення');
          return; // НЕ створюємо інтеграцію якщо валідація провалилась
        }

        // Тільки якщо валідація успішна - створюємо інтеграцію
        const insertData: any = {
          organization_id: organizationId,
          name: formData.name,
          type: formData.type,
          status: 'connected',
          auth_type: 'api_token',
          api_email: formData.oauth_client_id,
          api_token: formData.oauth_client_secret,
          oauth_authorize_url: formData.oauth_authorize_url, // зберігаємо site URL
        };

        console.log('Creating integration with data:', insertData);

        const { data: newIntegration, error: insertError } = await supabase
          .from('integrations')
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }

        console.log('Integration created:', newIntegration);

        // Ще раз валідуємо вже з правильним integration_id щоб записати credentials
        await handleValidateApiToken(
          newIntegration.id, 
          formData.oauth_client_id, 
          formData.oauth_client_secret,
          formData.oauth_authorize_url
        );

        toast.success("Інтеграцію створено і підключено");
        setIsDialogOpen(false);
        setFormData({ 
          name: "", 
          type: "",
          oauth_client_id: "",
          oauth_client_secret: "",
          oauth_authorize_url: "",
          oauth_token_url: "",
          oauth_scopes: "",
        });
        setSelectedPreset(null);
        loadIntegrations();
      } catch (error) {
        console.error('Error creating integration:', error);
        toast.error("Помилка створення інтеграції");
      }
    } else {
      // Для OAuth - створюємо як раніше
      if (!formData.oauth_client_id || !formData.oauth_client_secret) {
        toast.error("Заповніть Client ID та Client Secret");
        return;
      }

      try {
        const redirectUri = 'https://documinds.online/app/integrations';
        
        const insertData: any = {
          organization_id: organizationId,
          name: formData.name,
          type: formData.type,
          status: 'connected',
          auth_type: 'oauth',
          oauth_client_id: formData.oauth_client_id,
          oauth_client_secret: formData.oauth_client_secret,
          oauth_authorize_url: formData.oauth_authorize_url || null,
          oauth_token_url: formData.oauth_token_url || null,
          oauth_scopes: formData.oauth_scopes || null,
          config: {
            redirect_uri: redirectUri
          },
        };

        const { error } = await supabase
          .from('integrations')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;

        toast.success("Інтеграцію створено");
        setIsDialogOpen(false);
        setFormData({ 
          name: "", 
          type: "",
          oauth_client_id: "",
          oauth_client_secret: "",
          oauth_authorize_url: "",
          oauth_token_url: "",
          oauth_scopes: "",
        });
        setSelectedPreset(null);
        loadIntegrations();
      } catch (error) {
        console.error('Error creating integration:', error);
        toast.error("Помилка створення інтеграції");
      }
    }
  };

  const handleDeleteIntegration = async (integrationId: string) => {
    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;

      toast.success("Інтеграцію видалено");
      loadIntegrations();
    } catch (error) {
      console.error('Error deleting integration:', error);
      toast.error("Помилка видалення інтеграції");
    }
  };

  const handleOAuthCallback = async (code: string, integrationId: string) => {
    try {
      const loadingToast = toast.loading('Обробка авторизації...');
      
      const redirectUri = 'https://documinds.online/app/integrations';
      const { data, error } = await supabase.functions.invoke('oauth-callback', {
        body: {
          integration_id: integrationId,
          code: code,
          state: sessionStorage.getItem('oauth_state'),
          redirect_uri: redirectUri,
        },
      });

      toast.dismiss(loadingToast);

      if (error) throw error;

      if (data?.success) {
        if (data.status === 'validated') {
          toast.success(data.message);
          // Автосинхронізація ресурсів для Notion
          if (data.integration_type === 'notion') {
            const syncingToast = toast.loading('Синхронізація Notion ресурсів...');
            const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-notion-resources', {
              body: { integration_id: integrationId },
            });
            toast.dismiss(syncingToast);
            if (syncError || !syncData?.success) {
              toast.error(syncData?.error || syncError?.message || 'Не вдалося синхронізувати ресурси');
            } else {
              toast.success(syncData.message || 'Ресурси синхронізовано');
            }
          }
        } else if (data.status === 'error') {
          toast.error(data.message);
        } else {
          toast.info(data.message);
        }
        
        if (data.missing_scopes && data.missing_scopes.length > 0) {
          toast.warning(`Увага: не надано scopes: ${data.missing_scopes.join(', ')}`);
        }
        
        loadIntegrations();
      } else {
        throw new Error(data?.error || 'Невідома помилка');
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      toast.error(`Помилка OAuth: ${error instanceof Error ? error.message : 'Невідома помилка'}`);
    }
  };

  const handleValidateApiToken = async (integrationId: string, email: string, apiToken: string, siteUrl?: string) => {
    try {
      const loadingToast = toast.loading('Перевірка API Token...');
      
      // Отримуємо тип інтеграції
      const { data: integration } = await supabase
        .from('integrations')
        .select('type')
        .eq('id', integrationId)
        .single();
      
      const { data, error } = await supabase.functions.invoke('validate-api-token', {
        body: {
          integration_id: integrationId,
          email: email,
          api_token: apiToken,
          site_url: siteUrl,
          integration_type: integration?.type,
        },
      });

      toast.dismiss(loadingToast);

      if (error) throw error;

      if (data?.success) {
        toast.success(data.message);
        // Оновлюємо дані після синхронізації
        await loadIntegrations();
      } else {
        toast.error(data?.message || data?.error || 'Помилка валідації');
      }
    } catch (error) {
      console.error('API token validation error:', error);
      toast.error(`Помилка: ${error instanceof Error ? error.message : 'Невідома помилка'}`);
    }
  };

  const handleSyncResources = async (integration: Integration) => {
    try {
      const loadingToast = toast.loading('Синхронізація ресурсів...');
      
      const { data, error } = await supabase.functions.invoke('validate-api-token', {
        body: {
          integration_id: integration.id,
          email: integration.auth_type === 'api_token' ? (integration as any).api_email : '',
          api_token: integration.auth_type === 'api_token' ? (integration as any).api_token : '',
          site_url: integration.oauth_authorize_url,
          integration_type: integration.type,
        },
      });

      toast.dismiss(loadingToast);

      if (error) throw error;

      if (data?.success) {
        toast.success('Ресурси синхронізовано');
        await loadIntegrations();
      } else {
        toast.error(data?.message || data?.error || 'Помилка синхронізації');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(`Помилка: ${error instanceof Error ? error.message : 'Невідома помилка'}`);
    }
  };

  const handleConnectIntegration = async (integration: Integration) => {
    if (!integration.oauth_authorize_url || !integration.oauth_client_id) {
      toast.error("OAuth не налаштовано для цієї інтеграції");
      return;
    }

    // Генеруємо state для захисту від CSRF
    const state = `${integration.id}_${Date.now()}`;
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_integration_id', integration.id);

    // Формуємо URL для OAuth авторізації
    const redirectUri = 'https://documinds.online/app/integrations';
    const authUrl = new URL(integration.oauth_authorize_url);
    authUrl.searchParams.append('client_id', integration.oauth_client_id);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', state);
    
    // Для Notion додаємо обов'язковий параметр owner=user
    if (integration.type === 'notion') {
      authUrl.searchParams.append('owner', 'user');
    }
    
    if (integration.oauth_scopes) {
      authUrl.searchParams.append('scope', integration.oauth_scopes);
    }

    // Зберігаємо redirect_uri в конфіг інтеграції, щоб edge function міг використати той самий URI
    const { error: cfgErr } = await supabase
      .from('integrations')
      .update({ config: { redirect_uri: redirectUri } })
      .eq('id', integration.id);
    if (cfgErr) {
      console.warn('Failed to persist redirect_uri', cfgErr);
    }

    console.log('Redirecting to OAuth:', authUrl.toString());
    toast.info('Переадресація на сторінку авторизації...');
    
    // Невелика затримка для відображення toast
    setTimeout(() => {
      window.location.href = authUrl.toString();
    }, 500);
  };

  const handleDisconnectIntegration = async (integrationId: string) => {
    try {
      const { error } = await supabase
        .from('integration_credentials')
        .delete()
        .eq('integration_id', integrationId);

      if (error) throw error;

      toast.success("Інтеграцію відключено");
      loadIntegrations();
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error("Помилка відключення");
    }
  };

  const isUserConnected = (integrationId: string): boolean => {
    return userCredentials.has(integrationId);
  };

  const getUserConnectionStatus = (integrationId: string) => {
    const cred = userCredentials.get(integrationId);
    if (!cred) return null;
    
    return {
      status: cred.connection_status,
      error: cred.validation_error,
      grantedScopes: cred.granted_scopes,
      lastValidated: cred.last_validated_at,
    };
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Підключено
          </Badge>
        );
      case "error":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Помилка
          </Badge>
        );
      default:
        return <Badge variant="secondary">Відключено</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="mb-2">Інтеграції</h1>
          <p className="text-muted-foreground">
            Підключіть та керуйте інтеграціями
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Додати інтеграцію
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Додати нову інтеграцію</DialogTitle>
              <DialogDescription>
                Оберіть готовий шаблон або створіть власну
              </DialogDescription>
            </DialogHeader>
            
            {!selectedPreset ? (
              <OAuthPresets onSelect={handlePresetSelect} />
            ) : (
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-2">Інструкції для {selectedPreset.name}:</div>
                    <div className="text-sm whitespace-pre-line">{selectedPreset.instructions}</div>
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="name">Назва інтеграції</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {selectedPreset.auth_type === 'api_token' ? (
                  <>
                    {selectedPreset.type === 'notion' ? (
                      <div>
                        <Label htmlFor="oauth_client_secret">Integration Secret *</Label>
                        <Input
                          id="oauth_client_secret"
                          type="password"
                          value={formData.oauth_client_secret}
                          onChange={(e) => setFormData({ ...formData, oauth_client_secret: e.target.value })}
                          placeholder="secret_..."
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Internal Integration Secret з Notion
                        </p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <Label htmlFor="oauth_authorize_url">Atlassian Site URL *</Label>
                          <Input
                            id="oauth_authorize_url"
                            value={formData.oauth_authorize_url}
                            onChange={(e) => {
                              // Автоматично очищаємо від https://, http://, та слешів
                              let cleanUrl = e.target.value.trim();
                              cleanUrl = cleanUrl.replace(/^https?:\/\//, ''); // видаляємо https:// або http://
                              cleanUrl = cleanUrl.replace(/\/+$/, ''); // видаляємо слеші в кінці
                              setFormData({ ...formData, oauth_authorize_url: cleanUrl });
                            }}
                            placeholder="yourcompany.atlassian.net"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Введіть ваш Atlassian domain (автоматично очищається від https://)
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="oauth_client_id">Email акаунту *</Label>
                          <Input
                            id="oauth_client_id"
                            type="email"
                            value={formData.oauth_client_id}
                            onChange={(e) => setFormData({ ...formData, oauth_client_id: e.target.value })}
                            placeholder="your-email@company.com"
                          />
                        </div>

                        <div>
                          <Label htmlFor="oauth_client_secret">API Token *</Label>
                          <Input
                            id="oauth_client_secret"
                            type="password"
                            value={formData.oauth_client_secret}
                            onChange={(e) => setFormData({ ...formData, oauth_client_secret: e.target.value })}
                            placeholder="Вставте токен з Atlassian"
                          />
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="oauth_client_id">Client ID *</Label>
                      <Input
                        id="oauth_client_id"
                        value={formData.oauth_client_id}
                        onChange={(e) => setFormData({ ...formData, oauth_client_id: e.target.value })}
                        placeholder="Отримайте з консолі розробника"
                      />
                    </div>

                    <div>
                      <Label htmlFor="oauth_client_secret">Client Secret *</Label>
                      <Input
                        id="oauth_client_secret"
                        type="password"
                        value={formData.oauth_client_secret}
                        onChange={(e) => setFormData({ ...formData, oauth_client_secret: e.target.value })}
                        placeholder="Отримайте з консолі розробника"
                      />
                    </div>
                  </>
                )}

                {selectedPreset.auth_type === 'oauth' && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-sm font-medium">OAuth конфігурація</p>
                    <p className="text-xs text-muted-foreground">
                      Заповнено автоматично. Можете змінити scopes якщо потрібні інші права.
                    </p>
                  
                  <div>
                    <Label htmlFor="oauth_authorize_url" className="text-xs text-muted-foreground">Authorization URL</Label>
                    <Input
                      id="oauth_authorize_url"
                      value={formData.oauth_authorize_url}
                      readOnly
                      className="bg-muted text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="oauth_token_url" className="text-xs text-muted-foreground">Token URL</Label>
                    <Input
                      id="oauth_token_url"
                      value={formData.oauth_token_url}
                      readOnly
                      className="bg-muted text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="oauth_scopes" className="text-xs">
                      OAuth Scopes (можна редагувати)
                    </Label>
                    <Textarea
                      id="oauth_scopes"
                      value={formData.oauth_scopes}
                      onChange={(e) => setFormData({ ...formData, oauth_scopes: e.target.value })}
                      className="text-sm font-mono"
                      placeholder="read:jira-work read:jira-user"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Розділіть пробілами. Додайте більше прав якщо потрібно.
                    </p>
                  </div>
                </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => {
                if (selectedPreset) {
                  setSelectedPreset(null);
                } else {
                  setIsDialogOpen(false);
                }
              }}>
                {selectedPreset ? 'Назад' : 'Скасувати'}
              </Button>
              {selectedPreset && (
                <Button 
                  onClick={handleCreateIntegration} 
                  disabled={
                    !formData.name || 
                    (selectedPreset.type === 'notion' 
                      ? !formData.oauth_client_secret 
                      : !formData.oauth_client_id || !formData.oauth_client_secret
                    )
                  }
                >
                  Створити інтеграцію
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">
          Завантаження...
        </div>
      ) : integrations.length === 0 ? (
        <Card className="glass-card border-dashed">
          <CardHeader className="text-center">
            <CardTitle>Додайте першу інтеграцію</CardTitle>
            <CardDescription>
              Інтеграції допомагають підключити зовнішні сервіси
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Додати інтеграцію
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {integrations.map((integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {integration.name}
                        {getStatusBadge(integration.status)}
                      </CardTitle>
                      <CardDescription>{integration.type}</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteIntegration(integration.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Остання синхронізація</span>
                      <span className="font-medium">
                        {integration.last_sync_at 
                          ? new Date(integration.last_sync_at).toLocaleString('uk-UA')
                          : 'Ніколи'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ресурсів</span>
                      <span className="font-medium">{integration.resource_count}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ваш статус</span>
                      {isUserConnected(integration.id) ? (
                        <div className="flex flex-col items-end gap-1">
                          {getUserConnectionStatus(integration.id)?.status === 'validated' ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Підключено і працює
                            </Badge>
                          ) : getUserConnectionStatus(integration.id)?.status === 'error' ? (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              <XCircle className="mr-1 h-3 w-3" />
                              Підключено з помилкою
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <RefreshCw className="mr-1 h-3 w-3" />
                              Перевірка...
                            </Badge>
                          )}
                          {getUserConnectionStatus(integration.id)?.error && (
                            <span className="text-xs text-destructive">
                              {getUserConnectionStatus(integration.id)?.error}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="secondary">Не підключено</Badge>
                      )}
                    </div>
                    
                    {integration.auth_type === 'api_token' ? (
                      <div className="space-y-2">
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={async () => {
                            const { data: integrationData } = await supabase
                              .from('integrations')
                              .select('api_email, api_token, oauth_authorize_url, type')
                              .eq('id', integration.id)
                              .single();
                            
                            if (!integrationData?.api_token) {
                              toast.error('В інтеграції відсутній API token');
                              return;
                            }
                            
                            // Для Notion не потрібен email і site URL
                            if (integrationData.type === 'notion') {
                              await handleValidateApiToken(
                                integration.id, 
                                '', // email не потрібен для Notion
                                integrationData.api_token,
                                undefined // site_url не потрібен для Notion
                              );
                            } else {
                              // Для Atlassian потрібні email і site URL
                              if (!integrationData?.api_email) {
                                toast.error('В інтеграції відсутній email');
                                return;
                              }
                              
                              let siteUrl = integrationData.oauth_authorize_url as string | null;
                              if (!siteUrl) {
                                siteUrl = window.prompt('Введіть Atlassian Site URL (наприклад: yourcompany.atlassian.net)') || '';
                                if (!siteUrl.trim()) {
                                  toast.error('Site URL обовʼязковий');
                                  return;
                                }
                              }
                              
                              await handleValidateApiToken(
                                integration.id, 
                                integrationData.api_email, 
                                integrationData.api_token,
                                siteUrl
                              );
                            }
                          }}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {isUserConnected(integration.id) ? 'Оновити статус' : 'Підключити'}
                        </Button>

                        <Button 
                          variant="secondary" 
                          className="w-full"
                          onClick={() => handleSyncResources(integration)}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Синхронізувати ресурси
                        </Button>

                        {isUserConnected(integration.id) && (
                          <Button 
                            variant="outline"
                            className="w-full"
                            onClick={() => handleDisconnectIntegration(integration.id)}
                          >
                            Відключити
                          </Button>
                        )}
                      </div>
                    ) : integration.oauth_authorize_url ? (
                      isUserConnected(integration.id) ? (
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => handleDisconnectIntegration(integration.id)}
                        >
                          Відключити мій акаунт
                        </Button>
                      ) : (
                        <Button 
                          className="w-full"
                          onClick={() => handleConnectIntegration(integration)}
                        >
                          Підключити мій акаунт
                        </Button>
                      )
                    ) : (
                      <p className="text-xs text-muted-foreground text-center">
                        Налаштуйте інтеграцію для підключення
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {totalCount > itemsPerPage && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Сторінка {currentPage} з {totalPages} ({totalCount} інтеграцій)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Попередня
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Наступна
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
