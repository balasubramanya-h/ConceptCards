import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  Flame,
  Plus,
  LogOut,
  User,
  LayoutDashboard,
  FolderTree,
  ChevronDown,
} from 'lucide-react';

const Navbar = ({ onOpenCreateDeck }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 transition">
            <Layers className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-white tracking-tight flex items-center gap-1">
              Concept<span className="text-indigo-400">Cards</span>
            </span>
          </div>
        </Link>

        {/* Center Nav for Authenticated Users */}
        {isAuthenticated && (
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/dashboard"
              className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                isActive('/dashboard')
                  ? 'bg-slate-800 text-white shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>

            <Link
              to="/dashboard?view=tree"
              className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                location.search.includes('view=tree')
                  ? 'bg-slate-800 text-white shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FolderTree className="w-4 h-4" />
              Deck Hierarchy
            </Link>
          </nav>
        )}

        {/* Right Nav: Streak, Actions & User */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {/* Daily Streak Badge */}
              <div
                className="hidden sm:flex items-center gap-1.5 bg-amber-950/40 border border-amber-600/30 text-amber-300 px-3 py-1.5 rounded-full text-xs font-semibold"
                title={`${user?.streak?.current || 0} day study streak!`}
              >
                <Flame className="w-4 h-4 text-amber-400 fill-amber-400/20 animate-pulse" />
                <span>{user?.streak?.current || 0}d streak</span>
              </div>

              {/* Create Deck Button */}
              {onOpenCreateDeck && (
                <button
                  type="button"
                  onClick={onOpenCreateDeck}
                  className="hidden sm:flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-1.5 px-3.5 rounded-xl transition shadow-sm shadow-indigo-600/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Deck</span>
                </button>
              )}

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800 transition border border-transparent hover:border-slate-700"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-300 font-bold text-xs uppercase">
                    {user?.name ? user.name.slice(0, 2) : 'CC'}
                  </div>
                  <span className="hidden lg:inline text-xs font-medium text-slate-200 max-w-[120px] truncate">
                    {user?.name || 'My Account'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-30 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-2 border-b border-slate-800">
                        <div className="text-xs font-semibold text-white truncate">
                          {user?.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {user?.email}
                        </div>
                        <div className="mt-2 text-[10px] text-indigo-400 font-medium">
                          Daily Target: {user?.preferences?.dailyTarget || 20} cards
                        </div>
                      </div>

                      <div className="py-1">
                        <Link
                          to="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5" />
                          Dashboard
                        </Link>
                      </div>

                      <div className="pt-1 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            setDropdownOpen(false);
                            logout();
                            navigate('/login');
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition text-left"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            /* Unauthenticated Navigation */
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-4 rounded-xl transition shadow-md shadow-indigo-600/30"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

