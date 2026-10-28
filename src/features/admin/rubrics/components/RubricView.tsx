import type { Rubric } from '../types'

export function RubricView({ rubric }: { rubric: Rubric }) {
  return <article className="adm-rubric-view" aria-label={`${rubric.code} phiên bản ${rubric.version}`}>
    <h3>{rubric.code} · Phiên bản {rubric.version}</h3>
    <p className="adm-muted">{rubric.sourceNote}</p>
    {[...rubric.criteria].sort((a, b) => a.sortOrder - b.sortOrder).map((criterion) => <section key={criterion.code}>
      <h4>{criterion.code} · {criterion.name}</h4><p>{criterion.description}</p>
      <div className="adm-table-wrap"><table className="adm-table"><caption className="adm-sr-only">Mô tả band của {criterion.name}</caption><thead><tr><th className="adm-stt" scope="col">STT</th><th scope="col">Band</th><th scope="col">Mô tả</th></tr></thead><tbody>{[...criterion.bandDescriptors].sort((a, b) => a.band - b.band).map((item, index) => <tr key={item.band}><td className="adm-stt">{index + 1}</td><th scope="row">{item.band.toFixed(1)}</th><td>{item.descriptor}</td></tr>)}</tbody></table></div>
    </section>)}
    <h4>Bài mẫu ({rubric.examples.length})</h4>
    {rubric.examples.map((example, index) => <details key={index}><summary>Bài mẫu band {example.band.toFixed(1)}</summary><p><strong>Đề bài:</strong> {example.prompt}</p><p className="adm-rubric-essay">{example.essay}</p><p><strong>Nhận xét:</strong> {example.commentary}</p></details>)}
  </article>
}
