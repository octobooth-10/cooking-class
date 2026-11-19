import type { RecipeId } from './content';

export default function Food({ recipe, burned = false }: { recipe: RecipeId; burned?: boolean }) {
  return (
    <svg viewBox="0 0 240 180" aria-hidden="true" className={`food-art ${burned ? 'charred' : ''}`}>
      <ellipse cx="120" cy="153" rx="91" ry="15" fill="#06090d" opacity=".3" />
      <ellipse cx="120" cy="124" rx="100" ry="37" fill="#b5c5d6" />
      <ellipse cx="120" cy="119" rx="100" ry="35" fill="#edf2f7" />
      <ellipse cx="120" cy="118" rx="80" ry="25" fill="#d2dce6" />
      {recipe === 'waffles' && <g transform="rotate(-12 120 90)">
        <rect x="48" y="46" width="143" height="96" rx="23" fill="#a95422" />
        <rect x="48" y="36" width="143" height="96" rx="23" fill="#edac4a" stroke="#ffd681" strokeWidth="4" />
        {[0, 1, 2, 3].map(x => [0, 1, 2].map(y => <rect key={`${x}-${y}`} x={61 + x * 31} y={49 + y * 25} width="23" height="17" rx="4" fill="#c47a2c" stroke="#fbc46a" strokeWidth="2" />))}
        <path d="M75 64 Q106 85 146 69 T177 87 L173 108 Q146 94 133 111 T83 92Z" fill="#a65c29" opacity=".7" />
        <rect x="102" y="65" width="34" height="26" rx="5" fill="#ffe998" transform="rotate(18 119 78)" />
      </g>}
      {recipe === 'pancakes' && <g>
        {[105, 89, 73].map((y, i) => <g key={y}><ellipse cx="120" cy={y + 10} rx="73" ry="25" fill="#af602b" /><ellipse cx="120" cy={y} rx="73" ry="25" fill={i === 2 ? '#f5bd69' : '#e8a651'} /><path d={`M53 ${y + 5} Q119 ${y + 38} 187 ${y + 5}`} fill="none" stroke="#ffdda0" strokeWidth="5" /></g>)}
        <path d="M85 62 Q119 40 158 65 Q155 85 138 88 L137 113 Q126 122 124 105 L122 85 Q99 91 85 78Z" fill="#b46b33" />
        <rect x="107" y="50" width="31" height="23" rx="5" fill="#ffe998" transform="rotate(-12 122 62)" />
        <circle cx="72" cy="94" r="9" fill="#5865ba" /><circle cx="84" cy="104" r="8" fill="#7084d2" />
      </g>}
      {recipe === 'cookie' && <g>
        <path d="M179 106 L228 80" stroke="#202832" strokeWidth="20" strokeLinecap="round" />
        <ellipse cx="115" cy="106" rx="81" ry="44" fill="#242c36" stroke="#4a5564" strokeWidth="5" />
        <ellipse cx="115" cy="97" rx="69" ry="34" fill="#d68c40" stroke="#a75b2b" strokeWidth="5" />
        {[[74, 90], [103, 113], [144, 106], [164, 87], [111, 76], [66, 104], [136, 82]].map(([x, y]) => <rect key={x} x={x} y={y} width="10" height="8" rx="2" fill="#583729" transform={`rotate(20 ${x} ${y})`} />)}
        <circle cx="119" cy="74" r="22" fill="#fff1d2" /><path d="M104 71 Q117 52 133 70" fill="none" stroke="#ffe0a6" strokeWidth="5" />
      </g>}
      {recipe === 'latte' && <g>
        <path d="M164 74 Q198 72 196 97 Q194 121 158 116" fill="none" stroke="#2457a8" strokeWidth="11" strokeLinecap="round" />
        <path d="M68 62 L172 62 L161 123 Q120 141 79 123Z" fill="#2f6bd0" />
        <path d="M76 70 L86 120" stroke="#6b9bf0" strokeWidth="6" strokeLinecap="round" opacity=".6" />
        <ellipse cx="120" cy="62" rx="52" ry="15" fill="#5b8fe6" />
        <ellipse cx="120" cy="63" rx="45" ry="11" fill="#8a5129" />
        <path d="M120 72 C104 62 104 52 113 52 Q118 52 120 57 Q122 52 127 52 C136 52 136 62 120 72Z" fill="#f6dfb8" />
        <g fill="none" stroke="#c9d6e3" strokeWidth="4" strokeLinecap="round" opacity=".55"><path d="M104 40 Q96 28 106 18" /><path d="M136 40 Q128 26 140 14" /></g>
      </g>}
      <g fill="#e97085"><circle cx="180" cy="130" r="9" /><circle cx="194" cy="121" r="7" /></g>
      <path d="M179 119 Q172 104 185 108 L189 118" fill="#56ad70" />
    </svg>
  );
}
