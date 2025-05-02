import { Link } from "wouter";
import { Leaf, Twitter, Github, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="py-8 border-t border-green-100 bg-white/70 backdrop-blur-md shadow-inner">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <h5 className="font-heading font-semibold mb-4 flex items-center">
              <Leaf className="h-5 w-5 text-primary mr-2" />
              <div className="flex flex-col">
                <span className="bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">FloraChat</span>
                <span className="text-xs text-gray-500 -mt-1">by Synaptide AI</span>
              </div>
            </h5>
            <p className="text-sm text-neutral-dark">
              The ultimate plant identification companion for garden enthusiasts and plant lovers.
            </p>
          </div>
          
          <div>
            <h5 className="font-heading font-semibold mb-4 text-green-700 pb-1 border-b border-green-100">Quick Links</h5>
            <ul className="text-sm space-y-2">
              <li>
                <Link href="/" className="text-neutral-dark hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-neutral-dark hover:text-primary transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/history" className="text-neutral-dark hover:text-primary transition-colors">
                  History
                </Link>
              </li>
              <li>
                <a href="#" className="text-neutral-dark hover:text-primary transition-colors">Contact</a>
              </li>
            </ul>
          </div>
          
          <div>
            <h5 className="font-heading font-semibold mb-4 text-green-700 pb-1 border-b border-green-100">Resources</h5>
            <ul className="text-sm space-y-2">
              <li>
                <a href="#" className="text-neutral-dark hover:text-primary transition-colors">Plant Identification Guide</a>
              </li>
              <li>
                <a href="#" className="text-neutral-dark hover:text-primary transition-colors">Plant Database</a>
              </li>
              <li>
                <a href="#" className="text-neutral-dark hover:text-primary transition-colors">API Documentation</a>
              </li>
              <li>
                <a href="#" className="text-neutral-dark hover:text-primary transition-colors">FAQs</a>
              </li>
            </ul>
          </div>
          
          <div>
            <h5 className="font-heading font-semibold mb-4 text-green-700 pb-1 border-b border-green-100">Connect</h5>
            <div className="flex space-x-4 mb-4">
              <a href="#" className="flex items-center justify-center h-8 w-8 rounded-full bg-white/50 text-green-700 hover:bg-primary hover:text-white transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="flex items-center justify-center h-8 w-8 rounded-full bg-white/50 text-green-700 hover:bg-primary hover:text-white transition-colors">
                <Github className="h-4 w-4" />
              </a>
              <a href="#" className="flex items-center justify-center h-8 w-8 rounded-full bg-white/50 text-green-700 hover:bg-primary hover:text-white transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
            <p className="text-sm text-neutral-dark">
              Contact us: <a href="mailto:info@florachat.synaptideai.com" className="text-primary">info@florachat.synaptideai.com</a>
            </p>
          </div>
        </div>
        
        <div className="text-center text-sm text-neutral-dark pt-4 border-t border-green-100">
          <p>&copy; {new Date().getFullYear()} FloraChat by Synaptide AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
