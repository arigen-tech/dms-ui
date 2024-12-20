import React, { useState } from 'react';
import ReactDOM from 'react-dom';

const Popup = ({
  message,
  type = 'default',
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const getStyleByType = () => {
    switch (type) {
      case 'success':
        return {
          icon: '✓',
          iconColor: 'text-green-600',
          buttonColor: 'bg-green-600 hover:bg-green-700',
          titleColor: 'text-green-800'
        };
      case 'error':
        return {
          icon: '✘',
          iconColor: 'text-red-600',
          buttonColor: 'bg-red-600 hover:bg-red-700',
          titleColor: 'text-red-800'
        };
      case 'warning':
        return {
          icon: '!',
          iconColor: 'text-yellow-600',
          buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
          titleColor: 'text-yellow-800'
        };
      default:
        return {
          icon: 'i',
          iconColor: 'text-blue-600',
          buttonColor: 'bg-blue-600 hover:bg-blue-700',
          titleColor: 'text-blue-800'
        };
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      onClose(); // This will trigger the refresh functionality
    }
  };

  if (!isVisible) return null;

  const styles = getStyleByType();

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 p-6 text-center relative">
        <div className={`
          ${styles.iconColor}
          w-16 h-16
          mx-auto
          mb-4
          rounded-full
          border-4
          flex
          items-center
          justify-center
          text-3xl
          font-bold
        `}>
          {styles.icon}
        </div>
        <h3 className={`
          ${styles.titleColor}
          text-xl
          font-semibold
          mb-4
        `}>
          {message}
        </h3>
        <button
          className={`
            ${styles.buttonColor}
            text-white
            font-bold
            py-2
            px-6
            rounded-md
            transition-colors
            duration-300
            focus:outline-none
            focus:ring-2
            focus:ring-opacity-50
          `}
          onClick={handleClose}
        >
          OK
        </button>
      </div>
    </div>,
    document.body
  );
};

export default Popup;