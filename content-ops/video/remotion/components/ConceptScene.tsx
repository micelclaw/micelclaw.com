import React from 'react';
import { AbsoluteFill, interpolate, spring, useVideoConfig } from 'remotion';
import { BRAND } from '../brand';

// Técnica 2: animación vectorial que explica un concepto del post (no hay captura). Tres guiones,
// todos cronometrados contra los inicios de beat que manda props.beats (`starts`), en segundos.
// Sin Math.random ni Date: el render tiene que ser determinista.

const BAD = '#ff6b5f';
const GOOD = '#3ddc84';
const MONO = BRAND.fontMono;

// 64 hex reales de pinta (no es un token de verdad) y la versión inventada de 42 que cita el post.
const TOKEN_OK = '7f3c9a2e41b8d05c6ea9147fb3820dce5194a7f60b2cd8e39a41675fcb02de8a';
const TOKEN_BAD = '4f9c2a7e1b8d5306ce4a91fb27d0538ea6c1b492e7'.slice(0, 42);

const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const ramp = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/** Caja-nodo con borde de acento (reutilizada por los tres guiones). */
const Node: React.FC<{
  k: number;
  name: string;
  role: string;
  accent: string;
  dim?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ k, name, role, accent, dim, style, children }) => (
  <div
    style={{
      background: BRAND.surface,
      border: `2px solid ${accent}`,
      borderRadius: 16 * k,
      padding: `${18 * k}px ${22 * k}px`,
      display: 'flex',
      flexDirection: 'column',
      gap: 6 * k,
      opacity: dim ? 0.42 : 1,
      filter: dim ? 'grayscale(1)' : 'none',
      ...style,
    }}
  >
    <div style={{ fontSize: 34 * k, fontWeight: 800, color: BRAND.text }}>{name}</div>
    <div style={{ fontSize: 22 * k, color: BRAND.dim }}>{role}</div>
    {children}
  </div>
);

const Chip: React.FC<{ k: number; color: string; label: string; style?: React.CSSProperties }> = ({
  k,
  color,
  label,
  style,
}) => (
  <div
    style={{
      alignSelf: 'flex-start',
      fontFamily: MONO,
      fontSize: 20 * k,
      color,
      border: `1px solid ${color}`,
      borderRadius: 999,
      padding: `${5 * k}px ${13 * k}px`,
      ...style,
    }}
  >
    {label}
  </div>
);

/* ─────────────────────────── A2 · el token que el modelo teclea ─────────────────────────── */
const TokenConcept: React.FC<{ k: number; t: number; s: number[] }> = ({ k, t, s }) => {
  const typed = Math.floor(ease(ramp(t, s[0] + 0.25, s[0] + 2.1)) * TOKEN_OK.length);
  const phase = t >= s[2] ? 2 : t >= s[1] ? 1 : 0; // 0 teclea · 1 falla · 2 el host lo rellena
  const shake = phase === 1 ? Math.sin((t - s[1]) * 46) * (1 - ramp(t, s[1], s[1] + 0.5)) * 7 * k : 0;
  const hookIn = ramp(t, s[2] - 0.15, s[2] + 0.45);
  const stampIn = phase === 1 ? ramp(t, s[1] + 0.25, s[1] + 0.6) : 0;
  const okIn = phase === 2 ? ramp(t, s[2] + 0.3, s[2] + 0.7) : 0;

  const value = phase === 0 ? TOKEN_OK.slice(0, typed) : phase === 1 ? TOKEN_BAD : TOKEN_OK;
  const valueColor = phase === 0 ? BRAND.cyan : phase === 1 ? BAD : GOOD;

  return (
    <AbsoluteFill style={{ justifyContent: 'center' }}>
      <div
        style={{
          background: BRAND.surface,
          border: `1px solid ${phase === 1 ? BAD : BRAND.border}`,
          borderRadius: 18 * k,
          padding: 30 * k,
          fontFamily: MONO,
          fontSize: 28 * k,
          lineHeight: 1.6,
          color: BRAND.dim,
          transform: `translateX(${shake}px)`,
        }}
      >
        {/* quién hace la llamada: es la clave del post (la identidad va por ctx.agentId) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 21 * k,
            paddingBottom: 16 * k,
            marginBottom: 16 * k,
            borderBottom: `1px solid ${BRAND.border}`,
          }}
        >
          <span>
            agent: <span style={{ color: BRAND.text }}>paco--francis</span>
          </span>
          <span style={{ color: BRAND.amber }}>tool call</span>
        </div>
        <div>
          <span style={{ color: BRAND.text }}>claw_notes_create</span>({'{'}
        </div>
        <div style={{ paddingLeft: 26 * k }}>
          title: <span style={{ color: BRAND.text }}>"Groceries"</span>,
        </div>
        <div style={{ paddingLeft: 26 * k }}>
          auth_token:{' '}
          <span style={{ color: valueColor, wordBreak: 'break-all' }}>
            "{value}
            {phase === 0 && typed < TOKEN_OK.length ? <span style={{ color: BRAND.amber }}>▋</span> : '"'}
          </span>
        </div>
        <div>{'}'})</div>

        {/* el hook host-side entra por la derecha y sella el argumento */}
        {phase === 2 ? (
          <div
            style={{
              marginTop: 20 * k,
              display: 'flex',
              alignItems: 'center',
              gap: 12 * k,
              opacity: hookIn,
              transform: `translateX(${(1 - hookIn) * 60 * k}px)`,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 21 * k,
                color: BRAND.amber,
                border: `2px solid ${BRAND.amber}`,
                borderRadius: 10 * k,
                padding: `${7 * k}px ${13 * k}px`,
                background: 'rgba(212,160,23,0.10)',
              }}
            >
              before_tool_call
            </div>
            <div style={{ fontSize: 22 * k, color: BRAND.dim }}>
              ↑ keyed by <span style={{ color: BRAND.text }}>ctx.agentId</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* sellos de resultado */}
      <div style={{ marginTop: 26 * k, height: 52 * k }}>
        {stampIn > 0 ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10 * k,
              fontSize: 30 * k,
              fontWeight: 800,
              color: BAD,
              border: `2px solid ${BAD}`,
              borderRadius: 10 * k,
              padding: `${6 * k}px ${16 * k}px`,
              opacity: stampIn,
              transform: `scale(${0.9 + stampIn * 0.1})`,
            }}
          >
            ✕ denied · 42 chars
          </div>
        ) : null}
        {okIn > 0 ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10 * k,
              fontSize: 30 * k,
              fontWeight: 800,
              color: GOOD,
              border: `2px solid ${GOOD}`,
              borderRadius: 10 * k,
              padding: `${6 * k}px ${16 * k}px`,
              opacity: okIn,
              transform: `scale(${0.9 + okIn * 0.1})`,
            }}
          >
            ✓ allowed · per-agent scopes
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/* ─────────────────────── B2 · la delegación que moría en silencio ─────────────────────── */
const DelegationConcept: React.FC<{ k: number; t: number; s: number[]; fps: number }> = ({ k, t, s, fps }) => {
  const francisIn = spring({
    frame: Math.round((t - s[0]) * fps),
    fps,
    config: { damping: 16, stiffness: 90 },
    durationInFrames: Math.round(0.5 * fps),
  });
  const arrow = ramp(t, s[0] + 0.5, s[0] + 1.5);
  const dead = t >= s[1] && t < s[2];
  const keyFly = ramp(t, s[2], s[2] + 0.7);
  const fixed = t >= s[2] + 0.55;
  const oggIn = t >= s[3] ? ramp(t, s[3], s[3] + 0.4) : 0;
  const dots = dead ? '·'.repeat(1 + (Math.floor((t - s[1]) * 3) % 3)) : '';

  return (
    <AbsoluteFill style={{ justifyContent: 'center', gap: 4 * k }}>
      <Node
        k={k}
        name="Francis"
        role="main · full access"
        accent={BRAND.cyan}
        style={{ opacity: francisIn, transform: `translateY(${(1 - francisIn) * 14 * k}px)` }}
      >
        <Chip k={k} color={BRAND.cyan} label="own key" style={{ marginTop: 4 * k }} />
      </Node>

      {/* la flecha de sessions_spawn: cian al principio, gris cuando muere */}
      <div style={{ height: 132 * k, position: 'relative', margin: `${6 * k}px 0` }}>
        <div
          style={{
            position: 'absolute',
            left: 44 * k,
            top: 0,
            width: 3 * k,
            height: `${arrow * 100}%`,
            background: dead ? '#3a3a46' : BRAND.cyan,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 62 * k,
            top: 34 * k,
            fontFamily: MONO,
            fontSize: 21 * k,
            color: dead ? '#6b6b78' : BRAND.cyan,
            opacity: arrow,
          }}
        >
          sessions_spawn
          {dead ? <span style={{ color: BAD, marginLeft: 10 * k }}>no token {dots}</span> : null}
        </div>
        {/* la llave ámbar que el host le manda al ayudante */}
        {keyFly > 0 && keyFly < 1 ? (
          <div
            style={{
              position: 'absolute',
              left: 20 * k,
              top: `${keyFly * 100}%`,
              fontSize: 34 * k,
              color: BRAND.amber,
              transform: 'translateY(-50%)',
            }}
          >
            ⚿
          </div>
        ) : null}
      </div>

      <Node
        k={k}
        name="Dalí"
        role="audio & images only"
        accent={fixed ? BRAND.amber : dead ? '#3a3a46' : BRAND.border}
        dim={dead}
      >
        {fixed ? (
          <Chip k={k} color={BRAND.amber} label="own key · own scopes" style={{ marginTop: 4 * k }} />
        ) : (
          <Chip k={k} color={dead ? BAD : BRAND.dim} label={dead ? 'silence' : 'waiting'} style={{ marginTop: 4 * k }} />
        )}
      </Node>

      <div style={{ height: 64 * k, marginTop: 14 * k }}>
        {oggIn > 0 ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12 * k,
              background: 'rgba(61,220,132,0.10)',
              border: `2px solid ${GOOD}`,
              borderRadius: 12 * k,
              padding: `${10 * k}px ${18 * k}px`,
              opacity: oggIn,
              transform: `translateY(${(1 - oggIn) * 14 * k}px)`,
            }}
          >
            <span style={{ fontSize: 28 * k, color: GOOD }}>✓</span>
            <span style={{ fontFamily: MONO, fontSize: 24 * k, color: BRAND.text }}>note.ogg</span>
            <span style={{ fontSize: 22 * k, color: BRAND.dim }}>landed in Drive</span>
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/* ─────────────────── C2 · versión llana: el equipo que se identifica ─────────────────── */
const TeamConcept: React.FC<{ k: number; t: number; s: number[]; fps: number }> = ({ k, t, s, fps }) => {
  const askIn = spring({
    frame: Math.round((t - s[0]) * fps),
    fps,
    config: { damping: 15, stiffness: 90 },
    durationInFrames: Math.round(0.5 * fps),
  });
  const picking = t >= s[1];
  const pulse = picking ? 1 + Math.sin((t - s[1]) * 7) * 0.02 : 1;
  const line = ramp(t, s[1] + 0.2, s[1] + 1.0);
  const badge = t >= s[2] ? ramp(t, s[2], s[2] + 0.45) : 0;
  const done = t >= s[3] ? ramp(t, s[3], s[3] + 0.4) : 0;
  const HELPERS = ['Audio', 'Images', 'Files'];

  return (
    <AbsoluteFill style={{ justifyContent: 'center', gap: 18 * k }}>
      {/* lo que pides */}
      <div
        style={{
          alignSelf: 'flex-end',
          maxWidth: '82%',
          background: 'rgba(0,200,255,0.10)',
          border: `1px solid rgba(0,200,255,0.35)`,
          borderRadius: `${16 * k}px ${16 * k}px ${4 * k}px ${16 * k}px`,
          padding: `${14 * k}px ${18 * k}px`,
          fontSize: 26 * k,
          color: BRAND.text,
          opacity: askIn,
          transform: `translateY(${(1 - askIn) * 12 * k}px)`,
        }}
      >
        "Turn my note into audio."
      </div>

      {/* el coordinador */}
      <Node
        k={k}
        name="Your coordinator"
        role="picks who does the job"
        accent={BRAND.cyan}
        style={{ transform: `scale(${pulse})` }}
      />

      <div style={{ height: 56 * k, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            left: 44 * k,
            top: 0,
            width: 3 * k,
            height: `${line * 100}%`,
            background: BRAND.amber,
          }}
        />
      </div>

      {/* los ayudantes: se apaga el que no toca */}
      <div style={{ display: 'flex', gap: 14 * k }}>
        {HELPERS.map((h, i) => {
          const chosen = i === 0;
          const dim = picking && !chosen;
          return (
            <div
              key={h}
              style={{
                flex: 1,
                background: BRAND.surface,
                border: `2px solid ${chosen && picking ? BRAND.amber : BRAND.border}`,
                borderRadius: 14 * k,
                padding: `${16 * k}px ${12 * k}px`,
                textAlign: 'center',
                opacity: dim ? 0.32 : 1,
                filter: dim ? 'grayscale(1)' : 'none',
              }}
            >
              <div style={{ fontSize: 26 * k, fontWeight: 700, color: BRAND.text }}>{h}</div>
              <div style={{ fontSize: 19 * k, color: BRAND.dim, marginTop: 4 * k }}>helper</div>
              {chosen && badge > 0 ? (
                <div
                  style={{
                    marginTop: 10 * k,
                    fontSize: 19 * k,
                    color: GOOD,
                    border: `1px solid ${GOOD}`,
                    borderRadius: 999,
                    padding: `${4 * k}px ${8 * k}px`,
                    opacity: badge,
                  }}
                >
                  ✓ verified
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div style={{ height: 58 * k }}>
        {done > 0 ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12 * k,
              background: 'rgba(61,220,132,0.10)',
              border: `2px solid ${GOOD}`,
              borderRadius: 12 * k,
              padding: `${10 * k}px ${18 * k}px`,
              opacity: done,
              transform: `translateY(${(1 - done) * 12 * k}px)`,
            }}
          >
            <span style={{ fontSize: 26 * k, color: GOOD }}>✓</span>
            <span style={{ fontSize: 24 * k, color: BRAND.text }}>Your audio clip is ready.</span>
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

export const ConceptScene: React.FC<{ concept: string; t: number; starts: number[] }> = ({
  concept,
  t,
  starts,
}) => {
  const { width, fps } = useVideoConfig();
  const k = width / 864;
  // los guiones asumen 4 beats; si llegan menos, se repite el último inicio para no romper
  const s = [0, 1, 2, 3].map((i) => starts[i] ?? starts[starts.length - 1] ?? 0);

  if (concept === 'delegation') return <DelegationConcept k={k} t={t} s={s} fps={fps} />;
  if (concept === 'team') return <TeamConcept k={k} t={t} s={s} fps={fps} />;
  return <TokenConcept k={k} t={t} s={s} />;
};
