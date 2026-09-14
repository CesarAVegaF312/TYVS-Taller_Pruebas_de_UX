# Registro de Defectos (plantilla)

Documente aquí los defectos que encuentre durante el taller. Debe incluir al
menos **dos**: uno funcional y uno de **usabilidad o accesibilidad**.

---

## Formato 1: Lista detallada

### Defecto XX — <título breve>

- **Tipo**: Funcional | Accesibilidad | Usabilidad | Visual
- **Módulo**: 1 (E2E) | 2 (POM) | 3 (axe) | 4 (visual) | 5 (usuarios)
- **Cómo se detectó**: prueba automatizada / sesión con usuarios / auditoría manual
- **Pasos para reproducir**:
  1. ...
  2. ...
- **Resultado esperado**: ...
- **Resultado obtenido**: ...
- **Severidad**: Alta | Media | Baja
- **Criterio WCAG afectado** (si aplica): ej. 1.4.3 Contraste mínimo
- **Cambio propuesto**: ...
- **Estado**: Abierto | En progreso | Resuelto

---

## Formato 2: Tabla de seguimiento

| ID | Título | Tipo | Cómo se detectó | Severidad | Estado |
|----|--------|------|------------------|-----------|--------|
| UX-01 | ... | ... | ... | ... | Abierto |

---

## Convenciones de estado

| Estado | Significado |
|--------|-------------|
| **Abierto** | Detectado, sin corregir. |
| **En progreso** | En análisis o corrección. |
| **Resuelto** | Corregido y validado con una prueba. |

---

## Sobre los defectos de usabilidad

Un defecto de usabilidad **no** es "no me gusta el color". Debe describir un
comportamiento observado:

> **Mal:** "El formulario es confuso."
>
> **Bien:** "3 de 5 participantes intentaron escribir el documento con puntos
> (12.345.678) y el campo los rechazó sin explicar por qué. Dos de ellos
> abandonaron la tarea. Severidad: alta."

La diferencia es que el segundo se puede corregir y verificar.
