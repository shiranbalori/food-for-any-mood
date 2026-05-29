import './BackgroundDecor.css'

const FLOATING_ICONS = ['🍕', '🥑', '🍳', '🥗', '🍜', '🧁', '🍋', '🥐', '🍓', '🫕']

export default function BackgroundDecor({ theme }) {
  return (
    <div className="bg-decor" aria-hidden="true">
      <div
        className="bg-decor__base"
        style={{
          '--theme-gradient': theme.gradient,
          '--theme-mesh': theme.mesh,
          '--theme-glow': theme.glow,
        }}
      />
      <div className="bg-decor__orb bg-decor__orb--1" />
      <div className="bg-decor__orb bg-decor__orb--2" />
      <div className="bg-decor__orb bg-decor__orb--3" />

      {FLOATING_ICONS.map((icon, index) => (
        <span
          key={icon}
          className="bg-decor__icon"
          style={{ '--i': index, '--delay': `${index * 0.7}s` }}
        >
          {icon}
        </span>
      ))}

      {Array.from({ length: 14 }, (_, index) => (
        <span
          key={`particle-${index}`}
          className="bg-decor__particle"
          style={{ '--i': index, '--delay': `${index * 0.45}s` }}
        />
      ))}
    </div>
  )
}
