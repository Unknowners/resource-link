-- SQL Script to create test projects based on Universe Group IT products
-- and assign them to existing users

-- Universe Group is a Ukrainian product IT company with businesses:
-- 1. Guru Apps - Mobile utilities and AI apps (Scan Guru, Translator Guru, Cleaner Guru, Assist)
-- 2. FORMA - Online document management services (PDF Guru)
-- 3. Wisey - Personal productivity services
-- 4. R&D Center - Innovation lab

DO $$
DECLARE
  v_org_id UUID;
  v_project_ids UUID[];
  v_user_ids UUID[];
  v_project_id UUID;
  v_user_id UUID;
  i INT;
BEGIN
  -- Get the first organization ID
  SELECT organization_id INTO v_org_id
  FROM organization_members
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'No organization found. Please create an organization first.';
    RETURN;
  END IF;

  RAISE NOTICE 'Using organization: %', v_org_id;

  -- Insert Universe Group IT projects
  INSERT INTO projects (organization_id, name, slug, description, status) VALUES
  (v_org_id, 'Scan Guru', 'scan-guru', 'Провідний мобільний додаток для сканування документів з AI-функціями. Топ-5 у своїй ніші в App Store з рейтингом 4.6. Частина Guru Apps бізнесу.', 'active'),
  (v_org_id, 'Translator Guru', 'translator-guru', 'AI-перекладач з підтримкою понад 100 мов. Миттєвий переклад тексту, голосу та зображень. Понад 100М+ завантажень.', 'active'),
  (v_org_id, 'Cleaner Guru', 'cleaner-guru', 'Утиліта для оптимізації та очищення пристроїв. Звільнення пам''яті та прискорення роботи телефону. Рейтинг 4.6 в App Store.', 'active'),
  (v_org_id, 'Assist AI', 'assist-ai', 'Персональний AI-асистент для повсякденних завдань. Інтеграція з GPT-4 для розумних відповідей та автоматизації робочих процесів.', 'active'),
  (v_org_id, 'Visify', 'visify', 'AI-редактор для створення контенту з фото. Нова розробка Universe Group для iOS з передовими AI-технологіями обробки зображень.', 'active'),
  (v_org_id, 'PDF Guru', 'pdf-guru', 'Онлайн-сервіс для роботи з документами. 100+ млн файлів на рік, підтримка понад 100 інструментів управління документами. Рейтинг Trustpilot 4.1.', 'active'),
  (v_org_id, 'FORMA Platform', 'forma-platform', 'Веб-платформа для професійної роботи з документами. Використовується в 150+ країнах світу. Власні AI-технології для максимальної якості сервісу.', 'active'),
  (v_org_id, 'Wisey Learning Platform', 'wisey-learning-platform', 'Веб-платформа для підвищення особистої продуктивності. 300К+ студентів з Tier-1 країн, понад 30 розроблених курсів.', 'active'),
  (v_org_id, 'Wisey Mobile Ecosystem', 'wisey-mobile-ecosystem', 'Екосистема з 4 мобільних додатків для навчання та розвитку. Курси розроблені за участю експертів UC Berkeley та фахівців з поведінкової психології.', 'active'),
  (v_org_id, 'R&D Innovation Lab', 'rnd-innovation-lab', 'Внутрішня інноваційна лабораторія для тестування нових продуктів та їх розвитку у глобальні лідери. In-house R&D значно прискорює зростання бізнесу.', 'active'),
  (v_org_id, 'Guru Apps Analytics', 'guru-apps-analytics', 'Платформа аналітики для відстеження метрик продуктів Guru Apps. Моніторинг 100М+ користувачів з 186 країн світу в реальному часі.', 'active'),
  (v_org_id, 'FORMA Document AI', 'forma-document-ai', 'AI-движок для розпізнавання та обробки документів. Машинне навчання для автоматичного розпізнавання структури та змісту документів.', 'active')
  ON CONFLICT DO NOTHING;

  -- Get all created project IDs
  SELECT ARRAY_AGG(id) INTO v_project_ids
  FROM projects
  WHERE organization_id = v_org_id
  AND slug IN (
    'scan-guru', 'translator-guru', 'cleaner-guru', 'assist-ai', 'visify',
    'pdf-guru', 'forma-platform', 'wisey-learning-platform', 'wisey-mobile-ecosystem',
    'rnd-innovation-lab', 'guru-apps-analytics', 'forma-document-ai'
  );

  -- Get all user IDs from the organization
  SELECT ARRAY_AGG(user_id) INTO v_user_ids
  FROM organization_members
  WHERE organization_id = v_org_id;

  RAISE NOTICE 'Created % projects', ARRAY_LENGTH(v_project_ids, 1);
  RAISE NOTICE 'Found % users', ARRAY_LENGTH(v_user_ids, 1);

  -- Assign projects to users (each user gets 3-5 random projects)
  FOR i IN 1..ARRAY_LENGTH(v_user_ids, 1) LOOP
    v_user_id := v_user_ids[i];
    
    -- Assign 3-5 random projects to each user
    FOR v_project_id IN (
      SELECT unnest(v_project_ids)
      ORDER BY RANDOM()
      LIMIT 3 + FLOOR(RANDOM() * 3)::INT
    ) LOOP
      -- Insert user-project assignment
      INSERT INTO user_projects (user_id, project_id, organization_id)
      VALUES (v_user_id, v_project_id, v_org_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Assigned projects to user: %', v_user_id;
  END LOOP;

  RAISE NOTICE 'Successfully created % Universe Group IT projects and assigned them to % users!',
    ARRAY_LENGTH(v_project_ids, 1),
    ARRAY_LENGTH(v_user_ids, 1);
END $$;

-- Verify the results
SELECT 
  p.name AS project_name,
  p.slug,
  COUNT(up.user_id) AS assigned_users,
  p.status
FROM projects p
LEFT JOIN user_projects up ON p.id = up.project_id
WHERE p.organization_id IN (SELECT organization_id FROM organization_members LIMIT 1)
GROUP BY p.id, p.name, p.slug, p.status
ORDER BY p.name;
