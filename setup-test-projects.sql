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

  -- Insert Universe Group IT projects based on real products from https://uni.tech/
  INSERT INTO projects (organization_id, name, slug, description, status) VALUES
  -- Guru Apps Business (100M+ downloads, 186 countries, avg 4.6 rating)
  (v_org_id, 'Scan Guru', 'scan-guru', 'Провідний мобільний додаток для сканування документів з AI. Топ-5 у своїй ніші в App Store, рейтинг 4.6. Понад 100M+ завантажень по всьому світу.', 'active'),
  (v_org_id, 'Translator Guru', 'translator-guru', 'AI-перекладач з підтримкою понад 100 мов та природного мовлення. Миттєвий переклад тексту, голосу та зображень. Частина Guru Apps з рейтингом 4.6.', 'active'),
  (v_org_id, 'Cleaner Guru', 'cleaner-guru', 'Утиліта для оптимізації пристроїв iOS. Звільнення пам''яті, видалення дублікатів та прискорення роботи. Рейтинг 4.6 в App Store.', 'active'),
  (v_org_id, 'Assist', 'assist', 'Персональний AI-асистент на базі передових мовних моделей. Інтеграція з GPT для розумних відповідей на будь-які питання та завдання.', 'active'),
  
  -- FORMA Business (100M+ files per year, 150+ countries, Trustpilot 4.1)
  (v_org_id, 'PDF Guru', 'pdf-guru', 'Онлайн-сервіс для роботи з PDF та іншими документами. 100+ млн файлів на рік, підтримка понад 100 інструментів. Trustpilot рейтинг 4.1.', 'active'),
  (v_org_id, 'FORMA Platform', 'forma-platform', 'Комплексна платформа для управління документами з власними AI-технологіями. Використовується професіоналами в 150+ країнах світу.', 'active'),
  
  -- Wisey Business (300K+ students from Tier-1 countries, 30+ courses)
  (v_org_id, 'Wisey', 'wisey', 'Сервіс для підвищення особистої продуктивності. Екосистема з 4 мобільних додатків та веб-платформи. Понад 300К студентів та 30+ розроблених курсів.', 'active'),
  
  -- R&D Center (in-house innovation lab)
  (v_org_id, 'R&D Innovation Lab', 'rnd-innovation-lab', 'Внутрішня інноваційна лабораторія Universe Group для тестування нових продуктів та їх розвитку у глобальні лідери. In-house R&D прискорює зростання бізнесу.', 'active')
  ON CONFLICT DO NOTHING;

  -- Get all created project IDs
  SELECT ARRAY_AGG(id) INTO v_project_ids
  FROM projects
  WHERE organization_id = v_org_id
  AND slug IN (
    'scan-guru', 'translator-guru', 'cleaner-guru', 'assist',
    'pdf-guru', 'forma-platform', 'wisey', 'rnd-innovation-lab'
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
