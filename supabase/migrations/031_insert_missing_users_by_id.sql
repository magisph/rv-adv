INSERT INTO public.users (auth_id, email, full_name, role)
SELECT seed.auth_id, seed.email, seed.full_name, seed.role
FROM (
  VALUES
    ('e3e635bb-1571-4c6a-a111-2a1a7374d0cc'::uuid, 'rafaela@rvadv.local', 'Rafaela', 'admin'),
    ('e550b8ba-d032-46a0-a466-210ebe85d2a3'::uuid, 'suzana@rvadv.local', 'Suzana', 'secretaria'),
    ('c26681ce-1f2f-4491-945e-3ba3c82c4516'::uuid, 'assist@rvadv.local', 'Assistente', 'assistente')
) AS seed(auth_id, email, full_name, role)
WHERE EXISTS (
  SELECT 1
  FROM auth.users auth_user
  WHERE auth_user.id = seed.auth_id
)
ON CONFLICT (auth_id) DO UPDATE 
SET full_name = EXCLUDED.full_name, 
    role = EXCLUDED.role;
