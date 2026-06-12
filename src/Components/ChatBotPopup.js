import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [listening, setListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const speechSynthesisRef = useRef(null);
  const recognitionRef = useRef(null);

  // Check if device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Initial welcome message
  useEffect(() => {
    setMessages([{
      id: Date.now(),
      text: "✨ **Ari 5.0 online** • I can help with:\n📋 Documents | 📊 Reports | 💰 Files | 📄 Contracts | 📁 Uploads\n\n**Try asking:**\n• 'Show documents'\n• 'How to upload files'\n• 'Document status'\n• 'Help' for all commands",
      isBot: true,
      timestamp: new Date()
    }]);
  }, []);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Stop speaking function
  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      speechSynthesisRef.current = null;
    }
  }, []);

  // Clean text for speech - removes formatting but preserves content
  const cleanTextForSpeech = useCallback((text) => {
    let cleaned = text;
    
    // Remove markdown bold markers
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
    
    // Remove markdown italic markers
    cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');
    
    // Remove markdown headers
    cleaned = cleaned.replace(/^#+\s+/gm, '');
    
    // Replace line breaks with periods and spaces
    cleaned = cleaned.replace(/\n/g, '. ');
    
    // Replace bullet points with proper words
    cleaned = cleaned.replace(/[•○●▪▫➢→>]/g, '•');
    
    // Replace multiple spaces with single space
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Replace emojis with text equivalents
    cleaned = cleaned.replace(/✨/g, '');
    cleaned = cleaned.replace(/📋/g, '');
    cleaned = cleaned.replace(/📊/g, '');
    cleaned = cleaned.replace(/💰/g, '');
    cleaned = cleaned.replace(/📄/g, '');
    cleaned = cleaned.replace(/📁/g, '');
    cleaned = cleaned.replace(/✅/g, 'Approved');
    cleaned = cleaned.replace(/❌/g, 'Rejected');
    cleaned = cleaned.replace(/⏳/g, 'Pending');
    cleaned = cleaned.replace(/👋/g, '');
    cleaned = cleaned.replace(/🤖/g, '');
    cleaned = cleaned.replace(/💡/g, 'Tip');
    cleaned = cleaned.replace(/🔗/g, '');
    cleaned = cleaned.replace(/🗑️/g, '');
    cleaned = cleaned.replace(/🔍/g, '');
    cleaned = cleaned.replace(/📥/g, '');
    cleaned = cleaned.replace(/📤/g, '');
    
    // Remove extra punctuation
    cleaned = cleaned.replace(/\.{2,}/g, '.');
    cleaned = cleaned.replace(/,\s*,/g, ',');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
  }, []);

  // Speak function with stop capability - speaks the ENTIRE cleaned response
  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return;

    // Stop any ongoing speech first
    stopSpeaking();

    // Don't speak if it's an error message or too long
    if (text.includes("Service Unavailable") || text.length > 1000) {
      return;
    }

    // Clean the text for speech (removes formatting but keeps all content)
    const cleanedText = cleanTextForSpeech(text);
    
    if (!cleanedText || cleanedText.length === 0) return;

    console.log("Speaking cleaned text:", cleanedText); // Debug log
    
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    utterance.volume = 1;
    utterance.lang = 'en-US';

    // Track speaking status
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [stopSpeaking, cleanTextForSpeech]);

  // Format AI response for better readability - Break at special characters
  const formatResponse = useCallback((text) => {
    if (!text) return "No response received.";

    let formatted = text;

    // Break at ○, •, -, *, etc. and add line breaks
    formatted = formatted.replace(/○/g, '\n○');
    formatted = formatted.replace(/•/g, '\n•');
    formatted = formatted.replace(/●/g, '\n●');
    formatted = formatted.replace(/→/g, '\n→');
    formatted = formatted.replace(/>/g, '\n>');
    formatted = formatted.replace(/▪/g, '\n▪');
    formatted = formatted.replace(/▫/g, '\n▫');
    
    // Break at numbered lists (1., 2., etc.)
    formatted = formatted.replace(/(\d+)\./g, '\n$1.');
    
    // Add line breaks after periods followed by capital letters or spaces
    formatted = formatted.replace(/\.\s+(?=[A-Z])/g, '.\n\n');
    
    // Format headers (## Something)
    formatted = formatted.replace(/## (.*?)(\n|$)/g, '\n📌 **$1**\n\n');
    
    // Format bullet points with proper spacing
    formatted = formatted.replace(/^- /gm, '• ');
    formatted = formatted.replace(/^\* /gm, '• ');
    
    // Format status badges
    formatted = formatted.replace(/Approved: (\d+)/g, '✅ **Approved:** $1');
    formatted = formatted.replace(/Pending: (\d+)/g, '⏳ **Pending:** $1');
    formatted = formatted.replace(/Rejected: (\d+)/g, '❌ **Rejected:** $1');
    
    // Remove excessive empty lines (more than 2)
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // Trim leading/trailing whitespace
    formatted = formatted.trim();
    
    return formatted;
  }, []);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => scrollToBottom('auto'), 100);
    }
  }, [isOpen, scrollToBottom]);

  useEffect(() => {
    const shouldScrollToBottom = !showScrollButton;
    if (shouldScrollToBottom) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom, showScrollButton]);

  // Get local fallback answers
  const getLocalAnswer = useCallback((text) => {
    const lower = text.toLowerCase().trim();

    // Greetings
    if (lower.match(/^(hello|hi|hey|greetings|good morning|good afternoon|good evening)$/)) {
      return "👋 **Hello!** I'm Ari 5.0, your personal document assistant.\n\n📋 **I can help you with:**\n• Document management\n• File uploads and downloads\n• Document status tracking\n• Report generation\n• File searching\n\n**Try asking:** 'Show all documents' or 'How to upload files?'";
    }

    // Document related
    if (lower.includes("document") && (lower.includes("list") || lower.includes("all") || lower.includes("show"))) {
      return "📋 **Document List**\n\nFetching document information from the system...\n\n💡 **Try:** `document details` or `search for [document name]`";
    }

    // Upload help
    if ((lower.includes("upload") || lower.includes("add file")) && (lower.includes("how") || lower.includes("help"))) {
      return "📤 **Upload Guide**\n\n**To upload files:**\n1. Click on 'Upload' button\n2. Select your file\n3. Add title and description\n4. Choose category\n5. Click submit\n\n✅ **Supported formats:** PDF, DOC, DOCX, XLS, XLSX, JPG, PNG\n\n💡 **Tip:** Maximum file size is 10MB";
    }

    // Download help
    if (lower.includes("download") && (lower.includes("how") || lower.includes("help"))) {
      return "📥 **Download Guide**\n\n**To download files:**\n1. Find the file in the list\n2. Click the 'Download' button\n3. File will be saved to your device\n\n💡 **Tip:** You can also right-click and 'Save as'";
    }

    // Status help
    if (lower.includes("status") && (lower.includes("document") || lower.includes("file"))) {
      return "📊 **Document Status**\n\n**Documents can have these statuses:**\n• ✅ **APPROVED** - Verified and accepted\n• ❌ **REJECTED** - Needs revision\n• ⏳ **PENDING** - Awaiting review\n\n💡 **Try:** `status of [document name]` for specific document";
    }

    // Search help
    if (lower.includes("search") || lower.includes("find") || lower.includes("look for")) {
      return "🔍 **Search Help**\n\n**You can search documents by:**\n• File name\n• Category\n• Upload date\n• Status\n• Uploaded by\n\n💡 **Try:** `search for annual report` or `find files from 2024`";
    }

    // Delete/Trash help
    if (lower.includes("delete") || lower.includes("trash") || lower.includes("remove")) {
      return "🗑️ **Delete Guide**\n\n**To move files to trash:**\n1. Select the file using checkbox\n2. Click 'Move to Trash'\n3. Confirm deletion\n\n💡 **Note:** Only APPROVED files can be deleted\n\n**To restore deleted files:**\n• Go to Trash section\n• Select files to restore\n• Click 'Restore' button";
    }

    // Share help
    if (lower.includes("share")) {
      return "🔗 **Share Guide**\n\n**To share documents:**\n1. Select files using checkboxes\n2. Click 'Share' button\n3. Enter email addresses\n4. Set permissions\n5. Send invitation\n\n💡 **Tip:** Shared users will receive email notifications";
    }

    // Stop voice command
    if (lower.includes("stop") || lower.includes("shut up") || lower.includes("be quiet") || lower === "stop") {
      stopSpeaking();
      return "🔇 **Voice stopped.** You can continue typing your questions.";
    }

    // Help command
    if (lower.includes("help") || lower.includes("what can you do") || lower === "help" || lower === "commands") {
      return "🤖 **Ari 5.0 Commands**\n\n" +
        "┌─────────────────────────────────────────────┐\n" +
        "│ 📋 **Document Commands**                     │\n" +
        "│   • 'Show documents'                        │\n" +
        "│   • 'Document details [name]'               │\n" +
        "│                                             │\n" +
        "│ 📤 **Upload Commands**                       │\n" +
        "│   • 'How to upload'                         │\n" +
        "│   • 'Upload file'                           │\n" +
        "│                                             │\n" +
        "│ 📥 **Download Commands**                     │\n" +
        "│   • 'How to download'                       │\n" +
        "│   • 'Download file'                         │\n" +
        "│                                             │\n" +
        "│ 📊 **Status Commands**                       │\n" +
        "│   • 'Document status'                       │\n" +
        "│   • 'Approved documents'                    │\n" +
        "│   • 'Pending review'                        │\n" +
        "│   • 'Rejected files'                        │\n" +
        "│                                             │\n" +
        "│ 🔍 **Search Commands**                       │\n" +
        "│   • 'Search for [name]'                     │\n" +
        "│   • 'Find files'                            │\n" +
        "│                                             │\n" +
        "│ 🗑️ **Delete Commands**                       │\n" +
        "│   • 'How to delete'                         │\n" +
        "│   • 'Restore files'                         │\n" +
        "│                                             │\n" +
        "│ 🔗 **Share Commands**                        │\n" +
        "│   • 'How to share'                          │\n" +
        "│                                             │\n" +
        "│ 🔊 **Voice Commands**                        │\n" +
        "│   • 'Stop' / 'Shut up' - Stop speaking     │\n" +
        "└─────────────────────────────────────────────┘\n\n" +
        "💡 **Tip:** Type 'stop' to stop voice responses at any time";
    }

    // About command
    if (lower.includes("about") || lower.includes("who are you") || lower.includes("what are you")) {
      return "🤖 **About Ari 5.0**\n\n**Ari 5.0** is your intelligent document management assistant powered by AI.\n\n**Features:**\n• Voice interaction\n• Document search\n• File upload/download\n• Status tracking\n• Smart recommendations\n\n**Version:** 5.0\n**Status:** Online ✅\n\n💡 **Type 'help'** to see all available commands";
    }

    return null;
  }, [stopSpeaking]);

  // Send message to API
  const sendMessageToAPI = useCallback(async (userMessage) => {
    try {
      setIsTyping(true);
      
      // Stop any ongoing speech before new response
      stopSpeaking();
      
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      let responseText = data.response;
      
      // If response is valid, format and speak it
      if (responseText && responseText !== "I couldn't process that request." && !responseText.includes("error")) {
        // Format for display (with line breaks)
        const formattedText = formatResponse(responseText);
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: formattedText,
          isBot: true,
          timestamp: new Date()
        }]);
        
        // Speak the ORIGINAL response (not formatted) to ensure all content is spoken
        // But clean it first for speech
        speak(responseText);
      } else {
        // Use local fallback
        const localAnswer = getLocalAnswer(userMessage);
        const reply = localAnswer || "🤖 **I'm Ari 5.0.** I can help with documents, uploads, and file management.\n\n💡 **Try:** 'Help' to see all available commands!";
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: reply,
          isBot: true,
          timestamp: new Date()
        }]);
        if (!reply.includes("Service Unavailable")) {
          speak(reply);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = "⚠️ **Service Unavailable**\n\nI'm having trouble connecting to the service.\n\n💡 **Please check:**\n• Network connection is active\n• Try again in a moment\n\n💡 **Tip:** You can still use me for basic commands like 'Help' or 'How to upload'";
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: errorMessage,
        isBot: true,
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
      setIsSending(false);
    }
  }, [formatResponse, speak, stopSpeaking, getLocalAnswer]);

  // Handle send message
  const handleSendMessage = useCallback(async (e, voiceText = null) => {
    if (e) {
      e.preventDefault();
    }
    
    const messageToSend = voiceText || newMessage;
    if (!messageToSend.trim() || isSending) return;

    setIsSending(true);

    const userMessage = messageToSend.trim();
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: userMessage,
      isBot: false,
      timestamp: new Date()
    }]);
    setNewMessage("");
    
    await sendMessageToAPI(userMessage);
  }, [newMessage, isSending, sendMessageToAPI]);

  // Voice input functionality
  const startVoiceInput = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("🌐 Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }
    
    if (listening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setListening(true);
    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setListening(false);
      if (transcript?.trim()) {
        setNewMessage(transcript);
        // Auto send after voice input
        handleSendMessage(null, transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);
      if (event.error !== 'no-speech') {
        alert("Voice recognition failed. Please try again or type your message.");
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
  }, [listening, handleSendMessage]);

  // Handle key press (Enter to send)
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  }, [handleSendMessage]);

  const formatTime = useCallback((date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }, []);

  // Format message text with bold and line breaks for display
  const formatMessageText = useCallback((text) => {
    if (!text) return "";
    
    // Replace **bold** with <strong>
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace line breaks with <br/>
    formatted = formatted.replace(/\n/g, '<br/>');
    
    // Replace • with styled bullet
    formatted = formatted.replace(/•/g, '<span style="color: #a78bfa;">•</span>');
    
    // Replace ○ with styled bullet
    formatted = formatted.replace(/○/g, '<span style="color: #a78bfa;">○</span>');
    
    // Replace ✅, ❌, ⏳ with styled emojis
    formatted = formatted.replace(/✅/g, '<span style="color: #4ade80;">✅</span>');
    formatted = formatted.replace(/❌/g, '<span style="color: #ef4444;">❌</span>');
    formatted = formatted.replace(/⏳/g, '<span style="color: #f59e0b;">⏳</span>');
    
    // Add margin for list items
    formatted = formatted.replace(/<br\/>○/g, '<br/><span style="margin-left: 8px;">○</span>');
    formatted = formatted.replace(/<br\/>•/g, '<br/><span style="margin-left: 8px;">•</span>');
    
    return formatted;
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="chatbot-float-btn group"
        aria-label="Open chat"
      >
        <span className="btn-icon">🤖</span>
        <span className="btn-pulse"></span>
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={`${isMobile ? 'fixed inset-0 m-0' : 'absolute bottom-20 right-0 w-[400px]'} 
                        chatbot-window ${isOpen ? 'active' : ''}`}>
          {/* Header */}
          <div className="chatbot-header">
            <div className="header-left">
              <div className="avatar-container">
                <div className="avatar">A5</div>
                <div className="avatar-ring"></div>
              </div>
              <div className="header-info">
                <h3>Ari 5.0</h3>
                <div className="status">
                  <span className={`status-dot ${listening ? 'listening' : (isSpeaking ? 'speaking' : 'online')}`}></span>
                  <span>{listening ? 'Listening...' : (isSpeaking ? 'Speaking...' : 'AI Ready')}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {/* Stop Voice Button */}
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="stop-voice-btn"
                  title="Stop Speaking"
                  aria-label="Stop speaking"
                >
                  ⏹
                </button>
              )}
              <button className="close-window" onClick={() => setIsOpen(false)} aria-label="Close chat">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages Container - Reduced height */}
          <div
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="chatbot-messages"
            style={{ height: isMobile ? 'calc(100vh - 120px)' : '350px' }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.isBot ? 'bot' : 'user'} animate-fade-in-up`}
              >
                <div className="message-bubble">
                  {message.isBot ? (
                    <div dangerouslySetInnerHTML={{
                      __html: formatMessageText(message.text)
                    }} />
                  ) : (
                    <div>{message.text}</div>
                  )}
                  <div className={`message-time ${message.isBot ? 'bot-time' : 'user-time'}`}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="message bot">
                <div className="message-bubble typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <button
              onClick={() => scrollToBottom()}
              className="scroll-bottom-btn"
              aria-label="Scroll to bottom"
            >
              ↓
            </button>
          )}

          {/* Input Form - Reduced padding */}
          <form onSubmit={handleSendMessage} className="chatbot-input-area" style={{ padding: '12px' }}>
            <div className="input-container" style={{ padding: '3px' }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Ari 5.0... (e.g., 'Show documents', 'Help')"
                className="chat-input"
                style={{ padding: '8px 12px', fontSize: '12px' }}
                disabled={isSending}
                aria-label="Message input"
              />
              <button
                type="button"
                onClick={startVoiceInput}
                className="voice-input"
                style={{ width: '34px', height: '34px' }}
                disabled={isSending}
                aria-label="Voice input"
                title="Voice input"
              >
                {listening ? '⏺' : '🎤'}
              </button>
              <button
                type="submit"
                className="send-input"
                style={{ width: '34px', height: '34px' }}
                disabled={!newMessage.trim() || isSending}
                aria-label="Send message"
                title="Send message"
              >
                <PaperAirplaneIcon className="h-3 w-3 transform rotate-0" />
              </button>
            </div>
          </form>
        </div>
      )}

<style jsx>{`
  @keyframes pulse {
    0% { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(1.5); opacity: 0; }
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
  
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  @keyframes wave {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-5px); }
  }
  
  .animate-fade-in-up {
    animation: slideIn 0.3s ease;
  }
  
  /* Floating Button */
  .chatbot-float-btn {
    position: relative;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }
  
  .chatbot-float-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  }
  
  .btn-icon {
    font-size: 28px;
    animation: bounce 2s infinite;
    position: relative;
    z-index: 2;
  }
  
  .btn-pulse {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: rgba(102, 126, 234, 0.4);
    animation: pulse 1.5s infinite;
  }
  
  /* Chat Window - Full Height */
  .chatbot-window {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-radius: 20px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    height: 80vh;
    max-height: 800px;
    min-height: 500px;
    width: 400px;
  }
  
  /* Full screen on mobile */
  @media (max-width: 768px) {
    .chatbot-window {
      width: 100vw;
      height: 100vh;
      max-height: 100vh;
      min-height: 100vh;
      right: 0;
      bottom: 0;
      border-radius: 0;
    }
  }
  
  .chatbot-window.active {
    opacity: 1;
    visibility: visible;
    transform: translateY(0) scale(1);
  }
  
  /* Header */
  .chatbot-header {
    padding: 16px 20px;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }
  
  .header-left {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  
  .avatar-container {
    position: relative;
    width: 45px;
    height: 45px;
  }
  
  .avatar {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 18px;
    color: white;
    position: relative;
    z-index: 2;
  }
  
  .avatar-ring {
    position: absolute;
    top: -3px;
    left: -3px;
    right: -3px;
    bottom: -3px;
    border-radius: 50%;
    background: conic-gradient(from 0deg, #667eea, #764ba2, #f093fb, #667eea);
    animation: rotate 3s linear infinite;
    opacity: 0.6;
    z-index: 1;
  }
  
  .header-info h3 {
    margin: 0;
    color: white;
    font-size: 16px;
    font-weight: 600;
  }
  
  .status {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    font-size: 11px;
    color: #aaa;
  }
  
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }
  
  .status-dot.online {
    background: #4ade80;
    box-shadow: 0 0 5px #4ade80;
    animation: blink 1.5s infinite;
  }
  
  .status-dot.listening,
  .status-dot.speaking {
    background: #f97316;
    box-shadow: 0 0 5px #f97316;
    animation: blink 0.5s infinite;
  }
  
  .stop-voice-btn {
    background: #ef4444;
    border: none;
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  
  .stop-voice-btn:hover {
    transform: scale(1.1);
    background: #dc2626;
  }
  
  .close-window {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  
  .close-window:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: rotate(90deg);
  }
  
  /* Messages Container - Takes remaining space */
  .chatbot-messages {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
  }
  
  .chatbot-messages::-webkit-scrollbar {
    width: 5px;
  }
  
  .chatbot-messages::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
  }
  
  .chatbot-messages::-webkit-scrollbar-thumb {
    background: rgba(167, 139, 250, 0.5);
    border-radius: 10px;
  }
  
  .chatbot-messages::-webkit-scrollbar-thumb:hover {
    background: rgba(167, 139, 250, 0.8);
  }
  
  /* Messages */
  .message {
    display: flex;
    animation: slideIn 0.3s ease;
  }
  
  .message.user {
    justify-content: flex-end;
  }
  
  .message.bot {
    justify-content: flex-start;
  }
  
  .message-bubble {
    max-width: 85%;
    padding: 10px 14px;
    border-radius: 18px;
    font-size: 13px;
    line-height: 1.5;
    word-wrap: break-word;
    white-space: pre-wrap;
    position: relative;
  }
  
  .message.user .message-bubble {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-bottom-right-radius: 4px;
  }
  
  .message.bot .message-bubble {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    color: #e0e0e0;
    border-bottom-left-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .message.bot .message-bubble strong {
    color: #a78bfa;
    font-weight: 600;
  }
  
  .message-time {
    font-size: 10px;
    margin-top: 4px;
    opacity: 0.7;
  }
  
  .user-time {
    text-align: right;
  }
  
  .bot-time {
    text-align: left;
  }
  
  /* Typing Animation */
  .typing {
    display: flex;
    gap: 4px;
    padding: 12px 16px;
  }
  
  .typing span {
    width: 6px;
    height: 6px;
    background: #aaa;
    border-radius: 50%;
    animation: wave 1.2s infinite;
  }
  
  .typing span:nth-child(2) {
    animation-delay: 0.2s;
  }
  
  .typing span:nth-child(3) {
    animation-delay: 0.4s;
  }
  
  /* Scroll Button */
  .scroll-bottom-btn {
    position: absolute;
    bottom: 85px;
    right: 20px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #667eea;
    border: none;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    transition: all 0.2s;
    z-index: 10;
  }
  
  .scroll-bottom-btn:hover {
    transform: scale(1.1);
    background: #764ba2;
  }
  
  /* Input Area */
  .chatbot-input-area {
    padding: 16px;
    background: rgba(0, 0, 0, 0.2);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
  }
  
  .input-container {
    display: flex;
    gap: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 25px;
    padding: 5px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .chat-input {
    flex: 1;
    background: transparent;
    border: none;
    padding: 10px 12px;
    color: white;
    font-size: 13px;
    outline: none;
  }
  
  .chat-input::placeholder {
    color: #888;
  }
  
  .chat-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .voice-input,
  .send-input {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .voice-input {
    background: #2dd4bf;
    color: #1a1a2e;
  }
  
  .voice-input:hover:not(:disabled) {
    transform: scale(1.05);
    background: #14b8a6;
  }
  
  .voice-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .send-input {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }
  
  .send-input:hover:not(:disabled) {
    transform: scale(1.05);
  }
  
  .send-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* ============================================ */
  /* RESPONSIVE DESIGN - FULL HEIGHT ON ALL DEVICES */
  /* ============================================ */
  
  /* Desktop (1200px and above) */
  @media (min-width: 1200px) {
    .chatbot-window {
      width: 450px;
      height: 75vh;
      max-height: 750px;
      min-height: 550px;
    }
  }
  
  /* Desktop Medium (992px - 1199px) */
  @media (min-width: 992px) and (max-width: 1199px) {
    .chatbot-window {
      width: 420px;
      height: 70vh;
      max-height: 700px;
      min-height: 500px;
    }
  }
  
  /* Tablet Landscape (768px - 991px) */
  @media (min-width: 768px) and (max-width: 991px) {
    .chatbot-window {
      width: 400px;
      height: 65vh;
      max-height: 650px;
      min-height: 480px;
    }
    
    .chatbot-header {
      padding: 14px 18px;
    }
    
    .avatar {
      width: 42px;
      height: 42px;
      font-size: 17px;
    }
    
    .chatbot-messages {
      padding: 14px;
    }
  }
  
  /* Tablet Portrait (481px - 767px) - Full Width */
  @media (max-width: 767px) and (min-width: 481px) {
    .chatbot-window {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      max-height: 100%;
      min-height: 100%;
      border-radius: 0;
      right: 0;
      bottom: 0;
    }
    
    .chatbot-float-btn {
      bottom: 20px;
      right: 20px;
    }
    
    .message-bubble {
      max-width: 85%;
      font-size: 13px;
    }
    
    .chatbot-header {
      padding: 16px 20px;
    }
    
    .avatar {
      width: 45px;
      height: 45px;
      font-size: 18px;
    }
  }
  
  /* Mobile (320px - 480px) - Full Screen */
  @media (max-width: 480px) {
    .chatbot-window {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      max-height: 100%;
      min-height: 100%;
      border-radius: 0;
      right: 0;
      bottom: 0;
    }
    
    .chatbot-float-btn {
      bottom: 15px;
      right: 15px;
      width: 55px;
      height: 55px;
    }
    
    .btn-icon {
      font-size: 26px;
    }
    
    .chatbot-header {
      padding: 12px 16px;
    }
    
    .avatar-container {
      width: 40px;
      height: 40px;
    }
    
    .avatar {
      width: 40px;
      height: 40px;
      font-size: 16px;
    }
    
    .header-info h3 {
      font-size: 15px;
    }
    
    .status {
      font-size: 10px;
    }
    
    .stop-voice-btn,
    .close-window {
      width: 30px;
      height: 30px;
    }
    
    .chatbot-messages {
      padding: 12px;
      gap: 10px;
    }
    
    .message-bubble {
      max-width: 90%;
      padding: 8px 12px;
      font-size: 12px;
    }
    
    .message-time {
      font-size: 9px;
    }
    
    .typing {
      padding: 10px 14px;
    }
    
    .typing span {
      width: 5px;
      height: 5px;
    }
    
    .scroll-bottom-btn {
      bottom: 80px;
      right: 15px;
      width: 32px;
      height: 32px;
      font-size: 16px;
    }
    
    .chatbot-input-area {
      padding: 12px;
    }
    
    .input-container {
      gap: 6px;
      padding: 4px;
    }
    
    .chat-input {
      padding: 8px 10px;
      font-size: 12px;
    }
    
    .voice-input,
    .send-input {
      width: 36px;
      height: 36px;
      font-size: 14px;
    }
  }
  
  /* Extra Small Devices (below 320px) */
  @media (max-width: 320px) {
    .chatbot-header {
      padding: 10px 14px;
    }
    
    .avatar-container {
      width: 35px;
      height: 35px;
    }
    
    .avatar {
      width: 35px;
      height: 35px;
      font-size: 14px;
    }
    
    .header-info h3 {
      font-size: 13px;
    }
    
    .status {
      font-size: 9px;
    }
    
    .chatbot-messages {
      padding: 10px;
    }
    
    .message-bubble {
      padding: 6px 10px;
      font-size: 11px;
    }
    
    .voice-input,
    .send-input {
      width: 32px;
      height: 32px;
      font-size: 12px;
    }
    
    .scroll-bottom-btn {
      bottom: 75px;
      right: 12px;
      width: 28px;
      height: 28px;
      font-size: 14px;
    }
  }
  
  /* Landscape Mode for Mobile */
  @media (max-height: 500px) and (orientation: landscape) {
    .chatbot-window {
      height: 100%;
      max-height: 100%;
    }
    
    .chatbot-messages {
      min-height: 200px;
    }
    
    .chatbot-header {
      padding: 8px 16px;
    }
    
    .avatar-container {
      width: 35px;
      height: 35px;
    }
    
    .avatar {
      width: 35px;
      height: 35px;
      font-size: 14px;
    }
    
    .chatbot-input-area {
      padding: 8px 12px;
    }
    
    .message-bubble {
      padding: 6px 10px;
      font-size: 11px;
    }
  }
`}</style>
    </div>
  );
};

export default ChatBotPopup;