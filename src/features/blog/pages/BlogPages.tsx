import { Link, useParams } from "react-router-dom"
import { ARTICLES } from "@/lib/mock/catalog"

export function BlogPage() {
  return (
    <main className="band blog" id="main-content" tabIndex={-1}>
      <p className="kicker">Blog</p>
      <h1>Cách làm từng dạng, viết ngắn.</h1>
      <div className="article-row">
        {ARTICLES.map((article) => (
          <Link key={article.slug} to={`/blog/${article.slug}`}>
            <span>{article.kicker} · {article.minutes} phút đọc</span>
            <strong>{article.title}</strong>
            <p>{article.lead}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}

export function ArticlePage() {
  const { slug } = useParams()
  const article = ARTICLES.find((item) => item.slug === slug)

  if (!article) {
    return (
      <main className="band" id="main-content" tabIndex={-1}>
        <h1>Không thấy bài viết này.</h1>
        <Link className="cta" to="/blog">Về danh sách bài</Link>
      </main>
    )
  }

  return (
    <article className="band article" id="main-content" tabIndex={-1}>
      <p className="kicker">{article.kicker} · {article.minutes} phút đọc</p>
      <h1>{article.title}</h1>
      <p className="article__lead">{article.lead}</p>
      {article.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      <Link className="cta" to="/practice">Làm một đề thuộc dạng này</Link>
    </article>
  )
}
