import React, { useState } from 'react';
import { Student } from '../types';
import { Plus, Search, Trash2, Edit2, UserPlus, Wand2, Download } from 'lucide-react';
import { generateMockStudents } from '../services/geminiService';

interface StudentManagerProps {
  students: Student[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
}

const StudentManager: React.FC<StudentManagerProps> = ({ students, onAddStudent, onUpdateStudent, onDeleteStudent }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<Student>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleOpenAdd = () => {
    setCurrentStudent({ id: crypto.randomUUID() });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setCurrentStudent({ ...student });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStudent.name && currentStudent.id) {
      if (students.some(s => s.id === currentStudent.id)) {
        onUpdateStudent(currentStudent as Student);
      } else {
        onAddStudent(currentStudent as Student);
      }
      setIsModalOpen(false);
    }
  };

  const handleGenerateMock = async () => {
      setIsGenerating(true);
      const jsonStr = await generateMockStudents();
      try {
          const mockData: any[] = JSON.parse(jsonStr);
          mockData.forEach(s => {
              onAddStudent({
                  ...s,
                  id: crypto.randomUUID()
              });
          });
      } catch (e) {
          alert("AI 데이터 생성 실패. 다시 시도해주세요.");
      }
      setIsGenerating(false);
  };

  const handleExportCSV = () => {
    // BOM for Korean character support in Excel
    const BOM = '\uFEFF';
    const headers = ['이름', '학년', '셀(구역)', '담임 선생님', '연락처'];
    const rows = students.map(s => [
      s.name,
      s.grade,
      s.cellName,
      s.teacherName,
      s.phoneNumber || ''
    ]);

    const csvContent = BOM + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `학생명부_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = students.filter(s => 
    s.name.includes(searchTerm) || 
    s.cellName.includes(searchTerm) ||
    s.teacherName.includes(searchTerm)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">학생 관리</h2>
          <p className="text-gray-500 text-sm mt-1">총 {students.length}명의 학생이 등록되어 있습니다.</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
            <button
                onClick={handleExportCSV}
                className="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm text-sm font-medium"
            >
                <Download size={18} className="mr-2" />
                명단 다운로드
            </button>
            <button
                onClick={handleGenerateMock}
                disabled={isGenerating}
                className="flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition disabled:opacity-50 text-sm font-medium"
            >
                <Wand2 size={18} className={`mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? '생성 중...' : 'AI 샘플 데이터'}
            </button>
            <button
                onClick={handleOpenAdd}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm text-sm font-medium"
            >
                <Plus size={18} className="mr-2" />
                학생 추가
            </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="이름, 셀, 선생님 이름으로 검색..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-6 py-4">이름</th>
                <th className="px-6 py-4">학년</th>
                <th className="px-6 py-4">셀 (구역)</th>
                <th className="px-6 py-4">담임 선생님</th>
                <th className="px-6 py-4 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length > 0 ? filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">{student.name}</td>
                  <td className="px-6 py-4 text-gray-600">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold text-gray-600">
                        {student.grade}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{student.cellName}</td>
                  <td className="px-6 py-4 text-gray-600">{student.teacherName}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => handleOpenEdit(student)} className="text-gray-400 hover:text-indigo-600 transition">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => onDeleteStudent(student.id)} className="text-gray-400 hover:text-red-500 transition">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                        <UserPlus size={48} className="mb-4 text-gray-300" />
                        <p>등록된 학생이 없습니다.</p>
                        <p className="text-xs mt-1">우측 상단의 버튼을 눌러 학생을 추가해보세요.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800">
                {students.some(s => s.id === currentStudent.id) ? '학생 정보 수정' : '새 학생 등록'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={currentStudent.name || ''}
                  onChange={e => setCurrentStudent({...currentStudent, name: e.target.value})}
                  placeholder="예: 김철수"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">학년</label>
                <select 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={currentStudent.grade || '3학년'}
                    onChange={e => setCurrentStudent({...currentStudent, grade: e.target.value})}
                >
                    {['3학년', '4학년'].map(g => (
                        <option key={g} value={g}>{g}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">셀 (구역)</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={currentStudent.cellName || ''}
                  onChange={e => setCurrentStudent({...currentStudent, cellName: e.target.value})}
                  placeholder="예: 3학년 1반"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">담임 선생님</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={currentStudent.teacherName || ''}
                  onChange={e => setCurrentStudent({...currentStudent, teacherName: e.target.value})}
                  placeholder="예: 이영희"
                />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition shadow-md">
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManager;