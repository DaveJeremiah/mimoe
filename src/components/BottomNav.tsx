import { Home, BookOpen, Layers, User, FolderHeart } from "lucide-react";

export type NavTab = "home" | "library" | "profile" | "wordbank";

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "library", label: "Library", icon: Layers },
    { id: "profile", label: "Profile", icon: User },
  ] as const;

  return (
    <div 
      className="fixed z-50 left-0 right-0 bottom-0 pointer-events-none flex justify-center"
      style={{ 
        paddingBottom: "max(env(safe-area-inset-bottom), 16px)"
      }}
    >
      <div className="pointer-events-auto flex items-center justify-around py-2 px-3 w-[calc(100%-32px)] max-w-[400px]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center p-1.5 min-w-[56px] transition-colors ${
              isActive ? "text-[#B875FF]" : "text-white/40 hover:text-white/60"
            }`}
          >
            <Icon className="w-5 h-5 mb-0.5" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-semibold">{tab.label}</span>
          </button>
        );
      })}
      </div>
    </div>
  );
}
