import React, { useState, useEffect } from 'react';
import { Student, DailyAttendance, DashboardStats, AttendanceStatus } from './types';
import Dashboard from './components/Dashboard';
import StudentManager from './components/StudentManager';
import AttendanceTracker from './components/AttendanceTracker';
import { LayoutDashboard, Users, ClipboardList, Church } from 'lucide-react';

// --- Helper for Random Data Generation ---
const generateInitialStudents = (): Student[] => {
  const names = [
    "김지수", "이민호", "박서준", "최영희", "정우성", "강하늘", "조수미", "윤도현", "장나라", "임시완", 
    "한지민", "송중기", "박보영", "이광수", "김종국", "송지효", "하하", "유재석", "지석진", "양세찬", 
    "전소민", "김연아", "손흥민", "류현진", "박찬호", "이승엽", "추신수", "강호동", "신동엽", "이수근"
  ];
  
  const cells3 = ["3학년 1반", "3학년 2반", "3학년 3반", "3학년 4반"];
  const cells4 = ["4학년 1반", "4학년 2반", "4학년 3반", "4학년 4반"];
  
  const teachers3 = ["김선생", "이선생", "박선생", "최선생"];
  const teachers4 = ["정선생", "강선생", "조선생", "윤선생"];

  const students: Student[] = [];

  for (let i = 0; i < 30; i++) {
    // Randomly assign grade (roughly half and half, but random)
    // To ensure we use all cells, let's distribute somewhat evenly or just random.
    // Let's try to be slightly more deterministic to ensure we hit requirements if needed, 
    // but random is fine for "30명 임의로 등록".
    const is3rd = i < 15; // First 15 are 3rd grade, rest are 4th grade for even split
    
    const grade = is3rd ? "3학년" : "4학년";
    const cellList = is3rd ? cells3 : cells4;
    const teacherList = is3rd ? teachers3 : teachers4;
    
    // Random cell within grade
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

// --- Mock Initial Data Helper ---
const loadInitialStudents = (): Student[] => {
  const stored = localStorage.getItem('students');
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed.length > 0) return parsed;
  }
  // If empty, generate 30 random students as requested
  return generateInitialStudents();
};

const loadInitialAttendance = (): DailyAttendance[] => {
  const stored = localStorage.getItem('attendance');
  return stored ? JSON.parse(stored) : [];
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'attendance'>('dashboard');
  const [students, setStudents] = useState<Student[]>(loadInitialStudents);
  const [attendanceHistory, setAttendanceHistory] = useState<DailyAttendance[]>(loadInitialAttendance);

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('attendance', JSON.stringify(attendanceHistory));
  }, [attendanceHistory]);

  // --- Logic ---
  const addStudent = (student: Student) => setStudents([...students, student]);
  const updateStudent = (updated: Student) => setStudents(students.map(s => s.id === updated.id ? updated : s));
  const deleteStudent = (id: string) => setStudents(students.filter(s => s.id !== id));

  const saveAttendance = (date: string, records: {studentId: string, status: AttendanceStatus}[]) => {
    setAttendanceHistory(prev => {
      const filtered = prev.filter(p => p.date !== date);
      return [...filtered, { date, records }];
    });
  };

  // --- Stats Calculation for Dashboard ---
  const calculateStats = (): DashboardStats => {
    const totalStudents = students.length;
    if (totalStudents === 0) return { totalStudents: 0, attendanceRate: 0, recentTrend: [] };

    // Get last 4 entries sorted by date
    const sortedHistory = [...attendanceHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const recent = sortedHistory.slice(-4);

    // Calculate current (latest) rate
    const latest = recent[recent.length - 1];
    let currentRate = 0;
    if (latest) {
      const present = latest.records.filter(r => r.status === AttendanceStatus.PRESENT).length;
      currentRate = (present / totalStudents) * 100;
    }

    // Calculate Trend
    const recentTrend = recent.map(day => {
      const presentCount = day.records.filter(r => r.status === AttendanceStatus.PRESENT).length;
      const rate = (presentCount / totalStudents) * 100;
      return { date: day.date.substring(5), rate }; // MM-DD format
    });

    return {
      totalStudents,
      attendanceRate: currentRate,
      recentTrend
    };
  };

  const navItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { id: 'students', label: '학생 관리', icon: Users },
    { id: 'attendance', label: '출석부', icon: ClipboardList },
  ] as const;

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans text-gray-900">
      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 fixed h-full z-10">
        <div className="p-6 flex items-center gap-3 border-b border-gray-100">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <Church size={24} />
          </div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">초등부 출석부</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === item.id 
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon 
                size={20} 
                className={`mr-3 ${activeTab === item.id ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`} 
              />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">System Status</p>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Operational
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-3 z-50 pb-safe">
         {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center p-2 rounded-lg ${
                activeTab === item.id ? 'text-indigo-600' : 'text-gray-400'
              }`}
            >
              <item.icon size={24} />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </button>
          ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pb-20 lg:pb-0 transition-all duration-300">
        {activeTab === 'dashboard' && <Dashboard stats={calculateStats()} />}
        {activeTab === 'students' && (
          <StudentManager 
            students={students} 
            onAddStudent={addStudent} 
            onUpdateStudent={updateStudent} 
            onDeleteStudent={deleteStudent} 
          />
        )}
        {activeTab === 'attendance' && (
          <AttendanceTracker 
            students={students} 
            attendanceHistory={attendanceHistory}
            onSaveAttendance={saveAttendance}
          />
        )}
      </main>
    </div>
  );
};

export default App;