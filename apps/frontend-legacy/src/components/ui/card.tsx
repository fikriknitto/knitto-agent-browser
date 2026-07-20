import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "../../lib/cn";

const cardBase =
  "mb-5 rounded-xl border border-white/6 bg-[rgba(20,24,36,0.65)] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-all hover:border-white/10 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]";

type CardOwnProps = {
  as?: ElementType;
  className?: string;
  children?: ReactNode;
};

export type CardProps = CardOwnProps & Omit<ComponentPropsWithoutRef<"section">, keyof CardOwnProps>;

export function Card({ as: Component = "section", className, children, ...props }: CardProps) {
  return (
    <Component className={cn(cardBase, className)} {...props}>
      {children}
    </Component>
  );
}

export type CardTitleProps = ComponentPropsWithoutRef<"h2"> & {
  compact?: boolean;
};

export function CardTitle({ compact, className, ...props }: CardTitleProps) {
  return (
    <h2
      className={cn(
        "text-[1.1rem] font-semibold tracking-tight text-slate-50",
        compact ? "mb-2" : "mb-3.5",
        className
      )}
      {...props}
    />
  );
}
