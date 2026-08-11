/**
 * Rank portraits.
 *
 * One character drawn from stacked parts rather than ten separate pictures, so
 * every rank is unmistakably the same person — just better equipped. Each tier
 * adds gear on top of the last: a commoner in linen at level 1, crowned and
 * haloed by level 10.
 *
 * Layer order matters: hood-back sits behind the head, hood-front in front of
 * the face, otherwise a hood reads as a hat.
 */

const SKIN = '#E3B590';
const LINE = '#5A4433';
const HAIR = '#6B4B31';
const LEATHER = '#A9784B';
const LEATHER_DARK = '#75512F';
const GOLD = '#E2B042';
const GOLD_DEEP = '#C08E22';

/** Per-tier kit. Index 0 is level 1. */
const TIERS = [
  { tunic: '#F1E4CD', cloak: null,      trim: null },
  { tunic: '#EDDFC4', cloak: null,      trim: null },
  { tunic: '#E8D8B8', cloak: null,      trim: null },
  { tunic: '#E3D2B0', cloak: '#7B9674', trim: null },
  { tunic: '#E0CDA8', cloak: '#7B9674', trim: null },
  { tunic: '#DCC8A1', cloak: '#5F7D5B', trim: null },
  { tunic: '#D7C29A', cloak: '#54704F', trim: '#B9925A' },
  { tunic: '#D3BC92', cloak: '#9C5B42', trim: GOLD },
  { tunic: '#CFB68B', cloak: '#5B5687', trim: GOLD },
  { tunic: '#CBB084', cloak: '#3F5B46', trim: GOLD },
];

export const RANK_COUNT = TIERS.length;

let uid = 0;

/**
 * @param {number} level  1-based; anything above the top tier shows the top tier.
 * @param {number} size   rendered px
 * @param {object} [opts] { muted, figure } — muted draws the locked version,
 *                        figure is 'masc' or 'fem' and changes the hair only.
 */
export function avatar(level, size = 56, opts = {}) {
  const t = Math.min(Math.max(Math.round(level), 1), RANK_COUNT);
  const kit = TIERS[t - 1];
  const m = Boolean(opts.muted);
  const fem = opts.figure === 'fem';
  const clip = `av${(uid += 1)}`;

  const hood = t >= 6;
  const hat = t >= 3 && t < 6;
  const satchel = t >= 2 && t < 4;
  const sprig = t === 2;
  const lantern = t === 5;
  const pauldrons = t >= 7;
  const aura = t >= 8;
  const circlet = t === 9;
  const crown = t === 10;
  const stars = t >= 9;

  // Locked ranks go monochrome, but keep enough separation between layers that
  // a hood still reads as a hood — otherwise every future rank is one grey blob.
  const mutedGold = '#C6B79A';
  const skin = m ? '#D5CABA' : SKIN;
  const ink = m ? '#8D8171' : LINE;
  const hair = m ? '#A29683' : HAIR;
  const tunic = m ? '#E4DCCE' : kit.tunic;
  const cloak = m ? (kit.cloak ? '#B3A895' : null) : kit.cloak;
  const hoodFill = m ? '#AA9E8B' : (kit.cloak || '#5F7D5B');
  const trim = m ? (kit.trim ? mutedGold : null) : kit.trim;
  const lea = m ? '#BFB4A2' : LEATHER;
  const leaDark = m ? '#A29683' : LEATHER_DARK;
  const gold = m ? mutedGold : GOLD;
  const goldDeep = m ? '#B0A288' : GOLD_DEEP;

  return `
<svg viewBox="0 0 64 64" width="${size}" height="${size}" class="avatar" aria-hidden="true">
  <defs><clipPath id="${clip}"><circle cx="32" cy="32" r="32"/></clipPath></defs>
  <circle cx="32" cy="32" r="32" fill="var(--sage-wash)"/>
  <g clip-path="url(#${clip})">
  ${aura && !m ? `<circle cx="32" cy="32" r="32" fill="${GOLD}" opacity=".13"/>
  <circle cx="32" cy="32" r="24" fill="${GOLD}" opacity=".09"/>` : ''}

  ${cloak ? `<path d="M8 64c0-12.4 10.7-19.4 24-19.4S56 51.6 56 64Z" fill="${cloak}"/>` : ''}

  ${hood ? `<path d="M16.6 51c-1.8-4-2.4-8.2-2.4-13C14.2 22.4 21.8 13.4 32 13.4s17.8 9 17.8 24.6c0 4.8-.6 9-2.4 13Z" fill="${hoodFill}"/>` : ''}

  <path d="M15 64c0-9.8 7.6-15 17-15s17 5.2 17 15Z" fill="${tunic}"/>
  ${cloak ? `<path d="M32 49 27.4 64h9.2Z" fill="${tunic}" opacity=".5"/>` : ''}
  ${cloak && trim ? `<path d="M8 64c0-12.4 10.7-19.4 24-19.4S56 51.6 56 64Z" fill="none" stroke="${trim}" stroke-width="1.5" opacity=".8"/>` : ''}

  ${satchel ? `<g>
    <path d="M22.6 48.8 36.5 60" stroke="${lea}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <rect x="32.4" y="56.4" width="9" height="7.6" rx="2.2" fill="${leaDark}"/>
    <path d="M32.4 59.2h9" stroke="${lea}" stroke-width="1.3"/>
  </g>` : ''}

  ${pauldrons ? `<g fill="${leaDark}">
    <path d="M13.6 59c-.7-5.9 2.4-10.6 7.8-11.6 1.9 3.2 2.3 7.4 1.2 11.6Z"/>
    <path d="M50.4 59c.7-5.9-2.4-10.6-7.8-11.6-1.9 3.2-2.3 7.4-1.2 11.6Z"/>
  </g>
  ${trim ? `<g fill="${trim}"><circle cx="18" cy="53.6" r="1.5"/><circle cx="46" cy="53.6" r="1.5"/></g>` : ''}` : ''}

  ${fem ? (hat || hood
    ? `<path d="M14.2 48c-1-4.8-1.5-9.4-1.5-14 0-4.6 1.2-8.6 3.4-11.6 1.4 5.6 7 8.4 15.9 8.4s14.5-2.8 15.9-8.4c2.2 3 3.4 7 3.4 11.6 0 4.6-.5 9.2-1.5 14Z" fill="${hair}"/>`
    : `<path d="M13.6 48c-1-5.2-1.5-10.2-1.5-15.2C12.1 21.4 20.4 13.6 32 13.6s19.9 7.8 19.9 19.2c0 5-.5 10-1.5 15.2Z" fill="${hair}"/>`) : ''}

  <path d="M28.4 38h7.2v7.4a3.6 3.6 0 0 1-7.2 0Z" fill="${skin}"/>
  <circle cx="32" cy="28" r="11.5" fill="${skin}"/>

  <circle cx="27.9" cy="28.4" r="1.35" fill="${ink}"/>
  <circle cx="36.1" cy="28.4" r="1.35" fill="${ink}"/>
  <path d="M29.2 32.6c1.7 1.6 3.9 1.6 5.6 0" stroke="${ink}" stroke-width="1.35" fill="none" stroke-linecap="round"/>

  ${!hood && !hat ? (fem
    ? `<path d="M20.4 28.4c0-7.6 5.2-12.6 11.6-12.6s11.6 5 11.6 12.6c-1.4-1.4-2-4-2.3-5.8-3.4 3.4-11.2 4.2-15.6 1.4-.8 2.2-2.6 3.6-5.3 4.4Z" fill="${hair}"/>`
    : `<path d="M20.6 28.2c0-7.4 5.1-12.2 11.4-12.2s11.4 4.8 11.4 12.2c-1.3-1-1.9-3.4-2.2-5.1-3.6 2.8-13.6 3.4-17.4.4-.4 1.9-1.7 3.5-3.2 4.7Z" fill="${hair}"/>`) : ''}
  ${hat && !fem ? `<path d="M21.8 24.6c.6-5.6 5-9.4 10.2-9.4s9.6 3.8 10.2 9.4c-4-2.6-16.4-2.6-20.4 0Z" fill="${hair}"/>` : ''}

  ${hood ? `<path d="M17.4 36.6c0-11 6.1-18.4 14.6-18.4s14.6 7.4 14.6 18.4c-1.9-8.6-7.4-13.6-14.6-13.6s-12.7 5-14.6 13.6Z" fill="${hoodFill}"/>
  ${trim ? `<path d="M18.4 33.4c2.1-7.1 7.1-11.1 13.6-11.1s11.5 4 13.6 11.1" fill="none" stroke="${trim}" stroke-width="1.4" opacity=".85"/>` : ''}` : ''}

  ${hat ? `<g>
    <ellipse cx="32" cy="20.4" rx="17.5" ry="3.9" fill="${leaDark}"/>
    <path d="M23.6 20.6c0-6.2 3.6-10.2 8.4-10.2s8.4 4 8.4 10.2Z" fill="${lea}"/>
    <rect x="23.3" y="17.9" width="17.4" height="2.9" rx="1.45" fill="${leaDark}"/>
  </g>` : ''}
  ${sprig ? `<g fill="${m ? '#C3BBAC' : '#7B9674'}">
    <path d="M41.8 15.8c2.8-.6 4.8.5 5.6 2.9-2.8.6-4.8-.5-5.6-2.9Z"/>
    <path d="M42.6 12.4c2.4 1.6 2.9 3.8 1.6 6-2.4-1.6-2.9-3.8-1.6-6Z"/>
  </g>` : ''}

  ${lantern ? `<g>
    ${m ? '' : `<circle cx="48.5" cy="45" r="11" fill="${GOLD}" opacity=".32"/>`}
    <path d="M48.5 36a3.4 3.4 0 0 1 3.4 3.4" fill="none" stroke="${leaDark}" stroke-width="1.4"/>
    <rect x="44.3" y="38.8" width="8.4" height="9.6" rx="2.2" fill="${leaDark}"/>
    <rect x="46.1" y="40.8" width="4.8" height="5.6" rx="1.4" fill="${gold}"/>
  </g>` : ''}

  ${circlet ? `<path d="M21.4 21.4c3.2-2.8 6.9-4.2 10.6-4.2s7.4 1.4 10.6 4.2" fill="none" stroke="${gold}" stroke-width="2.3" stroke-linecap="round"/>
  <circle cx="32" cy="17.4" r="2.1" fill="${gold}"/>` : ''}

  ${crown ? `<g>
    <path d="M21.6 21 20 11.2l6 4.2 6-6.4 6 6.4 6-4.2L42.4 21Z" fill="${gold}"/>
    <path d="M21.9 21h20.2" stroke="${goldDeep}" stroke-width="2.1" stroke-linecap="round"/>
    <circle cx="32" cy="15.2" r="1.7" fill="${m ? '#E7DFD0' : '#FFF6E2'}"/>
  </g>` : ''}

  ${stars && !m ? `<g fill="${GOLD}">
    <path d="M53 17c.4 0 .5 2.3 1.2 3s3 .8 3 1.2-2.3.5-3 1.2-.8 3-1.2 3-.5-2.3-1.2-3-3-.8-3-1.2 2.3-.5 3-1.2.8-3 1.2-3Z"/>
    <path d="M10.5 25c.3 0 .35 1.6.8 2.05.45.45 2.05.5 2.05.8s-1.6.35-2.05.8c-.45.45-.5 2.05-.8 2.05s-.35-1.6-.8-2.05c-.45-.45-2.05-.5-2.05-.8s1.6-.35 2.05-.8c.45-.45.5-2.05.8-2.05Z"/>
  </g>` : ''}
  </g>
</svg>`;
}
