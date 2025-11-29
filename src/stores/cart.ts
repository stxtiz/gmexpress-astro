/**
 * ============================================
 * GMEXPRESS - STORE DEL CARRITO DE COMPRAS
 * ============================================
 *
 * Este store maneja el estado del carrito de compras.
 * - Persiste en localStorage para mantener el carrito entre sesiones
 * - Soporta productos y servicios con precio fijo
 * - Permite agregar, eliminar y modificar cantidades
 *
 * NOTA: Los usuarios pueden agregar items sin estar logueados,
 * pero deben autenticarse al momento de confirmar la compra.
 */

// ============================================
// TIPOS E INTERFACES
// ============================================

/**
 * Representa un item en el carrito
 */
export interface CartItem {
  id: string; // ID del producto/servicio en Firestore
  name: string; // Nombre del producto/servicio
  price: string; // Precio formateado (ej: "$16.990")
  priceNumber: number; // Precio numérico para cálculos
  quantity: number; // Cantidad en el carrito
  type: "producto" | "servicio"; // Tipo de item
  image?: string; // URL de imagen (opcional)
  stock?: number; // Stock disponible (para verificación)
}

/**
 * Estado del carrito
 */
export interface CartState {
  items: CartItem[]; // Items en el carrito
  isOpen: boolean; // Si el panel del carrito está abierto
}

// ============================================
// CONSTANTES
// ============================================

const CART_STORAGE_KEY = "gmexpress-cart";
const IVA_RATE = 0.19; // 19% IVA chileno

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Convierte un precio formateado a número
 * @param price - Precio formateado (ej: "$16.990")
 * @returns Número entero del precio
 */
export function priceToNumber(price: string): number {
  return parseInt(price.replace(/[^0-9]/g, ""), 10) || 0;
}

/**
 * Formatea un número como precio chileno
 * @param value - Valor numérico
 * @returns Precio formateado (ej: "$16.990")
 */
export function formatPrice(value: number): string {
  return `$${value.toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ============================================
// GESTIÓN DEL CARRITO
// ============================================

/**
 * Obtiene el carrito desde localStorage
 * @returns Array de items del carrito
 */
export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error al leer carrito desde localStorage:", error);
    return [];
  }
}

/**
 * Guarda el carrito en localStorage
 * @param items - Array de items a guardar
 */
export function saveCart(items: CartItem[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    // Disparar evento personalizado para notificar cambios
    window.dispatchEvent(
      new CustomEvent("cart-updated", { detail: { items } }),
    );
  } catch (error) {
    console.error("Error al guardar carrito en localStorage:", error);
  }
}

/**
 * Agrega un item al carrito o incrementa su cantidad si ya existe
 * @param item - Item a agregar (sin quantity, se establece en 1)
 */
export function addToCart(
  item: Omit<CartItem, "quantity"> & { quantity?: number },
): void {
  const cart = getCart();
  const existingIndex = cart.findIndex(
    (cartItem) => cartItem.id === item.id && cartItem.type === item.type,
  );

  if (existingIndex >= 0) {
    // Incrementar cantidad si ya existe
    cart[existingIndex].quantity += item.quantity || 1;
  } else {
    // Agregar nuevo item
    cart.push({
      ...item,
      quantity: item.quantity || 1,
      priceNumber: item.priceNumber || priceToNumber(item.price),
    });
  }

  saveCart(cart);
}

/**
 * Remueve un item del carrito por su índice
 * @param index - Índice del item a remover
 */
export function removeFromCart(index: number): void {
  const cart = getCart();
  if (index >= 0 && index < cart.length) {
    cart.splice(index, 1);
    saveCart(cart);
  }
}

/**
 * Actualiza la cantidad de un item en el carrito
 * @param index - Índice del item
 * @param quantity - Nueva cantidad
 */
export function updateQuantity(index: number, quantity: number): void {
  const cart = getCart();
  if (index >= 0 && index < cart.length) {
    if (quantity <= 0) {
      cart.splice(index, 1);
    } else {
      cart[index].quantity = quantity;
    }
    saveCart(cart);
  }
}

/**
 * Limpia todo el carrito
 */
export function clearCart(): void {
  saveCart([]);
}

// ============================================
// CÁLCULOS DE TOTALES
// ============================================

/**
 * Calcula el subtotal del carrito (sin IVA)
 * @param items - Items del carrito (opcional, usa localStorage si no se provee)
 * @returns Subtotal numérico
 */
export function calculateSubtotal(items?: CartItem[]): number {
  const cart = items || getCart();
  return cart.reduce((sum, item) => {
    return sum + item.priceNumber * item.quantity;
  }, 0);
}

/**
 * Calcula el IVA del carrito
 * @param subtotal - Subtotal (opcional)
 * @returns IVA numérico
 */
export function calculateIVA(subtotal?: number): number {
  const sub = subtotal ?? calculateSubtotal();
  return Math.round(sub * IVA_RATE);
}

/**
 * Calcula el total del carrito (con IVA)
 * @param items - Items del carrito (opcional)
 * @returns Total numérico
 */
export function calculateTotal(items?: CartItem[]): number {
  const subtotal = calculateSubtotal(items);
  return subtotal + calculateIVA(subtotal);
}

/**
 * Obtiene un resumen de totales del carrito
 * @returns Objeto con subtotal, IVA y total formateados
 */
export function getCartTotals(): {
  subtotal: string;
  iva: string;
  total: string;
  itemCount: number;
} {
  const cart = getCart();
  const subtotal = calculateSubtotal(cart);
  const iva = calculateIVA(subtotal);
  const total = subtotal + iva;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return {
    subtotal: formatPrice(subtotal),
    iva: formatPrice(iva),
    total: formatPrice(total),
    itemCount,
  };
}
