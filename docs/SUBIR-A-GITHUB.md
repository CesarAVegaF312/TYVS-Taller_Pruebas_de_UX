# Instrucciones para subir el taller a GitHub

## Paso 1 — Crear el repositorio en GitHub

1. Ve a https://github.com/new
2. Nombre sugerido: `TYVS-Taller_Pruebas_de_UX`
3. Visibilidad: **Public** (para que sea un portafolio)
4. **No** marques "Initialize this repository"
5. Clic en **Create repository**

## Paso 2 — Inicializar el repo local

Abre una terminal en la carpeta `TYVS-Taller_Pruebas_de_UX/` y ejecuta:

```bash
git init
git add .
git commit -m "feat: taller completo de pruebas de UI y UX con CI/CD"
```

## Paso 3 — Conectar y subir a GitHub

```bash
git remote add origin https://github.com/TU_USUARIO/TYVS-Taller_Pruebas_de_UX.git
git branch -M main
git push -u origin main
```

> Reemplaza `TU_USUARIO` con tu nombre de usuario de GitHub.

## Verificar que todo funcionó

Después del push:

1. GitHub → tu repo → pestaña **Actions**
2. Verás el workflow `pruebas-ui`, con sus dos trabajos: `Playwright (E2E + accesibilidad)` y `Selenium (UI)`
3. Se ejecutarán automáticamente en el siguiente push

## Tip: Agregar badge de estado al README

Copia esto en tu README.md (reemplaza `TU_USUARIO` y `REPO`):

```markdown
![Pruebas UI](https://github.com/TU_USUARIO/REPO/actions/workflows/ui-tests.yml/badge.svg)
![Pruebas UI](https://github.com/TU_USUARIO/REPO/actions/workflows/ui-tests.yml/badge.svg)
```
