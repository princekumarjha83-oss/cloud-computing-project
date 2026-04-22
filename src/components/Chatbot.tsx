import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Shield, Sparkles, X } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

const SYSTEM_INSTRUCTION = `You are GuardianEye AI, a specialized assistant for a Crime Reporting System. 
Your goals:
1. Help users understand how to file a report.
2. Provide immediate safety tips for various situations (theft, assault, cybercrime).
3. Explain the reporting process and what happens after a report is filed.
4. Answer FAQs about the system.
5. DO NOT provide legal advice or act as a replacement for emergency services.
6. If the user is in immediate danger, tell them to use the SOS button or call local emergency numbers (e.g., 100 or 112 in India).
7. Be professional, empathetic, and concise.`;

export default function Chatbot() {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: "Hello! I'm GuardianEye AI. How can I assist you with your safety or reporting needs today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Check if API key is available
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('No API key');
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...messages, { role: 'user', content: userMessage }].map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        }
      });

      const assistantMessage = response.text || "I'm sorry, I couldn't process that request.";
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error('AI API not available, using fallback responses');
      // Use intelligent fallback responses
      const fallbackResponse = getFallbackResponse(userMessage.toLowerCase());
      setMessages(prev => [...prev, { role: 'assistant', content: fallbackResponse }]);
    } finally {
      setLoading(false);
    }
  };

  // Intelligent fallback responses
  const getFallbackResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    // Safety and emergency responses
    if (lowerMessage.includes('emergency') || lowerMessage.includes('danger') || lowerMessage.includes('help')) {
      return `**Emergency Assistance**\n\nIf you are in immediate danger, please:\n\n1. **Call Emergency Services**: Dial 100 (Police) or 112 (General Emergency)\n2. **Use SOS Button**: Available in the main dashboard for quick alerts\n3. **Move to Safety**: If possible, move to a safe, public location\n\n**Important**: I am an AI assistant and cannot replace emergency services. Please contact local authorities immediately for urgent assistance.`;
    }
    
    // Reporting process
    if (lowerMessage.includes('report') || lowerMessage.includes('file') || lowerMessage.includes('submit')) {
      return `**How to File a Report**\n\n1. **Go to "Report Crime"** in the sidebar\n2. **Step 1**: Select crime type and provide description\n3. **Step 2**: Add location and priority level\n4. **Step 3**: Upload evidence (photos, videos, documents)\n5. **Submit**: Your report will be securely sent to authorities\n\n**Tips**:\n- Be as detailed as possible in your description\n- Include time, date, and location\n- Upload any relevant evidence\n- You can report anonymously if preferred`;
    }
    
    // Theft related
    if (lowerMessage.includes('theft') || lowerMessage.includes('stolen')) {
      return `**Theft Reporting Guide**\n\n**What to Include**: \n- Description of stolen items\n- Time and location of incident\n- Any witnesses or suspects\n- Serial numbers or identifying marks\n\n**Immediate Actions**:\n1. Report to local police\n2. Contact your bank (if cards stolen)\n3. File insurance claim if applicable\n\n**Prevention Tips**:\n- Keep valuables secure and out of sight\n- Use locks and security systems\n- Be aware of your surroundings`;
    }
    
    // Cybercrime
    if (lowerMessage.includes('cyber') || lowerMessage.includes('online') || lowerMessage.includes('hack')) {
      return `**Cybercrime Reporting**\n\n**Types to Report**:\n- Online fraud/scams\n- Identity theft\n- Hacking attempts\n- Online harassment\n\n**Evidence to Collect**:\n- Screenshots of messages\n- Email headers\n- Transaction records\n- IP addresses if available\n\n**Immediate Steps**:\n1. Change compromised passwords\n2. Contact your bank\n3. Report to cybercrime department\n4. Document all evidence`;
    }
    
    // General safety tips
    if (lowerMessage.includes('safety') || lowerMessage.includes('tips') || lowerMessage.includes('protect')) {
      return `**Personal Safety Tips**\n\n**Daily Safety**:\n- Be aware of your surroundings\n- Travel in well-lit areas at night\n- Let someone know your plans\n- Keep phone charged and accessible\n\n**Home Security**:\n- Lock doors and windows\n- Use security systems\n- Know your neighbors\n- Report suspicious activity\n\n**Digital Safety**:\n- Use strong, unique passwords\n- Enable two-factor authentication\n- Be cautious with public Wi-Fi\n- Regularly update software`;
    }
    
    // System questions
    if (lowerMessage.includes('how') || lowerMessage.includes('what') || lowerMessage.includes('explain')) {
      return `**GuardianEye System Guide**\n\n**Features Available**:\n- **Dashboard**: View crime statistics and your reports\n- **Report Crime**: Submit incident reports with evidence\n- **Crime Map**: View crime incidents in your area\n- **Evidence Vault**: Secure storage for case files\n- **Notifications**: Updates on your report status\n- **AI Assistant**: Get help 24/7 (that's me!)\n\n**Privacy**: Your reports are encrypted and secure. Anonymous reporting is available.\n\n**Response Time**: Reports are typically reviewed within 24-48 hours.`;
    }
    
    // Default response
    return `**GuardianEye AI Assistant**\n\nI'm here to help with crime reporting and safety questions. I can assist with:\n\n- How to file a crime report\n- Safety tips for various situations\n- Understanding the reporting process\n- System features and navigation\n- Emergency guidance\n\n**Examples**: Try asking "How do I report theft?" or "What safety tips do you recommend?"\n\nFor immediate emergencies, please call 100 or 112. I'm designed to provide guidance but cannot replace emergency services.`;
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      <div className="p-6 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Bot className="text-white w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">GuardianEye AI</h2>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Online Assistant
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 bg-slate-900 px-2 py-1 rounded-lg uppercase tracking-wider">
            Powered by Gemini
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex gap-4 max-w-[85%]",
              m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
              m.role === 'user' ? "bg-blue-600" : "bg-slate-800 border border-slate-700"
            )}>
              {m.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-blue-400" />}
            </div>
            <div className={cn(
              "p-4 rounded-2xl text-sm leading-relaxed",
              m.role === 'user' 
                ? "bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-600/10" 
                : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"
            )}>
              <div className="markdown-body prose prose-invert max-w-none">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex gap-4 mr-auto max-w-[85%]">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-blue-400" />
            </div>
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl rounded-tl-none flex gap-1.5 items-center">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-6 bg-slate-800/30 border-t border-slate-800">
        <div className="relative flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about safety tips or reporting process..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="mt-3 text-center text-[10px] text-slate-500 uppercase tracking-widest font-bold">
          GuardianEye AI can make mistakes. Verify important information.
        </p>
      </form>
    </div>
  );
}
