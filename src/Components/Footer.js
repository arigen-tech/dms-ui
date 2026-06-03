import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer>
      <div>
        <p>&copy; {currentYear} Arigen Technology. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;