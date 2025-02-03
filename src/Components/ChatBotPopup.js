import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, PaperAirplaneIcon, ChatBubbleOvalLeftEllipsisIcon } from '@heroicons/react/24/solid';
import Draggable from 'react-draggable';
import { API_Chatbot_HOST } from '../API/apiConfig';

const ChatBotPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Check if device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  useEffect(() => {
    setMessages([{
      text: "👋 Hello! I'm Ari, your personal assistant. How can I help you today?",
      isBot: true,
      timestamp: new Date()
    }]);
  }, []);

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom('auto');
    }
  }, [isOpen]);

  useEffect(() => {
    const shouldScrollToBottom = !showScrollButton;
    if (shouldScrollToBottom) {
      scrollToBottom();
    }
  }, [messages]);

  const sendMessageToAPI = async (userMessage) => {
    try {
      setIsTyping(true);
      const response = await fetch(`${API_Chatbot_HOST}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();

      setMessages(prev => [...prev, {
        text: data.response,
        isBot: true,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        text: "I apologize, but I'm having trouble connecting right now. Please try again later.",
        isBot: true,
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMessage = newMessage;
    setMessages(prev => [...prev, {
      text: userMessage,
      isBot: false,
      timestamp: new Date()
    }]);
    setNewMessage("");
    await sendMessageToAPI(userMessage);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Draggable Chat Button - Only draggable on desktop */}
      <Draggable handle=".drag-handle" disabled={isMobile}>
        <div className="inline-block">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="drag-handle relative p-4 md:p-5 rounded-full overflow-hidden group
                      shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-all duration-500
                      hover:shadow-[0_8px_30px_rgba(59,130,246,0.6)]
                      active:scale-95 cursor-pointer transform-gpu"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-500 
                            to-pink-500 opacity-85 animate-gradient-xy"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-400 
                            to-pink-400 opacity-0 group-hover:opacity-90 transition-all duration-500 
                            scale-0 group-hover:scale-100"></div>
            <div className="relative flex items-center justify-center">
              <ChatBubbleOvalLeftEllipsisIcon className="h-6 w-6 md:h-8 md:w-8 text-white transform transition-all duration-300 
                                                        group-hover:scale-110 group-hover:rotate-12" />
            </div>
          </button>
        </div>
      </Draggable>

      {/* Chat Window */}
      {isOpen && (
        <div className={`${isMobile ? 'fixed inset-0 m-0' : 'absolute bottom-20 right-0 w-96'} 
                        bg-white rounded-lg shadow-2xl flex flex-col 
                        ${isMobile ? 'h-full' : 'max-h-[600px]'}`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 
                         p-3 flex justify-between items-center sticky top-0 z-10">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-inner">
                <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">Ask ARI 1.0</h3>
                {isTyping && (
                  <span className="text-xs text-blue-100">typing...</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white opacity-80 hover:opacity-100 transition-opacity duration-300"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Container */}
          <div
            ref={chatContainerRef}
            onScroll={handleScroll}
            className={`flex-1 p-4 rounded-lg space-y-4 overflow-y-auto
                      ${isMobile ? 'h-[calc(100vh-120px)]' : 'min-h-[400px] max-h-[500px]'}
                      scrollbar scrollbar-w-2 scrollbar-thumb-blue-500 
                      scrollbar-track-gray-100 scrollbar-thumb-rounded-full`}
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.isBot ? 'justify-start' : 'justify-end'} 
                           animate-fade-in-up`}
              >
                <div className={`max-w-[80%]`}>
                  <div
                    className={`p-3 rounded-lg mt-8 ${
                      message.isBot 
                        ? 'bg-gray-100 text-gray-800' 
                        : 'bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 text-white'
                    } shadow-sm`}
                  >
                    {message.text}
                  </div>
                  <div className={`text-xs text-gray-500 mt-1 ${
                    message.isBot ? 'ml-2' : 'mr-2 text-right'}`}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-full px-4 py-2">
                  <div className="flex space-x-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i}
                        className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"
                        style={{ animationDelay: `${i * 0.15}s` }}></div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage}
            className="p-4 bg-white border-t border-gray-200 sticky bottom-0 rounded-lg">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Message ARI..."
                className="flex-1 p-2 md:p-3 bg-gray-100 rounded-full focus:outline-none 
                         focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-300"
              />
              <button
                type="submit"
                className="p-2 md:p-3 bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 
                         text-white rounded-full shadow-md hover:shadow-lg transition-all duration-300
                         active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!newMessage.trim()}
              >
                <PaperAirplaneIcon className="h-5 w-5 transform" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatBotPopup;