import React from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dumbbell, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function BottomNavPortal() {
  const navigate = useNavigate();
  if (typeof document === "undefined") return null;

  return createPortal(
    <nav className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-card border-t border-border flex justify-around items-center py-3 px-4 z-[9999]">
      <Button variant="ghost" size="icon" className="flex flex-col gap-0.5 h-auto py-1.5 text-primary">
        <Dumbbell className="h-5 w-5" />
        <span className="text-[10px]">Training</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="flex flex-col gap-0.5 h-auto py-1.5"
        onClick={() => navigate("/profile")}
      >
        <User className="h-5 w-5" />
        <span className="text-[10px]">Profil</span>
      </Button>
    </nav>,
    document.body
  );
}