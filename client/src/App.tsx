import { Switch, Route, useLocation } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import History from "@/pages/History";
import About from "@/pages/About";
import LoginPage from "@/pages/LoginPage";
import ProfilePage from "@/pages/ProfilePage";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import bgImage from "./assets/relaxing-in-nature.webp";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Redirect to login if not authenticated (except for public routes)
  useEffect(() => {
    const publicRoutes = ['/auth', '/about'];
    if (!isLoading && !isAuthenticated && !publicRoutes.includes(location)) {
      setLocation('/auth');
    }
  }, [isAuthenticated, isLoading, location]);

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Mobile background with custom positioning */}
      <div className="absolute inset-0 -z-10 hidden md:block" style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}></div>
      
      {/* Mobile background with centered on tree/leaves instead of feet */}
      <div className="absolute inset-0 -z-10 md:hidden" style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 0%', /* Focus on the upper portion with trees/leaves */
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}></div>

      <Switch>
        <Route path="/auth" component={LoginPage} />
        <Route>
          <Header />
          <div className="flex-grow container mx-auto px-4 pt-6 pb-12">
            <Switch>
              <Route path="/">
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              </Route>
              <Route path="/history">
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              </Route>
              <Route path="/about" component={About} />
              <Route path="/profile">
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              </Route>
              <Route path="/identification/:id">
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              </Route>
              <Route component={NotFound} />
            </Switch>
          </div>
          <Footer />
        </Route>
      </Switch>
    </div>
  );
}

function App() {
  return (
    <TooltipProvider>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </TooltipProvider>
  );
}

export default App;
