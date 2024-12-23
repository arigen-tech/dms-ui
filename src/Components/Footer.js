import React from 'react';
import { Link } from 'react-router-dom';
import logo3 from "../Assets/logo3.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-gray-800 to-gray-900 text-gray-300 mt-auto">
      <div className="container mx-auto px-4 py-4">
        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Company Info */}
          <div className="text-center md:text-left space-y-2">
            <div className="flex items-center justify-center md:justify-start space-x-2">
              <img 
                src={logo3}
                alt="ARIGEN Logo" 
                className="w-27h-18" // Adjusted logo size
              />
            </div>
          </div>
          
          {/* Quick Links - Middle */}
          <div className="flex flex-col md:flex-row md:space-x-8 text-sm">
            <div className="space-y-1">
              <h4 className="font-semibold text-white">Company</h4>
              <ul className="space-y-1">
                <li>
                  <Link to="/about" className="hover:text-white transition-colors duration-200">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-white transition-colors duration-200">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            
            <div className="space-y-1">
              <h4 className="font-semibold text-white">Support</h4>
              <ul className="space-y-1">
                <li>
                  <Link to="/help" className="hover:text-white transition-colors duration-200">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-white transition-colors duration-200">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-4 pt-2 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center text-sm">
          <div className="text-gray-400">
            © {currentYear} ARIGEN. All rights reserved.
          </div>
          
          <div className="flex space-x-4 text-gray-400">
            <Link to="/terms" className="hover:text-white transition-colors duration-200">
              Terms of Service
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/security" className="hover:text-white transition-colors duration-200">
              Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;