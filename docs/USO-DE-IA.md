# Registro de uso de IA en CINET

Requisito del curso: documentar las decisiones asistidas por IA. Regla del equipo: **la IA propone, una persona revisa, prueba y decide**. Todo cambio asistido se verificó con pruebas (`npm test`), ESLint y build antes de entrar a `main`.

## Cómo se usó (por persona)

### Juan Pablo Vanegas — auditoría de seguridad y comandos por rol (Claude Code)
Fechas: 2026-11-05 a 2026-11-10 · Rama `audit/seguridad-roles-juan` (PR #1) · Informe: [AUDITORIA-SEGURIDAD-2026-11-10.md](AUDITORIA-SEGURIDAD-2026-11-10.md)

| Decisión asistida | Qué propuso la IA | Qué se verificó / decidió |
|-------------------|-------------------|---------------------------|
| Método de auditoría de la BD | Revisión estática con regex de los `grant`/`revoke` | Se **descartó**: daba falsos positivos. Se reemplazó por una auditoría dinámica (`scripts/audit-db-privileges.mjs`) sobre Postgres real en memoria (PGlite) con `has_table_privilege` |
| Tablas de billing abiertas | Revocar privilegios por defecto de `anon`/`authenticated` | Test que falla sin la migración y pasa con ella |
| Perfiles públicos | Política de lectura solo del propio perfil | Se comprobó que la app solo lee su perfil (`authService`) antes de aplicarla; 8 tests de roles |
| URLs de plan/aliado | Validar en cliente (`safeHttpsUrl`) y en la base (`is_openable_https_url`, trigger) | Primera regex falló en Postgres (backslash perdido): se corrigió con `strpos(…, chr(92))` |
| Open redirect `safeNext` | Resolver la ruta contra un origen y exigir el mismo | Casos `//evil.com`, `/\t\evil.com`, `javascript:` en tests |
| CSP | Política en modo informe | **Validada en navegador real**: reveló que el hash del script inline cambiaba por CRLF/LF; se corrigió y se dejó un test |
| Comandos `/` por rol | Catálogo de comandos con nivel de acceso y mensaje genérico para los reservados | Revisado por la persona; 11 tests unitarios y prueba en navegador |

Errores de la IA detectados y corregidos durante el trabajo: una edición que no se aplicó (se detectó con `git diff` y se rehízo), una severidad sobrestimada en la auditoría y una firma de función equivocada en una prueba.

### Samuel David Ortiz Pico y Samuel — resto del proyecto
> **Completar por quien corresponda** (no se puede reconstruir desde fuera). En el repo hay rastros de uso de asistentes: [PROMPT-CLAUDE-CINET.md](PROMPT-CLAUDE-CINET.md), [PROMPT-CODEX-CINET.md](PROMPT-CODEX-CINET.md), [PROMPT-DUO-EXPERIENCIA-AVANZADA.md](PROMPT-DUO-EXPERIENCIA-AVANZADA.md) y [AUDITORIA_TECNICA_PARA_REMEDIACION_2026-11-15.md](AUDITORIA_TECNICA_PARA_REMEDIACION_2026-11-15.md). Para cada uso: herramienta, qué se pidió, qué se aceptó/rechazó y cómo se verificó.

### David Fernando Gómez
> **Completar** (herramienta, para qué, cómo se verificó).

## Criterio de aceptación de cambios asistidos
1. Se entiende y se puede explicar sin la IA.
2. Tiene prueba automática que falla sin el cambio.
3. Pasa `npm test`, `npx eslint .` y `npx vite build`.
4. Se revisa en un PR o rama antes de desplegar.
