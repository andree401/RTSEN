'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Dish = {
  id: string;
  name: string;
  price: number;
};

type MenuContextType = {
  menu: Dish[];
  addDish: (dish: Omit<Dish, 'id'>) => void;
  updateDish: (id: string, updatedDish: Omit<Dish, 'id'>) => void;
  deleteDish: (id: string) => void;
};

const DEFAULT_MENU: Dish[] = [
  { id: '1', name: 'Tacos al Pastor', price: 15 },
  { id: '2', name: 'Hamburguesa Clásica', price: 80 },
  { id: '3', name: 'Pizza Pepperoni', price: 120 },
  { id: '4', name: 'Refresco', price: 25 },
  { id: '5', name: 'Agua de Jamaica', price: 20 },
  { id: '6', name: 'Ensalada César', price: 70 },
];

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<Dish[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedMenu = localStorage.getItem('finanzas_menu');
    if (savedMenu) {
      setMenu(JSON.parse(savedMenu));
    } else {
      setMenu(DEFAULT_MENU);
      localStorage.setItem('finanzas_menu', JSON.stringify(DEFAULT_MENU));
    }
    setIsLoaded(true);
  }, []);

  const saveMenu = (newMenu: Dish[]) => {
    setMenu(newMenu);
    localStorage.setItem('finanzas_menu', JSON.stringify(newMenu));
  };

  const addDish = (dish: Omit<Dish, 'id'>) => {
    const newDish = { ...dish, id: Date.now().toString() };
    saveMenu([...menu, newDish]);
  };

  const updateDish = (id: string, updatedDish: Omit<Dish, 'id'>) => {
    saveMenu(menu.map((d) => (d.id === id ? { ...d, ...updatedDish } : d)));
  };

  const deleteDish = (id: string) => {
    saveMenu(menu.filter((d) => d.id !== id));
  };

  if (!isLoaded) {
    return null; // Or a loading spinner if preferred
  }

  return (
    <MenuContext.Provider value={{ menu, addDish, updateDish, deleteDish }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
}
