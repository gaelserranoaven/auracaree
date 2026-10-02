// DESPLEGADA el 02-oct-2026 en el proyecto `auracare` (verify_jwt activo).
// crear-usuario: el SuperAdmin crea una cuenta activa con clave temporal.
// - Solo responde a un SuperAdmin activo (se verifica con su propio JWT, no con datos del cliente).
// - La clave temporal se genera aquí, se devuelve UNA vez y no se guarda en ningún lado fuera de Supabase Auth.
// - El perfil se actualiza con el JWT del SuperAdmin (RLS + trigger guardar_perfil + auditoría normales).
// - Si algo falla después de crear el usuario de Auth, se borra para no dejar cuentas huérfanas.
import { createClient } from 'npm:@supabase/supabase-js@2';

const ROLES = ['auxiliar', 'superadmin', 'admin_sede', 'admin_turno', 'auditor', 'medico', 'profesional'];
const JORNADAS = ['ambos', 'dia', 'noche'];
const ORIGENES = ['https://gaelserranoaven.github.io', 'http://localhost:8000', 'http://127.0.0.1:8000'];

const cors = (origen: string | null) => ({
  'Access-Control-Allow-Origin': origen && ORIGENES.includes(origen) ? origen : ORIGENES[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});

// 14 caracteres sin ambiguos (0/O, 1/l/I), con al menos una letra y un número
function claveTemporal(): string {
  const letras = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '23456789';
  const todos = letras + nums;
  const r = new Uint32Array(14);
  crypto.getRandomValues(r);
  const c = Array.from(r, (x) => todos[x % todos.length]);
  c[r[0] % 14] = letras[r[1] % letras.length];
  let i = r[2] % 14; if (i === r[0] % 14) i = (i + 1) % 14;
  c[i] = nums[r[3] % nums.length];
  return c.join('');
}

Deno.serve(async (req) => {
  const h = { ...cors(req.headers.get('Origin')), 'Content-Type': 'application/json' };
  const responder = (status: number, cuerpo: unknown) => new Response(JSON.stringify(cuerpo), { status, headers: h });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  if (req.method !== 'POST') return responder(405, { error: 'Método no permitido' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const jwt = req.headers.get('Authorization') ?? '';
  const comoAdmin = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: jwt } }, auth: { persistSession: false } });
  const servicio = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  // 1. ¿Quién llama? Debe ser SuperAdmin activo
  const { data: quien, error: errQuien } = await comoAdmin.auth.getUser();
  if (errQuien || !quien?.user) return responder(401, { error: 'Sesión no válida' });
  const { data: yo } = await servicio.from('perfiles').select('rol_id, estado').eq('id', quien.user.id).maybeSingle();
  if (!yo || yo.rol_id !== 'superadmin' || yo.estado !== 'activo') return responder(403, { error: 'Solo un SuperAdmin puede crear cuentas' });

  // 2. Validar datos
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return responder(400, { error: 'Datos inválidos' }); }
  const nombre = String(b.nombre ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const email = String(b.email ?? '').trim().toLowerCase().slice(0, 254);
  const rolId = String(b.rolId ?? '');
  const jornada = String(b.jornadaPermitida ?? 'ambos');
  const sedeId = b.sedeId ? String(b.sedeId) : null;
  if (nombre.length < 3) return responder(400, { error: 'Escribe el nombre completo' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return responder(400, { error: 'Correo no válido' });
  if (!ROLES.includes(rolId)) return responder(400, { error: 'Rol no válido' });
  if (!JORNADAS.includes(jornada)) return responder(400, { error: 'Jornada no válida' });
  if (rolId !== 'superadmin') {
    if (!sedeId) return responder(400, { error: 'Asigna una sede' });
    const { data: sede } = await servicio.from('sedes').select('id, activa').eq('id', sedeId).maybeSingle();
    if (!sede) return responder(400, { error: 'La sede no existe' });
    if (!sede.activa) return responder(400, { error: 'La sede está suspendida' });
  }

  // 3. Crear usuario de Auth (el trigger on_auth_user_created crea su perfil pendiente)
  const clave = claveTemporal();
  const { data: creado, error: errCrear } = await servicio.auth.admin.createUser({
    email, password: clave, email_confirm: true, user_metadata: { nombre },
  });
  if (errCrear || !creado?.user) {
    const msg = /already|registered|exists/i.test(errCrear?.message ?? '') ? 'Ya existe una cuenta con ese correo' : 'No se pudo crear la cuenta';
    return responder(400, { error: msg });
  }

  // 4. Activar el perfil con el JWT del SuperAdmin (queda en la auditoría a su nombre)
  const { data: perfil, error: errPerfil } = await comoAdmin.from('perfiles')
    .update({ nombre, rol_id: rolId, sede_id: sedeId, jornada_permitida: jornada, estado: 'activo', debe_cambiar_clave: true })
    .eq('id', creado.user.id).select().single();
  if (errPerfil || !perfil) {
    await servicio.auth.admin.deleteUser(creado.user.id);
    return responder(500, { error: 'No se pudo activar el perfil; la cuenta no se creó' });
  }

  return responder(200, { perfil, clave });
});
