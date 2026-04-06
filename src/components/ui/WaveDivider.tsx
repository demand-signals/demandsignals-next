export function WaveDivider({ from, to, flip }: { from: string; to: string; flip?: boolean }) {
  return (
    <div style={{ lineHeight: 0, background: from, marginTop: -1 }}>
      <svg
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        style={{
          width: '100%',
          height: 40,
          display: 'block',
          transform: flip ? 'scaleY(-1)' : undefined,
        }}
      >
        <path
          d="M0,30 C360,60 720,0 1080,30 C1260,45 1380,20 1440,30 L1440,60 L0,60 Z"
          fill={to}
        />
      </svg>
    </div>
  )
}
