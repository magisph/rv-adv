-- ==========================================
-- 039_fix_foreign_keys.sql
-- Goal: Fix orphan records (ON DELETE SET NULL)
-- Description: Implement soft-delete for clients natively without view, 
-- returning NULL in a BEFORE DELETE trigger to cancel the real deletion,
-- and updating the RLS policies to respect deleted_at IS NULL.
-- ==========================================

-- 1. Add deleted_at to clients if it doesn't exist
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. Create the trigger function to handle BEFORE DELETE
CREATE OR REPLACE FUNCTION public.clients_soft_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark as deleted instead of actually deleting
  UPDATE public.clients 
  SET deleted_at = NOW() 
  WHERE id = OLD.id;
  
  -- Return NULL to cancel the physical deletion from the table
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach the trigger to clients table
DROP TRIGGER IF EXISTS tr_clients_soft_delete ON public.clients;

CREATE TRIGGER tr_clients_soft_delete
BEFORE DELETE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.clients_soft_delete_trigger();

-- 4. Recreate RLS policies for clients to add "deleted_at IS NULL" strict check
-- These overwrite the 037 ones specifically for the soft-deletable table.

DROP POLICY IF EXISTS clients_select_policy ON public.clients;
CREATE POLICY clients_select_policy ON public.clients 
FOR SELECT TO authenticated
USING (
  (auth.uid() = created_by OR (auth.jwt() ->> 'role')::text = 'admin')
  AND deleted_at IS NULL
);

DROP POLICY IF EXISTS clients_update_policy ON public.clients;
CREATE POLICY clients_update_policy ON public.clients 
FOR UPDATE TO authenticated
USING (
  (auth.uid() = created_by OR (auth.jwt() ->> 'role')::text = 'admin')
  AND deleted_at IS NULL
)
WITH CHECK (
  (auth.uid() = created_by OR (auth.jwt() ->> 'role')::text = 'admin')
  AND deleted_at IS NULL
);

-- Note: DELETE policy does not require deleted_at IS NULL since the trigger intercepts it anyway,
-- but for consistency it can also be restricted.
DROP POLICY IF EXISTS clients_delete_policy ON public.clients;
CREATE POLICY clients_delete_policy ON public.clients 
FOR DELETE TO authenticated
USING (
  (auth.uid() = created_by OR (auth.jwt() ->> 'role')::text = 'admin')
  AND deleted_at IS NULL
);
