/* GreeCheck V2 prototype fixtures — realistic-looking product art + data.
   Fictional brands on purpose (no real product is scored in a prototype).
   Final prototypes swap these for real Open Food Facts photography. */

/* Soft-lit packshot SVGs (vector stand-ins for photography) */
const ART={
  cereal:(w=120)=>`
  <svg width="${w}" height="${w*1.2}" viewBox="0 0 120 144" aria-hidden="true">
    <defs>
      <linearGradient id="cb" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#7C4A2D"/><stop offset=".12" stop-color="#9A5F3B"/>
        <stop offset=".8" stop-color="#8A5232"/><stop offset="1" stop-color="#6B3E24"/>
      </linearGradient>
    </defs>
    <ellipse cx="60" cy="132" rx="42" ry="7" fill="#101312" opacity=".10"/>
    <rect x="22" y="10" width="76" height="122" rx="6" fill="url(#cb)"/>
    <rect x="22" y="10" width="10" height="122" rx="5" fill="#5E351E" opacity=".55"/>
    <rect x="30" y="22" width="60" height="26" rx="6" fill="#F8F1DC"/>
    <text x="60" y="39" text-anchor="middle" font-family="Georgia,serif" font-size="13" font-weight="700" fill="#6B3E24">Krispo</text>
    <circle cx="60" cy="86" r="24" fill="#F5F6F4"/>
    <circle cx="52" cy="82" r="5" fill="#7C4A2D"/><circle cx="65" cy="79" r="5" fill="#8A5232"/>
    <circle cx="60" cy="92" r="5" fill="#6B3E24"/><circle cx="70" cy="90" r="4" fill="#7C4A2D"/>
    <rect x="30" y="118" width="60" height="8" rx="4" fill="#F8F1DC" opacity=".9"/>
    <rect x="26" y="10" width="8" height="122" fill="#fff" opacity=".14"/>
  </svg>`,
  granola:(w=120)=>`
  <svg width="${w}" height="${w*1.2}" viewBox="0 0 120 144" aria-hidden="true">
    <defs><linearGradient id="gp" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#B98A4F"/><stop offset=".15" stop-color="#D3A66A"/>
      <stop offset=".85" stop-color="#C2925A"/><stop offset="1" stop-color="#9C7240"/>
    </linearGradient></defs>
    <ellipse cx="60" cy="133" rx="40" ry="6" fill="#101312" opacity=".10"/>
    <path d="M30 26 L90 26 L96 128 Q96 134 90 134 L30 134 Q24 134 24 128 Z" fill="url(#gp)"/>
    <rect x="30" y="18" width="60" height="12" rx="3" fill="#8A6238"/>
    <rect x="34" y="44" width="52" height="34" rx="8" fill="#FAFAF7"/>
    <text x="60" y="59" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="700" fill="#6B4A28">Delisso</text>
    <text x="60" y="72" text-anchor="middle" font-family="system-ui" font-size="7.5" fill="#8A6238">GRANOLA CHOCO</text>
    <ellipse cx="60" cy="104" rx="24" ry="16" fill="#6B4A28" opacity=".85"/>
    <circle cx="50" cy="100" r="4" fill="#D3A66A"/><circle cx="64" cy="108" r="4" fill="#B98A4F"/>
    <circle cx="70" cy="99" r="3.4" fill="#F8F1DC"/>
    <rect x="32" y="26" width="7" height="106" fill="#fff" opacity=".16"/>
  </svg>`,
  granolaBio:(w=120)=>`
  <svg width="${w}" height="${w*1.2}" viewBox="0 0 120 144" aria-hidden="true">
    <defs><linearGradient id="gb" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#E4D7BC"/><stop offset=".15" stop-color="#F1E7D2"/>
      <stop offset=".85" stop-color="#E8DCC4"/><stop offset="1" stop-color="#CDBE9E"/>
    </linearGradient></defs>
    <ellipse cx="60" cy="133" rx="40" ry="6" fill="#101312" opacity=".10"/>
    <path d="M30 26 L90 26 L96 128 Q96 134 90 134 L30 134 Q24 134 24 128 Z" fill="url(#gb)"/>
    <rect x="30" y="18" width="60" height="12" rx="3" fill="#B7A784"/>
    <rect x="34" y="44" width="52" height="34" rx="8" fill="#0B3D2E"/>
    <text x="60" y="59" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="700" fill="#FAFAF7">Naturia</text>
    <text x="60" y="72" text-anchor="middle" font-family="system-ui" font-size="7.5" fill="#9CC8AE">GRANOLA AVOINE BIO</text>
    <path d="M46 104 C 48 92, 58 86, 72 84 C 70 98, 60 106, 48 106 Z" fill="#2ECC71"/>
    <path d="M50 102 C 56 94, 63 90, 69 87" stroke="#0B3D2E" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"/>
    <rect x="32" y="26" width="7" height="106" fill="#fff" opacity=".25"/>
  </svg>`,
  yaourtNature:(w=120)=>`
  <svg width="${w}" height="${w*1.05}" viewBox="0 0 120 126" aria-hidden="true">
    <defs><linearGradient id="yn" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#E9ECEA"/><stop offset=".2" stop-color="#FFFFFF"/>
      <stop offset=".85" stop-color="#F2F4F2"/><stop offset="1" stop-color="#D8DDDA"/>
    </linearGradient></defs>
    <ellipse cx="60" cy="116" rx="36" ry="6" fill="#101312" opacity=".10"/>
    <path d="M32 34 L88 34 L82 112 Q81 118 75 118 L45 118 Q39 118 38 112 Z" fill="url(#yn)"/>
    <ellipse cx="60" cy="33" rx="30" ry="8" fill="#4A8F6B"/>
    <ellipse cx="60" cy="31" rx="30" ry="8" fill="#5FA97F"/>
    <rect x="40" y="56" width="40" height="30" rx="6" fill="#0B3D2E" opacity=".9"/>
    <text x="60" y="69" text-anchor="middle" font-family="Georgia,serif" font-size="10" font-weight="700" fill="#FAFAF7">Prairial</text>
    <text x="60" y="80" text-anchor="middle" font-family="system-ui" font-size="6.5" fill="#9CC8AE">YAOURT NATURE</text>
    <rect x="40" y="40" width="8" height="72" fill="#fff" opacity=".5"/>
  </svg>`,
  yaourtVanille:(w=120)=>`
  <svg width="${w}" height="${w*1.05}" viewBox="0 0 120 126" aria-hidden="true">
    <defs><linearGradient id="yv" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#EFDFA8"/><stop offset=".2" stop-color="#F9EFC9"/>
      <stop offset=".85" stop-color="#F3E6B4"/><stop offset="1" stop-color="#D9C787"/>
    </linearGradient></defs>
    <ellipse cx="60" cy="116" rx="36" ry="6" fill="#101312" opacity=".10"/>
    <path d="M32 34 L88 34 L82 112 Q81 118 75 118 L45 118 Q39 118 38 112 Z" fill="url(#yv)"/>
    <ellipse cx="60" cy="33" rx="30" ry="8" fill="#B98A2E"/>
    <ellipse cx="60" cy="31" rx="30" ry="8" fill="#D4A93F"/>
    <rect x="40" y="56" width="40" height="30" rx="6" fill="#FAFAF7"/>
    <text x="60" y="69" text-anchor="middle" font-family="Georgia,serif" font-size="10" font-weight="700" fill="#8A6A1E">Douceo</text>
    <text x="60" y="80" text-anchor="middle" font-family="system-ui" font-size="6.5" fill="#A98A3A">VANILLE SUCRÉ</text>
    <rect x="40" y="40" width="8" height="72" fill="#fff" opacity=".5"/>
  </svg>`
};

/* Data fixtures */
const FIX={
  krispo:{name:"Choco Billes",brand:"Krispo · 375 g",cat:"Céréales petit-déjeuner",
    score:31,grade:"d",label:"À limiter",verdict:"À limiter",
    conf:"Confiance élevée",art:"cereal"},
  delisso:{name:"Granola Choco & Graines",brand:"Delisso · 450 g",cat:"Granolas & mueslis",
    score:46,grade:"c",label:"Choix moyen",verdict:"À limiter",
    conf:"Bonne confiance",art:"granola"},
  naturia:{name:"Granola Avoine Bio",brand:"Naturia · 400 g",cat:"Granolas & mueslis",
    score:72,grade:"b",label:"Bon choix",verdict:"Bon choix",
    conf:"Confiance élevée",art:"granolaBio"},
  prairial:{name:"Yaourt Nature",brand:"Prairial · 4×125 g",cat:"Yaourts natures",
    score:81,grade:"a",label:"Excellent choix",verdict:"Excellent choix",
    conf:"Confiance élevée",art:"yaourtNature"},
  douceo:{name:"Yaourt Vanille Sucré",brand:"Douceo · 4×125 g",cat:"Yaourts aromatisés",
    score:52,grade:"c",label:"Choix moyen",verdict:"À limiter",
    conf:"Bonne confiance",art:"yaourtVanille"}
};
function art(key,w){return ART[FIX[key].art](w)}
