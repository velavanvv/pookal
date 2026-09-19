export const navigationGroups = [
  {
    title: 'Operations',
    i18nKey: 'operations',
    items: [
      { path: '/dashboard',  label: 'Dashboard',    i18nKey: 'dashboard',    icon: 'bi-speedometer2', module: null },
      { path: '/pos',        label: 'POS Register', i18nKey: 'pos',          icon: 'bi-receipt',      module: 'pos' },
      { path: '/orders',     label: 'Orders',       i18nKey: 'orders',       icon: 'bi-bag-check',    module: 'orders' },
      { path: '/restaurant', label: 'Tables & KOT', i18nKey: 'tablesAndKot', icon: 'bi-cup-hot',      capability: 'restaurant' },
    ],
  },
  {
    title: 'Catalog & Stock',
    i18nKey: 'catalogAndInventory',
    items: [
      { path: '/products',   label: 'Products',     i18nKey: 'products',     icon: 'bi-box-seam',     module: 'products' },
      { path: '/inventory',  label: 'Inventory',    i18nKey: 'inventory',    icon: 'bi-boxes',        module: 'inventory' },
      { path: '/suppliers',  label: 'Suppliers',    i18nKey: 'suppliers',    icon: 'bi-truck-flatbed', capability: 'suppliers', adminOnly: true },
    ],
  },
  {
    title: 'Growth & Channels',
    i18nKey: 'growthAndChannels',
    items: [
      { path: '/crm',        label: 'CRM & Loyalty', i18nKey: 'crm',         icon: 'bi-people',       module: 'crm' },
      { path: '/storefront', label: 'Online Storefront', i18nKey: 'storefront', icon: 'bi-globe2',    module: 'website' },
      { path: '/delivery',   label: 'Delivery Fleet', i18nKey: 'delivery',   icon: 'bi-truck',        capability: 'delivery' },
      { path: '/reports',    label: 'Revenue Analytics', i18nKey: 'reports', icon: 'bi-bar-chart',   module: 'reports' },
    ],
  },
  {
    title: 'Administration',
    i18nKey: 'administration',
    items: [
      { path: '/branches',       label: 'Branches',          i18nKey: 'branches',    icon: 'bi-diagram-3',    module: null, adminOnly: true },
      { path: '/users',          label: 'Staff Users',       i18nKey: 'users',       icon: 'bi-person-badge', module: null, adminOnly: true },
      { path: '/website-config', label: 'Storefront Config', i18nKey: 'website',     icon: 'bi-sliders',      capability: 'website', adminOnly: true },
      { path: '/settings',       label: 'Settings',          i18nKey: 'settings',    icon: 'bi-gear',         module: null },
    ],
  },
];

// Flat list helper for route matching & visibility
export const navigation = navigationGroups.flatMap(group => group.items);
