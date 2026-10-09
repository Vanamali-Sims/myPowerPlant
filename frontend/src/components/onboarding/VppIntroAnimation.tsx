/**
 * SVG story: sun → roof solar → home battery → networked VPP cluster.
 */
import { useReducedMotion } from '../../lib/useReducedMotion'

export function VppIntroAnimation() {
  const reduceMotion = useReducedMotion()

  return (
    <svg
      className={`vpp-intro-anim${reduceMotion ? ' vpp-intro-anim--static' : ''}`}
      viewBox="0 0 480 280"
      role="img"
      aria-label="Sun powers solar panels, a home battery, then a network of batteries"
    >
      <defs>
        <linearGradient id="vpp-intro-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a3d32" />
          <stop offset="100%" stopColor="#0e241e" />
        </linearGradient>
        <radialGradient id="vpp-intro-sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f2d5c2" stopOpacity="0.95" />
          <stop offset="70%" stopColor="#de6a34" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#de6a34" stopOpacity="0" />
        </radialGradient>
        <filter id="vpp-intro-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      <rect width="480" height="280" fill="url(#vpp-intro-sky)" rx="16" />

      <g className="vpp-intro-anim__sun">
        <circle cx="88" cy="72" r="44" fill="url(#vpp-intro-sun-glow)" />
        <circle cx="88" cy="72" r="22" fill="#f2d5c2" />
        <g stroke="#f2d5c2" strokeWidth="2" strokeLinecap="round" opacity="0.85">
          <line x1="88" y1="38" x2="88" y2="28" />
          <line x1="88" y1="106" x2="88" y2="116" />
          <line x1="54" y1="72" x2="44" y2="72" />
          <line x1="122" y1="72" x2="132" y2="72" />
          <line x1="64" y1="48" x2="57" y2="41" />
          <line x1="112" y1="96" x2="119" y2="103" />
          <line x1="112" y1="48" x2="119" y2="41" />
          <line x1="64" y1="96" x2="57" y2="103" />
        </g>
      </g>

      <g className="vpp-intro-anim__beam vpp-intro-anim__beam--a">
        <path d="M110 90 Q 170 120 210 130" fill="none" stroke="#de6a34" strokeWidth="2" opacity="0.5" />
      </g>
      <g className="vpp-intro-anim__beam vpp-intro-anim__beam--b">
        <path d="M110 90 Q 180 100 240 118" fill="none" stroke="#e4ae8c" strokeWidth="2" opacity="0.35" />
      </g>

      <g className="vpp-intro-anim__house">
        <path d="M168 148 L210 118 L252 148 V198 H168 Z" fill="#1f4a3c" stroke="#a3bca9" strokeWidth="1.5" />
        <rect x="188" y="128" width="44" height="10" rx="2" fill="#163529" />
        <g className="vpp-intro-anim__panels">
          <rect x="176" y="132" width="14" height="8" rx="1" fill="#4fa3d1" opacity="0.9" />
          <rect x="192" y="132" width="14" height="8" rx="1" fill="#4fa3d1" opacity="0.75" />
          <rect x="208" y="132" width="14" height="8" rx="1" fill="#4fa3d1" opacity="0.9" />
          <rect x="224" y="132" width="14" height="8" rx="1" fill="#4fa3d1" opacity="0.75" />
        </g>
        <rect x="198" y="168" width="24" height="30" rx="2" fill="#0d211a" stroke="#a3bca9" strokeWidth="1" />
        <rect x="228" y="162" width="18" height="36" rx="3" fill="#14312a" stroke="#de6a34" strokeWidth="1.5" />
        <rect x="231" y="178" width="12" height="14" rx="1" fill="#de6a34" opacity="0.85" className="vpp-intro-anim__charge" />
      </g>

      <g className="vpp-intro-anim__link">
        <path
          d="M246 180 C 290 180, 300 160, 330 150"
          fill="none"
          stroke="#de6a34"
          strokeWidth="2"
          strokeDasharray="6 6"
        />
      </g>

      <g className="vpp-intro-anim__network" filter="url(#vpp-intro-soft)">
        <circle cx="340" cy="138" r="6" fill="#de6a34" />
        <circle cx="380" cy="118" r="5" fill="#4fa3d1" />
        <circle cx="418" cy="142" r="5" fill="#4fa3d1" />
        <circle cx="362" cy="168" r="5" fill="#a3bca9" />
        <circle cx="404" cy="178" r="6" fill="#de6a34" />
        <path
          d="M340 138 L380 118 L418 142 L404 178 L362 168 L340 138 Z"
          fill="none"
          stroke="#a3bca9"
          strokeWidth="1.2"
          opacity="0.7"
        />
        <path d="M380 118 L362 168" stroke="#de6a34" strokeWidth="1" opacity="0.5" />
        <path d="M418 142 L404 178" stroke="#de6a34" strokeWidth="1" opacity="0.5" />
      </g>

      <g className="vpp-intro-anim__pulse" opacity="0.35">
        <circle cx="392" cy="148" r="36" fill="none" stroke="#de6a34" strokeWidth="1" />
        <circle cx="392" cy="148" r="52" fill="none" stroke="#de6a34" strokeWidth="0.8" />
      </g>
    </svg>
  )
}
