import React from 'react';

interface SoccerBallLogoProps {
  className?: string;
  size?: number;
}

/**
 * Componente de Pelota de Fútbol vectorizada SVG nítida y deportiva.
 * Compatible con cualquier tamaño, con detalles de costuras y parches hexagonales/pentagonales.
 */
export const SoccerBallLogo: React.FC<SoccerBallLogoProps> = ({
  className = 'w-6 h-6',
  size
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        {/* Sombra y volumen esférico */}
        <radialGradient
          id="ballSphere"
          cx="38%"
          cy="32%"
          r="65%"
          fx="35%"
          fy="30%"
        >
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#e2e8f0" />
          <stop offset="85%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </radialGradient>

        <linearGradient id="patchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#090d16" />
        </linearGradient>

        <radialGradient id="ballShine" cx="30%" cy="25%" r="40%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Base esférica con sombra perimetral */}
      <circle
        cx="50"
        cy="50"
        r="47"
        fill="url(#ballSphere)"
        stroke="#334155"
        strokeWidth="2.5"
      />

      {/* Costuras de los paneles (líneas grises sutiles) */}
      <g stroke="#475569" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        {/* Conexiones del pentágono central hacia los parches periféricos */}
        <line x1="50" y1="36" x2="50" y2="18" />
        <line x1="62" y1="45" x2="80" y2="38" />
        <line x1="57" y1="60" x2="71" y2="76" />
        <line x1="43" y1="60" x2="29" y2="76" />
        <line x1="38" y1="45" x2="20" y2="38" />

        {/* Costuras entre parches periféricos */}
        <line x1="50" y1="18" x2="68" y2="10" />
        <line x1="50" y1="18" x2="32" y2="10" />
        <line x1="80" y1="38" x2="92" y2="28" />
        <line x1="80" y1="38" x2="88" y2="56" />
        <line x1="71" y1="76" x2="88" y2="78" />
        <line x1="71" y1="76" x2="50" y2="92" />
        <line x1="29" y1="76" x2="12" y2="78" />
        <line x1="29" y1="76" x2="50" y2="92" />
        <line x1="20" y1="38" x2="8" y2="28" />
        <line x1="20" y1="38" x2="12" y2="56" />
      </g>

      {/* Pentágono Central Negro */}
      <polygon
        points="50,36 62,45 57,60 43,60 38,45"
        fill="url(#patchGrad)"
        stroke="#0f172a"
        strokeWidth="1.5"
      />

      {/* Parche Superior */}
      <path
        d="M36,6 C40,4 60,4 64,6 L58,16 L42,16 Z"
        fill="url(#patchGrad)"
        stroke="#0f172a"
        strokeWidth="1.2"
      />

      {/* Parche Superior Derecho */}
      <path
        d="M86,22 C92,28 95,34 97,40 L88,46 L78,34 L82,24 Z"
        fill="url(#patchGrad)"
        stroke="#0f172a"
        strokeWidth="1.2"
      />

      {/* Parche Inferior Derecho */}
      <path
        d="M93,65 C90,73 84,81 78,86 L74,74 L80,62 L91,62 Z"
        fill="url(#patchGrad)"
        stroke="#0f172a"
        strokeWidth="1.2"
      />

      {/* Parche Inferior (Base) */}
      <path
        d="M38,94 C46,97 54,97 62,94 L57,84 L43,84 Z"
        fill="url(#patchGrad)"
        stroke="#0f172a"
        strokeWidth="1.2"
      />

      {/* Parche Inferior Izquierdo */}
      <path
        d="M7,65 C10,73 16,81 22,86 L26,74 L20,62 L9,62 Z"
        fill="url(#patchGrad)"
        stroke="#0f172a"
        strokeWidth="1.2"
      />

      {/* Parche Superior Izquierdo */}
      <path
        d="M14,22 C8,28 5,34 3,40 L12,46 L22,34 L18,24 Z"
        fill="url(#patchGrad)"
        stroke="#0f172a"
        strokeWidth="1.2"
      />

      {/* Brillo especular superior */}
      <ellipse
        cx="36"
        cy="28"
        rx="20"
        ry="14"
        transform="rotate(-25 36 28)"
        fill="url(#ballShine)"
        pointerEvents="none"
      />
    </svg>
  );
};
