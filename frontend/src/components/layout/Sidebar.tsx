import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  Users,
  Settings,
  LogOut,
  Zap,
} from 'lucide-react'
import { useAuthContext } from '../../context/AuthContext'
import { cn } from '../../lib/utils'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/create', icon: Sparkles, label: 'Create Content' },
  { to: '/posts', icon: FileText, label: 'Posts' },
  { to: '/accounts', icon: Users, label: 'Accounts' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const { user, logout } = useAuthContext()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <motion.aside
      initial={{ x: -64, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col w-64 min-h-screen bg-white/80 backdrop-blur-lg border-r border-gray-100 shadow-sm"
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
          SocialFlow AI
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md shadow-purple-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('w-5 h-5', isActive ? 'text-white' : 'text-gray-400')} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        {user && (
          <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-gray-50">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm font-bold shrink-0">
              {(user.full_name ?? user.email).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user.full_name ?? 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors duration-150"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </motion.aside>
  )
}
