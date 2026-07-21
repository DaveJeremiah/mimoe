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
      className="fixed z-50 flex items-center justify-around py-2 px-2 bg-[#121215]/95 backdrop-blur-md rounded-full shadow-2xl border border-white/10"
      style={{ 
        bottom: "0px",
        left: "12px",
        right: "12px",
        paddingBottom: "max(env(safe-area-inset-bottom, 8px), 8px)"
      }}
    >
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
  );
}
