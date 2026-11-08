import { useLocation } from "react-router-dom";
import { ReactNode } from "react";

export const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  return (
    <div key={location.pathname} className="h-full min-h-0 flex flex-col animate-slide-from-right">
      {children}
    </div>
  );
};
