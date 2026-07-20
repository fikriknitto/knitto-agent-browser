import type { HTMLAttributes, TdHTMLAttributes } from 'react';

/** Minimal table primitives (template referenced these; full knitto-table lives in react-ui). */
export function TableRow({ children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props}>{children}</tr>;
}

export function TableCell({
  children,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...props}>{children}</td>;
}

export function Table({ children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table {...props}>{children}</table>;
}
