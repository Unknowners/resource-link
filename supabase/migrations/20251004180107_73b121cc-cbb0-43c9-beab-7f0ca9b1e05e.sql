-- Створення таблиць для системи посад з ієрархією та матеріалами для онбордингу

-- Посади в організації (розробник, бекенд розробник, тощо)
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, slug)
);

-- Closure table для ієрархії посад
CREATE TABLE IF NOT EXISTS public.position_hierarchy (
  organization_id UUID NOT NULL,
  ancestor_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  descendant_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  depth INTEGER NOT NULL CHECK (depth >= 0),
  PRIMARY KEY (organization_id, ancestor_id, descendant_id)
);

-- Явні зв'язки батько-дитина
CREATE TABLE IF NOT EXISTS public.position_edges (
  organization_id UUID NOT NULL,
  parent_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  PRIMARY KEY (organization_id, parent_id, child_id)
);

-- Призначення посад користувачам
CREATE TABLE IF NOT EXISTS public.user_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, position_id)
);

-- Матеріали для онбордингу
CREATE TABLE IF NOT EXISTS public.onboarding_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  bucket TEXT NOT NULL DEFAULT 'onboarding',
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, bucket, file_path)
);

-- Прив'язка матеріалів до посад
CREATE TABLE IF NOT EXISTS public.position_materials (
  organization_id UUID NOT NULL,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.onboarding_materials(id) ON DELETE CASCADE,
  PRIMARY KEY (organization_id, position_id, material_id)
);

-- Тригер для автоматичного додавання самопосилання в closure table
CREATE OR REPLACE FUNCTION public.position_self_closure()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.position_hierarchy (organization_id, ancestor_id, descendant_id, depth)
  VALUES (NEW.organization_id, NEW.id, NEW.id, 0)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_position_self_closure ON public.positions;
CREATE TRIGGER trg_position_self_closure
AFTER INSERT ON public.positions
FOR EACH ROW EXECUTE FUNCTION public.position_self_closure();

-- Тригер для розширення closure table при додаванні ребра
CREATE OR REPLACE FUNCTION public.position_edges_expand_closure()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.position_hierarchy (organization_id, ancestor_id, descendant_id, depth)
  SELECT
    NEW.organization_id,
    a.ancestor_id,
    d.descendant_id,
    a.depth + d.depth + 1
  FROM public.position_hierarchy a
  JOIN public.position_hierarchy d
    ON d.organization_id = NEW.organization_id 
    AND d.ancestor_id = NEW.child_id
  WHERE a.organization_id = NEW.organization_id 
    AND a.descendant_id = NEW.parent_id
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_position_edges_expand ON public.position_edges;
CREATE TRIGGER trg_position_edges_expand
AFTER INSERT ON public.position_edges
FOR EACH ROW EXECUTE FUNCTION public.position_edges_expand_closure();

-- Тригер для оновлення updated_at
DROP TRIGGER IF EXISTS update_positions_updated_at ON public.positions;
CREATE TRIGGER update_positions_updated_at
BEFORE UPDATE ON public.positions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_onboarding_materials_updated_at ON public.onboarding_materials;
CREATE TRIGGER update_onboarding_materials_updated_at
BEFORE UPDATE ON public.onboarding_materials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Створення Storage bucket для матеріалів
INSERT INTO storage.buckets (id, name, public)
VALUES ('onboarding', 'onboarding', false)
ON CONFLICT (id) DO NOTHING;

-- RLS політики
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_materials ENABLE ROW LEVEL SECURITY;

-- Positions: читання для членів організації
CREATE POLICY "Members can view positions"
ON public.positions FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org owners can manage positions"
ON public.positions FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- Position hierarchy: читання для членів
CREATE POLICY "Members can view hierarchy"
ON public.position_hierarchy FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Position edges: читання для членів, керування для власників
CREATE POLICY "Members can view edges"
ON public.position_edges FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org owners can manage edges"
ON public.position_edges FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- User positions: користувачі бачать призначення в своїй організації
CREATE POLICY "Members can view user positions"
ON public.user_positions FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org owners can manage user positions"
ON public.user_positions FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- Onboarding materials: користувачі бачать матеріали своїх посад + батьківських
CREATE POLICY "Users can view materials via position inheritance"
ON public.onboarding_materials FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM public.position_materials pm
    JOIN public.position_hierarchy ph
      ON ph.organization_id = pm.organization_id
      AND ph.ancestor_id = pm.position_id
    JOIN public.user_positions up
      ON up.organization_id = pm.organization_id
      AND up.user_id = auth.uid()
      AND up.position_id = ph.descendant_id
    WHERE pm.material_id = onboarding_materials.id
      AND pm.organization_id = onboarding_materials.organization_id
  )
);

CREATE POLICY "Org owners can manage materials"
ON public.onboarding_materials FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- Position materials: читання для членів, керування для власників
CREATE POLICY "Members can view position materials"
ON public.position_materials FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org owners can manage position materials"
ON public.position_materials FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- Storage RLS: доступ до файлів через матеріали
CREATE POLICY "Users can view onboarding files via materials"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'onboarding'
  AND EXISTS (
    SELECT 1
    FROM public.onboarding_materials m
    JOIN public.position_materials pm ON pm.material_id = m.id
    JOIN public.position_hierarchy ph ON ph.ancestor_id = pm.position_id
    JOIN public.user_positions up ON up.position_id = ph.descendant_id
    WHERE m.file_path = storage.objects.name
      AND up.user_id = auth.uid()
  )
);

CREATE POLICY "Org owners can upload onboarding files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'onboarding'
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.role = 'owner'
  )
);

CREATE POLICY "Org owners can delete onboarding files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'onboarding'
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.role = 'owner'
  )
);