// src/context/LanguageContext.jsx - Version simplifiée sans i18n
import React, { createContext, useState, useContext, useEffect } from 'react';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('AlkherPay-language') || 'fr';
  });

  const changeLanguage = (lng) => {
    setLanguage(lng);
    localStorage.setItem('AlkherPay-language', lng);
    
    if (lng === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'fr';
    }
  };

  useEffect(() => {
    const savedLang = localStorage.getItem('AlkherPay-language');
    if (savedLang && savedLang !== language) {
      changeLanguage(savedLang);
    }
  }, []);

  // Fonction de traduction simplifiée
  const t = (key) => {
    const translations = {
      fr: {
        'nav.home': 'Accueil',
        'nav.search': 'Rechercher',
        'nav.bookings': 'Mes réservations',
        'nav.wallet': 'Portefeuille',
        'nav.profile': 'Profil',
        'nav.logout': 'Déconnexion',
        'nav.login': 'Connexion',
        'nav.register': 'Inscription',
        'footer.rights': 'Tous droits réservés',
        'footer.follow_us': 'Suivez-nous',
        'footer.contact': 'Contact',
        'footer.terms': 'Conditions générales'
      },
      ar: {
        'nav.home': 'الرئيسية',
        'nav.search': 'بحث',
        'nav.bookings': 'حجوزاتي',
        'nav.wallet': 'المحفظة',
        'nav.profile': 'الملف الشخصي',
        'nav.logout': 'تسجيل خروج',
        'nav.login': 'تسجيل دخول',
        'nav.register': 'إنشاء حساب',
        'footer.rights': 'جميع الحقوق محفوظة',
        'footer.follow_us': 'تابعونا',
        'footer.contact': 'اتصل بنا',
        'footer.terms': 'الشروط والأحكام'
      }
    };
    
    return translations[language]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};