import { Platform } from 'react-native';

// プラットフォーム毎のアイコンライブラリを動的に読み込む
export const getIconLibrary = () => {
  if (Platform.OS === 'web') {
    // Web環境ではlucide-reactを使用
    return require('lucide-react');
  } else {
    // React Native環境ではlucide-react-nativeを使用
    return require('lucide-react-native');
  }
};

// アイコンコンポーネントを取得するヘルパー関数
export const getIcon = (iconName: string) => {
  const iconLib = getIconLibrary();
  return iconLib[iconName];
};

// よく使用されるアイコンのエクスポート
export const Icons = (() => {
  const iconLib = getIconLibrary();
  
  return {
    // ナビゲーション関連
    Home: iconLib.Home,
    MapPin: iconLib.MapPin,
    Users: iconLib.Users,
    User: iconLib.User,
    UserCircle: iconLib.UserCircle,
    UserCheck: iconLib.UserCheck,
    Heart: iconLib.Heart,
    Sparkles: iconLib.Sparkles,
    MessageCircle: iconLib.MessageCircle,
    Settings: iconLib.Settings,
    
    // 一般的なアイコン
    Filter: iconLib.Filter,
    X: iconLib.X,
    Check: iconLib.Check,
    RefreshCw: iconLib.RefreshCw,
    CircleCheck: iconLib.CircleCheck,
    Edit: iconLib.Edit,
    Crosshair: iconLib.Crosshair,
    AlertTriangle: iconLib.AlertTriangle,
    Plus: iconLib.Plus,
    Copy: iconLib.Copy,
    UserPlus: iconLib.UserPlus,
    Search: iconLib.Search,
    
    // アクティビティアイコン
    Coffee: iconLib.Coffee,
    Wine: iconLib.Wine,
    Beer: iconLib.Beer,
    Compass: iconLib.Compass,
    ShoppingBag: iconLib.ShoppingBag,
    Play: iconLib.Play,
    Utensils: iconLib.Utensils,
    Smile: iconLib.Smile,
    Store: iconLib.Store,
    
    // その他
    Send: iconLib.Send,
    Code: iconLib.Code,
    ChevronRight: iconLib.ChevronRight,
    MessageSquare: iconLib.MessageSquare,
  };
})(); 