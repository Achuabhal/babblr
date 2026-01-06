import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { Conversation, Message, Correction } from '../types';
import { conversationService, chatService, speechService } from '../services/api';
import AudioRecorder from './AudioRecorder';
import MessageBubble from './MessageBubble';
import { TTSControls } from './TTSControls';
import { useTTS } from '../hooks/useTTS';
import './ConversationInterface.css';

interface ConversationInterfaceProps {
  conversation: Conversation;
  onBack: () => void;
}

const ConversationInterface: React.FC<ConversationInterfaceProps> = ({
  conversation,
  onBack,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { speak, stop, pause, resume, isSpeaking, isPaused, supported, voices, lastError } =
    useTTS();

  const [activeMessageId, setActiveMessageId] = useState<number | null>(null);
  const [lastAutoPlayedAssistantId, setLastAutoPlayedAssistantId] = useState<number | null>(null);

  const rateStorageKey = 'babblr.tts.rate';
  const autoPlayStorageKey = 'babblr.tts.autoPlay';
  const voiceStorageKey = useMemo(
    () => `babblr.tts.voice.${conversation.language.toLowerCase()}`,
    [conversation.language]
  );

  const [ttsRate, setTtsRate] = useState<number>(() => {
    if (typeof window === 'undefined') return 1.0;
    const stored = window.localStorage.getItem(rateStorageKey);
    const value = stored ? Number(stored) : 1.0;
    return Number.isFinite(value) ? value : 1.0;
  });
  const [ttsAutoPlay, setTtsAutoPlay] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(autoPlayStorageKey) === 'true';
  });
  const [ttsVoiceURI, setTtsVoiceURI] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(voiceStorageKey);
  });

  useEffect(() => {
    loadMessages();
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load voice preference per language (rate/autoplay are global).
    if (typeof window === 'undefined') return;
    setTtsVoiceURI(window.localStorage.getItem(voiceStorageKey));
  }, [voiceStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(rateStorageKey, String(ttsRate));
  }, [ttsRate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(autoPlayStorageKey, String(ttsAutoPlay));
  }, [ttsAutoPlay]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (ttsVoiceURI) {
      window.localStorage.setItem(voiceStorageKey, ttsVoiceURI);
    } else {
      window.localStorage.removeItem(voiceStorageKey);
    }
  }, [ttsVoiceURI, voiceStorageKey]);

  useEffect(() => {
    // Auto-play the newest assistant message (optional setting).
    if (!supported || !ttsAutoPlay) return;
    if (isSpeaking) return;

    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant) return;

    if (lastAutoPlayedAssistantId !== null && lastAssistant.id <= lastAutoPlayedAssistantId) {
      return;
    }

    setActiveMessageId(lastAssistant.id);
    speak(lastAssistant.content, {
      language: conversation.language,
      rate: ttsRate,
      autoPlay: ttsAutoPlay,
      voiceURI: ttsVoiceURI ?? undefined,
    });
    setLastAutoPlayedAssistantId(lastAssistant.id);
  }, [
    messages,
    supported,
    ttsAutoPlay,
    ttsRate,
    ttsVoiceURI,
    conversation.language,
    speak,
    isSpeaking,
    lastAutoPlayedAssistantId,
  ]);

  useEffect(() => {
    if (!isSpeaking) {
      setActiveMessageId(null);
    }
  }, [isSpeaking]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const msgs = await conversationService.getMessages(conversation.id);
      setMessages(msgs);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    setIsLoading(true);
    setCorrections([]);

    try {
      const response = await chatService.sendMessage(
        conversation.id,
        text,
        conversation.language,
        conversation.difficulty_level
      );

      if (response.corrections && response.corrections.length > 0) {
        setCorrections(response.corrections);
      }

      // Reload messages to get the updated conversation
      await loadMessages();

      setInputText('');
    } catch (error) {
      // Error is already handled by errorHandler in api.ts
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceRecording = async (audioBlob: Blob) => {
    console.log('[Conversation] Processing voice recording from AudioRecorder component');
    setIsLoading(true);
    try {
      const transcription = await speechService.transcribe(
        audioBlob,
        conversation.id,
        conversation.language
      );

      // Use the transcribed text
      await handleSendMessage(transcription.text);
    } catch (error) {
      // Error is already handled by errorHandler in api.ts
      console.error('Failed to process voice recording:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="conversation-interface">
      <div className="conversation-header">
        <div className="conversation-header-left">
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
          <div className="conversation-info">
            <h2>{conversation.language}</h2>
            <span className="difficulty-badge">{conversation.difficulty_level}</span>
          </div>
        </div>

        <div className="conversation-header-right">
          <TTSControls
            language={conversation.language}
            supported={supported}
            voices={voices}
            selectedVoiceURI={ttsVoiceURI}
            rate={ttsRate}
            autoPlay={ttsAutoPlay}
            isSpeaking={isSpeaking}
            isPaused={isPaused}
            lastError={lastError}
            onSelectVoiceURI={setTtsVoiceURI}
            onRateChange={setTtsRate}
            onAutoPlayChange={setTtsAutoPlay}
            onPause={pause}
            onResume={resume}
            onStop={stop}
          />
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>👋 Start your conversation!</p>
            <p>Try introducing yourself or asking a question.</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              ttsSupported={supported}
              isSpeaking={isSpeaking}
              isActive={activeMessageId === message.id}
              onPlay={(textToSpeak) => {
                setActiveMessageId(message.id);
                speak(textToSpeak, {
                  language: conversation.language,
                  rate: ttsRate,
                  autoPlay: ttsAutoPlay,
                  voiceURI: ttsVoiceURI ?? undefined,
                });
              }}
            />
          ))
        )}
        {isLoading && (
          <div className="message assistant">
            <div className="message-content loading">
              <span className="dot">.</span>
              <span className="dot">.</span>
              <span className="dot">.</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {corrections.length > 0 && (
        <div className="corrections-panel">
          <h4>💡 Helpful Corrections</h4>
          {corrections.map((correction, index) => (
            <div key={index} className="correction-item">
              <div className="correction-type">{correction.type}</div>
              <div className="correction-text">
                <span className="original">{correction.original}</span>
                <span className="arrow">→</span>
                <span className="corrected">{correction.corrected}</span>
              </div>
              <div className="correction-explanation">{correction.explanation}</div>
            </div>
          ))}
        </div>
      )}

      <div className="input-container">
        <AudioRecorder
          onSubmit={handleVoiceRecording}
          disabled={isLoading}
        />
        
        <input
          type="text"
          className="message-input"
          placeholder="Type your message or use voice..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(inputText);
            }
          }}
          disabled={isLoading}
        />
        
        <button
          className="send-button"
          onClick={() => handleSendMessage(inputText)}
          disabled={!inputText.trim() || isLoading}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ConversationInterface;
