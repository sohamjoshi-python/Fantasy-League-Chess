import React, { useEffect, useMemo, useState } from 'react'
import { ordinal } from '../lib/weeklyRecap'

const HEIGHT = 220
const PAD = { top: 14, right: 14, bottom: 28, left: 44 }

function useContainerWidth() {
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!node) return
    const update = () => setWidth(node.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])
  return [setNode, width] as const
}

/** "Nov 17" for short spans, "Nov '26" when the axis covers more than a season. */
function shortDate(isoDate: string, monthAndYear: boolean) {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number)
  const value = new Date(Date.UTC(year, month - 1, day))
  const monthName = value.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
  return monthAndYear ? `${monthName} '${String(year).slice(2)}` : `${monthName} ${day}`
}

function niceStep(range: number, targetTicks: number) {
  const raw = range / targetTicks
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const normalized = raw / magnitude
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return nice * magnitude
}

function Tooltip({ x, width, children }: { x: number; width: number; children: React.ReactNode }) {
  const alignRight = x > width * 0.6
  return (
    <div
      className="pointer-events-none absolute top-1 z-10 rounded-md bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg whitespace-nowrap"
      style={alignRight ? { right: width - x + 8 } : { left: x + 8 }}
    >
      {children}
    </div>
  )
}

export interface WeekPoints {
  week_start_date: string
  total_points: number
  games_played: number
}

export const PointsByWeekChart: React.FC<{ weeks: WeekPoints[] }> = ({ weeks }) => {
  const [ref, width] = useContainerWidth()
  const [hovered, setHovered] = useState<number | null>(null)
  const data = useMemo(
    () => weeks.slice().sort((a, b) => a.week_start_date.localeCompare(b.week_start_date)),
    [weeks]
  )

  if (data.length === 0) return null

  const values = data.map((week) => week.total_points)
  const rawMin = Math.min(0, ...values)
  const rawMax = Math.max(0, ...values)
  const step = niceStep(Math.max(rawMax - rawMin, 1), 4)
  const yMin = Math.floor(rawMin / step) * step
  const yMax = Math.ceil(rawMax / step) * step || step
  const ticks: number[] = []
  for (let tick = yMin; tick <= yMax + step / 2; tick += step) ticks.push(Number(tick.toFixed(6)))

  const plotWidth = Math.max(width - PAD.left - PAD.right, 1)
  const plotHeight = HEIGHT - PAD.top - PAD.bottom
  const slot = plotWidth / data.length
  const barWidth = Math.max(Math.min(slot * 0.7, 28), 2)
  const y = (value: number) => PAD.top + ((yMax - value) / (yMax - yMin)) * plotHeight
  const xCenter = (index: number) => PAD.left + slot * index + slot / 2
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(Math.floor(plotWidth / 70), 1)))
  const spansYears = data[0].week_start_date.slice(0, 4) !== data[data.length - 1].week_start_date.slice(0, 4)
  const xLabels: { index: number; text: string }[] = []
  data.forEach((week, index) => {
    if (index % labelEvery !== 0) return
    const text = shortDate(week.week_start_date, spansYears && data.length > 12)
    if (xLabels[xLabels.length - 1]?.text !== text) xLabels.push({ index, text })
  })

  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const index = Math.floor((event.clientX - box.left - PAD.left) / slot)
    setHovered(index >= 0 && index < data.length ? index : null)
  }

  const active = hovered !== null ? data[hovered] : null

  return (
    <div ref={ref} className="relative w-full">
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Fantasy points by week"
          onPointerMove={handleMove}
          onPointerDown={handleMove}
          onPointerLeave={() => setHovered(null)}
          className="touch-pan-y select-none"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)}
                stroke={tick === 0 ? '#9ca3af' : '#e5e7eb'} strokeWidth={tick === 0 ? 1.25 : 1} />
              <text x={PAD.left - 6} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-gray-500 text-[11px]">
                {tick > 0 ? `+${tick}` : tick}
              </text>
            </g>
          ))}
          {data.map((week, index) => {
            const top = y(Math.max(week.total_points, 0))
            const bottom = y(Math.min(week.total_points, 0))
            return (
              <rect
                key={week.week_start_date}
                x={xCenter(index) - barWidth / 2}
                y={top}
                width={barWidth}
                height={Math.max(bottom - top, 1)}
                rx={Math.min(3, barWidth / 3)}
                fill={week.total_points >= 0 ? '#16a34a' : '#dc2626'}
                opacity={hovered === null || hovered === index ? 0.9 : 0.4}
              />
            )
          })}
          {xLabels.map(({ index, text }) => (
            <text key={index} x={xCenter(index)} y={HEIGHT - 8} textAnchor="middle" className="fill-gray-500 text-[11px]">
              {text}
            </text>
          ))}
        </svg>
      )}
      {active && hovered !== null && (
        <Tooltip x={xCenter(hovered)} width={width}>
          <div className="font-semibold">Week of {shortDate(active.week_start_date, false)}, {active.week_start_date.slice(0, 4)}</div>
          <div>
            {active.total_points >= 0 ? '+' : ''}{active.total_points.toFixed(1)} pts · {active.games_played} games
          </div>
        </Tooltip>
      )}
    </div>
  )
}

export interface FinishPoint {
  slug: string
  session: string | null
  event_date: string | null
  starts_at: string | null
  placement: number | null
  total_players: number | null
}

const PLACE_TICKS = [1, 3, 10, 30, 100, 300, 1000]

function rollingMedian(values: number[], windowSize: number) {
  return values.map((_, index) => {
    const window = values.slice(Math.max(0, index - windowSize + 1), index + 1).sort((a, b) => a - b)
    const middle = Math.floor(window.length / 2)
    return window.length % 2 ? window[middle] : (window[middle - 1] + window[middle]) / 2
  })
}

export const FinishPlacesChart: React.FC<{ finishes: FinishPoint[] }> = ({ finishes }) => {
  const [ref, width] = useContainerWidth()
  const [hovered, setHovered] = useState<number | null>(null)

  const all = useMemo(
    () =>
      finishes
        .filter((finish) => finish.placement && (finish.starts_at || finish.event_date))
        .map((finish) => ({
          ...finish,
          time: new Date(finish.starts_at || `${finish.event_date}T12:00:00Z`).getTime(),
          placement: finish.placement as number,
        }))
        .sort((a, b) => a.time - b.time),
    [finishes]
  )
  const yearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000
  const recentCount = all.filter((finish) => finish.time >= yearAgo).length
  const [range, setRange] = useState<'year' | 'all'>(recentCount >= 8 && recentCount < all.length ? 'year' : 'all')

  const data = range === 'year' ? all.filter((finish) => finish.time >= yearAgo) : all
  if (all.length === 0) return null

  const worst = Math.max(...data.map((finish) => finish.placement), 10)
  const ticks = PLACE_TICKS.filter((tick) => tick <= worst * 1.05)
  const logMax = Math.log10(Math.max(worst, ticks[ticks.length - 1]))
  const plotWidth = Math.max(width - PAD.left - PAD.right, 1)
  const plotHeight = HEIGHT - PAD.top - PAD.bottom
  const tMin = data.length ? data[0].time : 0
  const tMax = data.length ? data[data.length - 1].time : 1
  const x = (time: number) =>
    PAD.left + (tMax === tMin ? plotWidth / 2 : ((time - tMin) / (tMax - tMin)) * plotWidth)
  const y = (placement: number) => PAD.top + (Math.log10(placement) / (logMax || 1)) * plotHeight
  const trend = rollingMedian(data.map((finish) => finish.placement), data.length > 60 ? 15 : 7)
  const trendPath = trend.map((value, index) => `${index ? 'L' : 'M'}${x(data[index].time)},${y(value)}`).join(' ')

  const spanDays = (tMax - tMin) / 86400000
  const labelCount = Math.max(2, Math.min(6, Math.floor(plotWidth / 90)))
  const xLabels = Array.from({ length: labelCount }, (_, i) => tMin + ((tMax - tMin) * i) / (labelCount - 1))

  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const pointerX = event.clientX - box.left
    let nearest: number | null = null
    let distance = Infinity
    data.forEach((finish, index) => {
      const gap = Math.abs(x(finish.time) - pointerX)
      if (gap < distance) {
        distance = gap
        nearest = index
      }
    })
    setHovered(distance <= 24 ? nearest : null)
  }

  const active = hovered !== null ? data[hovered] : null
  const dotRadius = data.length > 200 ? 2.5 : data.length > 60 ? 3.5 : 4.5

  return (
    <div>
      {recentCount > 0 && recentCount < all.length && (
        <div className="flex justify-end gap-1 mb-2">
          {(['year', 'all'] as const).map((option) => (
            <button
              key={option}
              onClick={() => { setRange(option); setHovered(null) }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                range === option ? 'bg-royalBlue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {option === 'year' ? 'Last 12 months' : 'All time'}
            </button>
          ))}
        </div>
      )}
      <div ref={ref} className="relative w-full">
        {width > 0 && data.length > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label="Titled Tuesday finishing places over time"
            onPointerMove={handleMove}
            onPointerDown={handleMove}
            onPointerLeave={() => setHovered(null)}
            className="touch-pan-y select-none"
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke="#e5e7eb" />
                <text x={PAD.left - 6} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-gray-500 text-[11px]">
                  {ordinal(tick)}
                </text>
              </g>
            ))}
            {data.map((finish, index) => (
              <circle
                key={finish.slug}
                cx={x(finish.time)}
                cy={y(finish.placement)}
                r={hovered === index ? dotRadius + 2 : dotRadius}
                fill={finish.placement <= 3 ? '#f59e0b' : finish.placement <= 10 ? '#2563eb' : '#94a3b8'}
                stroke="white"
                strokeWidth={data.length > 200 ? 0.5 : 1}
                opacity={hovered === null || hovered === index ? 0.9 : 0.5}
              />
            ))}
            {data.length >= 5 && (
              <path d={trendPath} fill="none" stroke="#1e3a8a" strokeWidth={2} strokeLinejoin="round" opacity={0.75} />
            )}
            {xLabels.map((time, index) => (
              <text
                key={index}
                x={x(time)}
                y={HEIGHT - 8}
                textAnchor={index === 0 ? 'start' : index === xLabels.length - 1 ? 'end' : 'middle'}
                className="fill-gray-500 text-[11px]"
              >
                {shortDate(new Date(time).toISOString(), spanDays > 120)}
              </text>
            ))}
          </svg>
        )}
        {active && hovered !== null && (
          <Tooltip x={x(active.time)} width={width}>
            <div className="font-semibold">
              {ordinal(active.placement)}{active.total_players ? ` of ${active.total_players}` : ''}
            </div>
            <div>
              {new Date(active.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
              {active.session ? ` · ${active.session}` : ''}
            </div>
          </Tooltip>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />Top 3</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" />Top 10</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-400" />Other</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-blue-900" />Rolling median</span>
      </div>
    </div>
  )
}
