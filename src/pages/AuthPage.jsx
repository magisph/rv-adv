import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Scale } from "lucide-react";

export default function AuthPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const emailToUse = username.trim().toLowerCase() + "@rvadv.local";
      const { error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (error) throw error;
      
      // onAuthStateChange in AuthContext vai atualizar a sessão e ProtectedRoute liberará o acesso
      toast.success("Login efetuado com sucesso!");
      navigate("/");
    } catch (error) {
      toast.error(error.message || "Falha ao fazer login.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const emailToUse = username.trim().toLowerCase() + "@rvadv.local";
      const { error } = await supabase.auth.signUp({
        email: emailToUse,
        password,
      });

      if (error) throw error;
      
      toast.success("Conta criada! O login foi efetuado ou verifique seu e-mail.");
      navigate("/");
    } catch (error) {
      toast.error(error.message || "Falha ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="mb-8 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-legal-blue rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <Scale className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800">RV-Adv</h1>
        <p className="text-slate-600 mt-2">Sistema de Gestão Jurídica</p>
      </div>

      <Card className="w-full max-w-md shadow-lg border-0">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-t-lg rounded-b-none h-14 bg-slate-100">
            <TabsTrigger value="login" className="data-[state=active]:bg-white rounded-tl-lg">
              Entrar
            </TabsTrigger>
            <TabsTrigger value="signup" className="data-[state=active]:bg-white rounded-tr-lg">
              Criar Conta
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="m-0">
            <CardHeader>
              <CardTitle>Acesse sua conta</CardTitle>
              <CardDescription>
                Insira seu usuário e senha para entrar no painel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-login">Usuário</Label>
                  <Input 
                    id="email-login" 
                    type="text" 
                    placeholder="ex: rafaela.adv" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-login">Senha</Label>
                  <Input 
                    id="password-login" 
                    type="password" 
                    placeholder="Sua senha secreta" 
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-legal-blue hover:bg-legal-blue-light" 
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </CardContent>
          </TabsContent>
          
          <TabsContent value="signup" className="m-0">
            <CardHeader>
              <CardTitle>Crie sua conta</CardTitle>
              <CardDescription>
                Cadastre-se para obter acesso ao sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signup">Usuário</Label>
                  <Input 
                    id="email-signup" 
                    type="text" 
                    placeholder="ex: rafaela.adv" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup">Senha</Label>
                  <Input 
                    id="password-signup" 
                    type="password" 
                    placeholder="Mínimo 6 caracteres" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-legal-blue hover:bg-legal-blue-light" 
                  disabled={loading}
                >
                  {loading ? "Criando conta..." : "Criar Conta"}
                </Button>
              </form>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
      
      <p className="text-sm text-slate-600 mt-8">
        &copy; {new Date().getFullYear()} RV-Advocacia. Todos os direitos reservados.
      </p>
    </div>
  );
}
