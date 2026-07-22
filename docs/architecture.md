# Arquitectura móvil

La aplicación usa Expo Router solamente para declarar rutas. Las pantallas y la lógica viven en `src`.

```text
app/                         Rutas y providers globales
src/screens/                 Composición de pantallas
src/features/auth/           Sesión, OTP, Google y Apple
src/features/catalog/        Menú, productos, acompañamientos y combos
src/features/cart/           Estado persistente del carrito
src/features/customer/       Perfil, direcciones y API del cliente
src/features/orders/         Historial y tracking
src/shared/                  Tema, tipos y componentes reutilizables
```

Reglas de dependencia:

1. `app` puede importar `screens` y `shared`.
2. `screens` compone features, pero no contiene reglas de negocio.
3. Una feature puede importar `shared` y servicios de otra feature solo cuando existe una relación explícita.
4. `shared` nunca importa features.
5. Las llamadas HTTP viven en archivos `api.ts`; los componentes no construyen URLs.
6. Los tokens de cliente solo se almacenan mediante `expo-secure-store`.
7. Los tipos del contrato REST compartido viven en `src/shared/types.ts` hasta que cada dominio necesite su propio archivo.

Flujo principal:

```text
Expo Router → MainScreen
                 ├── catalog/api → menú y combos
                 ├── cart/store → carrito
                 ├── auth/store → sesión segura
                 ├── customer/api → perfil y direcciones
                 └── OrdersTracking → pedidos del cliente
```
