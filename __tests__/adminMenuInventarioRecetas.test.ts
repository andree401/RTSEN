import { describe, it, expect } from 'vitest';

describe('Admin Module Audit - Menú, Inventario, Recetas y Sincronización', () => {
  describe('1. Validación de Platillos del Menú', () => {
    function validateDish(name: string, priceStr: string, existingMenu: { name: string }[]) {
      const cleanName = name.trim();
      if (!cleanName) return { valid: false, error: 'El nombre no puede estar vacío' };
      if (cleanName.length < 2) return { valid: false, error: 'El nombre debe tener al menos 2 caracteres' };
      if (priceStr.trim() === '') return { valid: false, error: 'El precio es requerido' };
      const price = Number(priceStr);
      if (isNaN(price) || price < 0) return { valid: false, error: 'El precio debe ser >= 0' };
      const duplicate = existingMenu.some(d => d.name.trim().toLowerCase() === cleanName.toLowerCase());
      if (duplicate) return { valid: false, error: 'Platillo duplicado' };
      return { valid: true, cleanName, price };
    }

    it('rechaza nombres vacíos o con solo espacios', () => {
      expect(validateDish('   ', '25', []).valid).toBe(false);
      expect(validateDish('', '25', []).valid).toBe(false);
    });

    it('rechaza nombres de 1 solo carácter', () => {
      expect(validateDish('A', '25', []).valid).toBe(false);
    });

    it('rechaza precios negativos o no numéricos', () => {
      expect(validateDish('Tacos', '-10', []).valid).toBe(false);
      expect(validateDish('Tacos', 'abc', []).valid).toBe(false);
    });

    it('acepta precio 0 (degustaciones o cortesías)', () => {
      const res = validateDish('Agua gratis', '0', []);
      expect(res.valid).toBe(true);
      if (res.valid) expect(res.price).toBe(0);
    });

    it('previene platillos duplicados insensible a mayúsculas', () => {
      const menu = [{ name: 'Hamburguesa Doble' }];
      expect(validateDish('hamburguesa doble', '100', menu).valid).toBe(false);
    });
  });

  describe('2. Auditoría del Inventario y Existencias', () => {
    function validateInventarioItem(nombre: string, unidad: string, cantidadStr: string, existingItems: { nombre: string }[]) {
      const cleanNombre = nombre.trim();
      const cleanUnidad = unidad.trim();
      if (!cleanNombre) return { valid: false, error: 'Nombre requerido' };
      if (!cleanUnidad) return { valid: false, error: 'Unidad requerida' };
      if (cantidadStr.trim() === '') return { valid: false, error: 'Cantidad requerida' };
      const cantidad = Number(cantidadStr);
      if (isNaN(cantidad) || cantidad < 0) return { valid: false, error: 'Cantidad debe ser >= 0' };
      const duplicate = existingItems.some(i => i.nombre.trim().toLowerCase() === cleanNombre.toLowerCase());
      if (duplicate) return { valid: false, error: 'Ingrediente duplicado' };
      return { valid: true, cleanNombre, cleanUnidad, cantidad };
    }

    it('permite stock inicial 0 para insumos agotados o pendientes de entrega', () => {
      const res = validateInventarioItem('Aguacate Hass', 'kg', '0', []);
      expect(res.valid).toBe(true);
      if (res.valid) expect(res.cantidad).toBe(0);
    });

    it('rechaza stock negativo', () => {
      expect(validateInventarioItem('Tomate', 'kg', '-2.5', []).valid).toBe(false);
    });

    it('previene duplicación de ingredientes en almacén', () => {
      const existing = [{ nombre: 'Cebolla Morada' }];
      expect(validateInventarioItem('cebolla morada', 'kg', '10', existing).valid).toBe(false);
    });

    it('valida edición rápida aceptando 0', () => {
      const validateQuickEdit = (val: string) => {
        if (val.trim() === '') return false;
        const n = Number(val);
        return !isNaN(n) && n >= 0;
      };
      expect(validateQuickEdit('0')).toBe(true);
      expect(validateQuickEdit('15.5')).toBe(true);
      expect(validateQuickEdit('-1')).toBe(false);
      expect(validateQuickEdit('')).toBe(false);
    });
  });

  describe('3. Auditoría de Recetas Multi-Ingrediente y Duplicados', () => {
    type Row = { ingrediente_id: string; cantidad_requerida: string };

    function validateRecipeBatch(
      rows: Row[],
      existingRecipeIngIdsForDish: Set<string>
    ) {
      if (rows.length === 0) return { valid: false, error: 'Al menos un ingrediente' };

      const seenInBatch = new Set<string>();
      for (const row of rows) {
        if (!row.ingrediente_id) return { valid: false, error: 'Ingrediente vacío' };
        if (seenInBatch.has(row.ingrediente_id)) {
          return { valid: false, error: 'Ingrediente duplicado en el lote' };
        }
        seenInBatch.add(row.ingrediente_id);

        if (existingRecipeIngIdsForDish.has(row.ingrediente_id)) {
          return { valid: false, error: 'Ingrediente ya presente en la receta del platillo' };
        }

        const qty = Number(row.cantidad_requerida);
        if (isNaN(qty) || qty <= 0) {
          return { valid: false, error: 'Porción debe ser > 0' };
        }
      }
      return { valid: true };
    }

    it('detecta y bloquea ingredientes duplicados en el lote del formulario', () => {
      const rows: Row[] = [
        { ingrediente_id: 'ing-1', cantidad_requerida: '0.2' },
        { ingrediente_id: 'ing-1', cantidad_requerida: '0.5' },
      ];
      const res = validateRecipeBatch(rows, new Set());
      expect(res.valid).toBe(false);
      expect(res.error).toContain('duplicado en el lote');
    });

    it('detecta y bloquea ingredientes que ya existen en la receta del platillo', () => {
      const rows: Row[] = [
        { ingrediente_id: 'ing-carne', cantidad_requerida: '0.25' }
      ];
      const existingInDish = new Set(['ing-carne', 'ing-pan']);
      const res = validateRecipeBatch(rows, existingInDish);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('ya presente en la receta');
    });

    it('valida con éxito un lote multi-ingrediente legítimo', () => {
      const rows: Row[] = [
        { ingrediente_id: 'ing-tortilla', cantidad_requerida: '3' },
        { ingrediente_id: 'ing-pastor', cantidad_requerida: '0.15' },
        { ingrediente_id: 'ing-pina', cantidad_requerida: '0.03' },
      ];
      const res = validateRecipeBatch(rows, new Set(['ing-cilantro']));
      expect(res.valid).toBe(true);
    });
  });

  describe('4. Eliminación Segura y Protección Referencial', () => {
    it('identifica dependencias antes de eliminar un ingrediente del inventario', () => {
      const mockRecetas = [
        { id: 'r1', ingrediente_id: 'ing-123', platillo: 'Tacos' },
        { id: 'r2', ingrediente_id: 'ing-123', platillo: 'Gringas' },
        { id: 'r3', ingrediente_id: 'ing-456', platillo: 'Ensalada' },
      ];

      const checkDependencies = (ingId: string) => {
        return mockRecetas.filter(r => r.ingrediente_id === ingId);
      };

      const deps = checkDependencies('ing-123');
      expect(deps.length).toBe(2);
      expect(deps.map(d => d.platillo)).toEqual(['Tacos', 'Gringas']);
    });
  });
});
