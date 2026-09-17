import React from 'react';
import {
  GraduationCap, Printer, FileText, BookOpen, Book, PenTool,
  ClipboardList, School, Utensils, Cookie, Coffee, Fuel,
  Car, Bus, Smartphone, ShoppingBag, Film, Activity, User as UserIcon,
  CalendarCheck, MoreHorizontal, Wallet, Banknote, Building,
  PiggyBank, Target, HelpCircle, Tag
} from 'lucide-react';

export function formatPaise(paise: number, showDecimals: boolean = false): string {
  const rupees = paise / 100;
  if (showDecimals || paise % 100 !== 0) {
    return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `₹${rupees.toLocaleString('en-IN')}`;
}

export function rupeesToPaise(rupees: number | string): number {
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(num) || num < 0) return 0;
  return Math.round(num * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatDateRelative(dateStr: string): string {
  const today = new Date();
  const d = new Date(dateStr + 'T00:00:00');
  
  const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((todayZero.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function getCategoryIconComponent(iconName: string): React.ComponentType<{ className?: string }> {
  const map: Record<string, React.ComponentType<{ className?: string }>> = {
    'graduation-cap': GraduationCap,
    'printer': Printer,
    'file-text': FileText,
    'book-open': BookOpen,
    'book': Book,
    'pen-tool': PenTool,
    'clipboard-list': ClipboardList,
    'school': School,
    'utensils': Utensils,
    'cookie': Cookie,
    'coffee': Coffee,
    'fuel': Fuel,
    'car': Car,
    'bus': Bus,
    'smartphone': Smartphone,
    'shopping-bag': ShoppingBag,
    'film': Film,
    'activity': Activity,
    'user': UserIcon,
    'calendar-check': CalendarCheck,
    'wallet': Wallet,
    'banknote': Banknote,
    'building': Building,
    'piggy-bank': PiggyBank,
    'target': Target,
    'tag': Tag,
    'more-horizontal': MoreHorizontal,
  };

  return map[iconName] || Tag;
}
