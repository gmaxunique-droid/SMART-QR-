
import { QRDataType } from '../types';

export const detectDataType = (input: string): QRDataType => {
  const trimmed = input.trim();
  
  if (!trimmed) return QRDataType.TEXT;

  // Cloud/File link detection
  if (trimmed.includes('firebasestorage.googleapis.com') || 
      trimmed.toLowerCase().endsWith('.pdf') || 
      trimmed.toLowerCase().endsWith('.zip') ||
      trimmed.toLowerCase().endsWith('.docx') ||
      trimmed.toLowerCase().endsWith('.jpg') ||
      trimmed.toLowerCase().endsWith('.png')) {
    return QRDataType.FILE;
  }

  // URL detection - expanded regex for domains without http
  if (/^https?:\/\//i.test(trimmed) || /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/i.test(trimmed)) {
    if (trimmed.includes('play.google.com/store') || trimmed.includes('apps.apple.com')) {
      return QRDataType.APP_STORE;
    }
    return QRDataType.URL;
  }

  // Email detection
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return QRDataType.EMAIL;
  }

  // Phone detection
  if (/^\+?[0-9\s-]{7,15}$/.test(trimmed)) {
    return QRDataType.PHONE;
  }

  // WiFi detection
  if (/^WIFI:/i.test(trimmed)) {
    return QRDataType.WIFI;
  }

  // Location detection
  if (/^-?\d+\.\d+,\s?-?\d+\.\d+$/.test(trimmed)) {
    return QRDataType.LOCATION;
  }

  // vCard detection
  if (/^BEGIN:VCARD/i.test(trimmed)) {
    return QRDataType.VCARD;
  }

  return QRDataType.TEXT;
};

export const formatInputForQR = (type: QRDataType, input: string): string => {
  const trimmed = input.trim();
  switch (type) {
    case QRDataType.URL:
    case QRDataType.APP_STORE:
    case QRDataType.FILE:
      // Ensure browser compatibility by adding protocol if missing
      if (!/^https?:\/\//i.test(trimmed)) {
        return `https://${trimmed}`;
      }
      return trimmed;
    case QRDataType.PHONE:
      return trimmed.startsWith('tel:') ? trimmed : `tel:${trimmed.replace(/\s+/g, '')}`;
    case QRDataType.EMAIL:
      return trimmed.startsWith('mailto:') ? trimmed : `mailto:${trimmed}`;
    case QRDataType.LOCATION:
      return `https://www.google.com/maps?q=${trimmed}`;
    default:
      return trimmed;
  }
};
