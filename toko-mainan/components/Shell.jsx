'use client';
import { StoreProvider, useStore } from '../lib/store';
import Header from './Header';
import CartDrawer from './CartDrawer';
import { waChatUrl } from '../lib/order';

function Toast() {
  const { toast } = useStore();
  return toast ? <div className="toast">{toast}</div> : null;
}

export default function Shell({ children, footer }) {
  return (
    <StoreProvider>
      <Header />
      <main>{children}</main>
      {footer}
      <CartDrawer />
      <Toast />
      <a className="wa-float" href={waChatUrl()} target="_blank" rel="noreferrer" aria-label="Chat WhatsApp">
        <svg viewBox="0 0 32 32" width="30" height="30" fill="#fff"><path d="M16 3C9 3 3.3 8.7 3.3 15.7c0 2.2.6 4.4 1.7 6.3L3 29l7.2-1.9c1.8 1 3.8 1.5 5.8 1.5 7 0 12.7-5.7 12.7-12.7S23 3 16 3zm0 23.2c-1.9 0-3.7-.5-5.3-1.5l-.4-.2-4.3 1.1 1.1-4.2-.3-.4c-1.1-1.7-1.6-3.6-1.6-5.5C5.2 9.8 10 5 16 5s10.7 4.8 10.7 10.7S21.9 26.2 16 26.2zm5.9-8c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.7 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.7-.4z"/></svg>
      </a>
    </StoreProvider>
  );
}
