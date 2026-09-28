-- APLICADA el 28-sep-2026.
-- Retira el login propio por RPC y la tabla `usuarios` con los hashes bcrypt cuyas contraseñas
-- estuvieron expuestas en el historial público de git.
-- Ejecutar SOLO después de que la migración 04 esté aplicada y el nuevo frontend desplegado.
-- Los usuarios del piloto se reasignan desde el panel de administración cuando se registren
-- con Supabase Auth (ver docs/OPERACION.md).
drop function if exists public.login_usuario(text, text);
drop function if exists public.crear_usuario(text, text, text, text, text, text, text);
drop function if exists public.actualizar_usuario(text, text, text, text, text, text);
drop function if exists public.listar_usuarios();
drop table if exists public.usuarios;
