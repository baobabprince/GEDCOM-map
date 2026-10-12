import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Sparkles, Send, Copy, Check, RotateCcw, HelpCircle, Loader2, Maximize2, X } from 'lucide-react';
import { generateHistoricalContext, chatHistoricalContext } from '../services/geminiService.ts';
import { Person } from '../types.ts';

interface HistoricalContextViewProps {
  name: string;
  type: 'person' | 'place';
  events: any[];
  person?: Person | null;
  allPersons?: Person[];
}

export const HistoricalContextView: React.FC<HistoricalContextViewProps> = ({ 
  name, 
  type, 
  events,
  person = null,
  allPersons = []
}) => {
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextText, setContextText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [sendingChat, setSendingChat] = useState(false);
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadingMessages = [
    'מתחבר לארכיונים הדיגיטליים של Gemini...',
    'מנתח את השנים והעשורים הרלוונטיים...',
    'חוקר אירועים היסטוריים ומלחמות באותה תקופה...',
    'ממפה את תנאי המחיה וחיי היומיום של האוכלוסייה...',
    'רוקם עבורך רקע היסטורי עשיר ומותאם אישית...'
  ];

  // Rotate loading messages
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMessageIdx((prev) => (prev + 1) % loadingMessages.length);
      }, 3000);
    } else {
      setLoadingMessageIdx(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, sendingChat]);

  // Extracts spouse, children, and parental lifespans and key events (e.g. emigration, immigration) 
  // to feed them directly into the prompt context.
  const getFamilyEventsText = (): string => {
    if (type !== 'person' || !person || !allPersons || allPersons.length === 0) return '';

    const spouseText: string[] = [];
    const childrenText: string[] = [];
    const parentsText: string[] = [];

    const formatMemberEvents = (mName: string, relationType: string, eventsList: any[]) => {
      if (!eventsList || eventsList.length === 0) return `* ${relationType}: ${mName}`;
      
      const originalEvents = eventsList.filter(e => !e.isInferred);
      if (originalEvents.length === 0) return `* ${relationType}: ${mName}`;

      const eventsStr = originalEvents
        .map(e => {
          const dateStr = e.date ? `בתאריך ${e.date}` : '';
          const placeStr = e.place ? `ב${e.place}` : '';
          return `    - אירוע ${e.eventType} ${dateStr} ${placeStr}`;
        })
        .join('\n');
      return `* ${relationType}: ${mName}\n${eventsStr}`;
    };

    if (person.spouses && person.spouses.length > 0) {
      for (const sp of person.spouses) {
        const found = allPersons.find(p => p.id === sp.id);
        spouseText.push(formatMemberEvents(sp.name, 'בן/בת זוג', found ? found.events : []));
      }
    }

    if (person.children && person.children.length > 0) {
      for (const ch of person.children) {
        const found = allPersons.find(p => p.id === ch.id);
        childrenText.push(formatMemberEvents(ch.name, 'ילד/ה', found ? found.events : []));
      }
    }

    if (person.parents && person.parents.length > 0) {
      for (const pa of person.parents) {
        const found = allPersons.find(p => p.id === pa.id);
        parentsText.push(formatMemberEvents(pa.name, 'הורה', found ? found.events : []));
      }
    }

    const sections = [];
    if (spouseText.length > 0) sections.push(`פרטי בני זוג:\n${spouseText.join('\n')}`);
    if (childrenText.length > 0) sections.push(`פרטי ילדים:\n${childrenText.join('\n')}`);
    if (parentsText.length > 0) sections.push(`פרטי הורים:\n${parentsText.join('\n')}`);

    if (sections.length === 0) return '';
    return `
\n\n--- מידע גנאלוגי מורחב על בני המשפחה הקרובים ואירועי חייהם המקוריים ---
אנא הצלב היטב בין תאריכי ומיקומי אירועי החיים של הדמות המרכזית (${name}) לבין אירועי חייהם של בני משפחתו אלו. 
לדוגמה: 
- בדוק והבלט האם מישהו מילדיו עזב/היגר/עלה למדינה אחרת או לארץ ישראל לפני פטירת הדמות (כלומר, הבן/בת ככל הנראה לא נכחו ברגעיו האחרונים של אביהם או במותו).
- שלב רקע עשיר וסיפור חיים מעניין על בת/בן הזוג שלו, נישואיהם ועל חייהם המשותפים באותה תקופה.
- נתח את הפאזל המשפחתי כדי לטוות נרטיב משפחתי רחב, סוחף, מרגש ומדויק מבחינה היסטורית.

${sections.join('\n\n')}
`;
  };

  // Format events to a readable prompt string
  const formatEventsSummary = (): string => {
    let summary = '';
    if (!events || events.length === 0) {
      summary = 'אין מידע על אירועים.';
    } else if (type === 'person') {
      summary = events
        .map((e) => {
          const dateStr = e.date ? `בתאריך ${e.date}` : '';
          const placeStr = e.place ? `ב${e.place}` : '';
          return `- אירוע מסוג: ${e.eventType} ${dateStr} ${placeStr}`;
        })
        .join('\n');
    } else {
      // It's a place
      summary = events
        .map((e) => {
          const dateStr = e.date ? `בתאריך ${e.date}` : '';
          return `- אירוע מסוג: ${e.eventType} עבור ${e.personName} ${dateStr}`;
        })
        .join('\n');
    }

    // Append rich family data to the prompt for people
    if (type === 'person') {
      summary += getFamilyEventsText();
    }

    return summary;
  };

  const handleFetchContext = async () => {
    setLoading(true);
    setError(null);
    setContextText(null);
    setChatHistory([]);
    try {
      const summary = formatEventsSummary();
      const text = await generateHistoricalContext(name, type, summary);
      setContextText(text);
      setIsActive(true);
    } catch (err) {
      console.error(err);
      setError('חלה שגיאה בחיבור ל-Gemini. אנא ודא שמפתח ה-API מוגדר כראוי.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || sendingChat || !contextText) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setSendingChat(true);

    // Optimistically add user message
    const updatedHistory = [...chatHistory, { role: 'user' as const, text: userMessage }];
    setChatHistory(updatedHistory);

    try {
      const summary = formatEventsSummary();
      const response = await chatHistoricalContext(name, type, summary, chatHistory, userMessage);
      setChatHistory([...updatedHistory, { role: 'model' as const, text: response }]);
    } catch (err) {
      console.error(err);
      setChatHistory([
        ...updatedHistory,
        { role: 'model' as const, text: 'שגיאה בחיבור לשרת לצורך קבלת מענה שאלת המשך.' }
      ]);
    } finally {
      setSendingChat(false);
    }
  };

  const handleCopy = () => {
    if (!contextText) return;
    navigator.clipboard.writeText(contextText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setContextText(null);
    setChatHistory([]);
    setIsActive(false);
    setError(null);
    setIsModalOpen(false);
  };

  // Helper to render bold text and headings from markdown
  const parseInlineBold = (text: string) => {
    const parts = text.split('**');
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="text-teal-200 font-bold bg-teal-500/10 px-1 py-0.5 rounded">
          {part}
        </strong>
      ) : (
        part
      )
    );
  };

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={idx} className="text-md font-bold text-indigo-300 mt-4 mb-2 flex items-center border-r-2 border-indigo-400 pr-2">
            {trimmed.replace('### ', '')}
          </h4>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h3 key={idx} className="text-lg font-bold text-indigo-400 mt-5 mb-2.5 pb-1 border-b border-gray-700/60">
            {trimmed.replace('## ', '')}
          </h3>
        );
      }
      if (trimmed.startsWith('# ')) {
        return (
          <h2 key={idx} className="text-xl font-extrabold text-white mt-6 mb-4">
            {trimmed.replace('# ', '')}
          </h2>
        );
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const content = trimmed.substring(2);
        return (
          <li key={idx} className="list-disc list-inside text-sm text-gray-300 my-1.5 pr-2 leading-relaxed text-right list-none">
            <span className="text-indigo-400 ml-1.5">•</span>
            {parseInlineBold(content)}
          </li>
        );
      }
      if (trimmed === '') {
        return <div key={idx} className="h-3" />;
      }
      return (
        <p key={idx} className="text-sm text-gray-300 leading-relaxed my-2.5 text-justify">
          {parseInlineBold(trimmed)}
        </p>
      );
    });
  };

  return (
    <div className="mt-6 border-t border-gray-700/60 pt-6" id={`historical-context-${type}-${name.replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400 flex items-center uppercase tracking-wider">
          <Brain className="h-4.5 w-4.5 text-indigo-400 mr-2" />
          הקשר היסטורי משפחתי מבוסס AI
        </h3>
        {isActive && (
          <button
            onClick={handleReset}
            className="text-xs text-gray-400 hover:text-indigo-300 transition-colors flex items-center"
            title="אפס מחקר היסטורי"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            אפס
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!isActive && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-xl"
          >
            <p className="text-xs text-indigo-200/80 mb-4 leading-relaxed">
              רוצה לדעת מה קרה בעולם ובסביבה שבה {type === 'person' ? 'האדם חי ופעל' : 'אירועים אלו התרחשו'}? לחץ לקבלת ניתוח חכם של הרקע ההיסטורי, תנאי המחיה וחיי היום-יום באותם שנים.
            </p>
            <button
              onClick={handleFetchContext}
              className="w-full flex items-center justify-center p-3 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-indigo-500/20 active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4 mr-2 text-yellow-300 animate-pulse" />
              חקר רקע היסטורי מבוסס AI
            </button>
          </motion.div>
        )}

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-8 bg-gray-800/40 rounded-xl flex flex-col items-center justify-center text-center space-y-4 border border-gray-700/30"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse" />
              <Loader2 className="h-10 w-10 text-indigo-400 animate-spin relative" />
            </div>
            <p className="text-sm font-medium text-indigo-100 animate-pulse duration-1000">
              {loadingMessages[loadingMessageIdx]}
            </p>
            <span className="text-[11px] text-gray-500">עשוי לקחת מספר שניות...</span>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-red-950/20 border border-red-900/30 text-red-200 rounded-xl text-xs"
          >
            {error}
            <button
              onClick={handleFetchContext}
              className="mt-3 block w-full py-1.5 bg-red-900/40 hover:bg-red-800/50 rounded text-center font-semibold transition-colors"
            >
              נסה שוב
            </button>
          </motion.div>
        )}

        {isActive && contextText && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            {/* The generated text container */}
            <div className="p-4 bg-gray-800/70 border border-gray-700/50 rounded-xl max-h-[350px] overflow-y-auto custom-scrollbar shadow-inner relative text-right" dir="rtl">
              <div className="sticky top-0 float-left z-10 flex space-x-1">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="p-1.5 bg-gray-700/80 hover:bg-indigo-600 rounded-md text-gray-300 hover:text-white transition-colors"
                  title="פתח לקריאה מורחבת"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <button
                  onClick={handleCopy}
                  className="p-1.5 bg-gray-700/80 hover:bg-indigo-600 rounded-md text-gray-300 hover:text-white transition-colors"
                  title="העתק סקירה היסטורית"
                >
                  {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <div className="prose prose-invert prose-sm">
                {renderMarkdown(contextText)}
              </div>
            </div>

            {/* Q&A Interactive Chat Section */}
            <div className="p-4 bg-gray-800/30 border border-gray-700/20 rounded-xl space-y-3">
              <h4 className="text-xs font-semibold text-indigo-300 flex items-center">
                <HelpCircle className="h-4 w-4 mr-1 text-indigo-400" />
                יש לך שאלות נוספות על התקופה? שאל את ה-AI:
              </h4>

              {/* Chat timeline if any */}
              {chatHistory.length > 0 && (
                <div className="space-y-2 max-h-[200px] overflow-y-auto p-2 bg-gray-900/30 rounded-lg text-xs" dir="rtl">
                  {chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg max-w-[85%] ${
                        msg.role === 'user'
                          ? 'bg-indigo-600/30 text-indigo-100 mr-auto text-left rounded-bl-none'
                          : 'bg-gray-800 text-gray-200 ml-auto text-right rounded-br-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    </div>
                  ))}
                  {sendingChat && (
                    <div className="bg-gray-800 text-gray-400 p-2.5 rounded-lg max-w-[85%] ml-auto text-right rounded-br-none flex items-center space-x-2">
                      <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                      <span>Gemini חושב...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Input field */}
              <form onSubmit={handleSendChat} className="flex gap-2" dir="rtl">
                <input
                  type="text"
                  placeholder="האם היו אירועים מיוחדים באזור באותו עשור?"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={sendingChat}
                  className="flex-1 bg-gray-700/60 border border-gray-600/50 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || sendingChat}
                  className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Send className="h-4.5 w-4.5 -rotate-90" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen Spacious Modal Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6 md:p-10" dir="rtl">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-gray-950/80 backdrop-blur-md"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative bg-gray-900 border border-gray-700/80 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden text-right"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50 backdrop-blur-sm flex-shrink-0">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <Brain className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      מחקר רקע היסטורי והקשר משפחתי
                    </h3>
                    <p className="text-xs text-indigo-300">
                      עבור {type === 'person' ? 'האדם' : 'המיקום'}: <span className="font-semibold text-white">{name}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <button
                    onClick={handleCopy}
                    className="flex items-center space-x-1.5 space-x-reverse px-3 py-1.5 bg-gray-800 hover:bg-indigo-600 rounded-lg text-xs text-gray-200 transition-colors"
                    title="העתק את כל הסקירה"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-400" />
                        <span>הועתק!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>העתק סקירה (לוורד)</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-1.5 bg-gray-800 hover:bg-red-500 hover:text-white rounded-lg text-gray-400 transition-colors"
                    title="סגור"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0 bg-gray-950/20">
                {/* Main historical context reader */}
                <div className="flex-grow p-6 overflow-y-auto custom-scrollbar border-l border-gray-800/40">
                  <div className="prose prose-invert max-w-none text-right">
                    {renderMarkdown(contextText)}
                  </div>
                </div>

                {/* Chat Panel inside modal */}
                <div className="w-full md:w-[360px] bg-gray-900/40 p-5 flex flex-col h-full border-t md:border-t-0 border-gray-800 flex-shrink-0">
                  <div className="flex items-center space-x-2 space-x-reverse mb-3 flex-shrink-0">
                    <HelpCircle className="h-4.5 w-4.5 text-indigo-400" />
                    <h4 className="text-xs font-bold text-indigo-200">
                      שאלות ותשובות עם Gemini
                    </h4>
                  </div>
                  
                  {/* Chat timeline inside modal */}
                  <div className="flex-grow overflow-y-auto p-3 bg-gray-950/40 rounded-xl mb-3 space-y-3 text-xs custom-scrollbar">
                    {chatHistory.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-4 space-y-2">
                        <Sparkles className="h-6 w-6 text-indigo-500/50 animate-pulse" />
                        <p>רוצה להעמיק בפרטים מסוימים?</p>
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                          למשל: "האם היו אירועים היסטוריים מיוחדים באזור באותה תקופה?" או "תאר את תנאי המחיה והפרנסה של המשפחה."
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {chatHistory.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl max-w-[90%] leading-relaxed ${
                              msg.role === 'user'
                                ? 'bg-indigo-600/30 text-indigo-100 mr-auto text-left rounded-bl-none border border-indigo-500/10'
                                : 'bg-gray-800 text-gray-200 ml-auto text-right rounded-br-none border border-gray-700/20'
                            }`}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                          </div>
                        ))}
                        {sendingChat && (
                          <div className="bg-gray-800 text-gray-400 p-3 rounded-xl max-w-[90%] ml-auto text-right rounded-br-none flex items-center space-x-2">
                            <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                            <span>Gemini חוקר...</span>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Input field inside modal */}
                  <form onSubmit={handleSendChat} className="flex gap-2 flex-shrink-0" dir="rtl">
                    <input
                      type="text"
                      placeholder="שאל שאלה נוספת..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={sendingChat}
                      className="flex-1 bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || sendingChat}
                      className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
                    >
                      <Send className="h-4.5 w-4.5 -rotate-90" />
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
