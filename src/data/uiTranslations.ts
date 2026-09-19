import { useCallback } from 'react';
import type { LanguageId } from '../types';
import { usePravahStore } from '../store/usePravahStore';

export interface LanguageOption {
  id: LanguageId;
  code: string;
  name: string;
  nativeName: string;
  scriptName: string;
  region: string;
}

export const SITE_LANGUAGES: LanguageOption[] = [
  {
    id: 'en',
    code: 'EN',
    name: 'English',
    nativeName: 'English',
    scriptName: 'Latin Script',
    region: 'Central Logistics & Interstate Corridor',
  },
  {
    id: 'as',
    code: 'AS',
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    scriptName: 'Eastern Nagari (অসমীয়া লিপি)',
    region: 'Brahmaputra Valley & Upper Assam',
  },
  {
    id: 'bn',
    code: 'BN',
    name: 'Bengali',
    nativeName: 'বাংলা',
    scriptName: 'Bengali Script (বাংলা লিপি)',
    region: 'Barak Valley, Tripura & Siliguri Corridors',
  },
  {
    id: 'hi',
    code: 'HI',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    scriptName: 'Devanagari (देवनागरी)',
    region: 'National Convoys & Tanker Drivers',
  },
  {
    id: 'mn',
    code: 'MN',
    name: 'Manipuri',
    nativeName: 'মৈতৈলোন্ / ꯃꯤꯇꯩꯂꯣꯟ',
    scriptName: 'Meitei Mayek (ꯃꯤꯇꯩ ꯃꯌꯦꯛ)',
    region: 'Imphal Corridors & Senapati Lifeline',
  },
];

export const UI_STRINGS: Record<string, Record<LanguageId, string>> = {
  // Brand & Header
  appTitle: {
    en: 'PRAVAH',
    as: 'প্ৰবাহ (PRAVAH)',
    bn: 'প্রবাহ (PRAVAH)',
    hi: 'प्रवाह (PRAVAH)',
    mn: 'ꯄ꯭ꯔꯚꯥ (PRAVAH)',
  },
  appSubtitle: {
    en: 'Predictive Resilient Accessibility & Logistics Intelligence Network',
    as: 'পূৰ্বাভাসমূলক স্থিতিস্থাপক যাতায়াত আৰু লজিষ্টিক চোৰাংচোৱা নেটৱৰ্ক',
    bn: 'পূর্বাভাসমূলক স্থিতিস্থাপক পরিবহন ও লজিস্টিক গোয়েন্দা নেটওয়ার্ক',
    hi: 'पूर्वानुमानित लचीला आवागमन एवं रसद आसूचना नेटवर्क',
    mn: 'ꯍꯥꯟꯅ ꯈꯪꯗꯣꯛꯄ ꯂꯣꯖꯤꯁ꯭ꯇꯤꯛ ꯑꯃꯁꯨꯡ ꯂꯝꯕꯤ ꯄꯥꯎꯒꯤ ꯅꯦꯠꯋꯥꯔꯛ',
  },
  departmentName: {
    en: 'Ministry of Development of North Eastern Region (MDoNER)',
    as: 'উত্তৰ পূৰ্বাঞ্চল উন্নয়ন মন্ত্ৰালয় (MDoNER)',
    bn: 'উত্তর পূর্বাঞ্চল উন্নয়ন মন্ত্রক (MDoNER)',
    hi: 'उत्तर पूर्वी क्षेत्र विकास मंत्रालय (MDoNER)',
    mn: 'ꯑꯋꯥꯡ ꯅꯣꯡꯄꯣꯛ ꯂꯝꯗꯝ ꯆꯥꯎꯈꯠ-ꯊꯧꯔꯥꯡ ꯃꯟꯠꯔꯥꯂꯌ (MDoNER)',
  },
  liveCloud: {
    en: 'Supabase Live Cloud',
    as: 'লাইভ ক্লাউড চিঙ্ক',
    bn: 'লাইভ ক্লাউড সিঙ্ক',
    hi: 'लाइव क्लाउड सिंक',
    mn: 'ꯂꯥꯏꯚ ꯀ꯭ꯂꯥꯎꯗ ꯁꯤꯡꯛ',
  },
  onlineLive: {
    en: 'Online / Live Sync',
    as: 'অনলাইন / লাইভ চিঙ্ক',
    bn: 'অনলাইন / লাইভ সিঙ্ক',
    hi: 'ऑनलाइन / लाइव सिंक',
    mn: 'ꯑꯣꯅꯂꯥꯏꯟ ꯁꯤꯡꯛ',
  },
  offlineMode: {
    en: 'Offline Mode',
    as: 'অফলাইন ম’ড',
    bn: 'অফলাইন মোড',
    hi: 'ऑफ़लाइन मोड',
    mn: 'ꯑꯣꯐꯂꯥꯏꯟ ꯃꯣꯗ',
  },
  queuedOffline: {
    en: 'queued',
    as: 'অপেক্ষমাণ',
    bn: 'অপেক্ষারত',
    hi: 'कतारबद्ध',
    mn: 'ꯂꯩꯔꯤꯕ',
  },

  // Role Simulator Options
  roleAdmin: {
    en: 'Admin (MDoNER)',
    as: 'প্ৰশাসক (MDoNER)',
    bn: 'প্রশাসক (MDoNER)',
    hi: 'प्रशासक (MDoNER)',
    mn: 'ꯑꯦꯗꯃꯤꯟ (MDoNER)',
  },
  roleDispatcher: {
    en: 'Dispatcher (Logistics)',
    as: 'ডিচপেচাৰ (লজিষ্টিক)',
    bn: 'ডিসপ্যাচার (লজিস্টিক)',
    hi: 'प्रेषक (लॉजिस्टिक्स)',
    mn: 'ꯗꯤꯁꯄꯦꯆꯔ (ꯂꯣꯖꯤꯁ꯭ꯇꯤꯛ)',
  },
  roleFieldOfficer: {
    en: 'Field Officer (MZ-04)',
    as: 'ফিল্ড বিষয়া (MZ-04)',
    bn: 'ফিল্ড অফিসার (MZ-04)',
    hi: 'क्षेत्र अधिकारी (MZ-04)',
    mn: 'ꯐꯤꯜꯗ ꯑꯣꯐꯤꯁꯔ (MZ-04)',
  },
  roleDriver: {
    en: 'Driver (Medic-01)',
    as: 'চালক (Medic-01)',
    bn: 'চালক (Medic-01)',
    hi: 'चालक (Medic-01)',
    mn: 'ꯗ꯭ꯔꯥꯏꯚꯔ (Medic-01)',
  },

  // Language Menu Labels
  selectLanguage: {
    en: 'Language',
    as: 'ভাষা',
    bn: 'ভাষা',
    hi: 'भाषा',
    mn: 'ꯂꯣꯟ',
  },
  switchLanguageTitle: {
    en: 'Select Regional Language',
    as: 'আঞ্চলিক ভাষা বাছক',
    bn: 'আঞ্চলিক ভাষা নির্বাচন করুন',
    hi: 'क्षेत्रीय भाषा चुनें',
    mn: 'ꯂꯝꯗꯝꯁꯤꯒꯤ ꯂꯣꯟ ꯈꯟꯕꯤꯌꯨ',
  },
  languageNotice: {
    en: 'Switches the interface language across all command decks, maps, and field workflows.',
    as: 'সকলো কমাণ্ড ডেক, মেপ আৰু ফিল্ড কাৰ্যপ্ৰণালীত ভাষা সলনি কৰে।',
    bn: 'সকল কমান্ড ডেক, মানচিত্র এবং ফিল্ড কার্যপ্রণালীর ভাষা পরিবর্তন করে।',
    hi: 'सभी कमांड डेक, मानचित्र और फील्ड वर्कफ़्लो में इंटरफ़ेस भाषा बदलता है।',
    mn: 'ꯀꯃꯥꯟꯗ ꯗꯦꯛ ꯑꯃꯁꯨꯡ ꯂꯝꯕꯤ ꯃꯦꯄꯇ ꯂꯣꯟ ꯍꯣꯡꯗꯣꯛꯏ।',
  },

  // Telemetry KPI Bar
  kpiBlockages: {
    en: 'Blockages:',
    as: 'অৱৰোধ:',
    bn: 'অবরোধ:',
    hi: 'अवरोध:',
    mn: 'ꯂꯝꯕꯤ ꯊꯤꯡꯕ:',
  },
  kpiP1Hubs: {
    en: 'P1 Hubs:',
    as: 'P1 কেন্দ্ৰ:',
    bn: 'P1 কেন্দ্র:',
    hi: 'P1 केंद्र:',
    mn: 'P1 ꯃꯐꯝ:',
  },
  kpiConvoys: {
    en: 'Convoys:',
    as: 'কনভয়:',
    bn: 'কনভয়:',
    hi: 'काफिले:',
    mn: 'ꯀꯟꯚꯣꯏ:',
  },
  kpiOverdue: {
    en: 'Overdue:',
    as: 'পলম হোৱা:',
    bn: 'বিলম্বে:',
    hi: 'विलंबित:',
    mn: 'ꯃꯇꯝ ꯊꯦꯡꯊꯕ:',
  },
  missionBadge: {
    en: 'Mission',
    as: 'অভিযান',
    bn: 'অভিযান',
    hi: 'मिशन',
    mn: 'ꯊꯧꯔꯥꯡ',
  },

  // Navigation Deck Tabs
  navGis: {
    en: 'Tactical GIS Command',
    as: 'কৌশলগত জিআইএছ কমাণ্ড',
    bn: 'কৌশলগত জিআইএস কমান্ড',
    hi: 'सामरिक जीआईएस कमान',
    mn: 'ꯇꯦꯛꯇꯤꯀꯦꯜ GIS ꯀꯃꯥꯟꯗ',
  },
  navGisShort: {
    en: 'GIS Map',
    as: 'জিআইএছ মেপ',
    bn: 'জিআইএস ম্যাপ',
    hi: 'जीआईएस नक्शा',
    mn: 'GIS ꯃꯦꯞ',
  },
  navMissions: {
    en: 'Missions',
    as: 'অভিযানসমূহ',
    bn: 'অভিযানসমূহ',
    hi: 'काफिला मिशन',
    mn: 'ꯊꯧꯔꯥꯡꯁꯤꯡ',
  },
  navCommunities: {
    en: 'Communities',
    as: 'সম্প্ৰদায়সমূহ',
    bn: 'সম্প্রদায়সমূহ',
    hi: 'समुदाय स्थिति',
    mn: 'ꯃꯤꯌꯥꯝ ꯃꯐꯝ',
  },
  navInfra: {
    en: 'Infrastructure & BRO Board',
    as: 'আন্তঃগাঁথনি আৰু বিআৰঅ’',
    bn: 'পরিকাঠামো ও বিআরও বোর্ড',
    hi: 'बुनियादी ढांचा एवं बीआरओ',
    mn: 'ꯏꯟꯐ꯭ꯔꯥꯁ꯭ꯠꯔꯛꯆꯔ ꯑꯃꯁꯨꯡ BRO',
  },
  navInfraShort: {
    en: 'Infra & BRO',
    as: 'আন্তঃগাঁথনি',
    bn: 'পরিকাঠামো',
    hi: 'ढांचा व बीआरओ',
    mn: 'BRO ꯂꯝꯕꯤ',
  },
  navGroundFeed: {
    en: 'Ground Intel Feed',
    as: 'ফিল্ড চোৰাংচোৱা ফীড',
    bn: 'ফিল্ড গোয়েন্দা ফিড',
    hi: 'जमीनी खुफिया फीड',
    mn: 'ꯃꯥꯂꯦꯝ ꯄꯥꯎ ꯐꯤꯗ',
  },
  navGroundFeedShort: {
    en: 'Intel Feed',
    as: 'চোৰাংচোৱা ফীড',
    bn: 'গোয়েন্দা ফিড',
    hi: 'खुफिया फीड',
    mn: 'ꯄꯥꯎ ꯐꯤꯗ',
  },
  navBroadcast: {
    en: 'Emergency Broadcasts',
    as: 'জৰুৰীকালীন সম্প্ৰচাৰ',
    bn: 'জরুরি সম্প্রচার',
    hi: 'आपातकालीन प्रसारण',
    mn: 'ꯈꯨꯗꯣꯡꯊꯤꯕ ꯄꯥꯎ',
  },
  navBroadcastShort: {
    en: 'Broadcasts',
    as: 'সম্প্ৰচাৰ',
    bn: 'সম্প্রচার',
    hi: 'प्रसारण',
    mn: 'ꯄꯥꯎ ꯊꯥꯕ',
  },
  navCockpit: {
    en: 'Field Mission Cockpit',
    as: 'ফিল্ড অভিযান ককপিট',
    bn: 'ফিল্ড মিশন ককপিট',
    hi: 'फील्ड मिशन कॉकपिट',
    mn: 'ꯐꯤꯜꯗ ꯃꯤꯁꯟ ꯀꯣꯛꯄꯤꯠ',
  },
  navCockpitShort: {
    en: 'Cockpit',
    as: 'ককপিট',
    bn: 'ককপিট',
    hi: 'कॉकपिट',
    mn: 'ꯀꯣꯛꯄꯤꯠ',
  },
  mobileMenuToggle: {
    en: 'Tap to toggle operational view',
    as: 'কাৰ্যকৰী দৃশ্য সলনি কৰিবলৈ টেপ কৰক',
    bn: 'ভিউ পরিবর্তন করতে ট্যাপ করুন',
    hi: 'दृश्य बदलने के लिए टैप करें',
    mn: 'ꯚꯤꯌꯨ ꯍꯣꯡꯅꯕ ꯅꯝꯕꯤꯌꯨ',
  },

  // Common Actions
  dispatchMission: {
    en: 'Approve & Dispatch Convoy',
    as: 'অনুমোদন আৰু কনভয় প্ৰেৰণ',
    bn: 'অনুমোদন ও কনভয় প্রেরণ',
    hi: 'स्वीकृत करें और काफिला भेजें',
    mn: 'ꯑꯌꯥꯕ ꯄꯤꯗꯨꯅ ꯒꯥꯔꯤ ꯊꯥꯕ',
  },
  customizeMission: {
    en: 'Customize Route / Rig',
    as: 'পথ / বাহন কাস্টমাইজ কৰক',
    bn: 'রুট / গাড়ি কাস্টমাইজ করুন',
    hi: 'मार्ग / वाहन अनुकूलित करें',
    mn: 'ꯂꯝꯕꯤ / ꯒꯥꯔꯤ ꯈꯟꯕ',
  },
  markDelivered: {
    en: 'Mark Delivered',
    as: 'বিতৰণ সম্পূৰ্ণ চিহ্নিত কৰক',
    bn: 'সরবরাহ সম্পন্ন চিহ্নিত করুন',
    hi: 'डिलीवर किया गया चिह्नित करें',
    mn: 'ꯄꯣꯠ ꯌꯧꯔꯦ ꯍꯥꯏꯅ ꯇꯥꯛꯄ',
  },
  submitGroundReport: {
    en: 'Submit Ground Report',
    as: 'ফিল্ড ৰিপৰ্ট দাখিল কৰক',
    bn: 'ফিল্ড রিপোর্ট জমা দিন',
    hi: 'जमीनी रिपोर्ट दर्ज करें',
    mn: 'ꯃꯥꯂꯦꯝ ꯄꯥꯎ ꯄꯤꯕ',
  },
  emergencySOS: {
    en: 'Emergency SOS',
    as: 'জৰুৰীকালীন SOS',
    bn: 'জরুরি SOS',
    hi: 'आपातकालीन SOS',
    mn: 'ꯑꯀꯟꯕ SOS',
  },
  acknowledge: {
    en: 'Acknowledge',
    as: 'স্বীকাৰ কৰক',
    bn: 'স্বীকার করুন',
    hi: 'स्वीकार करें',
    mn: 'ꯌꯥꯔꯦ ꯍꯥꯏꯕ',
  },
  filterAll: {
    en: 'All',
    as: 'সকলো',
    bn: 'সকল',
    hi: 'सभी',
    mn: 'ꯄꯨꯝꯅꯃꯛ',
  },
  verifiedOnly: {
    en: 'Verified Only',
    as: 'কেৱল সত্যায়িত',
    bn: 'শুধু যাচাইকৃত',
    hi: 'केवल सत्यापित',
    mn: 'ꯆꯨꯝꯂꯦ ꯈꯪꯂꯕ',
  },
  searchPlaceholder: {
    en: 'Search hubs, routes, districts...',
    as: 'কেন্দ্ৰ, পথ, জিলা সন্ধান কৰক...',
    bn: 'কেন্দ্র, রুট, জেলা খুঁজুন...',
    hi: 'केंद्र, मार्ग, जिले खोजें...',
    mn: 'ꯃꯐꯝ, ꯂꯝꯕꯤ, ꯄꯅꯥ ꯊꯤꯕ...',
  },
  close: {
    en: 'Close',
    as: 'বন্ধ কৰক',
    bn: 'বন্ধ করুন',
    hi: 'बंद करें',
    mn: 'ꯊꯤꯡꯖꯤꯟꯕ',
  },
  cancel: {
    en: 'Cancel',
    as: 'বাতিল কৰক',
    bn: 'বাতিল করুন',
    hi: 'रद्द करें',
    mn: 'ꯂꯦꯞꯄ',
  },
  save: {
    en: 'Save',
    as: 'সংৰক্ষণ কৰক',
    bn: 'সংরক্ষণ করুন',
    hi: 'सहेजें',
    mn: 'ꯊꯝꯕ',
  },
  refresh: {
    en: 'Refresh',
    as: 'সতেজ কৰক',
    bn: 'রিফ্রেশ করুন',
    hi: 'ताज़ा करें',
    mn: 'ꯑꯅꯧꯕ ꯇꯧꯕ',
  },
  active: {
    en: 'Active',
    as: 'সক্ৰিয়',
    bn: 'সক্রিয়',
    hi: 'सक्रिय',
    mn: 'ꯆꯠꯊꯣꯛ-ꯆꯠꯁꯤꯟ ꯇꯧꯔꯤꯕ',
  },
  blocked: {
    en: 'Blocked',
    as: 'বন্ধ',
    bn: 'বন্ধ',
    hi: 'अवरुद्ध',
    mn: 'ꯊꯤꯡꯖꯤꯜꯂꯦ',
  },
};

/**
 * Universal translator function with fallback to English
 */
export function t(key: string, lang: LanguageId = 'en'): string {
  if (UI_STRINGS[key] && UI_STRINGS[key][lang]) {
    return UI_STRINGS[key][lang];
  }
  return UI_STRINGS[key]?.['en'] || key;
}

/**
 * React hook to access current site language and translation helpers
 */
export function useTranslation() {
  const { currentLanguage, setLanguage } = usePravahStore();

  const translate = useCallback(
    (key: string): string => {
      return t(key, currentLanguage);
    },
    [currentLanguage]
  );

  return {
    t: translate,
    currentLanguage,
    setLanguage,
    languages: SITE_LANGUAGES,
  };
}
