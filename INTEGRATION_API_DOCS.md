# DocuMinds - API Integration Documentation

## Загальний опис системи

**DocuMinds** - це платформа для управління доступом до ресурсів з різних інтеграцій (Notion, Confluence, Google Drive, GitHub тощо) з груповими правами доступу.

### Основна бізнес-логіка:

1. **Організації** - кожна компанія має свою організацію
2. **Користувачі** - члени організації з ролями (owner/member)
3. **Інтеграції** - підключення до зовнішніх сервісів (Notion, Confluence і т.д.)
4. **Ресурси** - конкретні документи/сторінки з інтеграцій
5. **Групи** - групи користувачів для керування доступом
6. **Права доступу** - зв'язок між групами та ресурсами

---

## Креденшали підключення до Supabase

### Production Database

```
Project ID: rbmepcfznvcskxayuisp
Database URL: https://rbmepcfznvcskxayuisp.supabase.co
Anon Key (Public): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVwY2Z6bnZjc2t4YXl1aXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjUzOTAsImV4cCI6MjA3NTAwMTM5MH0.ia2D4eT_VpqKApv4pdgTvHsvOCyR_XoCra73j2ElI9Y

⚠️ Service Role Key (Private) - потрібно отримати окремо для MSP серверів
```

### Підключення для MSP серверів

**Рекомендований підхід:**
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://rbmepcfznvcskxayuisp.supabase.co',
  'YOUR_SERVICE_ROLE_KEY', // ⚠️ Використовувати тільки на backend!
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

**⚠️ ВАЖЛИВО:**
- `anon key` - для frontend (обмежений RLS políticas)
- `service_role key` - для MSP серверів (bypass RLS, повний доступ)
- Service role key **НІКОЛИ** не використовувати на frontend!

---

## Структура бази даних

### 1. Таблиця: `organizations`
**Призначення:** Організації (компанії) в системі

| Поле | Тип | Nullable | Default | Опис |
|------|-----|----------|---------|------|
| `id` | uuid | NO | gen_random_uuid() | Унікальний ID організації |
| `name` | text | NO | - | Назва організації |
| `domain` | text | YES | - | Домен компанії (example.com) |
| `plan` | text | YES | 'starter' | Тарифний план (starter/pro/enterprise) |
| `status` | text | YES | 'active' | Статус (active/suspended/cancelled) |
| `created_at` | timestamptz | YES | now() | Дата створення |
| `updated_at` | timestamptz | YES | now() | Дата оновлення |

**RLS Políticas:**
- Users can view their organizations
- Admins and super admins can view all organizations
- Super admins can manage all organizations

---

### 2. Таблиця: `profiles`
**Призначення:** Профілі користувачів (розширення auth.users)

| Поле | Тип | Nullable | Default | Опис |
|------|-----|----------|---------|------|
| `id` | uuid | NO | - | ID користувача (з auth.users) |
| `email` | text | YES | - | Email користувача |
| `first_name` | text | YES | - | Ім'я |
| `last_name` | text | YES | - | Прізвище |
| `company` | text | YES | - | Компанія |
| `organization_id` | uuid | YES | - | FK до organizations.id |
| `created_at` | timestamptz | YES | now() | Дата створення |
| `updated_at` | timestamptz | YES | now() | Дата оновлення |

**RLS Políticas:**
- Users can view their own profile
- Super admins and admins can view all profiles
- Users can update their own profile

---

### 3. Таблиця: `organization_members`
**Призначення:** Зв'язок користувачів з організаціями + ролі

| Поле | Тип | Nullable | Default | Опис |
|------|-----|----------|---------|------|
| `id` | uuid | NO | gen_random_uuid() | Унікальний ID |
| `organization_id` | uuid | NO | - | FK до organizations.id |
| `user_id` | uuid | NO | - | FK до profiles.id |
| `role` | text | YES | 'member' | Роль (owner/member) |
| `status` | text | NO | 'active' | Статус (active/inactive) |
| `invitation_status` | text | YES | 'accepted' | Статус запрошення |
| `created_at` | timestamptz | YES | now() | Дата створення |

**RLS Políticas:**
- Users can view their organization memberships
- Super admins can manage organization memberships

---

### 4. Таблиця: `integrations`
**Призначення:** Налаштування інтеграцій з зовнішніми сервісами

| Поле | Тип | Nullable | Default | Опис |
|------|-----|----------|---------|------|
| `id` | uuid | NO | gen_random_uuid() | Унікальний ID інтеграції |
| `organization_id` | uuid | NO | - | FK до organizations.id |
| `name` | text | NO | - | Назва інтеграції |
| `type` | text | NO | - | Тип (notion/confluence/google_drive/github) |
| `status` | text | NO | 'disconnected' | Статус (connected/disconnected/error) |
| `auth_type` | text | YES | 'oauth' | Тип авторизації (oauth/api_token) |
| `oauth_client_id` | text | YES | - | OAuth Client ID |
| `oauth_client_secret` | text | YES | - | OAuth Client Secret |
| `oauth_authorize_url` | text | YES | - | URL для OAuth авторизації |
| `oauth_token_url` | text | YES | - | URL для отримання токена |
| `oauth_scopes` | text | YES | - | OAuth scopes (розділені пробілами) |
| `api_token` | text | YES | - | API Token (для api_token auth) |
| `api_email` | text | YES | - | Email (для деяких API) |
| `config` | jsonb | YES | - | Додаткова конфігурація (redirect_uri і т.д.) |
| `last_sync_at` | timestamptz | YES | - | Дата останньої синхронізації |
| `error_message` | text | YES | - | Повідомлення про помилку |
| `created_at` | timestamptz | YES | now() | Дата створення |
| `updated_at` | timestamptz | YES | now() | Дата оновлення |

**RLS Políticas:**
- Members can view integrations
- Org owners can manage their integrations
- Super admins can manage all integrations

**⚠️ ДЛЯ MSP ІНТЕГРАЦІЇ:**
Для отримання інтеграцій конкретної організації:
```sql
SELECT * FROM integrations WHERE organization_id = 'ORG_UUID';
```

---

### 5. Таблиця: `integration_credentials`
**Призначення:** OAuth токени користувачів для інтеграцій

| Поле | Тип | Nullable | Default | Опис |
|------|-----|----------|---------|------|
| `id` | uuid | NO | gen_random_uuid() | Унікальний ID |
| `integration_id` | uuid | NO | - | FK до integrations.id |
| `user_id` | uuid | NO | - | FK до profiles.id |
| `access_token` | text | YES | - | ⚠️ OAuth Access Token |
| `refresh_token` | text | YES | - | OAuth Refresh Token |
| `token_expires_at` | timestamptz | YES | - | Коли токен закінчується (null для Notion) |
| `scope` | text | YES | - | Надані scopes |
| `granted_scopes` | text | YES | - | Реально отримані scopes |
| `connection_status` | text | YES | 'pending' | Статус (validated/error/pending) |
| `validation_error` | text | YES | - | Помилка валідації |
| `last_validated_at` | timestamptz | YES | - | Дата останньої валідації |
| `created_at` | timestamptz | NO | now() | Дата створення |
| `updated_at` | timestamptz | NO | now() | Дата оновлення |

**RLS Políticas:**
- Users can view their own credentials
- Users can insert/update/delete their own credentials
- Super admins can view all credentials

**⚠️ ДЛЯ MSP ІНТЕГРАЦІЇ - ОТРИМАННЯ ТОКЕНА:**
```sql
-- Отримати access token для Notion конкретного користувача
SELECT ic.access_token, ic.refresh_token, i.type
FROM integration_credentials ic
JOIN integrations i ON ic.integration_id = i.id
WHERE i.organization_id = 'ORG_UUID'
  AND i.type = 'notion'
  AND ic.connection_status = 'validated'
LIMIT 1;
```

---

### 6. Таблиця: `resources`
**Призначення:** Ресурси (документи/сторінки) з інтеграцій

| Поле | Тип | Nullable | Default | Опис |
|------|-----|----------|---------|------|
| `id` | uuid | NO | gen_random_uuid() | Унікальний ID |
| `organization_id` | uuid | NO | - | FK до organizations.id |
| `integration_id` | uuid | NO | - | ⚠️ FK до integrations.id (CASCADE DELETE) |
| `integration` | text | NO | - | Назва інтеграції (legacy, для compatibility) |
| `name` | text | NO | - | Назва ресурсу |
| `type` | text | NO | - | Тип (page/database/document/repository) |
| `url` | text | YES | - | URL ресурсу |
| `status` | text | NO | 'active' | Статус (active/archived) |
| `last_synced_at` | timestamptz | YES | now() | Дата останньої синхронізації |
| `created_at` | timestamptz | YES | now() | Дата створення |
| `updated_at` | timestamptz | YES | now() | Дата оновлення |

**RLS Políticas:**
- Members can view resources
- Org owners can manage their resources
- Super admins can manage all resources

**⚠️ ДЛЯ MSP ІНТЕГРАЦІЇ:**
```sql
-- Отримати всі Notion ресурси організації
SELECT r.*, i.name as integration_name
FROM resources r
JOIN integrations i ON r.integration_id = i.id
WHERE r.organization_id = 'ORG_UUID'
  AND i.type = 'notion';
```

---

### 7. Таблиця: `groups`
**Призначення:** Групи користувачів для керування доступом

| Поле | Тип | Nullable | Default | Опис |
|------|-----|----------|---------|------|
| `id` | uuid | NO | gen_random_uuid() | Унікальний ID |
| `organization_id` | uuid | NO | - | FK до organizations.id |
| `name` | text | NO | - | Назва групи |
| `description` | text | YES | - | Опис групи |
| `created_at` | timestamptz | YES | now() | Дата створення |
| `updated_at` | timestamptz | YES | now() | Дата оновлення |

**RLS Políticas:**
- Members can view groups
- Org owners can manage their groups
- Super admins can manage all groups

---

### 8. Таблиця: `group_members`
**Призначення:** Зв'язок користувачів з групами

| Поле | Тип | Nullable | Default | Опис |
|------|-----|----------|---------|------|
| `id` | uuid | NO | gen_random_uuid() | Унікальний ID |
| `group_id` | uuid | NO | - | FK до groups.id |
| `user_id` | uuid | NO | - | FK до profiles.id |
| `created_at` | timestamptz | YES | now() | Дата створення |

**RLS Políticas:**
- Members can view group members
- Org owners can manage their group members
- Super admins can manage group members

---

### 9. Таблиця: `resource_permissions`
**Призначення:** Права доступу груп до ресурсів

| Поле | Тип | Nullable | Default | Опис |
|------|-----|----------|---------|------|
| `id` | uuid | NO | gen_random_uuid() | Унікальний ID |
| `group_id` | uuid | NO | - | FK до groups.id |
| `resource_id` | uuid | NO | - | FK до resources.id |
| `created_at` | timestamptz | YES | now() | Дата створення |

**RLS Políticas:**
- Members can view resource permissions
- Org owners can manage their resource permissions
- Super admins can manage resource permissions

**⚠️ ДЛЯ MSP ІНТЕГРАЦІЇ - ПЕРЕВІРКА ДОСТУПУ:**
```sql
-- Чи має користувач доступ до ресурсу?
SELECT EXISTS (
  SELECT 1
  FROM resource_permissions rp
  JOIN group_members gm ON rp.group_id = gm.group_id
  WHERE rp.resource_id = 'RESOURCE_UUID'
    AND gm.user_id = 'USER_UUID'
) as has_access;
```

---

### 10. Таблиця: `audit_logs`
**Призначення:** Журнал аудиту всіх дій

| Поле | Тип | Nullable | Default | Опис |
|------|-----|----------|---------|------|
| `id` | uuid | NO | gen_random_uuid() | Унікальний ID |
| `organization_id` | uuid | NO | - | FK до organizations.id |
| `user_id` | uuid | YES | - | FK до profiles.id |
| `action` | text | NO | - | Дія (create/update/delete) |
| `resource_type` | text | YES | - | Тип ресурсу (integration/resource/group/member) |
| `resource_id` | text | YES | - | ID ресурсу |
| `details` | jsonb | YES | - | Додаткові деталі |
| `ip_address` | text | YES | - | IP адреса |
| `user_agent` | text | YES | - | User Agent |
| `created_at` | timestamptz | YES | now() | Дата створення |

**RLS Políticas:**
- Super admins and admins can view all audit logs
- Users can view their organization audit logs

---

## Edge Functions (Serverless API)

### 1. `oauth-callback`
**URL:** `https://rbmepcfznvcskxayuisp.supabase.co/functions/v1/oauth-callback`

**Призначення:** Обробка OAuth callback від Notion/інших провайдерів

**Вхідні дані:**
```json
{
  "integration_id": "uuid",
  "code": "auth_code_from_provider",
  "state": "csrf_state",
  "redirect_uri": "https://documinds.online/app/integrations"
}
```

**Що робить:**
1. Обмінює `code` на `access_token` і `refresh_token`
2. Валідує connection
3. Зберігає в `integration_credentials`

---

### 2. `sync-notion-resources`
**URL:** `https://rbmepcfznvcskxayuisp.supabase.co/functions/v1/sync-notion-resources`

**Призначення:** Синхронізація ресурсів з Notion

**⚠️ ДЛЯ MSP СЕРВЕРІВ - ЦЕ КЛЮЧОВА ФУНКЦІЯ!**

**Вхідні дані:**
```json
{
  "integration_id": "uuid"
}
```

**Що робить:**
1. Бере `access_token` з `integration_credentials`
2. Викликає Notion API `/v1/search`
3. Отримує всі pages/databases
4. Зберігає в таблицю `resources`

**Відповідь:**
```json
{
  "success": true,
  "synced_count": 42,
  "resources": [...]
}
```

---

### 3. `validate-api-token`
**URL:** `https://rbmepcfznvcskxayuisp.supabase.co/functions/v1/validate-api-token`

**Призначення:** Валідація API токенів

---

### 4. `oauth-refresh`
**URL:** `https://rbmepcfznvcskxayuisp.supabase.co/functions/v1/oauth-refresh`

**Призначення:** Оновлення OAuth токенів

---

## Робочий процес для MSP інтеграції

### Сценарій 1: Отримання даних з Notion

```javascript
// 1. Підключитися до Supabase з service_role
const supabase = createClient(url, serviceRoleKey)

// 2. Знайти організацію
const { data: org } = await supabase
  .from('organizations')
  .select('*')
  .eq('domain', 'acme.com')
  .single()

// 3. Знайти Notion інтеграцію
const { data: integration } = await supabase
  .from('integrations')
  .select('*')
  .eq('organization_id', org.id)
  .eq('type', 'notion')
  .single()

// 4. Отримати access token
const { data: credentials } = await supabase
  .from('integration_credentials')
  .select('access_token')
  .eq('integration_id', integration.id)
  .eq('connection_status', 'validated')
  .single()

// 5. Викликати Notion API
const response = await fetch('https://api.notion.com/v1/search', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${credentials.access_token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    filter: { property: 'object', value: 'page' }
  })
})

const notionData = await response.json()
```

### Сценарій 2: Синхронізація ресурсів

```javascript
// Викликати edge function для синхронізації
const { data, error } = await supabase.functions.invoke('sync-notion-resources', {
  body: { integration_id: integration.id }
})

// Після синхронізації - отримати ресурси
const { data: resources } = await supabase
  .from('resources')
  .select('*')
  .eq('organization_id', org.id)
  .eq('integration_id', integration.id)
```

### Сценарій 3: Перевірка доступу користувача

```javascript
// Перевірити чи має користувач доступ до ресурсу
const { data: hasAccess } = await supabase.rpc('check_user_access', {
  p_user_id: 'user-uuid',
  p_resource_id: 'resource-uuid'
})
```

---

## Типові запити для MSP

### Отримати всі ресурси організації з Notion

```sql
SELECT 
  r.id,
  r.name,
  r.type,
  r.url,
  r.last_synced_at,
  i.name as integration_name
FROM resources r
JOIN integrations i ON r.integration_id = i.id
WHERE r.organization_id = 'ORG_UUID'
  AND i.type = 'notion'
  AND r.status = 'active';
```

### Отримати користувачів з доступом до конкретного ресурсу

```sql
SELECT DISTINCT
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  g.name as group_name
FROM profiles p
JOIN group_members gm ON p.id = gm.user_id
JOIN groups g ON gm.group_id = g.id
JOIN resource_permissions rp ON g.id = rp.group_id
WHERE rp.resource_id = 'RESOURCE_UUID';
```

### Отримати всі групи та їх права

```sql
SELECT 
  g.id,
  g.name,
  g.description,
  COUNT(DISTINCT gm.user_id) as member_count,
  COUNT(DISTINCT rp.resource_id) as resource_count
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
LEFT JOIN resource_permissions rp ON g.id = rp.group_id
WHERE g.organization_id = 'ORG_UUID'
GROUP BY g.id, g.name, g.description;
```

---

## Безпека

### RLS (Row Level Security)
**✅ Увімкнено на всіх таблицях**

### Service Role обходить RLS
⚠️ MSP сервери з `service_role` ключем мають **повний доступ** до всіх даних

### Рекомендації:
1. Зберігати `service_role` key в секретах (не в коді!)
2. Використовувати тільки на backend серверах
3. Логувати всі запити від MSP для аудиту
4. Обмежити IP адреси MSP серверів (якщо можливо)

---

## Контакти і підтримка

**API Base URL:** https://rbmepcfznvcskxayuisp.supabase.co

**Документація Supabase:** https://supabase.com/docs

**Notion API:** https://developers.notion.com/

**Для питань:** support@documinds.online
