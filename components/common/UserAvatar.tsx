"use client"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Crown } from "lucide-react"

interface UserAvatarProps {
  src?: string
  name: string
  size?: number | "sm" | "md" | "lg"
  className?: string
  showCrown?: boolean
  fallbackClassName?: string
}

const getAvatarGradient = (name: string) => {
  const charCodeSum = name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const gradients = [
    "from-blue-500 to-indigo-600",
    "from-purple-500 to-pink-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-red-600",
  ];
  return gradients[charCodeSum % gradients.length];
};

const getInitials = (name: string) => {
  if (!name || typeof name !== 'string') return "??"
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return initials || "??";
};

export function UserAvatar({ 
  src, 
  name, 
  size = 32, 
  className, 
  showCrown,
  fallbackClassName 
}: UserAvatarProps) {
  let pixelSize = 32;
  if (typeof size === "number") {
    pixelSize = size;
  } else {
    pixelSize = { sm: 24, md: 32, lg: 40 }[size] || 32;
  }

  return (
    <div className="relative inline-flex shrink-0" style={{ width: pixelSize, height: pixelSize }}>
      <Avatar 
        className={cn("border border-white shadow-sm h-full w-full", className)} 
      >
        {src && <AvatarImage src={src} alt={name} className="object-cover h-full w-full" />}
        <AvatarFallback 
          className={cn(
            "text-white font-bold bg-gradient-to-br h-full w-full flex items-center justify-center", 
            getAvatarGradient(name),
            fallbackClassName
          )}
          style={{ fontSize: pixelSize * 0.35 }}
        >
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      {showCrown && (
        <Crown 
          size={pixelSize * 0.35} 
          className="absolute -bottom-0.5 -right-0.5 text-[#FBBC04] drop-shadow-sm" 
          fill="currentColor" 
        />
      )}
    </div>
  )
}
