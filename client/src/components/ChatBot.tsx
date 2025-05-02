
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Leaf, Upload, Camera } from "lucide-react";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatBotProps {
  uploadedImage: string | null;
  identificationResults: any | null;
}

export default function ChatBot({ uploadedImage, identificationResults }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isWelcomeMessageSent, setIsWelcomeMessageSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to the bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Send welcome message when component mounts
  useEffect(() => {
    if (!isWelcomeMessageSent) {
      setMessages([{ 
        role: 'assistant', 
        content: 'Hello! I\'m FloraChat, your plant assistant from Synaptide AI. I\'m specially designed for plant lovers and gardening enthusiasts! Upload or capture a plant image, and I\'ll help identify it using advanced image recognition. Ask me anything about plants, gardening tips, or plant care advice!' 
      }]);
      setIsWelcomeMessageSent(true);
    }
  }, [isWelcomeMessageSent]);
  
  // Send automatic identification summary when results are received
  useEffect(() => {
    if (identificationResults && messages.length > 0) {
      const hasIdentificationMessage = messages.some(msg => 
        msg.role === 'assistant' && 
        msg.content.includes(`identified as ${identificationResults.scientificName}`)
      );
      
      if (!hasIdentificationMessage) {
        sendIdentificationSummary();
      }
    }
  }, [identificationResults]);
  
  const sendIdentificationSummary = async () => {
    if (!identificationResults) return;
    
    setIsLoading(true);
    
    try {
      const context = {
        hasImage: true,
        hasResults: true,
        plantDetails: {
          name: identificationResults.scientificName,
          commonName: identificationResults.commonName,
        }
      };
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Please provide a structured plant identification summary for ${identificationResults.scientificName} (${identificationResults.commonName}) with identifying features, habitat, and important notes following the exact template format.`,
          context,
          conversation: messages
        }),
      });
      
      const data = await response.json();
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.message 
      }]);
    } catch (error) {
      console.error('Error sending identification summary:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I've identified this plant as ${identificationResults.scientificName} (${identificationResults.commonName}). Do you have any questions about this plant?` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const context = {
        hasImage: !!uploadedImage,
        hasResults: !!identificationResults,
        plantDetails: identificationResults ? {
          name: identificationResults.scientificName,
          commonName: identificationResults.commonName,
        } : null
      };

      // Get the updated messages array that includes the new user message
      const updatedMessages = [...messages, { role: 'user', content: userMessage }];
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          context,
          conversation: updatedMessages
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center">
          <div className="bg-gradient-to-br from-green-100 to-green-200 p-2 rounded-full mr-3">
            <Leaf className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex flex-col">
            <span className="bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">FloraChat Assistant</span>
            <span className="text-xs text-gray-500 -mt-1">for plant lovers & gardeners</span>
          </div>
        </CardTitle>
        <CardDescription>
          {!uploadedImage ? (
            <div className="flex items-center text-muted-foreground">
              <Upload className="h-4 w-4 mr-1" /> 
              <Camera className="h-4 w-4 mx-1" />
              <span>Upload or capture a plant image for identification</span>
            </div>
          ) : identificationResults ? (
            <div className="text-primary font-medium">
              Identified: {identificationResults.scientificName} ({identificationResults.commonName})
            </div>
          ) : (
            <div className="text-amber-500 flex items-center">
              <span className="animate-pulse mr-1">•</span>
              Processing your plant image...
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="h-[300px] overflow-y-auto space-y-4 mb-4 p-3 rounded-md border border-green-100 bg-white/70 backdrop-blur-md shadow-inner">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-sm'
                      : 'bg-gradient-to-r from-green-50 to-green-100 border border-green-100 shadow-sm'
                  }`}
                >
                  {message.role === 'assistant' 
                    ? message.content.split('\n').map((line, i) => {
                        // Check if the line starts with a bullet point or is a section header
                        const isBulletPoint = line.trim().startsWith('•');
                        
                        // Improved header detection - look for exact headers we expect
                        const knownHeaders = ['Identifying Features:', 'Habitat:', 'Important Notes:'];
                        const isHeader = knownHeaders.includes(line.trim()) || 
                                        (line.trim().endsWith(':') && line.trim().length > 0 && !isBulletPoint);
                        
                        // First line is usually the plant name intro
                        const isIntro = i === 0 && line.includes('appears to be');
                        
                        return (
                          <div key={i} className={`
                            ${i > 0 ? 'mt-2' : ''} 
                            ${isHeader ? 'font-bold text-lg mt-4 mb-2 text-green-700 bg-green-50 py-1 px-2 rounded-md inline-block' : ''}
                            ${isIntro ? 'font-medium mb-3 text-green-800' : ''}
                          `}>
                            {line.trim() === '' ? <br /> : (
                              isBulletPoint ? 
                                <span className="block pl-3 border-l-2 border-green-400 ml-2 py-1 bg-green-50/50 rounded-r-md">{line}</span> : 
                                line
                            )}
                          </div>
                        );
                      })
                    : message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gradient-to-r from-green-50 to-green-100 border border-green-100 shadow-sm">
                  <div className="flex items-center">
                    <div className="animate-pulse mr-2 h-4 w-4 rounded-full bg-green-400"></div>
                    <span>Thinking about plants...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me about plants..."
              className="resize-none bg-white/80 backdrop-blur-md border-green-100 focus-visible:ring-green-400 focus-visible:border-green-300 placeholder:text-green-700/60"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="shrink-0 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400"
              variant="default"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
