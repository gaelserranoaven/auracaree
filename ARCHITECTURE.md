# AuraCare Architecture & Roadmap

## Current State (v3.4)

**Frontend:** React 18 + Babel standalone, todo inline en un único HTML (sin build step)
**Backend:** Supabase (Postgres, funciones RPC, Row Level Security)
**Deployment:** Local browser (file-based), datos persistidos en la nube
**Storage:** Postgres real vía Supabase (proyecto `auracare`)
**Users:** Multi-usuario con roles (RBAC), autenticación por RPC con contraseñas hasheadas (bcrypt)

### Directory Structure

```
auracare/
├── src/
│   └── index.html           (Toda la app: UI, lógica y conexión a Supabase)
│
├── docs/
│   ├── CHANGELOG.md         (Release history)
│   ├── design-system.md     (Component reference)
│   └── versions/            (Per-version features)
│
├── versions-historic/       (Backup of v3.0-v3.3.1)
├── tests/                   (Future: e2e tests)
├── dist/                    (Future: optimized builds)
└── README.md, ARCHITECTURE.md, .gitignore
```

---

## Tech Stack Evolution

### Phase 1 (Current - v3.4)
- **Frontend Framework:** Vanilla HTML/CSS/JS
- **Styling:** Embedded CSS → modular CSS
- **State Management:** None
- **Deployment:** Static files

### Phase 2 (Planned - v4.0)
- **Backend:** Node.js + Express API
- **Database:** PostgreSQL
- **Authentication:** JWT-based
- **API Structure:** RESTful endpoints for:
  - Patient management
  - Care records
  - Staff scheduling
  - Notifications

### Phase 3 (Future - v5.0)
- **Frontend Refactor:** React or Vue.js
- **Real-time:** WebSockets for notifications
- **Mobile:** React Native app
- **Cloud:** AWS/Vercel deployment

---

## Git Workflow

### Branches

```
main (production - stable releases)
  ↑
develop (staging - integration branch)
  ↑
feature/* (feature branches - one per feature)
release/* (release preparation)
hotfix/* (production fixes)
```

### Commit Strategy

**Format:** `type: description`

```
feat: add patient dashboard
fix: correct form validation
docs: update architecture
style: improve CSS spacing
refactor: modularize JavaScript
test: add e2e tests
chore: update dependencies
```

---

## Development Checklist

- [x] v3.4 baseline established
- [x] CSS/JS extracted to separate files
- [x] Git versioning setup
- [x] Documentation structure
- [ ] Unit tests
- [ ] Backend API design
- [ ] Database schema
- [ ] Authentication system
- [ ] Multi-user support
- [ ] Mobile responsiveness

---

## Security Considerations (Phase 2+)

- [ ] Input validation on backend
- [ ] SQL injection prevention
- [ ] CSRF protection
- [ ] Rate limiting
- [ ] User authentication
- [ ] Role-based access control (RBAC)
- [ ] Data encryption
- [ ] GDPR compliance for patient records

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Page Load | < 2s | ~0.5s (static) |
| API Response | < 200ms | N/A |
| Bundle Size | < 500KB | ~150KB |
| Test Coverage | > 80% | 0% |

---

## Known Limitations

1. **RLS de demo:** las tablas operativas (no `usuarios`) están abiertas a la clave pública `anon` — correcto para una demo/prototipo, no para producción con datos reales de pacientes. Hace falta Supabase Auth + políticas por rol antes de un despliegue real.
2. **Sin sesiones reales:** el login es una función RPC propia, no Supabase Auth — no hay JWT de sesión, tokens de refresco ni expiración.
3. **Accessibility:** Partial WCAG compliance
4. **Mobile:** Not optimized for mobile screens
5. **Sin build step:** Babel transpila en cada carga de página (aceptable para demo, no para producción)

---

## Deployment Roadmap

**Current:** Local browser + GitHub versioning  
**Short-term (2-3 weeks):** Add backend + database  
**Medium-term (1-2 months):** Multi-user + authentication  
**Long-term (3-6 months):** Cloud deployment + mobile app

---

**Last Updated:** 2026-08-17  
**Maintained By:** Gael (7mo Ingeniería)
