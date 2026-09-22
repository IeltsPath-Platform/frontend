import { useState } from "react"
import { POSTS } from "@/lib/mock/catalog"

interface LocalPost { id: string; author: string; band: string; title: string; body: string; replies: number; time: string }

export function CommunityPage() {
  const [posts, setPosts] = useState<LocalPost[]>(POSTS)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [error, setError] = useState("")

  const publish = (event: React.FormEvent) => {
    event.preventDefault()
    if (title.trim().length < 8 || body.trim().length < 20) {
      setError("Tiêu đề cần ít nhất 8 ký tự và nội dung ít nhất 20 ký tự.")
      return
    }
    setPosts((current) => [{ id: `local-${Date.now()}`, author: "Bạn", band: "–", title: title.trim(), body: body.trim(), replies: 0, time: "vừa xong" }, ...current])
    setTitle("")
    setBody("")
    setError("")
  }

  return (
    <main className="band community" id="main-content" tabIndex={-1}>
      <p className="kicker">Cộng đồng</p>
      <h1>Hỏi đúng chỗ đang vướng.</h1>
      <div className="community__layout">
        <section className="feed" aria-label="Bài viết">
          {posts.map((post) => (
            <article key={post.id}>
              <p>{post.author} · band {post.band} · {post.time}</p>
              <h2>{post.title}</h2>
              <p>{post.body}</p>
              <span>{post.replies} phản hồi</span>
            </article>
          ))}
        </section>
        <form onSubmit={publish}>
          <h2>Đăng câu hỏi</h2>
          <label>Tiêu đề<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>Nội dung<textarea value={body} onChange={(event) => setBody(event.target.value)} rows={6} /></label>
          {error ? <p role="alert">{error}</p> : null}
          <button className="cta" type="submit">Đăng</button>
        </form>
      </div>
    </main>
  )
}
