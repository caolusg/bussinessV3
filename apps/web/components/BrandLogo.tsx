import React from 'react';

type BrandLogoProps = {
  inverse?: boolean;
  compact?: boolean;
};

const brandFont = "'秦朝小篆', 'QinChaoXiaoZhuan', 'STKaiti', 'KaiTi', 'SimSun', serif";

const BrandLogo: React.FC<BrandLogoProps> = ({ inverse = false, compact = false }) => {
  const titleColor = inverse ? 'text-white' : 'text-slate-900';
  const subtitleColor = inverse ? 'text-amber-100/75' : 'text-slate-500';
  const markSize = compact ? 'h-10 w-10' : 'h-12 w-12';
  const titleSize = compact ? 'text-xl' : 'text-3xl';

  return (
    <div className="flex items-center gap-3">
      <div className={`${markSize} relative shrink-0 rounded-[0.7rem] bg-red-700 shadow-lg shadow-red-950/20`}>
        <svg viewBox="0 0 48 48" aria-hidden="true" className="h-full w-full">
          <rect x="5" y="5" width="38" height="38" rx="7" fill="#b91c1c" />
          <rect x="9" y="9" width="30" height="30" rx="3" fill="none" stroke="#fff7ed" strokeWidth="2.8" />
          <path
            d="M24 12v6M16 18h16M18 23h12M18 23v5M30 23v5M18 28h12M15 33h18M18 33v5M24 33v5M30 33v5"
            fill="none"
            stroke="#fff7ed"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.8"
          />
          <path
            d="M19 12l2 3M29 12l-2 3M21 28l3 4 3-4"
            fill="none"
            stroke="#fbbf24"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </div>
      <div className="leading-none">
        <div
          className={`${titleSize} ${titleColor} font-black tracking-[0.14em]`}
          style={{ fontFamily: brandFont }}
        >
          商通中文
        </div>
        <div className={`mt-2 text-[0.65rem] font-bold uppercase tracking-[0.38em] ${subtitleColor}`}>
          BIZ Chinese
        </div>
      </div>
    </div>
  );
};

export default BrandLogo;
