import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sonnx.quanlycatruc',
  appName: 'QuanLyCaTruc',
  webDir: 'renderer',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    // Cho phép điều hướng và request clear text nếu cần
    allowNavigation: [
      "printerval.com"
    ]
  },
  plugins: {
    CapacitorHttp: {
      enabled: true, // Kích hoạt plugin HTTP native của Capacitor để vượt qua CORS
    },
  },
};

export default config;