import type { LanguageConfig, LanguageId } from '../types';

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    id: 'en',
    code: 'EN',
    name: 'English',
    nativeName: 'English',
    scriptName: 'Latin Script',
    flag: 'EN',
    targetRegion: 'Interstate Convoys, Central Logistics & Defense Corridor',
    isUnicode: false,
    ttsLang: 'en-IN',
    ttsGoogleLang: 'en',
    voiceFallbacks: ['en-IN', 'en-GB', 'en-US'],
  },
  {
    id: 'hi',
    code: 'HI',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    scriptName: 'Devanagari (देवनागरी)',
    flag: 'HI',
    targetRegion: 'Interstate Long-Haul Fleet & Tanker Drivers',
    isUnicode: true,
    ttsLang: 'hi-IN',
    ttsGoogleLang: 'hi',
    voiceFallbacks: ['hi-IN', 'hi', 'en-IN'],
  },
  {
    id: 'as',
    code: 'as',
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    scriptName: 'Eastern Nagari (অসমীয়া লিপি)',
    flag: 'AS',
    targetRegion: 'Brahmaputra Valley, Upper Assam, Intra-State Fleets',
    isUnicode: true,
    ttsLang: 'as-IN',
    ttsGoogleLang: 'bn', // Bengali audio engine reads Eastern Nagari Assamese with high phonetic fidelity
    voiceFallbacks: ['as-IN', 'bn-IN', 'bn-BD', 'bn', 'hi-IN'],
  },
  {
    id: 'bn',
    code: 'BN',
    name: 'Bengali',
    nativeName: 'বাংলা',
    scriptName: 'Bengali-Assamese (বাংলা লিপি)',
    flag: 'BN',
    targetRegion: 'Barak Valley (Silchar/Karimganj), Tripura, Siliguri Corridors',
    isUnicode: true,
    ttsLang: 'bn-IN',
    ttsGoogleLang: 'bn',
    voiceFallbacks: ['bn-IN', 'bn-BD', 'bn', 'hi-IN'],
  },
  {
    id: 'mn',
    code: 'MN',
    name: 'Manipuri',
    nativeName: 'মৈতৈলোন্ / ꯃꯤꯇꯩꯂꯣꯟ',
    scriptName: 'Meitei Mayek (ꯃꯤꯇꯩ ꯃꯌꯦꯛ)',
    flag: 'MN',
    targetRegion: 'Imphal Supply Corridors, Mao Gate, Senapati Lifeline',
    isUnicode: true,
    ttsLang: 'mn-IN',
    ttsGoogleLang: 'bn', // Reads Eastern Nagari script version of Manipuri phonetically
    voiceFallbacks: ['mn-IN', 'bn-IN', 'hi-IN', 'en-IN'],
  },
];

export interface PresetTranslationEntry {
  en: string;
  hi: string;
  as: string;
  bn: string;
  mn: string;
  mn_mayek: string;
  mn_bengali: string;
}

export const PRESET_TRANSLATIONS: Record<string, PresetTranslationEntry> = {
  'inc-nh29-kohima': {
    en: "EMERGENCY DISPATCH: NH-29 near Kohima is completely BLOCKED due to a major landslide. All heavy commercial convoys and tankers must divert via Route B (Wokha). Estimated delay: 4 hours. BRO QRT deployed. Helpline: 112 / 1077.",
    hi: "आपातकालीन अलर्ट: भारी भूस्खलन के कारण कोहिमा के पास NH-29 पूर्ण रूप से अवरुद्ध है। सभी भारी मालवाहक वाहनों एवं तेल टैंकरों को वोखा (Wokha) होकर वैकल्पिक मार्ग लेने का निर्देश दिया जाता है। अनुमानित देरी: 4 घंटे। हेल्पलाइन: 112 / 1077।",
    as: "জৰুৰীকালীন সতৰ্কবাৰ্তা: ভূমিস্খলনৰ বাবে কহিমাৰ ওচৰত NH-29 সম্পূৰ্ণৰূপে বন্ধ হৈ পৰিছে। সকলো গধুৰ বাণিজ্যিক বাহন আৰু তেল টেংকাৰক ৱোখা (Wokha) হৈ বৈকল্পিক পথ ব্যৱহাৰ কৰিবলৈ নিৰ্দেশ দিয়া হৈছে। আনুমানিক পলম: ৪ ঘণ্টা। হেল্পলাইন: ১১২ / ১০৭৭।",
    bn: "জরুরি সতর্কতা: ব্যাপক ভূমিধসের কারণে কোহিমার কাছে NH-29 সম্পূর্ণ অবরুদ্ধ। সকল ভারী বাণিজ্যিক কনভয় ও তেল ট্যাঙ্কারকে ওখা (Wokha) হয়ে বিকল্প পথে যাওয়ার নির্দেশ দেওয়া হচ্ছে। সম্ভাব্য বিলম্ব: ৪ ঘণ্টা। হেল্পলাইন: ১১২ / ১০৭৭।",
    mn: "ꯈꯨꯗꯣꯡꯊꯤꯕ ꯆꯦꯀꯁꯤꯟꯋꯥ: ꯀꯣꯍꯤꯃꯥ ꯃꯅꯥꯛꯇ ꯂꯩꯕ NH-29 ꯂꯩꯆꯤꯜ ꯇꯥꯕꯅ ꯃꯔꯝ ꯑꯣꯏꯗꯨꯅ ꯃꯄꯨꯡ ꯐꯥꯅ ꯊꯤꯡꯖꯤꯜꯂꯦ। ꯑꯀꯟꯕ ꯒꯥꯔꯤ ꯑꯃꯁꯨꯡ ꯇꯦꯡꯀꯔꯁꯤꯡ ৱꯣꯈꯥ (Wokha) ꯒꯤ ꯂꯝꯕꯤꯗ ꯍꯣꯡꯗꯣꯛꯀꯗꯕꯅꯤ। ꯃꯇꯝ: ꯄꯨꯡ ৪ ꯊꯦꯡꯊꯒꯅꯤ। ꯍꯦꯜꯞꯂꯥꯏꯟ: ১১২।",
    mn_mayek: "ꯈꯨꯗꯣꯡꯊꯤꯕ ꯆꯦꯀꯁꯤꯟꯋꯥ: ꯀꯣꯍꯤꯃꯥ ꯃꯅꯥꯛꯇ ꯂꯩꯕ NH-29 ꯂꯩꯆꯤꯜ ꯇꯥꯕꯅ ꯃꯔꯝ ꯑꯣꯏꯗꯨꯅ ꯃꯄꯨꯡ ꯐꯥꯅ ꯊꯤꯡꯖꯤꯜꯂꯦ। ꯑꯀꯟꯕ ꯒꯥꯔꯤ ꯑꯃꯁꯨꯡ ꯇꯦꯡꯀꯔꯁꯤꯡ ৱꯣꯈꯥ (Wokha) ꯒꯤ ꯂꯝꯕꯤꯗ ꯍꯣꯡꯗꯣꯛꯀꯗꯕꯅꯤ। ꯃꯇꯝ: ꯄꯨꯡ ৪ ꯊꯦꯡꯊꯒꯅꯤ। ꯍꯦꯜꯞꯂꯥꯏꯟ: ১১২।",
    mn_bengali: "খুদোংথীবগী চেক্সিনৱা: কোহিমাগী মনাক্তা লৈবা NH-29 লৈচিল তাবনা মরম ওইদুনা মপুং ফানা থিংজিল্লে। অকন্বা গারী অমসুং তেঙ্করশিং ৱোখা (Wokha) গী লম্বীদা হোংদোক্কদবনি। মতম: পুং ৪ থেংথগনি। হেল্পলাইন: ১১২।"
  },
  'inc-nh10-teesta': {
    en: "CRITICAL ALERT: Bridge submerged on NH-10 Teesta Valley due to flash floods. Impassable for heavy vehicles. Convoys must divert via Lava - Algarah - Reshi. Estimated delay: 6 hours. Emergency Helpline: 112 / 1070.",
    hi: "गंभीर चेतावनी: तीस्ता घाटी में अचानक आई बाढ़ से NH-10 का पुल जलमग्न हो गया है। भारी वाहनों के लिए मार्ग पूरी तरह बंद है। सभी वाहन लावा - अल्गड़ा - रेशी मार्ग से डाइवर्ट करें। अनुमानित विलंब: 6 घंटे। हेल्पलाइन: 112 / 1070।",
    as: "গুৰুতৰ সতৰ্কবাৰ্তা: তিস্তা উপত্যকাত প্ৰৱল বানৰ ফলত NH-10 দলং প্লাৱিত হৈছে। গধুৰ বাণিজ্যিক বাহনৰ বাবে পথ অনুপযোগী। সকলো বাহনক লাভা - আলগাড়া - ৰেছি হৈ যাবলৈ অনুৰোধ জনোৱা হৈছে। আনুমানিক পলম: ৬ ঘণ্টা। হেল্পলাইন: ১১২ / ১০৭০।",
    bn: "জরুরি ট্রাফিক সতর্কতা: তিস্তা উপত্যকায় হড়পা বানের ফলে NH-10 সেতু নিমজ্জিত। ভারী বাণিজ্যিক যানবাহনের চলাচল বন্ধ। সমস্ত কনভয়কে লাভা - আলগাড়া - রেশি হয়ে বিকল্প রুটে ঘোরানো হচ্ছে। বিলম্ব: ৬ ঘণ্টা। হেল্পলাইন: ১১২ / ১০৭০।",
    mn: "ꯈꯨꯗꯣꯡꯊꯤꯕ ꯆꯦꯀꯁꯤꯟꯋꯥ: ꯇꯤꯁꯇꯥ ꯇꯝꯄꯥꯛꯇ ꯏꯁꯤꯡ ꯏꯀꯥꯏ ꯊꯣꯛꯄꯅ NH-10 ꯊꯣꯡ ꯏꯁꯤꯡꯅ ꯀꯨꯞꯁꯤꯜꯂꯦ। ꯑꯀꯟꯕ ꯄꯣꯠꯄꯨ ꯒꯥꯔꯤꯁꯤꯡ ꯂꯥꯚꯥ-ꯑꯜꯒꯥꯔꯥ ꯂꯝꯕꯤꯗ ꯍꯣꯡꯗꯣꯛꯀꯗꯕꯅꯤ। ꯃꯇꯝ: ꯄꯨꯡ ৬ ꯊꯦꯡꯊꯒꯅꯤ। ꯍꯦꯜꯞꯂꯥꯏꯟ: ১১২।",
    mn_mayek: "ꯈꯨꯗꯣꯡꯊꯤꯕ ꯆꯦꯀꯁꯤꯟꯋꯥ: ꯇꯤꯁꯇꯥ ꯇꯝꯄꯥꯛꯇ ꯏꯁꯤꯡ ꯏꯀꯥꯏ ꯊꯣꯛꯄꯅ NH-10 ꯊꯣꯡ ꯏꯁꯤꯡꯅ ꯀꯨꯞꯁꯤꯜꯂꯦ। ꯑꯀꯟꯕ ꯄꯣꯠꯄꯨ ꯒꯥꯔꯤꯁꯤꯡ ꯂꯥꯚꯥ-ꯑꯜꯒꯥꯔꯥ ꯂꯝꯕꯤꯗ ꯍꯣꯡꯗꯣꯛꯀꯗꯕꯅꯤ। ꯃꯇꯝ: ꯄꯨꯡ ৬ ꯊꯦꯡꯊꯒꯅꯤ। ꯍꯦꯜꯞꯂꯥꯏꯟ: ১১২।",
    mn_bengali: "খুদোংথীবগী চেক্সিনৱা: তিস্তা তমপাক্তা ঈশিং ঈকাঈ থোকপনা NH-10 থোং ঈশীংনা কুপশিল্লে। অকন্বা পোৎপু গারীশিং লাভা-অলগারা লম্বীদা হোংদোক্কদবনি। মতম: পুং ৬ থেংথগনি। হেল্পলাইন: ১১২।"
  },
  'inc-nh27-assam': {
    en: "SEVERE FLOOD WARNING: Road waterlogging on NH-27 Guwahati-Nagaon corridor (Jagiroad-Roha stretch). Heavy convoys must divert via Morigaon bypass or NH-15 North Bank. Estimated delay: 3 hours. Emergency Helpline: 112 / 1079.",
    hi: "गंभीर बाढ़ चेतावनी: NH-27 गुवाहाटी-नगांव कॉरिडोर (जागीरोड-रोहा खंड) पर भारी जलभराव। भारी वाहनों को मोरीगांव बाईपास या उत्तरी तट NH-15 होकर डायवर्ट किया जा रहा है। अनुमानित देरी: 3 घंटे। हेल्पलाइन: 112 / 1079।",
    as: "জৰুৰী বান সতৰ্কবাৰ্তা: NH-27 গুৱাহাটী-নগাঁও কৰিডৰত (জাগীৰোড-ৰহা অংশ) গুৰুতৰ জলমগ্নতা। গধুৰ কনভয়সমূহ মৰিগাঁও বা উত্তৰ পাৰৰ NH-15 হৈ বিকল্প পথেৰে যাবলৈ নিৰ্দেশ দিয়া হৈছে। আনুমানিক পলম: ৩ ঘণ্টা। হেল্পলাইন: ১১২ / ১০৭৯।",
    bn: "বন্যাজনিত সতর্কতা: NH-27 গুয়াহাটি-নগাঁও করিডরে (জাগীরোড-রহা অংশ) তীব্র জলমগ্নতা। ভারী যানবাহনগুলিকে মরিগাঁও বাইপাস বা NH-15 উত্তর পাড় দিয়ে যাওয়ার নির্দেশ দেওয়া হচ্ছে। আনুমানিক বিলম্ব: ৩ ঘণ্টা। হেল্পলাইন: ১১২ / ১০৭৯।",
    mn: "ꯈꯨꯗꯣꯡꯊꯤꯕ ꯆꯦꯀꯁꯤꯟꯋꯥ: NH-27 ꯒꯨꯋꯥꯍꯥꯇꯤ-ꯅꯒꯥꯑꯣꯟ ꯂꯝꯕꯤꯗ ꯑꯀꯟꯕ ꯏꯁꯤꯡ ꯏꯆꯥꯑꯣ ꯊꯣꯛꯂꯦ। ꯑꯀꯟꯕ ꯀꯟꯚꯣꯏꯁꯤꯡ ꯃꯣꯔꯤꯒꯥꯑꯣꯟ ꯅꯠꯇ꯭ꯔꯒ NH-15 ꯑꯋꯥꯡ ꯊꯪꯕ ꯂꯝꯕꯤꯗ ꯍꯣꯡꯗꯣꯛꯎ। ꯃꯇꯝ: ꯄꯨꯡ ৩ ꯊꯦꯡꯊꯒꯅꯤ। ꯍꯦꯜꯞꯂꯥꯏꯟ: ১১২।",
    mn_mayek: "ꯈꯨꯗꯣꯡꯊꯤꯕ ꯆꯦꯀꯁꯤꯟꯋꯥ: NH-27 ꯒꯨꯋꯥꯍꯥꯇꯤ-ꯅꯒꯥꯑꯣꯟ ꯂꯝꯕꯤꯗ ꯑꯀꯟꯕ ꯏꯁꯤꯡ ꯏꯆꯥꯑꯣ ꯊꯣꯛꯂꯦ। ꯑꯀꯟꯕ ꯀꯟꯚꯣꯏꯁꯤꯡ ꯃꯣꯔꯤꯒꯥꯑꯣꯟ ꯅꯠꯇ꯭ꯔꯒ NH-15 ꯑꯋꯥꯡ ꯊꯪꯕ ꯂꯝꯕꯤꯗ ꯍꯣꯡꯗꯣꯛꯎ। ꯃꯇꯝ: ꯄꯨꯡ ৩ ꯊꯦꯡꯊꯒꯅꯤ। ꯍꯦꯜꯞꯂꯥꯏꯟ: ১১২।",
    mn_bengali: "খুদোংথীবগী চেক্সিনৱা: NH-27 গুৱাহাটী-নগাঁও লম্বীদা অকন্বা ঈশিং ঈচাও থোক্লে। অকন্বা কনভোইশিং মোরিগাঁও নত্রগা NH-15 অৱাং থংবা লম্বীদা হোংদোকউ। মতম: পুং ৩ থেংথগনি। হেল্পলাইন: ১১২।"
  },
  'inc-nh306-kolasib': {
    en: "URGENT LOGISTICS ADVISORY: NH-306 at Bilkhawthlir (Silchar-Kolasib) has suffered massive silt subsidence. Axle weights above 18 Tonnes restricted. Medical supply convoy Medic-01 granted priority clearance. Helpline: 112 / 0389-2335842.",
    hi: "अति आवश्यक सूचना: बिलखॉथ्लिर (सिलचर-कोलासिब) में NH-306 पर भारी भू-धंसाव हुआ है। 18 टन से अधिक भारी वाहनों का आवागमन प्रतिबंधित है। आपातकालीन चिकित्सा काफिले Medic-01 को प्राथमिकता दी गई है। हेल्पलाइन: 112 / 0389-2335842।",
    as: "জৰুৰী যাতায়াত নিৰ্দেশনা: বিলখাওথলিৰত (শিলচৰ-কোলাশিব) NH-306 ত ব্যাপক ভূমিস্খলন আৰু পথ ধহি পৰিছে। ১৮ টনৰ ওপৰৰ গধুৰ বাহন নিষিদ্ধ কৰা হৈছে। জৰুৰীকালীন ঔষধবাহী বাহন Medic-01 ক অগ্ৰাধিকাৰ দিয়া হৈছে। হেল্পলাইন: ১১২।",
    bn: "জরুরি পরিবহণ বিজ্ঞপ্তি: বিলখওথলিরে (শিলচর-কোলাশিব) NH-306 সড়কে ব্যাপক ধস নেমেছে। ১৮ টনের বেশি ভারী যানবাহন চলাচল নিষিদ্ধ। জরুরি ওষুধবাহী কনভয় Medic-01 কে অগ্রাধিকারমূলক ছাড়পত্র দেওয়া হয়েছে। হেল্পলাইন: ১১২।",
    mn: "ꯈꯨꯗꯣꯡꯊꯤꯕ ꯆꯦꯀꯁꯤꯟꯋꯥ: ꯕꯤꯜꯈꯥꯎꯊ꯭ꯂꯤꯔꯗ NH-306 ꯂꯝꯕꯤ ꯂꯩꯆꯤꯜꯅ ꯊꯤꯡꯖꯤꯜꯂꯦ। ꯇꯟ ১৮ ꯒꯤ ꯃꯊꯛ ꯑꯀꯟꯕ ꯒꯥꯔꯤ ꯆꯠꯄ ꯊꯤꯡꯖꯤꯜꯂꯦ। ꯍꯤꯗꯥꯛ ꯄꯨꯕ Medic-01 ꯒꯥꯔꯤ ꯍꯥꯟꯅ ꯆꯠꯍꯟꯒꯅꯤ। ꯍꯦꯜꯞꯂꯥꯏꯟ: ১১২।",
    mn_mayek: "ꯈꯨꯗꯣꯡꯊꯤꯕ ꯆꯦꯀꯁꯤꯟꯋꯥ: ꯕꯤꯜꯈꯥꯎꯊ꯭ꯂꯤꯔꯗ NH-306 ꯂꯝꯕꯤ ꯂꯩꯆꯤꯜꯅ ꯊꯤꯡꯖꯤꯜꯂꯦ। ꯇꯟ ১৮ ꯒꯤ ꯃꯊꯛ ꯑꯀꯟꯕ ꯒꯥꯔꯤ ꯆꯠꯄ ꯊꯤꯡꯖꯤꯜꯂꯦ। ꯍꯤꯗꯥꯛ ꯄꯨꯕ Medic-01 ꯒꯥꯔꯤ ꯍꯥꯟꯅ ꯆꯠꯍꯟꯒꯅꯤ। ꯍꯦꯜꯞꯂꯥꯏꯟ: ১১২।",
    mn_bengali: "খুদোংথীবগী চেক্সিনৱা: বিলখাওথলিরদা NH-306 লম্বী লৈচিলনা থিংজিল্লে। তন ১৮ গী মথক অকন্বা গারী চৎপা থিংজিল্লে। হিদাক পুবা Medic-01 গারী হান্না চৎহনগনি। হেল্পলাইন: ১১২।"
  }
};

// Precise phonetic romanized pronunciations for English-only OS voice engines
export const PRESET_PHONETICS: Record<string, Record<LanguageId, string>> = {
  'inc-nh29-kohima': {
    en: "Emergency Dispatch: NH-29 near Kohima is completely blocked due to a major landslide. Convoys must divert via Route B Wokha.",
    hi: "Aapatkaaleen Alert: Bhaaree bhooskhalan ke kaaran Kohima ke paas NH-29 poorn roop se avaruddh hai. Sabhee bhaaree vaahanon ko Wokha hokar jaane ka nirdesh diya jaata hai. Anumaanit deree: 4 ghante.",
    as: "Zorureekaaleen sotorkobaarta: Bhoomis-kholonor baabe Kohimar ochorot NH-29 sompoornorrupe bondho hoi porise. Sokolo baaneezyik baahonok Wokha hoi boikolpik poth byobohar koriboloi nirdesh diya hoise.",
    bn: "Zoruree sotorkota: Byaapok bhoomidhosher kaarone Kohimar kaache NH-29 sompoorno oboruddho. Sokol bhaaree convoy o tanker-ke Wokha hoye bikolpo pothe jaowaar nirdesh dewa hochhe.",
    mn: "Khudongtheebagee cheksinwa: Kohimagee manakta leiba NH-29 leichil taabana maram oiduna mapoong faana thingzille. Akanba gaaree amasoong tankarsing Wokha gee lambeeda hongdok-kodabani. Matam: poong 4 thengthagani."
  },
  'inc-nh10-teesta': {
    en: "Critical Alert: Bridge submerged on NH-10 Teesta Valley due to flash floods. Impassable for heavy vehicles. Divert via Lava Algarah Reshi.",
    hi: "Gambheer chetaavanee: Teesta ghaatee mein achanak aayee baadh se NH-10 ka pul jalamagn ho gaya hai. Sabhee vaahan Lava Algarah Reshi maarg se divert karein. Anumaanit vilamb: 6 ghante.",
    as: "Gurutoro sotorkobaarta: Teesta upotyokot probol banor folot NH-10 dolong plaavito hoise. Sokolo baahonok Lava Algarah Reshi hoi jaaboloi onurodh zonowa hoise.",
    bn: "Zoruree traffic sotorkota: Teesta upotyokaay hodpa baner fole NH-10 setu nimojjito. Somosto convoy-ke Lava Algarah Reshi hoye bikolpo route-e ghorano hochhe.",
    mn: "Khudongtheebagee cheksinwa: Teesta tampakta eeshing eekaai thokpana NH-10 thong eeshingna koopsille. Akanba gaareesing Lava Algarah lambeeda hongdok-kodabani."
  },
  'inc-nh27-assam': {
    en: "Severe Flood Warning: Road waterlogging on NH-27 Guwahati Nagaon corridor. Divert via Morigaon bypass or NH-15 North Bank.",
    hi: "Gambheer baadh chetaavanee: NH-27 Guwaahaatee-Nagaon corridor par bhaaree jalbharaav. Bhaaree vaahanon ko Morigaon bypass ya uttaree tat NH-15 hokar divert kiya ja raha hai.",
    as: "Zoruree ban sotorkobaarta: NH-27 Guwaahaatee-Nagaon corridor-ot gurutoro zolomognota. Godhur convoy-somuh Morigaon baa uttor paaror NH-15 hoi bikolpo pothere zaaboloi nirdesh diya hoise.",
    bn: "Bonyazonito sotorkota: NH-27 Guwahati-Nagaon corridor-e teebro jolomognota. Bhaaree jaanbaahon-gulike Morigaon bypass baa NH-15 uttor paar diye jaowaar nirdesh dewa hochhe.",
    mn: "Khudongtheebagee cheksinwa: NH-27 Guwahati-Nagaon lambeeda akanba eeshing eechao thokle. Akanba convoysing Morigaon nattraga NH-15 lambeeda hongdok-u."
  },
  'inc-nh306-kolasib': {
    en: "Urgent Advisory: NH-306 at Bilkhawthlir has suffered massive silt subsidence. Medical supply convoy Medic-01 granted priority clearance.",
    hi: "Aapatkaaleen Soochana: Bilkhawthlir mein NH-306 par bhaaree bhoo-dhansaav hua hai. Medic-01 ko praathmikta dee gayee hai.",
    as: "Zoruree yaataayaat nirdeshonaa: Bilkhawthlirot NH-306 t byaapok bhoomis-kholon. Medic-01 k ograadhikaar diya hoise.",
    bn: "Zoruree poribohon bigyopti: Bilkhawthlire NH-306 shoroke byaapok dhos. Medic-01 ke ograadhikaar chhaarpatro dewa hoyechhe.",
    mn: "Khudongtheebagee cheksinwa: Bilkhawthlirda NH-306 leichilna thingzille. Medic-01 gaaree haanna chathangani."
  }
};

export const PHONETIC_READINGS: Record<string, string> = {
  'inc-nh29-kohima': "Emergency Dispatch: NH-29 near Kohima is completely blocked due to a major landslide. Convoys must divert via Route B Wokha.",
  'inc-nh10-teesta': "Critical Alert: Bridge submerged on NH-10 Teesta Valley due to flash floods. Convoys must divert via Lava and Algarah.",
  'inc-nh27-assam': "Severe Flood Warning: Road waterlogging on NH-27 Guwahati Nagaon corridor. Divert via Morigaon bypass or NH-15 North Bank.",
  'inc-nh306-kolasib': "Urgent Advisory: NH-306 at Bilkhawthlir has suffered massive silt subsidence. Medical supply convoy Medic-01 granted priority clearance.",
};

// Precise calm broadcast speech scripts tailored for natural pauses and coherent emergency dispatch delivery
export const CALM_BROADCAST_SCRIPTS: Record<string, Record<LanguageId, string>> = {
  'inc-nh29-kohima': {
    en: "Attention all commercial drivers. ... Urgent road advisory for National Highway 29. ... The highway near Kohima is completely blocked due to a major landslide. ... Please divert your convoys via Route B, Wokha. ... Estimated delay is 4 hours. ... Drive safely.",
    hi: "कृपया सभी चालक ध्यान दें। ... राष्ट्रीय राजमार्ग 29 पर आवश्यक सूचना। ... कोहिमा के पास, भारी भूस्खलन के कारण मार्ग पूरी तरह बंद है। ... सभी भारी वाहन, वोखा मार्ग से डायवर्ट करें। ... संभावित विलंब, चार घंटे। ... सुरक्षित रहें।",
    as: "সকলো চালকে মনোযোগ দিয়ক। ... ৰাষ্ট্ৰীয় ঘাইপথ 29ৰ জৰুৰী জাননী। ... কহিমাৰ ওচৰত, ভূমিস্খলনৰ বাবে পথ সম্পূৰ্ণৰূপে বন্ধ হৈ আছে। ... সকলো কনভয়ে, ৱোখা হৈ বিকল্প পথ লওক। ... আনুমানিক পলম, চাৰি ঘণ্টা। ... সতৰ্ক হৈ গাড়ী চলাওক।",
    bn: "সকল চালক অনুগ্রহ করে মনোযোগ দিন। ... জাতীয় সড়ক 29-এ জরুরি সতর্কতা। ... কোহিমার কাছে, ব্যাপক ভূমিধসের কারণে রাস্তা সম্পূর্ণ বন্ধ। ... সকল কনভয়কে ওখা দিয়ে বিকল্প পথে যাওয়ার অনুরোধ করা হচ্ছে। ... সম্ভাব্য বিলম্ব, চার ঘণ্টা। ... সাবধানে চলুন।",
    mn: "গারী থৌবশিং, মপুং ফানা মনোযোগ পীবীয়ু। ... নেসনেল হাইৱে 29গী চেক্সিনৱা। ... কোহিমাগী মনাক্তা, লৈচিল তাবনা মরম ওইদুনা লম্বী মপুং ফানা থিংজিল্লে। ... অকন্বা গারীশিং, ৱোখা লম্বীদা হোংদোকউ। ... মতম, পুং মরি থেংথগনি। ... চেক্সিন্না থৌবীয়ু।"
  },
  'inc-nh10-teesta': {
    en: "Attention drivers. ... Critical advisory for National Highway 10. ... The Teesta Valley bridge is submerged due to flash floods. ... Heavy convoys must divert via Lava, Algarah, and Reshi. ... Estimated delay is 6 hours. ... Do not attempt to cross.",
    hi: "कृपया सभी चालक ध्यान दें। ... राष्ट्रीय राजमार्ग 10 पर गंभीर चेतावनी। ... तीस्ता घाटी का पुल अचानक आई बाढ़ से जलमग्न हो गया है। ... भारी वाहन, लावा, अल्गड़ा और रेशी मार्ग से डायवर्ट करें। ... अनुमानित विलंब, छह घंटे। ... कृपया सुरक्षित रहें।",
    as: "সকলো চালকে মনোযোগ দিয়ক। ... ৰাষ্ট্ৰীয় ঘাইপথ 10ৰ গুৰুতৰ সতৰ্কবাৰ্তা। ... তিস্তা উপত্যকাৰ দলং প্লাৱিত হৈছে। ... সকলো গধুৰ বাহনে, লাভা, আলগাড়া আৰু ৰেছি হৈ বিকল্প পথ লওক। ... আনুমানিক পলম, ছয় ঘণ্টা। ... দলং পাৰ হ'বলৈ চেষ্টা নকৰিব।",
    bn: "সকল চালক অনুগ্রহ করে মনোযোগ দিন। ... জাতীয় সড়ক 10-এ জরুরি ট্রাফিক সতর্কতা। ... তিস্তা নদীর হড়পা বানে সেতু নিমজ্জিত। ... সমস্ত ভারী কনভয়কে লাভা, আলগাড়া ও রেশি হয়ে বিকল্প রুটে ঘোরানো হচ্ছে। ... সম্ভাব্য বিলম্ব, ছয় ঘণ্টা। ... সাবধানে চলুন।",
    mn: "গারী থৌবশিং, মনোযোগ পীবীয়ু। ... নেসনেল হাইৱে 10গী চেক্সিনৱা। ... তিস্তা তমপাক্তা ঈশিং ঈকাঈ থোকপনা থোং কুপশিল্লে। ... অকন্বা পোৎপু গারীশিং, লাভা, অলগারা লম্বীদা হোংদোকউ। ... মতম, পুং তরুক থেংথগনি।"
  },
  'inc-nh27-assam': {
    en: "Attention commercial drivers. ... Flood warning on National Highway 27. ... Severe waterlogging between Jagiroad and Roha. ... Heavy vehicles must divert via Morigaon bypass or North Bank NH-15. ... Estimated delay is 3 hours. ... Drive safely.",
    hi: "कृपया सभी चालक ध्यान दें। ... राष्ट्रीय राजमार्ग 27 पर बाढ़ की चेतावनी। ... जागीरोड और रोहा के बीच भारी जलभराव है। ... सभी वाहन, मोरीगांव बाईपास या उत्तरी तट NH-15 होकर निकलें। ... संभावित देरी, तीन घंटे। ... सुरक्षित चलें।",
    as: "সকলো চালকে মনোযোগ দিয়ক। ... ৰাষ্ট্ৰীয় ঘাইপথ 27ৰ বান সতৰ্কবাৰ্তা। ... জাগীৰোড আৰু ৰহাৰ মাজত প্ৰৱল জলমগ্নতা। ... গধুৰ বাহনসমূহ, মৰিগাঁও বা উত্তৰ পাৰৰ NH-15 হৈ বিকল্প পথ লওক। ... আনুমানিক পলম, তিনি ঘণ্টা। ... সতৰ্ক হৈ গাড়ী চলাওক।",
    bn: "সকল চালক অনুগ্রহ করে মনোযোগ দিন। ... জাতীয় সড়ক 27-এ বন্যা সতর্কতা। ... জাগীরোড ও রহার মধ্যে তীব্র জলমগ্নতা। ... ভারী যানবাহনগুলিকে মরিগাঁও বাইপাস বা NH-15 উত্তর পাড় দিয়ে যাওয়ার নির্দেশ দেওয়া হচ্ছে। ... সম্ভাব্য বিলম্ব, তিন ঘণ্টা। ... সাবধানে চলুন।",
    mn: "গারী থৌবশিং, মনোযোগ পীবীয়ু। ... নেসনেল হাইৱে 27গী চেক্সিনৱা। ... জাগীরোড অমসুং রহার মরক্তা ঈশিং ঈচাও থোক্লে। ... অকন্বা কনভোইশিং মোরিগাঁও নত্রগা NH-15 লম্বীদা হোংদোকউ। ... মতম, পুং অহুম থেংথগনি। ... চেক্সিন্না থৌবীয়ু।"
  },
  'inc-nh306-kolasib': {
    en: "Attention convoy drivers. ... National Highway 306 Bilkhawthlir advisory. ... Major silt subsidence active. ... Heavy vehicles above 18 tonnes restricted. ... Medical convoy Medic-01 granted priority clearance. ... Proceed with caution.",
    hi: "कृपया सभी चालक ध्यान दें। ... राष्ट्रीय राजमार्ग 306 बिलखॉथ्लिर पर आवश्यक सूचना। ... भारी भू-धंसाव के कारण 18 टन से अधिक भारी वाहन प्रतिबंधित हैं। ... आपातकालीन चिकित्सा काफिले Medic-01 को प्राथमिकता। ... सावधानी से चलें।",
    as: "সকলো চালকে মনোযোগ দিয়ক। ... ৰাষ্ট্ৰীয় ঘাইপথ 306 বিলখাওথলিৰৰ জাননী। ... ভূমিস্খলনৰ বাবে ১৮ টনৰ ওপৰৰ গধুৰ বাহন নিষিদ্ধ। ... জৰুৰীকালীন ঔষধবাহী বাহন Medic-01 ক অগ্ৰাধিকাৰ দিয়া হৈছে। ... সতৰ্ক হৈ গাড়ী চলাওক।",
    bn: "সকল চালক অনুগ্রহ করে মনোযোগ দিন। ... জাতীয় সড়ক 306 বিলখওথলির বিজ্ঞপ্তি। ... ব্যাপক ধসের কারণে ১৮ টনের বেশি ভারী যানবাহন চলাচল নিষিদ্ধ। ... জরুরি ওষুধবাহী কনভয় Medic-01 কে অগ্রাধিকারমূলক ছাড়পত্র। ... সাবধানে চলুন।",
    mn: "গারী থৌবশিং, মনোযোগ পীবীয়ু। ... নেসনেল হাইৱে 306 বিলখাওথলিরগী চেক্সিনৱা। ... লৈচিলনা তন ১৮ গী মথক অকন্বা গারী চৎপা থিংজিল্লে। ... হিদাক পুবা Medic-01 গারী হান্না চৎহনগনি।"
  }
};

/**
 * Resolves the optimal text and language code for calm, coherent TTS playback
 */
export function getCalmBroadcastSpeechText(
  incident: any,
  langId: LanguageId,
  customText?: string
): string {
  const incId = incident?.id || incident?.incidentId;
  if (incId && CALM_BROADCAST_SCRIPTS[incId]?.[langId]) {
    return CALM_BROADCAST_SCRIPTS[incId][langId];
  }

  const hw = incident?.highway || 'Highway';
  const loc = incident?.district || incident?.stretch || incident?.location || 'Sector';
  const disruption = incident?.disruptionType || incident?.severity || 'obstruction';
  const detour = incident?.detourRoute || incident?.detour || 'alternate bypass';
  const delay = incident?.estimatedDelay || 'few hours';

  switch (langId) {
    case 'hi':
      return `कृपया सभी चालक ध्यान दें। ... ${hw} पर आवश्यक सूचना। ... ${loc} के पास, ${disruption} के कारण मार्ग बाधित है। ... कृपया ${detour} होकर वैकल्पिक मार्ग लें। ... संभावित विलंब, ${delay}। ... सुरक्षित रहें।`;
    case 'as':
      return `সকলো চালকে মনোযোগ দিয়ক। ... ${hw} পথৰ জৰুৰী জাননী। ... ${loc}ৰ ওচৰত, ${disruption}ৰ বাবে পথ বন্ধ হৈ আছে। ... অনুগ্ৰহ কৰি, ${detour} হৈ বিকল্প পথ লওক। ... আনুমানিক পলম, ${delay}। ... সতৰ্ক হৈ গাড়ী চলাওক।`;
    case 'bn':
      return `সকল চালক অনুগ্রহ করে মনোযোগ দিন। ... ${hw} রুটে জরুরি সতর্কতা। ... ${loc}-এর কাছে, ${disruption}-এর কারণে রাস্তা বন্ধ রয়েছে। ... অনুগ্রহ করে, ${detour} দিয়ে বিকল্প পথে চলুন। ... সম্ভাব্য বিলম্ব, ${delay}। ... সাবধানে চলুন।`;
    case 'mn':
      return `গারী থৌবশিং, মপুং ফানা মনোযোগ পীবীয়ু। ... ${hw} লম্বীগী চেক্সিনৱা। ... ${loc} মনাক্তা, ${disruption} থোকপনা মরম ওইদুনা লম্বী থিংজিল্লে। ... অনুগ্রোহ তৌদুনা, ${detour} লম্বীদা হোংদোকউ। ... মতম, ${delay} থেংথগনি। ... চেক্সিন্না থৌবীয়ু।`;
    default:
      return `Attention all commercial drivers. ... Road advisory for ${hw}. ... The route near ${loc} is blocked due to ${disruption}. ... Please divert via ${detour}. ... Estimated delay, ${delay}. ... Drive safely.`;
  }
}

/**
 * Generates dynamic localized templates for custom or preset incidents
 */
export function generateLocalizedAlerts(
  incident: any,
  preferMeiteiMayek = true
): PresetTranslationEntry {
  const incId = incident?.id || incident?.incidentId;
  if (incId && PRESET_TRANSLATIONS[incId]) {
    const p = PRESET_TRANSLATIONS[incId];
    return {
      en: p.en,
      hi: p.hi,
      as: p.as,
      bn: p.bn,
      mn: preferMeiteiMayek ? p.mn_mayek : p.mn_bengali,
      mn_mayek: p.mn_mayek,
      mn_bengali: p.mn_bengali,
    };
  }

  // Dynamic interpolation engine for custom incidents
  const hw = incident.highway || 'NH Corridor';
  const loc = incident.district || incident.stretch || incident.location || 'NER Sector';
  const disruption = incident.disruptionType || incident.severity || 'Obstruction';
  const detour = incident.detourRoute || incident.detour || 'Designated Alternate Bypass';
  const delay = incident.estimatedDelay || `${incident.delayHours || 4} Hours`;
  const help = incident.helpline || '112';

  const en = `CRITICAL LOGISTICS DISPATCH: ${hw} near ${loc} is BLOCKED due to ${disruption}. All commercial convoys and tankers must divert via ${detour}. Estimated delay: ${delay}. Emergency Helpline: ${help}.`;
  const hi = `आपातकालीन अलर्ट: ${loc} के पास ${disruption} के कारण ${hw} बाधित है। सभी व्यावसायिक वाहनों एवं टैंकरों को ${detour} होकर जाने का निर्देश दिया जाता है। अनुमानित विलंब: ${delay}। हेल्पलाइन: ${help}।`;
  const as = `জৰুৰীকালীন সতৰ্কবাৰ্তা: ${loc}ৰ ওচৰত ${disruption}ৰ বাবে ${hw} সম্পূৰ্ণৰূপে ব্যাহত হৈ পৰিছে। সকলো বাণিজ্যিক কনভয়ক ${detour} হৈ যাবলৈ নিৰ্দেশ দিয়া হৈছে। আনুমানিক পলম: ${delay}। হেল্পলাইন: ${help}।`;
  const bn = `জরুরি ট্রাফিক সতর্কতা: ${loc}-এর কাছে ${disruption}-এর কারণে ${hw} অবরুদ্ধ হয়েছে। সমস্ত বাণিজ্যিক কনভয় ও ট্যাঙ্কারকে ${detour} দিয়ে ঘোরানো হচ্ছে। সম্ভাব্য বিলম্ব: ${delay}। হেল্পলাইন: ${help}।`;
  const mn_mayek = `ꯈꯨꯗꯣꯡꯊꯤꯕ ꯆꯦꯀꯁꯤꯟꯋꯥ: ${loc} ꯃꯅꯥꯛꯇ ${hw} ꯂꯝꯕꯤꯗ ${disruption} ꯊꯣꯛꯄꯅ ꯃꯔꯝ ꯑꯣꯏꯗꯨꯅ ꯊꯤꯡꯖꯤꯜꯂꯦ। ꯄꯣꯠꯄꯨ ꯒꯥꯔꯤꯁꯤꯡ ${detour} ꯒꯤ ꯂꯝꯕꯤꯗ ꯍꯣꯡꯗꯣꯛꯎ। ꯃꯇꯝ: ${delay} ꯊꯦꯡꯊꯒꯅꯤ। ꯍꯦꯜꯞꯂꯥꯏꯟ: ${help}।`;
  const mn_bengali = `খুদোংথীবগী চেক্সিনৱা: ${loc} মনাক্তা ${hw} লম্বীদা ${disruption} থোকপনা মরম ওইদুনা থিংজিল্লে। পোৎপু গারীশিং ${detour} গী লম্বীদা হোংদোকউ। মতম: ${delay} থেংথগনি। হেল্পলাইন: ${help}।`;

  return {
    en,
    hi,
    as,
    bn,
    mn: preferMeiteiMayek ? mn_mayek : mn_bengali,
    mn_mayek,
    mn_bengali,
  };
}

/**
 * Telecom GSM & Unicode SMS Segment Calculator
 */
export function calculateSmsMetrics(text: string, isUnicode = false) {
  const length = text ? text.length : 0;
  const hasUnicodeChars = /[^\u0000-\u00ff]/.test(text || '');
  const effectiveUnicode = isUnicode || hasUnicodeChars;

  if (!effectiveUnicode) {
    if (length <= 160) {
      return {
        segments: length === 0 ? 0 : 1,
        maxPerSegment: 160,
        remainingInSegment: 160 - length,
        isUnicode: false,
        totalChars: length,
      };
    } else {
      const segments = Math.ceil(length / 153);
      const remainingInSegment = segments * 153 - length;
      return {
        segments,
        maxPerSegment: 153,
        remainingInSegment,
        isUnicode: false,
        totalChars: length,
      };
    }
  } else {
    if (length <= 70) {
      return {
        segments: length === 0 ? 0 : 1,
        maxPerSegment: 70,
        remainingInSegment: 70 - length,
        isUnicode: true,
        totalChars: length,
      };
    } else {
      const segments = Math.ceil(length / 67);
      const remainingInSegment = segments * 67 - length;
      return {
        segments,
        maxPerSegment: 67,
        remainingInSegment,
        isUnicode: true,
        totalChars: length,
      };
    }
  }
}

/**
 * Generate synchronized 5-language broadcast text from any reported incident
 */
export function generateBroadcastForIncident(
  highway: string,
  location: string,
  severity: string,
  detour: string
): Record<LanguageId, string> {
  return {
    en: `ALERT: ${severity} reported on ${highway} near ${location}. Convoys advised to divert via ${detour}. Follow BRO traffic guidance. Emergency Helpline: 112.`,
    hi: `चेतावनी: ${highway} पर ${location} के पास ${severity} दर्ज की गई है। सभी वाहनों को ${detour} होकर जाने की सलाह दी जाती है। हेल्पलाइन: 112।`,
    as: `সতৰ্কবাৰ্তা: ${location}ৰ ওচৰত ${highway}ত ${severity} হৈছে। বাহনসমূহক ${detour} হৈ বিকল্প পথেৰে যাবলৈ অনুৰোধ জনোৱা হৈছে। হেল্পলাইন: ১১২।`,
    bn: `সতর্কতা: ${location}-এর কাছে ${highway}-তে ${severity} ঘটেছে। সকল যানবাহনকে ${detour} হয়ে যাওয়ার নির্দেশ দেওয়া হচ্ছে। হেল্পলাইন: ১১২।`,
    mn: `ꯈꯨꯗꯣꯡꯊꯤꯕ ꯆꯦꯀꯁꯤꯟꯋꯥ: ${highway} ꯒꯤ ${location} ꯃꯅꯥꯛꯇ ${severity} ꯊꯣꯛꯂꯦ। ꯒꯥꯔꯤꯁꯤꯡ ${detour} ꯂꯝꯕꯤꯗ ꯍꯣꯡꯗꯣꯛꯎ। ꯍꯦꯜꯞꯂꯥꯏꯟ: ১১২।`,
  };
}
