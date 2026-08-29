# Guía de Integración Continua

## Objetivo

Ejecutar las pruebas de interfaz automáticamente en cada cambio, sin depender de que alguien se acuerde de correrlas.

## El flujo del taller

Está en [`.github/workflows/ui-tests.yml`](../.github/workflows/ui-tests.yml) y tiene dos trabajos independientes: `playwright` y `selenium`.

```yaml
on:
  push:
    branches: [main, master, develop]
  pull_request:
    branches: [main, master, develop]
  workflow_dispatch:
```

> ⚠️ Note el filtro `branches`. El flujo **solo** se dispara en `main`, `master` y `develop`. Si usted trabaja en una rama `feature/...`, no verá ninguna ejecución hasta abrir el pull request. No es un fallo: es la configuración.

## Los tres detalles que suelen romper un CI de pruebas de UI

### 1. Permisos del token

```yaml
permissions:
  contents: read
  checks: write
```

En los repositorios creados desde 2023, el `GITHUB_TOKEN` es de **solo lectura** por defecto. Cualquier acción que publique un check o un comentario falla con `Resource not accessible by integration`. Y si ese paso lleva `if: always()`, el flujo queda en rojo **aunque todas las pruebas hayan pasado**.

### 2. Alguien tiene que levantar la aplicación

Es el error más común: se configura la herramienta impecablemente y se apunta a un servicio que nadie arrancó.

- **Playwright** lo resuelve solo, con el bloque `webServer` de su configuración.
- **Selenium** no. Por eso el trabajo `selenium` incluye un paso explícito que lanza el jar y **espera** a que responda:

```yaml
      - name: Levantar la Registraduria
        run: |
          nohup java -jar target/registraduria-1.0-SNAPSHOT.jar > /tmp/app.log 2>&1 &
          for i in $(seq 1 60); do
            if curl -sf http://localhost:8080/actuator/health > /dev/null; then
              echo "Servicio arriba"; exit 0
            fi
            sleep 2
          done
          echo "El servicio no arranco a tiempo"; cat /tmp/app.log; exit 1
```

Un `sleep 30` fijo en lugar de ese bucle es la receta clásica para una prueba inestable: a veces alcanza, a veces no, y nadie sabe por qué falla los martes.

### 3. La regresión visual no corre en CI

El flujo ejecuta los módulos 1, 2 y 3, pero **no el 4**:

```yaml
run: npx playwright test tests/modulo1-e2e.spec.js tests/modulo2-pom.spec.js tests/modulo3-accesibilidad.spec.js
```

Las capturas de referencia dependen del sistema operativo y de las fuentes instaladas. Una generada en Windows nunca va a coincidir píxel a píxel con la de un runner Linux, y el módulo fallaría siempre por una razón que no tiene nada que ver con el código.

La solución en un proyecto real es generar y comparar las capturas **dentro del contenedor oficial de Playwright**, de modo que el entorno sea idéntico en todas partes:

```yaml
    container:
      image: mcr.microsoft.com/playwright:v1.49.1-jammy
```

## Artefactos

Ambos trabajos publican evidencia con `if: always()`, para que esté disponible **sobre todo cuando algo falla**:

- `playwright-report/` — reporte HTML navegable, con traza, captura y video de cada fallo.
- `selenium-java/target/surefire-reports/` — resultados en XML.

## Ejercicio

1. Rompa una prueba a propósito (cambie un texto esperado) y abra un pull request. Observe qué reporta el CI y descargue el artefacto.
2. Revise la traza de Playwright del fallo. ¿En qué paso exacto se detuvo?
3. Añada un tercer trabajo que ejecute `npm run test:visual` dentro del contenedor de Playwright. ¿Pasan las capturas generadas en su máquina?
