'use client'

import React, { useState, useRef, useEffect } from 'react'
import { User, Users, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

export default function LoginDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="inline-flex items-center gap-2 text-foreground hover:text-primary transition-colors font-medium py-2 focus:outline-none"
      >
        Login
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 w-64 bg-card rounded-lg border border-border shadow-lg overflow-hidden z-50"
          >
            <div className="p-4 space-y-3">
              <p className="text-sm font-medium text-muted-foreground mb-3">Select login type</p>
              <Link
                href="/login?role=Candidate"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors group"
                aria-label="Login as Candidate"
              >
                <div className="p-2 bg-primary/10 rounded-md group-hover:bg-primary/20 transition-colors">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Candidate Login</p>
                  <p className="text-sm text-muted-foreground">Access your candidate dashboard</p>
                </div>
              </Link>
              <Link
                href="/login?role=Recruiter"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors group"
                aria-label="Login as Recruiter"
              >
                <div className="p-2 bg-primary/10 rounded-md group-hover:bg-primary/20 transition-colors">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Recruiter Login</p>
                  <p className="text-sm text-muted-foreground">Access your recruiter dashboard</p>
                </div>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
