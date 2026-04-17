<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  XCircle,
  Clock,
  AlignLeft,
  Users,
  Repeat,
  Trash2,
  Info
} from 'lucide-vue-next';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday,
  parseISO,
  isSameDay
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'vue-sonner';
import { useAuthStore } from '../stores/auth';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

const authStore = useAuthStore();
const calendarToken = ref<string | null>(localStorage.getItem('google_calendar_token'));
const currentMonth = ref(new Date());
const events = ref<any[]>([]);
const isLoadingEvents = ref(false);

// Modal state
const showAddModal = ref(false);
const isSubmitting = ref(false);

// Delete Modal state
const showDeleteModal = ref(false);
const eventToDelete = ref<any>(null);
const isDeleting = ref(false);

// Detail Modal state
const showDetailModal = ref(false);
const eventDetails = ref<any>(null);

const newEvent = ref({
  summary: '',
  description: '',
  attendees: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  startTime: '09:00',
  endTime: '10:00',
  isRecurring: false,
  recurringDays: [] as string[],
  colorId: 'default'
});

const eventColors: Record<string, { bg: string, text: string }> = {
  '1': { bg: 'bg-[#7986cb]', text: 'text-white' }, // Lavender
  '2': { bg: 'bg-[#33b679]', text: 'text-white' }, // Sage
  '3': { bg: 'bg-[#8e24aa]', text: 'text-white' }, // Grape
  '4': { bg: 'bg-[#e67c73]', text: 'text-white' }, // Flamingo
  '5': { bg: 'bg-[#f6bf26]', text: 'text-gray-900' }, // Banana
  '6': { bg: 'bg-[#f4511e]', text: 'text-white' }, // Tangerine
  '7': { bg: 'bg-[#039be5]', text: 'text-white' }, // Peacock
  '8': { bg: 'bg-[#616161]', text: 'text-white' }, // Graphite
  '9': { bg: 'bg-[#3f51b5]', text: 'text-white' }, // Blueberry
  '10': { bg: 'bg-[#0b8043]', text: 'text-white' }, // Basil
  '11': { bg: 'bg-[#d50000]', text: 'text-white' }, // Tomato
  'default': { bg: 'bg-orange-50', text: 'text-orange-700' }
};

const getEventColorClasses = (colorId?: string) => {
  const color = eventColors[colorId || 'default'] || eventColors['default'];
  return `${color.bg} ${color.text} ${(!colorId || colorId === 'default') ? 'border border-orange-100' : ''}`;
};

const weekDays = [
  { label: 'T2', value: 'MO' },
  { label: 'T3', value: 'TU' },
  { label: 'T4', value: 'WE' },
  { label: 'T5', value: 'TH' },
  { label: 'T6', value: 'FR' },
  { label: 'T7', value: 'SA' },
  { label: 'CN', value: 'SU' }
];

const connectCalendar = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    provider.setCustomParameters({
      prompt: 'consent'
    });
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      calendarToken.value = credential.accessToken;
      localStorage.setItem('google_calendar_token', credential.accessToken);
      toast.success('Đã kết nối Google Calendar');
      fetchEvents();
    }
  } catch (error: any) {
    if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
      console.error('Failed to connect calendar', error);
      toast.error('Không thể kết nối Google Calendar');
    }
  }
};

const fetchEvents = async () => {
  if (!calendarToken.value) return;
  
  isLoadingEvents.value = true;
  try {
    const timeMin = startOfWeek(startOfMonth(currentMonth.value), { weekStartsOn: 1 }).toISOString();
    const timeMax = endOfWeek(endOfMonth(currentMonth.value), { weekStartsOn: 1 }).toISOString();
    
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`, {
      headers: {
        Authorization: `Bearer ${calendarToken.value}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Google API Error:', errorData);
      
      if (response.status === 401) {
        calendarToken.value = null;
        localStorage.removeItem('google_calendar_token');
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng kết nối lại.');
        return;
      }
      
      if (response.status === 403 && errorData.error?.message?.includes('API has not been used')) {
        toast.error('Google Calendar API chưa được bật trong Google Cloud Console của dự án Firebase.');
      } else if (response.status === 403 && errorData.error?.message?.includes('insufficient')) {
        toast.error('Chưa cấp quyền truy cập Lịch. Vui lòng tick chọn quyền khi đăng nhập.');
      } else {
        toast.error(`Lỗi: ${errorData.error?.message || 'Không thể tải sự kiện'}`);
      }
      throw new Error(errorData.error?.message || 'Failed to fetch events');
    }
    
    const data = await response.json();
    events.value = data.items || [];
  } catch (error) {
    console.error('Error fetching events:', error);
    toast.error('Có lỗi xảy ra khi tải sự kiện');
  } finally {
    isLoadingEvents.value = false;
  }
};

watch(currentMonth, () => {
  if (calendarToken.value) {
    fetchEvents();
  }
});

onMounted(() => {
  if (calendarToken.value) {
    fetchEvents();
  }
});

const prevMonth = () => {
  currentMonth.value = subMonths(currentMonth.value, 1);
};

const nextMonth = () => {
  currentMonth.value = addMonths(currentMonth.value, 1);
};

const calendarDays = computed(() => {
  const start = startOfWeek(startOfMonth(currentMonth.value), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(currentMonth.value), { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start, end });
  
  return days.map(date => {
    const dayEvents = events.value.filter(event => {
      if (!event.start) return false;
      const eventDate = event.start.dateTime ? parseISO(event.start.dateTime) : parseISO(event.start.date);
      return isSameDay(date, eventDate);
    });
    
    return {
      date,
      isCurrentMonth: isSameMonth(date, currentMonth.value),
      events: dayEvents
    };
  });
});

const formatTime = (dateString: string) => {
  if (!dateString.includes('T')) return 'Cả ngày';
  return format(parseISO(dateString), 'HH:mm');
};

const openAddEventForDay = (date: Date) => {
  newEvent.value.date = format(date, 'yyyy-MM-dd');
  showAddModal.value = true;
};

const closeAddModal = () => {
  showAddModal.value = false;
  newEvent.value = {
    summary: '',
    description: '',
    attendees: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    isRecurring: false,
    recurringDays: [],
    colorId: 'default'
  };
};

const openDetailModal = (event: any) => {
  eventDetails.value = event;
  showDetailModal.value = true;
};

const closeDetailModal = () => {
  showDetailModal.value = false;
  eventDetails.value = null;
};

const openDeleteModal = (event: any) => {
  eventToDelete.value = event;
  showDeleteModal.value = true;
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  eventToDelete.value = null;
};

const handleDeleteEvent = async (deleteAll: boolean = false) => {
  if (!calendarToken.value || !eventToDelete.value) return;
  
  isDeleting.value = true;
  try {
    let eventId = eventToDelete.value.id;
    if (deleteAll && eventToDelete.value.recurringEventId) {
      eventId = eventToDelete.value.recurringEventId;
    }
    
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${calendarToken.value}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to delete event');
    }
    
    toast.success('Đã xóa sự kiện thành công');
    closeDeleteModal();
    fetchEvents();
  } catch (error) {
    console.error('Error deleting event:', error);
    toast.error('Có lỗi xảy ra khi xóa sự kiện');
  } finally {
    isDeleting.value = false;
  }
};

const handleAddEvent = async () => {
  if (!newEvent.value.summary) {
    toast.error('Vui lòng nhập tiêu đề sự kiện');
    return;
  }
  
  if (newEvent.value.startTime >= newEvent.value.endTime) {
    toast.error('Thời gian kết thúc phải sau thời gian bắt đầu');
    return;
  }
  
  if (!calendarToken.value) return;
  
  isSubmitting.value = true;
  try {
    const startDateTime = `${newEvent.value.date}T${newEvent.value.startTime}:00`;
    const endDateTime = `${newEvent.value.date}T${newEvent.value.endTime}:00`;
    
    // Get user's timezone
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    let attendeesList: { email: string }[] = [];
    if (newEvent.value.attendees) {
      attendeesList = newEvent.value.attendees
        .split(',')
        .map(email => ({ email: email.trim() }))
        .filter(a => a.email);
    }
    
    const eventBody: any = {
      summary: newEvent.value.summary,
      description: newEvent.value.description,
      start: {
        dateTime: startDateTime,
        timeZone: timeZone
      },
      end: {
        dateTime: endDateTime,
        timeZone: timeZone
      }
    };
    
    if (attendeesList.length > 0) {
      eventBody.attendees = attendeesList;
    }
    
    if (newEvent.value.isRecurring && newEvent.value.recurringDays.length > 0) {
      const rrule = `RRULE:FREQ=WEEKLY;BYDAY=${newEvent.value.recurringDays.join(',')}`;
      eventBody.recurrence = [rrule];
    }
    
    if (newEvent.value.colorId && newEvent.value.colorId !== 'default') {
      eventBody.colorId = newEvent.value.colorId;
    }
    
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${calendarToken.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Google API Error:', errorData);
      
      if (response.status === 403 && errorData.error?.message?.includes('insufficient')) {
        toast.error('Chưa cấp quyền truy cập Lịch. Vui lòng kết nối lại và tick chọn quyền.');
      } else {
        toast.error(`Lỗi: ${errorData.error?.message || 'Không thể tạo sự kiện'}`);
      }
      throw new Error(errorData.error?.message || 'Failed to create event');
    }
    
    toast.success('Đã thêm sự kiện thành công');
    closeAddModal();
    fetchEvents();
  } catch (error) {
    console.error('Error creating event:', error);
    toast.error('Có lỗi xảy ra khi thêm sự kiện');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <h2 class="text-4xl font-black text-gray-900 uppercase tracking-tighter">LỊCH LÀM VIỆC</h2>
      <button 
        v-if="!calendarToken"
        @click="connectCalendar"
        class="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/30"
      >
        <CalendarIcon :size="16" />
        Kết nối Google Calendar
      </button>
      <button 
        v-else
        @click="showAddModal = true"
        class="px-6 py-3 bg-[#C04D1E] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#A03D18] transition-all flex items-center gap-2 shadow-lg shadow-[#C04D1E]/30"
      >
        <Plus :size="16" />
        Thêm sự kiện
      </button>
    </div>

    <div v-if="calendarToken" class="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
      <!-- Calendar UI -->
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-2xl font-black text-gray-900 uppercase tracking-tighter capitalize">{{ format(currentMonth, 'MMMM yyyy', { locale: vi }) }}</h3>
        <div class="flex gap-2">
          <button @click="prevMonth" class="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-gray-600"><ChevronLeft :size="20" /></button>
          <button @click="nextMonth" class="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-gray-600"><ChevronRight :size="20" /></button>
        </div>
      </div>
      
      <div class="grid grid-cols-7 gap-2 mb-2">
        <div v-for="day in ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']" :key="day" class="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest py-2">
          {{ day }}
        </div>
      </div>
      
      <div class="relative">
        <div v-if="isLoadingEvents" class="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
          <div class="w-8 h-8 border-3 border-[#C04D1E] border-t-transparent rounded-full animate-spin"></div>
        </div>
        
        <div class="grid grid-cols-7 gap-2">
          <div 
            v-for="day in calendarDays" 
            :key="day.date.toISOString()"
            @click="openAddEventForDay(day.date)"
            :class="[
              'min-h-[120px] p-2 rounded-2xl border transition-all cursor-pointer hover:border-orange-300 hover:shadow-md',
              day.isCurrentMonth ? 'bg-white border-gray-100' : 'bg-gray-50 border-transparent opacity-50',
              isToday(day.date) ? 'ring-2 ring-orange-500 border-transparent' : ''
            ]"
          >
            <div :class="['text-right text-xs font-bold mb-2', isToday(day.date) ? 'text-orange-600' : 'text-gray-500']">
              {{ format(day.date, 'd') }}
            </div>
            <div class="space-y-1.5 overflow-y-auto max-h-[80px] no-scrollbar">
              <div 
                v-for="event in day.events" 
                :key="event.id"
                @click.stop="openDetailModal(event)"
                @contextmenu.prevent.stop="openDeleteModal(event)"
                :class="['text-[9px] font-bold px-2 py-1.5 rounded-lg truncate cursor-pointer', getEventColorClasses(event.colorId)]"
                :title="event.summary + ' (Click để xem, Chuột phải để xóa)'"
              >
                {{ formatTime(event.start.dateTime || event.start.date) }} - {{ event.summary }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="bg-white p-12 rounded-[50px] shadow-sm border border-gray-100 text-center space-y-6 max-w-2xl mx-auto mt-12">
      <div class="w-24 h-24 bg-blue-50 text-blue-500 rounded-[32px] flex items-center justify-center mx-auto rotate-3">
        <CalendarIcon :size="48" />
      </div>
      <div class="space-y-2">
        <h3 class="text-2xl font-black text-gray-900 uppercase tracking-tighter">Chưa kết nối Google Calendar</h3>
        <p class="text-gray-500 text-sm font-medium">Kết nối với Google Calendar để quản lý lịch làm việc, sự kiện và ghi chú trực tiếp trên hệ thống. Dữ liệu được đồng bộ an toàn với tài khoản Google của bạn.</p>
      </div>
      <button 
        @click="connectCalendar"
        class="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/30 inline-flex items-center gap-3"
      >
        <CalendarIcon :size="20" />
        Kết nối ngay
      </button>
    </div>

    <!-- Add Event Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeAddModal"></div>
      <div class="relative bg-white w-full max-w-md rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div class="flex justify-between items-center mb-4 flex-shrink-0">
          <h3 class="text-xl font-black text-gray-900 uppercase tracking-tighter">Thêm sự kiện mới</h3>
          <button @click="closeAddModal" class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">
            <XCircle :size="20" />
          </button>
        </div>
        
        <form @submit.prevent="handleAddEvent" class="space-y-4 overflow-y-auto pr-2 no-scrollbar flex-grow">
          <div class="space-y-1.5">
            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tiêu đề sự kiện</label>
            <input 
              v-model="newEvent.summary" 
              type="text" 
              required
              class="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all"
              placeholder="VD: Họp nhân viên, Nhập hàng..."
            />
          </div>
          
          <div class="space-y-1.5">
            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ngày</label>
            <input 
              v-model="newEvent.date" 
              type="date" 
              required
              class="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all"
            />
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bắt đầu</label>
              <div class="relative">
                <Clock class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" :size="16" />
                <input 
                  v-model="newEvent.startTime" 
                  type="time" 
                  required
                  class="w-full pl-10 pr-3 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all"
                />
              </div>
            </div>
            <div class="space-y-1.5">
              <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kết thúc</label>
              <div class="relative">
                <Clock class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" :size="16" />
                <input 
                  v-model="newEvent.endTime" 
                  type="time" 
                  required
                  class="w-full pl-10 pr-3 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all"
                />
              </div>
            </div>
          </div>
          
          <div class="space-y-1.5">
            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Lặp lại sự kiện</label>
            <div class="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="isRecurring" 
                v-model="newEvent.isRecurring" 
                class="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
              />
              <label for="isRecurring" class="text-sm font-bold text-gray-700 cursor-pointer flex items-center gap-1">
                <Repeat :size="14" class="text-gray-500" />
                Lặp lại hàng tuần
              </label>
            </div>
          </div>
          
          <div v-if="newEvent.isRecurring" class="space-y-1.5">
            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Chọn ngày lặp lại</label>
            <div class="flex flex-wrap gap-2">
              <label 
                v-for="day in weekDays" 
                :key="day.value" 
                class="flex items-center gap-1 cursor-pointer bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors"
              >
                <input 
                  type="checkbox" 
                  :value="day.value" 
                  v-model="newEvent.recurringDays" 
                  class="w-3 h-3 text-orange-600 rounded focus:ring-orange-500" 
                />
                <span class="text-xs font-bold text-gray-700">{{ day.label }}</span>
              </label>
            </div>
          </div>
          
          <div class="space-y-1.5">
            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Khách mời (Email)</label>
            <div class="relative">
              <Users class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" :size="16" />
              <input 
                v-model="newEvent.attendees" 
                type="text" 
                class="w-full pl-10 pr-3 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all"
                placeholder="email1@gmail.com, email2@gmail.com"
              />
            </div>
          </div>
          
          <div class="space-y-1.5">
            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Màu sự kiện</label>
            <div class="flex flex-wrap gap-2">
              <label 
                v-for="(color, id) in eventColors" 
                :key="id"
                class="relative w-8 h-8 rounded-full cursor-pointer flex items-center justify-center transition-transform hover:scale-110"
                :class="[color.bg, newEvent.colorId === id ? 'ring-2 ring-offset-2 ring-orange-500' : '']"
              >
                <input 
                  type="radio" 
                  name="colorId"
                  :value="id" 
                  v-model="newEvent.colorId" 
                  class="sr-only" 
                />
              </label>
            </div>
          </div>
          
          <div class="space-y-1.5">
            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mô tả (Tùy chọn)</label>
            <div class="relative">
              <AlignLeft class="absolute left-3 top-3 text-gray-400" :size="16" />
              <textarea 
                v-model="newEvent.description" 
                rows="2"
                class="w-full pl-10 pr-3 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all resize-none"
                placeholder="Thêm chi tiết về sự kiện..."
              ></textarea>
            </div>
          </div>
          
          <div class="pt-2 pb-2">
            <button 
              type="submit"
              :disabled="isSubmitting"
              class="w-full py-3.5 bg-[#C04D1E] text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-[#A03D18] transition-all shadow-xl shadow-[#C04D1E]/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span v-if="isSubmitting" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span v-else>Lưu sự kiện</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Event Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeDeleteModal"></div>
      <div class="relative bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-black text-gray-900 uppercase tracking-tighter">Xóa sự kiện</h3>
          <button @click="closeDeleteModal" class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">
            <XCircle :size="20" />
          </button>
        </div>
        
        <div class="space-y-4">
          <p class="text-sm font-medium text-gray-600">
            Bạn có chắc chắn muốn xóa sự kiện <span class="font-bold text-gray-900">"{{ eventToDelete?.summary }}"</span> không?
          </p>
          
          <div class="flex flex-col gap-2 pt-2">
            <template v-if="eventToDelete?.recurringEventId">
              <button 
                @click="handleDeleteEvent(false)"
                :disabled="isDeleting"
                class="w-full py-3 bg-white border-2 border-red-100 text-red-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Chỉ xóa sự kiện này
              </button>
              <button 
                @click="handleDeleteEvent(true)"
                :disabled="isDeleting"
                class="w-full py-3 bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span v-if="isDeleting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span v-else>Xóa tất cả sự kiện lặp lại</span>
              </button>
            </template>
            <template v-else>
              <button 
                @click="handleDeleteEvent(false)"
                :disabled="isDeleting"
                class="w-full py-3 bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span v-if="isDeleting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span v-else>Xóa sự kiện</span>
              </button>
            </template>
            <button 
              @click="closeDeleteModal"
              :disabled="isDeleting"
              class="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Event Detail Modal -->
    <div v-if="showDetailModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeDetailModal"></div>
      <div class="relative bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div class="flex justify-between items-start mb-6 shrink-0">
          <div class="flex flex-col">
            <h3 class="text-xl font-black text-gray-900 uppercase tracking-tighter pr-4">{{ eventDetails?.summary || 'Không có tiêu đề' }}</h3>
            <div class="text-sm font-medium text-gray-500 mt-1 flex items-center gap-1">
              <Clock :size="14" />
              <span v-if="eventDetails?.start?.dateTime">
                {{ format(parseISO(eventDetails.start.dateTime), 'dd/MM/yyyy HH:mm') }} 
                <span v-if="eventDetails?.end?.dateTime"> - {{ format(parseISO(eventDetails.end.dateTime), 'HH:mm') }}</span>
              </span>
              <span v-else>
                {{ eventDetails?.start?.date ? format(parseISO(eventDetails.start.date), 'dd/MM/yyyy') : 'Cả ngày' }}
              </span>
            </div>
            
            <div v-if="eventDetails?.recurrence" class="text-xs font-bold text-orange-600 mt-2 flex items-center gap-1">
              <Repeat :size="12" /> Lặp lại hàng tuần
            </div>
          </div>
          <button @click="closeDetailModal" class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 shrink-0">
            <XCircle :size="20" />
          </button>
        </div>
        
        <div class="space-y-5 overflow-y-auto pr-2 no-scrollbar flex-grow">
          <div v-if="eventDetails?.description" class="space-y-1.5">
            <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <AlignLeft :size="12" /> Mô tả
            </h4>
            <p class="text-sm font-medium text-gray-700 whitespace-pre-line">{{ eventDetails.description }}</p>
          </div>
          
          <div v-if="eventDetails?.attendees && eventDetails.attendees.length > 0" class="space-y-1.5">
            <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <Users :size="12" /> Khách mời
            </h4>
            <div class="flex flex-col gap-1">
              <div v-for="(attendee, index) in eventDetails.attendees" :key="index" class="text-xs font-medium text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100">
                {{ attendee.email }}
                <span v-if="attendee.responseStatus === 'accepted'" class="text-green-600 font-bold ml-1">(Đã nhận lời)</span>
                <span v-else-if="attendee.responseStatus === 'declined'" class="text-red-500 font-bold ml-1">(Từ chối)</span>
                <span v-else-if="attendee.responseStatus === 'needsAction'" class="text-gray-400 font-bold ml-1">(Chưa phản hồi)</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="pt-4 mt-4 border-t border-gray-100 shrink-0 flex gap-2">
          <button 
            @click="() => { const event = eventDetails; closeDetailModal(); openDeleteModal(event); }"
            class="flex-1 py-3.5 bg-red-50 text-red-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2"
          >
            <Trash2 :size="16" />
            Xóa sự kiện
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
