import React from 'react';
import { Home, BarChart2, User, Award, BookOpen } from 'lucide-react';

interface NavbarProps {
  activeTab: 'home' | 'history' | 'profile' | 'awards' | 'learn';
  onTabChange: (tab: 'home' | 'history' | 'profile' | 'awards' | 'learn') => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'home', icon: Home, label: 'Início' },
    { id: 'learn', icon: BookOpen, label: 'Aprender' },
    { id: 'history', icon: BarChart2, label: 'Histórico' },
    { id: 'awards', icon: Award, label: 'Conquistas' },
    { id: 'profile', icon: User, label: 'Perfil' },
  ] as const;

  return (
    <nav className="absolute bottom-0 w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-4 md:pb-5 pt-2 px-4 shadow-lg z-50">
      <div className="flex justify-between items-center h-14">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              activeTab === item.id
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <item.icon size={24} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
