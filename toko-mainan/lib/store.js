'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { PRODUCTS } from './products';

const Ctx = createContext(null);
const CART_KEY = 'bt_cart';
const ORDERS_KEY = 'bt_orders';

const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export function StoreProvider({ children }) {
  const [cart, setCart] = useState([]); // [{id, qty}]
  const [ready, setReady] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { setCart(read(CART_KEY, [])); setReady(true); }, []);
  useEffect(() => { if (ready) write(CART_KEY, cart); }, [cart, ready]);

  const add = useCallback((id, qty = 1) => {
    const p = PRODUCTS.find((x) => x.id === id);
    if (!p || p.stock <= 0) return;
    setCart((c) => {
      const ex = c.find((x) => x.id === id);
      if (ex) return c.map((x) => (x.id === id ? { ...x, qty: Math.min(p.stock, x.qty + qty) } : x));
      return [...c, { id, qty: Math.min(p.stock, qty) }];
    });
    setDrawer(true);
  }, []);
  const setQty = useCallback((id, qty) => {
    const p = PRODUCTS.find((x) => x.id === id);
    setCart((c) => c.map((x) => (x.id === id ? { ...x, qty: Math.max(1, Math.min(p?.stock || 1, qty)) } : x)));
  }, []);
  const remove = useCallback((id) => setCart((c) => c.filter((x) => x.id !== id)), []);
  const clear = useCallback(() => setCart([]), []);

  const items = cart
    .map((c) => ({ ...c, product: PRODUCTS.find((p) => p.id === c.id) }))
    .filter((x) => x.product);
  const count = items.reduce((s, x) => s + x.qty, 0);

  const notify = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); }, []);

  return (
    <Ctx.Provider value={{ items, count, ready, add, setQty, remove, clear, drawer, setDrawer, toast, notify }}>
      {children}
    </Ctx.Provider>
  );
}

export const useStore = () => useContext(Ctx);

export const saveOrder = (o) => write(ORDERS_KEY, [o, ...read(ORDERS_KEY, []).filter((x) => x.id !== o.id)].slice(0, 50));
export const getOrders = () => read(ORDERS_KEY, []);
export const getOrder = (id) => getOrders().find((o) => o.id === id);
