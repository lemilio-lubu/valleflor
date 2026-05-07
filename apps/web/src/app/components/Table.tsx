import { createContext, useContext, type ReactNode } from 'react';

const CompactCtx = createContext(false);

interface TableProps {
  children: ReactNode;
  className?: string;
  compact?: boolean;
}

export function Table({ children, className = '', compact = false }: TableProps) {
  return (
    <CompactCtx.Provider value={compact}>
      <div className={`overflow-x-auto rounded-lg border border-surface-border ${className}`}>
        <table className="w-full text-sm">{children}</table>
      </div>
    </CompactCtx.Provider>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="bg-surface-overlay border-b border-surface-border">{children}</tr>
    </thead>
  );
}

export function Th({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <th className={`table-th ${className}`}>{children}</th>;
}

export function Tbody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function Tr({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <tr className={`table-row-hover border-b border-surface-border/30 ${className}`}>
      {children}
    </tr>
  );
}

export function Td({ children, className = '' }: { children?: ReactNode; className?: string }) {
  const compact = useContext(CompactCtx);
  return <td className={`px-3 ${compact ? 'py-2' : 'py-3'} ${className}`}>{children}</td>;
}

export function TdEmpty({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="empty-state">{message}</td>
    </tr>
  );
}

export function TrSkeleton({ cols }: { cols: number }) {
  const compact = useContext(CompactCtx);
  return (
    <>
      {[...Array(4)].map((_, i) => (
        <tr key={i} className="border-b border-surface-border/30">
          <td colSpan={cols} className={`px-3 ${compact ? 'py-2' : 'py-3'}`}>
            <div className="h-4 bg-surface-overlay rounded animate-pulse" />
          </td>
        </tr>
      ))}
    </>
  );
}
