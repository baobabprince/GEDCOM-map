import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Sparkles, Send, Copy, Check, RotateCcw, HelpCircle, Loader2, Maximize2, X } from 'lucide-react';
import { generateHistoricalContext, chatHistoricalContext } from '../services/geminiService.ts';
import { useLanguage, formatEventType } from '../services/i18n.ts';
import { formatDate } from '../services/utils.ts';
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
  const { lang, isRTL } = useLanguage();
  const isHe = lang === 'he';

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

  const loadingMessages = isHe
    ? [
        'מתחבר לארכיונים הדיגיטליים...',
        'מנתח את השנים והעשורים הרלוונטיים...',
        'חוקר אירועים היסטוריים ומלחמות באותה תקופה...',
        'ממפה את תנאי המחיה וחיי היומיום של האוכלוסייה...',
        'רוקם עבורך רקע היסטורי עשיר ומותאם אישית...'
      ]
    : [
        'Connecting to digital historical archives...',
        'Analyzing relevant years and decades...',
        'Researching historical events and social context...',
        'Mapping living conditions and everyday life...',
        'Weaving a personalized historical overview...'
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
  }, [loading, loadingMessages.length]);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, sendingChat]);

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
          const evLabel = formatEventType(e.eventType, lang);
          const dateFormatted = e.date ? formatDate(e.date, lang) : '';
          if (isHe) {
            const dateStr = dateFormatted ? `בתאריך ${dateFormatted}` : '';
            const placeStr = e.place ? `ב${e.place}` : '';
            return `    - אירוע ${evLabel} ${dateStr} ${placeStr}`;
          } else {
            const dateStr = dateFormatted ? `on ${dateFormatted}` : '';
            const placeStr = e.place ? `in ${e.place}` : '';
            return `    - ${evLabel} ${dateStr} ${placeStr}`;
          }
        })
        .join('\n');
      return `* ${relationType}: ${mName}\n${eventsStr}`;
    };

    if (person.spouses && person.spouses.length > 0) {
      for (const sp of person.spouses) {
        const found = allPersons.find(p => p.id === sp.id);
        spouseText.push(formatMemberEvents(sp.name, isHe ? 'בן/בת זוג' : 'Spouse', found ? found.events : []));
      }
    }

    if (person.children && person.children.length > 0) {
      for (const ch of person.children) {
        const found = allPersons.find(p => p.id === ch.id);
        childrenText.push(formatMemberEvents(ch.name, isHe ? 'ילד/ה' : 'Child', found ? found.events : []));
      }
    }

    if (person.parents && person.parents.length > 0) {
      for (const pa of person.parents) {
        const found = allPersons.find(p => p.id === pa.id);
        parentsText.push(formatMemberEvents(pa.name, isHe ? 'הורה' : 'Parent', found ? found.events : []));
      }
    }

    const sections = [];
    if (spouseText.length > 0) sections.push(`${isHe ? 'פרטי בני זוג' : 'Spouses'}:\n${spouseText.join('\n')}`);
    if (childrenText.length > 0) sections.push(`${isHe ? 'פרטי ילדים' : 'Children'}:\n${childrenText.join('\n')}`);
    if (parentsText.length > 0) sections.push(`${isHe ? 'פרטי הורים' : 'Parents'}:\n${parentsText.join('\n')}`);

    if (sections.length === 0) return '';
    return isHe
      ? `\n\n--- מידע גנאלוגי מורחב על בני המשפחה הקרובים ואירועי חייהם המקוריים ---\nאנא הצלב היטב בין תאריכי ומיקומי אירועי החיים של הדמות המרכזית (${name}) לבין אירועי חייהם של בני משפחתו אלו.\n\n${sections.join('\n\n')}\n`
      : `\n\n--- Extended Genealogical Context on Immediate Family Members ---\nPlease cross-reference the life events and locations of ${name} with those of their immediate family members below to weave a cohesive family narrative.\n\n${sections.join('\n\n')}\n`;
  };

  // Format events to a readable prompt string
  const formatEventsSummary = (): string => {
    let summary = '';
    if (!events || events.length === 0) {
      summary = isHe ? 'אין מידע על אירועים.' : 'No event records available.';
    } else if (type === 'person') {
      summary = events
        .map((e) => {
          const evLabel = formatEventType(e.eventType, lang);
          const dateFormatted = e.date ? formatDate(e.date, lang) : '';
          if (isHe) {
            const dateStr = dateFormatted ? `בתאריך ${dateFormatted}` : '';
            const placeStr = e.place ? `ב${e.place}` : '';
            return `- אירוע מסוג: ${evLabel} ${dateStr} ${placeStr}`;
          } else {
            const dateStr = dateFormatted ? `on ${dateFormatted}` : '';
            const placeStr = e.place ? `in ${e.place}` : '';
            return `- Event: ${evLabel} ${dateStr} ${placeStr}`;
          }
        })
        .join('\n');
    } else {
      // It's a place
      summary = events
        .map((e) => {
          const evLabel = formatEventType(e.eventType, lang);
          const dateFormatted = e.date ? formatDate(e.date, lang) : '';
          if (isHe) {
            const dateStr = dateFormatted ? `בתאריך ${dateFormatted}` : '';
            return `- אירוע מסוג: ${evLabel} עבור ${e.personName} ${dateStr}`;
          } else {
            const dateStr = dateFormatted ? `on ${dateFormatted}` : '';
            return `- Event: ${evLabel} for ${e.personName} ${dateStr}`;
          }
        })
        .join('\n');
    }

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
      const text = await generateHistoricalContext(name, type, summary, lang);
      setContextText(text);
      setIsActive(true);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : isHe
            ? 'חלה שגיאה בחיבור לשרת. אנא נסה שוב.'
            : 'Failed to connect to the server. Please try again.'
      );
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
      const response = await chatHistoricalContext(name, type, summary, chatHistory, userMessage, lang);
      setChatHistory([...updatedHistory, { role: 'model' as const, text: response }]);
    } catch (err) {
      console.error(err);
      setChatHistory([
        ...updatedHistory,
        {
          role: 'model' as const,
          text: isHe
            ? 'שגיאה בחיבור לשרת לצורך קבלת מענה לשאלת המשך.'
            : 'Error connecting to the server for follow-up question.'
        }
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
          <h4 key={idx} className="text-md font-bold text-indigo-300 mt-4 mb-2 flex items-center">
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
          <li key={idx} className={`text-sm text-gray-300 my-1.5 leading-relaxed list-none ${isRTL ? 'pr-2 text-right' : 'pl-2 text-left'}`}>
            <span className="text-indigo-400 mx-1.5">•</span>
            {parseInlineBold(content)}
          </li>
        );
      }
      if (trimmed === '') {
        return <div key={idx} className="h-3" />;
      }
      return (
        <p key={idx} className="text-sm text-gray-300 leading-relaxed my-2.5">
          {parseInlineBold(trimmed)}
        </p>
      );
    });
  };

  return (
    <div className="mt-6 border-t border-gray-700/60 pt-6" id={`historical-context-${type}-${name.replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Brain className="h-4.5 w-4.5 text-indigo-400 flex-shrink-0" />
          <span>{isHe ? 'הקשר היסטורי משפחתי' : 'Historical Family Context'}</span>
        </h3>
        {isActive && (
          <button
            onClick={handleReset}
            className="text-xs text-gray-400 hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer"
            title={isHe ? 'אפס מחקר היסטורי' : 'Reset historical overview'}
          >
            <RotateCcw className="h-3 w-3" />
            <span>{isHe ? 'אפס' : 'Reset'}</span>
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
              {isHe
                ? `רוצה לדעת מה קרה בעולם ובסביבה שבה ${type === 'person' ? 'האדם חי ופעל' : 'אירועים אלו התרחשו'}? לחץ לקבלת סקירה של הרקע ההיסטורי, תנאי המחיה וחיי היום-יום באותן שנים.`
                : `Curious about what happened in the world and region where ${type === 'person' ? 'this person lived' : 'these events took place'}? Generate a historical overview of daily life and events during those years.`}
            </p>
            <button
              onClick={handleFetchContext}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-indigo-500/20 active:scale-[0.98] cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" />
              <span>{isHe ? 'הפק סקירה היסטורית' : 'Explore Historical Context'}</span>
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
            <span className="text-[11px] text-gray-500">
              {isHe ? 'עשוי לקחת מספר שניות...' : 'This may take a few seconds...'}
            </span>
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
              className="mt-3 block w-full py-1.5 bg-red-900/40 hover:bg-red-800/50 rounded text-center font-semibold transition-colors cursor-pointer"
            >
              {isHe ? 'נסה שוב' : 'Try Again'}
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
            <div
              className={`p-4 bg-gray-800/70 border border-gray-700/50 rounded-xl max-h-[350px] overflow-y-auto custom-scrollbar shadow-inner relative ${isRTL ? 'text-right' : 'text-left'}`}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div className={`sticky top-0 ${isRTL ? 'float-left' : 'float-right'} z-10 flex gap-1`}>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="p-1.5 bg-gray-700/80 hover:bg-indigo-600 rounded-md text-gray-300 hover:text-white transition-colors cursor-pointer"
                  title={isHe ? 'פתח לקריאה מורחבת' : 'Expand view'}
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <button
                  onClick={handleCopy}
                  className="p-1.5 bg-gray-700/80 hover:bg-indigo-600 rounded-md text-gray-300 hover:text-white transition-colors cursor-pointer"
                  title={isHe ? 'העתק סקירה היסטורית' : 'Copy historical overview'}
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
              <h4 className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                <span>
                  {isHe ? 'יש לך שאלות נוספות על התקופה?' : 'Have follow-up questions about this era?'}
                </span>
              </h4>

              {/* Chat timeline if any */}
              {chatHistory.length > 0 && (
                <div className="space-y-2 max-h-[200px] overflow-y-auto p-2 bg-gray-900/30 rounded-lg text-xs" dir={isRTL ? 'rtl' : 'ltr'}>
                  {chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg max-w-[85%] ${
                        msg.role === 'user'
                          ? 'bg-indigo-600/30 text-indigo-100 rounded-bl-none'
                          : 'bg-gray-800 text-gray-200 rounded-br-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    </div>
                  ))}
                  {sendingChat && (
                    <div className="bg-gray-800 text-gray-400 p-2.5 rounded-lg max-w-[85%] flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                      <span>{isHe ? 'מחפש תשובה...' : 'Researching...'}</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Input field */}
              <form onSubmit={handleSendChat} className="flex gap-2" dir={isRTL ? 'rtl' : 'ltr'}>
                <input
                  type="text"
                  placeholder={isHe ? 'האם היו אירועים מיוחדים באזור באותו עשור?' : 'Were there notable events in the region during that decade?'}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={sendingChat}
                  className="flex-1 bg-gray-700/60 border border-gray-600/50 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || sendingChat}
                  className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                >
                  <Send className={`h-4.5 w-4.5 ${isRTL ? '-rotate-90' : ''}`} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen Spacious Modal Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6 md:p-10" dir={isRTL ? 'rtl' : 'ltr'}>
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
              className={`relative bg-gray-900 border border-gray-700/80 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50 backdrop-blur-sm flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <Brain className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {isHe ? 'מחקר רקע היסטורי והקשר משפחתי' : 'Historical Background & Family Context'}
                    </h3>
                    <p className="text-xs text-indigo-300">
                      {isHe
                        ? `עבור ${type === 'person' ? 'האדם' : 'המיקום'}: `
                        : `For ${type === 'person' ? 'Person' : 'Location'}: `}
                      <span className="font-semibold text-white">{name}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-indigo-600 rounded-lg text-xs text-gray-200 transition-colors cursor-pointer"
                    title={isHe ? 'העתק את כל הסקירה' : 'Copy full overview'}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-400" />
                        <span>{isHe ? 'הועתק!' : 'Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>{isHe ? 'העתק סקירה' : 'Copy Overview'}</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-1.5 bg-gray-800 hover:bg-red-500 hover:text-white rounded-lg text-gray-400 transition-colors cursor-pointer"
                    title={isHe ? 'סגור' : 'Close'}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0 bg-gray-950/20">
                {/* Main historical context reader */}
                <div className={`flex-grow p-6 overflow-y-auto custom-scrollbar ${isRTL ? 'border-l' : 'border-r'} border-gray-800/40`}>
                  <div className={`prose prose-invert max-w-none ${isRTL ? 'text-right' : 'text-left'}`}>
                    {renderMarkdown(contextText)}
                  </div>
                </div>

                {/* Chat Panel inside modal */}
                <div className="w-full md:w-[360px] bg-gray-900/40 p-5 flex flex-col h-full border-t md:border-t-0 border-gray-800 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                    <HelpCircle className="h-4.5 w-4.5 text-indigo-400" />
                    <h4 className="text-xs font-bold text-indigo-200">
                      {isHe ? 'שאלות ותשובות על התקופה' : 'Questions & Answers'}
                    </h4>
                  </div>
                  
                  {/* Chat timeline inside modal */}
                  <div className="flex-grow overflow-y-auto p-3 bg-gray-950/40 rounded-xl mb-3 space-y-3 text-xs custom-scrollbar">
                    {chatHistory.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-4 space-y-2">
                        <Sparkles className="h-6 w-6 text-indigo-500/50 animate-pulse" />
                        <p>{isHe ? 'רוצה להעמיק בפרטים מסוימים?' : 'Want to dive deeper into specific details?'}</p>
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                          {isHe
                            ? 'למשל: "האם היו אירועים היסטוריים מיוחדים באזור באותה תקופה?" או "תאר את תנאי המחיה והפרנסה של המשפחה."'
                            : 'E.g.: "Were there major historical events in the region at the time?" or "Describe daily life and livelihoods."'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {chatHistory.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl max-w-[90%] leading-relaxed ${
                              msg.role === 'user'
                                ? 'bg-indigo-600/30 text-indigo-100 rounded-bl-none border border-indigo-500/10'
                                : 'bg-gray-800 text-gray-200 rounded-br-none border border-gray-700/20'
                            }`}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                          </div>
                        ))}
                        {sendingChat && (
                          <div className="bg-gray-800 text-gray-400 p-3 rounded-xl max-w-[90%] flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                            <span>{isHe ? 'חוקר...' : 'Researching...'}</span>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Input field inside modal */}
                  <form onSubmit={handleSendChat} className="flex gap-2 flex-shrink-0" dir={isRTL ? 'rtl' : 'ltr'}>
                    <input
                      type="text"
                      placeholder={isHe ? 'שאל שאלה נוספת...' : 'Ask a follow-up question...'}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={sendingChat}
                      className="flex-1 bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || sendingChat}
                      className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 cursor-pointer"
                    >
                      <Send className={`h-4.5 w-4.5 ${isRTL ? '-rotate-90' : ''}`} />
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
