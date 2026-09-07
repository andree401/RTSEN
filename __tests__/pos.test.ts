import { describe, it, expect } from 'vitest';

type Dish = { id: string; price: number; name: string };
type OrderItem = Dish & { quantity: number };

function calculateTotal(order: OrderItem[]) {
  return order.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
}

function addToOrder(prev: OrderItem[], dish: Dish): OrderItem[] {
  const existing = prev.find((item) => item.id === dish.id);
  if (existing) {
    return prev.map((item) =>
      item.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item
    );
  }
  return [...prev, { ...dish, quantity: 1 }];
}

function decrementFromOrder(prev: OrderItem[], id: string): OrderItem[] {
  return prev
    .map((item) =>
      item.id === id ? { ...item, quantity: item.quantity - 1 } : item
    )
    .filter((item) => item.quantity > 0);
}

function canProcessCharge(order: OrderItem[]): { valid: boolean; reason?: string } {
  if (order.length === 0) {
    return { valid: false, reason: 'No puedes cobrar una comanda vacía' };
  }
  const total = calculateTotal(order);
  if (total <= 0) {
    return { valid: false, reason: 'El monto total no puede ser cero o negativo' };
  }
  return { valid: true };
}

describe('POS Logic - Sums & Edge Cases', () => {
  describe('calculateTotal', () => {
    it('debe retornar 0 para comanda vacía', () => {
      expect(calculateTotal([])).toBe(0);
    });

    it('debe calcular el total correctamente para múltiples platillos', () => {
      const order: OrderItem[] = [
        { id: '1', name: 'Taco', price: 20, quantity: 2 },
        { id: '2', name: 'Soda', price: 15, quantity: 1 },
      ];
      expect(calculateTotal(order)).toBe(55);
    });

    it('debe manejar decimales y números grandes con precisión', () => {
      const order: OrderItem[] = [
        { id: '1', name: 'Steak', price: 500.5, quantity: 3 },
      ];
      expect(calculateTotal(order)).toBe(1501.5);
    });

    it('debe manejar montos atípicos (precios negativos o cantidades negativas) sin romper el flujo', () => {
      const orderWithNegatives: OrderItem[] = [
        { id: '1', name: 'Taco', price: 20, quantity: 2 },
        { id: '2', name: 'Descuento / Ajuste', price: -5, quantity: 1 },
      ];
      // 20*2 + (-5)*1 = 35
      expect(calculateTotal(orderWithNegatives)).toBe(35);
    });

    it('debe manejar valores nulos, NaN o undefined de forma defensiva', () => {
      const corruptOrder = [
        { id: '1', name: 'Taco', price: NaN, quantity: 2 },
        { id: '2', name: 'Soda', price: 15, quantity: undefined as unknown as number },
        { id: '3', name: 'Agua', price: 10, quantity: 1 },
      ] as OrderItem[];

      // NaN y undefined caen en fallback 0 -> total = 10
      expect(calculateTotal(corruptOrder)).toBe(10);
    });
  });

  describe('Validación de Comanda y Cobro (canProcessCharge)', () => {
    it('debe rechazar el cobro si la comanda está vacía', () => {
      const result = canProcessCharge([]);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('comanda vacía');
    });

    it('debe rechazar el cobro si el total calculado es <= 0', () => {
      const orderCero: OrderItem[] = [
        { id: '1', name: 'Muestra Gratis', price: 0, quantity: 1 },
      ];
      const result = canProcessCharge(orderCero);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('cero o negativo');
    });

    it('debe permitir el cobro cuando la comanda tiene items con total positivo', () => {
      const order: OrderItem[] = [
        { id: '1', name: 'Café', price: 1500, quantity: 1 },
      ];
      const result = canProcessCharge(order);
      expect(result.valid).toBe(true);
    });
  });

  describe('Inmutabilidad en manipulación de comandas', () => {
    it('addToOrder no debe mutar el arreglo original (inmutabilidad estricta)', () => {
      const original: OrderItem[] = Object.freeze([
        Object.freeze({ id: '1', name: 'Café', price: 1000, quantity: 1 }),
      ]) as unknown as OrderItem[];

      const next = addToOrder(original, { id: '2', name: 'Pastel', price: 2000 });

      expect(next).toHaveLength(2);
      expect(original).toHaveLength(1);
    });

    it('decrementFromOrder debe remover el item cuando su cantidad llega a 0 sin mutar el original', () => {
      const original: OrderItem[] = Object.freeze([
        Object.freeze({ id: '1', name: 'Café', price: 1000, quantity: 1 }),
        Object.freeze({ id: '2', name: 'Pastel', price: 2000, quantity: 2 }),
      ]) as unknown as OrderItem[];

      const afterDecrement1 = decrementFromOrder(original, '1');
      expect(afterDecrement1).toHaveLength(1);
      expect(afterDecrement1[0].id).toBe('2');

      const afterDecrement2 = decrementFromOrder(original, '2');
      expect(afterDecrement2).toHaveLength(2);
      expect(afterDecrement2.find((i) => i.id === '2')?.quantity).toBe(1);
    });
  });

  describe('Auditoría Cajero - PIN de 5 Dígitos', () => {
    const isValidCashierPin = (pin: string) => /^\d{5}$/.test(pin.trim());

    it('debe aceptar PINs válidos de exactamente 5 dígitos numéricos', () => {
      expect(isValidCashierPin('12345')).toBe(true);
      expect(isValidCashierPin('98760')).toBe(true);
      expect(isValidCashierPin(' 45678 ')).toBe(true);
    });

    it('debe rechazar PINs con menos o más de 5 dígitos, o con caracteres no numéricos', () => {
      expect(isValidCashierPin('1234')).toBe(false);
      expect(isValidCashierPin('123456')).toBe(false);
      expect(isValidCashierPin('12a45')).toBe(false);
      expect(isValidCashierPin('')).toBe(false);
      expect(isValidCashierPin('abcde')).toBe(false);
    });
  });

  describe('Auditoría Pedidos - Aislamiento por Mesa y Órdenes Exprés', () => {
    it('debe mantener órdenes separadas e independientes por mesa sin contaminación cruzada', () => {
      let tableOrders: Record<string, OrderItem[]> = {};

      const setOrderForTable = (table: string, dish: Dish) => {
        const active = tableOrders[table] || [];
        tableOrders = {
          ...tableOrders,
          [table]: addToOrder(active, dish),
        };
      };

      // Mesa 1 pide Pizza
      setOrderForTable('Mesa 1', { id: 'p1', name: 'Pizza', price: 5000 });
      // Mesa 2 pide Hamburguesa
      setOrderForTable('Mesa 2', { id: 'h1', name: 'Hamburguesa', price: 3500 });

      expect(tableOrders['Mesa 1']).toHaveLength(1);
      expect(tableOrders['Mesa 1'][0].name).toBe('Pizza');

      expect(tableOrders['Mesa 2']).toHaveLength(1);
      expect(tableOrders['Mesa 2'][0].name).toBe('Hamburguesa');

      // Cobrar Mesa 1 elimina únicamente Mesa 1
      const { ['Mesa 1']: _, ...remaining } = tableOrders;
      tableOrders = remaining;

      expect(tableOrders['Mesa 1']).toBeUndefined();
      expect(tableOrders['Mesa 2']).toHaveLength(1);
      expect(tableOrders['Mesa 2'][0].name).toBe('Hamburguesa');
    });

    it('debe validar obligatoriedad de nombre para pedidos exprés', () => {
      const validateExpressOrder = (isExpress: boolean, expressName: string, order: OrderItem[]) => {
        if (order.length === 0) return { valid: false, error: 'Comanda vacía' };
        if (isExpress && !expressName.trim()) {
          return { valid: false, error: 'Nombre de cliente requerido para exprés' };
        }
        return { valid: true };
      };

      const validOrder: OrderItem[] = [{ id: '1', name: 'Tacos', price: 2000, quantity: 1 }];

      expect(validateExpressOrder(true, '', validOrder).valid).toBe(false);
      expect(validateExpressOrder(true, '   ', validOrder).valid).toBe(false);
      expect(validateExpressOrder(true, 'Carlos Solís', validOrder).valid).toBe(true);
      expect(validateExpressOrder(false, '', validOrder).valid).toBe(true);
    });
  });
});
