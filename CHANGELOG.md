# Registro de cambios

Todos los cambios relevantes de **Verificador de Firma Ley 527** se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el
versionado sigue [Versionado Semántico](https://semver.org/lang/es/).

## [No publicado]

### Por hacer

- Ampliación de la cobertura de pruebas del dominio por encima del 90 %.

---

## [1.0.0] — 2026-09-17

Primera versión pública del laboratorio.

### Agregado

- Módulo **Firmar documento**.
- Módulo **Verificar manifiesto**.
- Módulo **Gestión de claves**.
- Módulo **Criterios Ley 527**.
- Módulo **Bitácora**.
- Documentación completa en `docs/`: arquitectura, marco normativo, despliegue,
  guía de uso, decisiones de arquitectura y descargo de responsabilidad.
- Integración continua en tres versiones de Node (20, 22 y 24) con formato, análisis
  estático, verificación de tipos, pruebas con cobertura y construcción de producción.
- Despliegue automático en GitHub Pages desde `main`.
- Análisis de seguridad con CodeQL y actualización de dependencias con Dependabot.
- Sistema de diseño NiAnd Labs con modo claro y oscuro y contraste AA.

### Normativo

- Reglas derivadas de **Ley 527 de 1999**: Arts. 6 a 12: mensajes de datos, firma electrónica, integridad y fuerza probatoria.
- Reglas derivadas de **Decreto 2364 de 2012**: Firma electrónica: confiabilidad y apropiación por el firmante.
- Reglas derivadas de **Decreto 1074 de 2015**: Único reglamentario del sector comercio, industria y turismo.
- Reglas derivadas de **Código General del Proceso, art. 244**: Presunción de autenticidad de los documentos.

> Verificación normativa: 17 de septiembre de 2026.

[No publicado]: https://github.com/AndreZzRg/niand-verificador-firma-527/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/AndreZzRg/niand-verificador-firma-527/releases/tag/v1.0.0
