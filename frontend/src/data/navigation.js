export const navigation = [
  { path: '/dashboard',    label: 'Dashboard',     icon: 'bi-speedometer2', module: null         },
  { path: '/pos',          label: 'POS',            icon: 'bi-receipt',      module: 'pos'        },
  { path: '/inventory',    label: 'Inventory',      icon: 'bi-box-seam',     module: 'inventory'  },
  { path: '/orders',       label: 'Orders',         icon: 'bi-bag-check',    module: 'orders'     },
  { path: '/crm',          label: 'CRM',            icon: 'bi-people',       module: 'crm'        },
  { path: '/delivery',     label: 'Delivery',       icon: 'bi-truck',        module: 'delivery'   },
  { path: '/reports',      label: 'Reports',        icon: 'bi-bar-chart',    module: 'reports'    },
  { path: '/vendor',       label: 'Vendor',         icon: 'bi-person-badge', module: 'vendor'     },
  { path: '/branches',     label: 'Branches',       icon: 'bi-diagram-3',    module: null         },
  { path: '/users',        label: 'Users',          icon: 'bi-people-fill',  module: null, adminOnly: true },
  { path: '/website-config', label: 'Website',      icon: 'bi-globe2',       module: 'website'    },
  { path: '/settings',     label: 'Settings',       icon: 'bi-gear',         module: null         },
];
