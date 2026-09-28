# Guía de operación y puesta en producción

## Estado del backend (proyecto Supabase `auracare`)

| Migración | Estado | Contenido |
|---|---|---|
| 01 · auth, perfiles, helpers | ✅ aplicada | Tabla `perfiles`, esquema `private`, alta automática pendiente |
| 02 · esquema, rangos, dotación | ✅ aplicada | Columnas nuevas, `rangos_clinicos`, `elementos_dotacion`, hash de notas existentes |
| 03 · triggers de servidor | ✅ aplicada | Sellado de notas, alertas, límites, auditoría, inmutabilidad |
| 04a · RLS en tablas nuevas | ✅ aplicada | `alter table … enable row level security` |
| 04 · RLS por rol y sede | ✅ aplicada (28-sep-2026) | Elimina el acceso abierto `acceso_demo_*` y crea las políticas |
| 05 · retirar login legado | ✅ aplicada (28-sep-2026) | Borra `login_usuario`, `crear_usuario`, `actualizar_usuario`, `listar_usuarios` y la tabla `usuarios` |

> Estado de seguridad (28-sep-2026): sin políticas abiertas, `anon` sin acceso a tablas y sin el login legado. Único aviso pendiente del panel de Supabase: *Leaked password protection* (requiere plan Pro).

## Checklist para el lunes

1. **Aplicar migración 04** (arriba) y verificar en *Advisors → Security* que no queden alertas de RLS.
2. **Plan de Supabase**: pasar a **Pro** (sin pausa automática + respaldos diarios). El plan gratuito ya pausó este proyecto una vez y no respalda datos.
3. **Auth → Settings** (Supabase):
   - *Confirm email*: dejar **ON** solo si hay SMTP propio (el SMTP integrado envía ~2 correos/hora). Sin SMTP propio, desactivarlo: la aprobación del administrador sigue siendo el control de acceso.
   - *Minimum password length*: 10 · activar *Leaked password protection* (plan Pro).
   - *Site URL*: la URL final de GitHub Pages.
4. **Crear el primer SuperAdmin**: la persona entra a la app → *Solicitar Acceso* → crea su cuenta. Luego en SQL Editor:
   ```sql
   update public.perfiles set rol_id = 'superadmin', estado = 'activo', sede_id = '<sede>'
   where email = '<correo de la directora>';
   ```
   Desde ahí, el SuperAdmin aprueba al resto en **Gestión de Usuarios** (asigna rol, sede y jornada).
5. **Reasignar los usuarios del piloto**: cada persona se registra con su correo institucional y el SuperAdmin le asigna rol, sede y jornada según la lista que entrega el mantenedor (no se versiona aquí para no publicar datos de personal en un repositorio público).
6. **Limpiar datos de demostración** antes de cargar datos reales (4 residentes, 2 notas, 1 alerta, etc.). Las notas son inmutables por diseño; para borrarlas hay que deshabilitar el trigger explícitamente:
   ```sql
   alter table public.notas disable trigger notas_no_update_delete;
   -- borrar datos de demo (residentes 'r1'…'r4' y sus notas/alertas/asistencias/entregas/pertenencias)
   alter table public.notas enable trigger notas_no_update_delete;
   ```
   Hacerlo UNA vez, antes de la puesta en marcha, y con el equipo informado.
7. **Validación médica de rangos** (Configuración → Rangos clínicos generales) y **revisión jurídica** del texto de términos y tratamiento de datos.
8. **Prueba de humo con dos usuarios**: nota con signos críticos → aparece alerta en el otro equipo (tiempo real) → *Verificar integridad* → imprimir Sección 6.

## Operación diaria

- **Nuevo empleado**: se registra → SuperAdmin lo aprueba con rol/sede/jornada.
- **Baja de empleado**: *Gestión de Usuarios → Suspender* (no se borra: se conserva la autoría de sus notas).
- **Olvidó su contraseña**: usar *Auth → Users → Send password recovery* en el panel de Supabase (requiere SMTP) o restablecerla desde el dashboard.
- **Corrección de una nota**: se escribe una nota nueva que la aclare; las notas no se editan.
- **Auditoría**: menú *Auditoría* (SuperAdmin/Auditor).
- **Integridad**: *Registro SDIS → Verificar integridad* recalcula la cadena de la sede; si marca una nota, reportarlo de inmediato.

## Recuperación

- Proyecto pausado: Supabase Dashboard → *Restore project* (tarda unos minutos).
- Respaldo: con plan Pro, *Database → Backups*. Recomendado además un `pg_dump` semanal a almacenamiento de la Fundación.
- Migraciones: todo el SQL está en `supabase/migrations/` y es reproducible en un proyecto nuevo (ejecutar en orden 01→04 tras crear las tablas base).
