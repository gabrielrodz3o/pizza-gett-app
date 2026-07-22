# Pizza Getto — Guía de Aplicación Móvil

## 1. Visión del proyecto

Crear una aplicación móvil para **Pizza Getto**, disponible en **iOS y Android**, enfocada en una experiencia rápida, visual y sencilla para realizar pedidos en cualquiera de sus tres sucursales.

La aplicación será desarrollada con **React Native**, utilizando una sola base de código para ambas plataformas, pero entregando versiones independientes para App Store y Google Play.

---

## 2. Objetivos principales

- Facilitar pedidos desde el celular.
- Mostrar el menú actualizado por sucursal.
- Permitir seleccionar delivery o recogida.
- Reducir la cantidad de pasos para completar una compra.
- Permitir repetir pedidos anteriores.
- Mostrar el estado del pedido.
- Incrementar las ventas directas de Pizza Getto.
- Reducir la dependencia de plataformas externas de delivery.

---

## 3. Identidad visual

### Logo

Utilizar el logo oficial de Pizza Getto como elemento principal de la marca.

### Paleta de colores sugerida

| Uso | Color |
|---|---|
| Marrón principal | `#4A1F1F` |
| Amarillo de marca | `#F5A900` |
| Fondo principal | `#FFFFFF` |
| Fondo secundario | `#F7F5F3` |
| Texto principal | `#241818` |
| Éxito | `#2E9E5B` |
| Error | `#D83A3A` |

### Tipografías sugeridas

- **Títulos:** Poppins Bold
- **Subtítulos:** Poppins SemiBold
- **Texto:** Inter Regular
- **Precios:** Poppins Bold

---

## 4. Principios de UI/UX

### Rapidez

El cliente frecuente debe poder completar un pedido en menos de un minuto.

### Claridad

Cada pantalla debe tener una acción principal fácil de identificar.

### Fotografías grandes

Las pizzas deben ser protagonistas. Utilizar imágenes limpias, iluminadas y consistentes.

### Navegación simple

La barra inferior debe contener únicamente:

1. Inicio
2. Menú
3. Pedidos
4. Favoritos
5. Perfil

### Botones

- Altura mínima de 48 px.
- Bordes redondeados.
- Texto claro.
- Botón principal en amarillo.
- Botón secundario con fondo blanco y borde marrón.

---

## 5. Flujo principal

```text
Splash
  ↓
Seleccionar sucursal
  ↓
Inicio
  ↓
Menú
  ↓
Detalle del producto
  ↓
Personalización
  ↓
Carrito
  ↓
Dirección o recogida
  ↓
Método de pago
  ↓
Confirmación
  ↓
Seguimiento del pedido
```

---

## 6. Pantallas principales

### 6.1 Splash

- Logo centrado.
- Fondo blanco o marrón.
- Animación corta.
- Duración máxima de 2 segundos.

### 6.2 Selección de sucursal

Mostrar las tres sucursales disponibles.

Cada tarjeta debe incluir:

- Nombre.
- Dirección.
- Horario.
- Tiempo estimado.
- Estado: abierta o cerrada.
- Botón “Seleccionar”.

La aplicación debe recordar la última sucursal utilizada.

### 6.3 Inicio

Contenido recomendado:

- Saludo al usuario.
- Sucursal seleccionada.
- Buscador.
- Banner de promoción.
- Categorías.
- Productos populares.
- Combos.
- Último pedido.
- Botón “Repetir pedido”.

Ejemplo:

```text
Hola, Gabriel 👋
¿Qué te gustaría ordenar hoy?

[ Buscar pizzas, combos o bebidas ]

[ Banner: Combo Getto Familiar ]

Categorías
Pizzas | Combos | Bebidas | Complementos
```

### 6.4 Menú

- Categorías horizontales.
- Filtro por disponibilidad.
- Tarjetas con fotografía.
- Nombre.
- Descripción corta.
- Precio inicial.
- Botón para agregar.

### 6.5 Detalle del producto

Debe mostrar:

- Imagen grande.
- Nombre.
- Descripción.
- Precio.
- Selección de tamaño.
- Tipo de masa.
- Ingredientes.
- Extras.
- Cantidad.
- Observaciones.
- Total actualizado.
- Botón “Agregar al carrito”.

### 6.6 Carrito

- Productos seleccionados.
- Cantidad editable.
- Eliminar productos.
- Observaciones.
- Subtotal.
- Delivery.
- Descuentos.
- Impuestos.
- Total.
- Botón “Continuar”.

También puede mostrar productos sugeridos:

- Refrescos.
- Palitos de ajo.
- Postres.
- Salsas.

### 6.7 Entrega o recogida

Opciones:

- Delivery.
- Recoger en sucursal.

Para delivery:

- Dirección.
- Referencia.
- Ubicación en mapa.
- Teléfono.
- Instrucciones para el repartidor.

Para recogida:

- Sucursal.
- Hora estimada.
- Nombre de la persona que recogerá.

### 6.8 Método de pago

Métodos posibles:

- Efectivo.
- Tarjeta al recibir.
- Pago en línea.
- Tarjeta guardada, si se implementa posteriormente.

Si es efectivo, permitir indicar con cuánto pagará el cliente.

### 6.9 Confirmación

Mostrar:

- Número de pedido.
- Sucursal.
- Productos.
- Dirección o recogida.
- Método de pago.
- Total.
- Tiempo estimado.

### 6.10 Seguimiento del pedido

Estados sugeridos:

```text
Pedido recibido
Preparando
En el horno
Listo
En camino
Entregado
```

Debe utilizar una línea de progreso clara y notificaciones push.

### 6.11 Historial

- Pedidos anteriores.
- Estado.
- Fecha.
- Total.
- Botón “Ver detalle”.
- Botón “Repetir pedido”.

### 6.12 Favoritos

- Productos guardados.
- Combos favoritos.
- Botón rápido para agregar al carrito.

### 6.13 Perfil

- Datos personales.
- Direcciones.
- Métodos de pago.
- Pedidos.
- Favoritos.
- Notificaciones.
- Términos y privacidad.
- Cerrar sesión.

---

## 7. Componentes reutilizables

```text
AppButton
AppInput
ProductCard
CategoryChip
PromotionBanner
BranchCard
CartItem
PriceSummary
OrderStatus
AddressCard
EmptyState
LoadingSkeleton
ErrorMessage
BottomSheet
Modal
```

---

## 8. Arquitectura sugerida

```text
src/
├── assets/
│   ├── images/
│   ├── icons/
│   └── animations/
├── components/
├── features/
│   ├── auth/
│   ├── branches/
│   ├── menu/
│   ├── cart/
│   ├── checkout/
│   ├── orders/
│   └── profile/
├── navigation/
├── screens/
├── services/
├── store/
├── hooks/
├── theme/
├── types/
└── utils/
```

---

## 9. Tecnologías recomendadas

- React Native
- Expo
- TypeScript
- Expo Router o React Navigation
- TanStack Query
- Zustand
- React Hook Form
- Axios
- Firebase Cloud Messaging
- React Native Reanimated
- React Native MMKV
- Expo SecureStore
- Sentry
- Google Maps o Mapbox

---

## 10. Integraciones

La aplicación consumirá las APIs existentes para:

- Consultar sucursales.
- Consultar categorías.
- Consultar productos.
- Consultar precios.
- Consultar disponibilidad.
- Crear clientes.
- Iniciar sesión.
- Crear pedidos.
- Consultar estados.
- Consultar historial.
- Registrar direcciones.

La integración con las APIs existentes está incluida en el proyecto.

No se incluye el desarrollo de nuevas APIs o cambios importantes en el backend.

---

## 11. Notificaciones push

Enviar notificaciones cuando:

- El pedido sea recibido.
- El pedido entre en preparación.
- El pedido esté listo.
- El pedido salga para delivery.
- El pedido sea entregado.
- Exista una promoción importante.

Evitar el envío excesivo de promociones.

---

## 12. Estados que debe manejar la aplicación

- Cargando.
- Sin conexión.
- Error del servidor.
- Producto agotado.
- Sucursal cerrada.
- Dirección fuera de cobertura.
- Pedido rechazado.
- Pago rechazado.
- Carrito vacío.
- Sin pedidos anteriores.

---

## 13. Accesibilidad

- Texto mínimo de 14 px.
- Contraste suficiente.
- Botones grandes.
- Etiquetas para lectores de pantalla.
- No depender solamente del color para indicar estados.
- Mensajes de error claros.

---

## 14. Seguridad

- Tokens almacenados de forma segura.
- Comunicación únicamente por HTTPS.
- No guardar datos completos de tarjetas.
- Validación de datos en frontend y backend.
- Expiración de sesiones.
- Política de privacidad.
- Eliminación de cuenta desde la aplicación.

---

## 15. Publicación

### Google Play

- Cuenta de Google Play Console a nombre de Pizza Getto.
- Ficha de la aplicación.
- Capturas de pantalla.
- Icono.
- Política de privacidad.
- Clasificación de contenido.
- Versión Android firmada.

### App Store

- Cuenta Apple Developer a nombre de Pizza Getto.
- App Store Connect.
- Capturas para iPhone.
- Política de privacidad.
- Información de revisión.
- Cuenta de prueba para Apple, cuando sea necesaria.
- Versión iOS firmada.

---

## 16. Alcance comercial

### Desarrollo inicial

**RD$350,000**

Incluye:

- Diseño de la aplicación.
- Desarrollo para Android.
- Desarrollo para iPhone.
- Integración con las APIs existentes.
- Configuración de notificaciones push.
- Configuración y publicación en ambas tiendas.

### Servicio mensual

Servicio actual:

- 3 sucursales × RD$7,500.
- Total actual: **RD$22,500 mensuales**.

Administración sugerida de la aplicación móvil:

- **RD$7,500 mensuales**.

Total mensual recomendado:

**RD$30,000 mensuales**.

---

## 17. No incluido

- Nuevas APIs.
- Cambios mayores en el backend.
- Programa de puntos.
- Sistema avanzado de cupones.
- Rastreo GPS del repartidor en tiempo real.
- Chat en vivo.
- Costos de Apple Developer.
- Costos de Google Play Console.
- Costos de mapas, SMS o pasarelas de pago.
- Funciones nuevas solicitadas después de aprobar el alcance.

---

## 18. Fases sugeridas

### Fase 1 — Diseño

- Definir flujo.
- Wireframes.
- Diseño visual.
- Prototipo navegable.

### Fase 2 — Desarrollo base

- Navegación.
- Autenticación.
- Sucursales.
- Menú.
- Productos.
- Carrito.

### Fase 3 — Pedidos

- Direcciones.
- Checkout.
- Métodos de pago.
- Creación del pedido.
- Seguimiento.

### Fase 4 — Publicación

- Pruebas finales.
- Compilaciones.
- Google Play.
- App Store.

---

## 19. Referencias de experiencia

Estudiar principalmente:

- Domino's: flujo y seguimiento.
- Papa Johns: presentación del menú.
- Little Caesars: rapidez.
- Pizza Hut: promociones y combos.
- McDonald's: ofertas y repetición de pedidos.
- Uber Eats: dirección y seguimiento.

La aplicación debe inspirarse en buenas prácticas, pero mantener una identidad propia de Pizza Getto.

---

## 20. Resultado esperado

Una aplicación moderna y rápida que permita:

1. Seleccionar una sucursal.
2. Ver el menú.
3. Personalizar productos.
4. Realizar pedidos.
5. Seleccionar entrega o recogida.
6. Pagar.
7. Consultar el estado.
8. Repetir pedidos anteriores.

El resultado debe sentirse como una aplicación propia de una cadena de restaurantes, no como una página web colocada dentro de una aplicación.
