import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, PaperAirplaneIcon, ChatBubbleOvalLeftEllipsisIcon } from '@heroicons/react/24/solid';
import Draggable from 'react-draggable';
import { API_Chatbot_HOST } from '../API/apiConfig';

const ChatBotPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    // {
    //   text: "👋 Hello! I'm ARI, your personal assistant. How can I help you today?",
    //   isBot: true,
    //   timestamp: new Date()
    // },
    // Sample messages for scroll demonstration
    ...Array(8).fill(null).map((_, i) => ({
      text: `Previous message ${i + 1} for chat history demonstration`,
      isBot: i % 2 === 0,
      timestamp: new Date(Date.now() - (i * 60000))
    }))
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    setMessages([{
      text: "👋 Hello! I'm ARI, your personal assistant. How can I help you today?",
      isBot: true,
      timestamp: new Date()
    }]); // Clear all messages but add back welcome message
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
      {/* Draggable Chat Button */}
      <Draggable handle=".drag-handle">
        <div className="inline-block">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="drag-handle relative p-5 rounded-full overflow-hidden group
                      shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-all duration-500
                      hover:shadow-[0_8px_30px_rgba(59,130,246,0.6)]
                      active:scale-95 cursor-pointer transform-gpu"
          >
            {/* Animated background layers */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-500 
                            to-pink-500 opacity-85 animate-gradient-xy"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-400 
                            to-pink-400 opacity-0 group-hover:opacity-90 transition-all duration-500 
                            scale-0 group-hover:scale-100"></div>

            {/* Glowing effect */}
            <div className="absolute inset-0 rounded-full opacity-40 group-hover:opacity-60 
                            transition-opacity duration-500 animate-pulse"
              style={{
                background: 'radial-gradient(circle at center, rgba(255,255,255,0.8) 0%, transparent 70%)'
              }}></div>

            {/* Content */}
            <div className="relative flex items-center justify-center">
              <ChatBubbleOvalLeftEllipsisIcon className="h-8 w-8 text-white transform transition-all duration-300 
                                                        group-hover:scale-110 group-hover:rotate-12" />
            </div>

            {/* Ripple effect on hover */}
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-25
                            transition-opacity duration-300"
              style={{
                background: 'radial-gradient(circle at center, transparent 0%, rgba(255,255,255,0.8) 100%)',
                animation: 'ripple 1.5s infinite'
              }}></div>
          </button>
        </div>
      </Draggable>

      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-96 bg-white rounded-lg 
                        shadow-2xl flex flex-col max-h-[600px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 p-3 rounded-t-lg 
                          flex justify-between items-center absolute top-0 left-0 right-0 z-10">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-inner relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5 text-blue-600 transform transition-all duration-300 
                                                          group-hover:scale-110 group-hover:rotate-12" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">ARI Assistant</h3>
                {isTyping && (
                  <span className="text-xs text-blue-100">typing...</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white opacity-80 hover:opacity-100 transition-opacity duration-300 hover:rotate-90 transform"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Container */}
          <div
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 p-4 pt-14 space-y-4 overflow-y-auto min-h-[calc(100vh-200px)] max-h-[calc(100vh-200px)]
                      scrollbar scrollbar-w-2 scrollbar-thumb-blue-500 
                      scrollbar-track-gray-100 scrollbar-thumb-rounded-full"
            style={{ scrollBehavior: 'smooth' }}
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.isBot ? 'justify-start' : 'justify-end'} 
                           animate-fade-in-up`}
              >
                <div className={`max-w-[80%] transform transition-all duration-300 ease-out
                              ${message.isBot ? 'translate-x-0' : 'translate-x-0'}`}>
                  <div
                    className={`p-3 rounded-lg ${
                      message.isBot 
                        ? 'bg-gray-100 text-gray-800' 
                        : 'bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 text-white'
                    } shadow-sm hover:shadow-md transition-shadow duration-300`}
                  >
                    {message.text}
                  </div>
                  <div className={`text-xs text-gray-500 mt-1 ${message.isBot ? 'ml-2' : 'mr-2 text-right'
                    }`}>
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
            className="p-4 bg-white border-t border-gray-200 sticky bottom-0 z-10">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Message ARI..."
                className="flex-1 p-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2
                         focus:ring-blue-500 focus:bg-white transition-all duration-300"
              />
              <button
                type="submit"
                className="p-3 bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 text-white
                         rounded-full shadow-md hover:shadow-lg transition-all duration-300
                         hover:from-blue-600 hover:to-pink-500 hover:via-purple-500 active:scale-95
                         disabled:opacity-50 disabled:cursor-not-allowed"
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