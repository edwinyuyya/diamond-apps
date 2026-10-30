'use client';
import { useCallback, useEffect, useState } from 'react';
import PostCard from './PostCard';

export function useToast() {
  const [toast, setToast] = useState(null);
  const notify = useCallback((m) => { setToast(m); setTimeout(() => setToast(null), 3200); }, []);
  return [toast, notify];
}

export default function PostList({ posts, setPosts, notify }) {
  const [zoom, setZoom] = useState(null);
  const onChange = (np) => setPosts((ps) => ps.map((p) => (p.id === np.id ? np : p)));
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && setZoom(null);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);
  return (
    <>
      <div className="grid">
        {posts.map((p) => <PostCard key={p.id + p.updated_at} post={p} onChange={onChange} notify={notify} onZoom={setZoom} />)}
      </div>
      {zoom && <div className="modal" onClick={() => setZoom(null)}><img src={zoom} alt="Pratinjau postingan" /></div>}
    </>
  );
}
