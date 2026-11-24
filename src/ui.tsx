import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Sprout,
  X,
  Home,
  ShoppingBasket,
  CarFront,
  Coffee,
  Heart,
  ShoppingBag,
  Zap,
  Sun,
  Plane,
  ShieldCheck,
  Wallet,
  Target,
  Gift,
  BriefcaseBusiness,
  CircleDollarSign,
} from "lucide-react";

export function Brand() {
  return (
    <span className="brand">
      <span className="brand-symbol">
        <Sprout size={25} strokeWidth={1.8} />
      </span>
      <span>
        Budget<span className="brand-flow">Flow</span>
      </span>
    </span>
  );
}
export function AvatarFace({ name, photo }: { name: string; photo?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  return photo && photo !== failed ? (
    <img
      className="avatar-photo"
      src={photo}
      alt=""
      onError={() => setFailed(photo)}
    />
  ) : (
    <>{name.slice(0, 1).toUpperCase()}</>
  );
}
export const icons = {
  home: Home,
  groceries: ShoppingBasket,
  car: CarFront,
  coffee: Coffee,
  heart: Heart,
  shopping: ShoppingBag,
  utilities: Zap,
  sun: Sun,
  plane: Plane,
  shield: ShieldCheck,
  wallet: Wallet,
  target: Target,
  gift: Gift,
  work: BriefcaseBusiness,
  other: CircleDollarSign,
};
export function CategoryIcon({
  name,
  color = "green",
  small = false,
}: {
  name: string;
  color?: string;
  small?: boolean;
}) {
  const Icon = icons[name as keyof typeof icons] || icons.other;
  return (
    <span className={`category-icon ${color} ${small ? "compact" : ""}`}>
      <Icon size={small ? 18 : 22} strokeWidth={1.7} />
    </span>
  );
}
export function Progress({
  value,
  danger = false,
  color = "green",
  label,
}: {
  value: number;
  danger?: boolean;
  color?: string;
  label: string;
}) {
  return (
    <div
      className={`progress ${danger ? "danger" : color}`}
      role="progressbar"
      aria-valuenow={Math.round(Math.max(0, Math.min(100, value)))}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      aria-valuetext={`${Math.round(value)}%${danger ? ", over budget" : ""}`}
    >
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
export function Empty({
  icon = "wallet",
  title,
  children,
  action,
}: {
  icon?: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <CategoryIcon name={icon} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => {
      (
        ref.current?.querySelector(
          "input:not([type=checkbox]), select, textarea",
        ) as HTMLElement | null
      )?.focus();
    }, 40);
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab") {
        const items = [
          ...(ref.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]",
          ) || []),
        ].filter((x) => x.offsetParent !== null);
        const first = items[0];
        const last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal-heading">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
