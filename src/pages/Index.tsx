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
const PROFILE_URL = 'https://functions.poehali.dev/62197aa3-df33-4ba2-b5bd-19070fde6cad';

interface User {
  user_id: number;
  email: string;
  user_type: 'special' | 'regular';
  is_verified?: boolean;
}

interface ProfileData {
  user_id: number;
  email: string;
  user_type: string;
  is_verified: boolean;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  stats: {
    files_count: number;
    total_downloads: number;
  };
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
  uploader_id: number;
  uploader_verified: boolean;
}

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentView, setCurrentView] = useState<'files' | 'profile'>('files');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);
  const { toast } = useToast();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regType, setRegType] = useState<'regular' | 'special'>('regular');
  const [specialCode, setSpecialCode] = useState('');

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  
  const [editMode, setEditMode] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editBio, setEditBio] = useState('');

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

  const loadProfile = async (userId: number) => {
    try {
      const response = await fetch(`${PROFILE_URL}?user_id=${userId}`);
      const data = await response.json();
      
      if (response.ok) {
        setProfileData(data);
        setViewingUserId(userId);
        setCurrentView('profile');
        setEditFullName(data.full_name || '');
        setEditBio(data.bio || '');
      }
    } catch (error) {
      toast({ title: '❌ Ошибка', description: 'Не удалось загрузить профиль', variant: 'destructive' });
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(PROFILE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          full_name: editFullName,
          bio: editBio,
          avatar_url: null
        })
      });

      if (response.ok) {
        toast({ title: '✅ Сохранено', description: 'Профиль обновлён' });
        setEditMode(false);
        loadProfile(user.user_id);
      }
    } catch (error) {
      toast({ title: '❌ Ошибка', description: 'Не удалось обновить профиль', variant: 'destructive' });
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
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-white to-white/80 rounded-xl flex items-center justify-center">
                <Icon name="Folder" size={20} className="md:hidden text-purple-600" />
                <Icon name="Folder" size={24} className="hidden md:block text-purple-600" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-white">VneFiles</h1>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-white font-medium text-sm md:text-base flex items-center gap-1">
                  {user.email}
                  {user.is_verified && <Icon name="BadgeCheck" size={16} className="text-blue-400" />}
                </p>
                <p className="text-white/70 text-xs md:text-sm">
                  {user.user_type === 'special' ? '⭐ Особый' : '👤 Обычный'}
                </p>
              </div>
              <Button 
                onClick={() => {
                  if (user) {
                    loadProfile(user.user_id);
                  }
                }} 
                variant="outline" 
                size="sm"
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                <Icon name="User" size={18} />
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                <Icon name="LogOut" size={18} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 md:py-8">
        {currentView === 'profile' && profileData && (
          <div className="mb-4">
            <Button 
              onClick={() => setCurrentView('files')} 
              variant="outline" 
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
            >
              <Icon name="ArrowLeft" size={18} className="mr-2" />
              Назад к файлам
            </Button>
          </div>
        )}

        {currentView === 'files' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {user.user_type === 'special' && (
              <div className="lg:col-span-1">
                <Card className="shadow-xl animate-scale-in">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                      <Icon name="Upload" size={20} />
                      Загрузка файла
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">Только для особых пользователей</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 md:p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Icon name="FileUp" size={40} className="md:hidden mx-auto mb-2 text-primary" />
                        <Icon name="FileUp" size={48} className="hidden md:block mx-auto mb-2 text-primary" />
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
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Icon name="Files" size={20} />
                    Все файлы ({files.length})
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">Доступные для скачивания</CardDescription>
                </CardHeader>
                <CardContent>
                  {files.length === 0 ? (
                    <div className="text-center py-8 md:py-12 text-muted-foreground">
                      <Icon name="FolderOpen" size={48} className="md:hidden mx-auto mb-4 opacity-50" />
                      <Icon name="FolderOpen" size={64} className="hidden md:block mx-auto mb-4 opacity-50" />
                      <p className="text-sm md:text-base">Пока нет загруженных файлов</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 md:p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 sm:gap-4 flex-1 w-full sm:w-auto">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shrink-0">
                              <Icon name="File" size={20} className="md:hidden text-white" />
                              <Icon name="File" size={24} className="hidden md:block text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate text-sm md:text-base">{file.filename}</p>
                              <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground">
                                <span>{formatFileSize(file.file_size)}</span>
                                <span className="flex items-center gap-1">
                                  <Icon name="Download" size={12} className="md:hidden" />
                                  <Icon name="Download" size={14} className="hidden md:block" />
                                  {file.downloads_count}
                                </span>
                                <button 
                                  onClick={() => loadProfile(file.uploader_id)}
                                  className="flex items-center gap-1 hover:text-primary transition-colors"
                                >
                                  <span className="flex items-center gap-1">
                                    {file.uploader_type === 'special' ? '⭐' : '👤'}
                                    {file.uploader_verified && <Icon name="BadgeCheck" size={14} className="text-blue-500" />}
                                  </span>
                                  <span className="max-w-[120px] md:max-w-none truncate">{file.uploader_email}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleDownload(file.id, file.filename)}
                            size="sm"
                            className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
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
        )}

        {currentView === 'profile' && profileData && (
          <Card className="max-w-4xl mx-auto shadow-xl animate-fade-in">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Icon name="User" size={32} className="md:hidden text-white" />
                    <Icon name="User" size={40} className="hidden md:block text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                      {profileData.full_name || profileData.email}
                      {profileData.is_verified && (
                        <Icon name="BadgeCheck" size={20} className="md:hidden text-blue-500" />
                      )}
                      {profileData.is_verified && (
                        <Icon name="BadgeCheck" size={24} className="hidden md:block text-blue-500" />
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      {profileData.user_type === 'special' ? '⭐ Особый пользователь' : '👤 Обычный пользователь'}
                    </CardDescription>
                  </div>
                </div>
                {user && user.user_id === profileData.user_id && (
                  <Button
                    onClick={() => setEditMode(!editMode)}
                    variant="outline"
                    size="sm"
                  >
                    <Icon name={editMode ? 'X' : 'Edit'} size={16} className="mr-2" />
                    {editMode ? 'Отмена' : 'Редактировать'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {editMode ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Имя</Label>
                    <Input
                      id="edit-name"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder="Ваше имя"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-bio">О себе</Label>
                    <Input
                      id="edit-bio"
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Расскажите о себе"
                    />
                  </div>
                  <Button
                    onClick={handleUpdateProfile}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Icon name="Save" size={18} className="mr-2" />
                    Сохранить
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Email</h3>
                    <p className="text-sm md:text-base">{profileData.email}</p>
                  </div>
                  {profileData.bio && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">О себе</h3>
                      <p className="text-sm md:text-base">{profileData.bio}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className="text-2xl md:text-3xl font-bold text-primary">{profileData.stats.files_count}</p>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">Файлов загружено</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className="text-2xl md:text-3xl font-bold text-primary">{profileData.stats.total_downloads}</p>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">Всего скачиваний</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}