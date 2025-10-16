import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const AUTH_URL = 'https://functions.poehali.dev/d2285ca8-25fa-45d0-87a2-081191bb2b9f';
const FILES_URL = 'https://functions.poehali.dev/adfcdc9c-946e-4291-8bd3-ca871f6f9c22';
const UPLOAD_URL = 'https://functions.poehali.dev/ca939b19-d15e-4732-aa97-a605ee11cc7e';

interface User {
  user_id: number;
  email: string;
  user_type: 'special' | 'regular';
}

interface FileItem {
  id: number;
  filename: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  downloads_count: number;
  created_at: string;
  uploader_email: string;
  uploader_type: string;
}

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const { toast } = useToast();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regType, setRegType] = useState<'regular' | 'special'>('regular');
  const [specialCode, setSpecialCode] = useState('');

  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('vnefiles_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const response = await fetch(FILES_URL);
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const handleLogin = async () => {
    try {
      const response = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: loginEmail,
          password: loginPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data);
        localStorage.setItem('vnefiles_user', JSON.stringify(data));
        toast({ title: '✅ Вход выполнен', description: `Добро пожаловать, ${data.email}!` });
        setLoginEmail('');
        setLoginPassword('');
      } else {
        toast({ title: '❌ Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: '❌ Ошибка', description: 'Не удалось войти', variant: 'destructive' });
    }
  };

  const handleRegister = async () => {
    try {
      const response = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          email: regEmail,
          password: regPassword,
          user_type: regType,
          special_code: specialCode
        })
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data);
        localStorage.setItem('vnefiles_user', JSON.stringify(data));
        toast({ title: '✅ Регистрация успешна', description: `Аккаунт создан: ${data.email}` });
        setRegEmail('');
        setRegPassword('');
        setSpecialCode('');
      } else {
        toast({ title: '❌ Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: '❌ Ошибка', description: 'Не удалось зарегистрироваться', variant: 'destructive' });
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile || !user) return;

    toast({ title: '⏳ Загрузка...', description: 'Файл отправляется в облако' });

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const base64Content = e.target?.result as string;
        const base64Data = base64Content.split(',')[1];

        const uploadResponse = await fetch(UPLOAD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.user_id,
            filename: uploadFile.name,
            file_content: base64Data,
            mime_type: uploadFile.type || 'application/octet-stream'
          })
        });

        const uploadData = await uploadResponse.json();

        if (uploadResponse.ok) {
          toast({ title: '✅ Файл загружен', description: uploadData.message });
          setUploadFile(null);
          loadFiles();
        } else {
          toast({ title: '❌ Ошибка', description: uploadData.error, variant: 'destructive' });
        }
      };

      reader.onerror = () => {
        toast({ title: '❌ Ошибка', description: 'Не удалось прочитать файл', variant: 'destructive' });
      };

      reader.readAsDataURL(uploadFile);
    } catch (error) {
      toast({ title: '❌ Ошибка', description: 'Не удалось загрузить файл', variant: 'destructive' });
    }
  };

  const handleDownload = async (fileId: number, filename: string) => {
    try {
      const response = await fetch(FILES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'download',
          file_id: fileId
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({ title: '⬇️ Загрузка', description: `Файл ${filename} скачивается...` });
        loadFiles();
      }
    } catch (error) {
      toast({ title: '❌ Ошибка', description: 'Не удалось скачать файл', variant: 'destructive' });
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('vnefiles_user');
    toast({ title: '👋 Выход', description: 'Вы вышли из системы' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-blue-500 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-2">VneFiles</h1>
            <p className="text-white/90 text-lg">Современный файлообменник</p>
          </div>

          <Card className="shadow-2xl">
            <CardHeader>
              <CardTitle>Добро пожаловать</CardTitle>
              <CardDescription>Войдите или зарегистрируйтесь</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Вход</TabsTrigger>
                  <TabsTrigger value="register">Регистрация</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Пароль</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleLogin} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    <Icon name="LogIn" size={18} className="mr-2" />
                    Войти
                  </Button>
                </TabsContent>

                <TabsContent value="register" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="your@email.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Пароль</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Тип пользователя</Label>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={regType === 'regular' ? 'default' : 'outline'}
                        onClick={() => setRegType('regular')}
                        className="flex-1"
                      >
                        Обычный
                      </Button>
                      <Button
                        type="button"
                        variant={regType === 'special' ? 'default' : 'outline'}
                        onClick={() => setRegType('special')}
                        className="flex-1"
                      >
                        Особый ⭐
                      </Button>
                    </div>
                  </div>
                  {regType === 'special' && (
                    <div className="space-y-2 animate-slide-up">
                      <Label htmlFor="special-code">Специальный код</Label>
                      <Input
                        id="special-code"
                        type="text"
                        placeholder="Введите код..."
                        value={specialCode}
                        onChange={(e) => setSpecialCode(e.target.value)}
                      />
                    </div>
                  )}
                  <Button onClick={handleRegister} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    <Icon name="UserPlus" size={18} className="mr-2" />
                    Зарегистрироваться
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-blue-500">
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-white to-white/80 rounded-xl flex items-center justify-center">
              <Icon name="Folder" size={24} className="text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-white">VneFiles</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-white font-medium">{user.email}</p>
              <p className="text-white/70 text-sm">
                {user.user_type === 'special' ? '⭐ Особый пользователь' : '👤 Обычный пользователь'}
              </p>
            </div>
            <Button onClick={handleLogout} variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
              <Icon name="LogOut" size={18} />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {user.user_type === 'special' && (
            <div className="lg:col-span-1">
              <Card className="shadow-xl animate-scale-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="Upload" size={20} />
                    Загрузка файла
                  </CardTitle>
                  <CardDescription>Только для особых пользователей</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <input
                      type="file"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Icon name="FileUp" size={48} className="mx-auto mb-2 text-primary" />
                      <p className="text-sm font-medium">
                        {uploadFile ? uploadFile.name : 'Выберите файл'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {uploadFile ? formatFileSize(uploadFile.size) : 'Нажмите для выбора'}
                      </p>
                    </label>
                  </div>
                  <Button
                    onClick={handleFileUpload}
                    disabled={!uploadFile}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Icon name="CloudUpload" size={18} className="mr-2" />
                    Загрузить
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          <div className={user.user_type === 'special' ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <Card className="shadow-xl animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Files" size={20} />
                  Все файлы ({files.length})
                </CardTitle>
                <CardDescription>Доступные для скачивания</CardDescription>
              </CardHeader>
              <CardContent>
                {files.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Icon name="FolderOpen" size={64} className="mx-auto mb-4 opacity-50" />
                    <p>Пока нет загруженных файлов</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <Icon name="File" size={24} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.filename}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{formatFileSize(file.file_size)}</span>
                              <span className="flex items-center gap-1">
                                <Icon name="Download" size={14} />
                                {file.downloads_count}
                              </span>
                              <span className="flex items-center gap-1">
                                {file.uploader_type === 'special' ? '⭐' : '👤'}
                                {file.uploader_email}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleDownload(file.id, file.filename)}
                          size="sm"
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                        >
                          <Icon name="Download" size={16} className="mr-2" />
                          Скачать
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}