import { Switch, Route } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import History from "@/pages/History";
import About from "@/pages/About";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import bgImage from "./assets/relaxing-in-nature.webp";

function Router() {
  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Mobile background with custom positioning */}
      <div className="absolute inset-0 -z-10 hidden md:block" style={{
        backgroundImage: `linear-gradient(to bottom, rgba(46, 125, 50, 0.3), rgba(200, 230, 201, 0.4)), url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}></div>
      
      {/* Mobile background with centered on tree/leaves instead of feet */}
      <div className="absolute inset-0 -z-10 md:hidden" style={{
        backgroundImage: `linear-gradient(to bottom, rgba(46, 125, 50, 0.4), rgba(200, 230, 201, 0.6)), url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 0%', /* Focus on the upper portion with trees/leaves */
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}></div>
      <Header />
      <div className="flex-grow container mx-auto px-4 pt-6 pb-12">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/history" component={History} />
          <Route path="/about" component={About} />
          <Route path="/identification/:id" component={History} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Router />
    </TooltipProvider>
  );
}

export default App;
