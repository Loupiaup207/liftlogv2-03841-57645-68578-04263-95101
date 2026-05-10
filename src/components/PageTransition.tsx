import { useLocation } from "react-router-dom";
import { ReactNode } from "react";

export const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-slide-from-right">
      {children}
    </div>
  );
};
