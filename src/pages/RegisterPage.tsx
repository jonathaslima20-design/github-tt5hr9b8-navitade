import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Loader, Gift, CircleAlert as AlertCircle, MessageCircle } from 'lucide-react';
import { useSubscriptionModal } from '@/contexts/SubscriptionModalContext';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { PhoneInputWithCountry } from '@/components/ui/phone-input-with-country';
import { cleanWhatsAppNumber, generateWhatsAppUrl } from '@/lib/utils';
import Logo from '@/components/Logo';

const formSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
  country_code: z.string().default('55'),
  whatsapp: z.string().min(1, 'WhatsApp é obrigatório'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type FormValues = z.infer<typeof formSchema>;

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { openModal, setForced } = useSubscriptionModal();

  // Capturar código de indicação da URL
  const referralCode = searchParams.get('ref');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      country_code: '55',
      whatsapp: '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setRegisterError(null);

    try {
      // Clean WhatsApp number with country code
      const cleanedWhatsApp = cleanWhatsAppNumber(data.whatsapp, data.country_code);

      const { error } = await signUp(
        data.email,
        data.password,
        {
          name: data.name,
          niche_type: 'diversos',
          country_code: data.country_code,
          whatsapp: cleanedWhatsApp
        }
      );

      if (error) {
        // Handle duplicate email error
        if (error === 'EMAIL_ALREADY_EXISTS') {
          setRegisterError(error);
          toast.error('Este e-mail já está cadastrado no sistema');
          return;
        }

        toast.error(error);
        return;
      }

      toast.success('Cadastro realizado com sucesso!');
      openModal(true);
      setForced(true);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Register error:', error);
      const errorMsg = error.message || 'Erro ao realizar cadastro';
      setRegisterError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="flex justify-center mb-8">
          <div className="scale-130">
            <Logo size="lg" showText={false} />
          </div>
        </div>

        <Card className="shadow-lg border">
          <CardHeader className="space-y-1 px-6 pt-6">
            <CardTitle className="text-2xl font-bold text-center">Criar Conta</CardTitle>
            <CardDescription className="text-center">
              {referralCode 
                ? 'Você foi indicado! Cadastre-se e ganhe acesso à plataforma' 
                : 'Cadastre-se para criar sua vitrine digital de produtos'
              }
            </CardDescription>
            {referralCode && (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mt-4">
                <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                  <Gift className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Você está sendo indicado por um usuário da plataforma!
                  </span>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="px-6">
            {registerError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {registerError === 'EMAIL_ALREADY_EXISTS' ? (
                    <>
                      <div>Este e-mail já está cadastrado no sistema.</div>
                      <div className="text-sm mt-1">Por favor, utilize outro e-mail ou entre em contato com o suporte.</div>
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full bg-green-50 hover:bg-green-100 border-green-200 text-green-800"
                          asChild
                        >
                          <a
                            href={generateWhatsAppUrl('5591982465495')}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Falar com Suporte via WhatsApp
                          </a>
                        </Button>
                      </div>
                    </>
                  ) : (
                    registerError
                  )}
                </AlertDescription>
              </Alert>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Seu nome completo" 
                          disabled={isLoading} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="seu@email.com" 
                          type="email" 
                          disabled={isLoading} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País e WhatsApp</FormLabel>
                      <FormControl>
                        <PhoneInputWithCountry
                          defaultCountry="BR"
                          onChange={(data) => {
                            form.setValue('country_code', data.ddi.replace('+', ''));
                            form.setValue('whatsapp', data.phone);
                          }}
                          placeholder="(11) 99999-9999"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="******"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Senha</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="******"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Cadastrar
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col px-6 pb-6">
            <div className="text-sm text-center text-muted-foreground mt-2">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Entrar
              </Link>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}