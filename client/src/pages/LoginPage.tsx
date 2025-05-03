import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Leaf, LogIn, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [isInputEmpty, setIsInputEmpty] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, login, error, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isLoginRoute] = useRoute('/auth');

  // If already logged in, redirect to home
  useEffect(() => {
    if (isAuthenticated) {
      // Use setTimeout to ensure the navigation happens after auth state is fully processed
      setTimeout(() => {
        navigate('/');
      }, 100);
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter a username to continue",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await login(username.trim());
      toast({
        title: "Login successful",
        description: `Welcome to FloraChat, ${username}!`,
      });
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-green-50 p-4">
      <div className="w-full max-w-lg">
        <Card className="bg-white/80 backdrop-blur-sm border-green-100">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Leaf className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-heading font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent">
              FloraChat
            </CardTitle>
            <CardDescription className="text-slate-600">
              Enter a username to explore the world of plants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setIsInputEmpty(e.target.value.trim() === '');
                  }}
                  className="bg-white/90 border-green-200 focus:border-green-400 focus:ring-green-400"
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white"
                disabled={isInputEmpty || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Continue
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center text-sm text-slate-500">
            <p>
              FloraChat by Synaptide AI
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}