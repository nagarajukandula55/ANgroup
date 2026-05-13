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
  Building2,
  ClipboardList,
  ShieldCheck,
  PackageSearch,
  FileBarChart,
  Bot,
  Network,
} from 'lucide-react'

export const sidebarItems = [
  {
    title: 'OVERVIEW',
    items: [
      {
        label: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
      },

      {
        label: 'AI Workspace',
        href: '/ai',
        icon: BrainCircuit,
      },

      {
        label: 'Analytics',
        href: '/analytics',
        icon: BarChart3,
      },
    ],
  },

  {
    title: 'ENTERPRISE',
    items: [
      {
        label: 'Businesses',
        href: '/businesses',
        icon: Building2,
      },

      {
        label: 'Employees',
        href: '/employees',
        icon: Users,
      },

      {
        label: 'Roles & Permissions',
        href: '/roles',
        icon: ShieldCheck,
      },

      {
        label: 'Workflows',
        href: '/workflows',
        icon: ClipboardList,
      },
    ],
  },

  {
    title: 'OPERATIONS',
    items: [
      {
        label: 'Inventory',
        href: '/inventory',
        icon: Boxes,
      },

      {
        label: 'Logistics',
        href: '/logistics',
        icon: Truck,
      },

      {
        label: 'Procurement',
        href: '/procurement',
        icon: PackageSearch,
      },
    ],
  },

  {
    title: 'FINANCE & REPORTS',
    items: [
      {
        label: 'Finance',
        href: '/finance',
        icon: Wallet,
      },

      {
        label: 'Reports',
        href: '/reports',
        icon: FileBarChart,
      },
    ],
  },

  {
    title: 'AI & AUTOMATION',
    items: [
      {
        label: 'AI Agents',
        href: '/ai-agents',
        icon: Bot,
      },

      {
        label: 'Integrations',
        href: '/integrations',
        icon: Network,
      },
    ],
  },

  {
    title: 'SYSTEM',
    items: [
      {
        label: 'Notifications',
        href: '/notifications',
        icon: Bell,
      },

      {
        label: 'Settings',
        href: '/settings',
        icon: Settings,
      },
    ],
  },
]
