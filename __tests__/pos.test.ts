import { describe, it, expect } from 'vitest';

type Dish = { id: string; price: number; name: string };
type OrderItem = Dish & { quantity: number };

function calculateTotal(order: OrderItem[]) {
  return order.reduce((acc, item) => acc + item.price * item.quantity, 0);
}

describe('POS Logic - Sums', () => {
  it('should calculate total correctly for empty order', () => {
    expect(calculateTotal([])).toBe(0);
  });

  it('should calculate total correctly for multiple items', () => {
    const order: OrderItem[] = [
      { id: '1', name: 'Taco', price: 20, quantity: 2 },
      { id: '2', name: 'Soda', price: 15, quantity: 1 }
    ];
    expect(calculateTotal(order)).toBe(55);
  });

  it('should calculate total correctly with discounts or large numbers', () => {
    const order: OrderItem[] = [
      { id: '1', name: 'Steak', price: 500.5, quantity: 3 }
    ];
    expect(calculateTotal(order)).toBe(1501.5);
  });
});
