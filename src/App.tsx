import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { 
  UserPlus, 
  Calendar, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  Trash2, 
  Check, 
  X, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Edit2, 
  Plus, 
  Minus,
  Settings,
  Briefcase,
  Layers,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { Employee, Vacation, EmployeeStats } from "./types";

const monthNames = [
  "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", 
  "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"
];

const monthShortNames = [
  "Січ", "Лют", "Бер", "Кві", "Тра", "Чер", 
  "Лип", "Сер", "Вер", "Жов", "Лис", "Гру"
];

const dayNames = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

function getDurationInDays(startStr: string, endStr: string): number {
  const s = new Date(startStr + "T00:00:00");
  const e = new Date(endStr + "T00:00:00");
  const diffTime = e.getTime() - s.getTime();
  if (diffTime < 0) return 0;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states for creating employee
  const [isAddingEmp, setIsAddingEmp] = useState<boolean>(false);
  const [newEmpName, setNewEmpName] = useState<string>("");
  const [newEmpInitial, setNewEmpInitial] = useState<string>("");
  const [newEmpColor, setNewEmpColor] = useState<string>("#3498db");
  const [newEmpMainLimit, setNewEmpMainLimit] = useState<number>(24);
  const [newEmpAddLimit, setNewEmpAddLimit] = useState<number>(0);
  const [newEmpOthLimit, setNewEmpOthLimit] = useState<number>(0);

  // Form states for editing employee
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  // State for confirming employee deletion
  const [employeeToDelete, setEmployeeToDelete] = useState<{ id: number; name: string } | null>(null);

  // Active form state for adding vacation to an employee card
  const [activeBookingEmpId, setActiveBookingEmpId] = useState<number | null>(null);
  const [vacationStart, setVacationStart] = useState<string>("");
  const [vacationEnd, setVacationEnd] = useState<string>("");
  const [vacationType, setVacationType] = useState<"основна" | "додаткова" | "інша">("основна");
  const [customOtherType, setCustomOtherType] = useState<string>("");

  // States for editing an existing vacation period
  const [editingVacationId, setEditingVacationId] = useState<number | null>(null);
  const [editVacationStart, setEditVacationStart] = useState<string>("");
  const [editVacationEnd, setEditVacationEnd] = useState<string>("");
  const [editVacationType, setEditVacationType] = useState<"основна" | "додаткова" | "інша">("основна");
  const [editCustomOtherType, setEditCustomOtherType] = useState<string>("");

  const startEditingVacation = (v: Vacation) => {
    setEditingVacationId(v.id || null);
    setEditVacationStart(v.start_date);
    setEditVacationEnd(v.end_date);
    if (v.type === "основна" || v.type === "додаткова") {
      setEditVacationType(v.type);
      setEditCustomOtherType("");
    } else {
      setEditVacationType("інша");
      if (v.type.startsWith("інша:")) {
        setEditCustomOtherType(v.type.substring(5).trim());
      } else if (v.type.startsWith("інша")) {
        setEditCustomOtherType(v.type.substring(4).trim());
      } else {
        setEditCustomOtherType(v.type);
      }
    }
  };

  // File input ref for JSON imports
  const fileInputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Fetch all employees and periods
  const fetchEmployees = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/employees");
      if (!res.ok) throw new Error("Помилка завантаження даних із сервера.");
      const data = await res.json();
      setEmployees(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Не вдалося з'єднатися з сервером.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Show a disappearing banner message
  const triggerBanner = (message: string, isError = false) => {
    if (isError) {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 6000);
    } else {
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // 1. Employee CRUD Handlers
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim() || !newEmpInitial.trim()) {
      triggerBanner("ПІБ та ініціали обов'язкові до заповнення.", true);
      return;
    }

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newEmpName,
          initial: newEmpInitial.toUpperCase(),
          color: newEmpColor,
          main_vacation_limit: newEmpMainLimit,
          additional_vacation_limit: newEmpAddLimit,
          other_vacation_limit: newEmpOthLimit
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не вдалося зберегти працівника.");
      }

      triggerBanner(`Працівника ${data.name} успішно додано.`);
      // Reset
      setNewEmpName("");
      setNewEmpInitial("");
      setNewEmpColor("#3498db");
      setNewEmpMainLimit(24);
      setNewEmpAddLimit(0);
      setNewEmpOthLimit(0);
      setIsAddingEmp(false);
      fetchEmployees();
    } catch (err: any) {
      triggerBanner(err.message, true);
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;

    try {
      const res = await fetch(`/api/employees/${editingEmp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingEmp)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не вдалося оновити дані.");
      }

      triggerBanner(`Дані працівника ${data.name} оновлено.`);
      setEditingEmp(null);
      fetchEmployees();
    } catch (err: any) {
      triggerBanner(err.message, true);
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не вдалося видалити працівника.");

      if (employeeToDelete) {
        triggerBanner(`Працівника ${employeeToDelete.name} видалено з бази.`);
      } else {
        triggerBanner(`Працівника видалено з бази.`);
      }
      setEmployeeToDelete(null);
      fetchEmployees();
    } catch (err: any) {
      triggerBanner(err.message, true);
    }
  };

  // 2. Vacation CRUD Handlers
  const handleAddVacation = async (empId: number) => {
    if (!vacationStart || !vacationEnd) {
      triggerBanner("Будь ласка, оберіть дату початку та завершення.", true);
      return;
    }

    try {
      const res = await fetch("/api/vacations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: empId,
          start_date: vacationStart,
          end_date: vacationEnd,
          type: vacationType === "інша" && customOtherType.trim() ? `інша: ${customOtherType.trim()}` : vacationType
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не вдалося запланувати відпустку.");
      }

      triggerBanner("Період відпустки успішно додано.");
      setVacationStart("");
      setVacationEnd("");
      setCustomOtherType("");
      setActiveBookingEmpId(null);
      fetchEmployees();
    } catch (err: any) {
      triggerBanner(err.message, true);
    }
  };

  const handleUpdateVacation = async (vacId: number) => {
    if (!editVacationStart || !editVacationEnd) {
      triggerBanner("Будь ласка, оберіть дату початку та завершення.", true);
      return;
    }

    try {
      const res = await fetch(`/api/vacations/${vacId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: editVacationStart,
          end_date: editVacationEnd,
          type: editVacationType === "інша" && editCustomOtherType.trim() ? `інша: ${editCustomOtherType.trim()}` : editVacationType
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не вдалося оновити відпустку.");
      }

      triggerBanner("Період відпустки успішно оновлено.");
      setEditingVacationId(null);
      setEditCustomOtherType("");
      fetchEmployees();
    } catch (err: any) {
      triggerBanner(err.message, true);
    }
  };

  const handleToggleVacationStatus = async (vac: Vacation) => {
    const newStatus = vac.status === "Запланована" ? "Використана" : "Запланована";
    try {
      const res = await fetch(`/api/vacations/${vac.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не вдалося оновити статус.");

      triggerBanner(`Відпустку відмічено як ${newStatus === "Використана" ? "відбуту" : "заплановану"}.`);
      fetchEmployees();
    } catch (err: any) {
      triggerBanner(err.message, true);
    }
  };

  const handleDeleteVacation = async (vacId: number) => {
    if (!confirm("Ви дійсно бажаєте видалити цей період відпустки?")) return;

    try {
      const res = await fetch(`/api/vacations/${vacId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не вдалося видалити відпустку.");

      triggerBanner("Період відпустки видалено.");
      fetchEmployees();
    } catch (err: any) {
      triggerBanner(err.message, true);
    }
  };

  // 3. Export Handlers
  const handleExportImage = async () => {
    if (!calendarRef.current) return;
    const btn = document.getElementById("png-btn");
    const originalText = btn ? btn.innerHTML : "";
    if (btn) btn.innerHTML = "⏳ Збереження...";

    try {
      const canvas = await html2canvas(calendarRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false
      });

      const link = document.createElement("a");
      link.download = `Графік_Відпусток_${selectedYear}.png`;
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerBanner("Зображення календаря успішно завантажено.");
    } catch (err: any) {
      triggerBanner("Помилка генерації PNG: " + err.message, true);
    } finally {
      if (btn) btn.innerHTML = originalText;
    }
  };

  const handleExportExcel = () => {
    // Standard window redirect triggers server-side attachment download
    window.location.href = "/api/export/excel";
  };

  const handleExportJSON = async () => {
    try {
      const res = await fetch("/api/export/json");
      const data = await res.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `vacations_backup_${selectedYear}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      triggerBanner("Резервну копію JSON збережено.");
    } catch (err: any) {
      triggerBanner("Не вдалося експортувати JSON: " + err.message, true);
    }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const payload = JSON.parse(event.target?.result as string);
        if (!payload.employees || !payload.vacations) {
          throw new Error("Файл має некоректний формат резервної копії.");
        }

        if (!confirm("Увага! Імпортування видалить усі поточні записи та замінить їх даними з файлу. Продовжити?")) {
          return;
        }

        const res = await fetch("/api/import/json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Не вдалося виконати імпорт.");

        triggerBanner("Резервну копію успішно відновлено!");
        fetchEmployees();
      } catch (err: any) {
        triggerBanner("Помилка імпортування: " + err.message, true);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset
  };

  // Helper stats builder for any selected year
  const getEmployeeStats = (employee: Employee, year: number): EmployeeStats => {
    let main_used = 0;
    let additional_used = 0;
    let other_used = 0;

    employee.vacations.forEach(vac => {
      const vStart = new Date(vac.start_date + "T00:00:00");
      const vEnd = new Date(vac.end_date + "T00:00:00");
      const yearStart = new Date(`${year}-01-01T00:00:00`);
      const yearEnd = new Date(`${year}-12-31T00:00:00`);

      const actualStart = vStart > yearStart ? vStart : yearStart;
      const actualEnd = vEnd < yearEnd ? vEnd : yearEnd;

      if (actualStart <= actualEnd) {
        const diff = actualEnd.getTime() - actualStart.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
        if (vac.type === "основна") {
          main_used += days;
        } else if (vac.type === "додаткова") {
          additional_used += days;
        } else if (vac.type === "інша") {
          other_used += days;
        }
      }
    });

    return {
      main_used,
      main_remaining: employee.main_vacation_limit - main_used,
      additional_used,
      additional_remaining: employee.additional_vacation_limit - additional_used,
      other_used,
      other_remaining: employee.other_vacation_limit - other_used,
    };
  };

  // Get days in a month helper
  const getDaysInMonth = (monthIdx: number, year: number) => {
    return new Date(year, monthIdx + 1, 0).getDate();
  };

  // Get day of week helper
  const getDayOfWeekName = (day: number, monthIdx: number, year: number) => {
    const d = new Date(year, monthIdx, day).getDay();
    return dayNames[d];
  };

  const isWeekend = (day: number, monthIdx: number, year: number) => {
    const d = new Date(year, monthIdx, day).getDay();
    return d === 0 || d === 6; // Sunday or Saturday
  };

  // Build overall vacation index mapping date string to scheduled vacations
  const getVacationsForDate = (day: number, monthIdx: number, year: number) => {
    const daysCount = getDaysInMonth(monthIdx, year);
    if (day > daysCount) return null;

    const dateStr = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const active: { emp: Employee; vac: Vacation }[] = [];

    employees.forEach(emp => {
      emp.vacations.forEach(v => {
        if (dateStr >= v.start_date && dateStr <= v.end_date) {
          active.push({ emp, vac: v });
        }
      });
    });

    return active;
  };

  return (
    <div className="min-h-screen bg-[#ecf0f1] text-[#2c3e50] font-sans antialiased flex flex-col">
      {/* Top Header */}
      <header className="h-16 bg-[#2c3e50] text-white flex items-center justify-between px-6 shrink-0 shadow-lg select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#3498db] flex items-center justify-center font-bold text-sm tracking-widest text-white rounded-none">
            HR
          </div>
          <div>
            <h1 className="text-sm md:text-base font-semibold tracking-wide uppercase">
              Модуль Управління Відпустками v2.4
            </h1>
            <p className="text-[10px] text-slate-300 font-mono tracking-tighter">
              Senior Management Console • SQLite Database
            </p>
          </div>
        </div>

        {/* Quick Stats Panel Header */}
        <div className="hidden md:flex items-center gap-4 bg-[#34495e] border border-white/10 rounded-sm px-4 py-1.5">
          <div className="text-right">
            <div className="text-[9px] uppercase font-mono tracking-wider text-slate-300">Всього працівників</div>
            <div className="text-sm font-bold text-emerald-400 font-mono">{employees.length}</div>
          </div>
          <div className="w-px h-6 bg-slate-600" />
          <div className="text-right">
            <div className="text-[9px] uppercase font-mono tracking-wider text-slate-300">Активний Рік</div>
            <div className="text-sm font-bold text-teal-400 font-mono">{selectedYear}</div>
          </div>
        </div>
      </header>

      {/* Main Body Grid */}
      <main className="max-w-7xl w-full mx-auto px-4 py-6 md:px-6 flex-1">
        {/* Alerts & Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-[#27ae60] text-[#27ae60] rounded shadow-sm flex items-center gap-3 animate-fade-in">
            <Check className="w-5 h-5 text-[#27ae60] flex-shrink-0" />
            <div className="text-sm font-medium">{successMessage}</div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 rounded shadow-sm flex items-center gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div className="text-sm font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Outer Flex Container for Sidebar vs. Calendar */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* LEFT SIDEBAR: Controls & Data Management (Fixed 340px width on desktop) */}
          <div className="w-full lg:w-[350px] flex-shrink-0 flex flex-col gap-6">
            
            {/* 1. Global Controls */}
            <div className="bg-white border border-[#dcdfe0] rounded-sm p-4 shadow-sm">
              <h3 className="text-xs font-bold text-[#7f8c8d] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Settings className="w-3.5 h-3.5 text-[#7f8c8d]" />
                Управління даними
              </h3>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  id="png-btn"
                  onClick={handleExportImage}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#27ae60] hover:bg-[#2ecc71] text-white rounded-sm text-xs font-bold uppercase tracking-tighter shadow-sm transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Зберегти PNG
                </button>

                <button
                  onClick={handleExportExcel}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#3498db] hover:bg-[#2980b9] text-white rounded-sm text-xs font-bold uppercase tracking-tighter shadow-sm transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Звіт Excel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportJSON}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#34495e] hover:bg-[#455d75] text-white rounded-sm text-xs font-bold uppercase tracking-tighter shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Експорт JSON
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#34495e] hover:bg-[#455d75] text-white rounded-sm text-xs font-bold uppercase tracking-tighter shadow-sm transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Імпорт JSON
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportJSON}
                accept=".json"
                className="hidden"
              />
            </div>

            {/* 2. Create Employee Card */}
            <div className="bg-white border border-[#dcdfe0] rounded-sm p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-[#ecf0f1] pb-2">
                <h3 className="text-xs font-bold text-[#7f8c8d] uppercase tracking-widest flex items-center gap-2">
                  <UserPlus className="w-3.5 h-3.5 text-[#7f8c8d]" />
                  Кадровий склад
                </h3>
                <button
                  onClick={() => setIsAddingEmp(!isAddingEmp)}
                  className="text-xs font-bold text-[#3498db] hover:text-[#2980b9] flex items-center gap-0.5 transition-colors"
                >
                  {isAddingEmp ? "Скасувати" : "+ Додати"}
                </button>
              </div>

              {isAddingEmp && (
                <form onSubmit={handleAddEmployee} className="space-y-4 bg-[#f4f7f8] p-3 rounded-sm border border-[#dcdfe0] mb-4 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-bold text-[#7f8c8d] uppercase mb-1">Прізвище та ініціали (ПІБ):</label>
                    <input
                      type="text"
                      required
                      placeholder="напр. Ковальчук О. П."
                      value={newEmpName}
                      onChange={(e) => setNewEmpName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-[#bdc3c7] rounded-sm text-xs text-[#2c3e50] font-medium focus:outline-none focus:border-[#3498db]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-[#7f8c8d] uppercase mb-1">Ініціали (для сітки):</label>
                      <input
                        type="text"
                        required
                        maxLength={3}
                        placeholder="напр. КО"
                        value={newEmpInitial}
                        onChange={(e) => setNewEmpInitial(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-[#bdc3c7] rounded-sm text-xs uppercase text-center font-bold text-[#2c3e50] focus:outline-none focus:border-[#3498db]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#7f8c8d] uppercase mb-1">Колір маркування:</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={newEmpColor}
                          onChange={(e) => setNewEmpColor(e.target.value)}
                          className="w-8 h-8 rounded-sm border border-[#bdc3c7] cursor-pointer p-0"
                        />
                        <span className="text-xs font-mono font-bold uppercase text-[#2c3e50]">{newEmpColor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-sm border border-[#dcdfe0] space-y-2">
                    <div className="text-[9px] font-bold text-[#7f8c8d] uppercase tracking-wider mb-2">Річні норми відпусток (днів):</div>
                    <div className="flex items-center justify-between text-xs font-semibold text-[#2c3e50]">
                      <span>Основна:</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        required
                        value={newEmpMainLimit}
                        onChange={(e) => setNewEmpMainLimit(parseInt(e.target.value) || 0)}
                        className="w-14 px-1 py-0.5 border border-[#bdc3c7] rounded-sm text-center font-bold font-mono"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold text-[#2c3e50]">
                      <span>Додаткова:</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        required
                        value={newEmpAddLimit}
                        onChange={(e) => setNewEmpAddLimit(parseInt(e.target.value) || 0)}
                        className="w-14 px-1 py-0.5 border border-[#bdc3c7] rounded-sm text-center font-bold font-mono"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold text-[#2c3e50]">
                      <span>Інші види:</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        required
                        value={newEmpOthLimit}
                        onChange={(e) => setNewEmpOthLimit(parseInt(e.target.value) || 0)}
                        className="w-14 px-1 py-0.5 border border-[#bdc3c7] rounded-sm text-center font-bold font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-[#27ae60] hover:bg-[#2ecc71] text-white rounded-sm font-bold text-xs uppercase tracking-tight shadow transition-colors cursor-pointer"
                  >
                    Зберегти працівника
                  </button>
                </form>
              )}
            </div>

            {/* 3. Employee List Container */}
            <div className="bg-white border border-[#dcdfe0] rounded-sm p-4 shadow-sm flex-1 flex flex-col">
              <h3 className="text-xs font-bold text-[#7f8c8d] uppercase tracking-widest mb-4 flex items-center gap-2">
                <UserPlus className="w-3.5 h-3.5 text-[#7f8c8d]" />
                Зареєстровані працівники
              </h3>

              <div className="space-y-4 max-h-[1400px] overflow-y-auto pr-1 flex-1">
                {employees.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-6 italic">
                    У базі даних немає зареєстрованих кадрів.
                  </div>
                ) : (
                  employees.map(emp => {
                    const stats = getEmployeeStats(emp, selectedYear);
                    const isEditing = editingEmp?.id === emp.id;
                    const isBooking = activeBookingEmpId === emp.id;

                    return (
                      <div 
                        key={emp.id} 
                        className="bg-white border border-[#dcdfe0] border-l-4 p-3 shadow-sm rounded-r-md rounded-l-none relative"
                        style={{ borderLeftColor: emp.color }}
                      >
                        {isEditing ? (
                          /* Inline Edit Employee Form */
                          <form onSubmit={handleUpdateEmployee} className="space-y-3 pl-1">
                            <div>
                              <input
                                type="text"
                                required
                                value={editingEmp.name}
                                onChange={(e) => setEditingEmp({ ...editingEmp, name: e.target.value })}
                                className="w-full px-2 py-1 bg-white border border-[#bdc3c7] rounded-sm text-xs text-[#2c3e50] focus:outline-none focus:border-[#3498db]"
                                placeholder="ПІБ"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <input
                                  type="text"
                                  required
                                  maxLength={3}
                                  value={editingEmp.initial}
                                  onChange={(e) => setEditingEmp({ ...editingEmp, initial: e.target.value.toUpperCase() })}
                                  className="w-full px-2 py-1 bg-white border border-[#bdc3c7] rounded-sm text-xs text-center font-bold focus:outline-none focus:border-[#3498db]"
                                  placeholder="Ініціали"
                                />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="color"
                                  value={editingEmp.color}
                                  onChange={(e) => setEditingEmp({ ...editingEmp, color: e.target.value })}
                                  className="w-6 h-6 border border-[#bdc3c7] rounded-sm cursor-pointer p-0"
                                />
                                <span className="text-[10px] font-mono font-bold uppercase text-[#2c3e50]">{editingEmp.color}</span>
                              </div>
                            </div>
                            <div className="space-y-1 bg-[#f4f7f8] p-2 rounded-sm border border-[#dcdfe0] text-[10px] font-semibold text-[#2c3e50]">
                              <div className="flex items-center justify-between">
                                <span>Основна:</span>
                                <input
                                  type="number"
                                  value={editingEmp.main_vacation_limit}
                                  onChange={(e) => setEditingEmp({ ...editingEmp, main_vacation_limit: parseInt(e.target.value) || 0 })}
                                  className="w-12 px-1 border border-[#bdc3c7] rounded-sm text-center font-bold font-mono bg-white"
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Додаткова:</span>
                                <input
                                  type="number"
                                  value={editingEmp.additional_vacation_limit}
                                  onChange={(e) => setEditingEmp({ ...editingEmp, additional_vacation_limit: parseInt(e.target.value) || 0 })}
                                  className="w-12 px-1 border border-[#bdc3c7] rounded-sm text-center font-bold font-mono bg-white"
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Інші:</span>
                                <input
                                  type="number"
                                  value={editingEmp.other_vacation_limit}
                                  onChange={(e) => setEditingEmp({ ...editingEmp, other_vacation_limit: parseInt(e.target.value) || 0 })}
                                  className="w-12 px-1 border border-[#bdc3c7] rounded-sm text-center font-bold font-mono bg-white"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => setEditingEmp(null)}
                                className="px-2 py-1 bg-[#34495e] hover:bg-[#455d75] text-white rounded-sm text-[10px] font-bold uppercase tracking-tighter cursor-pointer"
                              >
                                Скасувати
                              </button>
                              <button
                                type="submit"
                                className="px-2 py-1 bg-[#27ae60] hover:bg-[#2ecc71] text-white rounded-sm text-[10px] font-bold uppercase tracking-tighter cursor-pointer"
                              >
                                Зберегти
                              </button>
                            </div>
                          </form>
                        ) : (
                          /* Normal Employee Row Card */
                          <div className="pl-1">
                            <div className="flex items-start justify-between gap-1 mb-2">
                              <div className="font-bold text-[#2c3e50] text-sm flex items-center gap-1.5">
                                <span 
                                  className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                                  style={{ backgroundColor: `${emp.color}1a`, color: emp.color }}
                                >
                                  {emp.initial}
                                </span>
                                <span className="hover:underline cursor-pointer" onClick={() => setEditingEmp(emp)}>{emp.name}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[#7f8c8d]">
                                <button 
                                  title="Редагувати"
                                  onClick={() => setEditingEmp(emp)}
                                  className="p-1 hover:text-[#3498db] transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  title="Видалити"
                                  onClick={() => setEmployeeToDelete({ id: emp.id, name: emp.name })}
                                  className="p-1 hover:text-rose-600 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Limits & Remaining Display */}
                            <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-medium opacity-80 uppercase text-[#2c3e50]">
                              <span>Основна: <b className="text-[#2c3e50] font-bold font-mono">{stats.main_used}/{emp.main_vacation_limit}</b></span>
                              <span>Додаткова: <b className="text-[#2c3e50] font-bold font-mono">{stats.additional_used}/{emp.additional_vacation_limit}</b></span>
                              <span className="col-span-2">Інші види: <b className="text-[#2c3e50] font-bold font-mono">{stats.other_used}/{emp.other_vacation_limit}</b></span>
                            </div>

                            {/* Progress bar */}
                            {(() => {
                              const totalLimit = emp.main_vacation_limit + emp.additional_vacation_limit + emp.other_vacation_limit;
                              const totalUsed = stats.main_used + stats.additional_used + stats.other_used;
                              const percentage = totalLimit > 0 ? Math.min(100, Math.floor((totalUsed / totalLimit) * 100)) : 0;
                              return (
                                <div className="mt-2 w-full bg-[#ecf0f1] h-1 rounded-full overflow-hidden">
                                  <div className="h-full transition-all duration-300" style={{ width: `${percentage}%`, backgroundColor: emp.color }} />
                                </div>
                              );
                            })()}

                            {/* Book Vacation Toggle */}
                            {isBooking ? (
                              <div className="bg-[#f4f7f8] border border-[#dcdfe0] rounded-sm p-2.5 mt-3 space-y-2 animate-fade-in">
                                <div className="text-[10px] font-bold text-[#7f8c8d] uppercase flex items-center justify-between">
                                  <span>Забронювати відпустку</span>
                                  <button onClick={() => setActiveBookingEmpId(null)} className="text-[#95a5a6] hover:text-[#7f8c8d]">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="space-y-1.5">
                                  <div>
                                    <label className="block text-[9px] text-[#7f8c8d] font-bold uppercase">Початок:</label>
                                    <input 
                                      type="date"
                                      value={vacationStart}
                                      onChange={(e) => setVacationStart(e.target.value)}
                                      className="w-full text-xs px-2 py-1 bg-white border border-[#bdc3c7] rounded-sm text-[#2c3e50]"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] text-[#7f8c8d] font-bold uppercase">Завершення:</label>
                                    <input 
                                      type="date"
                                      value={vacationEnd}
                                      onChange={(e) => setVacationEnd(e.target.value)}
                                      className="w-full text-xs px-2 py-1 bg-white border border-[#bdc3c7] rounded-sm text-[#2c3e50]"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] text-[#7f8c8d] font-bold uppercase">Тип відпустки:</label>
                                    <select
                                      value={vacationType}
                                      onChange={(e: any) => setVacationType(e.target.value)}
                                      className="w-full text-xs px-2 py-1 bg-white border border-[#bdc3c7] rounded-sm text-[#2c3e50] font-semibold"
                                    >
                                      <option value="основна">Основна</option>
                                      <option value="додаткова">Додаткова</option>
                                      <option value="інша">Інша</option>
                                    </select>
                                  </div>
                                  {vacationType === "інша" && (
                                    <div className="animate-fade-in">
                                      <label className="block text-[9px] text-[#7f8c8d] font-bold uppercase">Назва виду відпустки:</label>
                                      <input 
                                        type="text"
                                        placeholder="Наприклад: Навчальна, Творча..."
                                        value={customOtherType}
                                        onChange={(e) => setCustomOtherType(e.target.value)}
                                        className="w-full text-xs px-2 py-1 bg-white border border-[#bdc3c7] rounded-sm text-[#2c3e50]"
                                        required
                                      />
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-1.5 pt-1">
                                  <button
                                    onClick={() => setActiveBookingEmpId(null)}
                                    className="flex-1 py-1 bg-[#34495e] hover:bg-[#455d75] text-white font-bold text-[10px] rounded-sm cursor-pointer uppercase tracking-tighter transition-colors"
                                  >
                                    Скасувати
                                  </button>
                                  <button
                                    onClick={() => handleAddVacation(emp.id)}
                                    className="flex-1 py-1 bg-[#27ae60] hover:bg-[#2ecc71] text-white font-bold text-[10px] rounded-sm cursor-pointer uppercase tracking-tighter transition-colors"
                                  >
                                    Бронювати
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setVacationStart(`${selectedYear}-06-01`);
                                  setVacationEnd(`${selectedYear}-06-14`);
                                  setVacationType("основна");
                                  setActiveBookingEmpId(emp.id);
                                }}
                                className="w-full py-1.5 mt-3 bg-[#3498db] hover:bg-[#2980b9] text-white rounded-sm text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer uppercase tracking-tighter"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Додати період
                              </button>
                            )}

                            {/* Booked Vacation Periods List */}
                            {emp.vacations && emp.vacations.length > 0 && (
                              <div className="mt-3 pt-2 border-t border-[#ecf0f1]">
                                <div className="text-[10px] font-bold text-[#7f8c8d] uppercase tracking-wider mb-1.5">Плани та Статус:</div>
                                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                  {emp.vacations.map(v => {
                                    const dur = getDurationInDays(v.start_date, v.end_date);
                                    const isUsed = v.status === "Використана";
                                    const isEditingVacation = editingVacationId === v.id;

                                    if (isEditingVacation) {
                                      return (
                                        <div key={v.id} className="bg-[#f4f7f8] border border-[#bdc3c7] p-2 rounded-sm space-y-2 text-[10px]">
                                          <div className="text-[9px] font-bold text-[#7f8c8d] uppercase">Редагування періоду</div>
                                          <div className="space-y-1.5">
                                            <div>
                                              <label className="block text-[8px] text-[#7f8c8d] uppercase font-bold">Початок:</label>
                                              <input 
                                                type="date"
                                                value={editVacationStart}
                                                onChange={(e) => setEditVacationStart(e.target.value)}
                                                className="w-full text-[10px] px-1 py-0.5 bg-white border border-[#bdc3c7] rounded-sm text-[#2c3e50]"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-[8px] text-[#7f8c8d] uppercase font-bold">Завершення:</label>
                                              <input 
                                                type="date"
                                                value={editVacationEnd}
                                                onChange={(e) => setEditVacationEnd(e.target.value)}
                                                className="w-full text-[10px] px-1 py-0.5 bg-white border border-[#bdc3c7] rounded-sm text-[#2c3e50]"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-[8px] text-[#7f8c8d] uppercase font-bold">Тип відпустки:</label>
                                              <select
                                                value={editVacationType}
                                                onChange={(e: any) => setEditVacationType(e.target.value)}
                                                className="w-full text-[10px] px-1 py-0.5 bg-white border border-[#bdc3c7] rounded-sm text-[#2c3e50] font-semibold"
                                              >
                                                <option value="основна">Основна</option>
                                                <option value="додаткова">Додаткова</option>
                                                <option value="інша">Інша</option>
                                              </select>
                                            </div>
                                            {editVacationType === "інша" && (
                                              <div>
                                                <label className="block text-[8px] text-[#7f8c8d] uppercase font-bold">Назва виду відпустки:</label>
                                                <input 
                                                  type="text"
                                                  placeholder="Назва відпустки"
                                                  value={editCustomOtherType}
                                                  onChange={(e) => setEditCustomOtherType(e.target.value)}
                                                  className="w-full text-[10px] px-1 py-0.5 bg-white border border-[#bdc3c7] rounded-sm text-[#2c3e50]"
                                                  required
                                                />
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex gap-1 pt-1">
                                            <button
                                              onClick={() => setEditingVacationId(null)}
                                              className="flex-1 py-0.5 bg-[#34495e] hover:bg-[#455d75] text-white text-[9px] font-bold rounded-sm cursor-pointer uppercase transition-colors"
                                            >
                                              Скасувати
                                            </button>
                                            <button
                                              onClick={() => handleUpdateVacation(v.id!)}
                                              className="flex-1 py-0.5 bg-[#27ae60] hover:bg-[#2ecc71] text-white text-[9px] font-bold rounded-sm cursor-pointer uppercase transition-colors"
                                            >
                                              Зберегти
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    }

                                    return (
                                      <div key={v.id} className="flex items-center justify-between text-[10px] bg-white border border-[#dcdfe0] p-1.5 rounded-sm shadow-xs">
                                        <div className="flex-1">
                                          <div className={`font-bold ${isUsed ? "line-through text-slate-400" : "text-[#2c3e50]"}`}>
                                            {v.start_date} – {v.end_date}
                                          </div>
                                          <div className="text-[9px] text-[#7f8c8d] italic font-medium flex items-center gap-1 mt-0.5">
                                            <span>{v.type} відпустка</span>
                                            <span>•</span>
                                            <span>{dur} дн.</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => startEditingVacation(v)}
                                            title="Редагувати період"
                                            className="p-1 rounded-sm bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => handleToggleVacationStatus(v)}
                                            title={isUsed ? "Зробити запланованою" : "Позначити як використано/відбуто"}
                                            className={`p-1 rounded-sm cursor-pointer ${isUsed ? "bg-[#27ae60]/10 text-[#27ae60] hover:bg-[#27ae60]/20" : "bg-[#ecf0f1] text-[#2c3e50] hover:bg-[#bdc3c7]"}`}
                                          >
                                            <Check className="w-3 h-3 font-bold" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteVacation(v.id!)}
                                            title="Видалити період"
                                            className="p-1 rounded-sm bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                                          >
                                            <Minus className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Legend card */}
            <div className="bg-white border border-[#dcdfe0] rounded-sm p-4 shadow-sm hidden lg:block">
              <h3 className="text-xs font-bold text-[#7f8c8d] uppercase tracking-widest mb-3 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#7f8c8d]" />
                Кольорова легенда
              </h3>
              <div className="flex flex-wrap gap-2">
                {employees.map(emp => (
                  <span 
                    key={emp.id} 
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#f4f7f8] border border-[#dcdfe0] rounded-sm text-[10px] font-bold text-[#2c3e50]"
                  >
                    <span className="w-2 h-2 rounded-none" style={{ backgroundColor: emp.color }} />
                    {emp.name.split(" ")[0]} ({emp.initial})
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT VIEW: Large Interactive Calendar (12 Months x 31 Days Grid) */}
          <div className="flex-1 overflow-x-auto">
            <div className="bg-white border border-[#dcdfe0] p-5 min-w-[980px] shadow-sm rounded-sm" id="calendar-container">
              
              {/* Calendar Control Area (Hidden during image export) */}
              <div className="flex items-center justify-between border-b border-[#ecf0f1] pb-4 mb-4">
                <div>
                  <h2 className="text-sm font-bold text-[#2c3e50] uppercase tracking-widest">
                    Календарне планування відпусток
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Кожен працівник має прямокутний кольоровий маркер з ініціалами у дні відпустки. Відбуті відпустки відображаються напівпрозорими.
                  </p>
                </div>

                {/* Interactive Year Selector */}
                <div className="flex items-center gap-2 bg-[#f4f7f8] p-1 rounded-sm border border-[#dcdfe0] select-none">
                  <button
                    onClick={() => setSelectedYear(selectedYear - 1)}
                    className="p-1 hover:bg-white rounded-sm transition-colors text-[#2c3e50] cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold font-mono text-[#2c3e50] px-2">
                    {selectedYear} РІК
                  </span>
                  <button
                    onClick={() => setSelectedYear(selectedYear + 1)}
                    className="p-1 hover:bg-white rounded-sm transition-colors text-[#2c3e50] cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Printable Area - Rendered using native html table structure to avoid canvas/grid scaling issues */}
              <div ref={calendarRef} className="p-4 bg-white border border-slate-150 rounded-lg">
                <div className="text-center mb-4">
                  <h2 className="text-base font-bold text-[#2c3e50] uppercase tracking-wider">
                    ГРАФІК ВІДПУСТОК НА {selectedYear} РІК
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-mono">
                    Звіт згенеровано: {new Date().toLocaleDateString("uk-UA")} • SQLite База даних
                  </p>
                </div>

                <table className="vacations-table text-[11px] w-full font-sans">
                  <thead>
                    <tr>
                      <th className="py-2.5 px-1 bg-[#2c3e50] text-white text-center font-bold border border-slate-300 w-10">
                        День
                      </th>
                      {monthNames.map((name, idx) => (
                        <th 
                          key={idx} 
                          className="py-2 px-0.5 bg-[#2c3e50] text-white text-center font-bold border border-slate-300 text-[9px] uppercase tracking-tighter"
                        >
                          {name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 31 }, (_, dayIdx) => {
                      const day = dayIdx + 1;
                      return (
                        <tr key={day}>
                          {/* Day Column */}
                          <td className="bg-slate-100 font-bold text-[#2c3e50] border border-slate-200 text-center text-xs">
                            {day}
                          </td>

                          {/* Months columns (1 to 12) */}
                          {monthNames.map((_, monthIdx) => {
                            const daysCount = getDaysInMonth(monthIdx, selectedYear);
                            const hasDay = day <= daysCount;
                            
                            if (!hasDay) {
                              return (
                                <td 
                                  key={monthIdx} 
                                  className="bg-slate-50 border border-slate-150" 
                                />
                              );
                            }

                            const weekend = isWeekend(day, monthIdx, selectedYear);
                            const activeVacations = getVacationsForDate(day, monthIdx, selectedYear);
                            const dayOfWeekLetter = getDayOfWeekName(day, monthIdx, selectedYear);

                            return (
                              <td
                                key={monthIdx}
                                className={`relative p-1 border border-slate-200 min-h-[46px] group ${weekend ? "weekend-cell" : "bg-white"}`}
                              >
                                {/* Date indicator top row */}
                                <div className="flex items-center justify-between text-[8px] text-slate-400/80 mb-1 select-none font-medium">
                                  <span>{day}</span>
                                  <span className={weekend ? "text-rose-400 font-bold" : "text-slate-400"}>
                                    {dayOfWeekLetter}
                                  </span>
                                </div>

                                {/* Vacation circular badges wrapper */}
                                <div className="text-center min-h-[18px]">
                                  {activeVacations && activeVacations.length > 0 ? (
                                    activeVacations.map(({ emp, vac }, vIdx) => {
                                      const isUsed = vac.status === "Використана";
                                      return (
                                        <span
                                          key={vIdx}
                                          className={`vacation-badge ${isUsed ? "used" : ""}`}
                                          style={{ backgroundColor: emp.color }}
                                          title={`${emp.name}: ${vac.start_date} - ${vac.end_date} (${vac.type}, ${vac.status})`}
                                        >
                                          {emp.initial}
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="block h-2" />
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Legend footer embedded within capture zone */}
                <div className="mt-5 pt-4 border-t border-[#dcdfe0]">
                  <div className="text-[9px] font-bold text-[#7f8c8d] uppercase mb-3 tracking-widest">
                    Реєстр особового складу та баланс лімітів ({selectedYear} р.):
                  </div>
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 text-[10px]">
                    {employees.map(emp => {
                      const stats = getEmployeeStats(emp, selectedYear);
                      return (
                        <div key={emp.id} className="flex items-start gap-2 bg-[#f4f7f8] p-2.5 rounded-none border border-[#dcdfe0]">
                          <span 
                            className="inline-block w-5 h-5 text-white text-[9px] font-bold text-center leading-5 flex-shrink-0 rounded-none uppercase tracking-tighter"
                            style={{ backgroundColor: emp.color }}
                          >
                            {emp.initial}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-[#2c3e50] truncate">{emp.name}</div>
                            <div className="text-[9px] text-slate-600 font-medium mt-1 space-y-0.5 font-mono">
                              <div>Основна: {stats.main_used}/{emp.main_vacation_limit} дн. (зал: {stats.main_remaining})</div>
                              <div>Додаткова: {stats.additional_used}/{emp.additional_vacation_limit} дн. (зал: {stats.additional_remaining})</div>
                              <div>Інші види: {stats.other_used}/{emp.other_vacation_limit} дн. (зал: {stats.other_remaining})</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Custom Employee Deletion Confirmation Modal */}
      {employeeToDelete && (
        <div className="fixed inset-0 bg-[#2c3e50]/50 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-fade-in">
          <div className="bg-white border border-[#dcdfe0] max-w-md w-full p-6 shadow-xl rounded-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-sm">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#2c3e50] uppercase tracking-widest">
                  Підтвердження видалення
                </h3>
                <p className="text-xs text-[#7f8c8d]">
                  Ви дійсно бажаєте видалити працівника <strong className="text-[#2c3e50] font-bold">{employeeToDelete.name}</strong> з бази даних?
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-100 rounded-sm p-3">
              <p className="text-[10px] text-rose-700 font-medium leading-relaxed">
                Увага: ця дія є незворотною! Усі заброньовані, заплановані та використані періоди відпусток цього працівника буде видалено з бази даних назавжди.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                className="flex-1 py-2 bg-[#34495e] hover:bg-[#455d75] text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer text-center"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={() => handleDeleteEmployee(employeeToDelete.id)}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer text-center"
              >
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
