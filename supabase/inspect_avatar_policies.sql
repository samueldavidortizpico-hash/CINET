-- SOLO LECTURA. Ejecutar primero en SQL Editor del proyecto de CINET.
-- Revisar TODAS las policies: una regla general también puede afectar avatars.
select policyname, cmd, roles, permissive, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by cmd, policyname;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'avatars';

select relrowsecurity as rls_enabled
from pg_class where oid = 'storage.objects'::regclass;
