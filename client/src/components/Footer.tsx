import { Link } from "wouter";
import { Leaf, Twitter, Github, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="py-8 border-t border-neutral bg-white">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h5 className="font-heading font-semibold mb-4 flex items-center">
              <Leaf className="h-5 w-5 text-primary mr-2" />
              PlantID
            </h5>
            <p className="text-sm text-neutral-dark">
              A powerful tool for identifying plant species for plant enthusiasts, gardeners, and botanical research.
            </p>
          </div>
          
          <div>
            <h5 className="font-heading font-semibold mb-4">Quick Links</h5>
            <ul className="text-sm space-y-2">
              <li>
                <Link href="/">
                  <a className="text-neutral-dark hover:text-primary transition-colors">Home</a>
                </Link>
              </li>
              <li>
                <Link href="/about">
                  <a className="text-neutral-dark hover:text-primary transition-colors">About</a>
                </Link>
              </li>
              <li>
                <Link href="/history">
                  <a className="text-neutral-dark hover:text-primary transition-colors">History</a>
                </Link>
              </li>
              <li>
                <a href="#" className="text-neutral-dark hover:text-primary transition-colors">Contact</a>
              </li>
            </ul>
          </div>
          
          <div>
            <h5 className="font-heading font-semibold mb-4">Resources</h5>
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
            <h5 className="font-heading font-semibold mb-4">Connect</h5>
            <div className="flex space-x-4 mb-4">
              <a href="#" className="text-neutral-dark hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-neutral-dark hover:text-primary transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-neutral-dark hover:text-primary transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
            <p className="text-sm text-neutral-dark">
              Contact us: <a href="mailto:info@plantid.app" className="text-primary">info@plantid.app</a>
            </p>
          </div>
        </div>
        
        <div className="text-center text-sm text-neutral-dark pt-4 border-t border-neutral">
          <p>&copy; {new Date().getFullYear()} PlantID. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
