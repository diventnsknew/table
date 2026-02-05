// --- CONSTANTS ---
const DEPARTMENTS = ['НП', 'РОП', 'ГИ', 'ТД', 'ИТОП', 'КД', 'РОМ', 'РОПР', 'РСО', 'СЛ', 'РТКО', 'тест'];
const STATUS_OPTIONS = [
  { value: 'Выполнено', label: 'Выполнено', color: 'bg-emerald-600 text-white border-emerald-700' },
  { value: 'Не выполнено', label: 'Не выполнено', color: 'bg-red-600 text-white border-red-700' },
  { value: 'Без статуса', label: 'Без статуса', color: 'bg-slate-200 text-slate-800 border-slate-300' },
];
const DEADLINE_DAY = 5; // Friday
const DEADLINE_HOUR = 17;

// --- STATE MANAGEMENT ---
const state = {
    view: 'select-dept', // 'select-dept', 'create', 'dashboard'
    department: '',
    reportType: 'weekly',
    isLocked: false,
    timeRemaining: '',
    editingId: null,
    isSubmitting: false,

    // Form Data
    period: { week_dates: '', is_manual: false },
    kpis: {
        deals: { quantity: 0, description: '' },
        meetings: { quantity: 0, description: '' },
        training: { quantity: 0, description: '' },
    },
    tasks: [],
    unplannedTasks: [],

    // Data from Server
    history: []
};

// --- UTILS ---
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const getWeekRange = () => {
    const today = new Date();
    let diffToPrevTuesday = today.getDay() - 2;
    if (diffToPrevTuesday < 0) diffToPrevTuesday += 7;
    const prevTuesday = new Date(today);
    prevTuesday.setDate(today.getDate() - diffToPrevTuesday);
    const nextTuesday = new Date(prevTuesday);
    nextTuesday.setDate(prevTuesday.getDate() + 7);
    
    const fmt = d => `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getFullYear()).slice(-2)}`;
    return `${fmt(prevTuesday)} - ${fmt(nextTuesday)}`;
};

const getCurrentMonthName = () => {
    const m = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
    const d = new Date();
    return `${m[d.getMonth()]} ${d.getFullYear()}`;
};

const checkDeadline = () => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    
    let locked = false;
    if (day > DEADLINE_DAY) locked = true;
    else if (day === DEADLINE_DAY && hour >= DEADLINE_HOUR) locked = true;
    
    state.isLocked = locked;
    
    if (locked) {
        state.timeRemaining = 'Время вышло';
    } else {
        const deadline = new Date(now);
        deadline.setDate(now.getDate() + (DEADLINE_DAY - day));
        deadline.setHours(DEADLINE_HOUR, 0, 0, 0);
        const diff = deadline - now;
        if (diff > 0) {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            state.timeRemaining = (days > 0 ? `${days}д ` : '') + `${hours}ч ${mins}м`;
        } else {
            state.timeRemaining = '00:00';
            state.isLocked = true;
        }
    }
    renderBanner();
};

// --- API ---
const api = {
    fetchReports: async () => {
        try {
            const res = await fetch('/api/reports');
            state.history = await res.json();
        } catch (e) { console.error(e); }
    },
    syncReports: async (reports) => {
        try {
            await fetch('/api/reports/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reports)
            });
        } catch (e) { console.error(e); }
    }
};

// --- RENDER FUNCTIONS ---

const init = async () => {
    setInterval(checkDeadline, 60000);
    checkDeadline();
    await api.fetchReports();
    render();
};

const renderBanner = () => {
    const banner = document.getElementById('banner');
    if (!banner) return;
    
    if (state.isLocked) {
        banner.className = 'w-full py-3 px-4 flex justify-center items-center gap-3 text-sm font-bold uppercase tracking-widest sticky top-0 z-40 shadow-md bg-red-600 text-white';
        banner.innerHTML = `<i data-lucide="lock" class="w-4 h-4"></i> Прием отчетов закрыт`;
    } else {
        banner.className = 'w-full py-3 px-4 flex justify-center items-center gap-3 text-sm font-bold uppercase tracking-widest sticky top-0 z-40 shadow-md bg-slate-900 text-white';
        banner.innerHTML = `<i data-lucide="clock" class="w-4 h-4"></i> До дедлайна: <span class="text-emerald-400 ml-1">${state.timeRemaining}</span>`;
    }
    lucide.createIcons();
};

const render = () => {
    const app = document.getElementById('app');
    
    let content = '';
    
    // Banner
    content += `<div id="banner"></div>`;

    // Mobile Nav
    content += `
    <div class="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-900 z-50 flex justify-around p-0 md:hidden">
        <button onclick="navigate('create')" class="flex flex-col items-center justify-center p-3 w-full font-bold uppercase tracking-wider text-[10px] ${state.view === 'create' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}">
            <i data-lucide="file-edit" class="mb-1 w-5 h-5"></i> Отчет
        </button>
        <button onclick="navigate('dashboard')" class="flex flex-col items-center justify-center p-3 w-full font-bold uppercase tracking-wider text-[10px] ${state.view === 'dashboard' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}">
            <i data-lucide="layout-dashboard" class="mb-1 w-5 h-5"></i> Дашборд
        </button>
    </div>`;

    content += `<div class="max-w-4xl mx-auto p-4 md:p-8 space-y-8">`;

    if (state.view === 'select-dept') {
        content = renderDeptSelector(); // Override container for full screen
    } else {
        // Header
        content += `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b-2 border-slate-900 pb-4 gap-4">
           <div><h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 uppercase tracking-tight">${state.view === 'create' ? 'Корсовет' : 'Дашборд'}</h1></div>
           <div class="hidden md:flex bg-slate-100 p-1 border border-slate-300">
              <button onclick="navigate('create')" class="px-6 py-2 text-sm font-bold uppercase tracking-wide transition-all border ${state.view === 'create' ? 'bg-white border-slate-900 text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]' : 'border-transparent text-slate-500 hover:text-slate-900'}">Заполнить</button>
              <button onclick="navigate('dashboard')" class="px-6 py-2 text-sm font-bold uppercase tracking-wide transition-all border ${state.view === 'dashboard' ? 'bg-white border-slate-900 text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]' : 'border-transparent text-slate-500 hover:text-slate-900'}">Статистика</button>
           </div>
        </div>`;
        
        if (state.view === 'create') content += renderForm();
        else if (state.view === 'dashboard') content += renderDashboard();
    }
    
    content += `</div>`; // Close container

    app.innerHTML = content;
    renderBanner();
    lucide.createIcons();
    
    // Auto-resize textareas
    document.querySelectorAll('textarea').forEach(el => {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
        el.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    });
};

const renderDeptSelector = () => {
    return `
    <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div class="max-w-2xl w-full bg-white shadow-xl border-2 border-slate-900 p-6 md:p-10 animate-fade-in">
            <div class="flex justify-center mb-6 text-indigo-600"><i data-lucide="building-2" class="w-14 h-14"></i></div>
            <h1 class="text-3xl font-extrabold text-center mb-2 uppercase tracking-tight text-slate-900">Выберите отдел</h1>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar mt-10">
                ${DEPARTMENTS.map(dept => `
                    <button onclick="selectDept('${dept}')" class="group relative flex flex-col items-center justify-center p-4 border-2 border-slate-200 hover:border-indigo-600 hover:bg-indigo-50 transition-all active:scale-95">
                        <span class="font-extrabold text-slate-700 text-lg group-hover:text-indigo-700">${dept}</span>
                    </button>
                `).join('')}
            </div>
            <div class="mt-10 pt-6 border-t border-slate-100 text-center">
                <button onclick="navigate('dashboard')" class="text-sm font-bold text-slate-400 hover:text-slate-800 flex items-center justify-center mx-auto">
                    Перейти в Дашборд <i data-lucide="arrow-right" class="ml-1 w-4 h-4"></i>
                </button>
            </div>
        </div>
    </div>`;
};

const renderForm = () => {
    return `
    <div class="space-y-8 animate-fade-in ${state.isLocked ? 'opacity-80' : ''}">
        <!-- Header -->
        <header class="bg-white border-2 border-slate-900 relative shadow-[8px_8px_0px_0px_rgba(15,23,42,0.1)]">
            ${state.isLocked ? '<div class="absolute inset-0 z-10 bg-slate-100/50 cursor-not-allowed"></div>' : ''}
            <div class="bg-slate-900 text-white p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 bg-indigo-600 flex items-center justify-center shrink-0 border-2 border-white/20 shadow-lg">
                       <i data-lucide="building-2" class="text-white w-8 h-8"></i>
                    </div>
                    <div>
                        <div class="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-300 mb-1">Отдел</div>
                        <div class="text-4xl font-black uppercase tracking-tight leading-none text-white">${state.department}</div>
                    </div>
                </div>
            </div>
            <div class="p-6 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-t-4 border-indigo-600">
                <div class="flex flex-col gap-2">
                     <p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Тип отчета</p>
                     <div class="flex items-center gap-0 bg-white border-2 border-slate-200 p-1 rounded-none shadow-sm w-fit">
                        <button onclick="toggleType('weekly')" class="px-6 py-2 text-xs font-bold uppercase tracking-wider transition-all ${state.reportType === 'weekly' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}">Неделя</button>
                        <button onclick="toggleType('monthly')" class="px-6 py-2 text-xs font-bold uppercase tracking-wider transition-all ${state.reportType === 'monthly' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-600'}">Месяц</button>
                    </div>
                </div>
                <div class="w-full md:w-auto flex flex-col items-start md:items-end">
                     <p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">${state.reportType === 'weekly' ? 'Отчетный период' : 'Отчетный месяц'}</p>
                     <div class="w-full md:w-auto flex items-center gap-3 bg-white px-4 py-3 border-2 border-slate-900 shadow-sm hover:border-indigo-600 transition-colors">
                        <i data-lucide="calendar" class="${state.reportType === 'monthly' ? 'text-indigo-600' : 'text-slate-900'} w-6 h-6"></i>
                        <input type="text" value="${state.period.week_dates}" onchange="updatePeriod(this.value)" ${state.isLocked ? 'disabled' : ''} class="bg-transparent border-none p-0 text-slate-900 text-xl font-extrabold focus:outline-none w-full md:w-56 font-mono uppercase" />
                     </div>
                </div>
            </div>
        </header>


        <!-- KPI -->
        <section class="space-y-4">
            <h2 class="text-xl font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide"><i data-lucide="bar-chart-3" class="text-blue-600"></i>Показатели</h2>
            <div class="bg-white border-2 border-slate-300">
                 ${renderKpiRow('deals', 'Сделки', 'briefcase', 'blue')}
                 ${renderKpiRow('meetings', 'Планерки', 'users', 'blue')}
                 ${renderKpiRow('training', 'Обучение', 'graduation-cap', 'blue')}
            </div>
        </section>

        <!-- Tasks -->
        <section class="space-y-4">
             <h2 class="text-xl font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide"><i data-lucide="check-circle-2" class="text-emerald-600"></i>Задачи</h2>
             <div class="space-y-4">
                ${state.tasks.map((task, i) => renderTaskRow(task, i)).join('')}
             </div>
             ${!state.isLocked ? `<button onclick="addTask()" class="w-full py-4 border-2 border-dashed border-slate-400 text-slate-500 hover:border-slate-900 hover:text-slate-900 hover:bg-slate-50 transition-all font-bold uppercase tracking-wide flex items-center justify-center text-sm"><i data-lucide="plus" class="mr-2"></i> Добавить задачу</button>` : ''}
        </section>

        <!-- Unplanned -->
        <section class="space-y-4">
             <h2 class="text-xl font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide"><i data-lucide="alert-circle" class="text-amber-600"></i>Вне плана</h2>
             <div class="bg-amber-50 border-2 border-amber-200 p-6 space-y-4">
                ${state.unplannedTasks.length === 0 ? '<p class="text-sm text-slate-400 text-center py-2 font-medium">Нет незапланированных задач</p>' : ''}
                ${state.unplannedTasks.map(task => renderUnplannedRow(task)).join('')}
                ${!state.isLocked ? `<button onclick="addUnplanned()" class="w-full sm:w-auto bg-white border-2 border-amber-500 text-amber-700 hover:bg-amber-500 hover:text-white font-bold py-2 px-6 uppercase text-xs tracking-wider transition-colors flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(245,158,11,0.2)]"><i data-lucide="plus" class="mr-2 w-4 h-4"></i> Добавить</button>` : ''}
             </div>
        </section>

        <!-- Footer -->
        <footer class="bg-slate-900 text-white p-6 md:p-8 border-t-4 border-indigo-500 mb-8 flex justify-center">
            ${state.isLocked 
                ? `<button onclick="resetForm()" class="w-full max-w-md bg-red-600 hover:bg-red-500 text-white font-bold py-4 px-10 uppercase tracking-widest text-sm flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]"><i data-lucide="refresh-cw" class="mr-3"></i> Сменить отдел / Новый отчет</button>`
                : `<button onclick="submitReport()" ${state.isSubmitting ? 'disabled' : ''} class="w-full max-w-md bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-10 uppercase tracking-widest text-sm flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]">
                    ${state.isSubmitting ? '<i data-lucide="loader-2" class="mr-3 animate-spin"></i> Сохранение...' : `<i data-lucide="save" class="mr-3"></i> ${state.editingId ? 'Обновить отчет' : 'Сохранить отчет'}`}
                  </button>`
            }
        </footer>
    </div>`;
};

const renderKpiRow = (key, title, icon, color) => {
    return `
    <div class="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-start md:items-center p-3 md:p-4 border-b last:border-0 border-slate-200 hover:bg-slate-50">
        <div class="md:col-span-3 flex items-center gap-3 font-bold text-slate-700 mb-2 md:mb-0">
            <div class="p-2 shrink-0 border bg-${color}-100 text-${color}-700 border-${color}-200"><i data-lucide="${icon}" class="w-5 h-5"></i></div>
            <span class="text-base uppercase tracking-tight">${title}</span>
        </div>
        <div class="md:col-span-2 w-full">
            <input type="number" value="${state.kpis[key].quantity}" oninput="updateKpi('${key}', 'quantity', this.value)" ${state.isLocked ? 'disabled' : ''} class="w-full px-3 py-2 bg-white text-slate-900 text-base border-2 border-slate-300 focus:outline-none focus:border-blue-600 font-mono text-center h-[42px]" placeholder="0">
        </div>
        <div class="md:col-span-7 w-full">
            <textarea rows="1" oninput="updateKpi('${key}', 'description', this.value)" ${state.isLocked ? 'disabled' : ''} class="w-full px-3 py-2 bg-white text-slate-900 text-base border-2 border-slate-300 focus:outline-none focus:border-blue-600 resize-none overflow-hidden min-h-[42px] leading-normal" placeholder="Описание">${state.kpis[key].description}</textarea>
        </div>
    </div>`;
};

const renderTaskRow = (task, index) => {
    const status = STATUS_OPTIONS.find(s => s.value === task.status) || STATUS_OPTIONS[2];
    return `
    <div class="border-2 border-slate-300 p-3 md:p-4 relative group bg-white hover:border-slate-400">
        <div class="flex justify-end items-center mb-1 md:hidden">
            <button onclick="removeTask('${task.id}')" class="p-1.5 text-slate-400 hover:text-red-600"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4">
            <div class="md:col-span-4">
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Задача</label>
                <textarea rows="1" oninput="updateTask('${task.id}', 'task_text', this.value)" class="w-full px-3 py-2 bg-slate-50 text-slate-900 text-sm md:text-base border-2 border-slate-200 focus:bg-white focus:outline-none focus:border-indigo-600 resize-none overflow-hidden min-h-[42px]" placeholder="Суть задачи">${task.task_text}</textarea>
            </div>
            <div class="md:col-span-3">
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Продукт</label>
                <textarea rows="1" oninput="updateTask('${task.id}', 'product', this.value)" class="w-full px-3 py-2 bg-slate-50 text-slate-900 text-sm md:text-base border-2 border-slate-200 focus:bg-white focus:outline-none focus:border-indigo-600 resize-none overflow-hidden min-h-[42px]" placeholder="Ожидаемый итог">${task.product}</textarea>
            </div>
            <div class="md:col-span-3">
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Результат</label>
                <div class="relative">
                    <select onchange="updateTask('${task.id}', 'status', this.value)" class="w-full px-3 py-2 h-[42px] border-2 appearance-none text-sm md:text-base font-bold focus:outline-none ${status.color}">
                        ${STATUS_OPTIONS.map(opt => `<option value="${opt.value}" class="bg-white text-slate-900" ${task.status === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="hidden md:flex md:col-span-2 items-end justify-end">
                <button onclick="removeTask('${task.id}')" class="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 h-[42px] flex items-center justify-center"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
            </div>
        </div>
        <div class="mt-3 pt-2 border-t border-slate-100">
             <div class="flex items-center gap-2">
                 <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Комментарий:</label>
                 <textarea rows="1" oninput="updateTask('${task.id}', 'comment', this.value)" class="w-full px-2 py-1 text-sm text-slate-700 italic bg-transparent border-b border-slate-200 hover:border-slate-400 focus:border-indigo-600 focus:outline-none resize-none overflow-hidden min-h-[30px]" placeholder="Примечания...">${task.comment}</textarea>
             </div>
        </div>
    </div>`;
};

const renderUnplannedRow = (task) => {
    const status = STATUS_OPTIONS.find(s => s.value === task.status) || STATUS_OPTIONS[0];
    return `
    <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-start bg-white p-4 border border-amber-300 shadow-sm">
        <div class="md:col-span-5 w-full">
           <textarea rows="1" oninput="updateUnplanned('${task.id}', 'task_text', this.value)" class="w-full px-3 py-2 bg-transparent text-slate-900 text-sm md:text-base border-b-2 border-slate-200 focus:border-amber-500 focus:outline-none resize-none overflow-hidden min-h-[42px]" placeholder="Что прилетело внезапно?">${task.task_text}</textarea>
        </div>
        <div class="md:col-span-4 w-full">
          <textarea rows="1" oninput="updateUnplanned('${task.id}', 'product', this.value)" class="w-full px-3 py-2 bg-transparent text-slate-900 text-sm md:text-base border-b-2 border-slate-200 focus:border-amber-500 focus:outline-none resize-none overflow-hidden min-h-[42px]" placeholder="Продукт (итог)">${task.product}</textarea>
        </div>
        <div class="md:col-span-3 flex gap-2 items-start">
          <div class="relative flex-grow">
              <select onchange="updateUnplanned('${task.id}', 'status', this.value)" class="w-full appearance-none text-sm md:text-base border-2 border-slate-200 px-3 py-2 focus:outline-none focus:border-amber-500 font-bold h-[42px] ${status.color}">
                ${STATUS_OPTIONS.filter(o => o.value !== 'Без статуса').map(opt => `<option value="${opt.value}" class="bg-white text-slate-900" ${task.status === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
              </select>
          </div>
          <button onclick="removeUnplanned('${task.id}')" class="px-3 py-2 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 h-[42px] flex items-center justify-center"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
        </div>
    </div>`;
};

const renderDashboard = () => {
    // Filter logic
    const reports = state.history.filter(r => r.report_type === state.reportType);
    let total = 0, done = 0;
    reports.forEach(r => { total += r.calculated_stats.total; done += r.calculated_stats.done; });
    const percent = total > 0 ? Math.round((done/total)*100) : 0;

    return `
    <div class="space-y-8 animate-fade-in">
        <!-- Filter -->
        <div class="flex justify-center mb-6">
            <div class="flex bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,0.1)] p-1">
                <button onclick="setDashboardFilter('weekly')" class="px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all ${state.reportType === 'weekly' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-900'}">Недельные</button>
                <button onclick="setDashboardFilter('monthly')" class="px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all ${state.reportType === 'monthly' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-indigo-600'}">Месячные</button>
            </div>
        </div>

        <!-- Overview -->
        <div class="p-6 md:p-8 text-white shadow-[8px_8px_0px_0px_rgba(30,27,75,1)] border-2 border-indigo-900 transition-colors ${state.reportType === 'monthly' ? 'bg-indigo-700' : 'bg-slate-800'}">
             <div class="flex justify-between items-start mb-8">
                <div>
                   <h2 class="text-2xl font-extrabold flex items-center gap-3 uppercase tracking-tight"><i data-lucide="trending-up" class="text-indigo-300 w-8 h-8"></i> ${state.reportType === 'weekly' ? 'Эффективность (Нед)' : 'Эффективность (Мес)'}</h2>
                   <p class="text-indigo-200 text-sm mt-2 font-medium tracking-wide">Сводная статистика</p>
                </div>
             </div>
             <div class="flex items-end justify-between border-t border-indigo-500 pt-6">
                <div class="space-y-1">
                    <div class="text-6xl font-extrabold tracking-tighter">${percent}%</div>
                    <div class="text-indigo-300 text-xs font-bold uppercase tracking-[0.2em]">Общий КПД</div>
                </div>
                <div class="flex gap-8 text-right">
                    <div><div class="text-3xl font-bold font-mono">${done}</div><div class="text-[10px] text-indigo-300 uppercase tracking-widest mt-1">Факт</div></div>
                    <div><div class="text-3xl font-bold font-mono opacity-60">${total}</div><div class="text-[10px] text-indigo-300 uppercase tracking-widest mt-1">План</div></div>
                </div>
             </div>
             <div class="mt-8 w-full bg-indigo-900 h-4 border border-indigo-500"><div class="bg-emerald-400 h-full transition-all duration-1000 ease-out" style="width: ${percent}%"></div></div>
        </div>

        <!-- List -->
        <div>
            <h3 class="text-xl font-bold text-slate-900 mb-6 px-1 uppercase tracking-wide border-l-4 border-slate-900 pl-4">История отчетов</h3>
            ${reports.length === 0 ? `<div class="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-300 text-slate-400"><p class="font-bold uppercase tracking-widest text-xs">Нет отчетов</p></div>` : 
            `<div class="space-y-4">${reports.map(report => renderReportItem(report)).join('')}</div>`}
        </div>
    </div>`;
};

const renderReportItem = (report) => {
    // Generate simple ID for DOM toggle
    const domId = 'rep-' + report.id;
    // We use onclick handler with inline style display toggle for simplicity
    return `
    <div class="bg-white border-2 border-slate-300 shadow-sm hover:border-slate-400 transition-all duration-300">
        <div onclick="document.getElementById('${domId}').classList.toggle('hidden');" class="p-5 cursor-pointer bg-white hover:bg-slate-50 transition-colors">
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-4">
                    <div class="p-3 border bg-slate-50 text-slate-500 border-slate-200"><i data-lucide="calendar" class="w-6 h-6"></i></div>
                    <div>
                        <div class="mb-1 flex gap-2">
                             <span class="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider border border-slate-200"><i data-lucide="building-2" class="w-3 h-3"></i> ${report.department}</span>
                             <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider border bg-slate-800 text-white border-slate-900">${report.report_type === 'monthly' ? 'Месяц' : 'Неделя'}</span>
                        </div>
                        <div class="font-extrabold text-slate-800 text-xl font-mono tracking-tight">${report.period.week_dates}</div>
                    </div>
                </div>
                <div class="px-4 py-2 text-sm font-bold border-2 ${report.calculated_stats.percent >= 80 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}">${report.calculated_stats.percent}%</div>
            </div>
        </div>
        
        <!-- Details -->
        <div id="${domId}" class="hidden border-t-2 border-indigo-100 bg-slate-50 p-6 space-y-8 animate-fade-in">
             <div class="flex justify-end mb-6">
                  <button onclick="editReport('${report.id}')" class="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold uppercase text-xs px-4 py-2 border border-indigo-200 tracking-wide transition-colors"><i data-lucide="pencil" class="w-3 h-3"></i> Редактировать</button>
             </div>
             
             <!-- KPIs -->
             <div>
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><i data-lucide="users" class="w-4 h-4"></i> Показатели</h4>
                <div class="grid grid-cols-1 gap-3">
                    ${['deals', 'meetings', 'training'].map(k => {
                        const item = report.kpi_indicators[k];
                        if (item.quantity === 0 && !item.description) return '';
                        return `<div class="bg-white p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-2">
                            <div class="flex items-center gap-3 shrink-0"><span class="text-slate-800 font-bold uppercase text-sm w-24">${k}</span><span class="bg-blue-100 text-blue-800 text-xs px-3 py-1 font-bold border border-blue-200">${item.quantity}</span></div>
                            <span class="text-sm text-slate-600 font-mono border-l-2 border-slate-100 pl-3 w-full">${item.description}</span>
                        </div>`;
                    }).join('')}
                </div>
             </div>

             <!-- Tasks (Numbered) -->
             <div class="mt-8">
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><i data-lucide="check-circle-2" class="w-4 h-4"></i> Задачи</h4>
                <div class="space-y-4">
                    ${report.tasks.map((t, idx) => `
                    <div class="bg-white p-4 border border-slate-200 shadow-sm relative pl-4">
                        <div class="absolute left-0 top-0 bottom-0 w-1 ${t.status === 'Выполнено' ? 'bg-emerald-600' : 'bg-red-600'}"></div>
                        <div class="flex flex-col md:flex-row justify-between items-start gap-4 mb-3">
                            <div class="flex gap-3 items-start w-full">
                                <span class="text-slate-400 font-mono font-bold text-lg">${idx + 1}.</span>
                                <span class="font-bold text-slate-900 text-lg leading-tight">${t.task_text}</span>
                            </div>
                            <span class="shrink-0 text-[10px] uppercase font-bold px-3 py-1.5 border rounded-sm ${STATUS_OPTIONS.find(s=>s.value===t.status)?.color}">${t.status}</span>
                        </div>
                        <div class="text-sm text-slate-600 mb-2 font-mono bg-slate-50 p-2 border border-slate-100 inline-block w-full">
                            <span class="font-bold text-[10px] uppercase text-slate-400 mr-2 block mb-1">Продукт:</span>${t.product}
                        </div>
                    </div>`).join('')}
                </div>
             </div>
             
             <!-- Unplanned (Numbered) -->
             ${report.unplanned_tasks.length > 0 ? `
             <div class="mt-8">
                 <h4 class="text-xs font-bold text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2"><i data-lucide="alert-circle" class="w-4 h-4"></i> Вне плана</h4>
                 <div class="space-y-3">
                     ${report.unplanned_tasks.map((t, idx) => `
                     <div class="bg-amber-50 p-4 border border-amber-200 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                         <div class="flex flex-col w-full">
                             <div class="flex gap-2 items-start">
                                 <span class="text-amber-700/50 font-mono font-bold text-sm">${idx + 1}.</span>
                                 <span class="text-slate-800 text-sm font-bold">${t.task_text}</span>
                             </div>
                             <span class="text-slate-500 text-xs italic mt-1 pl-5">Продукт: ${t.product}</span>
                         </div>
                         <span class="shrink-0 text-[10px] uppercase font-bold px-3 py-1.5 border rounded-sm ${STATUS_OPTIONS.find(s=>s.value===t.status)?.color}">${t.status}</span>
                     </div>`).join('')}
                 </div>
             </div>` : ''}
        </div>
    </div>`;
};

// --- ACTIONS ---

window.navigate = (view) => {
    state.view = view;
    render();
    window.scrollTo(0,0);
};

window.selectDept = (dept) => {
    state.department = dept;
    state.reportType = 'weekly';
    state.period.week_dates = getWeekRange();
    state.tasks = [{ id: generateId(), task_text: '', product: '', status: 'Без статуса', comment: '' }];
    state.editingId = null;
    navigate('create');
};

window.toggleType = (type) => {
    state.reportType = type;
    state.period.week_dates = type === 'weekly' ? getWeekRange() : getCurrentMonthName();
    render();
};

window.updatePeriod = (val) => { state.period.week_dates = val; state.period.is_manual = true; };
window.updateKpi = (key, field, val) => { state.kpis[key][field] = val; };
window.addTask = () => { state.tasks.push({ id: generateId(), task_text: '', product: '', status: 'Без статуса', comment: '' }); render(); };
window.removeTask = (id) => { state.tasks = state.tasks.filter(t => t.id !== id); render(); };
window.updateTask = (id, field, val) => { const t = state.tasks.find(x => x.id === id); if(t) t[field] = val; };
window.addUnplanned = () => { state.unplannedTasks.push({ id: generateId(), task_text: '', product: '', status: 'Выполнено' }); render(); };
window.removeUnplanned = (id) => { state.unplannedTasks = state.unplannedTasks.filter(t => t.id !== id); render(); };
window.updateUnplanned = (id, field, val) => { const t = state.unplannedTasks.find(x => x.id === id); if(t) t[field] = val; };
window.updateUserInfo = (field, val) => { state.userInfo[field] = val; };

window.resetForm = () => {
    if(!confirm('Сбросить форму?')) return;
    state.department = '';
    state.editingId = null;
    navigate('select-dept');
};

window.editReport = (id) => {
    const report = state.history.find(r => r.id === id);
    if (!report) return;
    if (!confirm('Загрузить отчет?')) return;
    
    state.department = report.department;
    state.reportType = report.report_type;
    state.period = report.period;
    state.kpis = JSON.parse(JSON.stringify(report.kpi_indicators));
    // Re-generate IDs for UI logic
    state.tasks = report.tasks.map(t => ({...t, id: generateId()}));
    state.unplannedTasks = report.unplanned_tasks.map(t => ({...t, id: generateId()}));
    state.editingId = report.id;
    navigate('create');
};

window.setDashboardFilter = (type) => {
    state.reportType = type;
    render();
};

window.submitReport = async () => {
    if (state.isLocked) return;
    state.isSubmitting = true;
    render(); // Update button state

    const validTasks = state.tasks.filter(t => t.task_text.trim());
    const validUnplanned = state.unplannedTasks.filter(t => t.task_text.trim());

    // Check for merge
    const existing = state.history.find(r => r.department === state.department && r.report_type === state.reportType && r.period.week_dates === state.period.week_dates);

    let finalPayload = {
        department: state.department,
        report_type: state.reportType,
        period: state.period,
        kpi_indicators: state.kpis,
        tasks: validTasks, // IDs will be stripped on server or here. Just sending as is for now.
        unplanned_tasks: validUnplanned,
        calculated_stats: {
             done: validTasks.filter(t => t.status === 'Выполнено').length,
             total: validTasks.length,
             percent: validTasks.length > 0 ? Math.round((validTasks.filter(t => t.status === 'Выполнено').length / validTasks.length) * 100) : 0
        },
        id: generateId(),
        created_at: new Date().toISOString()
    };

    if (state.editingId) {
        // Full overwrite
        finalPayload.id = state.editingId;
    } else if (existing) {
        // Merge
        const mergedTasks = [...existing.tasks, ...validTasks];
        const mergedUnplanned = [...existing.unplanned_tasks, ...validUnplanned];
        finalPayload.id = existing.id; // Keep old ID
        finalPayload.created_at = new Date().toISOString();
        finalPayload.tasks = mergedTasks;
        finalPayload.unplanned_tasks = mergedUnplanned;
        finalPayload.calculated_stats = {
             done: mergedTasks.filter(t => t.status === 'Выполнено').length,
             total: mergedTasks.length,
             percent: mergedTasks.length > 0 ? Math.round((mergedTasks.filter(t => t.status === 'Выполнено').length / mergedTasks.length) * 100) : 0
        };
    }

    try {
        await fetch('/api/reports', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(finalPayload)
        });
        await api.fetchReports(); // Refresh
        alert('Сохранено!');
        state.editingId = null;
        navigate('dashboard');
    } catch(e) {
        alert('Ошибка');
    } finally {
        state.isSubmitting = false;
        render();
    }
};

// Start
init();