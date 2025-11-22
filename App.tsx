
import React, { useState, useEffect, useMemo } from 'react';
import { Student, DailyAttendance, DashboardStats, AttendanceStatus } from './types';
import Dashboard from './components/Dashboard';
import StudentManager from './components/StudentManager';
import AttendanceTracker from './components/AttendanceTracker';
import Settings from './components/Settings';
import GlobalLoading from './components/GlobalLoading';
import { storageService } from './services/storage';
import { actionQueue } from './services/queueService';
import { LayoutDashboard, Users, ClipboardList, Settings as SettingsIcon, Church, Moon, Sun } from 'lucide-react';

// --- Helper for Random Data Generation ---
const generateInitialStudents = (): Student[] => {
  const names = [
    "김지수", "이민호", "박서준", "최영희", "정우성", "강하늘", "조수미", "윤도현", "장나라", "임시완", 
    "한지민", "송중기", "박보영", "이광수", "김종국", "송지효", "하하", "유재석", "지석진", "양세찬", 
    "전소민", "김연아", "손흥민", "류현진", "박찬호", "이승엽", "추신수", "강호동", "신동엽", "이수근"
  ];
  
  // Biblical names for cells
  const cells3 = ["다윗셀", "요셉셀", "다니엘셀", "요나셀"];
  const cells4 = ["바울셀", "베드로셀", "요한셀", "디모데셀"];
  
  const teachers3 = ["김선생", "이선생", "박선생", "최선생"];
  const teachers4 = ["정선생", "강선생", "조선생", "윤선생"];

  const students: Student[] = [];

  for (let i = 0; i < 30; i++) {
    const is3rd = i < 15; 
    
    const grade = is3rd ? "3학년" : "4학년";
    const cellList = is3rd ? cells3 : cells4;
    const teacherList = is3rd ? teachers3 : teachers4;
    
    const cellIndex = Math.floor(Math.random() * 4);
    const cellName = cellList[cellIndex];
    const teacherName = teacherList[cellIndex];

    students.push({
      id: crypto.randomUUID(),
      name: names[i % names.length],
      grade,
      cellName,
      teacherName,
      phoneNumber: `010-${Math.floor(Math.random()*9000)+1000}-${Math.floor(Math.random()*9000)+1000}`
    });
  }
  
  return students;
};

// Helper for generating random attendance for past 5 weeks
const generateInitialAttendance = (students: Student[]): DailyAttendance[] => {
    const today = new Date();
    const history: DailyAttendance[] = [];
    
    // Generate 5 past Sundays
    for(let i = 0; i < 5; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - (i * 7)); // Go back weeks
        
        const dateStr = d.toISOString().split('T')[0];
        
        const records = students.map(s => {
            const rand = Math.random();
            let status = AttendanceStatus.PRESENT;
            if(rand > 0.85) status = AttendanceStatus.ABSENT;
            else if (rand > 0.75) status = AttendanceStatus.LATE;
            else if (rand > 0.70) status = AttendanceStatus.EXCUSED;
            
            return {
                studentId: s.id,
                status
            };
        });
        
        history.push({ date: dateStr, records });
    }
    
    return history;
};


const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'attendance' | 'settings'>('dashboard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => storageService.loadTheme() === 'dark');

  // Initialize state with storage service
  const [students, setStudents] = useState<Student[]>(() => {
    const loaded = storageService.loadStudents();
    return loaded.length > 0 ? loaded : generateInitialStudents();
  });
  
  const [attendanceHistory, setAttendanceHistory] = useState<DailyAttendance[]>(() => {
    return storageService.loadAttendance();
  });

  // Dark Mode Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    storageService.saveTheme(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Queue Listener
  useEffect(() => {
    const unsubscribe = actionQueue.subscribe((status) => {
        setIsProcessing(status);
    });
    return unsubscribe;
  }, []);

  // Generate mock attendance if empty
  useEffect(() => {
      if (students.length > 0 && attendanceHistory.length === 0) {
          const initialHistory = generateInitialAttendance(students);
          setAttendanceHistory(initialHistory);
      }
  }, [students, attendanceHistory.length]);

  // --- Persistence ---
  useEffect(() => {
    storageService.saveStudents(students);
  }, [students]);

  useEffect(() => {
    storageService.saveAttendance(attendanceHistory);
  }, [attendanceHistory]);

  // --- Logic with Queue ---
  const addStudent = (student: Student) => {
      actionQueue.enqueue(async () => {
          setStudents(prev => [...prev, student]);
      });
  };
  
  const importStudents = (newStudents: Student[]) => {
      actionQueue.enqueue(async () => {
          setStudents(prev => [...prev, ...newStudents]);
      });
  };

  const updateStudent = (updated: Student) => {
      actionQueue.enqueue(async () => {
          setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
      });
  };
  
  const deleteStudent = (id: string) => {
      actionQueue.enqueue(async () => {
          if(window.confirm("정말로 삭제하시겠습니까?")) {
             setStudents(prev => prev.filter(s => s.id !== id));
          }
      });
  };

  const saveAttendance = (date: string, records: {studentId: string, status: AttendanceStatus}[]) => {
      actionQueue.enqueue(async () => {
          setAttendanceHistory(prev => {
            const filtered = prev.filter(p => p.date !== date);
            return [...filtered, { date, records }];
          });
      });
  };

  const importAttendance = (newDailyAttendance: DailyAttendance[]) => {
      actionQueue.enqueue(async () => {
        setAttendanceHistory(prev => {
            const historyMap = new Map<string, DailyAttendance>();
            prev.forEach(d => historyMap.set(d.date, d));

            newDailyAttendance.forEach(newItem => {
                if (historyMap.has(newItem.date)) {
                const existing = historyMap.get(newItem.date)!;
                const existingRecordsMap = new Map(existing.records.map(r => [r.studentId, r]));
                
                newItem.records.forEach(newRecord => {
                    existingRecordsMap.set(newRecord.studentId, newRecord);
                });

                historyMap.set(newItem.date, {
                    ...existing,
                    records: Array.from(existingRecordsMap.values())
                });
                } else {
                historyMap.set(newItem.date, newItem);
                }
            });

            return Array.from(historyMap.values());
        });
      });
  };

  // --- Full DB Restore Handler ---
  const handleRestoreDatabase = async (file: File) => {
    actionQueue.enqueue(async () => {
        try {
            if (!window.confirm("데이터베이스를 복원하면 현재 데이터가 덮어씌워집니다. 계속하시겠습니까?")) return;
            
            const data = await storageService.importDatabase(file);
            if (data) {
              setStudents(data.students);
              setAttendanceHistory(data.attendance);
              alert("데이터베이스가 성공적으로 복원되었습니다.");
            }
        } catch (e) {
            alert("데이터베이스 복원 중 오류가 발생했습니다. 파일 형식을 확인해주세요.");
        }
    });
  };

  // --- Stats Calculation for Dashboard ---
  const dashboardStats: DashboardStats = useMemo(() => {
    const totalStudents = students.length;
    if (totalStudents === 0) return { totalStudents: 0, attendanceRate: 0, recentTrend: [] };

    const sortedHistory = [...attendanceHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const recent = sortedHistory.slice(-5);

    const latest = recent[recent.length - 1];
    let currentRate = 0;
    if (latest) {
      const present = latest.records.filter(r => r.status === AttendanceStatus.PRESENT).length;
      currentRate = (present / totalStudents) * 100;
    }

    const recentTrend = recent.map(day => {
      const presentCount = day.records.filter(r => r.status === AttendanceStatus.PRESENT).length;
      const rate = (presentCount / totalStudents) * 100;
      return { date: day.date.substring(5), rate, count: presentCount }; 
    });

    return {
      totalStudents,
      attendanceRate: currentRate,
      recentTrend
    };
  }, [students, attendanceHistory]);

  const navItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { id: 'attendance', label: '출석관리', icon: ClipboardList },
    { id: 'students', label: '학생 관리', icon: Users },
    { id: 'settings', label: '설정', icon: SettingsIcon },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <GlobalLoading isLoading={isProcessing} />

      {/* Mobile-First Top Header (Visible on ALL screens) */}
      <header className="fixed top-0 left-0 right-0 h-24 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-40 px-4 flex items-center justify-between shadow-sm transition-colors duration-200">
        {/* Left: Icon (Optional) */}
        <div className="w-10 flex items-center justify-center">
           <Church size={28} className="text-indigo-600 dark:text-indigo-400" />
        </div>

        {/* Center: Title */}
        <h1 className="flex-1 text-center text-2xl md:text-4xl font-black text-gray-900 dark:text-white leading-tight whitespace-pre-line">
          동부광성교회{'\n'}초등1부 출석부
        </h1>

        {/* Right: Theme Toggle */}
        <div className="w-10 flex items-center justify-center">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>
        </div>
      </header>

      {/* Mobile Bottom Nav (Visible on ALL screens) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around p-2 pb-safe z-40 transition-colors duration-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
         {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl w-full transition-all duration-200 ${
                activeTab === item.id 
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 font-bold' 
                : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
            >
              <item.icon size={24} className={activeTab === item.id ? 'mb-1' : 'mb-1'} />
              <span className="text-[11px] font-medium">{item.label}</span>
            </button>
          ))}
      </nav>

      {/* Main Content (Adjusted padding for Header and Bottom Nav) */}
      <main className="flex-1 pt-28 pb-24 w-full max-w-screen-xl mx-auto transition-all duration-300">
        {activeTab === 'dashboard' && (
          <Dashboard 
            stats={dashboardStats} 
          />
        )}
        {activeTab === 'students' && (
          <StudentManager 
            students={students} 
            onAddStudent={addStudent} 
            onImportStudents={importStudents}
            onUpdateStudent={updateStudent} 
            onDeleteStudent={deleteStudent} 
          />
        )}
        {activeTab === 'attendance' && (
          <AttendanceTracker 
            students={students} 
            attendanceHistory={attendanceHistory}
            onSaveAttendance={saveAttendance}
            onImportAttendance={importAttendance}
          />
        )}
        {activeTab === 'settings' && (
          <Settings 
            students={students}
            attendanceHistory={attendanceHistory}
            onRestoreDatabase={handleRestoreDatabase}
          />
        )}
      </main>
    </div>
  );
};

export default App;
