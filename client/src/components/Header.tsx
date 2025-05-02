import { Link, useLocation } from "wouter";
import { Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="py-6 bg-white/80 backdrop-blur-sm shadow-md">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="text-primary mr-2">
              <Leaf className="h-8 w-8" />
            </div>
            <div className="flex flex-col">
              <Link href="/" className="text-2xl md:text-3xl font-heading font-bold text-primary bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                FloraChat
              </Link>
              <span className="text-xs md:text-sm text-gray-500 -mt-1">by Synaptide AI</span>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:block">
            <ul className="flex space-x-6">
              <li>
                <Link href="/" className={`font-heading font-medium ${location === "/" ? "text-primary" : "text-neutral-dark hover:text-primary"} transition-colors`}>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/history" className={`font-heading font-medium ${location === "/history" ? "text-primary" : "text-neutral-dark hover:text-primary"} transition-colors`}>
                  History
                </Link>
              </li>
              <li>
                <Link href="/about" className={`font-heading font-medium ${location === "/about" ? "text-primary" : "text-neutral-dark hover:text-primary"} transition-colors`}>
                  About
                </Link>
              </li>
            </ul>
          </nav>
          
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-menu"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            )}
          </Button>
        </div>
        
        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden mt-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg">
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/"
                  className={`block py-2 px-4 font-heading font-medium rounded-md ${location === "/" ? "bg-primary-light text-white" : "text-neutral-dark hover:bg-neutral-light"}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  href="/history"
                  className={`block py-2 px-4 font-heading font-medium rounded-md ${location === "/history" ? "bg-primary-light text-white" : "text-neutral-dark hover:bg-neutral-light"}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  History
                </Link>
              </li>
              <li>
                <Link 
                  href="/about"
                  className={`block py-2 px-4 font-heading font-medium rounded-md ${location === "/about" ? "bg-primary-light text-white" : "text-neutral-dark hover:bg-neutral-light"}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About
                </Link>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}
