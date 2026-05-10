import { useLocation } from "react-router-dom";
import { ReactNode } from "react";

export const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  return (
    <div
      key={location.pathname}
      className="animate-in slide-in-from-right duration-300 ease-out fade-in-0"
    >
      {children}
    </div>
  );
};
