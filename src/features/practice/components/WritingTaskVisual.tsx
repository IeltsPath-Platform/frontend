import { ChartNoAxesColumnIncreasing, Expand } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

function TransportChart({ large = false }: { large?: boolean }) {
  return <svg className={`writing-transport-chart${large ? ' is-large' : ''}`} viewBox="0 0 560 300" role="img" aria-label="Biểu đồ cột thể hiện tỷ lệ sử dụng ô tô, xe buýt và xe đạp từ năm 2000 đến 2020">
    <line x1="64" y1="32" x2="64" y2="246" className="writing-chart-axis" /><line x1="64" y1="246" x2="532" y2="246" className="writing-chart-axis" />
    {[0, 25, 50, 75, 100].map((value, index) => <g key={value}><line x1="64" y1={246 - index * 53.5} x2="532" y2={246 - index * 53.5} className="writing-chart-grid" /><text x="48" y={251 - index * 53.5} textAnchor="end">{value}</text></g>)}
    <g className="writing-chart-car"><rect x="124" y="96" width="30" height="150" rx="4" /><rect x="274" y="118" width="30" height="128" rx="4" /><rect x="424" y="140" width="30" height="106" rx="4" /></g>
    <g className="writing-chart-bus"><rect x="158" y="150" width="30" height="96" rx="4" /><rect x="308" y="139" width="30" height="107" rx="4" /><rect x="458" y="128" width="30" height="118" rx="4" /></g>
    <g className="writing-chart-bike"><rect x="192" y="204" width="30" height="42" rx="4" /><rect x="342" y="182" width="30" height="64" rx="4" /><rect x="492" y="161" width="30" height="85" rx="4" /></g>
    <g className="writing-chart-labels"><text x="174" y="275" textAnchor="middle">2000</text><text x="324" y="275" textAnchor="middle">2010</text><text x="474" y="275" textAnchor="middle">2020</text></g>
  </svg>
}

export function WritingTaskVisual() {
  return (
    <section className="writing-task-visual" aria-labelledby="writing-visual-heading">
      <div className="writing-visual-header"><div><p className="workspace-eyebrow">TASK VISUAL</p><h2 id="writing-visual-heading">Transport use in a European city</h2></div><ChartNoAxesColumnIncreasing aria-hidden="true" size={22} /></div>
      <TransportChart />
      <div className="writing-chart-legend" aria-label="Chú thích biểu đồ"><span className="car">Car</span><span className="bus">Bus</span><span className="bike">Bicycle</span></div>
      <Dialog><DialogTrigger asChild><Button type="button" variant="outline" className="writing-zoom-button"><Expand aria-hidden="true" size={17} />Phóng to biểu đồ</Button></DialogTrigger><DialogContent className="writing-chart-dialog"><DialogHeader><DialogTitle>Transport use in a European city</DialogTitle><DialogDescription>Use the visual to identify trends and comparisons for Writing Task 1.</DialogDescription></DialogHeader><TransportChart large /></DialogContent></Dialog>
    </section>
  )
}
