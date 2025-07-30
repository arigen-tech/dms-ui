import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r bg-blue-800 py-3 px-4 shadow-lg w-full mt-auto">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-center items-center space-y-2 md:space-y-0 text-sm ">
          {/* Copyright and Company Name */}
          <div className="text-white/90 font-medium">
            © {currentYear} Arigen Technology. All rights reserved.
          </div>
          
        </div>
      </div>
    </footer>
  );
};

export default Footer;