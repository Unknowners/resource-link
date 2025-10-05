-- Скрипт для створення тестових посад та матеріалів ІТ компанії

-- Отримати ID організації (змініть на свій)
DO $$
DECLARE
  v_org_id UUID;
  v_ceo_id UUID;
  v_cto_id UUID;
  v_eng_manager_id UUID;
  v_senior_dev_id UUID;
  v_middle_dev_id UUID;
  v_junior_dev_id UUID;
  v_qa_lead_id UUID;
  v_qa_eng_id UUID;
  v_devops_lead_id UUID;
  v_devops_eng_id UUID;
  v_cpo_id UUID;
  v_pm_id UUID;
  v_designer_id UUID;
  v_hr_head_id UUID;
  v_hr_manager_id UUID;
  
  v_mat1_id UUID;
  v_mat2_id UUID;
  v_mat3_id UUID;
  v_mat4_id UUID;
  v_mat5_id UUID;
  v_mat6_id UUID;
BEGIN
  -- Отримати першу організацію
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Організацію не знайдено';
  END IF;

  RAISE NOTICE 'Використовую організацію: %', v_org_id;

  -- Видалити існуючі тестові дані (опційно)
  DELETE FROM position_materials WHERE organization_id = v_org_id;
  DELETE FROM position_edges WHERE organization_id = v_org_id;
  DELETE FROM user_positions WHERE organization_id = v_org_id;
  DELETE FROM onboarding_materials WHERE organization_id = v_org_id;
  DELETE FROM positions WHERE organization_id = v_org_id;

  -- === СТВОРЕННЯ ПОСАД ===
  
  -- CEO (вершина дерева)
  INSERT INTO positions (organization_id, name, slug, description)
  VALUES (v_org_id, 'CEO', 'ceo', 'Chief Executive Officer - керівник компанії')
  RETURNING id INTO v_ceo_id;

  -- CTO 
  INSERT INTO positions (organization_id, name, slug, description)
  VALUES (v_org_id, 'CTO', 'cto', 'Chief Technology Officer - технічний директор')
  RETURNING id INTO v_cto_id;

  -- Engineering Manager
  INSERT INTO positions (organization_id, name, slug, description)
  VALUES (v_org_id, 'Engineering Manager', 'engineering-manager', 'Керівник інженерної команди')
  RETURNING id INTO v_eng_manager_id;

  -- Senior Developer
  INSERT INTO positions (organization_id, name, slug, description)
  VALUES (v_org_id, 'Senior Developer', 'senior-developer', 'Старший розробник')
  RETURNING id INTO v_senior_dev_id;

  -- Middle Developer
  INSERT INTO positions (organization_id, name, slug, description)
  VALUES (v_org_id, 'Middle Developer', 'middle-developer', 'Розробник середнього рівня')
  RETURNING id INTO v_middle_dev_id;

  -- Junior Developer
  INSERT INTO positions (organization_id, name, slug, description)
  VALUES (v_org_id, 'Junior Developer', 'junior-developer', 'Молодший розробник')
  RETURNING id INTO v_junior_dev_id;

  -- QA Lead
  INSERT INTO positions (organization_id, name, slug, description)
  VALUES (v_org_id, 'QA Lead', 'qa-lead', 'Керівник тестування')
  RETURNING id INTO v_qa_lead_id;

  -- QA Engineer
  INSERT INTO positions (organization_id, name, slug, description)
  VALUES (v_org_id, 'QA Engineer', 'qa-engineer', 'Інженер з тестування')
  RETURNING id INTO v_qa_eng_id;

  -- DevOps Lead
  INSERT INTO positions (organization_id, name, slug, description)
  VALUES (v_org_id, 'DevOps Lead', 'devops-lead', 'Керівник DevOps')
  RETURNING id INTO v_devops_lead_id;

  -- DevOps Engineer
  INSERT INTO positions (organization_id, name, slug, description)
  VALUES (v_org_id, 'DevOps Engineer', 'devops-engineer', 'DevOps інженер')
  RETURNING id INTO v_devops_eng_id;

  -- CPO
  INSERT INTO positions (organization_id, name, slug, description)
  VALUES (v_org_id, 'CPO', 'cpo', 'Chief Product Officer - директор з продукту')
  RETURNING id INTO v_cpo_id;

  -- Product Manager
  INSERT INTO positions (organization_id, name, slug, description)
  VALUES (v_org_id, 'Product Manager', 'product-manager', 'Менеджер продукту')
  RETURNING id INTO v_pm_id;

  -- UX/UI Designer
  INSERT INTO positions (organization_id, name, slug, description)
  VALUES (v_org_id, 'UX/UI Designer', 'ux-ui-designer', 'Дизайнер інтерфейсів')
  RETURNING id INTO v_designer_id;

  -- Head of HR
  INSERT INTO positions (organization_id, name, slug, description)
  VALUES (v_org_id, 'Head of HR', 'head-of-hr', 'Керівник HR')
  RETURNING id INTO v_hr_head_id;

  -- HR Manager
  INSERT INTO positions (organization_id, name, slug, description)
  VALUES (v_org_id, 'HR Manager', 'hr-manager', 'HR менеджер')
  RETURNING id INTO v_hr_manager_id;

  -- === СТВОРЕННЯ ІЄРАРХІЇ (дерево посад) ===
  
  -- CTO під CEO
  INSERT INTO position_edges (organization_id, parent_id, child_id)
  VALUES (v_org_id, v_ceo_id, v_cto_id);

  -- Engineering Manager під CTO
  INSERT INTO position_edges (organization_id, parent_id, child_id)
  VALUES (v_org_id, v_cto_id, v_eng_manager_id);

  -- Senior Developer під Engineering Manager
  INSERT INTO position_edges (organization_id, parent_id, child_id)
  VALUES (v_org_id, v_eng_manager_id, v_senior_dev_id);

  -- Middle Developer під Senior Developer
  INSERT INTO position_edges (organization_id, parent_id, child_id)
  VALUES (v_org_id, v_senior_dev_id, v_middle_dev_id);

  -- Junior Developer під Middle Developer
  INSERT INTO position_edges (organization_id, parent_id, child_id)
  VALUES (v_org_id, v_middle_dev_id, v_junior_dev_id);

  -- QA Lead під CTO
  INSERT INTO position_edges (organization_id, parent_id, child_id)
  VALUES (v_org_id, v_cto_id, v_qa_lead_id);

  -- QA Engineer під QA Lead
  INSERT INTO position_edges (organization_id, parent_id, child_id)
  VALUES (v_org_id, v_qa_lead_id, v_qa_eng_id);

  -- DevOps Lead під CTO
  INSERT INTO position_edges (organization_id, parent_id, child_id)
  VALUES (v_org_id, v_cto_id, v_devops_lead_id);

  -- DevOps Engineer під DevOps Lead
  INSERT INTO position_edges (organization_id, parent_id, child_id)
  VALUES (v_org_id, v_devops_lead_id, v_devops_eng_id);

  -- CPO під CEO
  INSERT INTO position_edges (organization_id, parent_id, child_id)
  VALUES (v_org_id, v_ceo_id, v_cpo_id);

  -- Product Manager під CPO
  INSERT INTO position_edges (organization_id, parent_id, child_id)
  VALUES (v_org_id, v_cpo_id, v_pm_id);

  -- Designer під CPO
  INSERT INTO position_edges (organization_id, parent_id, child_id)
  VALUES (v_org_id, v_cpo_id, v_designer_id);

  -- Head of HR під CEO
  INSERT INTO position_edges (organization_id, parent_id, child_id)
  VALUES (v_org_id, v_ceo_id, v_hr_head_id);

  -- HR Manager під Head of HR
  INSERT INTO position_edges (organization_id, parent_id, child_id)
  VALUES (v_org_id, v_hr_head_id, v_hr_manager_id);

  -- === СТВОРЕННЯ МАТЕРІАЛІВ ДЛЯ ОНБОРДИНГУ ===
  
  -- Матеріал 1: Загальна інформація про компанію
  INSERT INTO onboarding_materials (
    organization_id, 
    title, 
    description, 
    file_name, 
    file_path,
    mime_type,
    size_bytes
  )
  VALUES (
    v_org_id,
    'Вітальний гайд для нових співробітників',
    'Загальна інформація про компанію, культуру та цінності',
    'welcome-guide.pdf',
    v_org_id || '/general/welcome-guide.pdf',
    'application/pdf',
    1024000
  )
  RETURNING id INTO v_mat1_id;

  -- Матеріал 2: Технічний стек
  INSERT INTO onboarding_materials (
    organization_id, 
    title, 
    description, 
    file_name, 
    file_path,
    mime_type,
    size_bytes
  )
  VALUES (
    v_org_id,
    'Наш технічний стек',
    'Технології та інструменти, які ми використовуємо',
    'tech-stack.pdf',
    v_org_id || '/tech/tech-stack.pdf',
    'application/pdf',
    2048000
  )
  RETURNING id INTO v_mat2_id;

  -- Матеріал 3: Coding standards
  INSERT INTO onboarding_materials (
    organization_id, 
    title, 
    description, 
    file_name, 
    file_path,
    mime_type,
    size_bytes
  )
  VALUES (
    v_org_id,
    'Стандарти коду та best practices',
    'Правила написання коду в нашій команді',
    'coding-standards.pdf',
    v_org_id || '/dev/coding-standards.pdf',
    'application/pdf',
    1536000
  )
  RETURNING id INTO v_mat3_id;

  -- Матеріал 4: QA процеси
  INSERT INTO onboarding_materials (
    organization_id, 
    title, 
    description, 
    file_name, 
    file_path,
    mime_type,
    size_bytes
  )
  VALUES (
    v_org_id,
    'Процеси тестування та QA',
    'Як ми тестуємо продукти',
    'qa-processes.pdf',
    v_org_id || '/qa/qa-processes.pdf',
    'application/pdf',
    1792000
  )
  RETURNING id INTO v_mat4_id;

  -- Матеріал 5: DevOps інфраструктура
  INSERT INTO onboarding_materials (
    organization_id, 
    title, 
    description, 
    file_name, 
    file_path,
    mime_type,
    size_bytes
  )
  VALUES (
    v_org_id,
    'DevOps інфраструктура та CI/CD',
    'Наша інфраструктура та процеси деплою',
    'devops-infra.pdf',
    v_org_id || '/devops/devops-infra.pdf',
    'application/pdf',
    2560000
  )
  RETURNING id INTO v_mat5_id;

  -- Матеріал 6: Product management
  INSERT INTO onboarding_materials (
    organization_id, 
    title, 
    description, 
    file_name, 
    file_path,
    mime_type,
    size_bytes
  )
  VALUES (
    v_org_id,
    'Product management процеси',
    'Як ми створюємо та розвиваємо продукти',
    'product-management.pdf',
    v_org_id || '/product/product-management.pdf',
    'application/pdf',
    1280000
  )
  RETURNING id INTO v_mat6_id;

  -- === ЗВ'ЯЗУВАННЯ МАТЕРІАЛІВ З ПОСАДАМИ ===
  -- (Матеріали успадковуються вниз по ієрархії)

  -- Загальний матеріал для всіх (CEO - на вершині)
  INSERT INTO position_materials (organization_id, position_id, material_id)
  VALUES (v_org_id, v_ceo_id, v_mat1_id);

  -- Технічний стек для CTO (успадковується на всіх технічних)
  INSERT INTO position_materials (organization_id, position_id, material_id)
  VALUES (v_org_id, v_cto_id, v_mat2_id);

  -- Coding standards для Senior Developer (успадковується вниз)
  INSERT INTO position_materials (organization_id, position_id, material_id)
  VALUES (v_org_id, v_senior_dev_id, v_mat3_id);

  -- QA процеси для QA Lead
  INSERT INTO position_materials (organization_id, position_id, material_id)
  VALUES (v_org_id, v_qa_lead_id, v_mat4_id);

  -- DevOps для DevOps Lead
  INSERT INTO position_materials (organization_id, position_id, material_id)
  VALUES (v_org_id, v_devops_lead_id, v_mat5_id);

  -- Product management для CPO
  INSERT INTO position_materials (organization_id, position_id, material_id)
  VALUES (v_org_id, v_cpo_id, v_mat6_id);

  RAISE NOTICE 'Успішно створено 15 посад, 6 матеріалів та налаштовано ієрархію!';
  RAISE NOTICE 'Структура дерева:';
  RAISE NOTICE '  CEO';
  RAISE NOTICE '    ├── CTO';
  RAISE NOTICE '    │   ├── Engineering Manager';
  RAISE NOTICE '    │   │   └── Senior Developer';
  RAISE NOTICE '    │   │       └── Middle Developer';
  RAISE NOTICE '    │   │           └── Junior Developer';
  RAISE NOTICE '    │   ├── QA Lead';
  RAISE NOTICE '    │   │   └── QA Engineer';
  RAISE NOTICE '    │   └── DevOps Lead';
  RAISE NOTICE '    │       └── DevOps Engineer';
  RAISE NOTICE '    ├── CPO';
  RAISE NOTICE '    │   ├── Product Manager';
  RAISE NOTICE '    │   └── UX/UI Designer';
  RAISE NOTICE '    └── Head of HR';
  RAISE NOTICE '        └── HR Manager';
END $$;