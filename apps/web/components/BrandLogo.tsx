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
            d="M15 13h18M14 18h20M18 22c3 2 9 2 12 0M18 22c0 5 2 8 6 10M30 22c0 5-2 8-6 10M15 36c0-8 2-13 9-13M33 36c0-8-2-13-9-13M20 32h8M20 32v5M28 32v5M20 37h8"
            fill="none"
            stroke="#fff7ed"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.8"
          />
          <path
            d="M24 12v5M22 25c1 1 3 1 4 0"
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
