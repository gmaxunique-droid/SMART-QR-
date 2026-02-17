
export enum QRDataType {
  TEXT = 'Text',
  URL = 'Website',
  PHONE = 'Phone',
  EMAIL = 'Email',
  WIFI = 'WiFi',
  LOCATION = 'Location',
  VCARD = 'Contact',
  FILE = 'Cloud File',
  APP_STORE = 'App Store'
}

export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system'
}

export interface QRState {
  rawInput: string;
  detectedType: QRDataType;
  qrContent: string;
  isUploading: boolean;
  uploadProgress: number;
  qrColor: string;
  qrBgColor: string;
}

export interface WiFiData {
  ssid: string;
  password?: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
}
