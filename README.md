# AuraCare 🏥

Platform for managing care in elderly care centers. Currently in v3.4 with foundation UI/UX.

## Quick Start

### Option 1: Open in Browser
```bash
# Open this file in your default browser:
src/index.html
```

### Option 2: Use Local Server (Recommended for development)
```bash
# Python 3
python -m http.server 8000

# Node.js (npm install http-server -g)
http-server

# Then visit: http://localhost:8000/src/
```

---

## Project Structure

```
auracare/
├── src/
│   └── index.html         # Toda la app (React + Babel-en-navegador, sin build step)
│
├── docs/                  # Documentation
│   ├── CHANGELOG.md       # Release history
│   ├── versions/          # Feature docs per version
│   └── design-system.md   # Component reference
│
├── versions-historic/     # Backup of v3.0-v3.3.1
├── tests/                 # Tests (future)
├── dist/                  # Builds (future)
│
├── ARCHITECTURE.md        # Tech stack & roadmap
├── README.md              # This file
└── .gitignore            # Git rules
```

> `src/main.js` y `src/styles.css` existieron como esqueleto en versiones previas pero nunca fueron usados por `index.html` (todo el CSS/JS vive inline en ese archivo) — se eliminaron en la limpieza de v3.4 para evitar confusión.

### Backend (Supabase)

Desde esta revisión, AuraCare persiste datos reales en Supabase (proyecto `auracare`, Postgres) en vez de solo estado en memoria:
- Tablas: `sedes`, `usuarios`, `residentes`, `notas`, `alertas`, `asistencias`, `actividades`, `entregas`, `pertenencias`, `config_sedes`.
- Autenticación propia vía función RPC `login_usuario` (contraseñas con hash `bcrypt`, nunca en texto plano ni expuestas al cliente).
- RLS activado en todas las tablas; `usuarios` solo es accesible a través de funciones RPC `SECURITY DEFINER`.
- Es un esquema de prototipo/demo: las tablas operativas (no `usuarios`) están abiertas a la clave pública `anon` — suficiente para una demo, **no apto para producción con datos reales de pacientes** sin añadir Supabase Auth + políticas RLS por rol.

---

## Documentation

- **Architecture:** See `ARCHITECTURE.md` for tech stack and roadmap
- **Changelog:** See `docs/CHANGELOG.md` for version history
- **Features:** See `docs/versions/` for per-version features
- **Design System:** See `docs/design-system.md` (coming soon)

---

## Git Workflow

### Branches
- **main** — Production code (always stable)
- **develop** — Development/staging branch
- **feature/*  — New features (branch from develop)
- **hotfix/*  — Production fixes (branch from main)

### Making Changes

```bash
# Create feature branch
git checkout -b feature/your-feature develop

# Make changes
# ... edit files ...

# Commit
git add .
git commit -m "feat: your feature description"

# Push (if using remote)
git push origin feature/your-feature

# Create Pull Request to develop
# After review & merge to develop, later merge to main for release
```

### Commit Message Format

```
type: brief description

Optional longer explanation if needed.

Types:
  feat:  new feature
  fix:   bug fix
  docs:  documentation
  style: formatting/styling
  test:  tests
  chore: build/dependencies
```

---

## Development

### Making Changes
1. Always work on `develop` branch or create `feature/*` branch
2. Test changes locally in browser
3. Commit frequently with clear messages
4. Don't commit directly to `main`

### Version Releases
When ready to release:
```bash
# Merge develop to main
git checkout main
git merge develop --no-ff
git tag -a v3.5 -m "Release v3.5"
```

---

## Roadmap

### Current (v3.4)
- [x] UI/UX foundation
- [x] Git versioning
- [x] Documentation structure
- [x] Backend & base de datos real (Supabase/Postgres)
- [x] Autenticación con contraseñas hasheadas
- [x] Persistencia real de datos (ya no se pierden al recargar)

### Short-term (v4.0 - 2-3 weeks)
- [ ] Supabase Auth completo (sesiones/JWT) en vez de RPC de login propio
- [ ] Políticas RLS por rol (hoy son abiertas a nivel demo)
- [ ] Migrar de CDN+Babel-en-navegador a un build step (Vite)

### Medium-term (v4.1+ - 1-2 months)
- [ ] Multi-user support (ya persiste, falta tiempo real)
- [ ] Real-time notifications (Supabase Realtime)
- [ ] Advanced scheduling
- [ ] Mobile responsive design

### Long-term (v5.0+ - 3-6 months)
- [ ] Mobile app (React Native)
- [ ] Cloud deployment
- [ ] Analytics dashboard
- [ ] Integration with healthcare APIs

---

## Tech Stack

| Layer | Technology | Status |
|-------|-----------|--------|
| Frontend | React 18 + Babel standalone (CDN, sin build step) | ✅ Active |
| Backend | Supabase (Postgres + RPC + RLS) | ✅ Active |
| Database | PostgreSQL (Supabase) | ✅ Active |
| DevOps | Docker, Git | 🔄 Planned |

---

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile: Coming in v4.1+

---

## Contributing

1. Fork or create feature branch
2. Make changes on `develop`
3. Test locally
4. Commit with clear messages
5. Push to branch
6. Create Pull Request

---

## Support

Found a bug? Have a feature idea?  
Create an issue in this repository.

---

## License

[Specify your license]

---

## Team

**Maintainer:** Gael (7mo Ingeniería)  
**Project:** AuraCare - Elderly Care Management Platform

---

**Last Updated:** 2026-08-17
