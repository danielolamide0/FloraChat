import { Link, useLocation } from "wouter";
import { Leaf, User, LogIn, LogOut, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

export default function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  
  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    setMobileMenuOpen(false);
  };

  return (
    <header className="py-4 md:py-6 bg-white/40 shadow-lg border-b border-green-100 sticky top-0 z-50">
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
          <nav className="hidden md:flex items-center space-x-6">
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
                <Link href="/favorites" className={`font-heading font-medium ${location === "/favorites" ? "text-primary" : "text-neutral-dark hover:text-primary"} transition-colors flex items-center`}>
                  <Star className="mr-1 h-4 w-4 text-yellow-500" /> Favorites
                </Link>
              </li>
              <li>
                <Link href="/about" className={`font-heading font-medium ${location === "/about" ? "text-primary" : "text-neutral-dark hover:text-primary"} transition-colors`}>
                  About
                </Link>
              </li>
            </ul>
            
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8 border border-green-200">
                      <AvatarFallback className="bg-gradient-to-r from-green-600 to-green-500 text-white">
                        {user?.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-sm font-medium">{user?.username}</p>
                      <p className="text-xs text-muted-foreground">Logged in</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="ml-4 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                asChild
              >
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Link>
              </Button>
            )}
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
          <div className="absolute top-full left-0 right-0 mt-1 px-4 md:hidden">
            <nav className="py-3 bg-white/60 rounded-lg shadow-lg border border-green-100 animate-in slide-in">
              <ul className="space-y-1">
                <li>
                  <Link 
                    href="/"
                    className={`block py-2.5 px-4 font-heading font-medium rounded-md ${location === "/" ? "bg-primary text-white" : "text-neutral-dark hover:bg-neutral-light"}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/history"
                    className={`block py-2.5 px-4 font-heading font-medium rounded-md ${location === "/history" ? "bg-primary text-white" : "text-neutral-dark hover:bg-neutral-light"}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    History
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/favorites"
                    className={`block py-2.5 px-4 font-heading font-medium rounded-md ${location === "/favorites" ? "bg-primary text-white" : "text-neutral-dark hover:bg-neutral-light"}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <Star className="mr-2 h-4 w-4 text-yellow-500" /> Favorites
                    </div>
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/about"
                    className={`block py-2.5 px-4 font-heading font-medium rounded-md ${location === "/about" ? "bg-primary text-white" : "text-neutral-dark hover:bg-neutral-light"}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    About
                  </Link>
                </li>
                
                {isAuthenticated ? (
                  <>
                    <li>
                      <Link 
                        href="/profile"
                        className={`block py-2.5 px-4 font-heading font-medium rounded-md ${location === "/profile" ? "bg-primary text-white" : "text-neutral-dark hover:bg-neutral-light"}`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <div className="flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          Profile ({user?.username})
                        </div>
                      </Link>
                    </li>
                    <li>
                      <button 
                        className="block w-full text-left py-2.5 px-4 font-heading font-medium rounded-md text-red-600 hover:bg-red-50"
                        onClick={handleLogout}
                      >
                        <div className="flex items-center">
                          <LogOut className="mr-2 h-4 w-4" />
                          Log out
                        </div>
                      </button>
                    </li>
                  </>
                ) : (
                  <li>
                    <Link 
                      href="/login"
                      className="block py-2.5 px-4 font-heading font-medium rounded-md bg-green-50 text-green-700 hover:bg-green-100"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div className="flex items-center">
                        <LogIn className="mr-2 h-4 w-4" />
                        Login
                      </div>
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
