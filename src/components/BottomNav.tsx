import { Home, BookOpen, Layers, User, FolderHeart } from "lucide-react";

export type NavTab = "home" | "library" | "personal" | "profile" | "wordbank";

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "library", label: "Library", icon: Layers },
    { id: "personal", label: "Personal", icon: FolderHeart },
    { id: "profile", label: "Profile", icon: User },
  ] as const;

  return (
    <div 
      className="fixed z-50 left-0 right-0 pointer-events-none flex justify-center pb-3"
      style={{ 
        bottom: "env(safe-area-inset-bottom)"
      }}
    >
      <div className="pointer-events-auto flex items-center justify-around py-3 px-4 bg-[#121215]/95 backdrop-blur-md rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-white/10 w-[calc(100%-32px)] max-w-[400px]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center p-2 min-w-[64px] transition-colors ${
              isActive ? "text-[#B875FF]" : "text-white/40 hover:text-white/60"
            }`}
          >
            <Icon className="w-6 h-6 mb-1" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-semibold">{tab.label}</span>
          </button>
        );
      })}
      </div>
    </div>
  );
}
