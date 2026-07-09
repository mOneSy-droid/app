import React, { useState, useEffect } from 'react';
import logoImg from '../assets/images/1e1b7427-be65-4259-9138-0c35a07d43ef_removalai_preview.png';
import { 
  Users, 
  FileText, 
  ShieldCheck, 
  Search, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Eye, 
  EyeOff,
  LogOut, 
  ChevronRight, 
  UserCheck, 
  AlertCircle, 
  Filter, 
  Phone, 
  DollarSign, 
  Award,
  BookOpen,
  Calendar,
  Menu,
  X,
  User,
  Lock,
  GraduationCap,
  Plus,
  Globe,
  Trash2,
  ExternalLink,
  Building2,
  Receipt,
  Ban,
  ShieldOff,
  MapPin,
  Pencil
} from 'lucide-react';

interface Student {
  username: string;
  password?: string;
  plain_password?: string;
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
  is_banned?: boolean;
}

interface Application {
  id: string;
  universityId: string;
  universityName: string;
  universityCountry?: string;
  program: string;
  status: string;
  date: string;
  username: string;
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
  contactEmail?: string;
  contactPhone?: string;
  history: { status: string; date: string; note: string }[];
  documents: { name: string; type: string; status: string; url?: string }[];
}

interface DocumentItem {
  id?: string | number;
  name: string;
  type: string;
  size: string;
  status: string;
  url: string;
  username: string;
}

interface University {
  id: string;
  name: string;
  country: string;
  logo: string;
  budget: number;
  ielts: number;
  gpa: number;
  grantInfo: string;
  programs: string[];
  description: string;
}

interface Country {
  id: string;
  name: string;
  nameRu?: string | null;
  flag: string;
  coverImage?: string | null;
}

interface Faculty {
  id: string;
  universityId: string;
  name: string;
  description?: string | null;
}

interface Promotion {
  id: string;
  text: string;
  endDate: string;
  active: boolean;
}

interface Consultant {
  id: number;
  name: string;
  username?: string | null;
  phone?: string | null;
  email?: string | null;
  joinedAt: string;
}

interface ConsultantReportPeriod {
  count: number;
  revenue: number;
  active: string;
}

interface ConsultantReports {
  today: ConsultantReportPeriod;
  weekly: ConsultantReportPeriod;
  monthly: ConsultantReportPeriod;
}

interface ConsultantDetail {
  id: number;
  name: string;
  username: string | null;
  today_cnt: number;
  today_rev: number;
  weekly_cnt: number;
  monthly_cnt: number;
  monthly_rev: number;
  total_cnt: number;
}

interface AdminClientRecord {
  id: number;
  consultantId: number;
  consultantName: string;
  consultantUsername: string | null;
  name: string;
  phone: string;
  country: string;
  paymentType: string;
  amount: number;
  confirmedAt: string;
  status: string;
}

interface AdminPanelProps {
  token: string;
  onLogout: () => void;
  apiFetch: (endpoint: string, options?: any) => Promise<any>;
}

// Country flag mapping
const COUNTRY_FLAGS: Record<string, string> = {
  'Buyuk Britaniya': '🇬🇧', 'Germaniya': '🇩🇪', 'Xitoy': '🇨🇳',
  'Janubiy Koreya': '🇰🇷', 'Avstraliya': '🇦🇺', 'Singapur': '🇸🇬',
  'AQSh': '🇺🇸', 'Yaponiya': '🇯🇵', 'Fransiya': '🇫🇷', 'Kanada': '🇨🇦',
  'Gollandiya': '🇳🇱', 'Shvetsiya': '🇸🇪', 'Italiya': '🇮🇹', 'Ispaniya': '🇪🇸',
  'Chexiya': '🇨🇿', 'Polsha': '🇵🇱', 'Avstriya': '🇦🇹', 'Shveytsariya': '🇨🇭',
};

const COUNTRY_CSS: Record<string, string> = {
  'Buyuk Britaniya': 'country-gb', 'Germaniya': 'country-de', 'Xitoy': 'country-cn',
  'Janubiy Koreya': 'country-kr', 'Avstraliya': 'country-au', 'Singapur': 'country-sg',
  'AQSh': 'country-us', 'Yaponiya': 'country-jp',
};

export default function AdminPanel({ token, onLogout, apiFetch }: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'students' | 'applications' | 'documents' | 'universities' | 'countries' | 'faculties' | 'promotions' | 'consultants' | 'consultant-results'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  
  // Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Search & Filter state
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [appSearch, setAppSearch] = useState<string>('');
  const [appFilterStatus, setAppFilterStatus] = useState<string>('all');
  const [docFilterStatus, setDocFilterStatus] = useState<string>('all');
  const [uniFilterCountry, setUniFilterCountry] = useState<string>('Barchasi');

  // Selected entities for modals / actions
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [appDetailUsername, setAppDetailUsername] = useState<string | null>(null);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [showStudentPassword, setShowStudentPassword] = useState<boolean>(false);
  const [updatingApp, setUpdatingApp] = useState<Application | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusNote, setStatusNote] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [banLoading, setBanLoading] = useState<boolean>(false);
  const [ipLocation, setIpLocation] = useState<{ ip: string | null; location: any | null } | null>(null);
  const [ipLoading, setIpLoading] = useState<boolean>(false);

  // University Add Modal
  const [showAddUni, setShowAddUni] = useState<boolean>(false);
  const [addUniName, setAddUniName] = useState('');
  const [addUniCountry, setAddUniCountry] = useState('');
  const [addUniLogo, setAddUniLogo] = useState('🏫');
  const [addUniBudget, setAddUniBudget] = useState('');
  const [addUniIelts, setAddUniIelts] = useState('');
  const [addUniGpa, setAddUniGpa] = useState('');
  const [addUniGrant, setAddUniGrant] = useState('');
  const [addUniPrograms, setAddUniPrograms] = useState('Bakalavr');
  const [addUniDesc, setAddUniDesc] = useState('');
  const [addUniLoading, setAddUniLoading] = useState(false);
  const [uniToDelete, setUniToDelete] = useState<University | null>(null);
  const [countryToDelete, setCountryToDelete] = useState<Country | null>(null);

  // Country / Faculty / Promotion forms
  const [countryName, setCountryName] = useState('');
  const [countryFlag, setCountryFlag] = useState('🏳️');
  const [countryCover, setCountryCover] = useState('');
  const [countryCoverFile, setCountryCoverFile] = useState<File | null>(null);
  const [countryCoverPreview, setCountryCoverPreview] = useState('');
  const [countryCoverUploading, setCountryCoverUploading] = useState(false);
  const [editingCountryId, setEditingCountryId] = useState<string | null>(null);
  const [countryNameRu, setCountryNameRu] = useState('');
  const [facultyUniversityId, setFacultyUniversityId] = useState('');
  const [facultyName, setFacultyName] = useState('');
  const [facultyDescription, setFacultyDescription] = useState('');
  const [promotionText, setPromotionText] = useState('');
  const [promotionEndDate, setPromotionEndDate] = useState('');
  const [countryLoading, setCountryLoading] = useState(false);
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [consultantName, setConsultantName] = useState('');
  const [consultantUsername, setConsultantUsername] = useState('');
  const [consultantPhone, setConsultantPhone] = useState('');
  const [consultantEmail, setConsultantEmail] = useState('');
  const [consultantId, setConsultantId] = useState('');
  const [consultantLoading, setConsultantLoading] = useState(false);
  const [consultantReports, setConsultantReports] = useState<ConsultantReports | null>(null);
  const [consultantRanking, setConsultantRanking] = useState<Array<[string, number, number]>>([]);
  const [consultantDetails, setConsultantDetails] = useState<ConsultantDetail[]>([]);
  const [adminClients, setAdminClients] = useState<AdminClientRecord[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load all admin data
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [studentList, appList, docList, uniList, countryList, facultyList, promoList, consultantList] = await Promise.all([
        apiFetch('/api/admin/students'),
        apiFetch('/api/admin/applications'),
        apiFetch('/api/admin/documents'),
        apiFetch('/api/admin/universities'),
        apiFetch('/api/admin/countries'),
        apiFetch('/api/admin/faculties'),
        apiFetch('/api/admin/promotions'),
        apiFetch('/api/admin/consultants')
      ]);
      setStudents(studentList);
      setApplications(appList);
      setDocuments(docList);
      setUniversities(uniList);
      setCountries(countryList);
      setFaculties(facultyList);
      setPromotions(promoList);
      setConsultants(consultantList);
    } catch (err) {
      console.error('Admin data load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Consultantlar bo'yicha hisobot/reyting/broadcast — faqat "Consultantlar" tabi
  // ochilganda yuklanadi (boshqa tablarga hech qanday ta'sir qilmaydi).
  const loadConsultantReports = async () => {
    try {
      setReportsLoading(true);
      const [res, clientsList] = await Promise.all([
        apiFetch('/api/admin/consultants/reports'),
        apiFetch('/api/admin/clients')
      ]);
      setConsultantReports(res.reports);
      setConsultantRanking(res.ranking || []);
      setConsultantDetails(res.details || []);
      setAdminClients(clientsList || []);
    } catch (err) {
      console.error('Consultant reports load error:', err);
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'consultants' || activeSubTab === 'consultant-results') {
      loadConsultantReports();
    }
  }, [activeSubTab]);

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      showToast('Xabar matni kiritilishi shart', 'error');
      return;
    }
    try {
      setBroadcastLoading(true);
      const res = await apiFetch('/api/admin/consultants/broadcast', {
        method: 'POST',
        body: JSON.stringify({ message: broadcastMessage.trim() })
      });
      if (res.success) {
        showToast(`Yuborildi: ${res.sent} ta, xato: ${res.failed} ta`, 'success');
        setBroadcastMessage('');
      } else {
        showToast(res.error || 'Broadcast yuborishda xatolik', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Broadcast yuborishda xatolik', 'error');
    } finally {
      setBroadcastLoading(false);
    }
  };

  // Update Application status
  const handleUpdateAppStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingApp || !newStatus) return;
    try {
      setActionLoading(true);
      const res = await apiFetch(`/api/admin/applications/${updatingApp.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          note: statusNote || `Status o'zgartirildi: ${newStatus}`
        })
      });
      if (res.success) {
        setApplications(prev => prev.map(a => a.id === updatingApp.id
          ? { ...a, status: newStatus, history: [{ status: newStatus, date: new Date().toISOString().split('T')[0], note: statusNote || `Status o'zgartirildi` }, ...a.history] }
          : a
        ));
        setUpdatingApp(null);
        setNewStatus('');
        setStatusNote('');
        loadData(true);
      }
    } catch {
      showToast('Arizani yangilashda xatolik', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Update Document Status
  const handleUpdateDocStatus = async (docId: string | number, status: string) => {
    try {
      setRefreshing(true);
      const res = await apiFetch(`/api/admin/documents/${docId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      if (res.success) {
        setDocuments(prev => prev.map(d => d.id === docId ? { ...d, status } : d));
        loadData(true);
      }
    } catch {
      showToast('Hujjat holatini yangilashda xatolik', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleDownloadApplicationZip = async (appId: string) => {
    try {
      setRefreshing(true);
      const res = await fetch(`/api/applications/${appId}/zip`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'ZIP faylni yuklab olishda xatolik yuz berdi' }));
        throw new Error(errData.error || 'ZIP faylni yuklab olishda xatolik yuz berdi');
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
      showToast('ZIP fayl muvaffaqiyatli yuklandi', 'success');
    } catch (err: any) {
      showToast(err.message || 'ZIP faylni yuklab olishda xatolik yuz berdi', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const openDocFile = async (url: string) => {
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
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Add University
  const handleAddUniversity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUniName.trim() || !addUniCountry.trim()) {
      showToast('Nomi va davlat kiritilishi shart', 'error');
      return;
    }
    try {
      setAddUniLoading(true);
      const programs = addUniPrograms.split(',').map(p => p.trim()).filter(Boolean);
      const res = await apiFetch('/api/admin/universities', {
        method: 'POST',
        body: JSON.stringify({
          name: addUniName,
          country: addUniCountry,
          logo: addUniLogo || COUNTRY_FLAGS[addUniCountry] || '🏫',
          budget: addUniBudget ? Number(addUniBudget) : 5000,
          ielts: addUniIelts ? Number(addUniIelts) : 0,
          gpa: addUniGpa ? Number(addUniGpa) : 0,
          grantInfo: addUniGrant,
          programs,
          description: addUniDesc
        })
      });
      if (res.success) {
        setUniversities(prev => [...prev, res.university]);
        showToast(`${res.university.name} muvaffaqiyatli qo'shildi!`);
        setShowAddUni(false);
        // Reset form
        setAddUniName(''); setAddUniCountry(''); setAddUniLogo('🏫');
        setAddUniBudget(''); setAddUniIelts(''); setAddUniGpa('');
        setAddUniGrant(''); setAddUniPrograms('Bakalavr'); setAddUniDesc('');
      }
    } catch {
      showToast("Universitetni qo'shishda xatolik", 'error');
    } finally {
      setAddUniLoading(false);
    }
  };

  // Delete University
  const handleDeleteUniversity = async (uni: University) => {
    try {
      await apiFetch(`/api/admin/universities/${uni.id}`, { method: 'DELETE' });
      setUniversities(prev => prev.filter(u => u.id !== uni.id));
      setUniToDelete(null);
      showToast(`${uni.name} o'chirildi`);
    } catch {
      showToast("O'chirishda xatolik", 'error');
    }
  };

  // Delete Country
  const broadcastCountriesUpdate = () => {
    localStorage.setItem('eduvisa:countries:updated', String(Date.now()));
    window.dispatchEvent(new CustomEvent('eduvisa:countries:updated'));
  };

  const handleDeleteCountry = async (country: Country) => {
    try {
      await apiFetch(`/api/admin/countries/${country.id}`, { method: 'DELETE' });
      setCountries(prev => prev.filter(c => c.id !== country.id));
      broadcastCountriesUpdate();
      setCountryToDelete(null);
      showToast(`${country.name} o'chirildi`);
    } catch {
      showToast("O'chirishda xatolik", 'error');
    }
  };

  // Cover rasmni kompyuterdan tanlaganda serverga yuklaydi va qaytgan URL'ni
  // countryCover'ga saqlaydi (ko'p tashqi rasm manzillari hotlink qilishni
  // qo'llab-quvvatlamagani sababli, endi rasm to'g'ridan-to'g'ri fayl sifatida
  // bizning serverimizga yuklanadi).
  const handleCountryCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Faqat rasm fayllarini yuklash mumkin', 'error');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast('Rasm hajmi 15MB dan oshmasligi kerak', 'error');
      return;
    }

    setCountryCoverFile(file);
    setCountryCoverPreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append('image', file);

    try {
      setCountryCoverUploading(true);
      const res = await apiFetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData
      });
      if (res.success) {
        setCountryCover(res.url);
      }
    } catch (err: any) {
      showToast(err.message || 'Rasm yuklashda xatolik yuz berdi', 'error');
      setCountryCoverFile(null);
      setCountryCoverPreview('');
    } finally {
      setCountryCoverUploading(false);
    }
  };

  // Add or Save (edit) Country — bitta forma ikkala holatda ham ishlaydi.
  // Nomi (uz) o'zgartirilsa va ruscha nomi qo'lda kiritilmasa, server tomonida
  // avtomatik ravishda ruscha tarjimasi ham yangilanadi.
  const handleAddCountry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countryName.trim()) {
      showToast('Davlat nomi kiritilishi shart', 'error');
      return;
    }
    try {
      setCountryLoading(true);
      if (editingCountryId) {
        const res = await apiFetch(`/api/admin/countries/${editingCountryId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: countryName,
            nameRu: countryNameRu.trim() || undefined,
            flag: countryFlag,
            coverImage: countryCover || null
          })
        });
        if (res.success) {
          setCountries(prev => prev.map(c => c.id === res.country.id ? res.country : c));
          broadcastCountriesUpdate();
          showToast(`${res.country.name} yangilandi`, 'success');
          cancelEditCountry();
        }
      } else {
        const res = await apiFetch('/api/admin/countries', {
          method: 'POST',
          body: JSON.stringify({
            name: countryName,
            flag: countryFlag,
            coverImage: countryCover || null
          })
        });
        if (res.success) {
          setCountries(prev => [...prev, res.country]);
          broadcastCountriesUpdate();
          showToast(`${res.country.name} qo'shildi`, 'success');
          cancelEditCountry();
        }
      }
    } catch {
      showToast(editingCountryId ? 'Davlatni yangilashda xatolik' : 'Davlat qo\u2018shishda xatolik', 'error');
    } finally {
      setCountryLoading(false);
    }
  };

  // Tahrirlash formasini tanlangan davlat ma'lumotlari bilan to'ldirish
  const startEditCountry = (country: Country) => {
    setEditingCountryId(country.id);
    setCountryName(country.name);
    setCountryNameRu(country.nameRu || '');
    setCountryFlag(country.flag || '🏳️');
    setCountryCover(country.coverImage || '');
    setCountryCoverFile(null);
    setCountryCoverPreview('');
  };

  // Forma holatini tozalash (yangi qo'shish rejimiga qaytarish)
  const cancelEditCountry = () => {
    setEditingCountryId(null);
    setCountryName('');
    setCountryNameRu('');
    setCountryFlag('🏳️');
    setCountryCover('');
    setCountryCoverFile(null);
    setCountryCoverPreview('');
  };

  // Add Faculty
  const handleAddFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facultyUniversityId || !facultyName.trim()) {
      showToast('Universitet va fakultet nomini kiriting', 'error');
      return;
    }
    try {
      setFacultyLoading(true);
      const res = await apiFetch('/api/admin/faculties', {
        method: 'POST',
        body: JSON.stringify({
          universityId: facultyUniversityId,
          name: facultyName,
          description: facultyDescription
        })
      });
      if (res.success) {
        setFaculties(prev => [...prev, res.faculty]);
        showToast(`${res.faculty.name} fakulteti qo'shildi`, 'success');
        setFacultyUniversityId('');
        setFacultyName('');
        setFacultyDescription('');
        try {
          window.dispatchEvent(new CustomEvent('eduvisa:faculties:updated'));
        } catch (e) {
          // ignore in non-browser or older browsers
        }
      }
    } catch {
      showToast('Fakultet qo‘shishda xatolik', 'error');
    } finally {
      setFacultyLoading(false);
    }
  };

  // Add Promotion
  const handleAddPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promotionText.trim() || !promotionEndDate) {
      showToast('Aksiya matni va tugash sanasini kiriting', 'error');
      return;
    }
    try {
      setPromotionLoading(true);
      const res = await apiFetch('/api/admin/promotions', {
        method: 'POST',
        body: JSON.stringify({
          text: promotionText,
          endDate: promotionEndDate
        })
      });
      if (res.success) {
        setPromotions(prev => [...prev, res.promotion]);
        showToast('Aksiya qo‘shildi', 'success');
        setPromotionText('');
        setPromotionEndDate('');
      }
    } catch {
      showToast('Aksiya qo‘shishda xatolik', 'error');
    } finally {
      setPromotionLoading(false);
    }
  };

  // Stats
  const totalStudents = students.length;
  const pendingApps = applications.filter(a => a.status.includes('Ko\'rib chiqilyapti') || a.status.includes('start')).length;
  const acceptedApps = applications.filter(a => a.status.includes('Tasdiqlangan') || a.status.includes('Qabul')).length;
  const pendingDocs = documents.filter(d => d.status === 'Yuklangan' || d.status === 'Kutilmoqda').length;
  const verifiedDocs = documents.filter(d => d.status === 'Tasdiqlangan').length;

  // Filtered
  const filteredStudents = students.filter(s => {
    const term = studentSearch.toLowerCase();
    return s.firstName.toLowerCase().includes(term) || s.lastName.toLowerCase().includes(term) ||
      s.phone.includes(term) || s.username.toLowerCase().includes(term);
  });

  const filteredApps = applications.filter(a => {
    const term = appSearch.toLowerCase();
    const student = students.find(s => s.username === a.username);
    const studentName = student ? `${student.firstName} ${student.lastName}` : '';
    const matchesSearch = a.universityName.toLowerCase().includes(term) ||
      a.program.toLowerCase().includes(term) || a.username.toLowerCase().includes(term) ||
      studentName.toLowerCase().includes(term);
    const matchesStatus =
      appFilterStatus === 'all' ? true :
      appFilterStatus === 'pending' ? (a.status.includes('Ko\'rib') || a.status.includes('start')) :
      appFilterStatus === 'accepted' ? (a.status.includes('Tasdiqlangan') || a.status.includes('Qabul')) :
      appFilterStatus === 'rejected' ? a.status.includes('Rad') : true;
    return matchesSearch && matchesStatus;
  });

  const appGroupMap = new Map<string, { username: string; apps: Application[] }>();
  filteredApps.forEach(app => {
    if (!appGroupMap.has(app.username)) appGroupMap.set(app.username, { username: app.username, apps: [] });
    appGroupMap.get(app.username)!.apps.push(app);
  });
  const studentAppGroups = Array.from(appGroupMap.values())
    .sort((a, b) => (b.apps[0]?.date || '').localeCompare(a.apps[0]?.date || ''));

  const filteredDocs = documents.filter(d => {
    return docFilterStatus === 'all' ? true :
      docFilterStatus === 'verified' ? d.status === 'Tasdiqlangan' :
      docFilterStatus === 'pending' ? (d.status === 'Yuklangan' || d.status === 'Kutilmoqda' || d.status === 'Yuborilgan') :
      docFilterStatus === 'rejected' ? d.status === 'Rad etilgan' : true;
  });

  // Filter tab'lari faqat davlatlar jadvalidagi maxsus ro'yxat bilan to'ldiriladi.
  const countriesInUni = Array.from(new Set(countries.map(c => c.name)));
  const filteredUniversities = uniFilterCountry === 'Barchasi' ? universities
    : universities.filter(u => u.country === uniFilterCountry);

  // ----- RENDER -----
  return (
    <div className="min-h-screen text-[var(--text-primary)] font-sans flex flex-col lg:flex-row w-full" style={{ background: 'linear-gradient(135deg, var(--bg-shell-1) 0%, var(--bg-shell-2) 50%, var(--bg-shell-3) 100%)' }}>
      
      {/* ===== SIDEBAR ===== */}
      <aside className="w-full lg:w-72 flex flex-col lg:h-screen sticky top-0 shrink-0 z-20"
        style={{ background: 'linear-gradient(180deg, var(--bg-shell-1) 0%, var(--bg-shell-2) 100%)', borderRight: '1px solid rgba(214,177,116,0.1)' }}>
        
        {/* Logo Row */}
        <div className="p-4 lg:p-6 flex items-center justify-between lg:block border-b border-white/5">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="EDUVISA" className="h-9 w-9 object-contain rounded-xl shrink-0" referrerPolicy="no-referrer" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[#D6B174] text-xl font-bold tracking-tight font-display">EDUVISA</span>
                <span className="text-[8px] bg-[#D6B174] text-[#031222] rounded px-1.5 py-0.5 uppercase tracking-widest font-bold">ADMIN</span>
              </div>
              <p className="text-[var(--text-muted)] text-[9px] uppercase tracking-widest mt-0.5">Boshqaruv Markazi</p>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="bg-white/5 hover:bg-white/10 text-white/85 p-2 rounded-lg transition-colors border border-white/10">
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <button onClick={onLogout} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-lg transition-colors border border-red-500/20">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 px-3 py-2 space-y-0.5 lg:block ${mobileMenuOpen ? 'block pb-4' : 'hidden'}`}>
          {[
            { key: 'dashboard', label: 'Boshqaruv Paneli', Icon: Users },
            { key: 'students', label: 'Talabalar', Icon: UserCheck, badge: students.length },
            { key: 'applications', label: 'Arizalar', Icon: FileText, badge: pendingApps, badgeColor: 'bg-amber-500 text-[#031222]' },
            { key: 'documents', label: 'Hujjatlar', Icon: ShieldCheck, badge: pendingDocs, badgeColor: 'bg-blue-500 text-[var(--text-primary)]' },
            { key: 'universities', label: 'Universitetlar', Icon: Building2, badge: universities.length },
            { key: 'countries', label: 'Davlatlar', Icon: Globe, badge: countries.length },
            { key: 'faculties', label: 'Fakultetlar', Icon: BookOpen, badge: faculties.length },
            { key: 'promotions', label: 'Aksiyalar', Icon: Award, badge: promotions.length },
            { key: 'consultants', label: 'Consultantlar', Icon: User, badge: consultants.length },
            { key: 'consultant-results', label: 'Consultant natijalari', Icon: Receipt, badge: adminClients.length },
          ].map(({ key, label, Icon, badge, badgeColor }) => (
            <button key={key}
              onClick={() => { setActiveSubTab(key as any); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs lg:text-sm font-semibold transition-all ${
                activeSubTab === key
                  ? 'text-[var(--text-primary)] border-l-4 border-[#D6B174]'
                  : 'text-white/50 hover:text-[var(--text-primary)]'
              }`}
              style={activeSubTab === key ? { background: 'rgba(214,177,116,0.08)' } : {}}
            >
              <Icon className="w-4 h-4 shrink-0 text-[#D6B174]" />
              <span className="flex-1 text-left">{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badgeColor || 'bg-white/10 text-[var(--text-primary)]'}`}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Admin Identity */}
        <div className="hidden lg:flex p-5 border-t items-center gap-3" style={{ borderColor: 'rgba(214,177,116,0.1)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[#D6B174] font-bold text-xs shrink-0"
            style={{ background: 'rgba(214,177,116,0.15)', border: '1px solid rgba(214,177,116,0.3)' }}>ADM</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[var(--text-primary)] truncate">Administrator</p>
            <p className="text-[10px] text-[var(--text-muted)] truncate">admin@eduvisa.uz</p>
          </div>
          <button onClick={onLogout} className="text-[var(--text-muted)] hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ===== MAIN PANEL ===== */}
      <main className="flex-1 p-5 lg:p-8 overflow-y-auto lg:h-screen">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-7 gap-4">
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-[var(--text-primary)] font-display">
              {activeSubTab === 'dashboard' && 'EduVisa Boshqaruv Markazi'}
              {activeSubTab === 'students' && "Talabalar Ma'lumotlar Bazasi"}
              {activeSubTab === 'applications' && "Arizalar ro'yxati"}
              {activeSubTab === 'documents' && 'Hujjatlarni tekshirish'}
              {activeSubTab === 'universities' && 'Universitetlar boshqaruvi'}
              {activeSubTab === 'consultants' && 'Consultantlar boshqaruvi'}
              {activeSubTab === 'consultant-results' && 'Consultant natijalari'}
            </h1>
            <p className="text-[var(--text-muted)] text-xs mt-0.5">Haqiqiy vaqt rejimida boshqarish</p>
          </div>
          <div className="flex gap-2">
            {activeSubTab === 'universities' && (
              <button onClick={() => setShowAddUni(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: 'linear-gradient(135deg,#D6B174,#C49A52)', color: '#031222' }}>
                <Plus className="w-4 h-4" />
                <span>Universitet qo'shish</span>
              </button>
            )}
            <button onClick={() => loadData(true)} disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 shrink-0"
              style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.15)', color: '#D6B174' }}>
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Yangilash</span>
            </button>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-80">
            <RefreshCw className="w-10 h-10 text-[#D6B174] animate-spin mb-4" />
            <p className="text-[var(--text-muted)] text-sm font-semibold">Yuklanmoqda...</p>
          </div>
        ) : (
          <>
            {/* ===== DASHBOARD ===== */}
            {activeSubTab === 'dashboard' && (
              <div className="space-y-7 animate-fadeIn">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Jami Talabalar', value: `${totalStudents} ta`, icon: Users, color: 'from-blue-600 to-blue-800', glow: 'rgba(59,130,246,0.2)' },
                    { label: "Ko'rib chiqilyapti", value: `${pendingApps} ta`, icon: FileText, color: 'from-amber-500 to-amber-700', glow: 'rgba(245,158,11,0.2)' },
                    { label: 'Tasdiqlanganlar', value: `${acceptedApps} ta`, icon: CheckCircle, color: 'from-emerald-500 to-emerald-700', glow: 'rgba(16,185,129,0.2)' },
                    { label: 'Kutilayotgan Hujjat', value: `${pendingDocs} ta`, icon: ShieldCheck, color: 'from-purple-500 to-purple-700', glow: 'rgba(139,92,246,0.2)' },
                  ].map(({ label, value, icon: Icon, color, glow }) => (
                    <div key={label} className="p-5 rounded-2xl flex items-center gap-4 transition-all hover:scale-[1.02]"
                      style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)', boxShadow: `0 4px 20px ${glow}` }}>
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
                        <Icon className="w-5 h-5 text-[var(--text-primary)]" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
                        <h3 className="text-xl font-bold text-[var(--text-primary)] mt-0.5">{value}</h3>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent Applications + Quick Stats */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-7">
                  <div className="xl:col-span-2 rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                    <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'rgba(214,177,116,0.08)' }}>
                      <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">So'nggi Arizalar</h3>
                      <button onClick={() => setActiveSubTab('applications')} className="text-[#D6B174] text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all">
                        Barchasi <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="divide-y" style={{ borderColor: 'var(--hairline-soft)' }}>
                      {applications.length === 0 ? (
                        <div className="p-8 text-center text-[var(--text-muted)] text-xs">Arizalar mavjud emas</div>
                      ) : applications.slice(0, 5).map(app => {
                        const student = students.find(s => s.username === app.username);
                        return (
                          <div key={app.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-white/3 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-[#D6B174] shrink-0"
                                style={{ background: 'rgba(214,177,116,0.1)', border: '1px solid rgba(214,177,116,0.2)' }}>
                                {student ? `${student.firstName[0]}${student.lastName[0]}` : '??'}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">{student ? `${student.firstName} ${student.lastName}` : app.username}</h4>
                                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{app.universityName} — {app.program}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[var(--text-muted)] font-mono">{app.date}</span>
                              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                                app.status.includes('🟡') ? 'bg-amber-500/15 text-amber-400' :
                                app.status.includes('🟢') ? 'bg-emerald-500/15 text-emerald-400' :
                                'bg-red-500/15 text-red-400'
                              }`}>{app.status}</span>
                              <button onClick={() => { setUpdatingApp(app); setNewStatus(app.status); }}
                                className="text-[10px] px-2.5 py-1.5 rounded-lg font-bold transition-all text-[#D6B174] hover:bg-[#D6B174]/10"
                                style={{ border: '1px solid rgba(214,177,116,0.2)' }}>
                                Boshqarish
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick info */}
                      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] mb-3">O'rtacha Ko'rsatkichlar</h4>
                      <div className="space-y-2 text-xs">
                        {[
                          { label: "IELTS O'rtacha", value: (students.filter(s => s.ielts_score).reduce((a, s) => a + (s.ielts_score || 0), 0) / (students.filter(s => s.ielts_score).length || 1)).toFixed(1) },
                          { label: "GPA O'rtacha", value: (students.filter(s => s.gpa).reduce((a, s) => a + (s.gpa || 0), 0) / (students.filter(s => s.gpa).length || 1)).toFixed(2) },
                          { label: "Universitetlar", value: `${universities.length} ta` },
                          { label: "Consultantlar", value: `${consultants.length} ta` },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between items-center">
                            <span className="text-[var(--text-muted)]">{label}:</span>
                            <span className="font-bold font-mono text-[var(--text-primary)]">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
              </div>
            )}

            {/* ===== STUDENTS ===== */}
            {activeSubTab === 'students' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between"
                  style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                  <div className="relative w-full md:w-96">
                    <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="Talaba ismi, username yoki telefon..."
                      value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-soft)' }} />
                  </div>
                  <div className="text-xs text-[var(--text-muted)] font-bold">Jami {filteredStudents.length} ta talaba</div>
                </div>

                {/* Mobile Cards */}
                <div className="block md:hidden space-y-3">
                  {filteredStudents.map(student => (
                    <div key={student.username} className="p-4 rounded-2xl space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.08)' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-[#D6B174] shrink-0"
                            style={{ background: 'rgba(214,177,116,0.1)', border: '1px solid rgba(214,177,116,0.2)' }}>
                            {student.firstName[0]}{student.lastName[0]}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">{student.firstName} {student.lastName}</h4>
                            <p className="text-[10px] text-[var(--text-muted)] font-mono">@{student.username}</p>
                          </div>
                        </div>
                        <button onClick={() => { setSelectedStudent(student); setShowStudentPassword(false); }}
                          className="text-[11px] px-3 py-1.5 rounded-lg font-bold transition-all text-[#D6B174]"
                          style={{ background: 'rgba(214,177,116,0.1)', border: '1px solid rgba(214,177,116,0.2)' }}>
                          Ko'rish
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-xl" style={{ background: 'var(--bg-card-soft)' }}>
                        <div><span className="text-[var(--text-muted)] block text-[9px] uppercase tracking-wider font-bold">Telefon</span><span className="font-mono text-[var(--text-primary)]">{student.phone}</span></div>
                        <div><span className="text-[var(--text-muted)] block text-[9px] uppercase tracking-wider font-bold">Byudjet</span><span className="font-bold text-emerald-400">{student.budget ? `$${student.budget.toLocaleString()}` : 'Bepul'}</span></div>
                        <div><span className="text-[var(--text-muted)] block text-[9px] uppercase tracking-wider font-bold">IELTS</span>{student.ielts_score ? <span className="bg-blue-500/20 text-blue-400 font-bold px-1.5 py-0.5 rounded text-[10px] font-mono mt-0.5 inline-block">{student.ielts_score}</span> : <span className="text-[var(--text-muted)]">Yo'q</span>}</div>
                        <div><span className="text-[var(--text-muted)] block text-[9px] uppercase tracking-wider font-bold">GPA</span>{student.gpa ? <span className="bg-purple-500/20 text-purple-400 font-bold px-1.5 py-0.5 rounded text-[10px] font-mono mt-0.5 inline-block">{student.gpa}</span> : <span className="text-[var(--text-muted)]">Yo'q</span>}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.08)' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider" style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                          {['F.I.SH', 'Username', 'Telefon', 'IELTS', 'GPA', 'Byudjet', 'Harakat'].map(h => (
                            <th key={h} className="py-4 px-5">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.length === 0 ? (
                          <tr><td colSpan={7} className="py-8 text-center text-[var(--text-muted)] text-xs">Talabalar topilmadi</td></tr>
                        ) : filteredStudents.map(student => (
                        <tr key={student.username} className="hover:bg-white/2 transition-colors text-xs" style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-[#D6B174]"
                                  style={{ background: 'rgba(214,177,116,0.1)' }}>
                                  {student.firstName[0]}{student.lastName[0]}
                                </div>
                                <div>
                                  <span className="font-bold text-[var(--text-primary)]">{student.firstName} {student.lastName}</span>
                                  {student.is_banned && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">BLOKLANGAN</span>}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-5 font-mono text-[var(--text-muted)]">@{student.username}</td>
                            <td className="py-4 px-5 font-mono text-[var(--text-primary)]">{student.phone}</td>
                            <td className="py-4 px-5">{student.ielts_score ? <span className="bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded font-mono">{student.ielts_score}</span> : <span className="text-[var(--text-muted)]">—</span>}</td>
                            <td className="py-4 px-5">{student.gpa ? <span className="bg-purple-500/20 text-purple-400 font-bold px-2 py-0.5 rounded font-mono">{student.gpa}</span> : <span className="text-[var(--text-muted)]">—</span>}</td>
                            <td className="py-4 px-5 font-mono text-emerald-400 font-bold">{student.budget ? `$${student.budget.toLocaleString()}` : 'Bepul'}</td>
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => { setSelectedStudent(student); setShowStudentPassword(false); setIpLocation(null); loadIpLocation(student.username); }}
                                  className="text-[#D6B174] text-[10px] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:bg-[#D6B174]/10"
                                  style={{ border: '1px solid rgba(214,177,116,0.2)' }}>
                                  <Eye className="w-3.5 h-3.5" /> Ko'rish
                                </button>
                                <button onClick={() => handleBanUser(student, !student.is_banned)} disabled={banLoading}
                                  className={`text-[10px] font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all ${student.is_banned ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-red-400 hover:bg-red-500/10'}`}
                                  style={{ border: `1px solid ${student.is_banned ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'}` }}
                                  title={student.is_banned ? 'Blokdan chiqarish' : 'Bloklash'}>
                                  {student.is_banned ? <ShieldOff className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ===== APPLICATIONS ===== */}
            {activeSubTab === 'applications' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between"
                  style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                  <div className="relative w-full md:w-96">
                    <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="Talaba ismi, universitet yoki yo'nalish..."
                      value={appSearch} onChange={e => setAppSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-soft)' }} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Filter className="w-4 h-4 text-[var(--text-muted)]" />
                    {[
                      { key: 'all', label: 'Barchasi' }, { key: 'pending', label: "Ko'rib chiqilyapti" },
                      { key: 'accepted', label: 'Qabul qilinganlar' }, { key: 'rejected', label: 'Rad etilganlar' }
                    ].map(({ key, label }) => (
                      <button key={key} onClick={() => setAppFilterStatus(key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${appFilterStatus === key ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                        style={{ background: appFilterStatus === key ? 'rgba(214,177,116,0.2)' : 'var(--bg-card-soft)', border: `1px solid ${appFilterStatus === key ? 'rgba(214,177,116,0.4)' : 'var(--hairline-soft)'}` }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {studentAppGroups.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl text-[var(--text-muted)] text-xs"
                    style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.08)' }}>
                    Arizalar topilmadi
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {studentAppGroups.map(group => {
                      const student = students.find(s => s.username === group.username);
                      const latestApp = group.apps[0];
                      const hasPending = group.apps.some(a => a.status.includes('🟡'));
                      const hasAccepted = group.apps.some(a => a.status.includes('🟢'));
                      return (
                        <button key={group.username} onClick={() => setAppDetailUsername(group.username)}
                          className="text-left p-5 rounded-2xl transition-all hover:scale-[1.01] space-y-3"
                          style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-[#D6B174] shrink-0"
                              style={{ background: 'rgba(214,177,116,0.1)', border: '1px solid rgba(214,177,116,0.2)' }}>
                              {student ? `${student.firstName[0]}${student.lastName[0]}` : '??'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-[var(--text-primary)] text-sm truncate">{student ? `${student.firstName} ${student.lastName}` : group.username}</p>
                              <p className="text-[10px] text-[var(--text-muted)] font-mono">@{group.username}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--hairline-soft)' }}>
                            <span className="text-[10px] font-bold text-[var(--text-muted)]">{group.apps.length} ta ariza</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                              hasPending ? 'bg-amber-500/15 text-amber-400' :
                              hasAccepted ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                            }`}>{latestApp.status}</span>
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] truncate">So'nggi: <span className="font-semibold text-[var(--text-primary)]">{latestApp.universityName}</span></p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ===== DOCUMENTS ===== */}
            {activeSubTab === 'documents' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="p-4 rounded-2xl flex items-center justify-between"
                  style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Filter className="w-4 h-4 text-[var(--text-muted)]" />
                    {[
                      { key: 'all', label: 'Barcha Hujjatlar' }, { key: 'pending', label: 'Kutilayotganlar' },
                      { key: 'verified', label: 'Tasdiqlanganlar' }, { key: 'rejected', label: 'Rad etilganlar' }
                    ].map(({ key, label }) => (
                      <button key={key} onClick={() => setDocFilterStatus(key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${docFilterStatus === key ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                        style={{ background: docFilterStatus === key ? 'rgba(214,177,116,0.2)' : 'var(--bg-card-soft)', border: `1px solid ${docFilterStatus === key ? 'rgba(214,177,116,0.4)' : 'var(--hairline-soft)'}` }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] font-bold">{filteredDocs.length} ta hujjat</div>
                </div>

                {filteredDocs.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl text-[var(--text-muted)] text-xs"
                    style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.08)' }}>
                    Hujjatlar topilmadi
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredDocs.map(doc => {
                      const student = students.find(s => s.username === doc.username);
                      const isImage = doc.name.match(/\.(jpg|jpeg|png|webp|gif)$/i);
                      return (
                        <div key={`${doc.username}-${doc.name}`} className="p-5 rounded-2xl flex flex-col justify-between transition-all hover:scale-[1.01]"
                          style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="p-3 rounded-xl text-[var(--text-primary)] font-bold text-xs"
                                style={{ background: isImage ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)', border: `1px solid ${isImage ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)'}` }}>
                                {isImage ? '🖼️' : '📄'}
                              </div>
                              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                                doc.status === 'Tasdiqlangan' ? 'bg-emerald-500/15 text-emerald-400' :
                                doc.status === 'Rad etilgan' ? 'bg-red-500/15 text-red-400' :
                                'bg-amber-500/15 text-amber-400'
                              }`}>{doc.status}</span>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-[var(--text-primary)] line-clamp-1" title={doc.name}>{doc.name}</h4>
                              <p className="text-[10px] text-[var(--text-muted)] mt-1">Tur: <strong className="text-white/70">{doc.type}</strong> ({doc.size})</p>
                            </div>
                            <div className="flex items-center gap-2" style={{ borderTop: '1px solid var(--hairline-soft)', paddingTop: '0.75rem' }}>
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-[#D6B174]"
                                style={{ background: 'rgba(214,177,116,0.1)' }}>
                                {student ? `${student.firstName[0]}${student.lastName[0]}` : '??'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold text-[var(--text-primary)] truncate">{student ? `${student.firstName} ${student.lastName}` : doc.username}</p>
                                <p className="text-[9px] text-[var(--text-muted)]">@{doc.username}</p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--hairline-soft)' }}>
                            <button
                              onClick={() => void openDocFile(doc.url)}
                              className="flex-1 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 text-[#D6B174] hover:bg-[#D6B174]/10"
                              style={{ border: '1px solid rgba(214,177,116,0.2)' }}>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Faylni ko'rish</span>
                            </button>
                            {doc.status !== 'Tasdiqlangan' && (
                              <button onClick={() => void handleUpdateDocStatus(doc.id, 'Tasdiqlangan')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-[var(--text-primary)] p-2 rounded-xl transition-all" title="Tasdiqlash">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {doc.status !== 'Rad etilgan' && (
                              <button onClick={() => void handleUpdateDocStatus(doc.id, 'Rad etilgan')}
                                className="bg-red-600 hover:bg-red-700 text-[var(--text-primary)] p-2 rounded-xl transition-all" title="Rad etish">
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ===== UNIVERSITIES ===== */}
            {activeSubTab === 'universities' && (
              <div className="space-y-5 animate-fadeIn">
                {/* Country filter */}
                <div className="p-4 rounded-2xl flex flex-wrap gap-2 items-center"
                  style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                  <Globe className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-xs font-bold text-[var(--text-muted)]">Davlat:</span>
                  {['Barchasi', ...countriesInUni].map(c => (
                    <button key={c as string} onClick={() => setUniFilterCountry(c as string)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${uniFilterCountry === c ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                      style={{ background: uniFilterCountry === c ? 'rgba(214,177,116,0.2)' : 'var(--bg-card-soft)', border: `1px solid ${uniFilterCountry === c ? 'rgba(214,177,116,0.4)' : 'var(--hairline-soft)'}` }}>
                      {COUNTRY_FLAGS[c as string] || ''} {c as string}
                    </button>
                  ))}
                  <div className="ml-auto text-xs text-[var(--text-muted)] font-bold">{filteredUniversities.length} ta universitet</div>
                </div>

                {filteredUniversities.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl text-[var(--text-muted)] text-sm"
                    style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.08)' }}>
                    <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Hali universitet qo'shilmagan. "Universitet qo'shish" tugmasini bosing.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredUniversities.map(uni => (
                      <div key={uni.id} className="p-5 rounded-2xl flex flex-col justify-between transition-all hover:scale-[1.01] group"
                        style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <span className="text-3xl">{uni.logo}</span>
                            <button onClick={() => setUniToDelete(uni)}
                              className="p-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div>
                            <h4 className="font-display font-bold text-base text-[var(--text-primary)] group-hover:text-[#D6B174] transition-colors line-clamp-1">{uni.name}</h4>
                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{COUNTRY_FLAGS[uni.country] || '🌍'} {uni.country}</p>
                          </div>
                          {uni.description && <p className="text-[11px] text-[var(--text-muted-2)] leading-relaxed line-clamp-2">{uni.description}</p>}
                          <div className="flex flex-wrap gap-1.5">
                            {uni.programs.slice(0, 3).map(p => (
                              <span key={p} className="text-[9px] px-2 py-0.5 rounded-full font-bold text-[#D6B174]"
                                style={{ background: 'rgba(214,177,116,0.1)', border: '1px solid rgba(214,177,116,0.15)' }}>{p}</span>
                            ))}
                            {uni.programs.length > 3 && <span className="text-[9px] text-[var(--text-muted)]">+{uni.programs.length - 3}</span>}
                          </div>
                        </div>
                        <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--hairline-soft)' }}>
                          <div>
                            <span className="text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-wide block">Yillik Byudjet</span>
                            <span className="text-sm font-bold font-mono text-[var(--text-primary)]">${uni.budget.toLocaleString()}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-wide block">IELTS Talab</span>
                            <span className="text-sm font-bold text-[var(--text-primary)]">{uni.ielts > 0 ? uni.ielts + '+' : 'Shart emas'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===== COUNTRIES ===== */}
            {activeSubTab === 'countries' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="p-5 rounded-2xl grid gap-4 md:grid-cols-[1fr_320px]" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Davlatlar</h3>
                    <p className="text-xs text-[var(--text-muted)]">EduVisa uchun mavjud davlatlar ro'yxati va ularni qo'shish.</p>
                    <div className="grid grid-cols-1 gap-3">
                      {countries.length === 0 ? (
                        <p className="text-xs text-[#6A727D]">Hozircha davlatlar mavjud emas.</p>
                      ) : countries.map(country => (
                        <div key={country.id} className="p-3 rounded-2xl flex items-center justify-between" style={{ background: editingCountryId === country.id ? 'rgba(214,177,116,0.08)' : 'var(--bg-card)', border: `1px solid ${editingCountryId === country.id ? 'rgba(214,177,116,0.35)' : 'var(--hairline-soft)'}` }}>
                          <div>
                            <h4 className="text-sm text-[var(--text-primary)] font-bold">{country.flag} {country.name}</h4>
                            {country.nameRu && <p className="text-[10px] text-[var(--text-muted)]">RU: {country.nameRu}</p>}
                            {country.coverImage && <p className="text-[10px] text-[var(--text-muted)] truncate">{country.coverImage}</p>}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => startEditCountry(country)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[#D6B174] hover:bg-[#D6B174]/10 transition-colors">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setCountryToDelete(country)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <form onSubmit={handleAddCountry} className="space-y-4 p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }}>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#D6B174] uppercase tracking-wider">{editingCountryId ? 'Davlatni tahrirlash' : "Yangi davlat qo'shish"}</h4>
                      {editingCountryId && (
                        <button type="button" onClick={cancelEditCountry} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline">Bekor qilish</button>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6A727D] uppercase tracking-wider">Davlat nomi (o'zbekcha)</label>
                      <input value={countryName} onChange={e => setCountryName(e.target.value)} placeholder="Davlat nomi" className="w-full mt-2 px-3 py-2 rounded-xl bg-[var(--bg-shell-2)] border border-[var(--border-soft)] text-[var(--text-primary)] text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6A727D] uppercase tracking-wider">Ruscha nomi (ixtiyoriy — bo'sh qoldirsangiz avtomatik tarjima qilinadi)</label>
                      <input value={countryNameRu} onChange={e => setCountryNameRu(e.target.value)} placeholder="Например: Великобритания" className="w-full mt-2 px-3 py-2 rounded-xl bg-[var(--bg-shell-2)] border border-[var(--border-soft)] text-[var(--text-primary)] text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6A727D] uppercase tracking-wider">Bayroq</label>
                      <input value={countryFlag} onChange={e => setCountryFlag(e.target.value)} placeholder="🇺🇸" className="w-full mt-2 px-3 py-2 rounded-xl bg-[var(--bg-shell-2)] border border-[var(--border-soft)] text-[var(--text-primary)] text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6A727D] uppercase tracking-wider">Cover rasm</label>
                      <label className="mt-2 flex items-center justify-center gap-2 w-full px-3 py-3 rounded-xl bg-[var(--bg-shell-2)] border border-dashed border-[var(--border-soft)] text-[var(--text-muted)] text-xs font-bold cursor-pointer hover:border-[#D6B174]/50 hover:text-[var(--text-primary)] transition-colors">
                        {countryCoverUploading ? 'Yuklanmoqda...' : (countryCoverFile ? countryCoverFile.name : 'Kompyuterdan rasm tanlash')}
                        <input type="file" accept="image/*" onChange={handleCountryCoverFileChange} className="hidden" disabled={countryCoverUploading} />
                      </label>
                      {(countryCoverPreview || (editingCountryId && countryCover)) && (
                        <div className="mt-2 relative w-full h-28 rounded-xl overflow-hidden" style={{ border: '1px solid var(--hairline-strong)' }}>
                          <img src={countryCoverPreview || countryCover} alt="Cover preview" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => { setCountryCoverFile(null); setCountryCoverPreview(''); setCountryCover(''); }}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center bg-black/60 text-white">
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    <button type="submit" disabled={countryLoading || countryCoverUploading} className="w-full py-2.5 rounded-xl text-xs font-bold text-[#031222]" style={{ background: 'linear-gradient(135deg,#D6B174,#C49A52)' }}>
                      {countryLoading ? 'Saqlanmoqda...' : (countryCoverUploading ? 'Rasm yuklanmoqda...' : (editingCountryId ? 'Saqlash' : "Davlat qo\u2018shish"))}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ===== FACULTIES ===== */}
            {activeSubTab === 'faculties' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="p-5 rounded-2xl grid gap-4 md:grid-cols-[1fr_320px]" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Fakultetlar</h3>
                    <p className="text-xs text-[var(--text-muted)]">Universitetlar bo'yicha fakultet ro'yxatini boshqaring.</p>
                    <div className="space-y-3">
                      {faculties.length === 0 ? (
                        <p className="text-xs text-[#6A727D]">Hozircha fakultetlar mavjud emas.</p>
                      ) : faculties.map(fac => {
                        const uni = universities.find(u => u.id === fac.universityId);
                        return (
                          <div key={fac.id} className="p-3 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-soft)' }}>
                            <h4 className="text-sm font-bold text-[var(--text-primary)]">{fac.name}</h4>
                            <p className="text-[10px] text-[var(--text-muted)]">{uni ? uni.name : 'Universitet topilmadi'}</p>
                            {fac.description && <p className="text-[10px] text-[#6A727D] mt-1">{fac.description}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <form onSubmit={handleAddFaculty} className="space-y-4 p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }}>
                    <h4 className="text-xs font-bold text-[#D6B174] uppercase tracking-wider">Yangi fakultet qo'shish</h4>
                    <div>
                      <label className="text-[10px] text-[#6A727D] uppercase tracking-wider">Universitet</label>
                      <select value={facultyUniversityId} onChange={e => setFacultyUniversityId(e.target.value)} className="w-full mt-2 px-3 py-2 rounded-xl bg-[var(--bg-shell-2)] border border-[var(--border-soft)] text-[var(--text-primary)] text-sm">
                        <option value="">Universitetni tanlang</option>
                        {universities.map(uni => (
                          <option key={uni.id} value={uni.id}>{uni.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6A727D] uppercase tracking-wider">Fakultet nomi</label>
                      <input value={facultyName} onChange={e => setFacultyName(e.target.value)} placeholder="Fakultet nomi" className="w-full mt-2 px-3 py-2 rounded-xl bg-[var(--bg-shell-2)] border border-[var(--border-soft)] text-[var(--text-primary)] text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6A727D] uppercase tracking-wider">Ta'rif</label>
                      <textarea value={facultyDescription} onChange={e => setFacultyDescription(e.target.value)} placeholder="Fakultet ta'rifi" rows={3} className="w-full mt-2 px-3 py-2 rounded-xl bg-[var(--bg-shell-2)] border border-[var(--border-soft)] text-[var(--text-primary)] text-sm" />
                    </div>
                    <button type="submit" disabled={facultyLoading} className="w-full py-2.5 rounded-xl text-xs font-bold text-[#031222]" style={{ background: 'linear-gradient(135deg,#D6B174,#C49A52)' }}>
                      {facultyLoading ? 'Saqlanmoqda...' : 'Fakultet qo‘shish'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ===== PROMOTIONS ===== */}
            {activeSubTab === 'promotions' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="p-5 rounded-2xl grid gap-4 md:grid-cols-[1fr_320px]" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Aksiyalar</h3>
                    <p className="text-xs text-[var(--text-muted)]">Foydalanuvchilarga ko'rsatiladigan promo xabarlar.</p>
                    <div className="space-y-3">
                      {promotions.length === 0 ? (
                        <p className="text-xs text-[#6A727D]">Hozircha aksiya mavjud emas.</p>
                      ) : promotions.map(promo => (
                        <div key={promo.id} className="p-3 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-soft)' }}>
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="text-sm font-bold text-[var(--text-primary)]">{promo.text}</h4>
                            <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">{promo.active ? 'Faol' : 'Faol emas'}</span>
                          </div>
                          <p className="text-[10px] text-[#6A727D] mt-2">Tugash sanasi: {new Date(promo.endDate).toLocaleDateString('uz-UZ')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <form onSubmit={handleAddPromotion} className="space-y-4 p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }}>
                    <h4 className="text-xs font-bold text-[#D6B174] uppercase tracking-wider">Yangi aksiya qo'shish</h4>
                    <div>
                      <label className="text-[10px] text-[#6A727D] uppercase tracking-wider">Aksiya matni</label>
                      <textarea value={promotionText} onChange={e => setPromotionText(e.target.value)} placeholder="Aksiya / promo taklif matni" rows={4} className="w-full mt-2 px-3 py-2 rounded-xl bg-[var(--bg-shell-2)] border border-[var(--border-soft)] text-[var(--text-primary)] text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6A727D] uppercase tracking-wider">Tugash sanasi</label>
                      <input type="date" value={promotionEndDate} onChange={e => setPromotionEndDate(e.target.value)} className="w-full mt-2 px-3 py-2 rounded-xl bg-[var(--bg-shell-2)] border border-[var(--border-soft)] text-[var(--text-primary)] text-sm" />
                    </div>
                    <button type="submit" disabled={promotionLoading} className="w-full py-2.5 rounded-xl text-xs font-bold text-[#031222]" style={{ background: 'linear-gradient(135deg,#D6B174,#C49A52)' }}>
                      {promotionLoading ? 'Saqlanmoqda...' : 'Aksiya qo‘shish'}
                    </button>
                  </form>
                </div>
              </div>
            )}
            {activeSubTab === 'consultants' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between"
                  style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                  <div>
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">Consultantlar</h2>
                    <p className="text-[var(--text-muted)] text-xs mt-1">Consultantlarni qo'shish, ko'rib chiqish va o'chirish.</p>
                  </div>
                  <div className="grid gap-2 md:grid-cols-4 w-full md:w-auto">
                    <input value={consultantId} onChange={e => setConsultantId(e.target.value)}
                      placeholder="ID (Telegram chat ID yoki raqam)"
                      className="w-full px-4 py-2 rounded-xl bg-[var(--bg-card-soft)] border border-white/10 text-sm text-[var(--text-primary)]"
                    />
                    <input value={consultantName} onChange={e => setConsultantName(e.target.value)}
                      placeholder="Ism"
                      className="w-full px-4 py-2 rounded-xl bg-[var(--bg-card-soft)] border border-white/10 text-sm text-[var(--text-primary)]"
                    />
                    <input value={consultantPhone} onChange={e => setConsultantPhone(e.target.value)}
                      placeholder="Telefon"
                      className="w-full px-4 py-2 rounded-xl bg-[var(--bg-card-soft)] border border-white/10 text-sm text-[var(--text-primary)]"
                    />
                    <input value={consultantUsername} onChange={e => setConsultantUsername(e.target.value)}
                      placeholder="Telegram username (optional)"
                      className="w-full px-4 py-2 rounded-xl bg-[var(--bg-card-soft)] border border-white/10 text-sm text-[var(--text-primary)]"
                    />
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 w-full md:w-auto">
                    <input value={consultantEmail} onChange={e => setConsultantEmail(e.target.value)}
                      placeholder="Email (optional)"
                      className="w-full px-4 py-2 rounded-xl bg-[var(--bg-card-soft)] border border-white/10 text-sm text-[var(--text-primary)]"
                    />
                  </div>
                  <button onClick={async () => {
                    if (!consultantId.trim() || !consultantName.trim()) {
                      showToast('ID va ism kiritilishi shart', 'error');
                      return;
                    }
                    try {
                      setConsultantLoading(true);
                      const res = await apiFetch('/api/admin/consultants', {
                        method: 'POST',
                        body: JSON.stringify({
                          id: consultantId.trim(),
                          name: consultantName.trim(),
                          username: consultantUsername.trim() || null,
                          phone: consultantPhone.trim() || null,
                          email: consultantEmail.trim() || null
                        })
                      });
                      if (res.success) {
                        setConsultantId('');
                        setConsultantName('');
                        setConsultantUsername('');
                        setConsultantPhone('');
                        setConsultantEmail('');
                        showToast('Consultant qo\'shildi', 'success');
                        loadData(true);
                      } else {
                        showToast(res.error || 'Consultant qo\'shishda xatolik', 'error');
                      }
                    } catch (error) {
                      showToast('Consultant qo\'shishda xatolik', 'error');
                    } finally {
                      setConsultantLoading(false);
                    }
                  }}
                    className="rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#031222] bg-gradient-to-br from-[#D6B174] to-[#B29053] transition-colors hover:opacity-95 disabled:opacity-60"
                    disabled={consultantLoading}
                  >
                    {consultantLoading ? 'Saqlanmoqda...' : 'Consultant qo\'shish'}
                  </button>
                </div>

                <div className="grid gap-4">
                  {consultants.length === 0 ? (
                    <div className="p-6 rounded-2xl text-[var(--text-muted)] bg-[var(--bg-card-soft)] border border-white/10">Hozircha hech qanday consultant mavjud emas.</div>
                  ) : (consultants.map(consultant => (
                    <div key={consultant.id} className="p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-soft)' }}>
                      <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">{consultant.name}</h3>
                        <div className="text-[var(--text-muted)] text-xs mt-1 space-y-1">
                          <p>ID: {consultant.id} • @{consultant.username || "Noma'lum"}</p>
                          {consultant.phone && <p>Telefon: {consultant.phone}</p>}
                          {consultant.email && <p>Email: {consultant.email}</p>}
                        </div>
                        <p className="text-[var(--text-muted)] text-xs mt-1">Qo'shilgan sana: {new Date(consultant.joinedAt).toLocaleDateString('uz-UZ')}</p>
                      </div>
                      <button onClick={async () => {
                        if (!window.confirm('Haqiqatan ham bu consultantni o\'chirmoqchimisiz?')) return;
                        try {
                          setConsultantLoading(true);
                          const deleted = await apiFetch(`/api/admin/consultants/${consultant.id}`, { method: 'DELETE' });
                          if (deleted.success) {
                            showToast('Consultant o\'chirildi', 'success');
                            setConsultants(prev => prev.filter(c => c.id !== consultant.id));
                          } else {
                            showToast(deleted.error || 'O\'chirishda xatolik', 'error');
                          }
                        } catch (err) {
                          showToast('O\'chirishda xatolik', 'error');
                        } finally {
                          setConsultantLoading(false);
                        }
                      }}
                        className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-primary)] px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/15 hover:bg-red-500/15"
                        disabled={consultantLoading}
                      >
                        O\'chirish
                      </button>
                    </div>
                  )))}
                </div>

                {/* ===== Hisobotlar va reyting ===== */}
                <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">📊 Hisobotlar</h3>
                    <button onClick={() => loadConsultantReports()} disabled={reportsLoading}
                      className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#D6B174] hover:underline disabled:opacity-50">
                      {reportsLoading ? 'Yuklanmoqda...' : 'Yangilash'}
                    </button>
                  </div>

                  {consultantReports && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                      {[
                        { label: 'Bugun', data: consultantReports.today },
                        { label: 'Bu hafta', data: consultantReports.weekly },
                        { label: 'Bu oy', data: consultantReports.monthly },
                      ].map(({ label, data }) => (
                        <div key={label} className="p-4 rounded-xl bg-[var(--bg-card-soft)] border border-white/10">
                          <p className="text-[10px] font-bold uppercase text-[var(--text-muted)]">{label}</p>
                          <p className="text-lg font-bold text-[var(--text-primary)] mt-1">{data.count} ta klient</p>
                          <p className="text-xs text-[#D6B174] font-bold">{data.revenue.toLocaleString('uz-UZ')} so'm</p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-1">Eng faol: {data.active}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {consultantRanking.length > 0 && (
                    <div className="mb-5">
                      <p className="text-xs font-bold text-[var(--text-muted)] mb-2">🏆 Oylik reyting</p>
                      <div className="space-y-2">
                        {consultantRanking.map(([name, count, revenue]: [string, number, number], i: number) => (
                          <div key={name} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-card-soft)] border border-white/10 text-sm">
                            <span className="font-bold text-[var(--text-primary)]">{['🥇', '🥈', '🥉'][i] || `${i + 1}.`} {name}</span>
                            <span className="text-[var(--text-muted)] text-xs">{count} ta • {revenue.toLocaleString('uz-UZ')} so'm</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {consultantDetails.length > 0 && (
                    <div className="overflow-x-auto">
                      <p className="text-xs font-bold text-[var(--text-muted)] mb-2">Har bir consultant bo'yicha</p>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-[var(--text-muted)] uppercase text-[10px]">
                            <th className="py-2 pr-3">Ism</th>
                            <th className="py-2 pr-3">Bugun</th>
                            <th className="py-2 pr-3">Hafta</th>
                            <th className="py-2 pr-3">Oy (soni/summa)</th>
                            <th className="py-2 pr-3">Jami</th>
                          </tr>
                        </thead>
                        <tbody>
                          {consultantDetails.map(d => (
                            <tr key={d.id} className="border-t border-white/5">
                              <td className="py-2 pr-3 font-bold text-[var(--text-primary)]">{d.name}</td>
                              <td className="py-2 pr-3">{d.today_cnt} ta / {d.today_rev.toLocaleString('uz-UZ')} so'm</td>
                              <td className="py-2 pr-3">{d.weekly_cnt} ta</td>
                              <td className="py-2 pr-3">{d.monthly_cnt} ta / {d.monthly_rev.toLocaleString('uz-UZ')} so'm</td>
                              <td className="py-2 pr-3">{d.total_cnt} ta</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* ===== Broadcast: barcha consultantlarga xabar yuborish ===== */}
                <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">📢 Barcha consultantlarga xabar</h3>
                  <p className="text-[var(--text-muted)] text-xs mb-3">Xabar Telegram bot orqali har bir consultantga alohida yuboriladi.</p>
                  <textarea value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)}
                    placeholder="Xabar matnini kiriting..." rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--bg-card-soft)] border border-white/10 text-sm text-[var(--text-primary)] resize-none" />
                  <button onClick={handleBroadcast} disabled={broadcastLoading}
                    className="mt-3 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-[#031222] bg-gradient-to-br from-[#D6B174] to-[#B29053] hover:opacity-95 disabled:opacity-60">
                    {broadcastLoading ? 'Yuborilmoqda...' : 'Yuborish'}
                  </button>
                </div>
              </div>
            )}
            {activeSubTab === 'consultant-results' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">Consultant natijalari</h2>
                  <p className="text-[var(--text-muted)] text-xs mt-1">Consultantlar qo'shgan har bir klient haqida batafsil ma'lumot. Qachon qo'shilgan, qayerga yuborilgan va qaysi consultant tomonidan kiritilganini shu yerda ko'rishingiz mumkin.</p>
                </div>

                <div className="grid gap-4">
                  <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.1)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Jami konsultatsiyalar</p>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">{adminClients.length}</p>
                      </div>
                      <button onClick={() => loadConsultantReports()} disabled={reportsLoading}
                        className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#D6B174] hover:underline disabled:opacity-50">
                        {reportsLoading ? 'Yuklanmoqda...' : 'Yangilash'}
                      </button>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">Bu yerda consultantlar tomonidan qo'shilgan mijozlar ro'yxati saqlanadi. Har bir yozuv admin panelga yuborilgan vaqti bilan ko'rsatiladi.</p>
                  </div>

                  {adminClients.length === 0 ? (
                    <div className="p-6 rounded-2xl text-center text-[var(--text-muted)] bg-[var(--bg-card-soft)] border border-white/10">Hozircha hech qanday konsultatsiya yoki klient qo'shilmagan.</div>
                  ) : (
                    <div className="space-y-3">
                      {adminClients.map(client => (
                        <div key={client.id} className="p-4 rounded-2xl bg-[var(--bg-card-soft)] border border-white/10">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[var(--text-primary)] truncate">{client.name}</p>
                              <p className="text-[11px] text-[var(--text-muted)] mt-1">Qo'shgan consultant: <span className="font-semibold text-[var(--text-primary)]">{client.consultantName}{client.consultantUsername ? ` (@${client.consultantUsername})` : ''}</span></p>
                            </div>
                            <div className="text-right text-[11px] text-[var(--text-muted)]">
                              <p>Qo'shilgan sana: {new Date(client.confirmedAt).toLocaleDateString('uz-UZ')}</p>
                              <p className="mt-1">Status: {client.status}</p>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-2xl p-3 bg-[var(--bg-card)] border border-white/10">
                              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] mb-1">Telefon</p>
                              <p className="font-semibold text-[var(--text-primary)]">{client.phone}</p>
                            </div>
                            <div className="rounded-2xl p-3 bg-[var(--bg-card)] border border-white/10">
                              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] mb-1">Davlat</p>
                              <p className="font-semibold text-[var(--text-primary)]">{client.country}</p>
                            </div>
                            <div className="rounded-2xl p-3 bg-[var(--bg-card)] border border-white/10">
                              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] mb-1">To'lov turi</p>
                              <p className="font-semibold text-[var(--text-primary)]">{client.paymentType}</p>
                            </div>
                            <div className="rounded-2xl p-3 bg-[var(--bg-card)] border border-white/10">
                              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] mb-1">Summasi</p>
                              <p className="font-semibold text-[var(--text-primary)]">{Number(client.amount).toLocaleString('uz-UZ')} so'm</p>
                            </div>
                          </div>
                          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10px] text-[var(--text-muted)]">
                            <p>Bu yozuv admin panelga avtomatik tarzda yuborildi.</p>
                            <button type="button" onClick={() => void openDocFile(`/api/clients/receipt/${client.id}`)}
                              className="text-[#D6B174] font-bold hover:underline">
                              🧾 Chekni ko'rish
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ===== MODAL: Update Application Status ===== */}
      {updatingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.2)' }}>
            <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(214,177,116,0.1)' }}>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Arizani Boshqarish</h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{updatingApp.universityName} — {updatingApp.program}</p>
              </div>
              <button onClick={() => setUpdatingApp(null)} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateAppStatus} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Ariza Holati</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "🟡 Ko'rib chiqilyapti", label: "🟡 Ko'rib chiqilyapti" },
                    { value: '🟢 Tasdiqlangan / Qabul qilingan', label: '🟢 Qabul qilindi' },
                    { value: '🔴 Rad etilgan', label: '🔴 Rad etildi' }
                  ].map(item => (
                    <button type="button" key={item.value} onClick={() => setNewStatus(item.value)}
                      className={`py-2.5 px-3 text-[11px] font-semibold rounded-xl text-center transition-all ${
                        newStatus === item.value ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                      style={{ border: `1px solid ${newStatus === item.value ? 'rgba(214,177,116,0.4)' : 'var(--hairline-soft)'}`, background: newStatus === item.value ? 'rgba(214,177,116,0.1)' : 'var(--bg-card-soft)' }}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Izoh</label>
                <textarea rows={3} placeholder="Masalan: Universitetdan rasmiy taklifnoma keldi!"
                  value={statusNote} onChange={e => setStatusNote(e.target.value)}
                  className="w-full p-3 rounded-xl text-xs font-semibold focus:outline-none transition-all text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-soft)' }} />
              </div>
              {/* History */}
              <div>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Tarix Yo'li</p>
                <div className="max-h-28 overflow-y-auto space-y-2 p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-soft)' }}>
                  {updatingApp.history.map((h, i) => (
                    <div key={i} className="text-[10px]" style={{ borderBottom: '1px solid var(--hairline-soft)', paddingBottom: '0.5rem' }}>
                      <div className="flex justify-between font-bold text-[var(--text-primary)]">
                        <span>{h.status}</span>
                        <span className="font-mono text-[9px] text-[var(--text-muted)]">{h.date}</span>
                      </div>
                      <p className="text-[var(--text-muted)] mt-0.5">{h.note}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--hairline-soft)' }}>
                <button type="button" onClick={() => setUpdatingApp(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  style={{ border: '1px solid var(--hairline-strong)', background: 'var(--bg-card-soft)' }}>
                  Bekor qilish
                </button>
                <button type="submit" disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all text-[#031222] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#D6B174,#C49A52)' }}>
                  {actionLoading ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: App Detail (Student Applications) ===== */}
      {appDetailUsername && (() => {
        const student = students.find(s => s.username === appDetailUsername);
        const studentApps = applications.filter(a => a.username === appDetailUsername);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.2)' }}>
              <div className="p-5 flex items-center justify-between shrink-0" style={{ background: 'var(--bg-card)', borderBottom: '1px solid rgba(214,177,116,0.1)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-[#D6B174] font-bold text-sm shrink-0"
                    style={{ background: 'rgba(214,177,116,0.15)', border: '1px solid rgba(214,177,116,0.3)' }}>
                    {student ? `${student.firstName[0]}${student.lastName[0]}` : '??'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">{student ? `${student.firstName} ${student.lastName}` : appDetailUsername}</h3>
                    <p className="text-[10px] text-[var(--text-muted)]">@{appDetailUsername} — {studentApps.length} ta ariza</p>
                  </div>
                </div>
                <button onClick={() => { setAppDetailUsername(null); setExpandedAppId(null); }}
                  className="p-1.5 hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-colors shrink-0">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-3 overflow-y-auto">
                {studentApps.map(app => {
                  const isOpen = expandedAppId === app.id;
                  return (
                    <div key={app.id} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--hairline-soft)' }}>
                      <button onClick={() => setExpandedAppId(isOpen ? null : app.id)}
                        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-white/3 transition-colors text-left"
                        style={{ background: 'var(--bg-card-soft)' }}>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate">{app.universityName}{app.universityCountry ? ` — ${app.universityCountry}` : ''}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">{app.program} · {app.date}</p>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          app.status.includes('🟡') ? 'bg-amber-500/15 text-amber-400' :
                          app.status.includes('🟢') ? 'bg-emerald-500/15 text-emerald-400' :
                          'bg-red-500/15 text-red-400'
                        }`}>{app.status}</span>
                      </button>
                      {isOpen && (
                        <div className="p-4 space-y-4" style={{ background: 'var(--bg-card-soft)', borderTop: '1px solid var(--hairline-soft)' }}>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            {[
                              { label: 'Otasi', val: app.fatherName, sub: app.fatherPhone },
                              { label: 'Onasi', val: app.motherName, sub: app.motherPhone },
                              { label: 'Email', val: app.contactEmail },
                              { label: 'Telefon', val: app.contactPhone },
                            ].map(({ label, val, sub }) => (
                              <div key={label} className="p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-soft)' }}>
                                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">{label}</span>
                                <p className="font-semibold text-[var(--text-primary)]">{val || 'Kiritilmagan'}</p>
                                {sub && <p className="font-mono text-[var(--text-muted)] text-[10px]">{sub}</p>}
                              </div>
                            ))}
                          </div>
                          {/* Documents */}
                          <div>
                            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-2">Yuklangan hujjatlar</span>
                            {app.documents.length === 0 ? (
                              <p className="text-[11px] text-[var(--text-muted)] italic">Hujjat yuklanmagan</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {app.documents.map((doc, idx) => (
                                  <button key={idx} onClick={() => doc.url && void openDocFile(doc.url)}
                                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl text-[11px] font-semibold text-[var(--text-primary)] hover:bg-[#D6B174]/10 transition-colors text-left"
                                    style={{ border: '1px solid rgba(214,177,116,0.15)', background: 'var(--bg-card)' }}>
                                    <span className="truncate">{doc.type}</span>
                                    <Eye className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <button onClick={() => handleDownloadApplicationZip(app.id)}
                              className="w-full py-2.5 rounded-xl text-xs font-bold transition-all text-[var(--text-primary)]"
                              style={{ background: 'rgba(59,130,246,0.9)' }}>
                              ZIP yuklab olish
                            </button>
                            <button onClick={() => { setUpdatingApp(app); setNewStatus(app.status); }}
                              className="w-full py-2.5 rounded-xl text-xs font-bold transition-all text-[#031222]"
                              style={{ background: 'linear-gradient(135deg,#D6B174,#C49A52)' }}>
                              Ariza holatini boshqarish
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="p-5 shrink-0" style={{ borderTop: '1px solid var(--hairline-soft)' }}>
                <button onClick={() => { setAppDetailUsername(null); setExpandedAppId(null); }}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                  style={{ border: '1px solid var(--hairline-strong)', background: 'var(--bg-card-soft)' }}>
                  Yopish
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== MODAL: Student Profile ===== */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.2)' }}>
            <div className="p-5 flex items-center justify-between" style={{ background: 'var(--bg-card)', borderBottom: '1px solid rgba(214,177,116,0.1)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-[#D6B174] font-bold text-sm"
                  style={{ background: 'rgba(214,177,116,0.15)', border: '1px solid rgba(214,177,116,0.3)' }}>
                  {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">{selectedStudent.firstName} {selectedStudent.lastName}</h3>
                    {selectedStudent.is_banned && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">BLOKLANGAN</span>}
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)]">Talaba profili va hujjatlari</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleBanUser(selectedStudent, !selectedStudent.is_banned)} disabled={banLoading}
                  className={`text-[10px] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${selectedStudent.is_banned ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-red-400 hover:bg-red-500/10'}`}
                  style={{ border: `1px solid ${selectedStudent.is_banned ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                  {selectedStudent.is_banned ? <ShieldOff className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                  {selectedStudent.is_banned ? 'Blokdan chiqarish' : 'Bloklash'}
                </button>
                <button onClick={() => setSelectedStudent(null)} className="p-1.5 hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-colors">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-5 overflow-y-auto">
              {/* Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'IELTS', value: selectedStudent.ielts_score ? String(selectedStudent.ielts_score) : "Yo'q" },
                  { label: 'GPA', value: selectedStudent.gpa ? String(selectedStudent.gpa) : "Yo'q" },
                  { label: 'Byudjet', value: selectedStudent.budget ? `$${selectedStudent.budget.toLocaleString()}` : 'Bepul' },
                  { label: 'Tizim ID', value: `@${selectedStudent.username}` },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.08)' }}>
                    <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{label}</span>
                    <p className="text-sm font-bold text-[var(--text-primary)] mt-1 font-mono truncate">{value}</p>
                  </div>
                ))}
              </div>
              {/* Contact info */}
              <div className="p-4 rounded-xl space-y-2" style={{ background: 'var(--bg-card-soft)', border: '1px solid var(--hairline-soft)' }}>
                <h4 className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-wider pb-2" style={{ borderBottom: '1px solid var(--hairline-soft)' }}>Bog'lanish Ma'lumotlari</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-[var(--text-muted)]" /><span className="text-[var(--text-muted)]">Telefon:</span><span className="font-mono text-[var(--text-primary)]">{selectedStudent.phone}</span></div>
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[var(--text-muted)]" /><span className="text-[var(--text-muted)]">Telegram:</span><span className="font-mono text-[var(--text-primary)]">{selectedStudent.telegram_chat_id || 'Ulanmagan'}</span></div>
                  <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-[var(--text-muted)]">IP:</span>
                    <div className="flex flex-col">
                      <span className="font-mono text-[var(--text-primary)]">{selectedStudent.last_login_ip || 'Noaniq'}</span>
                      {ipLoading ? (
                        <span className="text-[9px] text-[var(--text-muted)]">Joylashuv aniqlanmoqda...</span>
                      ) : ipLocation?.location ? (
                        <span className="text-[10px] text-[#D6B174] flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3"/> {ipLocation.location.city || ''} {ipLocation.location.country || ''}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              {/* Credentials */}
              <div className="p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <h4 className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-wider pb-2 mb-3" style={{ borderBottom: '1px solid rgba(245,158,11,0.1)' }}>Kirish Ma'lumotlari (faqat admin)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2"><User className="w-4 h-4 text-[var(--text-muted)]" /><span className="text-[var(--text-muted)]">Username:</span><span className="font-mono text-[var(--text-primary)]">{selectedStudent.username}</span></div>
                  <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-[var(--text-muted)]" /><span className="text-[var(--text-muted)]">Parol:</span>
                    <span className="font-mono text-[var(--text-primary)]">{showStudentPassword ? (selectedStudent.plain_password || selectedStudent.password || "Noma'lum (Qadimgi user)") : '••••••••'}</span>
                    <button type="button" onClick={() => setShowStudentPassword(v => !v)} className="text-[10px] font-bold text-amber-400 hover:underline ml-1">{showStudentPassword ? 'Yashirish' : "Ko'rsatish"}</button>
                  </div>
                </div>
              </div>
              {/* Student Apps */}
              <div>
                <h4 className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-wider pb-2 mb-2" style={{ borderBottom: '1px solid var(--hairline-soft)' }}>Talabaning Arizalari</h4>
                <div className="space-y-2">
                  {applications.filter(a => a.username === selectedStudent.username).length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] italic">Faol arizalar mavjud emas</p>
                  ) : applications.filter(a => a.username === selectedStudent.username).map(app => (
                    <div key={app.id} className="p-3 rounded-xl flex items-center justify-between text-xs" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-soft)' }}>
                      <div><p className="font-bold text-[var(--text-primary)]">{app.universityName}</p><p className="text-[10px] text-[var(--text-muted)] mt-0.5">{app.program}</p></div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${app.status.includes('🟡') ? 'bg-amber-500/15 text-amber-400' : app.status.includes('🟢') ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>{app.status}</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">{app.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Docs */}
              <div>
                <h4 className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-wider pb-2 mb-2" style={{ borderBottom: '1px solid var(--hairline-soft)' }}>Yuklangan Hujjatlar</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {documents.filter(d => d.username === selectedStudent.username).length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] italic col-span-2">Yuklangan hujjatlar mavjud emas</p>
                  ) : documents.filter(d => d.username === selectedStudent.username).map(doc => (
                    <div key={doc.name} className="p-3 rounded-xl flex flex-col justify-between text-xs" style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-soft)' }}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-[var(--text-primary)] truncate max-w-[130px]" title={doc.name}>{doc.name}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${doc.status === 'Tasdiqlangan' ? 'bg-emerald-500/15 text-emerald-400' : doc.status === 'Rad etilgan' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>{doc.status}</span>
                      </div>
                      <p className="text-[9px] text-[var(--text-muted)]">Tur: {doc.type} ({doc.size})</p>
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => void openDocFile(doc.url)}
                          className="flex-1 text-center py-1.5 rounded-lg text-[9px] font-bold text-[#D6B174] hover:bg-[#D6B174]/10 transition-colors"
                          style={{ border: '1px solid rgba(214,177,116,0.2)' }}>
                          Ko'rish
                        </button>
                        {doc.status !== 'Tasdiqlangan' && (
                          <button onClick={() => void handleUpdateDocStatus(doc.id, 'Tasdiqlangan')}
                            className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-[var(--text-primary)] rounded-lg text-[9px] font-bold">
                            Tasdiqlash
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5 shrink-0" style={{ borderTop: '1px solid var(--hairline-soft)' }}>
              <button onClick={() => setSelectedStudent(null)}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                style={{ border: '1px solid var(--hairline-strong)', background: 'var(--bg-card-soft)' }}>
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: Add University ===== */}
      {showAddUni && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[90vh]" style={{ background: 'var(--bg-card)', border: '1px solid rgba(214,177,116,0.2)' }}>
            <div className="p-5 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid rgba(214,177,116,0.1)' }}>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Yangi Universitet Qo'shish</h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Davlat tanlang va universitet ma'lumotlarini kiriting</p>
              </div>
              <button onClick={() => setShowAddUni(false)} className="p-1.5 hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddUniversity} className="p-5 space-y-3 overflow-y-auto">
              {/* Country select */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Davlat <span className="text-red-400">*</span></label>
                <select value={addUniCountry} onChange={e => { setAddUniCountry(e.target.value); setAddUniLogo(COUNTRY_FLAGS[e.target.value] || '🏫'); }}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all text-[var(--text-primary)]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }} required>
                  <option value="">Davlat tanlang...</option>
                  {countries && countries.length > 0 ? (
                    countries.map(c => (
                      <option key={c.id} value={c.name}>{c.flag || COUNTRY_FLAGS[c.name] || '🌍'} {c.name}</option>
                    ))
                  ) : (
                    <option value="" disabled>Avval "Davlatlar" bo'limidan davlat qo'shing</option>
                  )}
                </select>
              </div>
              {/* Name */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Universitet nomi <span className="text-red-400">*</span></label>
                <input type="text" placeholder="Masalan: Seoul National University" value={addUniName} onChange={e => setAddUniName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }} required />
              </div>
              {/* Budget + IELTS + GPA */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Yillik Byudjet ($)', placeholder: '5000', val: addUniBudget, set: setAddUniBudget, type: 'number' },
                  { label: 'IELTS Talab', placeholder: '6.5', val: addUniIelts, set: setAddUniIelts, type: 'number' },
                  { label: "GPA O'rtacha", placeholder: '3.5', val: addUniGpa, set: setAddUniGpa, type: 'number' },
                ].map(({ label, placeholder, val, set, type }) => (
                  <div key={label}>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">{label}</label>
                    <input type={type} placeholder={placeholder} value={val} onChange={e => set(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-mono"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }} />
                  </div>
                ))}
              </div>
              {/* Grant info */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Grant ma'lumoti</label>
                <input type="text" placeholder="Masalan: 50% stipendiya mavjud" value={addUniGrant} onChange={e => setAddUniGrant(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }} />
              </div>
              {/* Programs */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Yo'nalishlar (vergul bilan ajrating)</label>
                <input type="text" placeholder="Bakalavr, Magistr, IT, Tibbiyot" value={addUniPrograms} onChange={e => setAddUniPrograms(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }} />
              </div>
              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Tavsif</label>
                <textarea rows={2} placeholder="Universitet haqida qisqacha ma'lumot..." value={addUniDesc} onChange={e => setAddUniDesc(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--hairline-strong)' }} />
              </div>

              <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--hairline-soft)' }}>
                <button type="button" onClick={() => setShowAddUni(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                  style={{ border: '1px solid var(--hairline-strong)', background: 'var(--bg-card-soft)' }}>
                  Bekor qilish
                </button>
                <button type="submit" disabled={addUniLoading}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all text-[#031222] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#D6B174,#C49A52)' }}>
                  {addUniLoading ? "Qo'shilmoqda..." : "✓ Qo'shish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: Delete University Confirm ===== */}
      {uniToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0"><Trash2 className="w-5 h-5 text-red-400" /></div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Universitetni o'chirish</h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{uniToDelete.name}</p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted-2)]">Bu amalni ortga qaytarib bo'lmaydi. Rostan o'chirishni xohlaysizmi?</p>
            <div className="flex gap-2">
              <button onClick={() => setUniToDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                style={{ border: '1px solid var(--hairline-strong)', background: 'var(--bg-card-soft)' }}>
                Bekor qilish
              </button>
              <button onClick={() => handleDeleteUniversity(uniToDelete)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-[var(--text-primary)] transition-all">
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: Delete Country Confirm ===== */}
      {countryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0"><Trash2 className="w-5 h-5 text-red-400" /></div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Davlatni o'chirish</h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{countryToDelete.flag} {countryToDelete.name}</p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted-2)]">Bu amalni ortga qaytarib bo'lmaydi. Rostan o'chirishni xohlaysizmi?</p>
            <div className="flex gap-2">
              <button onClick={() => setCountryToDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                style={{ border: '1px solid var(--hairline-strong)', background: 'var(--bg-card-soft)' }}>
                Bekor qilish
              </button>
              <button onClick={() => handleDeleteCountry(countryToDelete)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-[var(--text-primary)] transition-all">
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== TOAST ===== */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl animate-slideIn flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-emerald-600 text-[var(--text-primary)]' : 'bg-red-600 text-[var(--text-primary)]'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}