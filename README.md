# Pizza Getto App

Aplicación móvil Expo/React Native inspirada en la guía de Pizza Getto y en la arquitectura de `comandpos-manager`.

## Ejecutar

1. Copia `.env.example` a `.env` y configura el servidor.
2. Instala dependencias con `npm install`.
3. Ejecuta `npm start`.

Para iOS Simulator puede usarse `http://localhost:3000`. En un teléfono físico usa la IP LAN de la computadora (por ejemplo `http://192.168.1.20:3000`); en Android Emulator normalmente es `http://10.0.2.2:3000`.

La app descubre la unidad, sucursales y catálogos mediante `GET /api/public/mobile-app/pizza-getto`, y carga el catálogo real con `POST /api/restaurant/menu/get-all-menu-filters`. Si el servidor local no está disponible, muestra datos demo para permitir revisar el diseño.

## Integración pendiente de credenciales

- Sustituir los IDs demo de `src/data.ts` por los `location_id` y `catalogue_id` reales.
- Definir el mecanismo de autenticación pública/móvil (no incrustar un token administrativo en producción).
- Exponer o confirmar `POST /api/restaurant/mobile/orders`, que recibe el payload documentado en `src/api.ts` y debe delegar a la creación atómica de cuenta + orden.
- Añadir logo/fotos oficiales, pagos, mapas y push antes de publicar.
