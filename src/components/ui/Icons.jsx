import React from 'react';

const iconBase = "w-[20px] h-[20px]";
export const cx = (extra = "") => `${iconBase} ${extra}`;

export function AlertIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3 2 20h20L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 9v5m0 3v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function TrendIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 17l6-6 4 4 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 21H3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function BarsIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="10" width="3" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10.5" y="6" width="3" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="17" y="12" width="3" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function BriefcaseIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function BuildingIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="3" width="10" height="18" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M17 9h3v12h-3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 7h4M7 11h4M7 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function CrIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 13l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShieldIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3 5 6v6c0 5 7 9 7 9s7-4 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowRightIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SearchIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function UploadIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 19V5m0 0-4 4m4-4 4 4M5 19h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function PlusIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" stroke="currentColor" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

export function DownloadIcon({ className }) {
  return (
    <svg className={cx(className)} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}

export function TrashIcon({ className }) {
  return (
    <svg className={cx(className)} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden>
       <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

export function PencilIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M14.06 6.19l3.75 3.75L20.5 7.25a1.77 1.77 0 0 0 0-2.5l-1.25-1.25a1.77 1.77 0 0 0-2.5 0l-2.69 2.69Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

export function CheckCircleIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function XCircleIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
