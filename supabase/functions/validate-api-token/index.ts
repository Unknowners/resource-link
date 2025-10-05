import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { integration_id, email, api_token, site_url, integration_type } = await req.json();

    console.log('Validating API token for integration:', integration_id, 'type:', integration_type);

    // Визначаємо тип інтеграції
    let integrationType = integration_type;
    let atlassianSiteUrl = site_url;
    
    // Якщо є integration_id, отримуємо дані з БД
    if (integration_id) {
      const { data: integration, error: integrationError } = await supabaseClient
        .from('integrations')
        .select('*')
        .eq('id', integration_id)
        .single();

      if (integrationError || !integration) {
        throw new Error('Integration not found');
      }

      integrationType = integration.type;
      
      // Якщо site_url не передано, беремо з інтеграції
      if (!atlassianSiteUrl) {
        atlassianSiteUrl = integration.oauth_authorize_url;
      }
    }
    
    // Для Atlassian потрібен site URL
    if (integrationType === 'atlassian' && !atlassianSiteUrl) {
      throw new Error('Atlassian site URL is required');
    }

    let validationStatus = 'pending';
    let validationError = null;

    // Розділяємо логіку валідації для Notion і Atlassian
    if (integrationType === 'notion') {
      // Валідація Notion
      try {
        console.log('Validating Notion integration...');
        
        const testResponse = await fetch('https://api.notion.com/v1/users/me', {
          headers: {
            'Authorization': `Bearer ${api_token}`,
            'Notion-Version': '2022-06-28',
          },
        });

        if (testResponse.ok) {
          const userData = await testResponse.json();
          console.log('Notion authentication successful:', userData);
          validationStatus = 'validated';
          
          // Синхронізуємо Notion pages якщо є integration_id
          if (integration_id) {
            console.log('Starting Notion sync for integration:', integration_id);
            
            const { data: integration } = await supabaseClient
              .from('integrations')
              .select('organization_id, name')
              .eq('id', integration_id)
              .single();

            console.log('Integration data:', integration);

            if (integration) {
              console.log('Syncing Notion pages...');
              
              try {
                const searchResponse = await fetch('https://api.notion.com/v1/search', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${api_token}`,
                    'Notion-Version': '2022-06-28',
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    filter: { property: 'object', value: 'page' },
                    page_size: 100,
                  }),
                });

                if (searchResponse.ok) {
                  const searchData = await searchResponse.json();
                  console.log('Notion API response:', JSON.stringify(searchData, null, 2));
                  
                  const pages = searchData.results || [];
                  console.log(`Total pages from API: ${pages.length}`);
                  
                  // Фільтруємо тільки workspace pages (top-level)
                  const workspacePages = pages.filter((page: any) => 
                    !page.parent || 
                    (page.parent.type === 'workspace' && page.parent.workspace === true)
                  );
                  
                  console.log(`Found ${workspacePages.length} workspace pages after filtering`);
                  console.log('Workspace pages:', JSON.stringify(workspacePages, null, 2));
                  
                  const syncTime = new Date().toISOString();
                  const resources = [];
                  
                  for (const page of workspacePages) {
                    let pageName = 'Untitled';
                    
                    if (page.properties?.title?.title?.[0]?.plain_text) {
                      pageName = page.properties.title.title[0].plain_text;
                    } else if (page.properties?.Name?.title?.[0]?.plain_text) {
                      pageName = page.properties.Name.title[0].plain_text;
                    }
                    
                    resources.push({
                      organization_id: integration.organization_id,
                      name: pageName,
                      type: 'notion_page',
                      integration: integration.name,
                      url: page.url,
                      status: 'active',
                      last_synced_at: syncTime,
                    });
                  }
                  
                  console.log(`Prepared ${resources.length} resources for insertion`);
                  
                  // Видаляємо старі Notion ресурси
                  const { error: deleteError } = await supabaseClient
                    .from('resources')
                    .delete()
                    .eq('integration', integration.name)
                    .eq('type', 'notion_page');
                  
                  if (deleteError) {
                    console.error('Error deleting old resources:', deleteError);
                  }
                  
                  // Додаємо нові
                  if (resources.length > 0) {
                    const { error: insertError } = await supabaseClient
                      .from('resources')
                      .insert(resources);
                    
                    if (insertError) {
                      console.error('Error inserting resources:', insertError);
                    } else {
                      console.log(`Successfully synced ${resources.length} Notion pages`);
                    }
                  } else {
                  }
                  
                  // Оновлюємо last_sync_at
                  await supabaseClient
                    .from('integrations')
                    .update({ last_sync_at: syncTime })
                    .eq('id', integration_id);
                }
              } catch (syncErr) {
                console.error('Failed to sync Notion pages:', syncErr);
              }
            }
          }
        } else {
          const errorText = await testResponse.text();
          console.error('Notion validation failed:', testResponse.status, errorText);
          validationStatus = 'error';
          validationError = `Authentication failed: ${testResponse.status}. Check Integration Secret.`;
        }
      } catch (validationErr) {
        console.error('Notion validation error:', validationErr);
        validationStatus = 'error';
        validationError = validationErr instanceof Error ? validationErr.message : 'Unknown error';
      }
    } else {
      // Валідація Atlassian (Jira/Confluence)
      // Створюємо Basic Auth header
      const authString = btoa(`${email}:${api_token}`);
      
      try {
        // Нормалізуємо URL (додаємо https:// якщо немає)
        let normalizedUrl = atlassianSiteUrl!.trim();
        if (!normalizedUrl.startsWith('http')) {
          normalizedUrl = `https://${normalizedUrl}`;
        }
        
        // Тестуємо доступ до Jira API
        const jiraTestUrl = `${normalizedUrl}/rest/api/3/myself`;
        console.log('Testing Jira API access:', jiraTestUrl);
        
        const testResponse = await fetch(jiraTestUrl, {
          headers: {
            'Authorization': `Basic ${authString}`,
            'Accept': 'application/json',
          },
        });

        if (testResponse.ok) {
          const userData = await testResponse.json();
          console.log('Jira authentication successful for user:', userData.emailAddress);
          validationStatus = 'validated';
          
          // Синхронізуємо ресурси тільки якщо є integration_id
          if (integration_id) {
            const { data: integration } = await supabaseClient
              .from('integrations')
              .select('organization_id, name')
              .eq('id', integration_id)
              .single();

            if (integration) {
              const siteName = normalizedUrl.replace('https://', '').replace('http://', '');
              let syncedCount = 0;
              const syncTime = new Date().toISOString();
              const foundResourceNames = new Set<string>();
              
              // 1. Витягуємо Jira проекти
              try {
                const projectsResponse = await fetch(`${normalizedUrl}/rest/api/3/project`, {
                  headers: {
                    'Authorization': `Basic ${authString}`,
                    'Accept': 'application/json',
                  },
                });

                if (projectsResponse.ok) {
                  const projects = await projectsResponse.json();
                  console.log(`Found ${projects.length} Jira projects`);
                  
                  for (const project of projects) {
                    const resourceName = `${project.key} - ${project.name}`;
                    foundResourceNames.add(resourceName);
                    
                    const { data: existing } = await supabaseClient
                      .from('resources')
                      .select('id')
                      .eq('organization_id', integration.organization_id)
                      .eq('name', resourceName)
                      .eq('integration', integration.name)
                      .maybeSingle();

                    if (!existing) {
                      await supabaseClient
                        .from('resources')
                        .insert({
                          organization_id: integration.organization_id,
                          integration_id: integration_id,
                          name: resourceName,
                          type: 'jira_project',
                          integration: integration.name,
                          url: `${normalizedUrl}/browse/${project.key}`,
                          status: 'active',
                          last_synced_at: syncTime,
                        });
                      syncedCount++;
                    } else {
                      // Оновлюємо статус на active
                      await supabaseClient
                        .from('resources')
                        .update({
                          status: 'active',
                          last_synced_at: syncTime,
                          url: `${normalizedUrl}/browse/${project.key}`,
                        })
                        .eq('id', existing.id);
                    }
                  }
                }
              } catch (err) {
                console.error('Failed to fetch Jira projects:', err);
              }

              // 2. Витягуємо Confluence spaces
              try {
                const spacesResponse = await fetch(`${normalizedUrl}/wiki/rest/api/space`, {
                  headers: {
                    'Authorization': `Basic ${authString}`,
                    'Accept': 'application/json',
                  },
                });

                if (spacesResponse.ok) {
                  const spacesData = await spacesResponse.json();
                  const spaces = spacesData.results || [];
                  console.log(`Found ${spaces.length} Confluence spaces`);
                  
                  for (const space of spaces) {
                    const resourceName = `${space.key} - ${space.name}`;
                    foundResourceNames.add(resourceName);
                    
                    const { data: existing } = await supabaseClient
                      .from('resources')
                      .select('id')
                      .eq('organization_id', integration.organization_id)
                      .eq('name', resourceName)
                      .eq('integration', integration.name)
                      .maybeSingle();

                    if (!existing) {
                      await supabaseClient
                        .from('resources')
                        .insert({
                          organization_id: integration.organization_id,
                          integration_id: integration_id,
                          name: resourceName,
                          type: 'confluence_space',
                          integration: integration.name,
                          url: `${normalizedUrl}/wiki/spaces/${space.key}`,
                          status: 'active',
                          last_synced_at: syncTime,
                        });
                      syncedCount++;
                    } else {
                      // Оновлюємо статус на active
                      await supabaseClient
                        .from('resources')
                        .update({
                          status: 'active',
                          last_synced_at: syncTime,
                          url: `${normalizedUrl}/wiki/spaces/${space.key}`,
                        })
                        .eq('id', existing.id);
                    }
                  }
                }
              } catch (err) {
                console.error('Failed to fetch Confluence spaces:', err);
              }

              // 3. Помічаємо ресурси які більше не існують як 'removed'
              const { data: allResources } = await supabaseClient
                .from('resources')
                .select('id, name, status')
                .eq('organization_id', integration.organization_id)
                .eq('integration', integration.name)
                .in('type', ['jira_project', 'confluence_space']);

              if (allResources) {
                for (const resource of allResources) {
                  if (!foundResourceNames.has(resource.name) && resource.status !== 'removed') {
                    await supabaseClient
                      .from('resources')
                      .update({ status: 'removed' })
                      .eq('id', resource.id);
                    console.log(`Marked as removed: ${resource.name}`);
                  }
                }
              }

              console.log(`Synced ${syncedCount} new resources from ${siteName}`);
              
              // Оновлюємо last_sync_at
              await supabaseClient
                .from('integrations')
                .update({ last_sync_at: syncTime })
                .eq('id', integration_id);
            }
          }
        } else {
          const errorText = await testResponse.text();
          console.error('Validation failed:', testResponse.status, errorText);
          validationStatus = 'error';
          validationError = `Authentication failed: ${testResponse.status}. Check email and token.`;
        }
      } catch (validationErr) {
        console.error('Validation error:', validationErr);
        validationStatus = 'error';
        validationError = validationErr instanceof Error ? validationErr.message : 'Unknown error';
      }
    }

    // Зберігаємо credentials тільки якщо є integration_id
    if (integration_id) {
      // Спочатку перевіряємо чи існує запис
      const { data: existing } = await supabaseClient
        .from('integration_credentials')
        .select('id')
        .eq('integration_id', integration_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Оновлюємо існуючий
        const { error: credentialsError } = await supabaseClient
          .from('integration_credentials')
          .update({
            access_token: api_token,
            connection_status: validationStatus,
            validation_error: validationError,
            last_validated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (credentialsError) {
          console.error('Failed to update credentials:', credentialsError);
          throw credentialsError;
        }
      } else {
        // Створюємо новий
        const { error: credentialsError } = await supabaseClient
          .from('integration_credentials')
          .insert({
            integration_id: integration_id,
            user_id: user.id,
            access_token: api_token,
            connection_status: validationStatus,
            validation_error: validationError,
            last_validated_at: new Date().toISOString(),
            scope: 'api_token_auth',
          });

        if (credentialsError) {
          console.error('Failed to save credentials:', credentialsError);
          throw credentialsError;
        }
      }

      console.log('Credentials saved with status:', validationStatus);
    }

    return new Response(
      JSON.stringify({ 
        success: validationStatus !== 'error',
        message: validationStatus === 'validated' 
          ? 'API Token перевірено успішно!' 
          : `Помилка перевірки: ${validationError}`,
        status: validationStatus,
        error: validationError,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: validationStatus === 'error' ? 400 : 200,
      }
    );
  } catch (error) {
    console.error('API token validation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});