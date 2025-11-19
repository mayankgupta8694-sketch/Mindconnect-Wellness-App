import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, query, addDoc, serverTimestamp, setLogLevel, getDocs } from 'firebase/firestore';

// --- Global Variables (Provided by Canvas) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
// API_KEY is set to "" for Canvas environment usage.
const API_KEY = ""; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent`;

// --- Logo Component (Using SVG directly to prevent string literal errors) ---
const LogoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        {/* Simplified brain/mind icon design */}
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
    </svg>
);

// --- Global Constants ---
const API_KEY_QUERY = API_KEY ? `?key=${API_KEY}` : '';
const AGE_GROUPS = [
    { id: 'teen', label: 'Teen (13-17)' },
    { id: 'adult', label: 'Adult (18-64)' },
    { id: 'elder', label: 'Elder (65+)' }
];

// --- Authentication Statuses ---
const AUTH_STATUS = {
    ANONYMOUS: 'anonymous',
    AUTHENTICATED: 'authenticated',
    UNINITIALIZED: 'uninitialized'
};

// --- Comprehensive Quiz Data: English ---
const EN_QUIZ_QUESTIONS = {
    'teen': [
        { q: "How often do you feel overwhelmed by schoolwork or social pressure?", options: [{ text: "Rarely/Never", score: 1 }, { text: "Sometimes", score: 3 }, { text: "Often/Always", score: 5 }] },
        { q: "How would you describe your sleep patterns in the last week?", options: [{ text: "Consistent and restful", score: 1 }, { text: "A bit irregular", score: 3 }, { text: "Very poor, trouble falling or staying asleep", score: 5 }] },
        { q: "Do you feel comfortable talking to an adult about your problems?", options: [{ text: "Yes, always", score: 1 }, { text: "Sometimes, depending on the topic", score: 3 }, { text: "No, I keep things to myself", score: 5 }] },
        { q: "How often do you compare yourself negatively to others on social media?", options: [{ text: "Rarely/Never", score: 1 }, { text: "Sometimes", score: 3 }, { text: "Often/Constantly", score: 5 }] },
        { q: "How would you rate your general mood over the past two weeks?", options: [{ text: "Mostly positive and energized", score: 1 }, { text: "Up and down, but manageable", score: 3 }, { text: "Often down, lacking motivation", score: 5 }] },
        { q: "When faced with a major setback, how easily do you bounce back?", options: [{ text: "Very easily, I see it as a lesson", score: 1 }, { text: "It takes me a few days", score: 3 }, { text: "I struggle to recover and feel stuck", score: 5 }] },
        { q: "How satisfied are you with the friendships and social connections in your life?", options: [{ text: "Very satisfied, strong connections", score: 1 }, { text: "Okay, but sometimes feel misunderstood", score: 3 }, { text: "Dissatisfied, feel isolated/lonely", score: 5 }] },
        { q: "How often do you feel excessively worried about the future (e.g., college, career)?", options: [{ text: "Rarely", score: 1 }, { text: "Occasionally, when I think about it", score: 3 }, { text: "Constantly, it interferes with my day", score: 5 }] },
        { q: "How frequently do you use constructive coping mechanisms (e.g., exercise, hobbies, talking to someone) when stressed?", options: [{ text: "Always/Most of the time", score: 1 }, { text: "Sometimes, I rely on distractions too", score: 3 }, { text: "Rarely, I usually just avoid the issue", score: 5 }] },
        { q: "How often do you feel like you are genuinely understood by your peers or family?", options: [{ text: "Most of the time", score: 1 }, { text: "Only sometimes", score: 3 }, { text: "Rarely or never", score: 5 }] },
    ],
    'adult': [
        { q: "How balanced do you feel between your work/career and personal life?", options: [{ text: "Very balanced, good separation", score: 1 }, { text: "A little stressed, but manageable", score: 3 }, { text: "Overwhelmed, no time for myself", score: 5 }] },
        { q: "In the past month, how often have you felt irritable or easily annoyed?", options: [{ text: "Very rarely", score: 1 }, { text: "A few times a week", score: 3 }, { text: "Most days", score: 5 }] },
        { q: "How frequently do you engage in activities you genuinely enjoy (hobbies, relaxation)?", options: [{ text: "Daily or almost daily", score: 1 }, { text: "Once or twice a week", score: 3 }, { text: "Rarely or not at all", score: 5 }] },
        { q: "How confident do you feel about your current financial stability?", options: [{ text: "Very confident, secure", score: 1 }, { text: "A little worried, but managing", score: 3 }, { text: "Highly anxious, feel overwhelmed by debt/lack of savings", score: 5 }] },
        { q: "How often do you wake up feeling refreshed and well-rested?", options: [{ text: "Most mornings", score: 1 }, { text: "Sometimes", score: 3 }, { text: "Rarely or never", score: 5 }] },
        { q: "When facing a conflict in a close relationship, how do you typically respond?", options: [{ text: "Calmly and seek mutual resolution", score: 1 }, { text: "Become defensive or withdraw slightly", score: 3 }, { text: "Become highly emotional or avoid the person entirely", score: 5 }] },
        { q: "How frequently do you use alcohol, smoking, or overeating to cope with stress?", options: [{ text: "Never or very rarely", score: 1 }, { text: "Occasionally", score: 3 }, { text: "Frequently, relying on them for comfort", score: 5 }] },
        { q: "How would you describe your overall concentration and focus at work/home in the last month?", options: [{ text: "Sharp and reliable", score: 1 }, { text: "Sometimes scattered", score: 3 }, { text: "Poor, I struggle to complete tasks", score: 5 }] },
        { q: "How often do you feel a sense of purpose or meaning in your daily life?", options: [{ text: "Most of the time", score: 1 }, { text: "Sometimes I question my direction", score: 3 }, { text: "Rarely, I feel directionless", score: 5 }] },
        { q: "How frequently do minor problems seem to escalate and feel overwhelming?", options: [{ text: "Rarely, I keep perspective", score: 1 }, { text: "Sometimes, depending on my mood", score: 3 }, { text: "Often, small things trigger strong stress", score: 5 }] },
    ],
    'elder': [
        { q: "How satisfied are you with the amount of social interaction you have?", options: [{ text: "Very satisfied, feel connected", score: 1 }, { text: "Could be better, occasionally lonely", score: 3 }, { text: "Very lonely, often isolated", score: 5 }] },
        { q: "Do you have any persistent physical discomfort that affects your mood?", options: [{ text: "No significant discomfort", score: 1 }, { text: "Minor, manageable aches", score: 3 }, { text: "Yes, it significantly drains my energy and mood", score: 5 }] },
        { q: "How optimistic do you feel about the future and upcoming events?", options: [{ text: "Very optimistic and hopeful", score: 1 }, { text: "Neutral or cautiously optimistic", score: 3 }, { text: "Often worried or pessimistic", score: 5 }] },
        { q: "How often do you feel connected to family members or close friends?", options: [{ text: "Daily or almost daily", score: 1 }, { text: "A few times a month", score: 3 }, { text: "Rarely, I feel mostly disconnected", score: 5 }] },
        { q: "How would you rate your ability to adapt to changes in your routine or living situation?", options: [{ text: "Very flexible and adaptable", score: 1 }, { text: "It takes me time, but I manage", score: 3 }, { text: "I find change very difficult and unsettling", score: 5 }] },
        { q: "How often in the last month have you felt a lack of energy or fatigue?", options: [{ text: "Rarely", score: 1 }, { text: "Often in the afternoon", score: 3 }, { text: "Most of the time, regardless of sleep", score: 5 }] },
        { q: "Do you engage in any mentally stimulating activities (e.g., reading, puzzles, learning)?", options: [{ text: "Yes, several times a week", score: 1 }, { text: "Occasionally", score: 3 }, { text: "Rarely or never", score: 5 }] },
        { q: "How comfortable are you accepting help or support from others when needed?", options: [{ text: "Very comfortable", score: 1 }, { text: "I prefer to handle things myself but will accept", score: 3 }, { text: "Very uncomfortable or refuse help", score: 5 }] },
        { q: "How often do you reflect positively on your life's accomplishments and memories?", options: [{ text: "Frequently, with gratitude", score: 1 }, { text: "Sometimes, but often focus on regrets", score: 3 }, { text: "Rarely, I feel regretful or sad about the past", score: 5 }] },
        { q: "How secure do you feel about your independence and ability to care for yourself?", options: [{ text: "Very secure and capable", score: 1 }, { text: "Slightly worried about the future", score: 3 }, { text: "Highly dependent or anxious about losing independence", score: 5 }] },
    ],
};

// --- Comprehensive Quiz Data: Hindi (Updated translations for elder 5-10) ---
const HI_QUIZ_QUESTIONS = {
    'teen': [
        { q: "स्कूल के काम या सामाजिक दबाव से आप कितनी बार अभिभूत महसूस करते हैं?", options: [{ text: "शायद ही कभी/कभी नहीं", score: 1 }, { text: "कभी-कभी", score: 3 }, { text: "अक्सर/हमेशा", score: 5 }] },
        { q: "पिछले सप्ताह आपकी नींद के पैटर्न कैसे रहे?", options: [{ text: "लगातार और आरामदायक", score: 1 }, { text: "थोड़ा अनियमित", score: 3 }, { text: "बहुत खराब, सोने या जागते रहने में परेशानी", score: 5 }] },
        { q: "क्या आप अपनी समस्याओं के बारे में किसी वयस्क से बात करने में सहज महसूस करते हैं?", options: [{ text: "हाँ, हमेशा", score: 1 }, { text: "कभी-कभी, विषय पर निर्भर करता है", score: 3 }, { text: "नहीं, मैं बातें अपने तक रखता हूँ", score: 5 }] },
        { q: "सोशल मीडिया पर आप कितनी बार अपनी नकारात्मक तुलना दूसरों से करते हैं?", options: [{ text: "शायद ही कभी/कभी नहीं", score: 1 }, { text: "कभी-कभी", score: 3 }, { text: "अक्सर/लगातार", score: 5 }] },
        { q: "पिछले दो हफ्तों में आपने अपनी सामान्य मनोदशा को कैसे रेटिंग देंगे?", options: [{ text: "अधिकांशतः सकारात्मक और ऊर्जावान", score: 1 }, { text: "उतार-चढ़ाव वाला, लेकिन प्रबंधनीय", score: 3 }, { text: "अक्सर उदास, प्रेरणा की कमी", score: 5 }] },
        { q: "जब कोई बड़ी बाधा आती है, तो आप कितनी आसानी से उबर पाते हैं?", options: [{ text: "बहुत आसानी से, मैं इसे एक सबक मानता हूँ", score: 1 }, { text: "मुझे कुछ दिन लगते हैं", score: 3 }, { text: "मैं उबरने के लिए संघर्ष करता हूँ और फँसा हुआ महसूस करता हूँ", score: 5 }] },
        { q: "आप अपने जीवन में दोस्ती और सामाजिक संपर्कों से कितने संतुष्ट हैं?", options: [{ text: "बहुत संतुष्ट, मजबूत संबंध", score: 1 }, { text: "ठीक है, लेकिन कभी-कभी गलत समझा जाता हूँ", score: 3 }, { text: "असंतुष्ट, अलग/अकेला महसूस करता हूँ", score: 5 }] },
        { q: "आप भविष्य (जैसे, कॉलेज, करियर) के बारे में अत्यधिक चिंतित कितनी बार महसूस करते हैं?", options: [{ text: "शायद ही कभी", score: 1 }, { text: "कभी-कभी, जब मैं इसके बारे में सोचता हूँ", score: 3 }, { text: "लगातार, यह मेरे दिनचर्या में हस्तक्षेप करता है", score: 5 }] },
        { q: "तनावग्रस्त होने पर आप रचनात्मक मुकाबला तंत्र (जैसे, व्यायाम, शौक, किसी से बात करना) का उपयोग कितनी बार करते हैं?", options: [{ text: "हमेशा/अधिकांश समय", score: 1 }, { text: "कभी-कभी, मैं ध्यान भटकाने पर भी निर्भर करता हूँ", score: 3 }, { text: "शायद ही कभी, मैं आमतौर पर समस्या से बचता हूँ", score: 5 }] },
        { q: "आपको कितनी बार लगता है कि आपके सहकर्मी या परिवार आपको वास्तव में समझते हैं?", options: [{ text: "अधिकांश समय", score: 1 }, { text: "केवल कभी-कभी", score: 3 }, { text: "शायद ही कभी या कभी नहीं", score: 5 }] },
    ],
    'adult': [
        { q: "आप अपने काम/करियर और निजी जीवन के बीच कितना संतुलन महसूस करते हैं?", options: [{ text: "बहुत संतुलित, अच्छा अलगाव", score: 1 }, { text: "थोड़ा तनावग्रस्त, लेकिन प्रबंधनीय", score: 3 }, { text: "अभिभूत, मेरे लिए समय नहीं", score: 5 }] },
        { q: "पिछले महीने में, आपने कितनी बार चिड़चिड़ा या आसानी से नाराज महसूस किया है?", options: [{ text: "बहुत शायद ही कभी", score: 1 }, { text: "सप्ताह में कुछ बार", score: 3 }, { text: "अधिकांश दिन", score: 5 }] },
        { q: "आप कितनी बार उन गतिविधियों में शामिल होते हैं जिनका आप वास्तव में आनंद लेते हैं (शौक, विश्राम)?", options: [{ text: "दैनिक या लगभग दैनिक", score: 1 }, { text: "सप्ताह में एक या दो बार", score: 3 }, { text: "शायद ही कभी या बिल्कुल नहीं", score: 5 }] },
        { q: "आप अपनी वर्तमान वित्तीय स्थिरता के बारे में कितना आश्वस्त महसूस करते हैं?", options: [{ text: "बहुत आश्वस्त, सुरक्षित", score: 1 }, { text: "थोड़ा चिंतित, लेकिन प्रबंध कर रहा हूँ", score: 3 }, { text: "अत्यधिक चिंतित, ऋण/बचत की कमी से अभिभूत महसूस करता हूँ", score: 5 }] },
        { q: "आप कितनी बार तरोताजा और अच्छी तरह से आराम महसूस करके जागते हैं?", options: [{ text: "अधिकांश सुबह", score: 1 }, { text: "कभी-कभी", score: 3 }, { text: "शायद ही कभी या कभी नहीं", score: 5 }] },
        { q: "करीबी रिश्ते में संघर्ष का सामना करने पर आप आमतौर पर कैसे प्रतिक्रिया करते हैं?", options: [{ text: "शांति से और आपसी समाधान चाहते हैं", score: 1 }, { text: "रक्षात्मक हो जाते हैं या थोड़ा पीछे हट जाते हैं", score: 3 }, { text: "अत्यधिक भावुक हो जाते हैं या व्यक्ति से पूरी तरह बचते हैं", score: 5 }] },
        { q: "तनाव से निपटने के लिए आप कितनी बार शराब, धूम्रपान, या अत्यधिक खाने का उपयोग करते हैं?", options: [{ text: "कभी नहीं या बहुत शायद ही कभी", score: 1 }, { text: "कभी-कभी", score: 3 }, { text: "अक्सर, आराम के लिए उन पर निर्भर रहते हैं", score: 5 }] },
        { q: "पिछले महीने में आपने काम/घर पर अपनी समग्र एकाग्रता और ध्यान को कैसे रेटिंग देंगे?", options: [{ text: "तेज और विश्वसनीय", score: 1 }, { text: "कभी-कभी बिखरा हुआ", score: 3 }, { text: "खराब, मैं कार्यों को पूरा करने के लिए संघर्ष करता हूँ", score: 5 }] },
        { q: "आप कितनी बार अपने दैनिक जीवन में उद्देश्य या अर्थ की भावना महसूस करते हैं?", options: [{ text: "अधिकांश समय", score: 1 }, { text: "कभी-कभी मैं अपनी दिशा पर सवाल उठाता हूँ", score: 3 }, { text: "शायद ही कभी, मैं दिशाहीन महसूस करता हूँ", score: 5 }] },
        { q: "छोटी-मोटी समस्याएं कितनी बार बढ़ जाती हैं और भारी महसूस होती हैं?", options: [{ text: "शायद ही कभी, मैं परिप्रेक्ष्य रखता हूँ", score: 1 }, { text: "कभी-कभी, मेरे मूड पर निर्भर करता है", score: 3 }, { text: "अक्सर, छोटी चीजें मजबूत तनाव को ट्रिगर करती हैं", score: 5 }] },
    ],
    'elder': [
        { q: "आप कितने सामाजिक संपर्क से संतुष्ट हैं?", options: [{ text: "बहुत संतुष्ट, जुड़ाव महसूस करता हूँ", score: 1 }, { text: "बेहतर हो सकता है, कभी-कभी अकेलापन", score: 3 }, { text: "बहुत अकेलापन, अक्सर अलग-थलग", score: 5 }] },
        { q: "क्या आपको कोई लगातार शारीरिक परेशानी है जो आपके मूड को प्रभावित करती है?", options: [{ text: "कोई महत्वपूर्ण असुविधा नहीं", score: 1 }, { text: "मामूली, प्रबंधनीय दर्द", score: 3 }, { text: "हाँ, यह मेरी ऊर्जा और मूड को काफी हद तक खत्म कर देता है", score: 5 }] },
        { q: "आप भविष्य और आने वाली घटनाओं के बारे में कितना आशावादी महसूस करते हैं?", options: [{ text: "बहुत आशावादी और आशावान", score: 1 }, { text: "तटस्थ या सावधानीपूर्वक आशावादी", score: 3 }, { text: "अक्सर चिंतित या निराशावादी", score: 5 }] },
        { q: "आप कितनी बार परिवार के सदस्यों या करीबी दोस्तों से जुड़ाव महसूस करते हैं?", options: [{ text: "दैनिक या लगभग दैनिक", score: 1 }, { text: "महीने में कुछ बार", score: 3 }, { text: "शायद ही कभी, मैं ज्यादातर अलग-थलग महसूस करता हूँ", score: 5 }] },
        { q: "आप अपनी दिनचर्या या रहने की स्थिति में बदलाव के अनुकूल होने की अपनी क्षमता को कैसे रेटिंग देंगे?", options: [{ text: "बहुत लचीला और अनुकूलनीय", score: 1 }, { text: "मुझे समय लगता है, लेकिन मैं प्रबंधित करता हूँ", score: 3 }, { text: "मुझे बदलाव बहुत मुश्किल और परेशान करने वाला लगता है", score: 5 }] },
        { q: "पिछले महीने में आपने कितनी बार ऊर्जा या थकान की कमी महसूस की है?", options: [{ text: "शायद ही कभी", score: 1 }, { text: "अक्सर दोपहर में", score: 3 }, { text: "अधिकांश समय, नींद की परवाह किए बिना", score: 5 }] },
        { q: "क्या आप किसी भी मानसिक रूप से उत्तेजक गतिविधियों (जैसे, पढ़ना, पहेलियाँ, सीखना) में शामिल होते हैं?", options: [{ text: "हाँ, सप्ताह में कई बार", score: 1 }, { text: "कभी-कभी", score: 3 }, { text: "शायद ही कभी या कभी नहीं", score: 5 }] },
        { q: "जरूरत पड़ने पर आप दूसरों से मदद या समर्थन स्वीकार करने में कितने सहज हैं?", options: [{ text: "बहुत सहज", score: 1 }, { text: "मैं चीजों को खुद संभालना पसंद करता हूँ लेकिन स्वीकार करूँगा", score: 3 }, { text: "बहुत असहज या मदद से इनकार करता हूँ", score: 5 }] },
        { q: "आप अपने जीवन की उपलब्धियों और यादों पर सकारात्मक रूप से कितनी बार विचार करते हैं?", options: [{ text: "अक्सर, कृतज्ञता के साथ", score: 1 }, { text: "कभी-कभी, लेकिन अक्सर पछतावे पर ध्यान केंद्रित करते हैं", score: 3 }, { text: "शायद ही कभी, मुझे अतीत के बारे में पछतावा या दुख महसूस होता है", score: 5 }] },
        { q: "आप अपनी स्वतंत्रता और अपनी देखभाल करने की क्षमता के बारे में कितना सुरक्षित महसूस करते हैं?", options: [{ text: "बहुत सुरक्षित और सक्षम", score: 1 }, { text: "भविष्य के बारे में थोड़ी चिंतित", score: 3 }, { text: "स्वतंत्रता खोने के बारे में अत्यधिक निर्भर या चिंतित", score: 5 }] },
    ],
};

// --- Function to get quiz data ---
const getQuizQuestions = (lang) => {
    return lang === 'hi' ? HI_QUIZ_QUESTIONS : EN_QUIZ_QUESTIONS;
};

// --- Daily Mood Quiz Data (5 Questions, Age Segmented) ---
const EN_DAILY_MOOD_QUESTIONS = {
    'teen': [
        { q: "How would you rate your general mood today?", options: [{ text: "Great", score: 1 }, { text: "Neutral", score: 3 }, { text: "Poor", score: 5 }] },
        { q: "Did you manage to switch off and relax from school/social media?", options: [{ text: "Yes, easily", score: 1 }, { text: "With some effort", score: 3 }, { text: "No, stayed tense", score: 5 }] },
        { q: "How much energy did you have for activities you enjoy?", options: [{ text: "High", score: 1 }, { text: "Average", score: 3 }, { text: "Very Low", score: 5 }] },
        { q: "Did you feel connected to your friends or family today?", options: [{ text: "Yes, highly", score: 1 }, { text: "A little", score: 3 }, { text: "No, isolated", score: 5 }] },
        { q: "How easily did you handle minor setbacks or disagreements?", options: [{ text: "Easily", score: 1 }, { text: "Moderate difficulty", score: 3 }, { text: "Overwhelming difficulty", score: 5 }] },
    ],
    'adult': [
        { q: "How would you rate your general mood today?", options: [{ text: "Great", score: 1 }, { text: "Neutral", score: 3 }, { text: "Poor", score: 5 }] },
        { q: "Did you achieve a balance between work/career and personal time?", options: [{ text: "Yes, felt balanced", score: 1 }, { text: "Slightly unbalanced", score: 3 }, { text: "No, felt overwhelmed by work", score: 5 }] },
        { q: "How much energy did you have for leisure or hobbies?", options: [{ text: "High", score: 1 }, { text: "Average", score: 3 }, { text: "Very Low", score: 5 }] },
        { q: "Did you feel appreciated or valued in your roles today?", options: [{ text: "Yes, highly", score: 1 }, { text: "A little", score: 3 }, { text: "No, felt undervalued", score: 5 }] },
        { q: "How easily did you manage unexpected work or family challenges?", options: [{ text: "Easily", score: 1 }, { text: "Moderate difficulty", score: 3 }, { text: "Overwhelming difficulty", score: 5 }] },
    ],
    'elder': [
        { q: "How would you rate your general mood today?", options: [{ text: "Great", score: 1 }, { text: "Neutral", score: 3 }, { text: "Poor", score: 5 }] },
        { q: "How active and engaged were you with mentally stimulating activities?", options: [{ text: "Highly engaged", score: 1 }, { text: "A little", score: 3 }, { text: "Stayed inactive", score: 5 }] },
        { q: "How was your overall physical comfort level today?", options: [{ text: "Very comfortable", score: 1 }, { text: "Some mild discomfort", score: 3 }, { text: "Significant discomfort", score: 5 }] },
        { q: "Did you feel connected to family or social groups today?", options: [{ text: "Yes, highly", score: 1 }, { text: "A little", score: 3 }, { text: "No, felt isolated", score: 5 }] },
        { q: "How optimistic do you feel about tomorrow?", options: [{ text: "Very optimistic", score: 1 }, { text: "Cautiously optimistic", score: 3 }, { text: "Worried or pessimistic", score: 5 }] },
    ],
};

const HI_DAILY_MOOD_QUESTIONS = {
    'teen': [
        { q: "आज आप अपनी सामान्य मनोदशा को कैसे रेटिंग देंगे?", options: [{ text: "बहुत अच्छा", score: 1 }, { text: "सामान्य", score: 3 }, { text: "ख़राब", score: 5 }] },
        { q: "क्या आप स्कूल/सोशल मीडिया से दूर होकर आराम कर पाए?", options: [{ text: "हाँ, आसानी से", score: 1 }, { text: "कुछ प्रयास से", score: 3 }, { text: "नहीं, तनाव में रहे", score: 5 }] },
        { q: "आज आपको अपनी पसंद की गतिविधियों के लिए कितनी ऊर्जा मिली?", options: [{ text: "उच्च", score: 1 }, { text: "औसत", score: 3 }, { text: "बहुत कम", score: 5 }] },
        { q: "क्या आज आपको अपने दोस्तों या परिवार से जुड़ाव महसूस हुआ?", options: [{ text: "हाँ, बहुत ज़्यादा", score: 1 }, { text: "थोड़ा", score: 3 }, { text: "नहीं, अकेला महसूस किया", score: 5 }] },
        { q: "आपने मामूली झटके या असहमति को कितनी आसानी से संभाला?", options: [{ text: "आसानी से", score: 1 }, { text: "मध्यम कठिनाई", score: 3 }, { text: "अत्यधिक कठिनाई", score: 5 }] },
    ],
    'adult': [
        { q: "आज आप अपनी सामान्य मनोदशा को कैसे रेटिंग देंगे?", options: [{ text: "बहुत अच्छा", score: 1 }, { text: "सामान्य", score: 3 }, { text: "ख़राब", score: 5 }] },
        { q: "क्या आपने काम/करियर और निजी समय के बीच संतुलन हासिल किया?", options: [{ text: "हाँ, संतुलित महसूस किया", score: 1 }, { text: "थोड़ा असंतुलित", score: 3 }, { text: "नहीं, काम से अभिभूत महसूस किया", score: 5 }] },
        { q: "आज आपके पास अवकाश या शौक के लिए कितनी ऊर्जा थी?", options: [{ text: "उच्च", score: 1 }, { text: "औसत", score: 3 }, { text: "बहुत कम", score: 5 }] },
        { q: "क्या आपको आज अपनी भूमिकाओं में सराहना या महत्व महसूस हुआ?", options: [{ text: "हाँ, बहुत ज़्यादा", score: 1 }, { text: "थोड़ा", score: 3 }, { text: "नहीं, कम महत्व महसूस किया", score: 5 }] },
        { q: "आपने अप्रत्याशित काम या पारिवारिक चुनौतियों को कितनी आसानी से संभाला?", options: [{ text: "आसानी से", score: 1 }, { text: "मध्यम कठिनाई", score: 3 }, { text: "अत्यधिक कठिनाई", score: 5 }] },
    ],
    'elder': [
        { q: "आज आप अपनी सामान्य मनोदशा को कैसे रेटिंग देंगे?", options: [{ text: "बहुत अच्छा", score: 1 }, { text: "सामान्य", score: 3 }, { text: "ख़राब", score: 5 }] },
        { q: "आप मानसिक रूप से उत्तेजक गतिविधियों में कितने सक्रिय और संलग्न थे?", options: [{ text: "अत्यधिक संलग्न", score: 1 }, { text: "थोड़ा", score: 3 }, { text: "निष्क्रिय रहे", score: 5 }] },
        { q: "आज आपका समग्र शारीरिक आराम स्तर कैसा था?", options: [{ text: "बहुत आरामदायक", score: 1 }, { text: "कुछ हल्की असुविधा", score: 3 }, { text: "महत्वपूर्ण असुविधा", score: 5 }] },
        { q: "क्या आज आपको परिवार या सामाजिक समूहों से जुड़ाव महसूस हुआ?", options: [{ text: "हाँ, बहुत ज़्यादा", score: 1 }, { text: "थोड़ा", score: 3 }, { text: "नहीं, अकेला महसूस किया", score: 5 }] },
        { q: "आप कल के बारे में कितना आशावादी महसूस करते हैं?", options: [{ text: "बहुत आशावादी", score: 1 }, { text: "सावधानीपूर्वक आशावादी", score: 3 }, { text: "चिंतित या निराशावादी", score: 5 }] },
    ],
};


// --- Daily Mood Quiz Data (5 Questions, Age Segmented) ---
const getDailyQuestions = (lang, ageGroup) => {
    const questionsByLang = lang === 'hi' ? HI_DAILY_MOOD_QUESTIONS : EN_DAILY_MOOD_QUESTIONS;
    return questionsByLang[ageGroup] || questionsByLang['adult']; // Default to adult if ageGroup is missing
};


// --- Localization Text ---
const getLocalizedText = (lang) => {
    if (lang === 'hi') {
        return {
            appName: "माइंडकनेक्ट",
            welcome: "नमस्ते,",
            homeSubtitle: "आप आज क्या करना चाहेंगे?",
            dailyTrackerTitle: "दैनिक मनोदशा ट्रैकर",
            dailyTrackerSubtitle: "अपनी दैनिक प्रगति को ट्रैक करने के लिए तुरंत अपनी मनोदशा लॉग करें।",
            startDailyQuiz: "दैनिक प्रश्नोत्तरी शुरू करें",
            loggedToday: "आज का मूड दर्ज किया गया!",
            moodLog: "साप्ताहिक मूड लॉग (पिछले 7 दिन)",
            assessmentTitle: "व्यापक मूल्यांकन",
            assessmentSubtitle: "व्यक्तिगत समूह और मीडिया सिफारिशों के लिए पूरी प्रश्नोत्तरी लें।",
            selectAge: "मुख्य प्रश्नोत्तरी के लिए आयु समूह चुनें:",
            backToHome: "वापस होम पर",
            loginTitle: "माइंडकनेक्ट में आपका स्वागत है",
            loginSubtitle: "लॉगिन करें या नया अकाउंट बनाएं।",
            loginUser: "सामान्य उपयोगकर्ता",
            loginDoctor: "डॉक्टर",
            loginPlaceholderUser: "उपयोगकर्ता नाम",
            loginPlaceholderEmail: "ईमेल",
            loginPlaceholderPassword: "पासवर्ड",
            loginButton: "लॉगिन",
            signupButton: "साइन अप",
            loginNote: "आपकी पहचान सुरक्षित रूप से प्रमाणित की जाएगी।",
            selectLanguage: "भाषा चुनें",
            shareResults: "परिणाम साझा करें",
            joinChat: "चैट में शामिल हों",
            startQuiz: "प्रश्नोत्तरी शुरू करें",
            backToResults: "परिणामों पर वापस",
            backToChatbot: "चैटबॉट पर वापस",
            typeMessage: "अपना संदेश टाइप करें...",
            botName: "मूड बॉट",
            you: "आप",
            startConversation: "बातचीत शुरू करें!",
            connectedAs: "के रूप में जुड़े: ",
            processing: "प्रसंस्करण...",
            nextQuestion: "अगला प्रश्न",
            viewResults: "परिणाम देखें",
            question: "प्रश्न",
            of: "में से",
            for: "के लिए",
            selectAgeDaily: "दैनिक प्रश्नोत्तरी के लिए अपना आयु समूह चुनें:",
            ageGroupSelection: "आयु समूह चुनें:",
            rejoinChat: "चैट में फिर से शामिल हों",
            joinedGroup: "आप वर्तमान में इस समूह से जुड़े हुए हैं:",
            chatbotTitle: "तनाव रिलीफ़ चैटबॉट",
            chatbotSubtitle: "तत्काल सुझावों के लिए हमारे थेरेपिस्ट बॉट से बात करें।",
            botChatScreenTitle: "थेरेपिस्ट बॉट",
            startBot: "बातचीत शुरू करें",
            botPrompt: "आप किस बारे में तनावग्रस्त हैं? (उदाहरण: काम, परिवार, नींद)",
            logout: "लॉग आउट",
            botGreeting: (username) => `नमस्ते ${username}! मैं आपकी थेरेपिस्ट बॉट हूँ। मैं आपको अपने तनाव को समझने और प्रबंधित करने में मदद कर सकती हूँ। आप किस बारे में बात करना चाहेंगे?`,
        };
    }
    // Default to English
    return {
        appName: "MindConnect",
        welcome: "Hello,",
        homeSubtitle: "What would you like to do today?",
        dailyTrackerTitle: "Daily Mood Tracker",
        dailyTrackerSubtitle: "Quickly log your mood to track your daily progress.",
        startDailyQuiz: "Start Daily Quiz",
        loggedToday: "Mood Logged Today!",
        moodLog: "Weekly Mood Log (Last 7 Days)",
        assessmentTitle: "Comprehensive Assessment",
        assessmentSubtitle: "Take the full quiz for personalized group and media recommendations.",
        selectAge: "Select Age Group for Main Quiz:",
        backToHome: "Back to Home",
        loginTitle: "Welcome to MindConnect",
        loginSubtitle: "Login or Sign Up for a new account.",
        loginUser: "Normal User",
        loginDoctor: "Doctor",
        loginPlaceholderUser: "Username",
        loginPlaceholderEmail: "Email",
        loginPlaceholderPassword: "Password",
        loginButton: "Login",
        signupButton: "Sign Up",
        loginNote: "Your identity will be securely authenticated.",
        selectLanguage: "Select Language",
        shareResults: "Share Results",
        joinChat: "Join Chat",
        startQuiz: "Start Quiz",
        backToResults: "Back to Results",
        backToChatbot: "Back to Chatbot",
        typeMessage: "Type your message...",
        botName: "Mood Bot",
        you: "You",
        startConversation: "Start the conversation!",
        connectedAs: "Connected as: ",
        processing: "Processing...",
        nextQuestion: "Next Question",
        viewResults: "View Results",
        question: "Question",
        of: "of",
        for: "for",
        selectAgeDaily: "Select your age group for the Daily Quiz:",
        ageGroupSelection: "Select Age Group:",
        rejoinChat: "Rejoin Chat",
        joinedGroup: "You are currently joined to this group:",
        chatbotTitle: "Stress Relief Chatbot",
        chatbotSubtitle: "Talk to our Therapist Bot for immediate suggestions.",
        botChatScreenTitle: "Therapist Bot",
        startBot: "Start Conversation",
        botPrompt: "What are you stressed about? (e.g., Work, Family, Sleep)",
        logout: "Logout",
        botGreeting: (username) => `Hello ${username}! I'm your Therapist Bot. I can help you understand and manage your stress. What would you like to talk about?`,
    };
};

// --- Custom Styles (Mimicking Mobile App) ---
const styles = {
    appContainer: "max-w-md w-full mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden min-h-screen font-[Inter,sans-serif]",
    header: "py-4 px-6 text-center border-b border-gray-100 flex items-center justify-between",
    headerContent: "flex items-center",
    title: "text-xl font-bold text-gray-900 ml-2",
    subtitle: "text-sm text-gray-500 mt-1",
    sectionTitle: "text-xl font-bold text-gray-800 border-l-4 border-yellow-500 pl-3 mb-4",
    card: "bg-white p-5 rounded-xl shadow-lg border border-gray-100 mb-4",
    buttonPrimary: "w-full py-3 mt-4 text-white font-semibold rounded-xl transition ease-in-out duration-150",
    buttonSecondary: "w-full py-3 mt-4 text-indigo-600 bg-indigo-100 font-semibold rounded-xl transition ease-in-out duration-150 hover:bg-indigo-200",
    buttonDisabled: "opacity-50 cursor-not-allowed",
    radioCard: "p-4 rounded-xl flex items-center justify-between border-2 border-gray-200 transition duration-150 ease-in-out cursor-pointer hover:border-indigo-500",
    radioSelected: "border-indigo-500 bg-indigo-500 text-white shadow-md",
    textWhite: "text-white",
    textGray: "text-gray-700",
    spinner: "w-12 h-12 border-4 border-t-4 border-indigo-500 border-gray-200 rounded-full animate-spin mx-auto mb-4",
    messageMine: "bg-indigo-500 text-white rounded-bl-xl rounded-t-xl max-w-[80%]",
    messageTheirs: "bg-gray-200 text-gray-800 rounded-br-xl rounded-t-xl max-w-[80%]",
    chatOptionButton: "w-full py-2 px-3 text-sm text-indigo-700 bg-indigo-100 font-medium rounded-lg hover:bg-indigo-200 transition",
    chatOptionDisabled: "opacity-70 cursor-not-allowed",
    logEntryGood: "bg-green-100 text-green-700",
    logEntryModerate: "bg-yellow-100 text-yellow-700",
    logEntryHigh: "bg-red-100 text-red-700",
};

// --- Firebase and Utility Hooks ---
const useFirebase = () => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [userRole, setUserRole] = useState(null); // 'user' or 'doctor'
    const [username, setUsername] = useState(null);
    const [userEmail, setUserEmail] = useState(null);
    const [userPermanentAgeGroup, setUserPermanentAgeGroup] = useState(null);
    const [authStatus, setAuthStatus] = useState(AUTH_STATUS.UNINITIALIZED);

    useEffect(() => {
        if (!firebaseConfig) {
            console.error("Firebase config is missing.");
            return;
        }
        setLogLevel('debug');
        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        const dbInstance = getFirestore(app);

        setAuth(authInstance);
        setDb(dbInstance);

        const checkUserProfile = async (user) => {
            const uid = user.uid;
            setUserId(uid);
            setUserEmail(user.email);
            setAuthStatus(AUTH_STATUS.AUTHENTICATED);

            const profileRef = doc(dbInstance, `/artifacts/${appId}/public/data/user_profiles`, uid);
            try {
                const profileSnap = await getDoc(profileRef);
                if (profileSnap.exists()) {
                    const data = profileSnap.data();
                    setUserRole(data.role);
                    setUsername(data.username);
                    setUserPermanentAgeGroup(data.ageGroup); // Load permanent age group
                }
            } catch (error) {
                console.error("Error fetching user profile:", error);
            }
            setIsAuthReady(true);
        };

        const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
            if (user) {
                // Ignore anonymous users if we already have an anonymous ID (unless it's the initial token login)
                if (user.isAnonymous && authStatus !== AUTH_STATUS.UNINITIALIZED && !initialAuthToken) {
                    setAuthStatus(AUTH_STATUS.ANONYMOUS);
                    setIsAuthReady(true);
                    return;
                }
                await checkUserProfile(user);
            } else {
                try {
                    if (initialAuthToken) {
                        const userCredential = await signInWithCustomToken(authInstance, initialAuthToken);
                        await checkUserProfile(userCredential.user);
                    } else {
                        // Sign in anonymously as a fallback if no token provided
                        await signInAnonymously(authInstance); 
                    }
                } catch (error) {
                    console.error("Auth sign-in failed:", error);
                    setAuthStatus(AUTH_STATUS.ANONYMOUS);
                    setIsAuthReady(true);
                    setUserId(crypto.randomUUID());
                }
            }
        });

        return () => unsubscribe();
    }, [authStatus]); // Rerun if auth status changes

    const createOrUpdateProfile = useCallback(async (uid, role, name, ageGroup) => {
        if (!db || !uid) return;
        const profileRef = doc(db, `/artifacts/${appId}/public/data/user_profiles`, uid);
        try {
            await setDoc(profileRef, {
                userId: uid,
                role: role,
                username: name,
                ageGroup: ageGroup, // Save age group on login/signup
                lastLogin: serverTimestamp(),
            }, { merge: true });
            setUserRole(role);
            setUsername(name);
            setUserPermanentAgeGroup(ageGroup);
            setAuthStatus(AUTH_STATUS.AUTHENTICATED);
            // The onAuthStateChanged listener handles setting other states
            console.log("User profile updated/created successfully.");
        } catch (error) {
            console.error("Error during user profile creation:", error);
        }
    }, [db]);
    
    const logoutUser = useCallback(async () => {
        if (auth) {
            await signOut(auth);
            setUserRole(null);
            setUsername(null);
            setUserPermanentAgeGroup(null);
            setLastAssessmentData(null);
            setAuthStatus(AUTH_STATUS.ANONYMOUS);
            setView('login');
        }
    }, [auth]);


    return { db, auth, userId, isAuthReady, userRole, username, userPermanentAgeGroup, userEmail, authStatus, createOrUpdateProfile, logoutUser };
};

const fetchWithBackoff = async (url, options, maxRetries = 5, delay = 1000) => {
    // The full URL should already contain the API_KEY_QUERY if API_KEY is set.
    // We pass the base URL and let the API logic handle the key.
    const fullUrl = API_KEY ? `${url}?key=${API_KEY}` : url;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(fullUrl, options);
            if (response.ok) {
                return response;
            }
            if (response.status === 401) {
                 console.error("Authentication Error (401). API token issue.");
                 throw new Error(`HTTP error! Status: ${response.status}`);
            }
            if (response.status === 429 || response.status >= 500) {
                console.warn(`Attempt ${i + 1} failed with status ${response.status}. Retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
                continue;
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
        } catch (error) {
            if (i === maxRetries - 1 || error.message.includes('401')) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
};

// --- Input Component Memoized for Chat Fix ---
const ChatInput = React.memo(({ chatInput, setChatInput, sendMessage, isReady, T, styles }) => (
    <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex space-x-3">
            <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={T.typeMessage}
                className="flex-grow p-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                disabled={!isReady}
            />
            <button
                type="submit"
                className={`bg-indigo-600 text-white p-3 rounded-xl font-semibold transition hover:bg-indigo-700 ${(!chatInput.trim() || !isReady) ? styles.buttonDisabled : ''}`}
                disabled={!chatInput.trim() || !isReady}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
            </button>
        </div>
    </form>
));

const Header = ({ T, setView, logo, styles, currentView, logoutUser }) => (
    <header className={styles.header}>
        {/* Left Side: Logo and Title */}
        <div className={styles.headerContent} onClick={() => setView('home')} style={{cursor: 'pointer'}}>
            {logo}
            <h1 className={styles.title}>{T.appName}</h1>
        </div>

        {/* Right Side: Navigation/Action */}
        <div className='flex items-center space-x-2'>
            {/* Conditional Back Buttons */}
            {currentView === 'chat' && (
                 <button onClick={() => setView('results')} className="text-indigo-600 font-semibold cursor-pointer flex items-center text-sm hover:text-indigo-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {T.backToResults}
                </button>
            )}
            {currentView === 'botChat' && (
                 <button onClick={() => setView('home')} className="text-indigo-600 font-semibold cursor-pointer flex items-center text-sm hover:text-indigo-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {T.backToHome}
                </button>
            )}
            
            {/* Logout Button */}
            {['home', 'dashboard', 'results'].includes(currentView) && (
                <button
                    onClick={logoutUser}
                    className="flex items-center text-sm text-red-600 font-semibold hover:text-red-800 transition"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {T.logout}
                </button>
            )}
        </div>
    </header>
);

// --- Main Application Component ---
const App = () => {
    const { db, auth, userId, isAuthReady, userRole, username, userPermanentAgeGroup, userEmail, authStatus, createOrUpdateProfile, logoutUser } = useFirebase();

    const [view, setView] = useState('splash'); // Start with splash screen
    const [ageGroup, setAgeGroup] = useState(null); // The group for the quiz currently in progress
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [recommendationResult, setRecommendationResult] = useState(null);
    const [lastAssessmentData, setLastAssessmentData] = useState(null); 
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [shareSuccess, setShareSuccess] = useState(false);
    const [hasTakenDailyQuiz, setHasTakenDailyQuiz] = useState(false);
    const [dailyMoodLogs, setDailyMoodLogs] = useState([]);
    const [language, setLanguage] = useState('en'); // New state for language
    
    const [botMessages, setBotMessages] = useState([]);
    const [botLoading, setBotLoading] = useState(false);


    const T = getLocalizedText(language); // Localized text getter

    const quizData = useMemo(() => {
        const questionsByLang = getQuizQuestions(language);
        // The main quiz uses the age group set when starting the assessment (which now defaults to the permanent group)
        return ageGroup ? questionsByLang[ageGroup] : [];
    }, [ageGroup, language]);

    const maxScore = useMemo(() => quizData.length * 5, [quizData]);
    
    // --- Logo Component Instance ---
    const Logo = <LogoIcon />;


    // --- Effect: Handle Splash Screen Transition ---
    useEffect(() => {
        const timer = setTimeout(() => {
            if (view === 'splash') {
                setView('login');
            }
        }, 1500); // Show splash for 1.5 seconds
        return () => clearTimeout(timer);
    }, [view]);

    // Check if user is logged in and navigate to the appropriate dashboard
    useEffect(() => {
        if (view === 'splash' || view === 'login') return;

        if (isAuthReady && userRole) {
            // If the user is logged in but the permanent age group is missing (old profile or doctor) go back to login 
            if (userRole === 'user' && !userPermanentAgeGroup) {
                setView('login');
            } else {
                setView(userRole === 'doctor' ? 'dashboard' : 'home');
            }
        } else if (isAuthReady && !userRole) {
            setView('login');
        }
    }, [isAuthReady, userId, userRole, userPermanentAgeGroup]);


    // --- Effect: Fetch last completed assessment on Home view ---
    useEffect(() => {
        if (db && userId && userRole === 'user' && view === 'home') {
            const fetchLastAssessment = async () => {
                try {
                    const assessmentsRef = collection(db, `/artifacts/${appId}/users/${userId}/mental_health_assessments`);
                    const q = query(assessmentsRef);
                    const snapshot = await getDocs(q); 
                    
                    let mostRecentAssessment = null;
                    let latestTimestamp = 0;

                    snapshot.forEach(doc => {
                        const data = doc.data();
                        const timestamp = data.timestamp?.toMillis() || 0;
                        if (timestamp > latestTimestamp) {
                            latestTimestamp = timestamp;
                            mostRecentAssessment = data;
                        }
                    });

                    if (mostRecentAssessment) {
                        setLastAssessmentData(mostRecentAssessment);
                        // Also update ageGroup in state for running the quiz again later
                        if (!ageGroup) {
                            setAgeGroup(mostRecentAssessment.ageGroup);
                        }
                    } else {
                        setLastAssessmentData(null);
                    }

                } catch (e) {
                    console.error("Error fetching last assessment:", e);
                }
            };
            fetchLastAssessment();
        }
    }, [db, userId, userRole, view, ageGroup]);

    // Check for daily quiz status AND fetch mood history
    useEffect(() => {
        if (db && userId) {
            const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
            const moodLogsRef = collection(db, `/artifacts/${appId}/users/${userId}/daily_mood_logs`);
            
            // Query all logs to perform client-side filtering/sorting
            const q = query(moodLogsRef);
            
            const unsubscribe = onSnapshot(q, (snapshot) => {
                let takenToday = false;
                const logs = [];

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.date === today) {
                        takenToday = true;
                    }
                    logs.push({ id: doc.id, ...data });
                });

                setHasTakenDailyQuiz(takenToday);
                
                // Client-side sort: newest first (descending timestamp)
                logs.sort((a, b) => {
                    const timeA = a.timestamp?.toMillis() || 0;
                    const timeB = b.timestamp?.toMillis() || 0;
                    return timeB - timeA;
                });

                setDailyMoodLogs(logs.slice(0, 7)); // Show only the last 7 days
                
            }, (error) => {
                console.error("Error checking daily quiz status:", error);
            });

            return () => unsubscribe();
        }
    }, [db, userId]);

    // --- Firestore Logic (Save Assessment Data) ---

    const saveAssessmentData = useCallback(async (data) => {
        if (!db || !userId) {
            console.error("Firestore not ready or user not authenticated. Skipping save.");
            return;
        }

        try {
            // Path: /artifacts/{appId}/users/{userId}/mental_health_assessments/{docId}
            const docRef = doc(collection(db, `/artifacts/${appId}/users/${userId}/mental_health_assessments`));

            const assessmentData = {
                ...data,
                timestamp: serverTimestamp(),
                username: username,
                userId: userId,
                ageGroup: ageGroup,
                quizScore: score,
                quizMaxScore: maxScore
            };

            await setDoc(docRef, assessmentData);
            // Also update the lastAssessmentData state immediately after saving
            setLastAssessmentData(assessmentData);
            console.log("Assessment results saved to Firestore successfully:", docRef.id);

        } catch (err) {
            console.error("Failed to save data to Firestore:", err);
            setError("Warning: Could not save results to database.");
        }
    }, [db, userId, ageGroup, score, maxScore, username]);

    const fetchRecommendations = useCallback(async () => {
        setLoading(true);
        setError(null);
        const stressLevel = score / maxScore > 0.6 ? "high stress" : score / maxScore > 0.3 ? "moderate stress" : "low stress";

        // IMPORTANT: Construct the full API URL including the key here
        // API_URL is passed to fetchWithBackoff, which handles the key if present.
        
        const userQuery = `
            The user is a ${ageGroup} with a current mindset score indicating ${stressLevel} (Score: ${score}/${maxScore}).
            Provide a JSON object with the following:
            1. A creative group name (String) for a mental health support chat based on their age and mindset.
            2. A list of 3 movie titles (Array of Strings) and 3 song titles (Array of Strings) appropriate for mental well-being for this age group.
        `;

        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            tools: [{ "google_search": {} }],
            systemInstruction: { parts: [{ text: "You are a professional Mental Wellness Assistant. Your task is to provide personalized, grounded recommendations in JSON format based on the user's age and self-reported stress level. The movie and song recommendations must be suitable for promoting calm and resilience. Ensure the response is ONLY the JSON object." }] },
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        group: { type: "STRING", description: "Recommended group chat name" },
                        movies: { type: "ARRAY", items: { type: "STRING" } },
                        songs: { type: "ARRAY", items: { type: "STRING" } },
                    }
                }
            }
        };

        try {
            const response = await fetchWithBackoff(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!jsonText) {
                throw new Error("API response was empty or malformed.");
            }

            const parsedResult = JSON.parse(jsonText);
            setRecommendationResult(parsedResult);
            // Save data only includes the new structure (group, movies, songs)
            saveAssessmentData(parsedResult); 

        } catch (err) {
            console.error("Gemini API or JSON Parsing Error:", err);
            setError("Could not generate recommendations. Using default placeholders.");
            setRecommendationResult({
                group: `The ${ageGroup} Support Circle`,
                movies: ["A Quiet Place", "The Pursuit of Happyness"],
                songs: ["Weightless by Marconi Union", "Clair de Lune by Debussy"],
                // Doctor field removed
            });
        } finally {
            setLoading(false);
        }
    }, [score, ageGroup, maxScore, saveAssessmentData]);

    // --- Stress Bot Logic ---

    const getBotResponse = useCallback(async (prompt) => {
        setBotLoading(true);
        setError(null);

        const fullApiUrl = API_URL;

        const systemPrompt = `You are MindConnect's Therapist Bot. Your purpose is to provide immediate, supportive, and actionable suggestions for coping with stress. The user is a ${userPermanentAgeGroup || 'user'}. Respond concisely, in 2-3 short paragraphs max. Offer one emotional validation and one practical, simple coping technique relevant to their stated stressor. DO NOT offer medical advice or suggest complex therapy.`;
        const userQuery = `I am feeling stressed about: ${prompt}. What should I do right now?`;

        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
        };

        try {
            const response = await fetchWithBackoff(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            const botText = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!botText) {
                throw new Error("Bot response was empty.");
            }

            setBotMessages(prev => [...prev, { role: 'bot', text: botText, options: [] }]);

        } catch (err) {
            console.error("Bot API Error:", err);
            setError(language === 'hi' ? "चैटबॉट प्रतिक्रिया उत्पन्न करने में विफल रहा।" : "Failed to generate chatbot response.");
        } finally {
            setBotLoading(false);
        }
    }, [userPermanentAgeGroup, language]);

    const sendBotMessage = async (e, text) => {
        e.preventDefault();
        const message = text || chatInput;
        if (message.trim() === '') return;

        setBotMessages(prev => [...prev, { role: 'user', text: message }]);
        setChatInput('');
        await getBotResponse(message);
    };

    const startBotChat = () => {
        setBotMessages([{ 
            role: 'bot', 
            text: T.botGreeting(username || T.you), 
            options: [] 
        }]);
        setChatInput('');
        setBotLoading(false);
        setView('botChat');
    }

    // --- Quiz Handlers (Main Assessment) ---

    const startQuiz = (group) => {
        setAgeGroup(group);
        setView('quiz'); 
        setCurrentQuestionIndex(0);
        setScore(0);
        setSelectedOption(null);
        setError(null);
        setRecommendationResult(null); // Clear old results
    };

    const submitAnswer = () => {
        if (selectedOption === null) {
            setError(language === 'hi' ? "आगे बढ़ने के लिए कृपया एक उत्तर चुनें।" : "Please select an answer to proceed.");
            return;
        }

        const newScore = score + selectedOption;
        setScore(newScore);
        setSelectedOption(null);
        setError(null);

        if (currentQuestionIndex < quizData.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            setView('results');
            fetchRecommendations();
        }
    };

    // --- Group Chat Logic ---

    const joinChat = () => {
        // When joining from the home screen, ensure we use the last saved data
        if (view === 'home' && lastAssessmentData) {
            setRecommendationResult(lastAssessmentData);
        } else if (!recommendationResult) {
            // Should not happen if coming from results, but as a safeguard
            setError("Cannot join chat: No group assignment found.");
            return;
        }
        setView('chat');
    };

    useEffect(() => {
        if (view === 'chat' && db && userId && recommendationResult) {
            // Use a clean version of the group name as the key for the public collection path
            const groupKey = recommendationResult.group.replace(/\s+/g, '_').replace(/[^\w]/g, '');

            // Path: /artifacts/{appId}/public/data/chat_messages/{groupKey}/messages
            const chatCollectionRef = collection(db, `/artifacts/${appId}/public/data/chat_messages/${groupKey}/messages`);
            const q = query(chatCollectionRef);

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const messages = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const date = data.timestamp?.toDate ? data.timestamp.toDate() : new Date();
                    const timestamp = date.toLocaleTimeString(language === 'hi' ? 'hi-IN' : 'en-US', {hour: '2-digit', minute: '2-digit'});
                    messages.push({ ...data, id: doc.id, timestamp });
                });
                // Sort by timestamp ascending
                messages.sort((a, b) => {
                    // Use a fallback timestamp for sorting if needed
                    const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
                    const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
                    return timeA - timeB; 
                });
                setChatMessages(messages);
            }, (error) => {
                console.error("Error listening to chat messages:", error);
                setError(language === 'hi' ? "रीयल-टाइम चैट संदेश लोड करने में विफल रहा।" : "Failed to load real-time chat messages.");
            });

            return () => unsubscribe();
        }
    }, [view, db, userId, recommendationResult, language, T.you]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (chatInput.trim() === '' || !db || !userId || !recommendationResult) return;

        try {
            const groupKey = recommendationResult.group.replace(/\s+/g, '_').replace(/[^\w]/g, '');
            const chatCollectionRef = collection(db, `/artifacts/${appId}/public/data/chat_messages/${groupKey}/messages`);

            await addDoc(chatCollectionRef, {
                userId: userId,
                username: username,
                text: chatInput,
                timestamp: serverTimestamp(),
            });

            setChatInput('');
        } catch (err) {
            console.error("Error sending message:", err);
            setError(language === 'hi' ? "संदेश भेजने में विफल रहा।" : "Failed to send message.");
        }
    };

    // --- Share Logic ---
    const handleShare = () => {
        const result = recommendationResult;
        if (!result) return;

        const scoreMeaning = score < maxScore * 0.3 ? "High resilience and good coping mechanisms." :
                            score <= maxScore * 0.6 ? "Balanced mindset; may benefit from self-care." :
                            "High stress detected; could benefit from immediate support.";

        // Doctor section removed from share text
        const shareText = `
*MindConnect Assessment Results*

---
*My Mindset Summary*
User: ${username || userId}
Age Group: ${ageGroup.toUpperCase()}
Mindset Score: ${score} / ${maxScore}
Summary: ${scoreMeaning}
---
*Personalized Recommendations*
Group Chat: ${result.group}
Movies for Calm: ${result.movies.join(', ')}
Songs for Resilience: ${result.songs.join(', ')}

Join me on MindConnect!
        `.trim();

        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            setShareSuccess(true);
            setTimeout(() => setShareSuccess(false), 3000);
        } catch (err) {
            console.error('Failed to copy text to clipboard:', err);
            setError(language === 'hi' ? 'परिणाम कॉपी करने में विफल रहा। कृपया मैन्युअल रूप से कॉपी करें।' : 'Failed to copy results. Please copy manually.');
        } finally {
            document.body.removeChild(textArea);
        }
    };

    // --- Daily Mood History Component ---
    const MoodHistoryCard = ({ logs }) => {
        // Daily max score is now 25 (5 questions * 5 points)
        const dailyMaxScore = 25; 

        const getMoodStatus = (score) => {
            if (score <= dailyMaxScore * 0.3) {
                return { status: language === 'hi' ? 'अच्छा' : 'Good', className: styles.logEntryGood, icon: '😊' };
            }
            if (score <= dailyMaxScore * 0.6) {
                return { status: language === 'hi' ? 'मध्यम' : 'Moderate', className: styles.logEntryModerate, icon: '😐' };
            }
            return { status: language === 'hi' ? 'उच्च तनाव' : 'High Stress', className: styles.logEntryHigh, icon: '😟' };
        };

        if (logs.length === 0) {
            return (
                <div className={styles.card}>
                    <h3 className="text-xl font-bold text-gray-800 mb-3">{T.moodLog}</h3>
                    <p className="text-sm text-gray-500">{T.startDailyQuiz} {language === 'hi' ? "ट्रैक करना शुरू करने के लिए!" : "to start tracking!"}</p>
                </div>
            );
        }

        return (
            <div className={styles.card}>
                <h3 className="text-xl font-bold text-gray-800 mb-4">{T.moodLog}</h3>
                <div className="space-y-3">
                    {logs.map((log) => {
                        const { status, className, icon } = getMoodStatus(log.score);
                        const dateString = new Date(log.date).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', { month: 'short', day: 'numeric', weekday: 'short' });

                        return (
                            <div key={log.id} className={`flex justify-between items-center p-3 rounded-lg ${className}`}>
                                <div className="flex items-center space-x-3">
                                    <span className="text-2xl">{icon}</span>
                                    <div>
                                        <p className="font-semibold">{dateString}</p>
                                        <p className="text-xs">{status} {language === 'hi' ? 'मूड' : 'Mood'}</p>
                                    </div>
                                </div>
                                <div className="font-mono text-sm">
                                    Score: {log.score}/{dailyMaxScore}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
            {/* Conditional space below the log card */}
            {logs.length > 0 && <div className="mt-4"></div>} 

            </div>
        );
    };

    // --- View Components ---

    const SplashScreen = () => (
        <div className="flex flex-col items-center justify-center min-h-screen bg-indigo-600">
            {/* Logo Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-white mb-4 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
            </svg>

            <h1 className="text-4xl font-bold text-white tracking-widest">{T.appName}</h1>
            <p className="text-white/80 mt-2">{language === 'hi' ? 'एक स्वस्थ मन, एक खुशहाल जीवन' : 'A Healthier Mind, A Happier Life'}</p>
        </div>
    );


    const LoginScreen = () => {
        const [role, setRole] = useState('user');
        const [inputUsername, setInputUsername] = useState('');
        const [inputEmail, setInputEmail] = useState('');
        const [inputPassword, setInputPassword] = useState('');
        const [loginAgeGroup, setLoginAgeGroup] = useState(null); 
        const [loginError, setLoginError] = useState(null);
        const [isAuthenticating, setIsAuthenticating] = useState(false);
        
        // If coming from another page, set the view back to home/dashboard if authenticated
        useEffect(() => {
            if (authStatus === AUTH_STATUS.AUTHENTICATED && userRole) {
                setView(userRole === 'doctor' ? 'dashboard' : 'home');
            }
        }, [authStatus, userRole]);

        const ageGroups = AGE_GROUPS;

        const handleAuth = async (isSignUp) => {
            setLoginError(null);
            setIsAuthenticating(true);

            // Basic Input Validation
            if (inputUsername.trim().length < 3) {
                setLoginError(language === 'hi' ? "उपयोगकर्ता नाम कम से कम 3 वर्णों का होना चाहिए।" : "Username must be at least 3 characters.");
                setIsAuthenticating(false);
                return;
            }
            if (role === 'user' && !loginAgeGroup) {
                setLoginError(language === 'hi' ? "सामान्य उपयोगकर्ता के लिए आयु समूह आवश्यक है।" : "Age group is required for Normal User.");
                setIsAuthenticating(false);
                return;
            }

            try {
                let userCredential;
                if (isSignUp) {
                    userCredential = await createUserWithEmailAndPassword(auth, inputEmail, inputPassword);
                } else {
                    userCredential = await signInWithEmailAndPassword(auth, inputEmail, inputPassword);
                }
                
                await createOrUpdateProfile(
                    userCredential.user.uid, 
                    role, 
                    inputUsername.trim(), 
                    role === 'user' ? loginAgeGroup : null
                );
                
            } catch (error) {
                console.error("Firebase Auth Error:", error.code, error.message);
                
                let message;
                if (isSignUp) {
                    message = language === 'hi' ? 'साइन अप विफल: ' : 'Sign up failed: ';
                } else {
                    message = language === 'hi' ? 'लॉगिन विफल: ' : 'Login failed: ';
                }

                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    message += (language === 'hi' ? 'अमान्य ईमेल या पासवर्ड।' : 'Invalid email or password.');
                } else if (error.code === 'auth/email-already-in-use') {
                     message += (language === 'hi' ? 'यह ईमेल पहले ही उपयोग में है। कृपया लॉगिन करें।' : 'Email already in use. Please log in.');
                } else if (error.code === 'auth/weak-password') {
                    message += (language === 'hi' ? 'पासवर्ड बहुत कमजोर है (कम से कम 6 वर्ण)।' : 'Password is too weak (min 6 characters).');
                } else {
                    message += error.message;
                }

                setLoginError(message);
            } finally {
                setIsAuthenticating(false);
            }
        };

        const isActionDisabled = isAuthenticating || inputUsername.length < 3 || inputEmail.length === 0 || inputPassword.length === 0 || (role === 'user' && !loginAgeGroup);

        return (
            <div className="p-6">
                <h2 className="text-2xl font-semibold mb-2 text-gray-800">{T.loginTitle}</h2>
                <p className="text-gray-500 mb-6">{T.loginSubtitle}</p>

                {/* Role Selection */}
                <div className="space-y-4 mb-6">
                    {[{id: 'user', label: T.loginUser}, {id: 'doctor', label: T.loginDoctor}].map(r => {
                        const isSelected = role === r.id;
                        return (
                            <div
                                key={r.id}
                                className={`${styles.radioCard} ${isSelected ? styles.radioSelected : ''} border-indigo-400`}
                                onClick={() => { setRole(r.id); setLoginError(null); }}
                            >
                                <span className={`text-lg font-medium ${isSelected ? styles.textWhite : styles.textGray}`}>{r.label}</span>
                                {isSelected && (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Age Group Selection (Only for Normal User) */}
                {role === 'user' && (
                    <div className="mb-6">
                        <h4 className="font-semibold text-gray-700 mb-2">{T.ageGroupSelection}</h4>
                        <div className="flex space-x-2">
                            {ageGroups.map(group => {
                                const isSelected = loginAgeGroup === group.id;
                                return (
                                    <div
                                        key={group.id}
                                        className={`${styles.radioCard} flex-1 justify-center py-2 ${isSelected ? 'border-pink-500 bg-pink-50' : ''}`}
                                        onClick={() => { setLoginAgeGroup(group.id); setLoginError(null); }}
                                    >
                                        <span className={`text-sm font-medium ${isSelected ? 'text-pink-700' : styles.textGray}`}>{group.label.split(' ')[0]}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Username Input (Required for Profile) */}
                <input
                    type="text"
                    placeholder={T.loginPlaceholderUser}
                    value={inputUsername}
                    onChange={(e) => setInputUsername(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 mb-4"
                    disabled={isAuthenticating}
                />

                {/* Email Input (Required for Firebase Auth) */}
                <input
                    type="email"
                    placeholder={T.loginPlaceholderEmail}
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 mb-4"
                    disabled={isAuthenticating}
                />

                {/* Password Input (Required for Firebase Auth) */}
                <input
                    type="password"
                    placeholder={T.loginPlaceholderPassword}
                    value={inputPassword}
                    onChange={(e) => setInputPassword(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 mb-4"
                    disabled={isAuthenticating}
                />

                {loginError && <p className="text-sm text-red-500 mb-4">{loginError}</p>}

                {/* Action Buttons: Login / Sign Up */}
                <div className="flex space-x-3">
                    <button
                        onClick={() => handleAuth(false)}
                        disabled={isActionDisabled || isAuthenticating}
                        className={`${styles.buttonPrimary} flex-1 bg-indigo-600 ${isActionDisabled || isAuthenticating ? styles.buttonDisabled : 'hover:bg-indigo-700'}`}
                    >
                        {isAuthenticating ? T.processing : T.loginButton}
                    </button>
                    <button
                        onClick={() => handleAuth(true)}
                        disabled={isActionDisabled || isAuthenticating}
                        className={`${styles.buttonPrimary} flex-1 bg-pink-500 ${isActionDisabled || isAuthenticating ? styles.buttonDisabled : 'hover:bg-pink-600'}`}
                    >
                        {isAuthenticating ? T.processing : T.signupButton}
                    </button>
                </div>
                
                <p className="text-xs text-center text-gray-400 mt-3">{T.loginNote}</p>
            </div>
        );
    };

    const UserHomeScreen = () => {
        const ageGroupMap = {
            'teen': { group: 'Teen', range: '(13-17)' },
            'adult': { group: 'Adult', range: '(18-64)' },
            'elder': { group: 'Elder', range: '(65+)' },
        };
        const permanentGroup = userPermanentAgeGroup ? ageGroupMap[userPermanentAgeGroup] : null;

        // If permanentGroup is null (shouldn't happen for users who logged in correctly)
        if (!permanentGroup) {
            return (
                <div className="p-6 text-center">
                    <p className="text-red-500">{T.welcome} {username}. {language === 'hi' ? 'आयु समूह डेटा गायब है। कृपया पुनः लॉग इन करें।' : 'Age group data is missing. Please log in again.'}</p>
                    <button onClick={() => logoutUser()} className={styles.buttonPrimary + ' bg-indigo-600'}>{T.logout}</button>
                </div>
            );
        }

        const label = `${permanentGroup.group} ${permanentGroup.range}`;
        const assessmentComplete = !!lastAssessmentData;
        const groupName = lastAssessmentData?.group || 'N/A';

        return (
            <div className="p-6">
                <h2 className="text-2xl font-semibold mb-2 text-gray-800">{T.welcome} {username || 'User'}!</h2>
                <p className="text-gray-500 mb-6">{T.homeSubtitle}</p>

                {/* Language Selector Card */}
                <div className={styles.card}>
                    <h3 className="text-xl font-bold text-gray-800 mb-3">{T.selectLanguage}</h3>
                    <div className="flex space-x-4">
                        <button 
                            onClick={() => setLanguage('en')}
                            className={`flex-1 py-2 rounded-lg font-semibold border-2 ${language === 'en' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}
                        >
                            English
                        </button>
                        <button
                            onClick={() => setLanguage('hi')}
                            className={`flex-1 py-2 rounded-lg font-semibold border-2 ${language === 'hi' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}
                        >
                            हिन्दी (Hindi)
                        </button>
                    </div>
                </div>

                {/* Stress Bot Card */}
                <div className={styles.card}>
                    <h3 className="text-xl font-bold text-gray-800 mb-3">{T.chatbotTitle}</h3>
                    <p className="text-sm text-gray-600 mb-4">{T.chatbotSubtitle}</p>
                    <button
                        onClick={startBotChat}
                        className={styles.buttonPrimary + ' py-2 bg-green-500 hover:bg-green-600 flex items-center justify-center'}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M18 9.5a1.5 1.5 0 00-1.5-1.5H13V6a3 3 0 00-3-3H7a3 3 0 00-3 3v2H2.5A1.5 1.5 0 001 9.5v5A1.5 1.5 0 002.5 16h15a1.5 1.5 0 001.5-1.5v-5zM10 10.5a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg>
                        {T.startBot}
                    </button>
                </div>


			    {/* Daily Quiz Card */}
			    <div className={styles.card}>
			        <h3 className="text-xl font-bold text-gray-800 mb-3">{T.dailyTrackerTitle}</h3>
			        <p className="text-sm text-gray-600 mb-4">{T.dailyTrackerSubtitle}</p>
			        
			        {hasTakenDailyQuiz ? (
			            <button disabled className={`${styles.buttonPrimary} py-2 bg-gray-400 ${styles.buttonDisabled}`}>
			                {T.loggedToday}
			            </button>
			        ) : (
			            <button
			                onClick={() => setView('dailyQuiz')} // Start daily quiz (age group is permanentGroup)
			                className={styles.buttonPrimary + ' py-2 bg-pink-500 hover:bg-pink-600'}
			            >
			                {T.startDailyQuiz} {T.for} {label}
			            </button>
			        )}
			    </div>

			    {/* Mood History Card */}
			    <MoodHistoryCard logs={dailyMoodLogs} />

			    {/* Main Assessment Card (Conditional based on completion) */}
			    <div className={styles.card}>
			        <h3 className="text-xl font-bold text-gray-800 mb-3">{T.assessmentTitle}</h3>
			        
			        {assessmentComplete ? (
			            <>
			                <p className="text-sm text-gray-600 mb-3">{T.joinedGroup}</p>
			                <div className="text-center bg-indigo-100 text-indigo-700 p-3 rounded-lg font-extrabold text-xl tracking-wider mb-4">
			                    {groupName}
			                </div>
			                <button
			                    onClick={joinChat} 
			                    className={styles.buttonPrimary + ' py-2 bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center'}
			                >
			                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a3 3 0 100-6 3 3 0 000 6zM8 12a5 5 0 00-4.578 2.872L2.6 15.7A1 1 0 003.5 17h13a1 1 0 00.894-1.3l-1.822-2.828A5 5 0 0012 12H8z" />
                                </svg>
			                    {T.rejoinChat}
			                </button>
			            </>
			        ) : (
			            <>
			                <p className="text-sm text-gray-600 mb-4">{T.assessmentSubtitle}</p>
			                <button
			                    onClick={() => startQuiz(userPermanentAgeGroup)} // Start main quiz using permanent age group
			                    className={styles.buttonPrimary + ' py-2 bg-indigo-600 hover:bg-indigo-700'}
			                >
			                    {T.startQuiz} {T.for} {label}
			                </button>
			            </>
			        )}
			    </div>
            </div>
        );
    };

    const DailyQuizScreen = () => {
        const [dailyQIndex, setDailyQIndex] = useState(0);
        const [dailyScore, setDailyScore] = useState(0);
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [dailySuccess, setDailySuccess] = useState(false);
        
        // Ensure we have an age group, falling back if necessary
        const effectiveAgeGroup = userPermanentAgeGroup || 'adult';
        // Use effectiveAgeGroup for questions
        const dailyQuestions = useMemo(() => getDailyQuestions(language, effectiveAgeGroup), [language, effectiveAgeGroup]);

        // Initial bot message state
        const initialBotMessage = useMemo(() => ({
            role: 'bot', 
            text: language === 'hi' 
                ? `नमस्ते ${username}, मैं आपकी MindConnect Mood Bot हूँ। आइए जांचते हैं कि आप आज कैसा महसूस कर रहे हैं।`
                : `Hi ${username}, I'm your MindConnect Mood Bot. Let's check in on how you're feeling today.`,
            options: [{ text: language === 'hi' ? "चेक-इन शुरू करें" : "Start Check-in", score: 0 }]
        }), [language, username]);
        
        const [dailyChatMessages, setDailyChatMessages] = useState([initialBotMessage]);


        // Auto-scroll on new message
        useEffect(() => {
            const messagesContainer = document.getElementById('daily-messages-container');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }, [dailyChatMessages]);

        // Function to submit final mood log
        const handleSubmitDaily = async (finalScore) => {
            if (!db || !userId) return;
            setIsSubmitting(true);
            const today = new Date().toISOString().slice(0, 10);
            
            try {
                const moodLogsRef = doc(collection(db, `/artifacts/${appId}/users/${userId}/daily_mood_logs`));

                await setDoc(moodLogsRef, {
                    userId: userId,
                    username: username,
                    score: finalScore,
                    maxScore: dailyQuestions.length * 5,
                    date: today,
                    timestamp: serverTimestamp(),
                    ageGroup: effectiveAgeGroup,
                });

                setDailySuccess(true);
                setHasTakenDailyQuiz(true);
                setTimeout(() => setView('home'), 2000);

            } catch (err) {
                console.error("Error saving daily mood:", err);
                setError(language === 'hi' ? "दैनिक मूड लॉग सहेजने में विफल रहा।" : "Failed to save daily mood log.");
                setIsSubmitting(false);
            }
        };
        
        // Function to handle moving to the next question/submission
        const handleOptionSelect = (score, text) => {
            if (isSubmitting || dailySuccess) return;

            // 1. Add user message (answer) to chat
            setDailyChatMessages(prev => [...prev, { role: 'user', text: text }]);
            
            // 2. Update score
            const newScore = dailyScore + score;
            
            // 3. Check if quiz is finished or move to next question
            setTimeout(() => {
                // The initial message consumes one option click, so we check if the index is less than the total length.
                if (dailyQIndex < dailyQuestions.length) {
                    // Move to the next question
                    const nextQ = dailyQuestions[dailyQIndex];
                    setDailyChatMessages(prev => [...prev, { role: 'bot', text: nextQ.q, options: nextQ.options }]);
                    setDailyQIndex(prev => prev + 1);
                    setDailyScore(newScore);
                } else {
                    // Finish and submit
                    handleSubmitDaily(newScore);
                }
            }, 300);
        };

        // Render success screen on completion
        if (dailySuccess) {
            return (
                <div className="p-6 text-center py-20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto text-green-500 mb-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586l-1.793-1.793a1 1 0 00-1.414 1.414l2.5 2.5a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-xl font-bold text-gray-800">{language === 'hi' ? "मूड सफलतापूर्वक दर्ज किया गया!" : "Mood Logged Successfully!"}</h3>
                    <p className="text-gray-500 mt-2">{language === 'hi' ? "अपनी अगली प्रविष्टि के लिए कल फिर से जांचें।" : "Check back tomorrow for your next entry."}</p>
                </div>
            );
        }

        const lastBotMessage = dailyChatMessages.findLast(msg => msg.role === 'bot');
        const currentOptions = lastBotMessage ? lastBotMessage.options : null;
        
        // Awaiting answer if the last message was from the bot and we are not submitting
        const isAwaitingAnswer = dailyChatMessages.length % 2 !== 0 && !isSubmitting;


        return (
            <div className="flex flex-col h-[600px] bg-gray-50">
                <div className="p-4 border-b border-gray-200 bg-white">
                    <div onClick={() => setView('home')} className="text-indigo-600 font-semibold cursor-pointer mb-2 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {T.backToHome}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">{language === 'hi' ? "दैनिक चेक-इन बॉट" : "Daily Check-in Bot"} ({effectiveAgeGroup.toUpperCase()})</h2>
                </div>

                <div id="daily-messages-container" className="flex-grow p-4 space-y-4 overflow-y-auto">
                    {dailyChatMessages.map((msg, index) => {
                        const isBot = msg.role === 'bot';
                        const messageClass = isBot ? styles.messageTheirs : styles.messageMine;
                        const justify = isBot ? 'justify-start' : 'justify-end';
                        
                        return (
                            <div key={index} className={`flex ${justify}`}>
                                <div className={`p-3 text-sm shadow-md ${messageClass}`}>
                                    <div className="font-bold text-xs mb-1 opacity-80">
                                        {isBot ? T.botName : T.you}
                                    </div>
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                </div>
                            </div>
                        );
                    })}
                    {isSubmitting && (
                        <div className="flex justify-start">
                            <div className="p-3 text-sm bg-gray-200 text-gray-800 rounded-br-xl rounded-t-xl shadow-md max-w-[80%]">
                                {language === 'hi' ? 'मूड लॉग सहेजा जा रहा है...' : 'Saving mood log...'}
                            </div>
                        </div>
                    )}
                </div>

                {/* Options Button Area */}
                <div className="p-4 border-t border-gray-200 bg-white">
                    {currentOptions && isAwaitingAnswer && (
                        <div className="space-y-2">
                            {currentOptions.map((option, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleOptionSelect(option.score, option.text)}
                                    disabled={isSubmitting || dailySuccess}
                                    className={`${styles.chatOptionButton} ${isSubmitting || dailySuccess ? styles.chatOptionDisabled : ''}`}
                                >
                                    {option.text}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const QuizScreen = () => {
        const currentQ = quizData[currentQuestionIndex];
        const progress = Math.round(((currentQuestionIndex + 1) / quizData.length) * 100);

        return (
            <div className="p-6">
                 <div onClick={() => setView('home')} className="text-indigo-600 font-semibold cursor-pointer mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {T.backToHome}
                </div>
                <h2 className="text-2xl font-semibold mb-2 text-gray-800">{T.assessmentTitle}</h2>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
                    <div className="h-2.5 rounded-full bg-indigo-500" style={{ width: `${progress}%` }}></div>
                </div>

                <div className={styles.card}>
                    <p className="text-sm text-gray-500 mb-3">{T.question} {currentQuestionIndex + 1} {T.of} {quizData.length}</p>
                    <h3 className="text-lg font-bold text-gray-800 mb-6">{currentQ.q}</h3>

                    <div className="space-y-3">
                        {currentQ.options.map((option, index) => {
                            const isSelected = selectedOption === option.score;
                            return (
                                <div
                                    key={index}
                                    className={`${styles.radioCard} ${isSelected ? styles.radioSelected : ''}`}
                                    onClick={() => setSelectedOption(option.score)}
                                >
                                    <span className={`text-base font-medium ${isSelected ? styles.textWhite : styles.textGray}`}>{option.text}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <button
                    onClick={submitAnswer}
                    disabled={selectedOption === null || loading}
                    className={`${styles.buttonPrimary} bg-indigo-600 ${selectedOption === null || loading ? styles.buttonDisabled : 'hover:bg-indigo-700'}`}
                >
                    {loading ? T.processing : currentQuestionIndex < quizData.length - 1 ? T.nextQuestion : T.viewResults}
                </button>
                {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
            </div>
        );
    };

    const ResultsScreen = () => {
        if (loading) {
            return (
                <div className="text-center py-20 px-6">
                    <div className={styles.spinner}></div>
                    <h2 className="text-xl font-semibold text-gray-700">{language === 'hi' ? 'मनोदशा का विश्लेषण और सिफारिशें उत्पन्न करना...' : 'Analyzing Mindset & Generating Recommendations...'}</h2>
                    <p className="text-sm text-gray-500 mt-2">{language === 'hi' ? 'अनुरूप मीडिया और पेशेवर सलाह प्राप्त करना।' : 'Fetching tailored media and professional advice.'}</p>
                </div>
            );
        }

        const result = recommendationResult;
        if (!result) {
            return <div className="text-center text-red-500 py-10 px-6">{language === 'hi' ? 'परिणाम लोड करने में कोई त्रुटि हुई।' : 'An error occurred loading results.'}</div>;
        }

        const scoreMeaning = score < maxScore * 0.3 ? (language === 'hi' ? "आप उच्च लचीलापन और अच्छे मुकाबला तंत्र दिखाते हैं।" : "You show high resilience and good coping mechanisms.") :
                            score <= maxScore * 0.6 ? (language === 'hi' ? "आपका संतुलित मानसिकता है लेकिन आत्म-देखभाल से लाभ हो सकता है।" : "You have a balanced mindset but may benefit from self-care.") :
                            (language === 'hi' ? "आप उच्च तनाव का अनुभव कर रहे हैं और समर्थन से लाभ हो सकता है।" : "You seem to be experiencing high stress and could benefit from support.");
        const scoreColor = score < maxScore * 0.3 ? "text-green-600" : score <= maxScore * 0.6 ? "text-yellow-600" : "text-red-600";

        return (
            <div className="p-6">
                <div onClick={() => setView('home')} className="text-indigo-600 font-semibold cursor-pointer mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {T.backToHome}
                </div>
                <h2 className="text-2xl font-semibold mb-2 text-gray-800">{language === 'hi' ? '3. आपकी व्यक्तिगत कल्याण योजना' : '3. Your Personalized Wellness Plan'}</h2>

                {shareSuccess && (
                    <div className="fixed inset-x-0 top-0 mx-auto w-fit p-3 bg-green-500 text-white font-medium text-sm rounded-b-xl shadow-lg z-50 animate-bounce">
                        {language === 'hi' ? 'परिणाम क्लिपबोर्ड पर कॉपी किए गए! साझा करें।' : 'Results copied to clipboard! Share away.'}
                    </div>
                )}

                {/* User and App IDs for Group Joining */}
                <div className="bg-gray-100 p-3 rounded-xl mb-6 shadow-inner text-sm">
                    <p className="font-medium text-gray-700">{language === 'hi' ? 'के रूप में लॉग इन किया गया:' : 'Logged in as:'}</p>
                    <p className="font-mono text-xs text-gray-500 truncate">{username || userId}</p>
                </div>

                {/* Score and Mindset Summary */}
                <div className="bg-indigo-50 p-4 rounded-xl mb-6 shadow-sm">
                    <p className="text-sm font-medium text-indigo-700">{language === 'hi' ? 'मूल्यांकन पूरा हुआ' : 'Assessment Complete'} ({ageGroup.toUpperCase()})</p>
                    <p className="text-base mt-1"><span className="font-bold">{language === 'hi' ? 'मनोदशा स्कोर:' : 'Mindset Score:'}</span> <span className={`${scoreColor} font-extrabold`}>{score} / {maxScore}</span></p>
                    <p className="text-sm text-indigo-800 mt-2">{scoreMeaning}</p>
                </div>

                {/* Group Recommendation & Buttons */}
                <div className={styles.card}>
                    <h3 className={styles.sectionTitle}>{language === 'hi' ? 'आपका अनुशंसित समूह' : 'Your Recommended Group'}</h3>
                    <p className="text-base text-gray-700 mb-4">{language === 'hi' ? 'आपके परिणामों के आधार पर, आप इसके लिए एक महान फिट होंगे:' : 'Based on your results, you\'d be a great fit for:'}</p>
                    <div className="text-center bg-indigo-600 text-white p-3 rounded-lg font-extrabold text-xl tracking-wider">
                        {result.group}
                    </div>
                    
                    <div className="flex space-x-2 mt-6">
                        <button
                            onClick={handleShare}
                            className={`w-1/2 py-3 text-sm bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold rounded-xl transition ease-in-out duration-150 flex items-center justify-center`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M15 8a3 3 0 10-2.977-2.673l-4.45 2.224A3.003 3.003 0 007 10a3.001 3.001 0 00-1.423.399l-2.128-1.064A3 3 0 101 10a3 3 0 005.157 2.05l2.128 1.064A3.003 3.003 0 0013 10a3.001 3.001 0 001.423-.399l2.128 1.064A3 3 0 1019 10a3 3 0 00-5.157-2.05z" />
                            </svg>
                            {T.shareResults}
                        </button>
                        <button
                            onClick={joinChat}
                            className={`w-1/2 py-3 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition ease-in-out duration-150 flex items-center justify-center`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a3 3 0 100-6 3 3 0 000 6zM8 12a5 5 0 00-4.578 2.872L2.6 15.7A1 1 0 003.5 17h13a1 1 0 00.894-1.3l-1.822-2.828A5 5 0 0012 12H8z" />
                            </svg>
                            {T.joinChat}
                        </button>
                    </div>
                </div>

                {/* Media Recommendations */}
                <div className={styles.card}>
                    <h3 className={styles.sectionTitle}>{language === 'hi' ? 'शांति के लिए फिल्में और संगीत' : 'Movies & Music for Calm'}</h3>
                    <h4 className="font-semibold text-gray-700 mt-3">{language === 'hi' ? 'फिल्में:' : 'Movies:'}</h4>
                    <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
                        {result.movies.map((m, i) => <li key={`m${i}`}>{m}</li>)}
                    </ul>
                    <h4 className="font-semibold text-gray-700 mt-3">{language === 'hi' ? 'गाना:' : 'Songs:'}</h4>
                    <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
                        {result.songs.map((s, i) => <li key={`s${i}`}>{s}</li>)}
                    </ul>
                </div>
            </div>
        );
    };

    const ChatScreen = () => {
        const groupName = recommendationResult?.group || 'Group Chat';

        useEffect(() => {
            const messagesContainer = document.getElementById('messages-container');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }, [chatMessages]);

        return (
            <div className="flex flex-col h-[600px] bg-gray-50">
                <div className="p-4 border-b border-gray-200 bg-white">
                    {/* Header is now handled by the Header component, simplified this internal header */}
                    <h2 className="text-xl font-bold text-gray-900 truncate">{groupName}</h2>
                    <p className="text-xs text-gray-500">{T.connectedAs} <span className="font-mono">{username}</span></p>
                </div>

                <div id="messages-container" className="flex-grow p-4 space-y-4 overflow-y-auto">
                    {chatMessages.length === 0 && (
                        <div className="text-center text-gray-500 pt-10">{T.startConversation}</div>
                    )}
                    {chatMessages.map((msg) => {
                        const isMine = msg.userId === userId;
                        const messageClass = isMine ? styles.messageMine : styles.messageTheirs;
                        const justify = isMine ? 'justify-end' : 'justify-start';

                        return (
                            <div key={msg.id} className={`flex ${justify}`}>
                                <div className={`p-3 text-sm shadow-md ${messageClass}`}>
                                    <div className="font-bold text-xs mb-1 opacity-80">
                                        {isMine ? T.you : msg.username || msg.userId}
                                    </div>
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                    <span className="text-xs mt-1 block text-right opacity-60">{msg.timestamp}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* FIX: Use the memoized ChatInput component here */}
                <ChatInput
                    chatInput={chatInput}
                    setChatInput={setChatInput}
                    sendMessage={sendMessage}
                    isReady={isAuthReady}
                    T={T}
                    styles={styles}
                />
            </div>
        );
    };

    const DoctorDashboard = () => (
        <div className="p-6">
            <h2 className="text-2xl font-semibold mb-2 text-gray-800">Doctor Dashboard</h2>
            <p className="text-gray-500 mb-6">Welcome, Dr. {username || 'Doctor'}! Viewing insights for {appId}.</p>

            <div className={styles.card + " bg-indigo-50"}>
                <h3 className="text-xl font-bold text-indigo-800 mb-3">Patient Data Overview</h3>
                <p className="text-sm text-indigo-600">This section would display aggregated and anonymized user data (Assessment Scores, Daily Mood Trends) pulled from Firestore's public or shared collections, enabling you to track mental wellness across user groups.</p>
                <div className="mt-4 p-3 bg-white rounded-lg border border-indigo-200">
                    <p className="font-medium">Data View Placeholder:</p>
                    <ul className="text-xs text-gray-500 mt-1 list-disc list-inside">
                        <li>Fetch latest 10 Daily Mood Logs (Scores and Dates)</li>
                        <li>View distribution of users across Chat Groups (Teen, Adult, Elder)</li>
                        <li>Identify users with High Stress Assessment Scores</li>
                    </ul>
                </div>
            </div>

            <p className="text-xs text-gray-400 mt-4">Note: Actual data retrieval for doctor views would require specific security rules to prevent unauthorized access to patient data.</p>
        </div>
    );

    // --- Main Renderer ---

    let content;
    let currentHeaderView = view;
    
    if (view === 'splash') {
        content = <SplashScreen />;
        // No header needed for splash screen
        return content;
    } else if (!isAuthReady) {
        content = (
            <div className="p-4 text-center text-gray-500">
                <div className={styles.spinner} style={{width: '1.5rem', height: '1.5rem', borderWidth: '3px'}}></div>
                <p className="text-sm">{language === 'hi' ? 'सुरक्षित सेवाओं से जुड़ना...' : 'Connecting to secure services...'}</p>
            </div>
        );
        currentHeaderView = 'loading';
    } else {
        switch (view) {
            case 'login':
                content = <LoginScreen />;
                currentHeaderView = 'login';
                break;
            case 'home':
                content = <UserHomeScreen />;
                currentHeaderView = 'home';
                break;
            case 'dailyQuiz':
                content = <DailyQuizScreen />;
                currentHeaderView = 'dailyQuiz';
                break;
            case 'quiz':
                content = <QuizScreen />;
                currentHeaderView = 'quiz';
                break;
            case 'results':
                content = <ResultsScreen />;
                currentHeaderView = 'results';
                break;
            case 'chat':
                content = <ChatScreen />;
                currentHeaderView = 'chat';
                break;
            case 'botChat':
                content = <BotChatScreen />;
                currentHeaderView = 'botChat';
                break;
            case 'dashboard':
                content = <DoctorDashboard />;
                currentHeaderView = 'dashboard';
                break;
            default:
                content = <LoginScreen />;
                currentHeaderView = 'login';
                break;
        }
    }

    return (
        <div className="flex items-start justify-center p-4 sm:p-6 min-h-screen bg-gray-100">
            <div className={styles.appContainer}>
                {/* Header is hidden only on login, splash, or loading */}
                {currentHeaderView !== 'login' && currentHeaderView !== 'loading' && (
                    <Header T={T} username={username} setView={setView} logo={Logo} styles={styles} currentView={currentHeaderView} logoutUser={logoutUser} />
                )}

                {error && (
                    <div className="p-4 bg-red-100 text-red-700 font-medium text-sm border-l-4 border-red-500 rounded-b-lg">
                        {error}
                    </div>
                )}
                
                {content}
            </div>
        </div>
    );
};

export default App;
