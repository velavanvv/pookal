/**
 * Pookal i18n — supported locales: en, ta (Tamil), hi (Hindi)
 * Add new keys here and consume via useI18n() hook.
 */

export const LOCALES = [
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'ta', label: 'தமிழ்',    flag: '🇮🇳' },
  { code: 'hi', label: 'हिन्दी',   flag: '🇮🇳' },
];

export const translations = {
  en: {
    // ── Auth ──
    signIn: 'Sign in', signOut: 'Sign out', email: 'Email address', password: 'Password',
    loginTitle: 'Sign in to Universal Business Platform (UBP)',
    loginSubtitle: 'Sign in with the credentials given by your administrator.',
    needAccount: 'Need an account?', requestDemo: 'Request a demo',
    demoHint: 'a platform admin will create your shop and plan.',

    // ── Navigation & Groups ──
    operations: 'Operations',
    catalogAndInventory: 'Catalog & Stock',
    growthAndChannels: 'Growth & Channels',
    administration: 'Administration',
    dashboard: 'Dashboard', products: 'Products', pos: 'POS', inventory: 'Inventory',
    orders: 'Orders', crm: 'CRM', delivery: 'Delivery', reports: 'Reports',
    settings: 'Settings', suppliers: 'Suppliers', restaurant: 'Restaurant',
    tablesAndKot: 'Tables & KOT',
    website: 'Website', branches: 'Branches', users: 'Users',
    storefront: 'Web Store',

    // ── Common Actions ──
    save: 'Save', cancel: 'Cancel', search: 'Search…', loading: 'Loading…',
    refresh: 'Refresh', close: 'Close', confirm: 'Confirm', delete: 'Delete',
    edit: 'Edit', add: 'Add', yes: 'Yes', no: 'No',
    noData: 'No data found', actions: 'Actions', back: 'Back',
    submit: 'Submit', update: 'Update', create: 'Create',

    // ── Dashboard ──
    liveOperations: 'Live operations across POS, orders, stock, and vertical modules',
    quickActions: 'Quick Actions', quickActionsDesc: 'Fast access to key operational workflows',
    todaysSales: "Today's Sales", pendingOrders: 'Pending Orders',
    lowStockWarnings: 'Low Stock Warnings', liveOrdersQueue: 'Live Orders Queue',
    occupiedTables: 'Occupied Tables', pendingKots: 'Pending KOTs',
    vacantTables: 'Vacant Tables', lowStockExpiry: 'Low Stock / Expiry',
    deliveriesOnRoute: 'Deliveries on Route',
    openPos: 'Open POS', floorAndKots: 'Floor & KOTs', viewOrders: 'View Orders',
    stockAndBatches: 'Stock & Batches', suppliersAndIntake: 'Suppliers & Intake',
    deliveryBoard: 'Delivery Board', analytics: 'Analytics',

    // ── POS ──
    checkout: 'Checkout', cart: 'Cart', catalog: 'Catalog', menuItems: 'Menu Items',
    searchNameSku: 'Search name / SKU…', barcodePlaceholder: 'Scan barcode…',
    addToCart: 'Add to Cart', emptyCart: 'Your cart is empty',
    subtotal: 'Subtotal', discount: 'Discount', tax: 'Tax', grandTotal: 'Grand Total',
    placeOrder: 'Place Order', sendKot: 'Send KOT to Kitchen',
    payAndSettle: 'Pay & Settle', paymentMethod: 'Payment Method',
    cash: 'Cash', card: 'Card', upi: 'UPI', splitPayment: 'Split Payment',
    cashTendered: 'Cash Tendered', changeDue: 'Change Due',
    orderSuccess: 'Order placed successfully!', printReceipt: 'Print Receipt',
    newOrder: 'New Order', dineIn: 'Dine In', takeaway: 'Takeaway',
    inStore: 'In-Store', selectTable: 'Select Table', weightKg: 'Weight (kg)',
    modifiers: 'Modifiers', itemNotes: 'Item Notes', qty: 'Qty', price: 'Price',
    total: 'Total', unit: 'Unit', stock: 'Stock', outOfStock: 'Out of Stock',

    // ── Products ──
    productCatalog: 'Product Catalog', addProduct: 'Add Product', editProduct: 'Edit Product',
    searchProducts: 'Search products…', productName: 'Product Name',
    sku: 'SKU', barcode: 'Barcode', category: 'Category',
    pricingMode: 'Pricing Mode', fixedPrice: 'Fixed Price', weightBased: 'Weight Based',
    taxCategory: 'Tax Category', reorderLevel: 'Reorder Level',
    initialStock: 'Initial Stock', trackExpiry: 'Track Expiry',
    shelfLifeDays: 'Shelf Life (days)', imageUrl: 'Image URL',
    importProducts: 'Import Products', exportProducts: 'Export Products',
    downloadTemplate: 'Download Template',

    // ── Inventory ──
    stockManagement: 'Stock Management', receiveStock: 'Receive Stock',
    adjustStock: 'Adjust Stock', manageProducts: 'Manage Products',
    productsTracked: 'products tracked', batchCode: 'Batch Code',
    expiryDate: 'Expiry Date', adjustmentReason: 'Reason',
    product: 'Product', currentStock: 'Current Stock', reorderLvl: 'Reorder Lvl',
    expiry: 'Expiry', status: 'Status',

    // ── Orders ──
    orderHistory: 'Order History', orderNumber: 'Order Number',
    customer: 'Customer', date: 'Date', amount: 'Amount',
    pending: 'Pending', completed: 'Completed', cancelled: 'Cancelled',

    // ── Settings ──
    shopProfile: 'Shop Profile', generalSettings: 'General Settings',
    shopIdentity: 'Shop Identity', taxAndBilling: 'Tax & Billing',
    receipt: 'Receipt', businessType: 'Business Type',
    capabilities: 'Capabilities', theme: 'Theme',
    shopName: 'Shop Name', shopTagline: 'Tagline', shopPhone: 'Phone',
    shopEmail: 'Email', shopAddress: 'Address',
    gstin: 'GSTIN', defaultTaxRate: 'Default Tax Rate (%)',
    currency: 'Currency Code', currencySymbol: 'Currency Symbol',
    receiptFooter: 'Receipt Footer', saveProfile: 'Save Profile',

    // ── Account / Subscription ──
    daysLeft: 'days left', plan: 'Plan',
    accountSuspended: 'Account Suspended',
    suspendedMsg: 'Your account has been temporarily suspended. Please contact your platform administrator to restore access.',
    subscriptionExpired: 'Subscription Expired',
    expiredMsg: 'Your subscription has expired. Please renew your plan to continue using the system.',
    renewPlan: 'Renew Subscription', contactAdmin: 'Contact Admin',
    extendPlan: 'Extend Plan', payNow: 'Pay Now', selectPlan: 'Select Plan',
    billingMonthly: 'Monthly', billingYearly: 'Yearly',
    paymentSuccess: 'Payment Successful! Your plan has been renewed.',
    currentPlan: 'Current Plan', expiresOn: 'Expires on',

    // ── Language & Voice ──
    language: 'Language', languageSwitch: 'Switch Language',
    voiceInput: 'Voice Input', startListening: 'Start Listening',
    stopListening: 'Stop', listening: 'Listening…',
    voiceNotSupported: 'Voice input not supported in this browser.',
    voiceHint: 'Speak clearly. Tap mic to start/stop.',
    speakResult: 'Read Aloud',
  },

  ta: {
    // ── Auth ──
    signIn: 'உள்நுழைய', signOut: 'வெளியேறு', email: 'மின்னஞ்சல்', password: 'கடவுச்சொல்',
    loginTitle: 'உங்கள் கடையில் உள்நுழைய',
    loginSubtitle: 'உங்கள் தளம் நிர்வாகி வழங்கிய மின்னஞ்சல் மற்றும் கடவுச்சொல் மூலம் உள்நுழையவும்.',
    needAccount: 'கணக்கு தேவையா?', requestDemo: 'டெமோ கோரிக்கை',
    demoHint: 'ஒரு நிர்வாகி உங்கள் கடையை உருவாக்குவார்.',

    // ── Navigation & Groups ──
    operations: 'செயல்பாடுகள்',
    catalogAndInventory: 'பொருட்கள் & சரக்கு',
    growthAndChannels: 'வளர்ச்சி & சேனல்கள்',
    administration: 'நிர்வாகம்',
    dashboard: 'டாஷ்போர்டு', products: 'பொருட்கள்', pos: 'விற்பனை (POS)', inventory: 'சரக்கு',
    orders: 'ஆர்டர்கள்', crm: 'வாடிக்கையாளர்கள்', delivery: 'டெலிவரி', reports: 'அறிக்கைகள்',
    settings: 'அமைப்புகள்', suppliers: 'சப்ளையர்கள்', restaurant: 'உணவகம்',
    tablesAndKot: 'மேசைகள் & KOT',
    website: 'இணையதளம்', branches: 'கிளைகள்', users: 'பயனர்கள்',
    storefront: 'மலர் அங்காடி',

    // ── Common Actions ──
    save: 'சேமிக்க', cancel: 'ரத்துசெய்', search: 'தேடுங்கள்…', loading: 'ஏற்றுகிறது…',
    refresh: 'புதுப்பிக்க', close: 'மூடு', confirm: 'உறுதிப்படுத்து', delete: 'நீக்கு',
    edit: 'திருத்து', add: 'சேர்', yes: 'ஆம்', no: 'இல்லை',
    noData: 'தரவு இல்லை', actions: 'செயல்கள்', back: 'பின்னால்',
    submit: 'சமர்ப்பிக்க', update: 'புதுப்பிக்க', create: 'உருவாக்கு',

    // ── Dashboard ──
    liveOperations: 'POS, ஆர்டர்கள், சரக்கு மற்றும் செங்குத்து தொகுதிகள் முழுவதும் நேரடி செயல்பாடுகள்',
    quickActions: 'விரைவு செயல்கள்', quickActionsDesc: 'முக்கிய செயல்பாட்டு பணிப்பாய்வுகளுக்கு விரைவு அணுகல்',
    todaysSales: 'இன்றைய விற்பனை', pendingOrders: 'நிலுவை ஆர்டர்கள்',
    lowStockWarnings: 'குறைந்த சரக்கு எச்சரிக்கை', liveOrdersQueue: 'நேரடி ஆர்டர் வரிசை',
    occupiedTables: 'பயன்பாட்டிலுள்ள மேசைகள்', pendingKots: 'நிலுவை KOT',
    vacantTables: 'காலி மேசைகள்', lowStockExpiry: 'குறைந்த சரக்கு / காலாவதி',
    deliveriesOnRoute: 'வழியில் உள்ள டெலிவரிகள்',
    openPos: 'விற்பனை திற', floorAndKots: 'மேசை & KOT', viewOrders: 'ஆர்டர்கள் பார்',
    stockAndBatches: 'சரக்கு & தொகுதிகள்', suppliersAndIntake: 'சப்ளையர் & வரவு',
    deliveryBoard: 'டெலிவரி போர்டு', analytics: 'பகுப்பாய்வு',

    // ── POS ──
    checkout: 'செக்அவுட்', cart: 'வண்டி', catalog: 'பட்டியல்', menuItems: 'மெனு பொருட்கள்',
    searchNameSku: 'பெயர் / SKU தேடு…', barcodePlaceholder: 'பார்கோடு ஸ்கேன்…',
    addToCart: 'வண்டியில் சேர்', emptyCart: 'உங்கள் வண்டி காலியாக உள்ளது',
    subtotal: 'உட்தொகை', discount: 'தள்ளுபடி', tax: 'வரி', grandTotal: 'மொத்தம்',
    placeOrder: 'ஆர்டர் செய்', sendKot: 'KOT அனுப்பு',
    payAndSettle: 'பணம் செலுத்தி முடி', paymentMethod: 'பணம் செலுத்தும் முறை',
    cash: 'பணம்', card: 'கார்டு', upi: 'UPI', splitPayment: 'பிரித்து செலுத்து',
    cashTendered: 'கொடுத்த பணம்', changeDue: 'மீதம்',
    orderSuccess: 'ஆர்டர் வெற்றிகரமாக பதிவாகியது!', printReceipt: 'ரசீது அச்சிடு',
    newOrder: 'புது ஆர்டர்', dineIn: 'உள்ளே சாப்பிட', takeaway: 'பார்சல்',
    inStore: 'கடையில்', selectTable: 'மேசை தேர்வு', weightKg: 'எடை (kg)',
    modifiers: 'கூடுதல் விருப்பங்கள்', itemNotes: 'குறிப்புகள்', qty: 'எண்ணிக்கை', price: 'விலை',
    total: 'மொத்தம்', unit: 'அலகு', stock: 'சரக்கு', outOfStock: 'சரக்கு இல்லை',

    // ── Products ──
    productCatalog: 'பொருள் பட்டியல்', addProduct: 'பொருள் சேர்', editProduct: 'பொருள் திருத்து',
    searchProducts: 'பொருட்கள் தேடு…', productName: 'பொருள் பெயர்',
    sku: 'SKU', barcode: 'பார்கோடு', category: 'வகை',
    pricingMode: 'விலை முறை', fixedPrice: 'நிலையான விலை', weightBased: 'எடை அடிப்படை',
    taxCategory: 'வரி வகை', reorderLevel: 'மறு ஆர்டர் நிலை',
    initialStock: 'ஆரம்ப சரக்கு', trackExpiry: 'காலாவதி கண்காணி',
    shelfLifeDays: 'அடுக்கு ஆயுள் (நாட்கள்)', imageUrl: 'படம் URL',
    importProducts: 'பொருட்கள் இறக்கு', exportProducts: 'பொருட்கள் ஏற்று',
    downloadTemplate: 'வார்ப்புரு பதிவிறக்கு',

    // ── Inventory ──
    stockManagement: 'சரக்கு நிர்வாகம்', receiveStock: 'சரக்கு பெறு',
    adjustStock: 'சரக்கு சரிசெய்', manageProducts: 'பொருட்கள் நிர்வகி',
    productsTracked: 'பொருட்கள் கண்காணிக்கப்படுகின்றன', batchCode: 'தொகுதி குறியீடு',
    expiryDate: 'காலாவதி தேதி', adjustmentReason: 'காரணம்',
    product: 'பொருள்', currentStock: 'தற்போதைய சரக்கு', reorderLvl: 'மறு ஆர்டர்',
    expiry: 'காலாவதி', status: 'நிலை',

    // ── Orders ──
    orderHistory: 'ஆர்டர் வரலாறு', orderNumber: 'ஆர்டர் எண்',
    customer: 'வாடிக்கையாளர்', date: 'தேதி', amount: 'தொகை',
    pending: 'நிலுவை', completed: 'முடிந்தது', cancelled: 'ரத்து',

    // ── Settings ──
    shopProfile: 'கடை விவரம்', generalSettings: 'பொது அமைப்புகள்',
    shopIdentity: 'கடை அடையாளம்', taxAndBilling: 'வரி & பில்லிங்',
    receipt: 'ரசீது', businessType: 'தொழில் வகை',
    capabilities: 'திறன்கள்', theme: 'தீம்',
    shopName: 'கடை பெயர்', shopTagline: 'குறுந்தொடர்', shopPhone: 'தொலைபேசி',
    shopEmail: 'மின்னஞ்சல்', shopAddress: 'முகவரி',
    gstin: 'GSTIN', defaultTaxRate: 'இயல்பு வரி விகிதம் (%)',
    currency: 'நாணய குறியீடு', currencySymbol: 'நாணய சின்னம்',
    receiptFooter: 'ரசீது அடிக்குறிப்பு', saveProfile: 'விவரம் சேமி',

    // ── Account / Subscription ──
    daysLeft: 'நாட்கள் உள்ளன', plan: 'திட்டம்',
    accountSuspended: 'கணக்கு நிறுத்தப்பட்டது',
    suspendedMsg: 'உங்கள் கணக்கு தற்காலிகமாக நிறுத்தப்பட்டுள்ளது. அணுகலை மீட்டெடுக்க உங்கள் தள நிர்வாகியை தொடர்பு கொள்ளுங்கள்.',
    subscriptionExpired: 'சந்தா காலாவதியானது',
    expiredMsg: 'உங்கள் சந்தா காலாவதியாகிவிட்டது. கணினியை தொடர்ந்து பயன்படுத்த உங்கள் திட்டத்தை புதுப்பிக்கவும்.',
    renewPlan: 'சந்தா புதுப்பிக்க', contactAdmin: 'நிர்வாகியை தொடர்பு கொள்',
    extendPlan: 'திட்டத்தை நீட்டிக்க', payNow: 'இப்போது செலுத்துங்கள்', selectPlan: 'திட்டம் தேர்வு செய்யுங்கள்',
    billingMonthly: 'மாதாந்திர', billingYearly: 'வருடாந்திர',
    paymentSuccess: 'கட்டணம் வெற்றிகரமாக செலுத்தப்பட்டது! உங்கள் திட்டம் புதுப்பிக்கப்பட்டது.',
    currentPlan: 'தற்போதைய திட்டம்', expiresOn: 'காலாவதி தேதி',

    // ── Language & Voice ──
    language: 'மொழி', languageSwitch: 'மொழி மாற்று',
    voiceInput: 'குரல் உள்ளீடு', startListening: 'கேட்கத் தொடங்கு',
    stopListening: 'நிறுத்து', listening: 'கேட்கிறது…',
    voiceNotSupported: 'இந்த உலாவியில் குரல் உள்ளீடு ஆதரிக்கப்படவில்லை.',
    voiceHint: 'தெளிவாக பேசுங்கள். மைக்கை தட்டி தொடங்கவும்/நிறுத்தவும்.',
    speakResult: 'வாசிக்க',
  },

  hi: {
    // ── Auth ──
    signIn: 'साइन इन करें', signOut: 'साइन आउट', email: 'ईमेल पता', password: 'पासवर्ड',
    loginTitle: 'यूनिवर्सल बिलिंग में साइन इन करें',
    loginSubtitle: 'अपने प्लेटफ़ॉर्म व्यवस्थापक द्वारा दिए गए ईमेल और पासवर्ड से साइन इन करें।',
    needAccount: 'खाता चाहिए?', requestDemo: 'डेमो का अनुरोध करें',
    demoHint: 'एक व्यवस्थापक आपकी दुकान बनाएगा।',

    // ── Navigation & Groups ──
    operations: 'संचालन',
    catalogAndInventory: 'कैटलॉग और स्टॉक',
    growthAndChannels: 'विकास और चैनल',
    administration: 'प्रशासन',
    dashboard: 'डैशबोर्ड', products: 'उत्पाद', pos: 'बिक्री (POS)', inventory: 'स्टॉक',
    orders: 'ऑर्डर', crm: 'ग्राहक', delivery: 'डिलीवरी', reports: 'रिपोर्ट',
    settings: 'सेटिंग', suppliers: 'आपूर्तिकर्ता', restaurant: 'रेस्तरां',
    tablesAndKot: 'टेबल & KOT',
    website: 'वेबसाइट', branches: 'शाखाएं', users: 'उपयोगकर्ता',
    storefront: 'फूलों की दुकान',

    // ── Common Actions ──
    save: 'सहेजें', cancel: 'रद्द करें', search: 'खोजें…', loading: 'लोड हो रहा है…',
    refresh: 'ताज़ा करें', close: 'बंद करें', confirm: 'पुष्टि करें', delete: 'हटाएं',
    edit: 'संपादित करें', add: 'जोड़ें', yes: 'हाँ', no: 'नहीं',
    noData: 'कोई डेटा नहीं', actions: 'कार्रवाइयाँ', back: 'पीछे',
    submit: 'जमा करें', update: 'अपडेट करें', create: 'बनाएं',

    // ── Dashboard ──
    liveOperations: 'POS, ऑर्डर, स्टॉक और वर्टिकल मॉड्यूल में लाइव संचालन',
    quickActions: 'त्वरित कार्रवाई', quickActionsDesc: 'प्रमुख कार्यप्रवाहों तक त्वरित पहुँच',
    todaysSales: 'आज की बिक्री', pendingOrders: 'लंबित ऑर्डर',
    lowStockWarnings: 'कम स्टॉक चेतावनी', liveOrdersQueue: 'लाइव ऑर्डर कतार',
    occupiedTables: 'व्यस्त टेबल', pendingKots: 'लंबित KOT',
    vacantTables: 'खाली टेबल', lowStockExpiry: 'कम स्टॉक / समाप्ति',
    deliveriesOnRoute: 'रास्ते में डिलीवरी',
    openPos: 'बिक्री खोलें', floorAndKots: 'टेबल & KOT', viewOrders: 'ऑर्डर देखें',
    stockAndBatches: 'स्टॉक & बैच', suppliersAndIntake: 'आपूर्तिकर्ता & इनटेक',
    deliveryBoard: 'डिलीवरी बोर्ड', analytics: 'विश्लेषण',

    // ── POS ──
    checkout: 'चेकआउट', cart: 'कार्ट', catalog: 'कैटलॉग', menuItems: 'मेनू आइटम',
    searchNameSku: 'नाम / SKU खोजें…', barcodePlaceholder: 'बारकोड स्कैन करें…',
    addToCart: 'कार्ट में जोड़ें', emptyCart: 'आपका कार्ट खाली है',
    subtotal: 'उप-कुल', discount: 'छूट', tax: 'कर', grandTotal: 'कुल योग',
    placeOrder: 'ऑर्डर दें', sendKot: 'KOT भेजें',
    payAndSettle: 'भुगतान करें', paymentMethod: 'भुगतान विधि',
    cash: 'नकद', card: 'कार्ड', upi: 'UPI', splitPayment: 'विभाजित भुगतान',
    cashTendered: 'दी गई नकदी', changeDue: 'शेष राशि',
    orderSuccess: 'ऑर्डर सफलतापूर्वक दिया गया!', printReceipt: 'रसीद प्रिंट करें',
    newOrder: 'नया ऑर्डर', dineIn: 'डाइन इन', takeaway: 'टेकअवे',
    inStore: 'स्टोर में', selectTable: 'टेबल चुनें', weightKg: 'वज़न (kg)',
    modifiers: 'मॉडिफायर', itemNotes: 'नोट्स', qty: 'मात्रा', price: 'कीमत',
    total: 'कुल', unit: 'इकाई', stock: 'स्टॉक', outOfStock: 'स्टॉक खत्म',

    // ── Products ──
    productCatalog: 'उत्पाद कैटलॉग', addProduct: 'उत्पाद जोड़ें', editProduct: 'उत्पाद संपादित करें',
    searchProducts: 'उत्पाद खोजें…', productName: 'उत्पाद नाम',
    sku: 'SKU', barcode: 'बारकोड', category: 'श्रेणी',
    pricingMode: 'मूल्य मोड', fixedPrice: 'निश्चित मूल्य', weightBased: 'वज़न आधारित',
    taxCategory: 'कर श्रेणी', reorderLevel: 'पुनःऑर्डर स्तर',
    initialStock: 'प्रारंभिक स्टॉक', trackExpiry: 'समाप्ति ट्रैक करें',
    shelfLifeDays: 'शेल्फ लाइफ (दिन)', imageUrl: 'छवि URL',
    importProducts: 'उत्पाद आयात करें', exportProducts: 'उत्पाद निर्यात करें',
    downloadTemplate: 'टेम्पलेट डाउनलोड करें',

    // ── Inventory ──
    stockManagement: 'स्टॉक प्रबंधन', receiveStock: 'स्टॉक प्राप्त करें',
    adjustStock: 'स्टॉक समायोजित करें', manageProducts: 'उत्पाद प्रबंधित करें',
    productsTracked: 'उत्पाद ट्रैक किए गए', batchCode: 'बैच कोड',
    expiryDate: 'समाप्ति तिथि', adjustmentReason: 'कारण',
    product: 'उत्पाद', currentStock: 'वर्तमान स्टॉक', reorderLvl: 'पुनःऑर्डर',
    expiry: 'समाप्ति', status: 'स्थिति',

    // ── Orders ──
    orderHistory: 'ऑर्डर इतिहास', orderNumber: 'ऑर्डर नंबर',
    customer: 'ग्राहक', date: 'तारीख', amount: 'राशि',
    pending: 'लंबित', completed: 'पूर्ण', cancelled: 'रद्द',

    // ── Settings ──
    shopProfile: 'दुकान प्रोफ़ाइल', generalSettings: 'सामान्य सेटिंग',
    shopIdentity: 'दुकान पहचान', taxAndBilling: 'कर & बिलिंग',
    receipt: 'रसीद', businessType: 'व्यवसाय प्रकार',
    capabilities: 'क्षमताएं', theme: 'थीम',
    shopName: 'दुकान का नाम', shopTagline: 'टैगलाइन', shopPhone: 'फ़ोन',
    shopEmail: 'ईमेल', shopAddress: 'पता',
    gstin: 'GSTIN', defaultTaxRate: 'डिफ़ॉल्ट कर दर (%)',
    currency: 'मुद्रा कोड', currencySymbol: 'मुद्रा चिह्न',
    receiptFooter: 'रसीद फुटर', saveProfile: 'प्रोफ़ाइल सहेजें',

    // ── Account / Subscription ──
    daysLeft: 'दिन बाकी', plan: 'योजना',
    accountSuspended: 'खाता निलंबित है',
    suspendedMsg: 'आपका खाता अस्थायी रूप से निलंबित कर दिया गया है। पहुँच बहाल करने के लिए अपने प्लेटफ़ॉर्म व्यवस्थापक से संपर्क करें।',
    subscriptionExpired: 'सदस्यता समाप्त हो गई',
    expiredMsg: 'आपकी सदस्यता समाप्त हो गई है। सिस्टम का उपयोग जारी रखने के लिए अपनी योजना नवीनीकृत करें।',
    renewPlan: 'सदस्यता नवीनीकृत करें', contactAdmin: 'व्यवस्थापक से संपर्क करें',
    extendPlan: 'योजना बढ़ाएं', payNow: 'अभी भुगतान करें', selectPlan: 'योजना चुनें',
    billingMonthly: 'मासिक', billingYearly: 'वार्षिक',
    paymentSuccess: 'भुगतान सफल! आपकी योजना नवीनीकृत हो गई।',
    currentPlan: 'वर्तमान योजना', expiresOn: 'समाप्ति तिथि',

    // ── Language & Voice ──
    language: 'भाषा', languageSwitch: 'भाषा बदलें',
    voiceInput: 'आवाज़ इनपुट', startListening: 'सुनना शुरू करें',
    stopListening: 'रोकें', listening: 'सुन रहे हैं…',
    voiceNotSupported: 'इस ब्राउज़र में वॉइस इनपुट समर्थित नहीं है।',
    voiceHint: 'स्पष्ट रूप से बोलें। माइक टैप करके शुरू/रोकें।',
    speakResult: 'पढ़कर सुनाएं',
  },
};

export function t(locale, key) {
  return translations[locale]?.[key] ?? translations['en']?.[key] ?? key;
}
