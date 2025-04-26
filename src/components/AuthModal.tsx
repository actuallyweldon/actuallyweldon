import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { getAuthPreferences, saveAuthPreferences } from '@/utils/localStorage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, name: string) => Promise<void>;
}

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSignIn,
  onSignUp,
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const prefs = getAuthPreferences();
      if (!prefs.hasVisited) {
        setIsLogin(false);
        saveAuthPreferences({ hasVisited: true, preferredAuthMode: 'signup' });
      } else if (prefs.preferredAuthMode) {
        setIsLogin(prefs.preferredAuthMode === 'login');
      }
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !name)) {
      console.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        await onSignIn(email, password);
      } else {
        await onSignUp(email, password, name);
      }
      onClose();
      setEmail('');
      setPassword('');
      setName('');
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    saveAuthPreferences({ 
      hasVisited: true, 
      preferredAuthMode: !isLogin ? 'login' : 'signup' 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center">
            Welcome
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center gap-4 mb-4">
          <span className={`text-sm ${!isLogin ? 'text-primary' : 'text-muted-foreground'}`}>Sign Up</span>
          <Switch
            checked={isLogin}
            onCheckedChange={toggleAuthMode}
            aria-label="Toggle authentication mode"
          />
          <span className={`text-sm ${isLogin ? 'text-primary' : 'text-muted-foreground'}`}>Sign In</span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Button type="submit" className="w-full mb-4" disabled={isLoading}>
            {isLogin ? 'Sign In' : 'Sign Up'}
          </Button>
          
          <div className={`grid w-full items-center gap-1.5 transition-all duration-200 ${isLogin ? 'h-0 opacity-0 overflow-hidden' : 'h-auto opacity-100'}`}>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              disabled={isLoading}
              autoFocus={!isLogin}
              tabIndex={isLogin ? -1 : 1}
            />
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              disabled={isLoading}
              autoFocus={isLogin}
              tabIndex={isLogin ? 1 : 2}
            />
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              disabled={isLoading}
              tabIndex={isLogin ? 2 : 3}
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
