import { BoatStatus, CaseStatus, DemoAccountId, LanguageCode } from '../types/rescue';

export interface TranslationDict {
  brandTitle: string;
  navMap: string;
  navDispatch: string;
  navHowItWorks: string;
  navDrill: string;
  demoAccountLabel: string;
  accountGuest: string;
  accountUser: string;
  accountAdmin: string;
  languageLabel: string;
  searchPlaceholder: string;
  allPlacesOption: string;
  onlineBtn: string;
  offlineBtn: string;
  waitingToSendLabel: string;
  waitingToSendCount: (n: number) => string;
  sendQueuedBtn: (n: number) => string;
  saveWaitingBtn: string;
  notSentLabel: string;
  needsConnectionMsg: string;
  browserOfflineNote: string;
  resetDemoBtn: string;
  demoNoticeText: string;
  demoEmergencyNote: string;
  quickActionIssueTitle: string;
  quickActionIssueDesc: string;
  quickActionSelfTitle: string;
  quickActionSelfDesc: string;
  quickActionFamilyTitle: string;
  quickActionFamilyDesc: string;
  guestBannerText: string;
  switchToUserBtn: string;
  myRescueLabel: string;
  noActiveRescue: string;
  waitingForBoat: string;
  requestRescueBtn: string;
  mapHeading: string;
  mapSubGuest: string;
  mapSubUser: string;
  mapSubAdmin: string;
  mapTapHint: string;
  mapBoatMoveHint: string;
  tappedLabel: string;
  movePinBtn: string;
  pinMoveActiveBtn: string;
  layerBoats: string;
  layerRequests: string;
  layerShelters: string;
  layerSupplies: string;
  layerFlood: string;
  offlineMapWarning: string;
  legendBoat: string;
  legendShelter: string;
  legendPickup: string;
  legendSupply: string;
  legendFlood: string;
  legendTip: string;
  // Detail cards
  closeLabel: string;
  lastUpdateLabel: string;
  crewEtaLabel: string;
  assignedPickupLabel: string;
  crewLeadLabel: string;
  suppliesLabel: string;
  adminBoatControls: string;
  assignBtn: string;
  etaPlaceholder: string;
  updateBoatLocBtn: string;
  useTappedPinBtn: string;
  pickedUpSeparateNote: string;
  personPickedUpBtn: string;
  openAdminPanelBtn: string;
  // Lower cards
  guestCardTitle: string;
  guestCardBody: string;
  openUserViewBtn: string;
  myRescueTitle: string;
  pickupPointLabel: string;
  updatePinBtn: string;
  cancelBtn: string;
  assignedBoatsHeading: string;
  updatesFromTeamHeading: string;
  privacyFooterUser: string;
  // Shelters & outages panel
  sheltersPanelTitle: string;
  openSheltersTitle: string;
  allSheltersTitle: string;
  accessibilityLabel: string;
  powerPanelTitle: string;
  causeLabel: string;
  estRestoreLabel: string;
  notConfirmed: string;
  roadsPanelTitle: string;
  noticesPanelTitle: string;
  // Workflow & Drill
  workflowHeading: string;
  workflowSub: string;
  drillHeading: string;
  drillSub: string;
  // Admin Console
  adminProtectedTitle: string;
  adminProtectedDesc: string;
  switchToAdminBtn: string;
  adminConsoleTitle: string;
  adminConsoleSub: string;
  footerDemoNote: string;
  // Map-first & Evacuation Assistance
  menuLabel: string;
  locateMeLabel: string;
  layersLabel: string;
  layerOutages: string;
  layerWaterLevels: string;
  layerTerrain: string;
  evacuationAssistanceTitle: string;
  dangerQuestion: string;
  helpNeededQuestion: string;
  notSureOption: string;
  noDocNeededNote: string;
  confirmPriorityBtn: string;
  priorityReasonPlaceholder: string;
  urgentLabel: string;
  reportSourceLabel: string;
  lastContactLabel: string;
  currentDangerLabel: string;
  abilityToEvacuateLabel: string;
  assignedCrewLabel: string;
  myRescueDetailsBtn: string;
}

export const TRANSLATIONS: Record<LanguageCode, TranslationDict> = {
  en: {
    brandTitle: 'Flood Rescue Map Malaysia',
    navMap: 'Live Map',
    navDispatch: 'Admin Console',
    navHowItWorks: 'How It Works',
    navDrill: 'Drill Check',
    demoAccountLabel: 'Demo account',
    accountGuest: 'Guest',
    accountUser: 'User (Resident)',
    accountAdmin: 'Admin (Rescue Coordinator)',
    languageLabel: 'Language',
    searchPlaceholder: 'Search area, shelter, or landmark',
    allPlacesOption: 'All Shah Alam places',
    onlineBtn: 'Online · Test Offline',
    offlineBtn: 'Offline · Go Online',
    waitingToSendLabel: 'Waiting to send',
    waitingToSendCount: (n) => `${n} waiting to send`,
    sendQueuedBtn: (n) => `Send ${n} waiting item(s)`,
    saveWaitingBtn: 'Save · Waiting to send',
    notSentLabel: 'Not sent',
    needsConnectionMsg: 'Needs a connection. Not saved while offline.',
    browserOfflineNote: 'No network connection detected.',
    resetDemoBtn: 'Reset',
    demoNoticeText:
      'Local demo (Shah Alam): Fictional data for testing. Real apps must also protect private data on the server.',
    demoEmergencyNote: 'Demo only — call 999 in a real emergency.',
    quickActionIssueTitle: 'Report a problem',
    quickActionIssueDesc: 'Flooded road or power cut',
    quickActionSelfTitle: 'I need rescue',
    quickActionSelfDesc: 'Request a boat for yourself',
    quickActionFamilyTitle: 'Help someone else',
    quickActionFamilyDesc: 'Request rescue for family or OKU',
    guestBannerText: 'Guest mode: Rescue boats and private details are hidden.',
    switchToUserBtn: 'View User (Resident)',
    myRescueLabel: 'My Rescue',
    noActiveRescue: 'You have no active rescue request.',
    waitingForBoat: 'Waiting for a boat.',
    requestRescueBtn: 'Request rescue',
    mapHeading: 'Shah Alam Flood Map · OpenStreetMap',
    mapSubGuest: 'Public view · Boats & private cases hidden',
    mapSubUser: 'Your pickup point & assigned boats',
    mapSubAdmin: 'All boats, rescue cases & supplies',
    mapTapHint: 'Tap any icon on the map to see details.',
    mapBoatMoveHint: 'Tap anywhere on the map to move this boat.',
    tappedLabel: 'Selected spot',
    movePinBtn: 'Move Pin',
    pinMoveActiveBtn: 'Tap Map to Move Pin',
    layerBoats: 'Boats',
    layerRequests: 'Rescue Cases',
    layerShelters: 'Shelters',
    layerSupplies: 'Supplies',
    layerFlood: 'Flood Alerts',
    offlineMapWarning:
      'No internet: Map tiles need internet. Your saved rescue list stays readable, and new actions are kept as Waiting to send.',
    legendBoat: 'Rescue boat',
    legendShelter: 'Open shelter (PPS)',
    legendPickup: 'Pickup point',
    legendSupply: 'Supplies',
    legendFlood: 'Flood / Power alert',
    legendTip: 'Tap any icon for details',
    closeLabel: 'Close',
    lastUpdateLabel: 'Last update',
    crewEtaLabel: 'Estimated arrival',
    assignedPickupLabel: 'Going to',
    crewLeadLabel: 'Team leader',
    suppliesLabel: 'Onboard gear',
    adminBoatControls: 'Update Boat',
    assignBtn: 'Assign',
    etaPlaceholder: 'Optional ETA (e.g. 2:55 PM)',
    updateBoatLocBtn: 'Move Boat on Map',
    useTappedPinBtn: 'Use Selected Spot',
    pickedUpSeparateNote:
      '"Person picked up" is marked separately on each person\'s case.',
    personPickedUpBtn: 'Person picked up',
    openAdminPanelBtn: 'Open Admin Console',
    guestCardTitle: 'Public Information (Guest)',
    guestCardBody:
      'Guests can check flood alerts, open shelters (PPS), and power updates. Boats, private pickup points, phone numbers, and supply lists are hidden.',
    openUserViewBtn: 'Switch to User (Resident)',
    myRescueTitle: 'My Rescue',
    pickupPointLabel: 'Pickup spot',
    updatePinBtn: 'Change pickup spot',
    cancelBtn: 'Cancel',
    assignedBoatsHeading: 'Boats coming to your pickup spot',
    updatesFromTeamHeading: 'Messages from rescue team',
    privacyFooterUser: 'Other families, unrelated boats, and staff contacts are hidden.',
    sheltersPanelTitle: 'Shelters, Flood Alerts & Power',
    openSheltersTitle: 'Open Shelters (PPS)',
    allSheltersTitle: 'All Shelters (PPS)',
    accessibilityLabel: 'Access',
    powerPanelTitle: 'Power Updates',
    causeLabel: 'Cause',
    estRestoreLabel: 'Power back around',
    notConfirmed: 'Not yet confirmed',
    roadsPanelTitle: 'Flooded Roads & Alerts',
    noticesPanelTitle: 'Area Updates',
    workflowHeading: 'How Rescue Handover Works',
    workflowSub:
      'Helps a relative report from afar without the elderly or OKU person needing a phone, and confirms each person is safely on board.',
    drillHeading: 'Drill Check & Demo Scenarios',
    drillSub:
      'Compare this app against a paper-and-phone drill for faster location checks and fewer errors.',
    adminProtectedTitle: 'Admin Console Locked',
    adminProtectedDesc:
      'Switch Demo account to Admin (Rescue Coordinator) to manage all boats, cases, and supplies.',
    switchToAdminBtn: 'Switch to Admin (Rescue Coordinator)',
    adminConsoleTitle: 'Admin Dispatch & Case Board',
    adminConsoleSub:
      'Confirm pickup spots, assign one destination per boat, and update shelter or power info.',
    footerDemoNote:
      'Demo data only · Map © OpenStreetMap contributors · Does not call 999',
    menuLabel: 'Menu',
    locateMeLabel: 'Locate Me',
    layersLabel: 'Layers',
    layerOutages: 'Outage Areas',
    layerWaterLevels: 'Water Levels',
    layerTerrain: 'Terrain',
    evacuationAssistanceTitle: 'Evacuation assistance',
    dangerQuestion: 'What danger is the person facing now?',
    helpNeededQuestion: 'What help do they need to reach the pickup point or board the boat?',
    notSureOption: 'Not sure',
    noDocNeededNote:
      'No OKU card, ID, or medical record is needed. Selecting assistance flags crew gear or support only and does not automatically raise dispatch priority.',
    confirmPriorityBtn: 'Confirm priority',
    priorityReasonPlaceholder: 'Short reason (e.g. rising water / battery low)',
    urgentLabel: 'Urgent',
    reportSourceLabel: 'Report source',
    lastContactLabel: 'Last contact',
    currentDangerLabel: 'Current danger',
    abilityToEvacuateLabel: 'Ability to evacuate',
    assignedCrewLabel: 'Assigned crew',
    myRescueDetailsBtn: 'Details',
  },
  bm: {
    brandTitle: 'Peta Bantuan Banjir Malaysia',
    navMap: 'Peta Utama',
    navDispatch: 'Panel Admin',
    navHowItWorks: 'Cara Guna',
    navDrill: 'Semakan Latihan',
    demoAccountLabel: 'Akaun demo',
    accountGuest: 'Tetamu (Guest)',
    accountUser: 'Pengguna (Penduduk)',
    accountAdmin: 'Admin (Penyelaras Penyelamat)',
    languageLabel: 'Bahasa',
    searchPlaceholder: 'Cari kawasan, PPS, atau mercu tanda',
    allPlacesOption: 'Semua lokasi Shah Alam',
    onlineBtn: 'Dalam Talian · Uji Luar Talian',
    offlineBtn: 'Luar Talian · Sambung Semula',
    waitingToSendLabel: 'Menunggu untuk dihantar',
    waitingToSendCount: (n) => `${n} menunggu untuk dihantar`,
    sendQueuedBtn: (n) => `Hantar ${n} item yang menunggu`,
    saveWaitingBtn: 'Simpan · Menunggu untuk dihantar',
    notSentLabel: 'Tidak dihantar',
    needsConnectionMsg: 'Perlu sambungan internet. Tidak disimpan semasa luar talian.',
    browserOfflineNote: 'Tiada sambungan rangkaian dikesan.',
    resetDemoBtn: 'Set Semula',
    demoNoticeText:
      'Demo tempatan (Shah Alam): Data rekaan untuk ujian. Sistem sebenar perlu kawalan akses di pelayan.',
    demoEmergencyNote: 'Demo sahaja — hubungi 999 jika kecemasan sebenar.',
    quickActionIssueTitle: 'Lapor masalah',
    quickActionIssueDesc: 'Jalan dinaiki air atau bekalan elektrik terputus',
    quickActionSelfTitle: 'Saya perlukan bantuan',
    quickActionSelfDesc: 'Minta bot penyelamat untuk diri sendiri',
    quickActionFamilyTitle: 'Bantu ahli keluarga / OKU',
    quickActionFamilyDesc: 'Hantar permintaan bagi pihak orang lain',
    guestBannerText: 'Mod Tetamu: Bot penyelamat dan maklumat peribadi disembunyikan.',
    switchToUserBtn: 'Lihat Pengguna (Penduduk)',
    myRescueLabel: 'Bantuan Saya',
    noActiveRescue: 'Tiada permintaan bantuan aktif.',
    waitingForBoat: 'Sedang menunggu bot.',
    requestRescueBtn: 'Minta bantuan',
    mapHeading: 'Peta Banjir Shah Alam · OpenStreetMap',
    mapSubGuest: 'Paparan awam · Bot & kes peribadi disembunyikan',
    mapSubUser: 'Lokasi ambil anda & bot yang ditugaskan',
    mapSubAdmin: 'Semua bot, kes bantuan & bekalan',
    mapTapHint: 'Tekan mana-mana ikon di peta untuk lihat butiran.',
    mapBoatMoveHint: 'Tekan peta untuk pindahkan lokasi bot ini.',
    tappedLabel: 'Lokasi dipilih',
    movePinBtn: 'Alih Pin',
    pinMoveActiveBtn: 'Tekan Peta untuk Alih Pin',
    layerBoats: 'Bot',
    layerRequests: 'Kes Bantuan',
    layerShelters: 'PPS (Pusat Pemindahan)',
    layerSupplies: 'Bekalan',
    layerFlood: 'Amaran Banjir',
    offlineMapWarning:
      'Tiada internet: Peta memerlukan internet. Senarai kes anda masih boleh dibaca, dan tindakan baharu disimpan sebagai Menunggu untuk dihantar.',
    legendBoat: 'Bot penyelamat',
    legendShelter: 'PPS dibuka',
    legendPickup: 'Titik ambil',
    legendSupply: 'Bekalan',
    legendFlood: 'Amaran banjir / elektrik',
    legendTip: 'Tekan ikon untuk butiran',
    closeLabel: 'Tutup',
    lastUpdateLabel: 'Kemas kini terakhir',
    crewEtaLabel: 'Anggaran tiba',
    assignedPickupLabel: 'Menuju ke',
    crewLeadLabel: 'Ketua pasukan',
    suppliesLabel: 'Kelengkapan bot',
    adminBoatControls: 'Kemas Kini Bot',
    assignBtn: 'Tugaskan',
    etaPlaceholder: 'Anggaran tiba (cth: 2:55 PM)',
    updateBoatLocBtn: 'Alih Lokasi Bot',
    useTappedPinBtn: 'Guna Lokasi Dipilih',
    pickedUpSeparateNote:
      '"Mangsa telah diambil" disahkan secara berasingan pada setiap kes.',
    personPickedUpBtn: 'Mangsa telah diambil',
    openAdminPanelBtn: 'Buka Panel Admin',
    guestCardTitle: 'Maklumat Awam (Tetamu)',
    guestCardBody:
      'Tetamu boleh melihat amaran banjir, PPS yang dibuka, dan status elektrik. Bot, titik ambil peribadi, nombor telefon, dan senarai bekalan disembunyikan.',
    openUserViewBtn: 'Tukar ke Pengguna (Penduduk)',
    myRescueTitle: 'Bantuan Saya',
    pickupPointLabel: 'Titik ambil',
    updatePinBtn: 'Tukar titik ambil',
    cancelBtn: 'Batal',
    assignedBoatsHeading: 'Bot ditugaskan ke titik ambil anda',
    updatesFromTeamHeading: 'Mesej daripada pasukan penyelamat',
    privacyFooterUser: 'Keluarga lain, bot lain, dan nombor staf disembunyikan.',
    sheltersPanelTitle: 'PPS, Amaran Banjir & Elektrik',
    openSheltersTitle: 'PPS Dibuka',
    allSheltersTitle: 'Semua PPS',
    accessibilityLabel: 'Kemudahan',
    powerPanelTitle: 'Status Bekalan Elektrik',
    causeLabel: 'Punca',
    estRestoreLabel: 'Anggaran pulih',
    notConfirmed: 'Belum disahkan',
    roadsPanelTitle: 'Jalan Ditutup & Amaran',
    noticesPanelTitle: 'Hebahan Kawasan',
    workflowHeading: 'Aliran Bantuan Penyelamat',
    workflowSub:
      'Membolehkan keluarga membuat laporan dari jauh tanpa warga emas atau OKU memerlukan telefon, serta mengesahkan setiap individu selamat menaiki bot.',
    drillHeading: 'Semakan Latihan & Senario Demo',
    drillSub:
      'Bandingkan aliran aplikasi ini dengan latihan kertas dan telefon untuk pengesahan lokasi yang lebih pantas.',
    adminProtectedTitle: 'Panel Admin Dikunci',
    adminProtectedDesc:
      'Tukar Akaun demo kepada Admin (Penyelaras Penyelamat) untuk mengurus semua bot, kes dan bekalan.',
    switchToAdminBtn: 'Tukar ke Admin (Penyelaras Penyelamat)',
    adminConsoleTitle: 'Panel Penyelaras & Tugasan Bot',
    adminConsoleSub:
      'Sahkan titik ambil, tugaskan satu destinasi bagi setiap bot, dan kemas kini status PPS atau elektrik.',
    footerDemoNote:
      'Data demo sahaja · Peta © OpenStreetMap contributors · Tidak menghubungi 999 sebenar',
    menuLabel: 'Menu',
    locateMeLabel: 'Lokasi Saya',
    layersLabel: 'Lapisan',
    layerOutages: 'Kawasan Putus Elektrik',
    layerWaterLevels: 'Paras Air',
    layerTerrain: 'Bentuk Muka Bumi',
    evacuationAssistanceTitle: 'Bantuan pemindahan',
    dangerQuestion: 'Apakah bahaya yang sedang dihadapi orang tersebut sekarang?',
    helpNeededQuestion: 'Apakah bantuan yang diperlukan untuk ke titik ambil atau menaiki bot?',
    notSureOption: 'Tidak pasti',
    noDocNeededNote:
      'Tiada kad OKU, kad pengenalan atau rekod perubatan diperlukan. Pilihan bantuan hanya menandakan keperluan kelengkapan atau sokongan kru dan tidak menaikkan keutamaan penghantaran bot secara automatik.',
    confirmPriorityBtn: 'Sahkan keutamaan',
    priorityReasonPlaceholder: 'Sebab ringkas (cth: air naik / bateri oksigen rendah)',
    urgentLabel: 'Segera',
    reportSourceLabel: 'Sumber laporan',
    lastContactLabel: 'Hubungan terakhir',
    currentDangerLabel: 'Bahaya semasa',
    abilityToEvacuateLabel: 'Keupayaan berpindah',
    assignedCrewLabel: 'Kru ditugaskan',
    myRescueDetailsBtn: 'Butiran',
  },
  cn: {
    brandTitle: '马来西亚水灾救援地图',
    navMap: '实时地图',
    navDispatch: '管理员调度',
    navHowItWorks: '救援流程',
    navDrill: '演练对比',
    demoAccountLabel: '演示账号',
    accountGuest: '访客 (Guest)',
    accountUser: '居民用户 (User)',
    accountAdmin: '救援管理员 (Admin)',
    languageLabel: '语言',
    searchPlaceholder: '搜索地区、救灾中心或地标',
    allPlacesOption: '莎阿南全部地点',
    onlineBtn: '在线 · 模拟断网',
    offlineBtn: '离线 · 恢复连接',
    waitingToSendLabel: '等待发送',
    waitingToSendCount: (n) => `${n} 条等待发送`,
    sendQueuedBtn: (n) => `发送 ${n} 条等待发送的项目`,
    saveWaitingBtn: '保存 · 等待发送',
    notSentLabel: '未发送',
    needsConnectionMsg: '需要网络连接。离线时不会保存。',
    browserOfflineNote: '未检测到网络连接。',
    resetDemoBtn: '重置',
    demoNoticeText:
      '本地演示（莎阿南）：所有数据均为模拟演示。真实部署时必须在服务器端验证访问权限。',
    demoEmergencyNote: '仅供演示 — 真实紧急情况请拨打 999。',
    quickActionIssueTitle: '报告路况或停电',
    quickActionIssueDesc: '道路积水或电力中断',
    quickActionSelfTitle: '我需要救援',
    quickActionSelfDesc: '为自己申请救援船只',
    quickActionFamilyTitle: '帮家人/OKU求助',
    quickActionFamilyDesc: '代外地亲属或行动不便者求助',
    guestBannerText: '访客模式：救援船只与私人接送信息已隐藏。',
    switchToUserBtn: '查看居民用户视角',
    myRescueLabel: '我的救援',
    noActiveRescue: '当前没有进行中的救援请求。',
    waitingForBoat: '正在等待分配船只。',
    requestRescueBtn: '申请救援',
    mapHeading: '莎阿南水灾救援地图 · OpenStreetMap',
    mapSubGuest: '公开视图 · 船只与私人求助已隐藏',
    mapSubUser: '您的接送点及已分配的船只',
    mapSubAdmin: '所有救援船只、求助个案与物资',
    mapTapHint: '点击地图上的任意图标查看详情。',
    mapBoatMoveHint: '点击地图任意位置以更新该船只位置。',
    tappedLabel: '已选位置',
    movePinBtn: '移动定位',
    pinMoveActiveBtn: '点击地图以移动定位',
    layerBoats: '船只',
    layerRequests: '求助个案',
    layerShelters: '救灾中心',
    layerSupplies: '物资仓库',
    layerFlood: '灾情与停电',
    offlineMapWarning:
      '当前离线：地图底图需要网络加载。已保存的求助信息仍可查看，新的操作将显示为等待发送。',
    legendBoat: '救援船只',
    legendShelter: '开放救灾中心 (PPS)',
    legendPickup: '接送点',
    legendSupply: '物资点',
    legendFlood: '水灾 / 停电警报',
    legendTip: '点击图标查看详情',
    closeLabel: '关闭',
    lastUpdateLabel: '最后更新',
    crewEtaLabel: '预计到达',
    assignedPickupLabel: '前往接送点',
    crewLeadLabel: '船队负责人',
    suppliesLabel: '船上物资',
    adminBoatControls: '更新船只状态',
    assignBtn: '分配',
    etaPlaceholder: '可选预计时间（如 2:55 PM）',
    updateBoatLocBtn: '在地图上移动船只',
    useTappedPinBtn: '使用已选位置',
    pickedUpSeparateNote: '“已接走人员”需在具体求助个案中单独确认。',
    personPickedUpBtn: '确认已接走人员',
    openAdminPanelBtn: '打开管理员调度',
    guestCardTitle: '公开信息（访客）',
    guestCardBody:
      '访客可查看水灾警报、开放的救灾中心 (PPS) 和停电恢复进展。所有救援船只、私人接送点、电话号码及物资库存均已隐藏。',
    openUserViewBtn: '切换至居民用户',
    myRescueTitle: '我的救援',
    pickupPointLabel: '接送地点',
    updatePinBtn: '修改接送点',
    cancelBtn: '取消',
    assignedBoatsHeading: '已分配到您接送点的船只',
    updatesFromTeamHeading: '救援协调员消息',
    privacyFooterUser: '其他家庭信息、无关船只及工作人员联系方式已隐藏。',
    sheltersPanelTitle: '救灾中心、路况与电力更新',
    openSheltersTitle: '开放救灾中心 (PPS)',
    allSheltersTitle: '全部救灾中心 (PPS)',
    accessibilityLabel: '无障碍设施',
    powerPanelTitle: '区域电力状态',
    causeLabel: '原因',
    estRestoreLabel: '预计恢复',
    notConfirmed: '暂未确认',
    roadsPanelTitle: '封路与积水警报',
    noticesPanelTitle: '区域公告',
    workflowHeading: '救援交接流程',
    workflowSub:
      '外地亲属可代无手机的老人或残障人士 (OKU) 求助，并逐户确认安全登船，避免误报已获救。',
    drillHeading: '演练对比与测试场景',
    drillSub: '与传统纸笔电话演练对比地点确认速度、重复派船和误关个案情况。',
    adminProtectedTitle: '管理员调度已锁定',
    adminProtectedDesc:
      '请将演示账号切换为“救援管理员 (Admin)”以查看并管理全部船只、个案和物资。',
    switchToAdminBtn: '切换至救援管理员 (Admin)',
    adminConsoleTitle: '管理员调度与求助个案',
    adminConsoleSub: '确认接送地点、每艘船只分配一个目的地，并更新救灾中心与电力状态。',
    footerDemoNote: '仅限演示数据 · 地图 © OpenStreetMap contributors · 不会拨打真实 999',
    menuLabel: '菜单',
    locateMeLabel: '定位',
    layersLabel: '图层',
    layerOutages: '停电区域',
    layerWaterLevels: '水位监测',
    layerTerrain: '低洼地形',
    evacuationAssistanceTitle: '疏散协助需求',
    dangerQuestion: '受困者目前面临什么危险？',
    helpNeededQuestion: '他们需要什么协助才能到达接送点或登上救援船？',
    notSureOption: '不确定',
    noDocNeededNote:
      '无需上传 OKU 卡、身份证或医疗证明。勾选协助仅用于提示船队准备器材或沟通方式，不会自动提高派船优先级。',
    confirmPriorityBtn: '确认优先级',
    priorityReasonPlaceholder: '简短原因（如水位上升 / 氧气机电量低）',
    urgentLabel: '紧急',
    reportSourceLabel: '求助来源',
    lastContactLabel: '最后联系',
    currentDangerLabel: '当前危险',
    abilityToEvacuateLabel: '自救撤离能力',
    assignedCrewLabel: '已派船队',
    myRescueDetailsBtn: '详情',
  },
};

export function formatBoatStatus(lang: LanguageCode, status: BoatStatus): string {
  const map: Record<LanguageCode, Record<BoatStatus, string>> = {
    en: {
      available: 'Available',
      preparing: 'Preparing',
      on_the_way: 'On the way',
      arrived: 'Arrived',
    },
    bm: {
      available: 'Tersedia',
      preparing: 'Bersiap',
      on_the_way: 'Dalam perjalanan',
      arrived: 'Sudah tiba',
    },
    cn: {
      available: '待命中',
      preparing: '准备中',
      on_the_way: '正前往',
      arrived: '已抵达',
    },
  };
  return map[lang][status];
}

export function formatCaseStatus(lang: LanguageCode, status: CaseStatus): string {
  const map: Record<LanguageCode, Record<CaseStatus, string>> = {
    en: {
      unverified: 'Needs location check',
      welfare_check: 'Checking location',
      confirmed: 'Spot confirmed · Waiting for boat',
      assigned: 'Boat assigned',
      boat_arrived: 'Boat arrived · Waiting to board',
      picked_up: 'Person picked up',
    },
    bm: {
      unverified: 'Lokasi belum disahkan',
      welfare_check: 'Sedang semak lokasi',
      confirmed: 'Lokasi disahkan · Tunggu bot',
      assigned: 'Bot ditugaskan',
      boat_arrived: 'Bot tiba · Tunggu naik bot',
      picked_up: 'Mangsa telah diambil',
    },
    cn: {
      unverified: '地点待核实',
      welfare_check: '正在核实位置',
      confirmed: '地点已确认 · 等待派船',
      assigned: '已派船前往',
      boat_arrived: '船只已抵达 · 等待登船',
      picked_up: '已确认接走',
    },
  };
  return map[lang][status];
}

export function formatBoatSummary(
  lang: LanguageCode,
  total: number,
  onTheWay: number,
  preparing: number,
  arrived: number
): string {
  if (total === 0) return TRANSLATIONS[lang].waitingForBoat;

  if (lang === 'bm') {
    const parts = [`${total} bot ditugaskan`];
    if (onTheWay > 0) parts.push(`${onTheWay} dalam perjalanan`);
    if (preparing > 0) parts.push(`${preparing} bersiap`);
    if (arrived > 0) parts.push(`${arrived} sudah tiba`);
    return parts.join(' · ');
  }

  if (lang === 'cn') {
    const parts = [`已分配 ${total} 艘船`];
    if (onTheWay > 0) parts.push(`${onTheWay} 艘正前往`);
    if (preparing > 0) parts.push(`${preparing} 艘准备中`);
    if (arrived > 0) parts.push(`${arrived} 艘已抵达`);
    return parts.join(' · ');
  }

  const boatWord = total === 1 ? 'boat' : 'boats';
  const parts = [`${total} ${boatWord} assigned`];
  if (onTheWay > 0) parts.push(`${onTheWay} on the way`);
  if (preparing > 0) parts.push(`${preparing} preparing`);
  if (arrived > 0) parts.push(`${arrived} arrived`);
  return parts.join(' · ');
}

export function getAccountLabel(lang: LanguageCode, account: DemoAccountId): string {
  const t = TRANSLATIONS[lang];
  if (account === 'guest') return t.accountGuest;
  if (account === 'resident') return t.accountUser;
  return t.accountAdmin;
}
