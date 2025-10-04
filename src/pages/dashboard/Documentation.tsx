import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, Activity, Building2, Users, Plug, FileText, Shield, Database } from "lucide-react";

export default function Documentation() {
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display">Документація продукту</h1>
        <p className="text-muted-foreground text-lg mt-2">
          Повний опис функціоналу та бізнес-логіки DocuMinds
        </p>
      </div>

      {/* Product Documentation */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Функціонал системи</CardTitle>
              <CardDescription>Детальний опис всіх можливостей платформи</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="overview">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Огляд системи
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p><strong>DocuMinds</strong> - це платформа для централізованого управління доступом до корпоративних ресурсів.</p>
                <p><strong>Основна мета:</strong> Автоматизація управління правами доступу співробітників до документів, баз даних та інтегрованих сервісів (Notion, Google Drive, SharePoint тощо).</p>
                <p><strong>Ключова перевага:</strong> Єдина точка контролю для всіх корпоративних ресурсів з детальним аудитом.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="organizations">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Організації
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p><strong>Що це:</strong> Кожна компанія в системі - це окрема організація з власними налаштуваннями.</p>
                <p><strong>Функціонал:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Управління профілем організації (назва, домен, slug)</li>
                  <li>Налаштування плану підписки (Starter, Professional, Enterprise)</li>
                  <li>Статус організації (активна/заблокована)</li>
                  <li>Автоматичне створення при реєстрації першого користувача</li>
                </ul>
                <p><strong>Бізнес-логіка:</strong> Організація створюється автоматично при реєстрації, перший користувач стає власником (owner).</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="users">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Користувачі та ролі
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p><strong>Ролі користувачів:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Owner</strong> - повний контроль над організацією</li>
                  <li><strong>Admin</strong> - управління користувачами та ресурсами</li>
                  <li><strong>User</strong> - стандартний доступ до ресурсів</li>
                </ul>
                <p><strong>Функціонал:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Запрошення нових користувачів через email</li>
                  <li>Управління членами організації</li>
                  <li>Профілі з ім'ям, прізвищем, email, компанією</li>
                  <li>Система ролей для розмежування прав</li>
                  <li>Параметр requires_onboarding для онбордингу</li>
                </ul>
                <p><strong>Бізнес-логіка:</strong> Адміністратор може запросити користувача, який отримує email з посиланням для реєстрації.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="groups">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Групи доступу
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p><strong>Що це:</strong> Логічне об'єднання користувачів для спрощення управління правами доступу.</p>
                <p><strong>Приклади груп:</strong> "Розробники", "Відділ продажів", "HR департамент", "Керівництво"</p>
                <p><strong>Функціонал:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Створення груп з назвою та описом</li>
                  <li>Додавання/видалення членів групи</li>
                  <li>Призначення прав доступу на рівні групи</li>
                  <li>Автоматичний аудит змін у групах</li>
                </ul>
                <p><strong>Бізнес-логіка:</strong> Замість надання прав кожному користувачу окремо, створюються групи з певними правами.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="roles">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Кастомні ролі організації
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p><strong>Що це:</strong> Власні ролі організації з налаштовуваними правами.</p>
                <p><strong>Функціонал:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Створення кастомних ролей (назва, опис, права)</li>
                  <li>Призначення ролей користувачам</li>
                  <li>Гнучка система прав доступу</li>
                  <li>Аудит змін ролей</li>
                </ul>
                <p><strong>Бізнес-логіка:</strong> Організація може створювати власні ролі окрім базових Owner/Admin/User.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="integrations">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Plug className="h-5 w-5 text-primary" />
                  Інтеграції
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p><strong>Підтримувані платформи:</strong> Notion, Google Drive, SharePoint, Confluence</p>
                <p><strong>Функціонал:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>OAuth 2.0 авторизація для підключення сервісів</li>
                  <li>Збереження токенів доступу та refresh токенів</li>
                  <li>Автоматичне оновлення токенів</li>
                  <li>Статуси: active, expired, revoked</li>
                  <li>Синхронізація ресурсів з зовнішніх систем</li>
                </ul>
                <p><strong>Бізнес-логіка:</strong> Адміністратор підключає інтеграцію через OAuth, система автоматично синхронізує ресурси.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="resources">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Ресурси
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p><strong>Що це:</strong> Документи, бази даних, файли з інтегрованих систем або створені вручну.</p>
                <p><strong>Типи ресурсів:</strong> document, database, folder, file, page, workspace</p>
                <p><strong>Функціонал:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Додавання ресурсів вручну або через синхронізацію</li>
                  <li>Прив'язка до інтеграції</li>
                  <li>URL для швидкого доступу</li>
                  <li>Метадані з зовнішніх систем</li>
                  <li>Управління правами доступу на кожен ресурс</li>
                </ul>
                <p><strong>Бізнес-логіка:</strong> Ресурси можуть синхронізуватися автоматично (Notion pages) або додаватися адміністратором вручну.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="permissions">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Матриця доступу
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p><strong>Що це:</strong> Система управління правами доступу для ресурсів.</p>
                <p><strong>Рівні доступу:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>read</strong> - перегляд ресурсу</li>
                  <li><strong>write</strong> - редагування</li>
                  <li><strong>admin</strong> - повний контроль</li>
                </ul>
                <p><strong>Функціонал:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Призначення прав окремим користувачам</li>
                  <li>Призначення прав цілим групам</li>
                  <li>Візуалізація матриці доступу</li>
                  <li>Швидкий пошук по правах</li>
                </ul>
                <p><strong>Бізнес-логіка:</strong> Адміністратор налаштовує права: або конкретному користувачу, або групі користувачів відразу.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="audit">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Аудит подій
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p><strong>Що це:</strong> Повний журнал всіх дій у системі для безпеки та комплаєнсу.</p>
                <p><strong>Відстежувані події:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Створення/видалення користувачів</li>
                  <li>Зміни в групах та ролях</li>
                  <li>Додавання/видалення ресурсів</li>
                  <li>Зміни прав доступу</li>
                  <li>Підключення/відключення інтеграцій</li>
                  <li>Логіни та аутентифікація</li>
                </ul>
                <p><strong>Дані логів:</strong> хто, що, коли, деталі зміни (old/new значення)</p>
                <p><strong>Бізнес-логіка:</strong> Автоматичне логування через тригери бази даних, можливість фільтрації та пошуку.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="api">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  API для інтеграції
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p><strong>Що це:</strong> REST API для інтеграції зовнішніх MSP систем з DocuMinds.</p>
                <p><strong>Основні ендпоінти:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>validate-api-token</strong> - перевірка валідності API токена</li>
                  <li><strong>sync-notion-resources</strong> - синхронізація ресурсів Notion</li>
                  <li><strong>oauth-callback</strong> - обробка OAuth авторизації</li>
                  <li><strong>oauth-refresh</strong> - оновлення токенів</li>
                </ul>
                <p><strong>Аутентифікація:</strong> Service Role Key для серверних запитів</p>
                <p><strong>Бізнес-логіка:</strong> MSP сервер витягує дані через Supabase API, формує запити до DocuMinds для синхронізації.</p>
                <p className="mt-3 p-3 bg-secondary/50 rounded-lg">
                  <strong>Детальна документація:</strong> Див. файл INTEGRATION_API_DOCS.md в корені проєкту
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="super-admin">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Суперадміністратор
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p><strong>Що це:</strong> Глобальний адміністратор платформи з доступом до всіх організацій.</p>
                <p><strong>Функціонал:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Перегляд всіх організацій в системі</li>
                  <li>Блокування/розблокування організацій</li>
                  <li>Загальна аналітика по всій платформі</li>
                  <li>Управління користувачами всіх організацій</li>
                  <li>Перегляд аудиту по всіх організаціях</li>
                  <li>Управління інтеграціями на глобальному рівні</li>
                </ul>
                <p><strong>Доступ:</strong> /admin/* routes, окрема панель з захищеним входом</p>
                <p><strong>Бізнес-логіка:</strong> Використовується операторами платформи для технічної підтримки та моніторингу.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}