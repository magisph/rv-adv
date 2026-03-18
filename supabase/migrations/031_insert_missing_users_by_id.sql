INSERT INTO public.users (auth_id, email, full_name, role)
VALUES 
  ('e3e635bb-1571-4c6a-a111-2a1a7374d0cc', 'rafaela@rvadv.local', 'Rafaela', 'admin'),
  ('e550b8ba-d032-46a0-a466-210ebe85d2a3', 'suzana@rvadv.local', 'Suzana', 'secretaria'),
  ('c26681ce-1f2f-4491-945e-3ba3c82c4516', 'assist@rvadv.local', 'Assistente', 'assistente')
ON CONFLICT (auth_id) DO UPDATE 
SET full_name = EXCLUDED.full_name, 
    role = EXCLUDED.role;
