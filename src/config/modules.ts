import {
  LayoutDashboard,
  BrainCircuit,
  BarChart3,
  Wallet,
  Users,
  Boxes,
  Truck,
  Bell,
  Settings,
  ShoppingCart,
} from 'lucide-react'

export const modules = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'AI Workspace',
    href: '/ai',
    icon: BrainCircuit,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    name: 'Finance',
    href: '/finance',
    icon: Wallet,
  },
  {
    name: 'Employees',
    href: '/employees',
    icon: Users,
  },
  {
    name: 'Inventory',
    href: '/inventory',
    icon: Boxes,
  },
  {
    name: 'Logistics',
    href: '/logistics',
    icon: Truck,
  },
  {
    name: 'Ecommerce',
    href: '/ecommerce',
    icon: ShoppingCart,
  },
  {
    name: 'Notifications',
    href: '/notifications',
    icon: Bell,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]
