import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import AutoTranslate from '../i18n/AutoTranslate'; // Import AutoTranslate

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
          buttonColor: 'bg-blue-800 hover:bg-blue-900',
          titleColor: 'text-green-800'
        };
      case 'error':
        return {
          icon: '✘',
          iconColor: 'text-red-600',
          buttonColor: 'bg-blue-800 hover:bg-blue-900',
          titleColor: 'text-red-800'
        };
      case 'warning':
        return {
          icon: '!',
          iconColor: 'text-yellow-600',
          buttonColor: 'bg-blue-800 hover:bg-blue-900',
          titleColor: 'text-yellow-800'
        };
      default:
        return {
          icon: 'i',
          iconColor: 'text-blue-600',
          buttonColor: 'bg-blue-800 hover:bg-blue-900',
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[10000]">
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
          <AutoTranslate>{message}</AutoTranslate> {/* Wrap message in AutoTranslate */}
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
          <AutoTranslate>OK</AutoTranslate> {/* Wrap button text in AutoTranslate */}
        </button>
      </div>
    </div>,
    document.body
  );
};

export default Popup;