import React from 'react';
import { Award, ShieldCheck, FileText, PlusCircle, LayoutDashboard } from 'lucide-react';

export default function Navbar({ currentView, setView }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div 
          onClick={() => setView('admin-dashboard')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">CampusProctor</span>
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold">2026 Drive</span>
            </div>
            <p className="text-xs text-slate-500">Placement Examination & Proctoring Portal</p>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setView('admin-dashboard')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              currentView === 'admin-dashboard'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setView('create-exam')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              currentView === 'create-exam'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'bg-blue-600/10 text-blue-700 hover:bg-blue-600 hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Exam (PDF)</span>
          </button>
        </div>
      </div>
    </header>
  );
}
