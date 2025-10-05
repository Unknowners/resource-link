-- SQL Script to create test projects based on Ukrainian construction companies
-- and assign them to existing users

-- Create test construction projects
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

  -- Insert construction projects
  INSERT INTO projects (organization_id, name, slug, description, status) VALUES
  (v_org_id, 'ЖК Покровський Посад', 'zhk-pokrovskyi-posad', 'Елітний житловий комплекс на Подолі в центрі Києва. Преміум-клас з сучасною архітектурою та розвиненою інфраструктурою.', 'active'),
  (v_org_id, 'ЖК Централ Парк', 'zhk-central-park', 'Готові квартири на Печерську з розстрочкою без відсотків. Високі будинки з елементами паркової архітектури.', 'active'),
  (v_org_id, 'ЖК Олімпік Парк', 'zhk-olimpik-park', 'Сучасний житловий комплекс зі спортивною концепцією. Панорамні види та розвинена спортивна інфраструктура.', 'active'),
  (v_org_id, 'ЖК Чайка', 'zhk-chayka', 'Житловий комплекс з концепцією "Місто в місті". Кращий житловий масив року 2019. Повний цикл інфраструктури.', 'active'),
  (v_org_id, 'Проект Відбудови Житла', 'proekt-vidbudovy-zhytla', 'Програма відновлення житлового фонду України. Сучасні технології та енергоефективні рішення.', 'active'),
  (v_org_id, 'Бізнес-Центр Горизонт', 'biznes-tsentr-horyzont', 'Сучасний офісний комплекс класу А з підземним паркінгом та конференц-залами.', 'active'),
  (v_org_id, 'ЖК Прем''єр Тауер', 'zhk-premier-tauer', 'Багатофункціональний комплекс з апартаментами, офісами та комерційними приміщеннями.', 'active'),
  (v_org_id, 'ЖК Зелений Квартал', 'zhk-zelenyi-kvartal', 'Екологічний житловий комплекс з великою зеленою зоною та дитячими майданчиками.', 'active'),
  (v_org_id, 'Торгово-Розважальний Центр Аврора', 'trts-avrora', 'Сучасний ТРЦ з кінотеатром, боулінгом та понад 200 магазинами різних брендів.', 'active'),
  (v_org_id, 'Реконструкція Історичного Центру', 'rekonstruktsiya-istorychnoho-tsentru', 'Проект відновлення та модернізації історичних будівель з збереженням архітектурної спадщини.', 'active')
  RETURNING id INTO v_project_id;

  -- Get all created project IDs
  SELECT ARRAY_AGG(id) INTO v_project_ids
  FROM projects
  WHERE organization_id = v_org_id
  AND slug IN (
    'zhk-pokrovskyi-posad', 'zhk-central-park', 'zhk-olimpik-park',
    'zhk-chayka', 'proekt-vidbudovy-zhytla', 'biznes-tsentr-horyzont',
    'zhk-premier-tauer', 'zhk-zelenyi-kvartal', 'trts-avrora',
    'rekonstruktsiya-istorychnoho-tsentru'
  );

  -- Get all user IDs from the organization
  SELECT ARRAY_AGG(user_id) INTO v_user_ids
  FROM organization_members
  WHERE organization_id = v_org_id;

  RAISE NOTICE 'Created % projects', ARRAY_LENGTH(v_project_ids, 1);
  RAISE NOTICE 'Found % users', ARRAY_LENGTH(v_user_ids, 1);

  -- Assign projects to users (each user gets 2-4 random projects)
  FOR i IN 1..ARRAY_LENGTH(v_user_ids, 1) LOOP
    v_user_id := v_user_ids[i];
    
    -- Assign 2-4 random projects to each user
    FOR v_project_id IN (
      SELECT unnest(v_project_ids)
      ORDER BY RANDOM()
      LIMIT 2 + FLOOR(RANDOM() * 3)::INT
    ) LOOP
      -- Insert user-project assignment
      INSERT INTO user_projects (user_id, project_id, organization_id)
      VALUES (v_user_id, v_project_id, v_org_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Assigned projects to user: %', v_user_id;
  END LOOP;

  RAISE NOTICE 'Successfully created test projects and assigned them to users!';
END $$;

-- Verify the results
SELECT 
  p.name AS project_name,
  COUNT(up.user_id) AS assigned_users
FROM projects p
LEFT JOIN user_projects up ON p.id = up.project_id
WHERE p.organization_id IN (SELECT organization_id FROM organization_members LIMIT 1)
GROUP BY p.id, p.name
ORDER BY p.name;
