'use client';
import { createContext, useContext } from 'react';

// Katalog produk dari server (Netlify Blobs) untuk semua komponen client
const Ctx = createContext({ products: [], categories: [] });
export const CatalogProvider = ({ catalog, children }) => <Ctx.Provider value={catalog}>{children}</Ctx.Provider>;
export const useCatalog = () => useContext(Ctx);
