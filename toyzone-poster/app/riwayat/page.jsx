'use client';
import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import PostList, { useToast } from '../../components/PostList';

export default function History() {
  const [posts, setPosts] = useState(null);
  const [toast, notify] = useToast();
  useEffect(() => {
    fetch('/api/posts?status=published').then((r) => r.json()).then((d) => setPosts((d.posts || []).reverse()));
  }, []);
  return (
    <>
      <Header />
      <main className="wrap page">
        <div className="page-head"><div><h1>Riwayat Terbit</h1><p className="muted">Postingan yang sudah terbit di @toyzone888.</p></div></div>
        {posts === null ? <p className="muted">Memuat…</p> : posts.length === 0
          ? <div className="empty"><h3>Belum ada postingan yang terbit</h3><p>Postingan yang disetujui akan muncul di sini setelah terbit.</p></div>
          : <PostList posts={posts} setPosts={setPosts} notify={notify} />}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
