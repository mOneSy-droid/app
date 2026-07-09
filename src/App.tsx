import React, { useState, useEffect, useRef } from 'react';
import AdminPanel from './components/AdminPanel';
import ConsultantDashboard from './components/ConsultantDashboard';
import logoImg from './assets/images/1e1b7427-be65-4259-9138-0c35a07d43ef_removalai_preview.png';
import { 
  Home, 
  GraduationCap, 
  Bot, 
  FileText, 
  User, 
  Send, 
  Upload, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Camera, 
  Sparkles, 
  Phone, 
  DollarSign, 
  Award, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  LogOut,
  Bell,
  Menu,
  X,
  FileDown,
  RefreshCw,
  Bookmark
} from 'lucide-react';

// Design Token Colors
// Navy: var(--bg-shell-2)
// Gold: #D6B174
// Gold Hover: #B99056
// Soft BG: #F7F9FA
// Border: #E5E8EB
// Primary Text: #212630
// Muted Text: #6A727D

interface University {
  id: string;
  name: string;
  nameRu?: string;
  country: string;
  logo: string;
  budget: number;
  ielts: number;
  gpa: number;
  grantInfo: string;
  grantInfoRu?: string;
  programs: string[];
  programsRu?: string[];
  description: string;
  descriptionRu?: string;
}

interface Application {
  id: string;
  universityId: string;
  universityName: string;
  universityCountry?: string;
  program: string;
  status: '🟡 Ko\'rib chiqilyapti' | '🟢 Tasdiqlangan / Qabul qilingan' | '🔴 Rad etilgan';
  date: string;
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
  contactEmail?: string;
  contactPhone?: string;
  history: { status: string; date: string; note: string }[];
  documents: { name: string; type: string; status: string; url?: string }[];
}

interface Country {
  id: string;
  name: string;
  nameRu?: string;
  flag: string;
  coverImage?: string;
}

interface Faculty {
  id: string;
  universityId: string;
  name: string;
  nameRu?: string;
  description?: string;
  descriptionRu?: string;
}

interface Promotion {
  id: string;
  text: string;
  textRu?: string;
  endDate: string;
  active: boolean;
}

interface UserProfile {
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  budget: number | null;
  ielts_score: number | null;
  has_ielts: boolean | null;
  gpa: number | null;
  has_gpa: boolean | null;
  onboarding_completed: boolean;
  avatarUrl?: string;
  telegram_chat_id?: string;
  last_login_ip?: string;
  role?: 'student' | 'admin' | 'consultant';
}

const translations = {
  uz: {
    home: 'Bosh sahifa',
    universities: 'Davlatlar',
    ai: 'AI Consultant',
    applications: 'Mening arizalarim',
    profile: 'Profil',
    theme: 'Tema',
    language: 'Til',
    light: 'Och',
    dark: 'Qorongʻi',
    uzbek: 'Oʻzbekcha',
    russian: 'Ruscha',
    downloadZip: 'ZIP yuklab olish',
    promotions: 'Promo takliflar',
    downloadSuccess: 'ZIP fayl muvaffaqiyatli yuklandi',
    downloadError: 'ZIP yuklab bo‘lmadi',
    welcome: 'Xush kelibsiz',
    welcomeTitle: 'Salom, {name}!',
    welcomeDescription: 'Sizning profilingiz bo\'yicha eng yaxshi imkoniyatlar tahlil qilindi. Bugungi universitet va grant tavsiyalaringiz tayyor.',
    viewCountries: 'Davlatlarni ko\'rish',
    chooseCountryPrompt: 'Qiziqtirgan davlatni tanlang — o\'sha davlatdagi universitetlar ko\'rsatiladi',
    countryCardUniversities: 'Universitetlar',
    noResults: 'Natija topilmadi',
    adjustFilters: 'Qidiruv parametrlarini o\'zgartiring',
    premiumAiTitle: 'Premium AI Konsultant',
    premiumAiSubtitle: 'Profil ma\'lumotlariga asoslangan real javoblar',
    startConversation: 'Muloqotni boshlang',
    aiPromptDescription: 'Sizga mos universitetlarni topish, hujjatlar yaroqliligini tekshirish yoki ariza topshirish bo\'yicha har qanday savolingizni bering.',
    sendMessagePlaceholder: 'Savolingizni yozing...',
    quickQuestion1: '🎓 Menga qaysi mos?',
    quickQuestion2: '📄 Hujjatlarim yetarlimi?',
    quickQuestion3: '⏳ Arizam holati qanday?',
    applicationMonitoring: 'Hujjat topshirish monitoringi',
    applicationMonitoringDescription: 'Arizalaringiz statusi real vaqtda yangilanadi',
    newApplication: '+ Yangi Ariza',
    noApplicationsYet: 'Arizalar mavjud emas',
    applyFirstApp: 'Sizda hali topshirilgan arizalar mavjud emas. Universitetlardan birini tanlang va birinchi arizangizni boshlang!',
    personalDetails: 'Shaxsiy Ma\'lumotlarim',
    personalDetailsDescription: 'Profilingizni to\'ldirib, o\'zingizga mos ta\'lim va grantlarni aniqlashtiring',
    profileAndBudgetMetrics: 'Ta\'lim va Byudjet o\'lchovlari',
    uploadDocuments: 'Hujjat yuklash moduli',
    selectFile: 'Fayl tanlang',
    pdfOrImage: 'PDF yoki Rasm (Maks 15MB)',
    captureCamera: 'Kamera orqali rasmga olish',
    uploadingDocument: 'Hujjat serverga yuklanmoqda...',
    documentsMy: 'Hujjatlarim',
    documentStatusApproved: 'Tasdiqlangan',
    notificationsSettings: 'Bildirishnomalar Sozlamalari',
    enablePush: 'Yoqish',
    telegramAlerts: 'Telegram orqali ogohlantirish',
    documentType: 'Hujjat turi',
    passportCopy: 'Pasport nushasi',
    ieltsCertificate: 'IELTS / TOEFL',
    diplomaTranscript: 'Diplom va ilovasi',
    recommendationLetter: 'Tavsiyanoma (Recommendation)',
    resume: 'Resume / CV',
    noBudget: 'Bepul',
    back: '← Orqaga',
    submitApplication: '✓ Ariza Yuborish',
    submitting: 'Yuborilmoqda...',
    saved: 'Saqlangan',
    save: 'Saqlab Qo\'yish',
    universityAbout: 'Universitet Haqida',
    programsAndMajors: 'Dasturlar & Yo\'nalishlar',
    faculties: 'Fakultetlar',
    applyStepTitle: 'Ariza topshirish',
    applyStepDescription: 'Quyidagi yo\'nalishlardan birini tanlang',
    educationMajor: 'Ta\'lim yo\'nalishi',
    parentInfo: 'Ota-ona ma\'lumotlari',
    contactInfo: 'Aloqa ma\'lumotlari',
    documents: 'Hujjatlar',
    choose: 'Tanlang',
    requiredDirection: 'Davom etish uchun yo\'nalish tanlang',
    saveData: 'Ma\'lumotlarni saqlash',
    countryListHeading: 'Davlatlar',
    editProfile: 'Profil ma\'lumotlari tahriri',
    profileHeading: 'Profil ma\'lumotlari tahriri',
    profileHeadingDescription: 'Profilingizni to\'ldirib, o\'zingizga mos ta\'lim va grantlarni aniqlashtiring',
    viewMore: 'Ko\'proq',
    countryCardDescription: 'Qiziqtirgan davlatni tanlang — o\'sha davlatdagi universitetlar ko\'rsatiladi',
    universityCountLabel: 'Universitetlar',
    statusHistoryTitle: 'Ariza Tarixi',
    documentsTitle: 'Hujjatlar',
    documentsApprovedLabel: 'Tasdiqlangan',
    pushStatusLabel: 'Status o\'zgarishi (Web Push)',
    botLabel: 'Bot',
    noDocumentsUploaded: 'Hujjatlar hali yuklanmagan',
    uploadFile: 'Fayl tanlang',
    fileNotSelected: 'Tanlang',
    profileContext: 'Profil konteksti:',
    premiumAiHeader: 'Premium AI Konsultant',
    profileRealAnswers: 'Profil ma\'lumotlariga asoslangan real javoblar',
    clearChatTooltip: 'Suhbatni tozalash',
    applySectionTitle: 'Ariza topshirish',
    applySectionSubtitle: 'Quyidagi yo\'nalishlardan birini tanlang',
    parentDetails: 'Ota-ona ma\'lumotlari',
    contactDetails: 'Aloqa ma\'lumotlari',
    documentLabels: 'Hujjatlar',
    backButton: '← Orqaga',
    submitAppButton: 'Ariza Yuborish',
    savedLabel: 'Saqlangan',
    saveBookmark: 'Saqlab Qo\'yish',
    submitAppAction: 'Ariza topshirish',
    studentProfileTitle: 'Talaba profili va hujjatlari',
    emptyApplicationsTitle: 'Arizalar mavjud emas',
    emptyApplicationsDescription: 'Sizda hali topshirilgan arizalar mavjud emas. Universitetlardan birini tanlang va birinchi arizangizni boshlang!',
    noApplicationsCaption: 'Hozircha ariza topshirilmagan.',
    requiredFieldMessage: 'Davom etish uchun yo\'nalish tanlang',
    uploaderLabel: 'Fayl tanlang',
    detailsSaved: 'Ma\'lumotlar saqlandi',
    applicationGoal: 'Ariza topshirish',
    parentPhonePlaceholder: 'Otasining telefoni',
    emailPlaceholder: 'Email manzil',
    phonePlaceholder: 'Telefon raqamingiz',
    linkLabelBot: 'Bot',
    downloadButtonLabel: 'ZIP yuklab olish',
    unreadApplications: 'O\'qilmagan arizalar',
    approveStatus: 'Tasdiqlangan',
    rejectStatus: 'Rad etilgan',
    pendingStatus: 'Kutilmoqda',
    acceptedStatus: 'Qabul qilingan',
    rejectedStatus: 'Rad etilgan',
    applicationDateLabel: 'Topshirilgan Sana',
    statusTagAccepted: 'Qabul qilingan',
    statusTagRejected: 'Rad etilgan',
    noApplicationsCardTitle: 'Arizalar mavjud emas',
    noApplicationsCardDescription: 'Sizda hali topshirilgan arizalar mavjud emas.',
    universityLearningCost: 'Yillik Ta\'lim Narxi',
    grantDiscountsLabel: 'Grant va Chegirmalar',
    ieltsRequirementLabel: 'IELTS Talabi',
    gpaRequirementLabel: 'GPA O\'rtacha Baho Talabi',
    chooseMajorLabel: 'Ta\'lim yo\'nalishi',
    usernameLabel: 'Foydalanuvchi nomi',
    phoneLabel: 'Telefon raqami',
    firstNameLabel: 'Ismingiz',
    lastNameLabel: 'Familiyangiz',
    budgetLabelPlaceholder: 'Yillik byudjetingiz',
    ieltsPlaceholder: 'Masalan: 7.5',
    gpaPlaceholder: 'Masalan: 4.8',
    documentLabor: 'Hujjatlar',
    saveProfileButton: 'Ma\'lumotlarni saqlash',
    initialized: 'Ishga tushirildi',
    logout: 'Chiqish',
    loggedInAs: 'Kirish qilingan',
    viewUniversities: 'Universitetlarni ko\'rish',
    notificationsViaTelegram: 'Telegram ogohlantirishlari',
    aiConsultation: 'AI Konsultatsiya',
    newsAndInfo: 'Yangiliklar va Foydali Ma\'lumotlar',
    applicationStatus: 'Arizalarim holati',
    noApplications: 'Hozircha ariza topshirilmagan.',
    allApplications: 'Barcha arizalarim',
    aiAdvisor: 'AI Maslahatchi',
    offlineBanner: 'Oflayn rejim — Ba\'zi ma\'lumotlar eski yoki o\'zgarishsiz ko\'rinishi mumkin. AI chat ulanish talab qiladi.',
    profileMetrics: 'Profil O\'lchovlari',
    ieltsLabel: 'IELTS:',
    gpaLabel: 'GPA:',
    budgetLabel: 'Yillik Byudjet:',
    grantTag: 'Grant',
    guideTag: 'Qo\'llanma',
    newsTag: 'Yangilik',
    infoTag: 'Ma\'lumot',
    promotionLabel: 'Promo',
    universityCountries: 'Qo\'llab-quvvatlanadigan davlatlar',
    searchPlaceholder: 'Universitet yoki dastur nomini qidiring...',
    changeLanguage: 'Tilni o\'zgartiring',
    changeTheme: 'Tema',
    chooseLanguage: 'Til',
    tree: 'Daraja',
  },
  ru: {
    home: 'Главная',
    universities: 'Страны',
    ai: 'AI Консультант',
    applications: 'Мои заявки',
    profile: 'Профиль',
    theme: 'Тема',
    language: 'Язык',
    light: 'Светлая',
    dark: 'Тёмная',
    uzbek: 'Узбекский',
    russian: 'Русский',
    downloadZip: 'Скачать ZIP',
    promotions: 'Акции',
    downloadSuccess: 'ZIP успешно скачан',
    downloadError: 'Ошибка загрузки ZIP',
    welcome: 'Добро пожаловать',
    welcomeTitle: 'Привет, {name}!',
    welcomeDescription: 'Мы проанализировали лучшие возможности на основе вашего профиля. Сегодняшние рекомендации по университетам и стипендиям готовы.',
    viewCountries: 'Посмотреть страны',
    chooseCountryPrompt: 'Выберите страну, чтобы увидеть университеты в ней',
    countryCardUniversities: 'Университеты',
    noResults: 'Результатов не найдено',
    adjustFilters: 'Измените параметры поиска',
    premiumAiTitle: 'Премиальный AI Консультант',
    premiumAiSubtitle: 'Реальные ответы на основе вашего профиля',
    startConversation: 'Начать разговор',
    aiPromptDescription: 'Задайте любой вопрос о поиске университетов, готовности документов или статусе заявки.',
    sendMessagePlaceholder: 'Введите ваш вопрос...',
    quickQuestion1: '🎓 Какой университет мне подходит?',
    quickQuestion2: '📄 Достаточно ли моих документов?',
    quickQuestion3: '⏳ Какой статус моей заявки?',
    applicationMonitoring: 'Мониторинг заявок',
    applicationMonitoringDescription: 'Статусы заявок обновляются в реальном времени',
    newApplication: '+ Новая заявка',
    noApplicationsYet: 'Заявок не найдено',
    applyFirstApp: 'У вас пока нет отправленных заявок. Выберите университет и начните первую заявку!',
    personalDetails: 'Мои персональные данные',
    personalDetailsDescription: 'Заполните профиль для уточнения вариантов обучения и стипендий',
    profileAndBudgetMetrics: 'Образование и бюджет',
    uploadDocuments: 'Модуль загрузки документов',
    selectFile: 'Выбрать файл',
    pdfOrImage: 'PDF или изображение (макс 15MB)',
    captureCamera: 'Сделать фото с камеры',
    uploadingDocument: 'Загрузка документа на сервер...',
    documentsMy: 'Мои документы',
    documentStatusApproved: 'Одобрено',
    notificationsSettings: 'Настройки уведомлений',
    enablePush: 'Включить',
    telegramAlerts: 'Уведомления в Telegram',
    documentType: 'Тип документа',
    passportCopy: 'Копия паспорта',
    ieltsCertificate: 'IELTS / TOEFL',
    diplomaTranscript: 'Диплом и приложение',
    recommendationLetter: 'Рекомендательное письмо',
    resume: 'Резюме / CV',
    noBudget: 'Бесплатно',
    back: '← Назад',
    submitApplication: '✓ Отправить заявку',
    submitting: 'Отправка...',
    saved: 'Сохранено',
    save: 'Сохранить',
    universityAbout: 'О университете',
    programsAndMajors: 'Программы и направления',
    faculties: 'Факультеты',
    applyStepTitle: 'Подача заявки',
    applyStepDescription: 'Выберите одно из направлений ниже',
    educationMajor: 'Направление обучения',
    parentInfo: 'Информация о родителях',
    contactInfo: 'Контактная информация',
    documents: 'Документы',
    choose: 'Выбрать',
    requiredDirection: 'Выберите направление, чтобы продолжить',
    saveData: 'Сохранить данные',
    countryListHeading: 'Страны',
    editProfile: 'Редактирование профиля',
    profileHeading: 'Редактор профиля',
    profileHeadingDescription: 'Заполните профиль, чтобы уточнить совпадения',
    viewMore: 'Смотреть больше',
    countryCardDescription: 'Выберите страну, чтобы изучить университеты',
    universityCountLabel: 'Университеты',
    statusHistoryTitle: 'История заявки',
    documentsTitle: 'Документы',
    documentsApprovedLabel: 'Одобрено',
    pushStatusLabel: 'Изменения статуса (Web Push)',
    botLabel: 'Бот',
    noDocumentsUploaded: 'Документы ещё не загружены',
    uploadFile: 'Выберите файл',
    fileNotSelected: 'Выбрать',
    profileContext: 'Контекст профиля:',
    premiumAiHeader: 'Премиальный AI Консультант',
    profileRealAnswers: 'Реальные ответы на основе данных профиля',
    clearChatTooltip: 'Очистить историю чата',
    applySectionTitle: 'Подача заявки',
    applySectionSubtitle: 'Выберите одно из направлений',
    parentDetails: 'Данные родителей',
    contactDetails: 'Контактные данные',
    documentLabels: 'Документы',
    backButton: '← Назад',
    submitAppButton: 'Отправить заявку',
    savedLabel: 'Сохранено',
    saveBookmark: 'Сохранить',
    submitAppAction: 'Подать заявку',
    studentProfileTitle: 'Профиль студента и документы',
    emptyApplicationsTitle: 'Заявок пока нет',
    emptyApplicationsDescription: 'Выберите университет и начните первую заявку!',
    noApplicationsCaption: 'Заявок пока нет.',
    requiredFieldMessage: 'Выберите направление, чтобы продолжить',
    uploaderLabel: 'Выберите файл',
    detailsSaved: 'Информация сохранена',
    applicationGoal: 'Подать заявку',
    parentPhonePlaceholder: 'Телефон родителя',
    emailPlaceholder: 'Адрес электронной почты',
    phonePlaceholder: 'Номер телефона',
    linkLabelBot: 'Бот',
    downloadButtonLabel: 'Скачать ZIP',
    unreadApplications: 'Непрочитанные заявки',
    approveStatus: 'Одобрено',
    rejectStatus: 'Отклонено',
    pendingStatus: 'В ожидании',
    acceptedStatus: 'Принято',
    rejectedStatus: 'Отклонено',
    applicationDateLabel: 'Дата подачи заявки',
    statusTagAccepted: 'Принято',
    statusTagRejected: 'Отклонено',
    noApplicationsCardTitle: 'Заявки не найдены',
    noApplicationsCardDescription: 'Вы пока не отправляли заявки.',
    universityLearningCost: 'Годовая стоимость обучения',
    grantDiscountsLabel: 'Гранты и стипендии',
    ieltsRequirementLabel: 'Требование IELTS',
    gpaRequirementLabel: 'Требование среднего балла GPA',
    chooseMajorLabel: 'Направление обучения',
    usernameLabel: 'Имя пользователя',
    phoneLabel: 'Номер телефона',
    firstNameLabel: 'Имя',
    lastNameLabel: 'Фамилия',
    budgetLabelPlaceholder: 'Ваш годовой бюджет',
    ieltsPlaceholder: 'Например: 7.5',
    gpaPlaceholder: 'Например: 4.8',
    documentLabor: 'Документы',
    saveProfileButton: 'Сохранить данные',
    initialized: 'Инициализировано',
    logout: 'Выйти',
    loggedInAs: 'Вошли как',
    viewUniversities: 'Посмотреть университеты',
    notificationsViaTelegram: 'Уведомления Telegram',
    aiConsultation: 'AI Консультация',
    newsAndInfo: 'Новости и полезная информация',
    applicationStatus: 'Статус заявок',
    noApplications: 'Заявок пока нет.',
    allApplications: 'Все заявки',
    aiAdvisor: 'AI Советник',
    offlineBanner: 'Офлайн режим — некоторые данные могут быть устаревшими или не обновлены. AI чат требует подключения.',
    profileMetrics: 'Показатели профиля',
    ieltsLabel: 'IELTS:',
    gpaLabel: 'GPA:',
    budgetLabel: 'Годовой бюджет:',
    grantTag: 'Грант',
    guideTag: 'Гид',
    newsTag: 'Новость',
    infoTag: 'Инфо',
    promotionLabel: 'Промо',
    universityCountries: 'Поддерживаемые страны',
    searchPlaceholder: 'Поиск университета или программы...',
    changeLanguage: 'Сменить язык',
    changeTheme: 'Тема',
    chooseLanguage: 'Язык',
    tree: 'Уровень',
  }
};

interface ChatMessage {
  role: 'user' | 'model';
  message: string;
  timestamp: string;
}

export default function App() {
  // Session State
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('eduvisa_token'));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Navigation & UI States
  // Har bir tab uchun alohida haqiqiy URL manzil (path).
  const TAB_PATHS: Record<'home' | 'universities' | 'ai' | 'applications' | 'profile', string> = {
    home: '/',
    universities: '/universities',
    ai: '/ai-consultant',
    applications: '/applications',
    profile: '/profile',
  };
  const PATH_TO_TAB: Record<string, 'home' | 'universities' | 'ai' | 'applications' | 'profile'> = {
    '/': 'home',
    '/universities': 'universities',
    '/ai-consultant': 'ai',
    '/applications': 'applications',
    '/profile': 'profile',
  };
  const [activeTab, setActiveTab] = useState<'home' | 'universities' | 'ai' | 'applications' | 'profile'>(
    () => PATH_TO_TAB[window.location.pathname] || 'home'
  );
  const [onboardingStep, setOnboardingStep] = useState<number>(0); // Chat onboarding steps
  const [onboardingAnswers, setOnboardingAnswers] = useState({
    budget: '',
    ielts: '',
    gpa: ''
  });

  // Data States
  const [allUniversities, setAllUniversities] = useState<University[]>([]);
  const [recommendedUniversities, setRecommendedUniversities] = useState<University[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [locale, setLocale] = useState<'uz' | 'ru'>('uz');
  const [notifications, setNotifications] = useState<string[]>([
    "Tabriklaymiz! Yonsei University arizangiz muvaffaqiyatli qabul qilindi.",
    "Hujjatlaringiz (Pasport) muvaffaqiyatli tekshirildi.",
    "Tizimga yangi Germaniya grantlari qo'shildi! AI Consultant bilan gaplashib ko'ring."
  ]);

  // Modals & Temp States
  const [selectedUni, setSelectedUni] = useState<University | null>(null);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [applyProgram, setApplyProgram] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadType, setUploadType] = useState<string>('Pasport');

  // Ariza (application) bilan birga to'ldiriladigan qo'shimcha ma'lumotlar va hujjatlar
  const [applyFatherName, setApplyFatherName] = useState<string>('');
  const [applyFatherPhone, setApplyFatherPhone] = useState<string>('');
  const [applyMotherName, setApplyMotherName] = useState<string>('');
  const [applyMotherPhone, setApplyMotherPhone] = useState<string>('');
  const [applyEmail, setApplyEmail] = useState<string>('');
  const [applyContactPhone, setApplyContactPhone] = useState<string>('');
  const [applyPassportFile, setApplyPassportFile] = useState<File | null>(null);
  const [applyPhoto3x4File, setApplyPhoto3x4File] = useState<File | null>(null);
  const [applyBirthCertFile, setApplyBirthCertFile] = useState<File | null>(null);
  const [applyIdCardFile, setApplyIdCardFile] = useState<File | null>(null);
  const [applyForeignPassportFile, setApplyForeignPassportFile] = useState<File | null>(null);
  const [applyAttestatFile, setApplyAttestatFile] = useState<File | null>(null);
  const [isSubmittingApp, setIsSubmittingApp] = useState<boolean>(false);

  const resetApplyForm = () => {
    setApplyProgram('');
    setApplyFatherName('');
    setApplyFatherPhone('');
    setApplyMotherName('');
    setApplyMotherPhone('');
    setApplyEmail('');
    setApplyContactPhone('');
    setApplyPassportFile(null);
    setApplyPhoto3x4File(null);
    setApplyBirthCertFile(null);
    setApplyIdCardFile(null);
    setApplyForeignPassportFile(null);
    setApplyAttestatFile(null);
  };
  
  // Search & Filter
  const [uniSearch, setUniSearch] = useState<string>('');
  const [uniFilterCountry, setUniFilterCountry] = useState<string>('Barchasi');
  const [uniFilterMatch, setUniFilterMatch] = useState<boolean>(false);

  // Countries view state - null means show all countries list
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  // Navigation helper: tab almashganda brauzer manzilini (URL) ham shu tabga
  // mos ravishda o'zgartiradi - shunday qilib har bir bo'lim o'zining alohida
  // haqiqiy URL manziliga ega bo'ladi (masalan /universities, /applications)
  // va uni to'g'ridan-to'g'ri boshqa tabda ochish yoki qayta yuklash mumkin.
  const navigateTab = (tab: 'home' | 'universities' | 'ai' | 'applications' | 'profile') => {
    const targetPath = TAB_PATHS[tab];
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab }, '', targetPath);
    }
    setActiveTab(tab);
    if (tab === 'universities') setSelectedCountry(null);
  };

  // Brauzerning "orqaga/oldinga" tugmalari bosilganda joriy URL manziliga
  // qarab to'g'ri tabni ko'rsatish uchun.
  useEffect(() => {
    const onPopState = () => {
      const tab = PATH_TO_TAB[window.location.pathname] || 'home';
      setActiveTab(tab);
      if (tab === 'universities') setSelectedCountry(null);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Auth Inputs
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [resetUsername, setResetUsername] = useState<string>('');
  const [resetEmail, setResetEmail] = useState<string>('');
  const [resetCode, setResetCode] = useState<string>('');
  const [resetNewPassword, setResetNewPassword] = useState<string>('');
  const [resetStage, setResetStage] = useState<'request' | 'verify' | 'confirm'>('request');
  
  const [regFirstName, setRegFirstName] = useState<string>('');
  const [regLastName, setRegLastName] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  
  const [deepLinkCreated, setDeepLinkCreated] = useState<boolean>(false);
  const [deepLinkUrl, setDeepLinkUrl] = useState<string>('');

  // Chat inputs
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Profile Edit
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editIelts, setEditIelts] = useState('');
  const [editGpa, setEditGpa] = useState('');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Toast notification
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  // Fetch API wrapper helper
  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };
    
    // For normal Content-Type-less bodies (e.g. FormData) don't enforce json headers
    if (options.body instanceof FormData) {
      delete (headers as any)['Content-Type'];
    }

    const res = await fetch(endpoint, {
      ...options,
      headers
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Kutilmagan xatolik yuz berdi' }));
      throw new Error(errData.error || `Server xatoligi: ${res.status}`);
    }

    return res.json();
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const openSignedFile = async (url: string) => {
    if (!url) return;
    const path = url.split('?')[0];
    const match = path.match(/\/api\/(documents\/file|application-documents\/file|clients\/receipt)\/([^/]+)/);
    if (!match) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    const [, kind, resourceId] = match;
    const endpoint = kind === 'documents/file'
      ? `/api/file-access/documents/${resourceId}`
      : kind === 'application-documents/file'
        ? `/api/file-access/application-documents/${resourceId}`
        : `/api/file-access/clients/receipt/${resourceId}`;

    try {
      const data = await apiFetch(endpoint);
      if (data?.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error('Signed file access error:', err);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const t = translations[locale];
  const getLocalizedText = (base: string, ru?: string | null) => locale === 'ru' && ru ? ru : base;
  const getLocalizedPrograms = (basePrograms: string[], ruPrograms?: string[] | null) =>
    locale === 'ru' && ruPrograms && ruPrograms.length > 0 ? ruPrograms : basePrograms;
  const getLocalizedCountryName = (countryRecord: Country | undefined) =>
    locale === 'ru' && countryRecord?.nameRu ? countryRecord.nameRu : countryRecord?.name || '';
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const localeOrder: Array<'uz' | 'ru'> = ['uz', 'ru'];
  const toggleLocale = () => {
    const nextIndex = (localeOrder.indexOf(locale) + 1) % localeOrder.length;
    setLocale(localeOrder[nextIndex]);
  };

  const handleDownloadApplicationZip = async (appId: string) => {
    if (!token) {
      showToast('Avtorizatsiya talab qilinadi', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/applications/${appId}/zip`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: t.downloadError }));
        throw new Error(err.error || t.downloadError);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `eduvisa_application_${appId}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast(t.downloadSuccess, 'success');
    } catch (err: any) {
      showToast(err.message || t.downloadError, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Auth bootstrap
  useEffect(() => {
    if (token) {
      setLoading(true);
      apiFetch('/api/profile')
        .then(profile => {
          setUser(profile);
          // Set edit fields
          setEditFirstName(profile.firstName || '');
          setEditLastName(profile.lastName || '');
          setEditPhone(profile.phone || '');
          setEditBudget(profile.budget ? String(profile.budget) : '');
          setEditIelts(profile.ielts_score ? String(profile.ielts_score) : '');
          setEditGpa(profile.gpa ? String(profile.gpa) : '');

          if (profile.onboarding_completed && profile.role !== 'admin') {
            loadApplicationData();
          }
        })
        .catch(err => {
          console.error(err);
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('eduvisa_theme') as 'light' | 'dark' | null;
    const savedLocale = localStorage.getItem('eduvisa_locale') as 'uz' | 'ru' | null;
    if (savedTheme) setTheme(savedTheme);
    if (savedLocale) setLocale(savedLocale);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('eduvisa_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('eduvisa_locale', locale);
  }, [locale]);

  const refreshPublicContent = () => {
    apiFetch('/api/countries').then(setCountries).catch(console.error);
    apiFetch('/api/faculties').then(setFaculties).catch(console.error);
    apiFetch('/api/promotions').then(setPromotions).catch(console.error);
  };

  useEffect(() => {
    refreshPublicContent();
  }, []);

  // Listen for faculty and country updates from admin UI and reload shared content for users.
  // This also works across browser tabs/windows via localStorage-based broadcast.
  useEffect(() => {
    const handleFacultiesUpdate = () => {
      apiFetch('/api/faculties').then(setFaculties).catch(console.error);
    };
    const handleCountriesUpdate = () => {
      refreshPublicContent();
    };
    const handleStorageUpdate = (event: StorageEvent) => {
      if (event.key === 'eduvisa:countries:updated') {
        refreshPublicContent();
      }
    };

    window.addEventListener('eduvisa:faculties:updated', handleFacultiesUpdate as EventListener);
    window.addEventListener('eduvisa:countries:updated', handleCountriesUpdate as EventListener);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      window.removeEventListener('eduvisa:faculties:updated', handleFacultiesUpdate as EventListener);
      window.removeEventListener('eduvisa:countries:updated', handleCountriesUpdate as EventListener);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  // Universitet tafsilotlari ochilganda shu universitetning fakultetlarini
  // to'g'ridan-to'g'ri serverdan qayta olib kelamiz. Bu muhim, chunki admin va
  // talaba odatda ikki alohida brauzer sessiyasida ishlaydi - shuning uchun
  // faqat window custom event orqali yangilanish yetarli emas edi.
  const openUniversityDetail = (uni: University) => {
    setSelectedUni(uni);
    apiFetch(`/api/faculties?universityId=${encodeURIComponent(uni.id)}`)
      .then((freshFaculties: Faculty[]) => {
        setFaculties(prev => {
          const others = prev.filter(f => f.universityId !== uni.id);
          return [...others, ...freshFaculties];
        });
      })
      .catch(console.error);
  };

  // Load remaining PWA content
  const loadApplicationData = async () => {
    try {
      const [unis, recs, apps, docsList, favs, chats] = await Promise.all([
        apiFetch('/api/universities'),
        apiFetch('/api/universities/recommended'),
        apiFetch('/api/applications'),
        apiFetch('/api/documents'),
        apiFetch('/api/interests'),
        apiFetch('/api/ai/chat/history')
      ]);

      setAllUniversities(unis);
      setRecommendedUniversities(recs);
      setApplications(apps);
      setDocuments(docsList);
      setBookmarks(favs);
      setChatHistory(chats);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Auto scroll chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, chatLoading]);

  // Registration handler
  const handleRegisterInit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFirstName || !regLastName || !regPhone) {
      showToast('Barcha maydonlarni to\'ldiring', 'error');
      return;
    }

    const normalizedPhone = regPhone.replace(/\D/g, '');
    if (!normalizedPhone) {
      showToast('Telefon raqamni to\'g\'ri kiriting', 'error');
      return;
    }

    try {
      setLoading(true);
      const data = await apiFetch('/api/auth/register-init', {
        method: 'POST',
        body: JSON.stringify({
          firstName: regFirstName,
          lastName: regLastName,
          phone: normalizedPhone.startsWith('+') ? regPhone : `+${normalizedPhone}`,
        })
      });

      if (data.success) {
        setDeepLinkUrl(data.telegramUrl);
        setDeepLinkCreated(true);
        showToast('Hisobingiz tayyor! Telegram botga o\'ting.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUsername) {
      showToast('Username kiritilishi shart', 'error');
      return;
    }

    try {
      setLoading(true);
      const data = await apiFetch('/api/auth/reset-password/request', {
        method: 'POST',
        body: JSON.stringify({
          username: resetUsername,
          email: '',
        })
      });

      if (data.success) {
        showToast(data.message || 'Parolni tiklash uchun Telegram botiga o\'ting.', 'success');
        setResetStage('request');
      }
    } catch (err: any) {
      showToast(err.message || 'Kod yuborishda xatolik yuz berdi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUsername || !resetCode) {
      showToast('Username va kod kiritilishi shart', 'error');
      return;
    }

    try {
      setLoading(true);
      const data = await apiFetch('/api/auth/reset-password/verify', {
        method: 'POST',
        body: JSON.stringify({
          username: resetUsername,
          code: resetCode,
        })
      });

      if (data.success) {
        showToast(data.message || 'Kod tasdiqlandi.', 'success');
        setResetStage('confirm');
      }
    } catch (err: any) {
      showToast(err.message || 'Kodni tekshirishda xatolik yuz berdi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUsername || !resetCode || !resetNewPassword) {
      showToast('Barcha maydonlarni to\'ldiring', 'error');
      return;
    }
    if (resetNewPassword.length < 8) {
      showToast('Parol kamida 8 belgidan iborat bo\'lishi kerak', 'error');
      return;
    }

    try {
      setLoading(true);
      const data = await apiFetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        body: JSON.stringify({
          username: resetUsername,
          code: resetCode,
          newPassword: resetNewPassword,
        })
      });

      if (data.success) {
        showToast(data.message || 'Parol muvaffaqiyatli yangilandi.', 'success');
        setAuthMode('login');
        setResetUsername('');
        setResetEmail('');
        setResetCode('');
        setResetNewPassword('');
        setResetStage('request');
      }
    } catch (err: any) {
      showToast(err.message || 'Parolni tiklash muvaffaqiyatsiz tugadi', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Shared post-login logic — runs after either password login or token-based auto-login succeeds
  const applyLoginSuccess = async (data: any) => {
    localStorage.setItem('eduvisa_token', data.token);
    setToken(data.token);
    setUser(data.user);

    if (data.user.role === 'admin') {
      showToast(`Xush kelibsiz, ${data.user.firstName}!`, 'success');
    } else if (data.user.onboarding_completed) {
      showToast(`Xush kelibsiz, ${data.user.firstName}!`, 'success');
      navigateTab('home');
      // Reload all content
      const [unis, recs, apps, docsList, favs, chats] = await Promise.all([
        apiFetch('/api/universities'),
        apiFetch('/api/universities/recommended'),
        apiFetch('/api/applications'),
        apiFetch('/api/documents'),
        apiFetch('/api/interests'),
        apiFetch('/api/ai/chat/history')
      ]);
      setAllUniversities(unis);
      setRecommendedUniversities(recs);
      setApplications(apps);
      setDocuments(docsList);
      setBookmarks(favs);
      setChatHistory(chats);
    } else {
      setOnboardingStep(1);
      showToast('Iltimos, qisqa AI onboarding so\'rovnomasidan o\'ting', 'info');
    }
  };

  // Shared login logic — used both by the manual login form and by the
  // "avtomatik kirish" (auto-login) button on the Telegram registration screen.
  const performLogin = async (usernameRaw: string, passwordRaw: string) => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: usernameRaw.toLowerCase().trim(),
          password: passwordRaw.trim()
        })
      });

      if (data.success) {
        await applyLoginSuccess(data);
      }
    } catch (err: any) {
      showToast(err.message || 'Username yoki parol noto\'g\'ri', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Telegram bot xabaridagi "Hisobga avtomatik kirish" tugmasi bosilib, saytga
  // ?auto_login=TOKEN bilan qaytilganda shu funksiya token'ni login'ga almashtiradi.
  const performTokenLogin = async (loginToken: string) => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/auth/auto-login', {
        method: 'POST',
        body: JSON.stringify({ token: loginToken })
      });
      if (data.success) {
        await applyLoginSuccess(data);
      }
    } catch (err: any) {
      showToast(err.message || 'Havola muddati o\'tgan yoki noto\'g\'ri', 'error');
    } finally {
      setLoading(false);
      // URL'dan token'ni tozalaymiz, qayta yuklanganda qayta ishlatilmasin
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  };

  // Sahifa birinchi ochilganda URL'da ?auto_login=... bormi tekshiramiz
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loginToken = params.get('auto_login');
    if (loginToken) {
      performTokenLogin(loginToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Form submit handler for the login form (prevents full page submit)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(loginUsername, loginPassword);
    setLoginUsername('');
    setLoginPassword('');
  };


  const handleOpenTelegramBot = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/auth/telegram-bot-url');
      if (data?.telegramUrl) {
        window.location.href = data.telegramUrl;
      } else {
        showToast('Telegram bot havolasi topilmadi', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Telegram botga ulanishda xatolik yuz berdi', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('eduvisa_token');
    setToken(null);
    setUser(null);
    setApplications([]);
    setDocuments([]);
    setBookmarks([]);
    setChatHistory([]);
    setDeepLinkCreated(false);
    setLoginUsername('');
    setLoginPassword('');
    navigateTab('home');
    showToast('Tizimdan muvaffaqiyatli chiqildi', 'info');
  };

  // Handle Onboarding Flow
  const handleOnboardingAnswer = async (answer: string) => {
    if (onboardingStep === 1) {
      setOnboardingAnswers(prev => ({ ...prev, budget: answer }));
      setOnboardingStep(2);
    } else if (onboardingStep === 2) {
      setOnboardingAnswers(prev => ({ ...prev, ielts: answer }));
      setOnboardingStep(3);
    } else if (onboardingStep === 3) {
      // Complete onboarding
      const finalAnswers = { ...onboardingAnswers, gpa: answer };
      setOnboardingAnswers(finalAnswers);
      
      const parsedBudget = finalAnswers.budget.toLowerCase().includes('bilmayman') ? null : parseFloat(finalAnswers.budget.replace(/[^0-9.]/g, ''));
      const parsedIelts = finalAnswers.ielts.toLowerCase().includes('yo') ? null : parseFloat(finalAnswers.ielts);
      const parsedGpa = finalAnswers.gpa.toLowerCase().includes('yo') ? null : parseFloat(finalAnswers.gpa);

      try {
        setLoading(true);
        const data = await apiFetch('/api/profile/onboarding', {
          method: 'POST',
          body: JSON.stringify({
            budget: parsedBudget,
            ielts_score: parsedIelts,
            has_ielts: parsedIelts !== null,
            gpa: parsedGpa,
            has_gpa: parsedGpa !== null
          })
        });

        setUser(data.user);
        showToast('Onboarding muvaffaqiyatli yakunlandi! Sizga mos grantlar tanlandi.', 'success');
        navigateTab('home');
        loadApplicationData();
      } catch (err: any) {
        showToast(err.message || 'Onboarding saqlashda xatolik', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // AI Chat Client handler
  const handleSendMessage = async (e?: React.FormEvent, presetMsg?: string) => {
    if (e) e.preventDefault();
    const textToSend = presetMsg || chatInput;
    if (!textToSend.trim()) return;

    // Add user message to state instantly
    const userMsg: ChatMessage = {
      role: 'user',
      message: textToSend,
      timestamp: new Date().toISOString()
    };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const data = await apiFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: textToSend })
      });

      if (data.success) {
        setChatHistory(prev => [
          ...prev,
          {
            role: 'model',
            message: data.reply,
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } catch (err: any) {
      showToast(err.message || 'AI javob bera olmadi', 'error');
    } finally {
      setChatLoading(false);
    }
  };

  // Document upload simulator or real
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showToast('Fayl o\'lchami 15MB dan oshmasligi kerak', 'error');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', uploadType);

    try {
      const data = await apiFetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });

      if (data.success) {
        setDocuments(prev => [data.document, ...prev]);
        showToast(`${uploadType} muvaffaqiyatli yuklandi va tasdiqlandi!`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Yuklashda xatolik yuz berdi', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Bookmark Toggle
  const toggleBookmark = async (uniId: string) => {
    try {
      const data = await apiFetch('/api/interests', {
        method: 'POST',
        body: JSON.stringify({ universityId: uniId })
      });
      if (data.success) {
        setBookmarks(data.interests);
        showToast(data.saved ? 'Universitet saqlanganlarga qo\'shildi' : 'Universitet olib tashlandi', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Bookmark xatoligi', 'error');
    }
  };

  // Application submission
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUni || !applyProgram) {
      showToast('Dasturni tanlang', 'error');
      return;
    }
    if (!applyFatherName.trim() || !applyFatherPhone.trim() || !applyMotherName.trim() || !applyMotherPhone.trim()) {
      showToast('Ota va ona ma\'lumotlarini to\'liq kiriting', 'error');
      return;
    }
    if (!applyEmail.trim() || !applyContactPhone.trim()) {
      showToast('Email va aloqa telefon raqamini kiriting', 'error');
      return;
    }
    if (!applyPassportFile || !applyPhoto3x4File || !applyBirthCertFile || !applyIdCardFile || !applyForeignPassportFile || !applyAttestatFile) {
      showToast('Barcha hujjatlarni (pasport, 3x4 rasm, metrika, ID karta, zagran pasport, attestat) yuklang', 'error');
      return;
    }

    try {
      setIsSubmittingApp(true);
      const formData = new FormData();
      formData.append('universityId', selectedUni.id);
      formData.append('program', applyProgram);
      formData.append('fatherName', applyFatherName);
      formData.append('fatherPhone', applyFatherPhone);
      formData.append('motherName', applyMotherName);
      formData.append('motherPhone', applyMotherPhone);
      formData.append('contactEmail', applyEmail);
      formData.append('contactPhone', applyContactPhone);
      if (applyPassportFile) formData.append('passport', applyPassportFile);
      if (applyPhoto3x4File) formData.append('photo3x4', applyPhoto3x4File);
      if (applyBirthCertFile) formData.append('birthCert', applyBirthCertFile);
      if (applyIdCardFile) formData.append('idCard', applyIdCardFile);
      if (applyForeignPassportFile) formData.append('foreignPassport', applyForeignPassportFile);
      if (applyAttestatFile) formData.append('attestat', applyAttestatFile);

      const data = await apiFetch('/api/applications', {
        method: 'POST',
        body: formData
      });

      if (data.success) {
        setApplications(prev => [data.application, ...prev]);
        setIsApplying(false);
        setSelectedUni(null);
        resetApplyForm();
        showToast('Arizangiz muvaffaqiyatli topshirildi! Status ko\'rib chiqilyapti.', 'success');
        navigateTab('applications');
      }
    } catch (err: any) {
      showToast(err.message || 'Ariza topshirishda xatolik', 'error');
    } finally {
      setIsSubmittingApp(false);
    }
  };

  // Save Profile Changes
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const data = await apiFetch('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          phone: editPhone,
          budget: editBudget === '' ? null : Number(editBudget),
          ielts_score: editIelts === '' ? null : Number(editIelts),
          gpa: editGpa === '' ? null : Number(editGpa)
        })
      });

      if (data.success) {
        setUser(data.user);
        setProfileSuccessMsg('Profil muvaffaqiyatli saqlandi!');
        setTimeout(() => setProfileSuccessMsg(''), 4000);
        showToast('Profil ma\'lumotlari yangilandi', 'success');
        
        // Reload recommendations
        const recs = await apiFetch('/api/universities/recommended');
        setRecommendedUniversities(recs);
      }
    } catch (err: any) {
      showToast(err.message || 'Saqlashda xatolik', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Clear Chat History
  const clearChatHistory = async () => {
    try {
      await apiFetch('/api/ai/chat/clear', { method: 'POST' });
      setChatHistory([]);
      showToast('Suhbat tarixi tozalandi', 'info');
    } catch (err: any) {
      showToast('Xatolik yuz berdi', 'error');
    }
  };

  // Native camera capture for document upload (mobile PWA)
  const triggerCameraCapture = () => {
    showToast('Kamera funksiyasi ishga tushirildi. Hujjat rasmini yuklang.', 'info');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e: any) => {
      handleFileUpload(e);
    };
    input.click();
  };

  // Real browser push-notification permission request (Notification API)
  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      showToast('Brauzeringiz bildirishnomalarni qo\'llab-quvvatlamaydi', 'error');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        showToast('Bildirishnomalar muvaffaqiyatli faollashtirildi! Kuniga 1-2 muhim yangilik yuboriladi.', 'success');
      } else if (permission === 'denied') {
        showToast('Bildirishnomalarga ruxsat berilmadi. Brauzer sozlamalaridan yoqishingiz mumkin.', 'error');
      } else {
        showToast('Bildirishnomalar so\'rovi bekor qilindi', 'info');
      }
    } catch (err) {
      console.error('Push permission error:', err);
      showToast('Bildirishnomalarni yoqishda xatolik yuz berdi', 'error');
    }
  };

  // Filter list of universities based on inputs
  const filteredUniversities = allUniversities.filter(uni => {
    const localizedName = getLocalizedText(uni.name, uni.nameRu);
    const localizedPrograms = getLocalizedPrograms(uni.programs, uni.programsRu);
    const localizedCountry = getLocalizedCountryName(countries.find(c => c.name === uni.country));

    const matchesSearch = localizedName.toLowerCase().includes(uniSearch.toLowerCase()) ||
                          localizedPrograms.some(p => p.toLowerCase().includes(uniSearch.toLowerCase())) ||
                          localizedCountry.toLowerCase().includes(uniSearch.toLowerCase());
    
    const matchesCountry = uniFilterCountry === 'Barchasi' || uni.country === uniFilterCountry;
    
    const matchesProfile = !uniFilterMatch || !user || (
      (user.budget === null || uni.budget <= user.budget) &&
      (user.ielts_score === null || !user.has_ielts || uni.ielts <= user.ielts_score)
    );

    return matchesSearch && matchesCountry && matchesProfile;
  });

  // Render Splash or Auth
  if (!token) {
    return (
      <div className="min-h-screen bg-[#0B1C2C] flex items-center justify-center p-0 sm:p-4 md:p-8 overflow-y-auto">
        <div className="w-full max-w-5xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row border-0 sm:border border-[#E5E8EB] min-h-screen sm:min-h-[550px] bg-white">
          
          {/* Brand Panel — mobilda ixcham (faqat logo + qisqa sarlavha), desktopda to'liq */}
          <div className="md:w-1/2 bg-[#0B1C2C] px-5 py-6 md:p-12 text-white flex flex-col justify-between relative overflow-hidden shrink-0">
            <div className="relative z-10">
              <div className="flex items-center space-x-3 mb-2 md:mb-8">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: '#0B1C2C', border: '1.5px solid rgba(214,177,116,0.3)' }}>
                  <img src={logoImg} alt="EDUVISA Logo" className="h-8 w-8 md:h-9 md:w-9 object-contain" referrerPolicy="no-referrer" />
                </div>
                <span className="text-[#D6B174] font-bold text-lg md:text-2xl font-display tracking-tight">EDUVISA</span>
                <span className="hidden sm:inline bg-[#D6B174]/10 text-[#D6B174] text-[9px] px-2 py-0.5 rounded-full border border-[#D6B174]/20 font-bold tracking-wider uppercase"></span>
              </div>
              
              <h2 className="hidden md:block text-3xl md:text-4xl font-display font-semibold leading-tight mb-4 text-[#D6B174]">
                Xorijda Ta'lim Olmoqchimisiz?
              </h2>
              <p className="hidden md:block text-sm text-[#6A727D] leading-relaxed max-w-sm mb-6">
                Premium ta'lim konsaltingi endi sizning telefoningizda. Universitetlarni toping, o'zingizga mos grantlarni aniqlang va AI Konsultant yordamida tezkor ariza topshiring.
              </p>
              <p className="md:hidden text-[11px] text-[#6A727D] leading-relaxed">
                Xorijda ta'lim olish uchun premium konsalting — endi telefoningizda.
              </p>
            </div>

            <div className="hidden md:block relative z-10 mt-8">
              <div className="flex items-center space-x-3 bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="w-10 h-10 rounded-full bg-[#D6B174]/20 flex items-center justify-center text-[#D6B174] font-bold">
                  🤖
                </div>
                <div>
                  <p className="text-xs font-bold text-white">AI Onboarding Ko'makchisi</p>
                  <p className="text-[11px] text-[#6A727D]">GPA va IELTS balingizga mos grantlarni avtomatik hisoblaydi.</p>
                </div>
              </div>
            </div>

            {/* Abstract Design Shape */}
            <div className="hidden md:block absolute -right-16 -bottom-16 w-64 h-64 border-[32px] border-[#D6B174]/10 rounded-full"></div>
          </div>

          {/* Form Panel */}
          <div className="flex-1 md:w-1/2 px-5 py-7 md:p-12 flex flex-col justify-center bg-[#F7F9FA]">
            {authMode === 'login' ? (
              <div>
                <h3 className="text-2xl font-display font-bold text-[#0B1C2C] mb-1">Kirish</h3>
                <p className="text-xs text-[#6A727D] mb-6">Tizimga kirish uchun username va parolingizni kiriting</p>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#212630] mb-1.5">Foydalanuvchi nomi (Username)</label>
                    <input
                      type="text"
                      placeholder="Foydalanuvchi nomingiz"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-sm text-[#212630] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#D6B174] focus:ring-4 focus:ring-[#D6B174]/15 focus:scale-[1.01] transition-all duration-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#212630] mb-1.5">Parol</label>
                    <input
                      type="password"
                      placeholder="8 belgili parol"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-sm text-[#212630] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#D6B174] focus:ring-4 focus:ring-[#D6B174]/15 focus:scale-[1.01] transition-all duration-200"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#0B1C2C] text-[#D6B174] font-bold py-3.5 px-6 rounded-xl hover:bg-[#B99056] hover:text-[#031222] transition-colors shadow-lg"
                  >
                    Tizimga kirish
                  </button>
                </form>

                <p className="text-xs text-center text-[#6A727D] mt-4">
                  Hisobingiz yo'qmi?{' '}
                  <button onClick={() => setAuthMode('register')} className="text-[#D6B174] font-bold hover:underline">
                    Telegram orqali ro'yxatdan o'tish
                  </button>
                </p>
                <p className="text-xs text-center text-[#6A727D] mt-2">
                </p>
              </div>
            ) : authMode === 'register' ? (
              <div>
                <h3 className="text-2xl font-display font-bold text-[#0B1C2C] mb-1">Telegram orqali ro'yxatdan o'tish</h3>
                <p className="text-xs text-[#6A727D] mb-6">Ro'yxatdan o'tish faqat Telegram orqali amalga oshiriladi — bot faqat telefon kontaktini so'raydi va hisobni yaratadi.</p>

                <div className="space-y-4 text-center">
                  <div className="p-4 bg-white border border-[#E5E8EB] rounded-2xl text-left">
                    <p className="text-[11px] text-[#6A727D] leading-relaxed mb-4">
                      Quyidagi tugma orqali Telegram botga o'ting. Bot sizdan faqat telefon kontaktini so'raydi (contact-only). Kontakt tasdiqlangach bot sizga username va password berishi yoki avtomatik kirish havolasini yuboradi.
                    </p>

                    <button
                      type="button"
                      onClick={handleOpenTelegramBot}
                      className="inline-flex items-center justify-center space-x-2 w-full bg-[#D6B174] hover:bg-[#B99056] text-[#031222] py-3 rounded-xl font-bold text-xs"
                    >
                      <span>Telegram botni ochish</span>
                      <ExternalLink className="w-4 h-4" />
                    </button>

                    <p className="text-[10px] text-[#6A727D] mt-2 text-center">
                      Agar tugma ishlamasa, Telegram’da botni qidiring va /start yuboring.
                    </p>
                  </div>

                  <p className="text-xs text-center text-[#6A727D] mt-6">
                    Hisobingiz bormi?{' '}
                    <button onClick={() => setAuthMode('login')} className="text-[#D6B174] font-bold hover:underline">
                      Kirish sahifasiga qaytish
                    </button>
                  </p>
                </div>
              </div>
            ) : authMode === 'reset' ? (
              <div>
                <h3 className="text-2xl font-display font-bold text-[#0B1C2C] mb-1">Parolni tiklash</h3>
                <p className="text-xs text-[#6A727D] mb-6">
                  {resetStage === 'request' && 'Username kiriting. Telegram bot orqali yangi parol beriladi.'}
                  {resetStage === 'verify' && 'Telegram botga kirib yangi parolni oling.'}
                  {resetStage === 'confirm' && 'Yangi parolni kiriting va uni tiklashni yakunlang.'}
                </p>

                {resetStage === 'request' && (
                  <form onSubmit={handleResetPasswordRequest} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#212630] mb-1.5">Foydalanuvchi nomi</label>
                      <input
                        type="text"
                        placeholder="Username"
                        value={resetUsername}
                        onChange={(e) => setResetUsername(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-sm text-[#212630] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#D6B174] focus:ring-4 focus:ring-[#D6B174]/15 focus:scale-[1.01] transition-all duration-200"
                        required
                      />
                    </div>
                    <button type="submit" className="w-full bg-[#0B1C2C] text-[#D6B174] font-bold py-3.5 px-6 rounded-xl hover:bg-[#B99056] hover:text-[#031222] transition-colors shadow-lg">
                      Bot orqali parolni tiklash
                    </button>
                  </form>
                )}

                {resetStage === 'verify' && (
                  <form onSubmit={handleResetPasswordVerify} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#212630] mb-1.5">Tasdiqlash kodi</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="123456"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-sm text-[#212630] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#D6B174] focus:ring-4 focus:ring-[#D6B174]/15 focus:scale-[1.01] transition-all duration-200"
                        required
                      />
                    </div>
                    <button type="submit" className="w-full bg-[#0B1C2C] text-[#D6B174] font-bold py-3.5 px-6 rounded-xl hover:bg-[#B99056] hover:text-[#031222] transition-colors shadow-lg">
                      Kodni tekshirish
                    </button>
                    <button type="button" onClick={() => setResetStage('request')} className="w-full text-xs text-[#6A727D] hover:underline">
                      Kodni qayta yuborish
                    </button>
                  </form>
                )}

                {resetStage === 'confirm' && (
                  <form onSubmit={handleResetPasswordConfirm} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#212630] mb-1.5">Yangi parol</label>
                      <input
                        type="password"
                        placeholder="Yangi parol"
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-sm text-[#212630] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#D6B174] focus:ring-4 focus:ring-[#D6B174]/15 focus:scale-[1.01] transition-all duration-200"
                        required
                      />
                    </div>
                    <button type="submit" className="w-full bg-[#0B1C2C] text-[#D6B174] font-bold py-3.5 px-6 rounded-xl hover:bg-[#B99056] hover:text-[#031222] transition-colors shadow-lg">
                      Parolni yangilash
                    </button>
                    <button type="button" onClick={() => setResetStage('verify')} className="w-full text-xs text-[#6A727D] hover:underline">
                      Kodni qayta kiritish
                    </button>
                  </form>
                )}

                <p className="text-xs text-center text-[#6A727D] mt-6">
                  Parolingizni esladingizmi?{' '}
                  <button onClick={() => setAuthMode('login')} className="text-[#D6B174] font-bold hover:underline">
                    Kirish sahifasiga qaytish
                  </button>
                </p>
              </div>
            ) : null}
          </div>

        </div>

        {/* Global Toast */}
        {toast && (
          <div className={`fixed bottom-4 right-4 z-50 px-5 py-3 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-2xl transition-all duration-300 transform translate-y-0 ${
            toast.type === 'success' ? 'bg-[#1E9E5A] text-white' :
            toast.type === 'error' ? 'bg-[#E40016] text-white' : 'bg-[#0B1C2C] text-[#D6B174]'
          }`}>
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    );
  }

  // Render AI Onboarding questionnaire (if user exists but not completed)
  if (user && !user.onboarding_completed && onboardingStep > 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-shell-1)] flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[600px]" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.15)' }}>
          
          {/* Header */}
          <div className="p-6 text-[var(--text-primary)] shrink-0 flex justify-between items-center" style={{ background: 'var(--bg-shell-2)', borderBottom: '1px solid rgba(214,177,116,0.1)' }}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#D6B174] flex items-center justify-center text-[#031222]">
                <Bot className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-display font-semibold text-lg text-[#D6B174]">EduVisa AI Profiling</h4>
                <p className="text-[10px] text-[var(--text-muted)]">Onboarding so'rovnomasi</p>
              </div>
            </div>
            <div className="text-xs px-3 py-1 rounded-full font-bold" style={{ background: 'rgba(214,177,116,0.1)', color: '#D6B174', border: '1px solid rgba(214,177,116,0.2)' }}>
              Qadam {onboardingStep} / 3
            </div>
          </div>

          {/* Chat-style Questions Body */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6" style={{ background: 'var(--bg-card-soft)' }}>
            {/* AI Welcome Message */}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[#D6B174] text-xs shrink-0 font-bold" style={{ background: 'rgba(214,177,116,0.1)', border: '1px solid rgba(214,177,116,0.2)' }}>
                AI
              </div>
              <div className="rounded-2xl rounded-tl-none p-4 text-xs leading-relaxed max-w-[85%] shadow-md" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-soft)', color: 'var(--text-primary)' }}>
                Salom, <strong>{user.firstName}</strong>! EduVisa oilasiga xush kelibsiz. Sizga eng mos universitetlarni va maksimal grantlarni topishda yordam berish uchun qisqa 3 ta savolga javob berishingizni iltimos qilaman.
              </div>
            </div>

            {/* Question 1: Budget */}
            {onboardingStep >= 1 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[#D6B174] text-xs shrink-0 font-bold" style={{ background: 'rgba(214,177,116,0.1)', border: '1px solid rgba(214,177,116,0.2)' }}>
                    AI
                  </div>
                  <div className="rounded-2xl rounded-tl-none p-4 text-xs leading-relaxed max-w-[85%] shadow-md" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-soft)', color: 'var(--text-primary)' }}>
                    <strong>Savol 1:</strong> Chet elda ta'lim olish uchun taxminiy yillik byudjetingiz qancha? (Ushbu mablag'ga kontrakt to'lovi kiradi). Keyinchalik buni o'zgartirishingiz mumkin.
                  </div>
                </div>

                {onboardingStep === 1 && (
                  <div className="pl-11 flex flex-wrap gap-2">
                    {['$1,500 (Faqat Bepul/Arzon)', '$5,000', '$10,000', '$20,000', 'Hali bilmayman'].map((val) => (
                      <button key={val} onClick={() => handleOnboardingAnswer(val)}
                        className="text-xs font-semibold px-4 py-2.5 rounded-xl transition-all hover:border-[#D6B174] text-[var(--text-primary)]"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }}>
                        {val === '$1,500 (Faqat Bepul/Arzon)' ? '$1,500 gacha (Bepul ta\'lim)' : val === 'Hali bilmayman' ? 'Hali bilmayman' : `${val} gacha`}
                      </button>
                    ))}
                  </div>
                )}

                {onboardingAnswers.budget && (
                  <div className="flex justify-end pr-2">
                    <div className="bg-[#D6B174] text-[#031222] rounded-2xl rounded-tr-none p-3 text-xs font-semibold shadow-sm">
                      Byudjet: {onboardingAnswers.budget}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Question 2: IELTS */}
            {onboardingStep >= 2 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[#D6B174] text-xs shrink-0 font-bold" style={{ background: 'rgba(214,177,116,0.1)', border: '1px solid rgba(214,177,116,0.2)' }}>
                    AI
                  </div>
                  <div className="rounded-2xl rounded-tl-none p-4 text-xs leading-relaxed max-w-[85%] shadow-md animate-slideIn" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-soft)', color: 'var(--text-primary)' }}>
                    <strong>Savol 2:</strong> IELTS yoki unga tenglashtirilgan ingliz tili sertifikatingiz bormi? Bo'lsa balingizni kiriting, bo'lmasa 'yo'q' deb javob bering.
                  </div>
                </div>

                {onboardingStep === 2 && (
                  <div className="pl-11 flex flex-wrap gap-2">
                    {['7.5', '7.0', '6.5', '6.0', '5.5', 'Yo\'q'].map((score) => (
                      <button key={score} onClick={() => handleOnboardingAnswer(score)}
                        className="text-xs font-semibold px-4 py-2.5 rounded-xl transition-all hover:border-[#D6B174] text-[var(--text-primary)]"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }}>
                        {score === 'Yo\'q' ? 'Yo\'q (Sertifikat yo\'q)' : `IELTS ${score}`}
                      </button>
                    ))}
                  </div>
                )}

                {onboardingAnswers.ielts && (
                  <div className="flex justify-end pr-2">
                    <div className="bg-[#D6B174] text-[#031222] rounded-2xl rounded-tr-none p-3 text-xs font-semibold shadow-sm">
                      IELTS: {onboardingAnswers.ielts}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Question 3: GPA */}
            {onboardingStep >= 3 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[#D6B174] text-xs shrink-0 font-bold" style={{ background: 'rgba(214,177,116,0.1)', border: '1px solid rgba(214,177,116,0.2)' }}>
                    AI
                  </div>
                  <div className="rounded-2xl rounded-tl-none p-4 text-xs leading-relaxed max-w-[85%] shadow-md" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-soft)', color: 'var(--text-primary)' }}>
                    <strong>Savol 3:</strong> O'rtacha o'zlashtirish bahongiz (GPA / Baholar o'rtachasi) necha? (Masalan: 4.8 yoki 5 baholik tizimda 4.5). Bilmasangiz 'yo'q' deb tanlang.
                  </div>
                </div>

                {onboardingStep === 3 && (
                  <div className="pl-11 flex flex-wrap gap-2">
                    {['4.8+', '4.5+', '4.0+', '3.5+', 'Yo\'q'].map((gpaVal) => (
                      <button key={gpaVal} onClick={() => handleOnboardingAnswer(gpaVal.replace('+', ''))}
                        className="text-xs font-semibold px-4 py-2.5 rounded-xl transition-all hover:border-[#D6B174] text-[var(--text-primary)]"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }}>
                        {gpaVal === 'Yo\'q' ? 'Bilmayman / Yo\'q' : `GPA ${gpaVal}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 text-center text-[10px] shrink-0" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--hairline-soft)', color: 'var(--text-muted)' }}>
            Ma'lumotlar shifrlangan xavfsiz kanallar orqali yuboriladi
          </div>

        </div>
      </div>
    );
  }

  // MAIN PWA INTERFACE
  if (user && user.role === 'consultant') {
    return <ConsultantDashboard token={token!} consultantId={Number(user.telegram_chat_id)} onLogout={logout} apiFetch={apiFetch} />;
  }

  if (user && user.role === 'admin') {
    return <AdminPanel token={token!} onLogout={logout} apiFetch={apiFetch} />;
  }

  return (
    <div className="min-h-screen text-[var(--text-primary)] font-sans flex flex-col lg:flex-row" style={{ background: 'linear-gradient(135deg, var(--bg-shell-1) 0%, var(--bg-shell-2) 50%, var(--bg-shell-3) 100%)' }}>
      
      {/* Sidebar - Desktop Navigation (>= 1024px) */}
      <aside className="hidden lg:flex w-72 text-[var(--text-primary)] flex-col h-screen shrink-0 sticky top-0 z-20" style={{ background: 'linear-gradient(180deg, var(--bg-shell-1) 0%, var(--bg-shell-2) 100%)', borderRight: '1px solid rgba(214,177,116,0.1)' }}>
        <div className="p-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: 'var(--bg-shell-2)', border: '1.5px solid rgba(214,177,116,0.25)' }}>
              <img src={logoImg} alt="EDUVISA Logo" className="h-9 w-9 object-contain" referrerPolicy="no-referrer" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[#D6B174] text-2xl font-bold tracking-tight font-display">EDUVISA</span>
                <span className="text-[9px] border border-[#D6B174]/30 text-[#D6B174] rounded px-1.5 py-0.5 uppercase tracking-widest font-bold"></span>
              </div>
              <p className="text-[#6A727D] text-[9px] uppercase tracking-widest mt-0.5">Premium Consulting</p>
            </div>
          </div>
        </div>

        {/* User Mini Profile */}
        {user && (
          <div className="px-6 mb-6">
            <div className="rounded-2xl p-4 flex items-center space-x-3" style={{ background: 'rgba(214,177,116,0.06)', border: '1px solid rgba(214,177,116,0.15)' }}>
              <div className="w-10 h-10 rounded-full bg-[#D6B174]/20 border border-[#D6B174]/40 flex items-center justify-center text-[#D6B174] font-bold">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">{user.firstName} {user.lastName}</p>
                <p className="text-[10px] text-[#6A727D] truncate">@{user.username}</p>
              </div>
              <button onClick={logout} className="text-[#6A727D] hover:text-[#E40016] transition-colors" title="Chiqish">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Sidebar Nav Buttons */}
        <nav className="flex-1 px-4 space-y-1">
          <button 
            onClick={() => navigateTab('home')}
            className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'home' ? 'bg-white/5 text-[var(--text-primary)] border-l-4 border-[#D6B174]' : 'text-[#6A727D] hover:bg-white/5 hover:text-[var(--text-primary)]'
            }`}
          >
            <Home className="w-5 h-5 shrink-0 text-[#D6B174]" />
            <span>{t.home}</span>
          </button>

          <button 
            onClick={() => { navigateTab('universities'); }}
            className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'universities' ? 'bg-white/5 text-[var(--text-primary)] border-l-4 border-[#D6B174]' : 'text-[#6A727D] hover:bg-white/5 hover:text-[var(--text-primary)]'
            }`}
          >
            <GraduationCap className="w-5 h-5 shrink-0 text-[#D6B174]" />
            <span>{t.universities}</span>
          </button>

          <button 
            onClick={() => navigateTab('ai')}
            className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'ai' ? 'bg-white/5 text-[var(--text-primary)] border-l-4 border-[#D6B174]' : 'text-[#6A727D] hover:bg-white/5 hover:text-[var(--text-primary)]'
            }`}
          >
            <Bot className="w-5 h-5 shrink-0 text-[#D6B174]" />
            <span className="flex-1 text-left">{t.ai}</span>
            <span className="bg-[#D6B174] text-[#031222] text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0">Yangi</span>
          </button>

          <button 
            onClick={() => navigateTab('applications')}
            className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'applications' ? 'bg-white/5 text-[var(--text-primary)] border-l-4 border-[#D6B174]' : 'text-[#6A727D] hover:bg-white/5 hover:text-[var(--text-primary)]'
            }`}
          >
            <FileText className="w-5 h-5 shrink-0 text-[#D6B174]" />
            <span>{t.applications}</span>
          </button>

          <button 
            onClick={() => navigateTab('profile')}
            className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'profile' ? 'bg-white/5 text-[var(--text-primary)] border-l-4 border-[#D6B174]' : 'text-[#6A727D] hover:bg-white/5 hover:text-[var(--text-primary)]'
            }`}
          >
            <User className="w-5 h-5 shrink-0 text-[#D6B174]" />
            <span>{t.profile}</span>
          </button>
        </nav>

        <div className="px-4 mt-5 space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full text-left px-4 py-3 rounded-2xl text-xs font-semibold transition-all" 
            style={{ background: 'var(--hairline-soft)', border: '1px solid var(--hairline-strong)', color: 'var(--text-primary)' }}
          >
            {t.theme}: {theme === 'light' ? t.light : t.dark}
          </button>
          <button
            onClick={toggleLocale}
            className="w-full text-left px-4 py-3 rounded-2xl text-xs font-semibold transition-all" 
            style={{ background: 'var(--hairline-soft)', border: '1px solid var(--hairline-strong)', color: 'var(--text-primary)' }}
          >
            {t.language}: {locale === 'uz' ? t.uzbek : t.russian}
          </button>
        </div>

        {/* Sidebar Mini Card */}
        {user && (
          <div className="p-6 border-t border-white/5">
            <div className="rounded-2xl p-4" style={{ background: 'rgba(214,177,116,0.06)', border: '1px solid rgba(214,177,116,0.12)' }}>
              <p className="text-[10px] text-[#D6B174] uppercase font-bold tracking-wider mb-2">Profil O'lchovlari</p>
              <div className="space-y-1.5 text-xs text-white/90">
                <div className="flex justify-between">
                  <span className="text-white/40">IELTS:</span>
                  <span className="font-semibold">{user.ielts_score ? user.ielts_score : 'Yo\'q'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">GPA:</span>
                  <span className="font-semibold">{user.gpa ? user.gpa : 'Yo\'q'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Yillik Byudjet:</span>
                  <span className="font-semibold text-[#D6B174] font-mono">{user.budget ? `$${user.budget.toLocaleString()}` : 'Bepul'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* TOP BAR / MOBILE HEADER */}
      <header className="lg:hidden h-16 bg-[var(--bg-shell-2)] text-[var(--text-primary)] flex items-center justify-between px-6 sticky top-0 z-40 border-b border-white/5">
        <div className="flex items-center space-x-2.5">
          <img src={logoImg} alt="EDUVISA Logo" className="h-8 w-8 object-contain rounded-md shrink-0" referrerPolicy="no-referrer" />
          <span className="text-[#D6B174] text-lg font-bold font-display tracking-tight">EDUVISA</span>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigateTab('profile')}
            className="w-8 h-8 rounded-full bg-[#D6B174]/20 flex items-center justify-center text-[#D6B174] font-bold text-xs"
          >
            {user ? user.firstName[0] : 'U'}
          </button>
        </div>
      </header>

      {/* OFFLINE BANNER */}
      {!navigator.onLine && (
        <div className="bg-[#E40016] text-[var(--text-primary)] text-center py-2 px-4 text-xs font-bold sticky top-16 lg:top-0 z-30">
          {t.offlineBanner}
        </div>
      )}

      {/* MAIN SCREEN ROUTING CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 p-4 md:p-8 lg:p-10 overflow-y-auto lg:h-screen pb-24 lg:pb-10 max-w-7xl mx-auto w-full">
        
        {/* TAB 1: BOSH SAHIFA (HOME) */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Elegant Welcome Banner */}
            <div className="p-6 md:p-8 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.15)' }}>
              <div className="relative z-10 space-y-1">
                <p className="text-[#D6B174] text-xs font-bold uppercase tracking-wider">{t.welcome}</p>
                <h2 className="text-2xl md:text-3xl font-bold font-display text-[var(--text-primary)]">
                  {t.welcomeTitle.replace('{name}', user?.firstName || '')}
                </h2>
                <p className="text-xs text-[var(--text-muted)] max-w-md">
                  {t.welcomeDescription}
                </p>
              </div>
              <div className="relative z-10 flex gap-2 w-full md:w-auto">
                <button 
                  onClick={() => navigateTab('universities')} 
                  className="flex-1 md:flex-none px-5 py-3 rounded-2xl font-bold text-xs transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg,#D6B174,#C49A52)', color: '#031222' }}
                >
                  {t.viewCountries}
                </button>
                <button 
                  onClick={() => navigateTab('ai')}
                  className="flex-1 md:flex-none text-[#D6B174] px-5 py-3 rounded-2xl font-bold text-xs transition-all hover:bg-[#D6B174]/10" style={{ border: '1px solid rgba(214,177,116,0.3)' }}
                >
                  {t.aiConsultation}
                </button>
              </div>
              <div className="absolute -right-16 -bottom-16 w-44 h-44 border-[16px] border-[#D6B174]/10 rounded-full"></div>
            </div>

            {/* Grid Layout: News & Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Yangiliklar / Foydali ma'lumotlar (8 Cols) */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold font-display text-[var(--text-primary)] flex items-center gap-2">
                    <Bell className="w-5 h-5 text-[#D6B174]" /> {t.newsAndInfo}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { emoji: '🎓', title: '2026 Yilgi Grantlar Ochiq!', desc: 'Buyuk Britaniya, Germaniya va Janubiy Koreyada yangi grantlar e\'lon qilindi. Hoziroq ariza toping!', tag: 'Grant', tagColor: 'bg-emerald-500/15 text-emerald-400', target: 'universities' as const },
                    { emoji: '📋', title: 'Hujjatlar Tayyorlash Bo\'yicha Qo\'llanma', desc: 'Attestat, pasport va boshqa hujjatlarni to\'g\'ri tayyorlash bo\'yicha to\'liq qo\'llanma.', tag: 'Qo\'llanma', tagColor: 'bg-blue-500/15 text-blue-400', target: 'applications' as const },
                    { emoji: '🤖', title: 'AI Konsultant Yangilandi', desc: 'Endi AI konsultant sizning IELTS va GPA balingizga qarab eng mos universitetlarni real vaqtda tahlil qiladi.', tag: 'Yangilik', tagColor: 'bg-purple-500/15 text-purple-400', target: 'ai' as const },
                    { emoji: '✈️', title: 'Viza Jarayoni Haqida', desc: 'Talaba vizasi olish uchun kerakli hujjatlar va qadamlar bo\'yicha batafsil ma\'lumot.', tag: 'Ma\'lumot', tagColor: 'bg-amber-500/15 text-amber-400', target: 'applications' as const },
                  ].map((news, idx) => (
                    <a
                      key={idx}
                      href={TAB_PATHS[news.target]}
                      onClick={(e) => { e.preventDefault(); navigateTab(news.target); }}
                      className="p-5 rounded-2xl flex flex-col justify-between transition-all hover:scale-[1.01] group cursor-pointer no-underline"
                      style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}
                    >
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-2xl p-1.5 rounded-xl" style={{ background: 'rgba(214,177,116,0.08)' }}>{news.emoji}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${news.tagColor}`}>{news.tag}</span>
                        </div>
                        <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[#D6B174] transition-colors mb-2">{news.title}</h4>
                        <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">{news.desc}</p>
                    </a>
                  ))}
                </div>
              </div>

              {/* Right Column: Application Status & AI Widget (4 Cols) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Applications Status card */}
                <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">Arizalarim holati</h4>
                  
                  {applications.length > 0 ? (
                    <div className="space-y-4">
                      {applications.slice(0, 2).map((app) => (
                        <div key={app.id} className="flex items-center space-x-3 p-2 hover:bg-white/3 rounded-xl transition-all">
                          <span className="text-xl">
                            {app.status.includes('Ko\'rib') ? '🟡' : app.status.includes('Tasdiq') ? '🟢' : '🔴'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-[var(--text-primary)] truncate">{app.universityName}</p>
                            <p className="text-[10px] text-[var(--text-muted)] truncate">{app.program}</p>
                          </div>
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">{app.date}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-[var(--text-muted)]">
                      {t.noApplications}
                    </div>
                  )}

                  <button 
                    onClick={() => navigateTab('applications')}
                    className="w-full mt-4 py-2 text-center rounded-xl text-xs font-bold transition-all text-[#D6B174] hover:bg-[#D6B174]/10" style={{ border: '1px solid rgba(214,177,116,0.2)' }}
                  >
                    {t.allApplications}
                  </button>
                </div>

                {/* AI Advisor Mini Widget */}
                <div className="text-[var(--text-primary)] rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[180px]" style={{ background: 'linear-gradient(135deg, var(--bg-card), var(--bg-card))', border: '1px solid rgba(214,177,116,0.15)' }}>
                  <div className="relative z-10 flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs" style={{ background: 'linear-gradient(135deg,#D6B174,#C49A52)', color: '#031222' }}>
                      AI
                    </div>
                    <span className="font-bold text-sm text-[#D6B174]">AI Maslahatchi</span>
                  </div>
                  <p className="relative z-10 text-[11px] text-white/80 leading-relaxed mt-2">
                    Siz uchun yangi grantlar tahlili tugadi. IELTS {user?.ielts_score || '7.5'} balingiz uchun Hanyang University to'liq mos kelishi mumkin.
                  </p>
                  <button 
                    onClick={() => navigateTab('ai')}
                    className="relative z-10 w-full mt-4 text-xs font-bold py-2.5 rounded-xl transition-all" style={{ background: 'linear-gradient(135deg,#D6B174,#C49A52)', color: '#031222' }}
                  >
                    Muloqotni boshlash →
                  </button>
                </div>

              </div>

            </div>

            {/* Bildirishnomalar */}
            <div className="p-6 rounded-3xl" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
              <h4 className="text-sm font-bold font-display text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#D6B174]" /> Oxirgi bildirishnomalar
              </h4>
              <div className="space-y-3">
                {notifications.map((notif, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-3 rounded-xl text-xs" style={{ background: 'var(--bg-card-soft)', border: '1px solid var(--hairline-soft)' }}>
                    <span className="text-[#D6B174] mt-0.5">●</span>
                    <p className="text-[var(--text-secondary)] font-medium leading-relaxed">{notif}</p>
                  </div>
                ))}
              </div>
            </div>

            {promotions.length > 0 && (
              <div className="p-6 rounded-3xl" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                <h4 className="text-sm font-bold font-display text-[var(--text-primary)] mb-4">{t.promotions}</h4>
                <div className="space-y-4">
                  {promotions.filter(p => p.active && new Date(p.endDate) >= new Date()).map(promo => (
                    <div key={promo.id} className="p-4 rounded-3xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }}>
                      <p className="text-xs text-[#D6B174] uppercase tracking-wide mb-2">Promo</p>
                      <p className="text-sm text-[var(--text-primary)] leading-relaxed">{getLocalizedText(promo.text, promo.textRu)}</p>
                      <p className="text-[10px] text-[#6A727D] mt-3">Tugash sanasi: {new Date(promo.endDate).toLocaleDateString(locale === 'uz' ? 'uz-UZ' : 'ru-RU')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {countries.length > 0 && (
              <div className="p-6 rounded-3xl" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold font-display text-[var(--text-primary)]">{t.universityCountries}</h4>
                  <span className="text-[10px] uppercase tracking-wide text-[#6A727D]">{countries.length} ta</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {countries.slice(0, 6).map(country => (
                    <div key={country.id} className="p-3 rounded-3xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl">{country.flag}</span>
                        {country.coverImage && <img src={country.coverImage} alt={getLocalizedCountryName(country)} className="h-8 w-8 object-cover rounded-lg" />}
                      </div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{getLocalizedCountryName(country)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: UNIVERSITETLAR (UNIVERSITIES) */}
        {activeTab === 'universities' && (() => {
          // Davlatlar faqat "Davlatlar" bo'limida saqlangan (ma'lumotlar bazasidagi) davlatlardan olinadi.
          // Shunda o'chirilgan davlatlar ro'yxatdan o'zidan ozi qayta qo'shilib qolmaydi.
          const savedCountryNames = Array.from(new Set(countries.map(c => c.name)));
          const countryList = savedCountryNames.map((country: string) => {
            const unis = allUniversities.filter(u => u.country === country);
            const savedCountry = countries.find(c => c.name === country);
            const displayCountry = getLocalizedCountryName(savedCountry) || country;
            const flagEmoji = savedCountry?.flag || unis[0]?.logo || '🌍';
            const coverImage = savedCountry?.coverImage || null;
            const countryInfo: Record<string, { desc: string; color: string }> = {
              'Buyuk Britaniya': { desc: 'Dunyo reytingi yuqori universitetlar', color: '#012169' },
              'Xitoy':           { desc: 'Arzon va sifatli ta\'lim, full grantlar', color: '#DE2910' },
              'Janubiy Koreya':  { desc: 'Texnologiya va IT sohasida yetakchi', color: '#C60C30' },
              'Avstraliya':      { desc: 'Jahon miqyosidagi tadqiqot markazlari', color: '#00008B' },
              'Germaniya':       { desc: 'Bepul ta\'lim imkoniyatlari mavjud', color: '#000000' },
              'Singapur':        { desc: 'Osiyo\'ning eng nufuzli ta\'lim markazi', color: '#EF3340' },
            };
            const defaultDesc = unis.length > 0 ? `${unis.length} ta universitet mavjud` : 'Tez orada universitetlar qo\'shiladi';
            const info = countryInfo[country as string] || { desc: defaultDesc, color: 'var(--bg-shell-2)' };
            return { country, displayCountry, unis, flagEmoji, desc: info.desc, color: info.color, coverImage };
          });

          // Universities of selected country
          const countryUnis = selectedCountry && savedCountryNames.includes(selectedCountry)
            ? allUniversities.filter(u => u.country === selectedCountry).filter(uni => {
                const matchesSearch = !uniSearch || uni.name.toLowerCase().includes(uniSearch.toLowerCase()) || 
                  uni.programs.some(p => p.toLowerCase().includes(uniSearch.toLowerCase()));
                const matchesProfile = !uniFilterMatch || !user || (
                  (user.budget === null || uni.budget <= user.budget) &&
                  (user.ielts_score === null || !user.has_ielts || uni.ielts <= user.ielts_score)
                );
                return matchesSearch && matchesProfile;
              })
            : [];

          return (
            <div className="space-y-6 animate-fadeIn">
              {!selectedCountry ? (
                /* ===== DAVLATLAR RO'YXATI ===== */
                <>
                  <div className="p-5 rounded-3xl" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                    <h3 className="font-display font-bold text-lg text-[var(--text-primary)] mb-1">{t.countryListHeading}</h3>
                    <p className="text-xs text-[var(--text-muted)]">{t.chooseCountryPrompt}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {countryList.map(({ country, displayCountry, unis, flagEmoji, desc, coverImage }) => (
                      <button
                        key={country}
                        onClick={() => { setSelectedCountry(country); setUniSearch(''); setUniFilterMatch(false); }}
                        className="rounded-3xl overflow-hidden transition-all text-left group hover:scale-[1.02]" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}
                      >
                        {/* Country header banner */}
                        <div className="relative h-36 overflow-hidden">
                          {coverImage ? (
                            <img src={coverImage} alt={country} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--bg-card), var(--bg-shell-2))' }}>
                              <span className="text-5xl">{flagEmoji}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                          {coverImage && <span className="absolute top-3 right-3 text-2xl drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">{flagEmoji}</span>}
                          <h4 className="absolute bottom-3 left-4 right-4 font-display font-bold text-lg text-white group-hover:text-[#D6B174] transition-colors leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
                            {displayCountry}
                          </h4>
                        </div>
                        {/* Info footer */}
                        <div className="px-6 py-4 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-[var(--text-muted)] leading-relaxed">{desc}</p>
                          </div>
                          <div className="ml-3 shrink-0 flex flex-col items-end">
                            <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wide">Universitetlar</span>
                            <span className="text-xl font-bold font-display text-[#D6B174]">{unis.length}</span>
                          </div>
                        </div>
                        <div className="px-6 pb-4">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#D6B174] group-hover:gap-2.5 transition-all">
                            Ko'rish <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                /* ===== TANLANGAN DAVLAT UNIVERSITETLARI ===== */
                <>
                  {/* Back + Search bar */}
                  <div className="p-5 rounded-3xl space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => { setSelectedCountry(null); setUniSearch(''); setUniFilterMatch(false); }}
                        className="p-2.5 rounded-xl transition-colors text-[#D6B174] hover:bg-[#D6B174]/10 shrink-0" style={{ border: '1px solid rgba(214,177,116,0.2)' }}
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                      </button>
                      <div>
                        <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
                          {allUniversities.find(u => u.country === selectedCountry)?.logo} {selectedCountry}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)]">{allUniversities.filter(u => u.country === selectedCountry).length} ta universitet mavjud</p>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="Universitet yoki yo'nalish nomini qidiring..."
                          value={uniSearch}
                          onChange={(e) => setUniSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm focus:outline-none transition-all text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-soft)' }}
                        />
                        <Search className="w-5 h-5 text-[var(--text-muted)] absolute left-3.5 top-3.5" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--hairline-soft)' }}>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="matchToggle"
                          checked={uniFilterMatch}
                          onChange={(e) => setUniFilterMatch(e.target.checked)}
                          className="w-4 h-4 accent-[#D6B174] cursor-pointer"
                        />
                        <label htmlFor="matchToggle" className="text-xs font-semibold text-[var(--text-primary)] cursor-pointer">
                          {t.showMatchingProfile}
                        </label>
                      </div>
                      <span className="text-xs text-[var(--text-muted)] font-medium">{t.universitiesFound.replace('{count}', String(countryUnis.length))}</span>
                    </div>
                  </div>

                  {/* University Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {countryUnis.map((uni) => {
                      const isSaved = bookmarks.includes(uni.id);
                      return (
                        <div
                          key={uni.id}
                          className="rounded-2xl overflow-hidden transition-all flex flex-col justify-between group h-full cursor-pointer hover:scale-[1.01]"
                          style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}
                          onClick={() => openUniversityDetail(uni)}
                        >
                          <div className="p-6 pb-4">
                            <div className="flex justify-between items-start mb-3">
                              <span className="text-3xl p-2.5 rounded-2xl block" style={{ background: 'rgba(214,177,116,0.08)' }}>{uni.logo}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleBookmark(uni.id); }}
                                className="p-2 rounded-xl transition-colors text-[var(--text-muted)] hover:text-[#D6B174] hover:bg-[#D6B174]/10"
                              >
                                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#D6B174] text-[#D6B174]' : ''}`} />
                              </button>
                            </div>
                            <h4 className="font-display font-bold text-base text-[var(--text-primary)] group-hover:text-[#D6B174] transition-colors leading-snug line-clamp-1 mb-1">
                              {getLocalizedText(uni.name, uni.nameRu)}
                            </h4>
                            <p className="text-xs text-[var(--text-muted)] mb-4">{getLocalizedCountryName(countries.find(c => c.name === uni.country)) || uni.country}</p>
                            <p className="text-xs text-[var(--text-muted-2)] leading-relaxed line-clamp-3">{getLocalizedText(uni.description, uni.descriptionRu)}</p>
                          </div>
                          <div className="px-6 py-4 flex items-center justify-between text-xs font-semibold" style={{ background: 'var(--bg-card-soft)', borderTop: '1px solid var(--hairline-soft)' }}>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wide">{t.budgetLabel}</span>
                              <span className="text-xs font-bold text-[var(--text-primary)] font-mono">${uni.budget.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col text-right">
                              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wide">{t.infoTag}</span>
                              <span className="text-xs font-bold text-[var(--text-primary)]">IELTS {uni.ielts}+</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {countryUnis.length === 0 && (
                      <div className="col-span-full rounded-3xl p-12 text-center text-[var(--text-muted)]" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.08)' }}>
                        <GraduationCap className="w-12 h-12 mx-auto text-[#D6B174] mb-3 stroke-[1.5]" />
                        <h4 className="font-display font-bold text-[var(--text-primary)] text-sm mb-1">{t.noResults}</h4>
                        <p className="text-xs">{t.adjustFilters}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* TAB 3: AI CONSULTANT (AI CHAT) */}
        {activeTab === 'ai' && (
          <div className="flex-1 rounded-3xl flex flex-col h-[650px] overflow-hidden animate-fadeIn" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
            
            {/* Chat header */}
            <div className="p-5 text-[var(--text-primary)] flex items-center justify-between shrink-0" style={{ background: 'var(--bg-card)', borderBottom: '1px solid rgba(214,177,116,0.1)' }}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#D6B174] flex items-center justify-center text-[#031222]">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-display font-semibold text-base text-[#D6B174]">Premium AI Konsultant</h4>
                  <div className="flex items-center space-x-1.5 text-[10px] text-white/50">
                    <span className="w-1.5 h-1.5 bg-[#1E9E5A] rounded-full animate-ping"></span>
                    <span>Profil ma'lumotlariga asoslangan real javoblar</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={clearChatHistory}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors text-[#6A727D] hover:text-[var(--text-primary)]"
                  title="Suhbatni tozalash"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* System Profile Context Info Row */}
            <div className="px-5 py-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--text-primary)] font-semibold" style={{ background: 'rgba(214,177,116,0.05)', borderBottom: '1px solid var(--hairline-soft)' }}>
              <span>{t.profileContext}</span>
              <span className="text-[var(--text-muted)]">{t.ieltsLabel} {user?.ielts_score || t.noBudget}</span>
              <span className="text-[var(--text-muted)]">{t.gpaLabel} {user?.gpa || t.noBudget}</span>
              <span className="text-[var(--text-muted)]">{t.budgetLabel} {user?.budget ? `$${user.budget.toLocaleString()}` : t.noBudget}</span>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4" style={{ background: 'var(--bg-card-soft)' }}>
              {chatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#6A727D]">
                  <Bot className="w-12 h-12 text-[#D6B174] mb-3 stroke-[1.5]" />
                  <h5 className="font-display font-bold text-[var(--bg-shell-2)] text-sm mb-1">{t.startConversation}</h5>
                  <p className="text-xs max-w-sm mb-4">
                    {t.aiPromptDescription}
                  </p>
                </div>
              ) : (
                chatHistory.map((chat, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-start space-x-3 ${chat.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                  >
                    {chat.role === 'model' && (
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-shell-2)] flex items-center justify-center text-[var(--text-primary)] font-bold text-xs shrink-0 font-display">
                        AI
                      </div>
                    )}
                    <div className={`p-4 rounded-2xl text-xs leading-relaxed max-w-[80%] shadow-sm ${
                      chat.role === 'user' 
                        ? 'bg-[#D6B174] text-[#031222] rounded-tr-none font-medium' 
                        : 'bg-[var(--bg-shell-2)] text-[var(--text-primary)] rounded-tl-none'
                    }`}>
                      <p className="whitespace-pre-line">{chat.message}</p>
                      <div className="text-[9px] text-right mt-1 opacity-40">
                        {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Chat Loading typing effect */}
              {chatLoading && (
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-shell-2)] flex items-center justify-center text-[var(--text-primary)] font-bold text-xs shrink-0 font-display">
                    AI
                  </div>
                  <div className="bg-[var(--bg-shell-2)] text-[var(--text-primary)] rounded-2xl rounded-tl-none p-4 text-xs max-w-[80%] shadow-sm">
                    <div className="flex space-x-1 py-1.5 px-0.5">
                      <span className="w-2 h-2 bg-[#D6B174] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-[#D6B174] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-[#D6B174] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef}></div>
            </div>

            {/* Quick question chips */}
            <div className="p-3 flex gap-2 overflow-x-auto no-scrollbar shrink-0" style={{ background: 'var(--bg-card-soft)', borderTop: '1px solid var(--hairline-soft)' }}>
              <button 
                onClick={() => handleSendMessage(undefined, t.quickQuestion1)}
                className="rounded-full px-4 py-2 text-xs font-semibold shrink-0 transition-all text-[var(--text-primary)] hover:text-[#D6B174]" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }}
              >
                {t.quickQuestion1}
              </button>
              <button 
                onClick={() => handleSendMessage(undefined, t.quickQuestion2)}
                className="rounded-full px-4 py-2 text-xs font-semibold shrink-0 transition-all text-[var(--text-primary)] hover:text-[#D6B174]" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }}
              >
                {t.quickQuestion2}
              </button>
              <button 
                onClick={() => handleSendMessage(undefined, t.quickQuestion3)}
                className="rounded-full px-4 py-2 text-xs font-semibold shrink-0 transition-all text-[var(--text-primary)] hover:text-[#D6B174]" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }}
              >
                {t.quickQuestion3}
              </button>
            </div>

            {/* Input form */}
            <form onSubmit={handleSendMessage} className="p-4 flex items-center space-x-3 shrink-0" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--hairline-soft)' }}>
              <input 
                type="text" 
                placeholder={t.sendMessagePlaceholder}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 rounded-2xl px-5 py-3.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none transition-all" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }}
                disabled={chatLoading}
              />
              <button 
                type="submit" 
                className="p-3.5 rounded-2xl transition-all shrink-0" style={{ background: 'linear-gradient(135deg,#D6B174,#C49A52)', color: '#031222' }}
                disabled={chatLoading}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>
        )}

        {/* TAB 4: MENING ARIZALARIM (APPLICATIONS) */}
        {activeTab === 'applications' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Applications List Header with New Application button */}
            <div className="flex justify-between items-center p-5 rounded-3xl" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
              <div>
                <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">{t.applicationMonitoring}</h3>
                <p className="text-xs text-[var(--text-muted)]">{t.applicationMonitoringDescription}</p>
              </div>
              <button 
                onClick={() => {
                  setSelectedCountry(null);
                  navigateTab('universities');
                  showToast('Ariza uchun avval davlat va universitetni tanlang', 'info');
                }}
                className="font-bold px-4 py-2.5 rounded-2xl text-xs transition-all flex items-center space-x-2" style={{ background: 'linear-gradient(135deg,#D6B174,#C49A52)', color: '#031222' }}
              >
                <span>+ Yangi Ariza</span>
              </button>
            </div>

            {/* Active applications Timeline or cards */}
            <div className="space-y-6">
              {applications.length > 0 ? (
                applications.map((app) => (
                  <div key={app.id} className="rounded-3xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                    {/* Upper */}
                    <div className="p-6 flex flex-col md:flex-row justify-between md:items-center gap-4" style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                      <div className="flex items-center space-x-3">
                        <span className="text-3xl p-2 rounded-2xl" style={{ background: 'rgba(214,177,116,0.08)' }}>🎓</span>
                        <div>
                          <h4 className="font-display font-bold text-base text-[var(--text-primary)]">{app.universityName}</h4>
                          <p className="text-xs text-[var(--text-muted)]">{app.program}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="flex flex-col md:items-end">
                          <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">Topshirilgan Sana</span>
                          <span className="text-xs font-mono font-bold text-[var(--text-primary)]">{app.date}</span>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                            app.status.includes('Tasdiq') ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                          }`}>
                            {app.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline History and Hujjatlar */}
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ background: 'var(--bg-card-soft)' }}>
                      
                      {/* Timeline status history */}
                      <div className="space-y-4">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">{t.statusHistoryTitle}</h5>
                        <div className="space-y-4 pl-3 relative" style={{ borderLeft: '1px solid rgba(214,177,116,0.2)' }}>
                          {app.history.map((hist, idx) => (
                            <div key={idx} className="relative pl-4">
                              {/* Node Circle */}
                              <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-[#D6B174]"></div>
                              <div className="text-xs">
                                <span className="font-bold text-[var(--text-primary)]">{hist.status}</span>
                                <span className="text-[10px] text-[var(--text-muted)] ml-2 font-mono">{hist.date}</span>
                                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">{hist.note}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Documents attached */}
                      <div className="space-y-3">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Hujjatlar</h5>
                        <div className="space-y-2.5">
                          {app.documents.map((doc, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => void openSignedFile(doc.url || '')}
                              className="flex items-center justify-between p-3 rounded-2xl text-xs transition-colors hover:bg-[#D6B174]/10 w-full text-left" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-soft)' }}
                            >
                              <div className="flex items-center space-x-2 min-w-0">
                                <FileText className="w-4.5 h-4.5 text-[#D6B174] shrink-0" />
                                <span className="font-semibold text-[var(--text-primary)] truncate">{doc.type}</span>
                              </div>
                              <span className={`font-bold flex items-center gap-1 text-[11px] shrink-0 ${
                                doc.status === 'Tasdiqlangan' ? 'text-[#1E9E5A]' :
                                doc.status === 'Rad etilgan' ? 'text-[#E40016]' : 'text-[#D6B174]'
                              }`}>
                                <CheckCircle2 className="w-3.5 h-3.5" /> {doc.status}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl p-12 text-center text-[var(--text-muted)]" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.08)' }}>
                  <FileText className="w-12 h-12 mx-auto text-[#D6B174] mb-3 stroke-[1.5]" />
                  <h4 className="font-display font-bold text-[var(--text-primary)] text-sm mb-1">{t.emptyApplicationsTitle}</h4>
                  <p className="text-xs max-w-sm mx-auto mb-4">
                    {t.emptyApplicationsDescription}
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 5: PROFILE & DOCUMENTS */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-fadeIn">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Profile details editor (8 cols) */}
              <div className="lg:col-span-8 p-6 md:p-8 rounded-3xl space-y-6" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                <div>
                  <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">{t.personalDetails}</h3>
                  <p className="text-xs text-[var(--text-muted)]">{t.personalDetailsDescription}</p>
                </div>

                {profileSuccessMsg && (
                  <div className="p-3 bg-[#1E9E5A]/10 text-[#1E9E5A] rounded-xl text-xs font-semibold animate-fadeIn">
                    {profileSuccessMsg}
                  </div>
                )}

                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  {/* General details group */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">{t.firstNameLabel}</label>
                      <input 
                        type="text" 
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl text-xs focus:outline-none transition-all text-[var(--text-primary)]" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">{t.lastNameLabel}</label>
                      <input 
                        type="text" 
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl text-xs focus:outline-none transition-all text-[var(--text-primary)]" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">{t.phoneLabel}</label>
                      <input 
                        type="tel" 
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl text-xs focus:outline-none transition-all text-[var(--text-primary)]" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">{t.usernameLabel}</label>
                      <input 
                        type="text" 
                        value={user?.username}
                        disabled
                        className="w-full px-4 py-3 rounded-2xl text-xs text-[var(--text-muted)] cursor-not-allowed font-mono" style={{ background: 'var(--bg-card-soft)', border: '1px solid var(--hairline-soft)' }}
                      />
                    </div>
                  </div>

                  {/* Onboarding score details group */}
                  <div className="pt-4 space-y-4" style={{ borderTop: '1px solid var(--hairline-soft)' }}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Ta'lim va Byudjet o'lchovlari</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">{t.budgetLabel} ($)</label>
                        <input 
                          type="number" 
                          placeholder="Yillik byudjetingiz"
                          value={editBudget}
                          onChange={(e) => setEditBudget(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl text-xs focus:outline-none transition-all text-[var(--text-primary)] font-mono" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">IELTS</label>
                        <input 
                          type="number" 
                          step="0.5"
                          placeholder="Masalan: 7.5"
                          value={editIelts}
                          onChange={(e) => setEditIelts(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl text-xs focus:outline-none transition-all text-[var(--text-primary)] font-mono" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">GPA</label>
                        <input 
                          type="number" 
                          step="0.1"
                          placeholder="Masalan: 4.8"
                          value={editGpa}
                          onChange={(e) => setEditGpa(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl text-xs focus:outline-none transition-all text-[var(--text-primary)] font-mono" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }}
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="font-bold px-6 py-3 rounded-2xl text-xs transition-all" style={{ background: 'linear-gradient(135deg,#D6B174,#C49A52)', color: '#031222' }}
                  >
                    Ma'lumotlarni saqlash
                  </button>
                </form>
              </div>

              {/* Documents box (4 cols) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Document Uploader */}
                <div className="p-6 rounded-3xl space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{t.uploadDocuments}</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">{t.documentType}</label>
                      <select 
                        value={uploadType} 
                        onChange={(e) => setUploadType(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none text-[var(--text-primary)]" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }}
                      >
                        <option value="Pasport">{t.passportCopy}</option>
                        <option value="IELTS Sertifikati">{t.ieltsCertificate}</option>
                        <option value="Diplom / Attestat">{t.diplomaTranscript}</option>
                        <option value="Tavsiyanoma">{t.recommendationLetter}</option>
                        <option value="Resume">{t.resume}</option>
                      </select>
                    </div>

                    {/* Standard upload triggers */}
                    <div className="flex flex-col gap-2">
                      <label className="cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-colors block" style={{ borderColor: 'rgba(214,177,116,0.2)' }}>
                        <input 
                          type="file" 
                          accept="image/*,application/pdf"
                          onChange={handleFileUpload}
                          className="hidden" 
                          disabled={isUploading}
                        />
                        <Upload className="w-8 h-8 text-[#D6B174] mx-auto mb-2" />
                        <span className="text-xs font-bold text-[var(--text-primary)] block">{t.selectFile}</span>
                        <span className="text-[10px] text-[var(--text-muted)] mt-1 block">{t.pdfOrImage}</span>
                      </label>

                      {/* Camera capture trigger specifically requested for mobile compatibility */}
                      <button 
                        type="button"
                        onClick={triggerCameraCapture}
                        className="w-full font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all text-[var(--text-primary)] hover:bg-[#D6B174]/10" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }}
                      >
                        <Camera className="w-4 h-4 text-[#D6B174]" />
                        <span>{t.captureCamera}</span>
                      </button>
                    </div>

                    {isUploading && (
                      <div className="p-2.5 bg-[#D6B174]/10 text-[var(--bg-shell-2)] border border-[#D6B174]/20 rounded-xl text-xs text-center animate-pulse">
                        Hujjat serverga yuklanmoqda...
                      </div>
                    )}
                  </div>
                </div>

                {/* List of uploaded documents */}
                <div className="p-6 rounded-3xl space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{t.documentsMy} ({documents.length})</h4>
                  
                  <div className="space-y-2.5 max-h-[250px] overflow-y-auto no-scrollbar">
                    {documents.map((doc, idx) => (
                      <div key={idx} className="p-3 rounded-2xl flex items-center justify-between text-xs" style={{ background: 'var(--bg-card-soft)', border: '1px solid var(--hairline-soft)' }}>
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <FileText className="w-4.5 h-4.5 text-[#D6B174] shrink-0" />
                          <div className="min-w-0">
                            <span className="font-bold text-[var(--text-primary)] block truncate">{doc.type}</span>
                            <span className="text-[9px] text-[var(--text-muted)] font-mono block truncate">{doc.name} • {doc.size}</span>
                          </div>
                        </div>
                        <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {t.documentStatusApproved}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preferences settings & notifications toggle */}
                <div className="p-6 rounded-3xl space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{t.notificationsSettings}</h4>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span>{t.pushStatusLabel}</span>
                      <button onClick={requestPushPermission} className="text-[#D6B174] font-bold hover:underline">
                        {t.enablePush}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t.telegramAlerts}</span>
                      <a href="https://t.me/Eduvisa_ai_bot" target="_blank" rel="noreferrer" className="text-[#D6B174] font-bold hover:underline flex items-center gap-1">
                        <span>{t.botLabel}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 text-[var(--text-primary)] flex items-center justify-around px-2 z-40" style={{ background: 'rgba(7,19,32,0.95)', borderTop: '1px solid rgba(214,177,116,0.1)', backdropFilter: 'blur(12px)' }}>
        <button 
          onClick={() => navigateTab('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 text-xs font-semibold transition-all ${
            activeTab === 'home' ? 'text-[#D6B174]' : 'text-[#6A727D]'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[9px]">Bosh sahifa</span>
        </button>

        <button 
          onClick={() => { navigateTab('universities'); }}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 text-xs font-semibold transition-all ${
            activeTab === 'universities' ? 'text-[#D6B174]' : 'text-[#6A727D]'
          }`}
        >
          <GraduationCap className="w-5 h-5 mb-0.5" />
          <span className="text-[9px]">Davlatlar</span>
        </button>

        <button 
          onClick={() => navigateTab('ai')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 text-xs font-semibold transition-all relative ${
            activeTab === 'ai' ? 'text-[#D6B174]' : 'text-[#6A727D]'
          }`}
        >
          <div className="relative">
            <Bot className="w-5 h-5 mb-0.5" />
            <span className="absolute -top-1 -right-2.5 w-1.5 h-1.5 bg-[#D6B174] rounded-full"></span>
          </div>
          <span className="text-[9px]">AI</span>
        </button>

        <button 
          onClick={() => navigateTab('applications')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 text-xs font-semibold transition-all ${
            activeTab === 'applications' ? 'text-[#D6B174]' : 'text-[#6A727D]'
          }`}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span className="text-[9px]">Arizalarim</span>
        </button>

        <button 
          onClick={() => navigateTab('profile')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 text-xs font-semibold transition-all ${
            activeTab === 'profile' ? 'text-[#D6B174]' : 'text-[#6A727D]'
          }`}
        >
          <User className="w-5 h-5 mb-0.5" />
          <span className="text-[9px]">Profil</span>
        </button>
      </nav>

      {/* MODAL 1: UNIVERSITY DETAIL POPUP & APPLY */}
      {selectedUni && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-scaleUp" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.2)' }}>
            
            {/* Header */}
            <div className="p-6 text-[var(--text-primary)] flex justify-between items-start shrink-0" style={{ background: 'var(--bg-card)', borderBottom: '1px solid rgba(214,177,116,0.1)' }}>
              <div className="flex items-center space-x-3.5">
                <span className="text-3xl p-2 rounded-2xl block" style={{ background: 'rgba(214,177,116,0.08)' }}>{selectedUni.logo}</span>
                <div>
                  <h4 className="font-display font-semibold text-lg text-[#D6B174]">{getLocalizedText(selectedUni.name, selectedUni.nameRu)}</h4>
                  <p className="text-xs text-[var(--text-muted)]">{getLocalizedCountryName(countries.find(c => c.name === selectedUni.country)) || selectedUni.country}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedUni(null);
                  setIsApplying(false);
                }}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6" style={{ background: 'var(--bg-card-soft)' }}>
              
              {!isApplying ? (
                <>
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Universitet Haqida</h5>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {getLocalizedText(selectedUni.description, selectedUni.descriptionRu)}
                    </p>
                  </div>

                  {/* Requirements & Budget Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-soft)' }}>
                      <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">{t.universityLearningCost}</span>
                      <p className="text-base font-bold font-mono text-[var(--text-primary)] mt-1">
                        ${selectedUni.budget.toLocaleString()} / yil
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Kontrakt to'lovlari yo'nalishga qarab farqlanishi mumkin.</p>
                    </div>

                    <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-soft)' }}>
                      <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">{t.grantDiscountsLabel}</span>
                      <p className="text-xs font-bold text-emerald-400 mt-1">
                        {getLocalizedText(selectedUni.grantInfo, selectedUni.grantInfoRu)}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-soft)' }}>
                      <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">{t.ieltsRequirementLabel}</span>
                      <p className="text-sm font-bold text-[var(--text-primary)] mt-1">
                        IELTS {selectedUni.ielts} yoki undan yuqori
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-soft)' }}>
                      <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">{t.gpaRequirementLabel}</span>
                      <p className="text-sm font-bold text-[var(--text-primary)] mt-1">
                        O'rtacha GPA: {selectedUni.gpa} (5.0 balldan)
                      </p>
                    </div>
                  </div>

                  {/* Program options available */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Dasturlar & Yo'nalishlar</h5>
                    <div className="flex flex-wrap gap-2">
                      {getLocalizedPrograms(selectedUni.programs, selectedUni.programsRu).map((program, idx) => (
                        <span key={idx} className="rounded-xl px-3 py-1.5 text-xs font-semibold text-[#D6B174]" style={{ background: 'rgba(214,177,116,0.1)', border: '1px solid rgba(214,177,116,0.15)' }}>
                          {program}
                        </span>
                      ))}
                    </div>
                  </div>

                  {faculties.filter(f => f.universityId === selectedUni.id).length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{t.faculties}</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {faculties.filter(f => f.universityId === selectedUni.id).map((faculty) => (
                          <div key={faculty.id} className="rounded-3xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-soft)' }}>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{getLocalizedText(faculty.name, faculty.nameRu)}</p>
                            {faculty.description && <p className="text-[11px] text-[var(--text-secondary)] mt-2">{getLocalizedText(faculty.description, faculty.descriptionRu)}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <form onSubmit={handleApplySubmit} className="space-y-5">
                  {/* Step label */}
                  <div className="flex items-center gap-3 p-4 bg-[var(--bg-shell-2)]/5 rounded-2xl border border-[var(--bg-shell-2)]/10">
                    <div className="w-8 h-8 bg-[#D6B174] rounded-full flex items-center justify-center shrink-0">
                      <GraduationCap className="w-4 h-4 text-[#031222]" />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold font-display text-[var(--bg-shell-2)]">{t.applySectionTitle}</h5>
                      <p className="text-[11px] text-[#6A727D]">{t.applySectionSubtitle}</p>
                    </div>
                  </div>

                  {/* Program cards */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6A727D]">
                      {t.chooseMajorLabel} <span className="text-[#E40016]">*</span>
                    </label>
                    <div className="space-y-2">
                      {selectedUni.programs.map((prog, idx) => (
                        <label
                          key={idx}
                          className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            applyProgram === prog
                              ? 'border-[#D6B174] bg-[#D6B174]/8 ring-1 ring-[#D6B174]'
                              : 'border-[#E5E8EB] bg-white hover:border-[#D6B174]/50 hover:bg-[#F7F9FA]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="applyProgram"
                            value={prog}
                            checked={applyProgram === prog}
                            onChange={() => setApplyProgram(prog)}
                            className="accent-[#D6B174] w-4 h-4 shrink-0"
                          />
                          <span className="text-sm font-semibold text-[var(--bg-shell-2)]">{prog}</span>
                          {applyProgram === prog && (
                            <CheckCircle2 className="w-4 h-4 text-[#D6B174] ml-auto shrink-0" />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Ota-ona ma'lumotlari */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6A727D]">
                      {t.parentDetails} <span className="text-[#E40016]">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input type="text" placeholder={t.fatherNamePlaceholder} value={applyFatherName} onChange={(e) => setApplyFatherName(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F3F5F8] border border-transparent rounded-2xl text-xs focus:outline-none focus:border-[#D6B174] focus:bg-white transition-all text-[#212630]" />
                      <input type="tel" placeholder={t.fatherPhonePlaceholder} value={applyFatherPhone} onChange={(e) => setApplyFatherPhone(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F3F5F8] border border-transparent rounded-2xl text-xs focus:outline-none focus:border-[#D6B174] focus:bg-white transition-all text-[#212630] font-mono" />
                      <input type="text" placeholder={t.motherNamePlaceholder} value={applyMotherName} onChange={(e) => setApplyMotherName(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F3F5F8] border border-transparent rounded-2xl text-xs focus:outline-none focus:border-[#D6B174] focus:bg-white transition-all text-[#212630]" />
                      <input type="tel" placeholder={t.motherPhonePlaceholder} value={applyMotherPhone} onChange={(e) => setApplyMotherPhone(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F3F5F8] border border-transparent rounded-2xl text-xs focus:outline-none focus:border-[#D6B174] focus:bg-white transition-all text-[#212630] font-mono" />
                    </div>
                  </div>

                  {/* Aloqa ma'lumotlari */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6A727D]">
                      {t.contactDetails} <span className="text-[#E40016]">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input type="email" placeholder={t.emailPlaceholder} value={applyEmail} onChange={(e) => setApplyEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F3F5F8] border border-transparent rounded-2xl text-xs focus:outline-none focus:border-[#D6B174] focus:bg-white transition-all text-[#212630]" />
                      <input type="tel" placeholder={t.phonePlaceholder} value={applyContactPhone} onChange={(e) => setApplyContactPhone(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F3F5F8] border border-transparent rounded-2xl text-xs focus:outline-none focus:border-[#D6B174] focus:bg-white transition-all text-[#212630] font-mono" />
                    </div>
                  </div>

                  {/* Hujjatlarni yuklash */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6A727D]">
                      {t.documentLabels} <span className="text-[#E40016]">*</span>
                    </label>
                    <div className="space-y-2">
                      {[
                        { label: t.passportCopy, file: applyPassportFile, set: setApplyPassportFile },
                        { label: t.ieltsCertificate, file: applyPhoto3x4File, set: setApplyPhoto3x4File },
                        { label: t.diplomaTranscript, file: applyBirthCertFile, set: setApplyBirthCertFile },
                        { label: t.recommendationLetter, file: applyIdCardFile, set: setApplyIdCardFile },
                        { label: t.resume, file: applyForeignPassportFile, set: setApplyForeignPassportFile },
                        { label: '9-11 sinf attestati', file: applyAttestatFile, set: setApplyAttestatFile },
                      ].map((item, idx) => (
                        <label key={idx} className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                          item.file ? 'border-[#1E9E5A] bg-[#1E9E5A]/5' : 'border-[#E5E8EB] bg-white hover:border-[#D6B174]/50'
                        }`}>
                          <input type="file" accept="image/*,application/pdf" className="hidden"
                            onChange={(e) => item.set(e.target.files?.[0] || null)} />
                          {item.file ? <CheckCircle2 className="w-4 h-4 text-[#1E9E5A] shrink-0" /> : <Upload className="w-4 h-4 text-[#D6B174] shrink-0" />}
                          <span className="text-xs font-semibold text-[var(--bg-shell-2)] flex-1 truncate">{item.label}</span>
                          <span className="text-[10px] text-[#6A727D] truncate max-w-[90px]">{item.file ? item.file.name : 'Tanlang'}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {!applyProgram && (
                    <p className="text-[11px] text-[#E40016] font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Davom etish uchun yo'nalish tanlang
                    </p>
                  )}

                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsApplying(false)}
                      className="flex-1 bg-white border border-[#E5E8EB] text-[#212630] py-3.5 rounded-2xl font-bold text-xs hover:bg-[#F3F5F8] transition-colors"
                    >
                      ← Orqaga
                    </button>
                    <button
                      type="submit"
                      disabled={!applyProgram || isSubmittingApp}
                      className="flex-1 bg-[var(--bg-shell-2)] text-[#D6B174] hover:bg-[#B99056] hover:text-[#031222] py-3.5 rounded-2xl font-bold text-xs shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isSubmittingApp ? 'Yuborilmoqda...' : '✓ Ariza Yuborish'}
                    </button>
                  </div>
                </form>
              )}

            </div>

            {/* Footer triggers */}
            {!isApplying && (
              <div className="p-4 flex gap-3 shrink-0" style={{ background: 'var(--bg-card-soft)', borderTop: '1px solid var(--hairline-soft)' }}>
                <button 
                  onClick={() => toggleBookmark(selectedUni.id)}
                  className="flex-1 font-bold text-[#D6B174] py-3.5 rounded-2xl text-xs transition-all flex items-center justify-center space-x-2 hover:bg-[#D6B174]/10" style={{ border: '1px solid rgba(214,177,116,0.2)' }}
                >
                  <Bookmark className={`w-4 h-4 ${bookmarks.includes(selectedUni.id) ? 'fill-[#D6B174] text-[#D6B174]' : ''}`} />
                  <span>{bookmarks.includes(selectedUni.id) ? 'Saqlangan' : 'Saqlab Qo\'yish'}</span>
                </button>
                <button 
                  onClick={() => {
                    resetApplyForm();
                    setApplyContactPhone(user?.phone || '');
                    setApplyEmail(user?.username ? `${user.username}@eduvisa.uz` : '');
                    setIsApplying(true);
                  }}
                  className="flex-1 font-bold py-3.5 rounded-2xl text-xs transition-all flex items-center justify-center space-x-1.5" style={{ background: 'linear-gradient(135deg,#D6B174,#C49A52)', color: '#031222' }}
                >
                  <span>Ariza topshirish</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* GLOBAL TOAST ALERT POPUP */}
      {toast && (
        <div className={`fixed bottom-20 lg:bottom-6 right-4 z-50 px-5 py-3.5 rounded-2xl text-xs font-bold flex items-center space-x-2.5 shadow-2xl animate-slideIn ${
          toast.type === 'success' ? 'bg-[#1E9E5A] text-[var(--text-primary)]' :
          toast.type === 'error' ? 'bg-[#E40016] text-[var(--text-primary)]' : 'bg-[var(--bg-shell-2)] text-[#D6B174] border border-[#D6B174]/20'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}